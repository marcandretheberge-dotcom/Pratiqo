import { NextResponse } from "next/server";
import { mergeOnboardingRoleConfirmedDashboard } from "@/lib/auth/onboardingRoleChoice";
import {
  displayNameForAuthProfile,
  ensureAuthProfileForUser,
} from "@/lib/auth/profileEnsure";
import {
  isStudentOnboardingConsentActorType,
  STUDENT_ONBOARDING_CONSENT_VERSION,
} from "@/lib/auth/studentOnboardingConsent";
import { getSupabaseForRequest } from "@/lib/auth/supabaseRouteClient";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CompanionType } from "@/lib/companions";
import { rateLimitByIp, rateLimitGuardResponse } from "@/lib/rateLimit";

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

type StudentProfileRow = {
  role?: string | null;
  email?: string | null;
  name?: string | null;
  student_onboarding_consent_completed_at?: string | null;
  student_onboarding_consent_version?: string | null;
  dashboard?: unknown;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isCompanionType(value: unknown): value is CompanionType {
  return value === "phoenix" || value === "forest" || value === "dragon" || value === "star";
}

function normalizeLocale(value: unknown): "fr" | "en" | "es" {
  return value === "en" || value === "es" ? value : "fr";
}

function isMissingSchemaError(error: SupabaseLikeError | null | undefined): boolean {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  return (
    code === "42703" ||
    code === "42P01" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    /student_onboarding_consent/.test(message) ||
    /student_onboarding_consents/.test(message)
  );
}

function logConsentStorageFailure(stage: string, error: SupabaseLikeError | Error | unknown) {
  if (error instanceof Error) {
    console.error("[student/onboarding-consent] save failed", {
      stage,
      message: error.message,
    });
    return;
  }

  const supabaseError = error as SupabaseLikeError | null;
  console.error("[student/onboarding-consent] save failed", {
    stage,
    code: supabaseError?.code ?? null,
    message: supabaseError?.message ?? "Unknown Supabase error",
    details: supabaseError?.details ?? null,
    hint: supabaseError?.hint ?? null,
  });
}

function consentSaveFailed(stage: string, status = 500) {
  return NextResponse.json({ error: "student_consent_save_failed", stage }, { status });
}

function consentSchemaNotReady(stage: string) {
  return NextResponse.json({ error: "student_consent_schema_not_ready", stage }, { status: 503 });
}

async function readStudentProfile(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<{ profile: StudentProfileRow | null; error: SupabaseLikeError | null; schemaReady: boolean }> {
  const { data, error } = await admin
    .from("profiles")
    .select("role, email, name, dashboard, student_onboarding_consent_completed_at, student_onboarding_consent_version")
    .eq("id", userId)
    .maybeSingle();

  if (!error) {
    return { profile: (data as StudentProfileRow | null) ?? null, error: null, schemaReady: true };
  }

  if (isMissingSchemaError(error as SupabaseLikeError)) {
    const fallback = await admin
      .from("profiles")
      .select("role, email, name, dashboard")
      .eq("id", userId)
      .maybeSingle();
    return {
      profile: (fallback.data as StudentProfileRow | null) ?? null,
      error: (fallback.error as SupabaseLikeError | null) ?? null,
      schemaReady: false,
    };
  }

  return { profile: null, error: error as SupabaseLikeError, schemaReady: true };
}

export async function POST(request: Request) {
  const supabaseUser = await getSupabaseForRequest(request);
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

  const rl = await rateLimitByIp(request, "student-onboarding-consent", {
    limit: 20,
    windowSeconds: 60,
    identifier: user.id,
  });
  const rateLimited = rateLimitGuardResponse(rl);
  if (rateLimited) {
    if (rl.infrastructureUnavailable) {
      console.error("[student/onboarding-consent] rate limit unavailable — allowing authenticated consent save");
    } else {
      return rateLimited;
    }
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

  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch (err) {
    logConsentStorageFailure("admin_client", err);
    return consentSaveFailed("admin_client");
  }

  let { profile: existingProfile, error: readErr, schemaReady } = await readStudentProfile(admin, user.id);

  if (readErr) {
    logConsentStorageFailure("profile_read", readErr);
    return consentSaveFailed("profile_read");
  }

  if (!existingProfile) {
    const ensured = await ensureAuthProfileForUser(admin, user, {
      intent: "learner",
      displayName: displayNameForAuthProfile(user),
    });
    if (ensured.error || !ensured.profile) {
      logConsentStorageFailure("profile_ensure", ensured.error ?? new Error("Profile ensure returned no row."));
      return consentSaveFailed("profile_ensure");
    }
    existingProfile = {
      role: ensured.profile.role,
      email: ensured.profile.email,
      name: ensured.profile.name,
      dashboard: ensured.profile.dashboard,
    };
  }

  if (existingProfile.role === "teacher" || existingProfile.role === "admin") {
    return NextResponse.json({ error: "student_only" }, { status: 403 });
  }

  if (!schemaReady) {
    logConsentStorageFailure("schema_check", new Error("student onboarding consent schema is not applied"));
    return consentSchemaNotReady("schema_check");
  }

  const locale = normalizeLocale(body.locale);
  const nowIso = new Date().toISOString();
  const alreadyHasCurrentConsent =
    typeof existingProfile.student_onboarding_consent_completed_at === "string" &&
    existingProfile.student_onboarding_consent_completed_at.length > 0 &&
    existingProfile.student_onboarding_consent_version === STUDENT_ONBOARDING_CONSENT_VERSION;

  if (!alreadyHasCurrentConsent) {
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
      logConsentStorageFailure("consent_insert", insertErr);
      if (isMissingSchemaError(insertErr as SupabaseLikeError)) {
        return consentSchemaNotReady("consent_insert");
      }
      return consentSaveFailed("consent_insert");
    }
  }

  const displayName = existingProfile.name ?? displayNameForAuthProfile(user);

  const profilePatch: Record<string, unknown> = {
    email: user.email ?? existingProfile.email ?? null,
    name: existingProfile.name ?? displayName,
    role: "student",
    student_onboarding_consent_completed_at:
      existingProfile.student_onboarding_consent_completed_at ?? nowIso,
    student_onboarding_consent_version: STUDENT_ONBOARDING_CONSENT_VERSION,
    dashboard: mergeOnboardingRoleConfirmedDashboard(existingProfile.dashboard),
    updated_at: nowIso,
  };

  if (body.companionType != null) {
    profilePatch.companion_type = body.companionType;
    profilePatch.companion_chosen = true;
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .update(profilePatch)
    .eq("id", user.id)
    .select("id, role, companion_type, companion_chosen, dashboard, student_onboarding_consent_completed_at, student_onboarding_consent_version")
    .maybeSingle();

  if (!profileErr && profile) {
    return NextResponse.json({ ok: true, profile });
  }

  if (profileErr && !isMissingSchemaError(profileErr as SupabaseLikeError)) {
    logConsentStorageFailure("profile_update", profileErr);
    return consentSaveFailed("profile_update");
  }

  const profileUpsert = { id: user.id, ...profilePatch };
  const { data: upsertedProfile, error: upsertErr } = await admin
    .from("profiles")
    .upsert(profileUpsert, { onConflict: "id" })
    .select("id, role, companion_type, companion_chosen, dashboard, student_onboarding_consent_completed_at, student_onboarding_consent_version")
    .maybeSingle();

  if (upsertErr || !upsertedProfile) {
    logConsentStorageFailure(
      "profile_upsert",
      upsertErr ?? new Error("Profile upsert returned no row after update miss."),
    );
    if (isMissingSchemaError(upsertErr as SupabaseLikeError)) {
      return consentSchemaNotReady("profile_upsert");
    }
    return consentSaveFailed("profile_upsert");
  }

  return NextResponse.json({ ok: true, profile: upsertedProfile });
}
