import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimitByIp } from "@/lib/rateLimit";
import {
  AMBASSADOR_REF_COOKIE,
  AMBASSADOR_REFERRAL_RATE_LIMIT,
  clampAmbassadorReferralWindowDays,
  normalizeAmbassadorCode,
  parseAmbassadorReferralSessionId,
  safeAmbassadorDestination,
  shouldSkipAmbassadorSessionCreationForRateLimit,
} from "@/lib/ambassadors/referrals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieMaxAgeSeconds(expiresAt: string): number {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(1, Math.floor(remainingMs / 1000));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeAmbassadorCode(rawCode);
  if (!code) return NextResponse.redirect(new URL("/", req.url));

  const admin = getSupabaseAdmin();
  const linkResult = await admin
    .from("ambassador_links")
    .select("id, destination_path, attribution_window_days, ambassador_id")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (linkResult.error) {
    console.error("[ambassador/referral] link lookup failed", linkResult.error);
  }
  if (!linkResult.data) return NextResponse.redirect(new URL("/", req.url));

  const link = linkResult.data;
  const ambassadorId =
    typeof link.ambassador_id === "string" && link.ambassador_id.trim()
      ? link.ambassador_id
      : null;
  if (!ambassadorId) return NextResponse.redirect(new URL("/", req.url));

  const membershipResult = await admin
    .from("ambassadors")
    .select("status")
    .eq("id", ambassadorId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipResult.error) {
    console.error("[ambassador/referral] membership lookup failed", membershipResult.error);
  }
  if (!membershipResult.data) return NextResponse.redirect(new URL("/", req.url));

  const destinationPath = safeAmbassadorDestination(link.destination_path as string | null);
  const existingSessionId = parseAmbassadorReferralSessionId(req.cookies.get(AMBASSADOR_REF_COOKIE)?.value);

  if (existingSessionId) {
    const existingResult = await admin
      .from("referral_sessions")
      .select("id, expires_at")
      .eq("id", existingSessionId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (existingResult.data) {
      return NextResponse.redirect(new URL(destinationPath, req.url));
    }
  }

  const rateLimit = await rateLimitByIp(req, `ambassador-referral-${code}`, AMBASSADOR_REFERRAL_RATE_LIMIT);
  if (shouldSkipAmbassadorSessionCreationForRateLimit(rateLimit)) {
    return NextResponse.redirect(new URL(destinationPath, req.url));
  }

  const days = clampAmbassadorReferralWindowDays(link.attribution_window_days);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const sessionResult = await admin
    .from("referral_sessions")
    .insert({ ambassador_link_id: link.id, expires_at: expiresAt })
    .select("id, expires_at")
    .single();

  if (sessionResult.error || !sessionResult.data) {
    console.error("[ambassador/referral] session creation failed", sessionResult.error);
    return NextResponse.redirect(new URL(destinationPath, req.url));
  }

  const session = sessionResult.data;
  const clickResult = await admin.from("referral_events").insert({
    ambassador_link_id: link.id,
    session_id: session.id,
    event_type: "click",
    event_key: `click:${session.id}`,
  });
  if (clickResult.error) {
    console.warn("[ambassador/referral] click event failed", clickResult.error);
  }

  const response = NextResponse.redirect(new URL(destinationPath, req.url));
  response.cookies.set(AMBASSADOR_REF_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAgeSeconds(session.expires_at),
  });
  return response;
}
