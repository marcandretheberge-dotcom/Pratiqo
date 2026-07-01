import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { rateLimitByIp, rateLimitGuardResponse } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
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
  const rateLimited = rateLimitGuardResponse(rl);
  if (rateLimited) return rateLimited;

  const admin = getSupabaseAdmin();
  const { data: existing, error: readErr } = await admin
    .from("profiles")
    .select("role, email, name, dashboard")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const existingRole = (existing as { role?: string | null } | null)?.role;
  const role =
    existingRole === "admin" || existingRole === "teacher" ? existingRole : "student";

  const upsertPayload: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? (existing as { email?: string | null } | null)?.email ?? null,
    name:
      (existing as { name?: string | null } | null)?.name ??
      (user.user_metadata?.full_name as string | undefined) ??
      null,
    role,
    companion_type: companionType,
    companion_chosen: true,
    updated_at: new Date().toISOString(),
  };

  if (!(existing as { dashboard?: unknown } | null)?.dashboard) {
    upsertPayload.dashboard = { onboarding_role_confirmed: true };
  }

  const { data: saved, error: upsertErr } = await admin
    .from("profiles")
    .upsert(upsertPayload, { onConflict: "id" })
    .select("id, role, companion_type, companion_chosen, dashboard")
    .single();

  if (upsertErr || !saved) {
    return NextResponse.json({ error: upsertErr?.message ?? "Profile save failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    profile: {
      id: saved.id,
      role: saved.role,
      companion_type: saved.companion_type,
      companion_chosen: saved.companion_chosen,
      dashboard: saved.dashboard,
    },
  });
}
