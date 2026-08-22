/**
 * Planned package manual Stripe transfer execution flags — admin-only, eligible ledger entry required.
 */

import { canUsePlannedPackageFulfillmentEngine } from "./plannedPackageFulfillment";
import {
  canShowPlannedPackagePayoutAdminView,
  canUsePlannedPackagePayoutEligibilityLedger,
} from "./plannedPackagePayoutEligibilityLedger";

export const ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS_FLAG =
  "ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS";

export function isPlannedPackageManualTransfersEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS === "true";
}

/** Manual transfer execution requires payout eligibility ledger + admin view + fulfillment chain. */
export function canUsePlannedPackageManualTransfers(): boolean {
  return (
    isPlannedPackageManualTransfersEnabled() &&
    canUsePlannedPackagePayoutEligibilityLedger() &&
    canShowPlannedPackagePayoutAdminView() &&
    canUsePlannedPackageFulfillmentEngine()
  );
}
