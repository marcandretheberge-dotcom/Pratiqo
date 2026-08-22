/**
 * Planned package manual refund execution flags — admin-only, approved quote required.
 */

import {
  canUsePlannedPackageRefundAdminReview,
  canUsePlannedPackageRefundQuotes,
} from "./plannedPackageRefundQuotes";

export const ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS_FLAG =
  "ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS";

export function isPlannedPackageManualRefundsEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS === "true";
}

/** Manual refund execution requires full refund quote + admin review chain. */
export function canUsePlannedPackageManualRefunds(): boolean {
  return (
    isPlannedPackageManualRefundsEnabled() &&
    canUsePlannedPackageRefundQuotes() &&
    canUsePlannedPackageRefundAdminReview()
  );
}
