import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { REFERRAL_YEARLY_CAP, getReferralYearlyTotal } from "@/lib/credits";

export const runtime = "nodejs";

async function getSupabaseForRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  if (token) {
    return createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cs) { for (const c of cs) cookieStore.set(c.name, c.value, c.options); },
    },
  });
}

function generateReferralCode(userId: string): string {
  return userId.replace(/-/g, "").substring(0, 8).toUpperCase();
}

export async function GET(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Config missing." }, { status: 500 });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("credit_balance, referral_code")
    .eq("id", user.id)
    .maybeSingle();

  let referralCode = (profile as { referral_code?: string | null } | null)?.referral_code ?? null;

  // Lazy-generate referral code on first call
  if (!referralCode) {
    referralCode = generateReferralCode(user.id);
    const { error: codeErr } = await admin
      .from("profiles")
      .update({ referral_code: referralCode })
      .eq("id", user.id);
    if (codeErr?.code === "23505") {
      const { data: fresh } = await admin.from("profiles").select("referral_code").eq("id", user.id).maybeSingle();
      referralCode = (fresh as { referral_code?: string | null } | null)?.referral_code ?? null;
    }
  }

  const { data: txns } = await supabase
    .from("credit_transactions")
    .select("id, amount, type, description, created_at, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const referralYearTotal = await getReferralYearlyTotal(user.id);

  return NextResponse.json({
    balance: Number(profile?.credit_balance ?? 0),
    referralYearlyTotal: referralYearTotal,
    referralYearlyCap: REFERRAL_YEARLY_CAP,
    referralCode,
    transactions: txns ?? [],
  });
}
