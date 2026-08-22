/**
 * Planned package refund quote flags — quote/admin review only, no Stripe refund.
 */

import { canUsePlannedPackageAdminOps } from "./plannedPackageAdminOps";

export const ENABLE_PLANNED_PACKAGE_REFUND_QUOTES_FLAG = "ENABLE_PLANNED_PACKAGE_REFUND_QUOTES";
export const ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW_FLAG =
  "ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW";
export const NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CANCELLATION_REQUESTS =
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CANCELLATION_REQUESTS";

/** Draft policy version — not legal approval. */
export const PLANNED_PACKAGE_REFUND_POLICY_VERSION = "planned-package-refund-v1-draft-2026";

export function isPlannedPackageRefundQuotesEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_REFUND_QUOTES === "true";
}

export function isPlannedPackageRefundAdminReviewEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW === "true";
}

export function isPlannedPackageCancellationRequestsUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CANCELLATION_REQUESTS === "true";
}

/** Quote generation requires admin ops chain + explicit refund quote flag. */
export function canUsePlannedPackageRefundQuotes(): boolean {
  return isPlannedPackageRefundQuotesEnabled() && canUsePlannedPackageAdminOps();
}

/** Approve-for-manual-refund requires admin review flag + quote flag. */
export function canUsePlannedPackageRefundAdminReview(): boolean {
  return (
    canUsePlannedPackageRefundQuotes() && isPlannedPackageRefundAdminReviewEnabled()
  );
}
