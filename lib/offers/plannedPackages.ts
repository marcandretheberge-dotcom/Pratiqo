/**
 * Phase 1 planned packages skeleton.
 *
 * Existing schema: teacher_offers.offer_type = "package" + session_count.
 * Product alias: planned_package (Phase 1) — not a prepaid hour bank.
 *
 * Defaults OFF. Does not enable checkout, entitlements, payouts, or refunds.
 * See docs/product/package-product-decision.md
 */

import { isPackageEntitlementsEnabled } from "./packageEntitlements";
import type { TeacherOfferType } from "./types";

export const ENABLE_PLANNED_PACKAGES_FLAG = "ENABLE_PLANNED_PACKAGES";
export const NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES_FLAG = "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES";

/** Phase 1 planned packages require at least two sessions. */
export const PLANNED_PACKAGE_SESSION_COUNT_MIN = 2;
export const PLANNED_PACKAGE_SESSION_COUNT_MAX = 52;

/** DB / API offer_type used for Phase 1 planned packages (no schema rename). */
export const PLANNED_PACKAGE_OFFER_TYPE: TeacherOfferType = "package";

export type PlannedPackageLaunchBlockerCode =
  | "package_legal_review_required"
  | "package_purchase_disabled"
  | "planned_packages_disabled"
  | "progressive_payout_not_ready"
  | "package_refund_policy_draft";

export function isPlannedPackagesEnabled(): boolean {
  return (
    process.env.ENABLE_PLANNED_PACKAGES === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES === "true"
  );
}

export function isPlannedPackageOfferType(
  offerType: TeacherOfferType | string | null | undefined,
): boolean {
  return offerType === PLANNED_PACKAGE_OFFER_TYPE;
}

/** Teachers may draft planned packages only when the skeleton flag is ON. */
export function canDraftPlannedPackageOffers(): boolean {
  return isPlannedPackagesEnabled();
}

export function isPackageLegalReviewCompleted(): boolean {
  return process.env.PACKAGE_LEGAL_REVIEW_COMPLETED === "true";
}

/**
 * Public purchase path remains blocked while legal, entitlements, payout, or refund
 * gates are incomplete. This skeleton PR always keeps progressive payout / refund draft blockers.
 */
export function getPlannedPackagePublicLaunchBlockers(): PlannedPackageLaunchBlockerCode[] {
  const blockers: PlannedPackageLaunchBlockerCode[] = [];

  if (!isPlannedPackagesEnabled()) {
    blockers.push("planned_packages_disabled");
  }
  if (!isPackageLegalReviewCompleted()) {
    blockers.push("package_legal_review_required");
  }
  if (!isPackageEntitlementsEnabled()) {
    blockers.push("package_purchase_disabled");
  }
  // Not implemented in this PR — keep public launch blocked.
  blockers.push("progressive_payout_not_ready");
  blockers.push("package_refund_policy_draft");

  return blockers;
}

export function canPubliclyPurchasePlannedPackage(): boolean {
  return getPlannedPackagePublicLaunchBlockers().length === 0;
}

/** Prefer hide planned packages on public profile until purchase path is ready. */
export function canShowPlannedPackageOnPublicProfile(): boolean {
  return canPubliclyPurchasePlannedPackage();
}

export function assertPlannedPackagePublishAllowed(
  offerType: TeacherOfferType | string | null | undefined,
): { ok: true } | { ok: false; error: "offer_not_publishable"; blockers: PlannedPackageLaunchBlockerCode[] } {
  if (!isPlannedPackageOfferType(offerType)) return { ok: true };
  const blockers = getPlannedPackagePublicLaunchBlockers();
  if (blockers.length === 0) return { ok: true };
  return { ok: false, error: "offer_not_publishable", blockers };
}

export function assertPlannedPackageDraftAllowed(
  offerType: TeacherOfferType | string | null | undefined,
  options?: { allowExistingPackageDraft?: boolean },
): { ok: true } | { ok: false; error: "planned_packages_disabled"; blockers: PlannedPackageLaunchBlockerCode[] } {
  if (!isPlannedPackageOfferType(offerType)) return { ok: true };
  if (canDraftPlannedPackageOffers()) return { ok: true };
  if (options?.allowExistingPackageDraft) return { ok: true };
  return {
    ok: false,
    error: "planned_packages_disabled",
    blockers: ["planned_packages_disabled"],
  };
}

export function isValidPlannedPackageSessionCount(value: number | null | undefined): boolean {
  return (
    value != null &&
    Number.isInteger(value) &&
    value >= PLANNED_PACKAGE_SESSION_COUNT_MIN &&
    value <= PLANNED_PACKAGE_SESSION_COUNT_MAX
  );
}
