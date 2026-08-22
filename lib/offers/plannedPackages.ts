/**
 * Phase 1 planned packages skeleton.
 *
 * Existing schema: teacher_offers.offer_type = "package" + session_count.
 * Product alias: planned_package (Phase 1) — not a prepaid hour bank.
 *
 * Defaults OFF. Does not enable checkout, entitlements, payouts, or refunds.
 * See docs/product/package-product-decision.md
 */

import type { TeacherOfferType } from "./types";
import {
  canPubliclyPurchasePlannedPackageViaGate,
  evaluatePlannedPackagePublicLaunchGate,
  isTeacherPackageTermsAccepted,
  type PlannedPackagePublicLaunchBlockerCode,
} from "./plannedPackagePublicLaunchGate";

export const ENABLE_PLANNED_PACKAGES_FLAG = "ENABLE_PLANNED_PACKAGES";
export const NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES_FLAG = "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES";

/** Phase 1 planned packages require at least two sessions. */
export const PLANNED_PACKAGE_SESSION_COUNT_MIN = 2;
export const PLANNED_PACKAGE_SESSION_COUNT_MAX = 52;

/** DB / API offer_type used for Phase 1 planned packages (no schema rename). */
export const PLANNED_PACKAGE_OFFER_TYPE: TeacherOfferType = "package";

export type PlannedPackageLaunchBlockerCode = PlannedPackagePublicLaunchBlockerCode;

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
 * Public purchase blockers from the centralized launch gate.
 * Defaults keep purchase OFF (public purchase flag + infrastructure + legal).
 */
export function getPlannedPackagePublicLaunchBlockers(): PlannedPackageLaunchBlockerCode[] {
  return evaluatePlannedPackagePublicLaunchGate().blockers;
}

export function canPubliclyPurchasePlannedPackage(): boolean {
  return canPubliclyPurchasePlannedPackageViaGate();
}

function isPlannedPackageSessionDraftsFlagOn(): boolean {
  return (
    process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true"
  );
}

/** Prefer hide planned packages on public profile until purchase path is ready. */
export function canShowPlannedPackageOnPublicProfile(): boolean {
  return evaluatePlannedPackagePublicLaunchGate().canShowPackagePublicly;
}

export function assertPlannedPackagePublishAllowed(
  offerType: TeacherOfferType | string | null | undefined,
  options?: {
    teacherPackageTermsAcceptedAt?: string | null;
    teacherPackageTermsPolicyVersion?: string | null;
  },
): { ok: true } | { ok: false; error: "offer_not_publishable"; blockers: PlannedPackageLaunchBlockerCode[] } {
  if (!isPlannedPackageOfferType(offerType)) return { ok: true };

  // Session-draft preview may publish for visibility when drafts are on,
  // but teacher must acknowledge package terms before public package offers.
  if (isPlannedPackagesEnabled() && isPlannedPackageSessionDraftsFlagOn()) {
    if (
      !isTeacherPackageTermsAccepted({
        acceptedAt: options?.teacherPackageTermsAcceptedAt,
        policyVersion: options?.teacherPackageTermsPolicyVersion,
      })
    ) {
      return {
        ok: false,
        error: "offer_not_publishable",
        blockers: ["teacher_package_terms_required"],
      };
    }
    return { ok: true };
  }

  const blockers = getPlannedPackagePublicLaunchBlockers();
  if (
    !isTeacherPackageTermsAccepted({
      acceptedAt: options?.teacherPackageTermsAcceptedAt,
      policyVersion: options?.teacherPackageTermsPolicyVersion,
    })
  ) {
    blockers.push("teacher_package_terms_required");
  }
  if (blockers.length === 0) return { ok: true };
  return { ok: false, error: "offer_not_publishable", blockers: [...new Set(blockers)] };
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
