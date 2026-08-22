/**
 * Planned package E2E staging QA tools flag — diagnostics only, no money movement.
 * Default OFF. Production always rejects detailed QA tools.
 */

import { isProductionCheckoutEnvironment } from "./plannedPackageStripeCheckout";

export const ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS_FLAG =
  "ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS";

export function isPlannedPackageE2eQaToolsEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS === "true";
}

/**
 * Detailed E2E QA diagnostics are staging/dev only.
 * Production always rejects — even if the flag is accidentally ON.
 */
export function canUsePlannedPackageE2eQaTools(): boolean {
  if (isProductionCheckoutEnvironment()) return false;
  return isPlannedPackageE2eQaToolsEnabled();
}
