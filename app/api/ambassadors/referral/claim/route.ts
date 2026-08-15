import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
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

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AMBASSADOR_REF_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ ok: true, claimed: false });
  }

  const attributionId = await claimAmbassadorReferralForNewUser(
    getSupabaseAdmin(),
    user.id,
    sessionId,
  );

  return NextResponse.json({ ok: true, claimed: Boolean(attributionId) });
}
