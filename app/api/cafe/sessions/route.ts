import { NextResponse } from "next/server";
import { isCafeV1Enabled } from "@/lib/cafe/featureFlag";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function cafeDisabled() {
  return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}

export async function GET(req: Request) {
  if (!isCafeV1Enabled()) return cafeDisabled();
  const url = new URL(req.url);
  const rawSlug = url.searchParams.get("slug");
  const slug = rawSlug?.trim().toLowerCase() || null;

  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("cafe_public_sessions", { p_slug: slug });
    if (error) {
      console.error("[cafe/public] listing failed", { code: error.code });
      return NextResponse.json({ ok: false, error: "cafe_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, sessions: data ?? [] });
  } catch (error) {
    console.error("[cafe/public] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "cafe_unavailable" }, { status: 503 });
  }
}
