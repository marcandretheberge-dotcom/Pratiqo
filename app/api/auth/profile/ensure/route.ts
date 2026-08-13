import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ensureAuthProfileForUser,
  parseProfileEnsureIntent,
} from "@/lib/auth/profileEnsure";
import {
  AMBASSADOR_REF_COOKIE,
  claimAmbassadorReferralForNewUser,
} from "@/lib/ambassadors/referrals";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "missing_supabase_env" }, { status: 500 });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const intent = parseProfileEnsureIntent(body.intent);
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : null;

  const admin = getSupabaseAdmin();
  const beforeEnsure = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  const isNewProfile = !beforeEnsure.error && !beforeEnsure.data;

  const ensured = await ensureAuthProfileForUser(admin, user, {
    intent,
    displayName,
  });

  if (ensured.error || !ensured.profile) {
    console.error("[auth/profile/ensure] profile ensure failed", ensured.error);
    return NextResponse.json({ error: "profile_ensure_failed" }, { status: 500 });
  }

  if (isNewProfile) {
    const cookieStore = await cookies();
    await claimAmbassadorReferralForNewUser(
      admin,
      user.id,
      cookieStore.get(AMBASSADOR_REF_COOKIE)?.value,
    );
  }

  return NextResponse.json({ ok: true, profile: ensured.profile });
}
