const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeacherDiscoveryHiddenReason =
  | "invalid_teacher_id"
  | "missing_user_id"
  | "profile_not_teacher"
  | "profile_inactive"
  | "teacher_inactive"
  | "demo_profile"
  | "missing_discipline"
  | "identity_failed";

export type TeacherDiscoveryWarning =
  | "profile_unpublished"
  | "missing_name"
  | "missing_bio"
  | "missing_country"
  | "unsupported_country"
  | "missing_base_rate"
  | "missing_teaching_format"
  | "missing_public_location_or_online"
  | "identity_not_verified"
  | "no_availability"
  | "no_intro_lesson"
  | "payment_setup_required";

export type TeacherDiscoveryStatus =
  | "hidden"
  | "discoverable"
  | "profile_incomplete"
  | "requestable"
  | "payment_setup_required"
  | "bookable";

export type TeacherDiscoveryInput = {
  profile?: {
    role?: string | null;
    is_active?: boolean | null;
    deactivated_at?: string | null;
    deleted_at?: string | null;
    anonymized_at?: string | null;
  } | null;
  teacher: {
    id?: string | null;
    user_id?: string | null;
    discipline?: string | null;
    category?: string | null;
    is_public?: boolean | null;
    is_demo?: boolean | null;
    deactivated_at?: string | null;
    deleted_at?: string | null;
    identity_verification_failed?: boolean | null;
    payment_ready?: boolean | null;
    profile_complete?: boolean | null;
  } | null;
  disciplineCount?: number | null;
};

export type TeacherDiscoveryResult = {
  discoverable: boolean;
  requestable: boolean;
  bookable: boolean;
  status: TeacherDiscoveryStatus;
  hiddenReasons: TeacherDiscoveryHiddenReason[];
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function hasTeacherDisciplineSignal(input: {
  discipline?: string | null;
  category?: string | null;
  disciplineCount?: number | null;
}): boolean {
  return (
    (input.disciplineCount ?? 0) > 0 ||
    hasText(input.discipline) ||
    hasText(input.category)
  );
}

export function evaluateTeacherDiscovery(input: TeacherDiscoveryInput): TeacherDiscoveryResult {
  const hiddenReasons: TeacherDiscoveryHiddenReason[] = [];
  const { profile, teacher } = input;

  if (!teacher?.id || !UUID_RE.test(teacher.id)) hiddenReasons.push("invalid_teacher_id");
  if (!teacher?.user_id || !UUID_RE.test(teacher.user_id)) hiddenReasons.push("missing_user_id");
  if (profile && profile.role !== "teacher") hiddenReasons.push("profile_not_teacher");
  if (
    profile &&
    (profile.is_active === false ||
      Boolean(profile.deactivated_at) ||
      Boolean(profile.deleted_at) ||
      Boolean(profile.anonymized_at))
  ) {
    hiddenReasons.push("profile_inactive");
  }
  if (teacher?.deactivated_at || teacher?.deleted_at) hiddenReasons.push("teacher_inactive");
  if (teacher?.is_demo === true) hiddenReasons.push("demo_profile");
  if (
    !hasTeacherDisciplineSignal({
      discipline: teacher?.discipline,
      category: teacher?.category,
      disciplineCount: input.disciplineCount,
    })
  ) {
    hiddenReasons.push("missing_discipline");
  }
  if (teacher?.identity_verification_failed === true) hiddenReasons.push("identity_failed");

  const discoverable = hiddenReasons.length === 0;
  const paymentReady = input.teacher?.payment_ready === true;
  const profileComplete = input.teacher?.profile_complete === true;
  const status: TeacherDiscoveryStatus = !discoverable
    ? "hidden"
    : paymentReady
      ? "bookable"
      : !profileComplete
        ? "profile_incomplete"
        : "payment_setup_required";

  return {
    discoverable,
    requestable: discoverable,
    bookable: discoverable && paymentReady,
    status,
    hiddenReasons,
  };
}
