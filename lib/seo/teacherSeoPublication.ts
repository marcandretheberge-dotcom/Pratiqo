import { isTeacherMarketSupported } from "@/lib/config/markets";
import type { Locale } from "@/lib/i18n/types";
import {
  isTeacherPayoutReadyForCheckout,
  teacherPayoutReadinessFailureReasons,
  type TeacherPayoutReadinessInput,
} from "@/lib/payments/connect";
import {
  buildTeacherPublicProfileCanonicalUrl,
  buildTeacherPublicProfileDescription,
  buildTeacherPublicProfilePath,
  buildTeacherPublicProfileTitle,
  isTeacherPublicProfileIndexable,
  isTeacherPublicProfilePageVisible,
  publicTeacherFirstName,
  resolveTeacherSeoCityLabel,
  teacherHasAtLeastOneSubject,
  teacherHasPublicLocationOrTeachingFormat,
  teacherHasSufficientPublicContent,
  type TeacherPublicSeoFields,
} from "@/lib/seo/teacherPublicProfile";
import type { TeacherMarketplaceVisibilityRow } from "@/lib/teachers/marketplaceVisibility";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeacherSeoMissingReasonKey =
  | "display_name"
  | "public_bio"
  | "main_subject"
  | "location_or_format"
  | "teaching_format"
  | "onboarding_incomplete"
  | "admin_hidden"
  | "identity_failed"
  | "unsupported_market"
  | "search_consent_missing"
  | "public_profile_intent_missing"
  | "slug_missing"
  | "not_admin_published"
  | "payout_not_ready";

export type TeacherSeoPublicationRow = TeacherPublicSeoFields & {
  teaching_mode?: string | null;
  image_url?: string | null;
  price_per_lesson?: number | null;
  intro_session_enabled?: boolean | null;
  stripe_account_id?: string | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
  stripe_connect_requirements_due?: unknown;
  stripe_connect_disabled_reason?: string | null;
};

export type TeacherSeoPublicationEvaluation = {
  contentReady: boolean;
  teacherRequestedPublication: boolean;
  isPublic: boolean;
  isPageVisible: boolean;
  isIndexable: boolean;
  isSitemapEligible: boolean;
  missingReasonKeys: TeacherSeoMissingReasonKey[];
  canonicalUrl: string | null;
  previewPath: string | null;
  generatedTitle: string | null;
  generatedDescription: string | null;
  paidBookingCtaEnabled: boolean;
  payoutReady: boolean;
  payoutBlockers: string[];
  canRequestPublication: boolean;
  canAdminPublish: boolean;
  canAdminUnpublish: boolean;
  adminPublishBlockers: TeacherSeoMissingReasonKey[];
};

function normalizeTeachingMode(mode: string | null | undefined): string {
  return typeof mode === "string" ? mode.trim().toLowerCase() : "";
}

/** Profile/account gates for SEO without requiring marketplace `is_public`. */
export function isTeacherSeoAccountGateOpen(row: TeacherMarketplaceVisibilityRow): boolean {
  if (!UUID_RE.test(row.id)) return false;
  if (!row.user_id || !UUID_RE.test(row.user_id)) return false;
  if (row.is_demo === true) return false;
  if (row.deactivated_at || row.deleted_at) return false;
  if (row.identity_verification_failed === true) return false;
  if (row.profile_is_active === false) return false;
  if (row.profile_deactivated_at || row.profile_deleted_at || row.profile_anonymized_at) return false;
  return true;
}

export function teacherHasPublicTeachingFormat(
  row: Pick<TeacherSeoPublicationRow, "teaching_mode">,
): boolean {
  const mode = normalizeTeachingMode(row.teaching_mode);
  return mode === "online" || mode === "both" || mode === "in_person" || mode === "in-person";
}

export function teacherHasRequestedSeoPublication(
  row: Pick<TeacherPublicSeoFields, "public_profile_enabled" | "search_indexing_consent">,
): boolean {
  return row.public_profile_enabled === true && row.search_indexing_consent === true;
}

/** Content/onboarding readiness for teacher SEO request (does not require `is_public`). */
export function isTeacherSeoProfileContentReady(row: TeacherSeoPublicationRow): boolean {
  if (!isTeacherSeoAccountGateOpen(row)) return false;
  if (!isTeacherMarketSupported(String(row.country_code ?? "").trim().toUpperCase())) return false;
  if (row.teacher_onboarding_complete !== true) return false;
  if (!teacherHasSufficientPublicContent(row)) return false;
  if (!teacherHasAtLeastOneSubject(row)) return false;
  if (!teacherHasPublicLocationOrTeachingFormat(row)) return false;
  if (!teacherHasPublicTeachingFormat(row)) return false;
  return true;
}

export function isTeacherPaidBookingCtaEnabled(
  row: Pick<TeacherSeoPublicationRow, "price_per_lesson" | "intro_session_enabled">,
): boolean {
  const price = Number(row.price_per_lesson) || 0;
  if (price > 0) return true;
  return row.intro_session_enabled === true;
}

export function collectTeacherSeoContentMissingReasonKeys(
  row: TeacherSeoPublicationRow,
): TeacherSeoMissingReasonKey[] {
  const reasons: TeacherSeoMissingReasonKey[] = [];

  if (!isTeacherSeoAccountGateOpen(row)) reasons.push("admin_hidden");
  if (row.identity_verification_failed === true) reasons.push("identity_failed");
  if (!isTeacherMarketSupported(String(row.country_code ?? "").trim().toUpperCase())) {
    reasons.push("unsupported_market");
  }
  if (row.teacher_onboarding_complete !== true) reasons.push("onboarding_incomplete");

  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (name.length < 2) reasons.push("display_name");

  if (!teacherHasSufficientPublicContent(row)) reasons.push("public_bio");
  if (!teacherHasAtLeastOneSubject(row)) reasons.push("main_subject");
  if (!teacherHasPublicLocationOrTeachingFormat(row)) reasons.push("location_or_format");
  if (!teacherHasPublicTeachingFormat(row)) reasons.push("teaching_format");

  return reasons;
}

export function collectTeacherSeoAdminPublishBlockers(
  row: TeacherSeoPublicationRow,
): TeacherSeoMissingReasonKey[] {
  const reasons = collectTeacherSeoContentMissingReasonKeys(row);

  if (!teacherHasRequestedSeoPublication(row)) {
    if (row.public_profile_enabled !== true) reasons.push("public_profile_intent_missing");
    if (row.search_indexing_consent !== true) reasons.push("search_consent_missing");
  }

  const slug = typeof row.public_profile_slug === "string" ? row.public_profile_slug.trim() : "";
  if (!slug) reasons.push("slug_missing");

  if (isTeacherPaidBookingCtaEnabled(row) && !isTeacherPayoutReadyForCheckout(row)) {
    reasons.push("payout_not_ready");
  }

  return [...new Set(reasons)];
}

function buildGeneratedSeoCopy(row: TeacherSeoPublicationRow, locale: Locale) {
  const slug = typeof row.public_profile_slug === "string" ? row.public_profile_slug.trim() : "";
  if (!slug) {
    return {
      canonicalUrl: null as string | null,
      previewPath: null as string | null,
      generatedTitle: null as string | null,
      generatedDescription: null as string | null,
    };
  }

  const subject = typeof row.discipline === "string" ? row.discipline.trim() : "";
  const firstName = publicTeacherFirstName(row.name);
  const cityLabel = resolveTeacherSeoCityLabel(locale, {
    city: row.city,
    region: row.region,
    teachingMode: row.teaching_mode,
  });

  return {
    canonicalUrl: buildTeacherPublicProfileCanonicalUrl(slug),
    previewPath: buildTeacherPublicProfilePath(slug),
    generatedTitle: buildTeacherPublicProfileTitle({
      locale,
      subject,
      firstName,
      cityLabel,
    }),
    generatedDescription: buildTeacherPublicProfileDescription({
      locale,
      subject,
      firstName,
      cityLabel,
    }),
  };
}

export function evaluateTeacherSeoPublication(
  row: TeacherSeoPublicationRow,
  locale: Locale = "fr",
): TeacherSeoPublicationEvaluation {
  const contentReady = isTeacherSeoProfileContentReady(row);
  const teacherRequestedPublication = teacherHasRequestedSeoPublication(row);
  const isPublic = row.is_public === true;
  const isPageVisible = isTeacherPublicProfilePageVisible(row);
  const isIndexable = isTeacherPublicProfileIndexable(row);
  const isSitemapEligible = isIndexable;
  const paidBookingCtaEnabled = isTeacherPaidBookingCtaEnabled(row);
  const payoutBlockers = teacherPayoutReadinessFailureReasons(row);
  const payoutReady = payoutBlockers.length === 0;
  const missingReasonKeys = collectTeacherSeoContentMissingReasonKeys(row);
  const adminPublishBlockers = collectTeacherSeoAdminPublishBlockers(row);
  const seoCopy = buildGeneratedSeoCopy(row, locale);

  if (!isPublic && teacherRequestedPublication) {
    if (!missingReasonKeys.includes("not_admin_published")) {
      missingReasonKeys.push("not_admin_published");
    }
  }

  const canRequestPublication =
    contentReady &&
    !teacherRequestedPublication &&
    isTeacherSeoAccountGateOpen(row) &&
    isTeacherMarketSupported(String(row.country_code ?? "").trim().toUpperCase());

  const canAdminPublish = adminPublishBlockers.length === 0 && !isPublic;
  const canAdminUnpublish = isPublic && isTeacherSeoAccountGateOpen(row);

  return {
    contentReady,
    teacherRequestedPublication,
    isPublic,
    isPageVisible,
    isIndexable,
    isSitemapEligible,
    missingReasonKeys: [...new Set(missingReasonKeys)],
    canonicalUrl: seoCopy.canonicalUrl,
    previewPath: seoCopy.previewPath,
    generatedTitle: seoCopy.generatedTitle,
    generatedDescription: seoCopy.generatedDescription,
    paidBookingCtaEnabled,
    payoutReady,
    payoutBlockers,
    canRequestPublication,
    canAdminPublish,
    canAdminUnpublish,
    adminPublishBlockers,
  };
}
