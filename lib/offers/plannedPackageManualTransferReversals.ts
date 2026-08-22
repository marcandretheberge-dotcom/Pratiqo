/**
 * Planned package manual Stripe transfer reversal flags — admin-only, succeeded transfer required.
 */

import { canUsePlannedPackageManualTransfers } from "./plannedPackageManualTransfers";

export const ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS_FLAG =
  "ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS";

export function isPlannedPackageManualTransferReversalsEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS === "true";
}

/** Manual transfer reversal requires manual transfer execution chain. */
export function canUsePlannedPackageManualTransferReversals(): boolean {
  return (
    isPlannedPackageManualTransferReversalsEnabled() && canUsePlannedPackageManualTransfers()
  );
}
