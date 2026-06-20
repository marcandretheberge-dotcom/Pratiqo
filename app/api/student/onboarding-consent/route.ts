import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimitByIp, rateLimitResponse } from "@/lib/rateLimit";
import { mergeOnboardingRoleConfirmedDashboard } from "@/lib/auth/onboardingRoleChoice";
import {
  isStudentOnboardingConsentActorType,
  STUDENT_ONBOARDING_CONSENT_VERSION,
} from "@/lib/auth/studentOnboardingConsent";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CompanionType } from "@/lib/companions";

export const runtime = "nodejs";

type ConsentBody = {
  actorType?: unknown;
  acceptedTerms?: unknown;
  acceptedPrivacy?: unknown;
  acceptedLearningData?: unknown;
  acknowledgedMinorLessons?: unknown;
  locale?: unknown;
  companionType?: unknown;
};

function isCompanionType(value: unknown): value is CompanionType {
  return value === "phoenix" || value === "forest" || value === "dragon" || value === "star";
}

function normalizeLocale(value: unknown): "fr" | "en" | "es" {
  return value === "en" || value === "es" ? value : "fr";
}

function authClientForToken(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimitByIp(request, "student-onboarding-consent", { limit: 20, windowSeconds: 60 });
  if (!rl.allowed && rl.retryAfterSeconds != null) {
    return rateLimitResponse(rl.retryAfterSeconds, {
      limit: rl.limit,
      remaining: rl.remaining,
      reset: rl.reset,
    });
  }

  const supabaseUser = authClientForToken(token);
  if (!supabaseUser) {
    return NextResponse.json({ error: "missing_supabase_env" }, { status: 500 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ConsentBody;
  if (!isStudentOnboardingConsentActorType(body.actorType)) {
    return NextResponse.json({ error: "student_consent_actor_required" }, { status: 400 });
  }

  if (
    body.acceptedTerms !== true ||
    body.acceptedPrivacy !== true ||
    body.acceptedLearningData !== true ||
    body.acknowledgedMinorLessons !== true
  ) {
    return NextResponse.json({ error: "student_consent_required" }, { status: 400 });
  }

  if (body.companionType != null && !isCompanionType(body.companionType)) {
    return NextResponse.json({ error: "invalid_companion_type" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: existing, error: readErr } = await admin
    .from("profiles")
    .select("role, email, name, display_name, dashboard")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const existingProfile = existing as {
    role?: string | null;
    email?: string | null;
    name?: string | null;
    display_name?: string | null;
    dashboard?: unknown;
  } | null;

  if (existingProfile?.role === "teacher" || existingProfile?.role === "admin") {
    return NextResponse.json({ error: "student_only" }, { status: 403 });
  }

  const locale = normalizeLocale(body.locale);
  const nowIso = new Date().toISOString();

  const { error: insertErr } = await admin.from("student_onboarding_consents").insert({
    user_id: user.id,
    consent_version: STUDENT_ONBOARDING_CONSENT_VERSION,
    actor_type: body.actorType,
    accepted_terms: true,
    accepted_privacy: true,
    accepted_learning_data: true,
    acknowledged_minor_lessons: true,
    locale,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const displayName =
    existingProfile?.display_name ??
    existingProfile?.name ??
    (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null) ??
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ??
    user.email?.split("@")[0] ??
    null;

  const profileUpsert: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? existingProfile?.email ?? null,
    name: existingProfile?.name ?? displayName,
    display_name: existingProfile?.display_name ?? displayName,
    role: "student",
    student_onboarding_consent_completed_at: nowIso,
    student_onboarding_consent_version: STUDENT_ONBOARDING_CONSENT_VERSION,
    dashboard: mergeOnboardingRoleConfirmedDashboard(existingProfile?.dashboard),
    updated_at: nowIso,
  };

  if (body.companionType != null) {
    profileUpsert.companion_type = body.companionType;
    profileUpsert.companion_chosen = true;
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .upsert(profileUpsert, { onConflict: "id" })
    .select("id, role, companion_type, companion_chosen, dashboard, student_onboarding_consent_completed_at, student_onboarding_consent_version")
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: profileErr?.message ?? "Profile update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile });
}
