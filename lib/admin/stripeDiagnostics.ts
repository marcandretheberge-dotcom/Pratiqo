import { isPayoutMarketSupported, normalizeCountryCode } from "@/lib/config/markets";
import {
  deriveTeacherReadinessContract,
  type TeacherBookingReadinessBlocker,
  type TeacherStripeReadinessBlocker,
} from "@/lib/teachers/readinessContracts";

export type AdminStripeDiagnosticLabel =
  | "missing_stripe_account"
  | "connect_started"
  | "onboarding_incomplete"
  | "onboarding_complete"
  | "charges_enabled"
  | "charges_disabled"
  | "payouts_enabled"
  | "payouts_disabled"
  | "requirements_due_blocking_current_logic"
  | "disabled_by_stripe"
  | "market_not_supported"
  | "country_code_missing"
  | "sync_never_run"
  | "sync_stale_over_24h"
  | "sync_stale_over_7d"
  | "identity_verified"
  | "identity_pending"
  | "identity_failed"
  | "identity_missing"
  | "possible_false_negative_from_collapsed_requirements";

export type AdminStripeDiagnosticsFilter =
  | "all"
  | "missing_stripe_account"
  | "onboarding_incomplete"
  | "charges_disabled"
  | "payouts_disabled"
  | "requirements_due"
  | "sync_stale"
  | "identity_failed"
  | "possible_false_negative"
  | "market_unsupported";

export const ADMIN_STRIPE_DIAGNOSTIC_FILTERS: readonly AdminStripeDiagnosticsFilter[] = [
  "all",
  "missing_stripe_account",
  "onboarding_incomplete",
  "charges_disabled",
  "payouts_disabled",
  "requirements_due",
  "sync_stale",
  "identity_failed",
  "possible_false_negative",
  "market_unsupported",
] as const;

export type AdminStripeSyncFreshness = "fresh" | "stale" | "never_synced";
export type AdminStripeIdentityStatus = "verified" | "pending" | "failed" | "missing";

export type AdminStripeDiagnosticsTeacher = {
  teacherId: string | null;
  userId: string;
  name: string | null;
  email: string | null;
  countryCode: string | null;
  marketPayoutSupported: boolean;
  hasStripeAccount: boolean;
  maskedStripeAccountId: string | null;
  connect: {
    onboardingComplete: boolean | null;
    chargesEnabled: boolean | null;
    payoutsEnabled: boolean | null;
    requirementsDue: string[];
    disabledReason: string | null;
    lastSyncedAt: string | null;
    syncFreshness: AdminStripeSyncFreshness;
  };
  identity: {
    status: AdminStripeIdentityStatus;
    verified: boolean | null;
    identityStatus: string | null;
    stripeIdentityStatus: string | null;
    failedReason: string | null;
  };
  currentLogic: {
    paymentReady: boolean;
    payoutReady: boolean;
    bookingReady: boolean;
    paymentBlockers: TeacherStripeReadinessBlocker[];
    payoutBlockers: TeacherStripeReadinessBlocker[];
    bookingBlockers: TeacherBookingReadinessBlocker[];
  };
  labels: AdminStripeDiagnosticLabel[];
  warnings: AdminStripeDiagnosticLabel[];
};

export type AdminStripeDiagnosticsSummary = {
  totalTeachers: number;
  teachersWithStripeAccount: number;
  teachersWithoutStripeAccount: number;
  onboardingComplete: number;
  chargesEnabled: number;
  payoutsEnabled: number;
  requirementsDueNonEmpty: number;
  disabledReasonNonEmpty: number;
  paymentReadyUnderCurrentLogic: number;
  payoutReadyUnderCurrentLogic: number;
  identityVerified: number;
  identityPending: number;
  identityFailed: number;
  syncNeverRun: number;
  syncStaleOver24h: number;
  syncStaleOver7d: number;
  possibleFalseNegatives: number;
  marketNotSupported: number;
  countryCodeMissing: number;
};

export type AdminStripeDiagnosticsResult = {
  generatedAt: string;
  filter: AdminStripeDiagnosticsFilter;
  query: string;
  summary: AdminStripeDiagnosticsSummary;
  teachers: AdminStripeDiagnosticsTeacher[];
};

type QueryResult<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

type QueryBuilder<T> = QueryResult<T> & {
  eq: (...args: unknown[]) => QueryBuilder<T>;
  in: (...args: unknown[]) => QueryBuilder<T>;
  order: (...args: unknown[]) => QueryBuilder<T>;
  limit: (...args: unknown[]) => QueryBuilder<T>;
};

type AdminClient = {
  from: <T = unknown>(table: string) => {
    select: (columns: string) => QueryBuilder<T>;
  };
};

export type AdminStripeDiagnosticsDbClient = AdminClient;

type ProfileRow = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  country_code?: string | null;
  teacher_onboarding_complete?: boolean | null;
  is_active?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  anonymized_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TeacherRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  country_code: string | null;
  availability: unknown;
  is_public: boolean | null;
  is_demo: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  identity_verified: boolean | null;
  identity_status: string | null;
  stripe_identity_status: string | null;
  stripe_identity_failed_reason: string | null;
  stripe_account_id: string | null;
  stripe_connect_onboarding_complete: boolean | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_payouts_enabled: boolean | null;
  stripe_connect_requirements_due: unknown;
  stripe_connect_disabled_reason: string | null;
  stripe_connect_last_synced_at: string | null;
};

const PROFILE_SELECT = [
  "id",
  "email",
  "name",
  "role",
  "country_code",
  "teacher_onboarding_complete",
  "is_active",
  "deactivated_at",
  "deleted_at",
  "anonymized_at",
  "created_at",
  "updated_at",
].join(", ");

const TEACHER_SELECT = [
  "id",
  "user_id",
  "name",
  "country_code",
  "availability",
  "is_public",
  "is_demo",
  "deactivated_at",
  "deleted_at",
  "identity_verified",
  "identity_status",
  "stripe_identity_status",
  "stripe_identity_failed_reason",
  "stripe_account_id",
  "stripe_connect_onboarding_complete",
  "stripe_connect_charges_enabled",
  "stripe_connect_payouts_enabled",
  "stripe_connect_requirements_due",
  "stripe_connect_disabled_reason",
  "stripe_connect_last_synced_at",
].join(", ");

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;

export function normalizeRequirementsDue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return normalizeRequirementsDue(JSON.parse(trimmed) as unknown);
    } catch {
      return [trimmed];
    }
  }

  return [];
}

export function maskStripeAccountId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const suffix = trimmed.slice(-4);
  return `acct_****${suffix}`;
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasAvailabilitySignal(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => typeof item === "string" && item.trim());
  if (typeof value === "string") {
    const trimmed = value.trim();
    return Boolean(trimmed && trimmed !== "[]" && trimmed !== "{}" && trimmed !== "null");
  }
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

function profileVisibilityReady(profile: ProfileRow, teacher: TeacherRow | null): boolean {
  if (!teacher) return false;
  if (profile.is_active === false) return false;
  if (profile.deactivated_at || profile.deleted_at || profile.anonymized_at) return false;
  if (teacher.deactivated_at || teacher.deleted_at || teacher.is_demo === true) return false;
  return teacher.is_public === true;
}

function deriveSyncFreshness(
  lastSyncedAt: string | null | undefined,
  now: Date,
): { freshness: AdminStripeSyncFreshness; staleOver24h: boolean; staleOver7d: boolean } {
  const trimmed = cleanString(lastSyncedAt);
  if (!trimmed) {
    return { freshness: "never_synced", staleOver24h: false, staleOver7d: false };
  }

  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) {
    return { freshness: "stale", staleOver24h: true, staleOver7d: true };
  }

  const ageMs = Math.max(0, now.getTime() - timestamp);
  const staleOver24h = ageMs > DAY_MS;
  const staleOver7d = ageMs > 7 * DAY_MS;
  return {
    freshness: staleOver24h ? "stale" : "fresh",
    staleOver24h,
    staleOver7d,
  };
}

function deriveIdentityStatus(row: TeacherRow | null): AdminStripeIdentityStatus {
  if (!row) return "missing";
  const stripeStatus = String(row.stripe_identity_status ?? "").trim().toLowerCase();
  const legacyStatus = String(row.identity_status ?? "").trim().toLowerCase();

  if (row.identity_verified === true || stripeStatus === "verified" || legacyStatus === "verified") {
    return "verified";
  }
  if (stripeStatus === "failed" || stripeStatus === "canceled" || legacyStatus === "failed") {
    return "failed";
  }
  if (
    stripeStatus === "processing" ||
    stripeStatus === "requires_input" ||
    legacyStatus === "pending"
  ) {
    return "pending";
  }
  return "missing";
}

function uniqueLabels(labels: AdminStripeDiagnosticLabel[]): AdminStripeDiagnosticLabel[] {
  return Array.from(new Set(labels));
}

export function deriveAdminStripeDiagnosticsTeacher(
  input: { profile: ProfileRow; teacher: TeacherRow | null },
  now = new Date(),
): AdminStripeDiagnosticsTeacher {
  const { profile, teacher } = input;
  const stripeAccountId = cleanString(teacher?.stripe_account_id);
  const hasStripeAccount = Boolean(stripeAccountId);
  const requirementsDue = normalizeRequirementsDue(teacher?.stripe_connect_requirements_due);
  const countryCode = normalizeCountryCode(teacher?.country_code ?? profile.country_code ?? "") || null;
  const marketPayoutSupported = Boolean(countryCode && isPayoutMarketSupported(countryCode));
  const sync = deriveSyncFreshness(teacher?.stripe_connect_last_synced_at, now);
  const identityStatus = deriveIdentityStatus(teacher);
  const visibilityReady = profileVisibilityReady(profile, teacher);

  const readiness = deriveTeacherReadinessContract({
    stripe_account_id: teacher?.stripe_account_id ?? null,
    stripe_connect_onboarding_complete: teacher?.stripe_connect_onboarding_complete ?? null,
    stripe_connect_charges_enabled: teacher?.stripe_connect_charges_enabled ?? null,
    stripe_connect_payouts_enabled: teacher?.stripe_connect_payouts_enabled ?? null,
    stripe_connect_requirements_due: requirementsDue,
    stripe_connect_disabled_reason: teacher?.stripe_connect_disabled_reason ?? null,
    profileVisibilityReady: visibilityReady,
    hasBookableAvailability: teacher ? hasAvailabilitySignal(teacher.availability) : false,
    requiresOnlinePayment: true,
  });

  const labels: AdminStripeDiagnosticLabel[] = [];
  if (!hasStripeAccount) {
    labels.push("missing_stripe_account");
  } else {
    labels.push("connect_started");
  }

  if (teacher?.stripe_connect_onboarding_complete === true) {
    labels.push("onboarding_complete");
  } else if (hasStripeAccount) {
    labels.push("onboarding_incomplete");
  }

  labels.push(
    teacher?.stripe_connect_charges_enabled === true ? "charges_enabled" : "charges_disabled",
  );
  labels.push(
    teacher?.stripe_connect_payouts_enabled === true ? "payouts_enabled" : "payouts_disabled",
  );

  if (requirementsDue.length > 0) labels.push("requirements_due_blocking_current_logic");
  if (cleanString(teacher?.stripe_connect_disabled_reason)) labels.push("disabled_by_stripe");
  if (!countryCode) labels.push("country_code_missing");
  if (countryCode && !marketPayoutSupported) labels.push("market_not_supported");
  if (sync.freshness === "never_synced") labels.push("sync_never_run");
  if (sync.staleOver24h) labels.push("sync_stale_over_24h");
  if (sync.staleOver7d) labels.push("sync_stale_over_7d");

  if (identityStatus === "verified") labels.push("identity_verified");
  if (identityStatus === "pending") labels.push("identity_pending");
  if (identityStatus === "failed") labels.push("identity_failed");
  if (identityStatus === "missing") labels.push("identity_missing");

  const possibleFalseNegativeFromCollapsedRequirements =
    hasStripeAccount &&
    requirementsDue.length > 0 &&
    (teacher?.stripe_connect_charges_enabled === true ||
      teacher?.stripe_connect_payouts_enabled === true);
  if (possibleFalseNegativeFromCollapsedRequirements) {
    labels.push("possible_false_negative_from_collapsed_requirements");
  }

  const normalizedLabels = uniqueLabels(labels);
  const warnings = normalizedLabels.filter((label) =>
    [
      "requirements_due_blocking_current_logic",
      "disabled_by_stripe",
      "market_not_supported",
      "country_code_missing",
      "sync_never_run",
      "sync_stale_over_24h",
      "sync_stale_over_7d",
      "identity_failed",
      "possible_false_negative_from_collapsed_requirements",
    ].includes(label),
  );

  return {
    teacherId: teacher?.id ?? null,
    userId: profile.id,
    name: teacher?.name ?? profile.name ?? null,
    email: profile.email ?? null,
    countryCode,
    marketPayoutSupported,
    hasStripeAccount,
    maskedStripeAccountId: maskStripeAccountId(stripeAccountId),
    connect: {
      onboardingComplete: teacher?.stripe_connect_onboarding_complete ?? null,
      chargesEnabled: teacher?.stripe_connect_charges_enabled ?? null,
      payoutsEnabled: teacher?.stripe_connect_payouts_enabled ?? null,
      requirementsDue,
      disabledReason: cleanString(teacher?.stripe_connect_disabled_reason),
      lastSyncedAt: teacher?.stripe_connect_last_synced_at ?? null,
      syncFreshness: sync.freshness,
    },
    identity: {
      status: identityStatus,
      verified: teacher?.identity_verified ?? null,
      identityStatus: teacher?.identity_status ?? null,
      stripeIdentityStatus: teacher?.stripe_identity_status ?? null,
      failedReason: teacher?.stripe_identity_failed_reason ?? null,
    },
    currentLogic: {
      paymentReady: readiness.paymentReady,
      payoutReady: readiness.payoutReady,
      bookingReady: readiness.bookingReady,
      paymentBlockers: readiness.paymentBlockers,
      payoutBlockers: readiness.payoutBlockers,
      bookingBlockers: readiness.bookingBlockers,
    },
    labels: normalizedLabels,
    warnings,
  };
}

export function summarizeAdminStripeDiagnostics(
  teachers: AdminStripeDiagnosticsTeacher[],
): AdminStripeDiagnosticsSummary {
  const hasLabel = (teacher: AdminStripeDiagnosticsTeacher, label: AdminStripeDiagnosticLabel) =>
    teacher.labels.includes(label);

  return {
    totalTeachers: teachers.length,
    teachersWithStripeAccount: teachers.filter((teacher) => teacher.hasStripeAccount).length,
    teachersWithoutStripeAccount: teachers.filter((teacher) => !teacher.hasStripeAccount).length,
    onboardingComplete: teachers.filter((teacher) => teacher.connect.onboardingComplete === true).length,
    chargesEnabled: teachers.filter((teacher) => teacher.connect.chargesEnabled === true).length,
    payoutsEnabled: teachers.filter((teacher) => teacher.connect.payoutsEnabled === true).length,
    requirementsDueNonEmpty: teachers.filter((teacher) => teacher.connect.requirementsDue.length > 0).length,
    disabledReasonNonEmpty: teachers.filter((teacher) => Boolean(teacher.connect.disabledReason)).length,
    paymentReadyUnderCurrentLogic: teachers.filter((teacher) => teacher.currentLogic.paymentReady).length,
    payoutReadyUnderCurrentLogic: teachers.filter((teacher) => teacher.currentLogic.payoutReady).length,
    identityVerified: teachers.filter((teacher) => teacher.identity.status === "verified").length,
    identityPending: teachers.filter((teacher) => teacher.identity.status === "pending").length,
    identityFailed: teachers.filter((teacher) => teacher.identity.status === "failed").length,
    syncNeverRun: teachers.filter((teacher) => hasLabel(teacher, "sync_never_run")).length,
    syncStaleOver24h: teachers.filter((teacher) => hasLabel(teacher, "sync_stale_over_24h")).length,
    syncStaleOver7d: teachers.filter((teacher) => hasLabel(teacher, "sync_stale_over_7d")).length,
    possibleFalseNegatives: teachers.filter((teacher) =>
      hasLabel(teacher, "possible_false_negative_from_collapsed_requirements"),
    ).length,
    marketNotSupported: teachers.filter((teacher) => hasLabel(teacher, "market_not_supported")).length,
    countryCodeMissing: teachers.filter((teacher) => hasLabel(teacher, "country_code_missing")).length,
  };
}

export function normalizeAdminStripeDiagnosticsFilter(
  value: string | null | undefined,
): AdminStripeDiagnosticsFilter {
  return ADMIN_STRIPE_DIAGNOSTIC_FILTERS.includes(value as AdminStripeDiagnosticsFilter)
    ? (value as AdminStripeDiagnosticsFilter)
    : "all";
}

function matchesFilter(
  teacher: AdminStripeDiagnosticsTeacher,
  filter: AdminStripeDiagnosticsFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "missing_stripe_account") return teacher.labels.includes("missing_stripe_account");
  if (filter === "onboarding_incomplete") return teacher.labels.includes("onboarding_incomplete");
  if (filter === "charges_disabled") return teacher.labels.includes("charges_disabled");
  if (filter === "payouts_disabled") return teacher.labels.includes("payouts_disabled");
  if (filter === "requirements_due") {
    return teacher.labels.includes("requirements_due_blocking_current_logic");
  }
  if (filter === "sync_stale") {
    return (
      teacher.labels.includes("sync_never_run") ||
      teacher.labels.includes("sync_stale_over_24h") ||
      teacher.labels.includes("sync_stale_over_7d")
    );
  }
  if (filter === "identity_failed") return teacher.labels.includes("identity_failed");
  if (filter === "possible_false_negative") {
    return teacher.labels.includes("possible_false_negative_from_collapsed_requirements");
  }
  if (filter === "market_unsupported") return teacher.labels.includes("market_not_supported");
  return true;
}

function matchesSearch(
  profile: ProfileRow,
  teacher: TeacherRow | null,
  diagnostic: AdminStripeDiagnosticsTeacher,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    diagnostic.name,
    diagnostic.email,
    diagnostic.maskedStripeAccountId,
    teacher?.stripe_account_id,
    diagnostic.teacherId,
    profile.id,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

export async function listAdminStripeDiagnostics(
  admin: AdminClient,
  options: {
    filter?: string | null;
    q?: string | null;
    limit?: number | null;
    now?: Date;
  } = {},
): Promise<AdminStripeDiagnosticsResult> {
  const filter = normalizeAdminStripeDiagnosticsFilter(options.filter);
  const query = options.q?.trim() ?? "";
  const limit =
    typeof options.limit === "number" && Number.isFinite(options.limit) && options.limit > 0
      ? Math.min(Math.trunc(options.limit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const now = options.now ?? new Date();

  const profileResult = await admin
    .from<ProfileRow>("profiles")
    .select(PROFILE_SELECT)
    .eq("role", "teacher")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  const profiles = profileResult.data ?? [];
  const profileIds = profiles.map((profile) => profile.id).filter(Boolean);
  const teacherByUserId = new Map<string, TeacherRow>();

  if (profileIds.length > 0) {
    const teacherResult = await admin
      .from<TeacherRow>("teachers")
      .select(TEACHER_SELECT)
      .in("user_id", profileIds);

    if (teacherResult.error) {
      throw new Error(teacherResult.error.message);
    }

    for (const teacher of teacherResult.data ?? []) {
      if (teacher.user_id) teacherByUserId.set(teacher.user_id, teacher);
    }
  }

  const rows = profiles
    .map((profile) => {
      const teacher = teacherByUserId.get(profile.id) ?? null;
      const diagnostic = deriveAdminStripeDiagnosticsTeacher({ profile, teacher }, now);
      return { profile, teacher, diagnostic };
    })
    .filter(({ profile, teacher, diagnostic }) => matchesSearch(profile, teacher, diagnostic, query))
    .filter(({ diagnostic }) => matchesFilter(diagnostic, filter))
    .map(({ diagnostic }) => diagnostic);

  return {
    generatedAt: now.toISOString(),
    filter,
    query: query ? "[filtered]" : "",
    summary: summarizeAdminStripeDiagnostics(rows),
    teachers: rows,
  };
}
