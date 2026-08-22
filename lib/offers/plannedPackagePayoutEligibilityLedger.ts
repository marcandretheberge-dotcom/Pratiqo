/**
 * Planned package payout eligibility ledger flags — eligibility only, no Stripe transfer.
 */

import { canUsePlannedPackageAdminOps } from "./plannedPackageAdminOps";

export const ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER_FLAG =
  "ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER";

export const ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW_FLAG =
  "ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW";

export function isPlannedPackagePayoutEligibilityLedgerEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER === "true";
}

export function isPlannedPackagePayoutAdminViewEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW === "true";
}

/** Ledger requires admin ops chain. */
export function canUsePlannedPackagePayoutEligibilityLedger(): boolean {
  return (
    isPlannedPackagePayoutEligibilityLedgerEnabled() && canUsePlannedPackageAdminOps()
  );
}

/** Admin UI visibility — server routes still gate on canUsePlannedPackagePayoutEligibilityLedger. */
export function canShowPlannedPackagePayoutAdminView(): boolean {
  return (
    canUsePlannedPackagePayoutEligibilityLedger() &&
    isPlannedPackagePayoutAdminViewEnabled()
  );
}
