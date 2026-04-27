import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

/**
 * POST /api/credits/use
 * Validate that the user has enough credits for the requested amount.
 * Returns the validated amount (server-authoritative).
 * Actual deduction happens in the Stripe webhook after payment confirmation.
 */
export async function POST(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Config missing." }, { status: 500 });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { amount?: number } | null;
  const requested = Number(body?.amount ?? 0);

  if (requested <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("credit_balance")
    .eq("id", user.id)
    .maybeSingle();

  const balance = Number((profile as { credit_balance?: number | null } | null)?.credit_balance ?? 0);
  const approved = Math.min(requested, balance);

  if (approved <= 0) {
    return NextResponse.json({ error: "Solde insuffisant", balance }, { status: 400 });
  }

  return NextResponse.json({ ok: true, approved, balance });
}
