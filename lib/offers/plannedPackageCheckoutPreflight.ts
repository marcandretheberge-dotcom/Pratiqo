/**
 * Planned package checkout preflight — readiness check only (no payment).
 *
 * Requires planned packages + session drafts + ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT.
 * Does not create Stripe checkout, bookings, entitlements, or redemptions.
 */

import { canUsePlannedPackageSessionDrafts } from "./plannedPackageSessionDrafts";
import { isPlannedPackagesEnabled } from "./plannedPackages";
import type { TranslationKey } from "@/lib/i18n/types";

export const ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT_FLAG =
  "ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT";
export const NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT_FLAG =
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT";

/** Future real checkout flag — intentionally never enabled by this PR. */
export const ENABLE_PLANNED_PACKAGE_CHECKOUT_FLAG = "ENABLE_PLANNED_PACKAGE_CHECKOUT";

export type PlannedPackagePreflightBlocker =
  | "planned_packages_disabled"
  | "session_drafts_disabled"
  | "checkout_preflight_disabled"
  | "draft_not_found"
  | "draft_not_owned"
  | "draft_not_active"
  | "offer_not_found"
  | "offer_not_planned_package"
  | "offer_not_available"
  | "invalid_session_count"
  | "session_slot_no_longer_available"
  | "teacher_not_available_yet"
  | "slot_outside_teacher_availability"
  | "teacher_unavailable_on_date"
  | "slot_outside_teacher_exception_hours"
  | "slot_conflict"
  | "teacher_payment_not_ready"
  | "package_legal_review_required"
  | "planned_package_checkout_not_enabled"
  | "progressive_payout_not_ready"
  | "package_refund_policy_draft"
  | "package_purchase_disabled";

export type PlannedPackagePreflightWarning =
  | "sessions_not_reserved_until_payment"
  | "availability_rechecked_before_payment"
  | "payment_coming_soon";

export type PlannedPackagePreflightSessionResult = {
  sessionIndex: number;
  startsAt: string;
  endsAt: string;
  valid: boolean;
  blockers: PlannedPackagePreflightBlocker[];
};

export type PlannedPackageCheckoutPreflightResult = {
  draftId: string;
  readyForFutureCheckout: boolean;
  package: {
    title: string;
    sessionCount: number;
    durationMinutes: number;
    priceCents: number;
    currency: string;
  };
  sessions: PlannedPackagePreflightSessionResult[];
  blockers: PlannedPackagePreflightBlocker[];
  warnings: PlannedPackagePreflightWarning[];
};

/** i18n keys for human-readable blockers (never show raw codes in UI). */
export const PLANNED_PACKAGE_PREFLIGHT_BLOCKER_I18N = {
  planned_packages_disabled: "plannedPackagePreflightPackagesDisabled",
  session_drafts_disabled: "plannedPackagePreflightDraftsDisabled",
  checkout_preflight_disabled: "plannedPackagePreflightDisabled",
  draft_not_found: "plannedPackagePreflightDraftNotFound",
  draft_not_owned: "plannedPackagePreflightDraftNotFound",
  draft_not_active: "plannedPackagePreflightDraftNotActive",
  offer_not_found: "plannedPackagePreflightOfferUnavailable",
  offer_not_planned_package: "plannedPackagePreflightOfferUnavailable",
  offer_not_available: "plannedPackagePreflightOfferUnavailable",
  invalid_session_count: "plannedPackagePreflightInvalidSessionCount",
  session_slot_no_longer_available: "plannedPackagePreflightSessionUnavailable",
  teacher_not_available_yet: "plannedPackagePreflightTeacherNotAvailableYet",
  slot_outside_teacher_availability: "plannedPackagePreflightSessionUnavailable",
  teacher_unavailable_on_date: "plannedPackagePreflightSessionUnavailable",
  slot_outside_teacher_exception_hours: "plannedPackagePreflightSessionUnavailable",
  slot_conflict: "plannedPackageActiveHoldConflict",
  teacher_payment_not_ready: "plannedPackagePreflightTeacherPaymentNotReady",
  package_legal_review_required: "plannedPackagePreflightLegalReviewRequired",
  planned_package_checkout_not_enabled: "plannedPackagePreflightPaidNotEnabled",
  progressive_payout_not_ready: "plannedPackagePreflightPaidNotEnabled",
  package_refund_policy_draft: "plannedPackagePreflightPaidNotEnabled",
  package_purchase_disabled: "plannedPackagePreflightPaidNotEnabled",
} as const satisfies Record<PlannedPackagePreflightBlocker, TranslationKey>;

export type PlannedPackagePreflightTranslator = (key: TranslationKey) => string;

/** Resolve a blocker code to localized copy via typed TranslationKey map. */
export function plannedPackagePreflightBlockerLabel(
  code: PlannedPackagePreflightBlocker,
  t: PlannedPackagePreflightTranslator,
): string {
  return t(PLANNED_PACKAGE_PREFLIGHT_BLOCKER_I18N[code]);
}

export function isPlannedPackageCheckoutPreflightEnabled(): boolean {
  return (
    process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT === "true"
  );
}

export function isPlannedPackageCheckoutPreflightUiEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT === "true"
  );
}

/** Real checkout is intentionally OFF; this PR only adds preflight. */
export function isPlannedPackageCheckoutEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT === "true";
}

export function canUsePlannedPackageCheckoutPreflight(): boolean {
  return (
    isPlannedPackagesEnabled() &&
    canUsePlannedPackageSessionDrafts() &&
    isPlannedPackageCheckoutPreflightEnabled()
  );
}

export function uniqueBlockers(
  blockers: PlannedPackagePreflightBlocker[],
): PlannedPackagePreflightBlocker[] {
  return [...new Set(blockers)];
}
