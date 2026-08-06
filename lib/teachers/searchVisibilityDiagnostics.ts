import { isIdentityVerificationFailed } from "@/lib/teachers/identityPublishGate";

export type TeacherSearchVisibilityReasonCode =
  | "VISIBLE_IN_SEARCH"
  | "MISSING_ROLE_TEACHER"
  | "MISSING_TEACHER_ROW"
  | "MISSING_PUBLIC_FLAG"
  | "MISSING_PROFILE_STATUS"
  | "MISSING_DISPLAY_NAME"
  | "MISSING_SUBJECT"
  | "MISSING_TEACHING_FORMAT"
  | "MISSING_RATE"
  | "MISSING_LOCATION_POINT"
  | "IDENTITY_VERIFICATION_FAILED"
  | "BLOCKED_BY_RLS_OR_VIEW"
  | "EXCLUDED_BY_DISTANCE_FILTER"
  | "EXCLUDED_BY_SEARCH_QUERY"
  | "UNKNOWN";

export type TeacherSearchVisibilityDiagnosisInput = {
  profile: {
    id: string;
    role?: string | null;
    teacher_onboarding_complete?: boolean | null;
    is_active?: boolean | null;
    deactivated_at?: string | null;
    deleted_at?: string | null;
    anonymized_at?: string | null;
  };
  teacher?: {
    id?: string | null;
    user_id?: string | null;
    name?: string | null;
    discipline?: string | null;
    category?: string | null;
    price_per_lesson?: number | string | null;
    teaching_mode?: string | null;
    city?: string | null;
    region?: string | null;
    location?: unknown;
    is_public?: boolean | null;
    is_demo?: boolean | null;
    deactivated_at?: string | null;
    deleted_at?: string | null;
    identity_status?: string | null;
    identity_verified?: boolean | null;
    stripe_identity_failed_reason?: string | null;
  } | null;
  disciplineCount?: number;
  inTeachersPublicView?: boolean;
};

export type TeacherSearchVisibilityDiagnosis = {
  visibleInSearch: boolean;
  reasonCodes: TeacherSearchVisibilityReasonCode[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasValidRate(value: number | string | null | undefined): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function isOnlineCapable(teachingMode: string | null | undefined): boolean {
  const mode = String(teachingMode ?? "").trim().toLowerCase();
  return mode === "online" || mode === "both" || mode === "all";
}

function hasPublicLocationSignal(input: TeacherSearchVisibilityDiagnosisInput["teacher"]): boolean {
  if (!input) return false;
  if (hasText(input.city) && hasText(input.region)) return true;
  const location = typeof input.location === "object" && input.location !== null
    ? (input.location as Record<string, unknown>)
    : null;
  const publicLocation =
    typeof location?.public === "object" && location.public !== null
      ? (location.public as Record<string, unknown>)
      : null;
  return Boolean(
    (typeof publicLocation?.lat === "number" && typeof publicLocation?.lng === "number") ||
      (typeof publicLocation?.latitude === "number" && typeof publicLocation?.longitude === "number"),
  );
}

function profileBlocked(input: TeacherSearchVisibilityDiagnosisInput["profile"]): boolean {
  return (
    input.is_active === false ||
    Boolean(input.deactivated_at) ||
    Boolean(input.deleted_at) ||
    Boolean(input.anonymized_at)
  );
}

function teacherBlocked(input: NonNullable<TeacherSearchVisibilityDiagnosisInput["teacher"]>): boolean {
  return Boolean(input.deactivated_at) || Boolean(input.deleted_at) || input.is_demo === true;
}

export function diagnoseTeacherSearchVisibility(
  input: TeacherSearchVisibilityDiagnosisInput,
): TeacherSearchVisibilityDiagnosis {
  if (input.inTeachersPublicView === true) {
    return { visibleInSearch: true, reasonCodes: ["VISIBLE_IN_SEARCH"] };
  }

  const reasons: TeacherSearchVisibilityReasonCode[] = [];
  const { profile, teacher } = input;

  if (profile.role !== "teacher") reasons.push("MISSING_ROLE_TEACHER");
  if (profileBlocked(profile)) reasons.push("MISSING_PROFILE_STATUS");

  if (!teacher) {
    reasons.push("MISSING_TEACHER_ROW");
    return { visibleInSearch: false, reasonCodes: reasons };
  }

  if (!teacher.id || !UUID_RE.test(teacher.id)) reasons.push("BLOCKED_BY_RLS_OR_VIEW");
  if (!teacher.user_id || !UUID_RE.test(teacher.user_id)) reasons.push("BLOCKED_BY_RLS_OR_VIEW");
  if (teacher.is_public !== true) reasons.push("MISSING_PUBLIC_FLAG");
  if (teacherBlocked(teacher)) reasons.push("MISSING_PROFILE_STATUS");
  if (!hasText(teacher.name)) reasons.push("MISSING_DISPLAY_NAME");
  if ((input.disciplineCount ?? 0) <= 0 && !hasText(teacher.discipline) && !hasText(teacher.category)) {
    reasons.push("MISSING_SUBJECT");
  }
  if (!hasText(teacher.teaching_mode)) reasons.push("MISSING_TEACHING_FORMAT");
  if (!hasValidRate(teacher.price_per_lesson)) reasons.push("MISSING_RATE");
  if (!isOnlineCapable(teacher.teaching_mode) && !hasPublicLocationSignal(teacher)) {
    reasons.push("MISSING_LOCATION_POINT");
  }

  const identityFailed =
    String(teacher.identity_status ?? "").trim().toLowerCase() === "failed" ||
    isIdentityVerificationFailed({
      identity_verified: teacher.identity_verified,
      stripe_identity_failed_reason: teacher.stripe_identity_failed_reason,
    });
  if (identityFailed) reasons.push("IDENTITY_VERIFICATION_FAILED");

  if (
    reasons.length === 0 ||
    (teacher.is_public === true && !profileBlocked(profile) && !teacherBlocked(teacher))
  ) {
    reasons.push("BLOCKED_BY_RLS_OR_VIEW");
  }

  return {
    visibleInSearch: false,
    reasonCodes: Array.from(new Set(reasons)),
  };
}
