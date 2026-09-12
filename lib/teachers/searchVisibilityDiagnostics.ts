import { isIdentityVerificationFailed } from "@/lib/teachers/identityPublishGate";
import { isTeacherMarketSupported } from "@/lib/config/markets";
import { hasTeacherDisciplineSignal } from "@/lib/teachers/teacherDiscovery";

export type TeacherSearchVisibilityBlockerCode =
  | "BLOCKER_TEACHER_ROW_MISSING"
  | "BLOCKER_PROFILE_INACTIVE"
  | "BLOCKER_TEACHER_INACTIVE"
  | "BLOCKER_DEMO_PROFILE"
  | "BLOCKER_INVALID_PUBLIC_IDS"
  | "BLOCKER_MISSING_SUBJECT"
  | "BLOCKER_FAILED_IDENTITY_IF_SEARCH_BLOCKING"
  | "BLOCKER_BY_RLS_OR_PUBLIC_VIEW"
  | "BLOCKER_MARKETPLACE_OPTED_OUT";

export type TeacherSearchVisibilityWarningCode =
  | "WARNING_PROFILE_NOT_PUBLISHED"
  | "WARNING_MISSING_PUBLIC_DATA"
  | "WARNING_MISSING_BASE_RATE"
  | "WARNING_MISSING_TEACHING_FORMAT"
  | "WARNING_MISSING_PUBLIC_LOCATION_OR_ONLINE"
  | "WARNING_UNSUPPORTED_COUNTRY"
  | "WARNING_IDENTITY_NOT_VERIFIED"
  | "WARNING_NO_AVAILABILITY"
  | "WARNING_NO_INTRO_LESSON"
  | "WARNING_PROFILE_LOW_COMPLETION";

export type TeacherSearchVisibilityReasonCode =
  | "VISIBLE_IN_SEARCH"
  | TeacherSearchVisibilityBlockerCode
  | TeacherSearchVisibilityWarningCode;

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
    bio?: string | null;
    availability?: unknown;
    price_per_lesson?: number | string | null;
    teaching_mode?: string | null;
    city?: string | null;
    region?: string | null;
    country_code?: string | null;
    location?: unknown;
    is_public?: boolean | null;
    marketplace_discovery_opt_out?: boolean | null;
    is_demo?: boolean | null;
    deactivated_at?: string | null;
    deleted_at?: string | null;
    identity_status?: string | null;
    identity_verified?: boolean | null;
    identity_verified_manually?: boolean | null;
    stripe_identity_failed_reason?: string | null;
    intro_session_enabled?: boolean | null;
    intro_session_price_cents?: number | string | null;
    publicTeachingZones?: Array<{ city?: string | null; labelPublic?: string | null }>;
  } | null;
  disciplineCount?: number;
  inTeachersPublicView?: boolean;
};

export type TeacherSearchVisibilityDiagnosis = {
  visibleInSearch: boolean;
  reasonCodes: TeacherSearchVisibilityReasonCode[];
  blockingReasonCodes: TeacherSearchVisibilityBlockerCode[];
  warningReasonCodes: TeacherSearchVisibilityWarningCode[];
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

function hasValidIntroPrice(value: number | string | null | undefined): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function isOnlineCapable(teachingMode: string | null | undefined): boolean {
  const mode = String(teachingMode ?? "").trim().toLowerCase();
  return mode === "online" || mode === "both" || mode === "all";
}

function hasPublicLocationSignal(input: TeacherSearchVisibilityDiagnosisInput["teacher"]): boolean {
  if (!input) return false;
  if (Array.isArray(input.publicTeachingZones) && input.publicTeachingZones.some((zone) => hasText(zone.city) || hasText(zone.labelPublic))) {
    return true;
  }
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

function hasAvailabilitySignal(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null) return Object.keys(value).length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

function unique<T extends string>(codes: T[]): T[] {
  return Array.from(new Set(codes));
}

export function diagnoseTeacherSearchVisibility(
  input: TeacherSearchVisibilityDiagnosisInput,
): TeacherSearchVisibilityDiagnosis {
  const blockers: TeacherSearchVisibilityBlockerCode[] = [];
  const warnings: TeacherSearchVisibilityWarningCode[] = [];
  const { profile, teacher } = input;

  if (profile.role !== "teacher" || profileBlocked(profile)) {
    blockers.push("BLOCKER_PROFILE_INACTIVE");
  }

  if (!teacher) {
    blockers.push("BLOCKER_TEACHER_ROW_MISSING");
    return {
      visibleInSearch: false,
      reasonCodes: unique([...blockers, ...warnings]),
      blockingReasonCodes: unique(blockers),
      warningReasonCodes: unique(warnings),
    };
  }

  const identityFailed =
    teacher.identity_verified_manually !== true &&
    (String(teacher.identity_status ?? "").trim().toLowerCase() === "failed" ||
      isIdentityVerificationFailed({
        identity_verified: teacher.identity_verified,
        identity_verified_manually: teacher.identity_verified_manually,
        stripe_identity_failed_reason: teacher.stripe_identity_failed_reason,
      }));

  if (!teacher.id || !UUID_RE.test(teacher.id)) blockers.push("BLOCKER_INVALID_PUBLIC_IDS");
  if (!teacher.user_id || !UUID_RE.test(teacher.user_id)) blockers.push("BLOCKER_INVALID_PUBLIC_IDS");
  if (teacher.marketplace_discovery_opt_out === true) blockers.push("BLOCKER_MARKETPLACE_OPTED_OUT");
  if (teacher.is_public !== true) warnings.push("WARNING_PROFILE_NOT_PUBLISHED");
  if (teacher.deactivated_at || teacher.deleted_at) blockers.push("BLOCKER_TEACHER_INACTIVE");
  if (teacher.is_demo === true) blockers.push("BLOCKER_DEMO_PROFILE");
  if (hasText(teacher.country_code) && !isTeacherMarketSupported(teacher.country_code)) {
    warnings.push("WARNING_UNSUPPORTED_COUNTRY");
  }
  if (!hasText(teacher.name) || !hasText(teacher.bio) || !hasText(teacher.country_code)) {
    warnings.push("WARNING_MISSING_PUBLIC_DATA");
  }
  if (
    !hasTeacherDisciplineSignal({
      discipline: teacher.discipline,
      category: teacher.category,
      disciplineCount: input.disciplineCount,
    })
  ) {
    blockers.push("BLOCKER_MISSING_SUBJECT");
  }
  if (!hasText(teacher.teaching_mode)) warnings.push("WARNING_MISSING_TEACHING_FORMAT");
  if (!hasValidRate(teacher.price_per_lesson)) warnings.push("WARNING_MISSING_BASE_RATE");
  if (!isOnlineCapable(teacher.teaching_mode) && !hasPublicLocationSignal(teacher)) {
    warnings.push("WARNING_MISSING_PUBLIC_LOCATION_OR_ONLINE");
  }
  if (identityFailed) blockers.push("BLOCKER_FAILED_IDENTITY_IF_SEARCH_BLOCKING");

  if (
    !identityFailed &&
    teacher.identity_verified !== true &&
    teacher.identity_verified_manually !== true
  ) {
    warnings.push("WARNING_IDENTITY_NOT_VERIFIED");
  }
  if (!hasAvailabilitySignal(teacher.availability)) warnings.push("WARNING_NO_AVAILABILITY");
  if (teacher.intro_session_enabled !== true || !hasValidIntroPrice(teacher.intro_session_price_cents)) {
    warnings.push("WARNING_NO_INTRO_LESSON");
  }
  if (
    !hasText(teacher.name) ||
    !hasText(teacher.bio) ||
    !hasText(teacher.country_code) ||
    !hasValidRate(teacher.price_per_lesson) ||
    ((input.disciplineCount ?? 0) <= 0 && !hasText(teacher.discipline) && !hasText(teacher.category)) ||
    !hasText(teacher.teaching_mode)
  ) {
    warnings.push("WARNING_PROFILE_LOW_COMPLETION");
  }

  const blockingReasonCodes = unique(blockers);
  const warningReasonCodes = unique(warnings);
  if (blockingReasonCodes.length === 0) {
    return {
      visibleInSearch: true,
      reasonCodes: unique(["VISIBLE_IN_SEARCH", ...warningReasonCodes]),
      blockingReasonCodes: [],
      warningReasonCodes,
    };
  }

  return {
    visibleInSearch: false,
    reasonCodes: unique([...blockingReasonCodes, ...warningReasonCodes]),
    blockingReasonCodes,
    warningReasonCodes,
  };
}
