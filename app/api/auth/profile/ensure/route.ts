import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ensureAuthProfileForUser,
  parseProfileEnsureIntent,
} from "@/lib/auth/profileEnsure";

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
  const ensured = await ensureAuthProfileForUser(admin, user, {
    intent,
    displayName,
  });

  if (ensured.error || !ensured.profile) {
    console.error("[auth/profile/ensure] profile ensure failed", ensured.error);
    return NextResponse.json({ error: "profile_ensure_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: ensured.profile });
}
