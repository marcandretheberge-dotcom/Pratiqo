import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { rateLimitByIp, rateLimitResponse } from "@/lib/rateLimit";
import type { CompanionType } from "@/lib/companions";

export const runtime = "nodejs";

type Body = { companionType?: CompanionType };

async function getSupabaseForRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    return createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          cookieStore.set(c.name, c.value, c.options);
        }
      },
    },
  });
}

function isCompanionType(value: unknown): value is CompanionType {
  return value === "phoenix" || value === "forest" || value === "dragon" || value === "star";
}

export async function POST(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  if (!supabase) {
    return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const companionType = body?.companionType;
  if (!isCompanionType(companionType)) {
    return NextResponse.json({ error: "Type de compagnon invalide." }, { status: 400 });
  }

  const rl = await rateLimitByIp(request, "companion", { limit: 30, windowSeconds: 60 });
  if (!rl.allowed && rl.retryAfterSeconds != null) {
    return rateLimitResponse(rl.retryAfterSeconds, {
      limit: rl.limit,
      remaining: rl.remaining,
      reset: rl.reset,
    });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ companion_type: companionType, companion_chosen: true })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

