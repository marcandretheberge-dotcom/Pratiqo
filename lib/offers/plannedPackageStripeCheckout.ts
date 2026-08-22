/**
 * Gated Stripe Checkout for Phase 1 planned packages.
 * Platform charge only — transfer_group for future progressive payout.
 * No transfer, payout, entitlement, or redemption in this module.
 */

import { isPackageLegalReviewCompleted } from "./plannedPackages";
import { canUsePlannedPackageFulfillmentEngine } from "./plannedPackageFulfillment";
import { canUsePlannedPackageTemporaryHolds } from "./plannedPackageTemporaryHolds";

export const ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT_FLAG =
  "ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT";
export const NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT_FLAG =
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT";
export const ENABLE_PLANNED_PACKAGE_CHECKOUT_TEST_MODE_FLAG =
  "ENABLE_PLANNED_PACKAGE_CHECKOUT_TEST_MODE";

/** Legacy alias kept for preflight — prefer ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT. */
export const ENABLE_PLANNED_PACKAGE_CHECKOUT_FLAG = "ENABLE_PLANNED_PACKAGE_CHECKOUT";

export const PLANNED_PACKAGE_STRIPE_METADATA_TYPE = "planned_package";

/** Server-only: never rely on NEXT_PUBLIC for checkout creation. */
export function isPlannedPackageStripeCheckoutEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT === "true";
}

export function isPlannedPackageStripeCheckoutUiEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT === "true"
  );
}

/** Used by preflight readiness — accepts legacy ENABLE_PLANNED_PACKAGE_CHECKOUT. */
export function isPlannedPackageCheckoutEnabled(): boolean {
  return (
    isPlannedPackageStripeCheckoutEnabled() ||
    process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT === "true"
  );
}

export function isPlannedPackageCheckoutTestModeEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_TEST_MODE === "true";
}

export function isProductionCheckoutEnvironment(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function isStripeTestSecretKeyConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_test_");
}

export function canUsePlannedPackageStripeCheckout(): boolean {
  return (
    isPlannedPackageStripeCheckoutEnabled() &&
    canUsePlannedPackageFulfillmentEngine() &&
    canUsePlannedPackageTemporaryHolds()
  );
}

/**
 * Whether checkout creation is allowed in the current environment.
 * Production requires legal review. Non-production may use explicit test mode.
 */
export function canCreatePlannedPackageCheckoutInCurrentEnvironment(): boolean {
  if (!canUsePlannedPackageStripeCheckout()) return false;
  if (isPackageLegalReviewCompleted()) return true;
  if (isProductionCheckoutEnvironment()) return false;
  return (
    isPlannedPackageCheckoutTestModeEnabled() && isStripeTestSecretKeyConfigured()
  );
}

export function plannedPackageTransferGroup(orderId: string): string {
  return `planned_package_order_${orderId}`;
}

export type PlannedPackageCheckoutBlocker =
  | "planned_package_checkout_disabled"
  | "package_legal_review_required"
  | "checkout_test_mode_required"
  | "fulfillment_engine_disabled";

export function getPlannedPackageCheckoutEnvironmentBlockers(): PlannedPackageCheckoutBlocker[] {
  const blockers: PlannedPackageCheckoutBlocker[] = [];
  if (!isPlannedPackageStripeCheckoutEnabled()) {
    blockers.push("planned_package_checkout_disabled");
  }
  if (!canUsePlannedPackageFulfillmentEngine()) {
    blockers.push("fulfillment_engine_disabled");
  }
  if (isProductionCheckoutEnvironment() && !isPackageLegalReviewCompleted()) {
    blockers.push("package_legal_review_required");
  }
  if (
    !isProductionCheckoutEnvironment() &&
    !isPackageLegalReviewCompleted() &&
    !isPlannedPackageCheckoutTestModeEnabled()
  ) {
    blockers.push("checkout_test_mode_required");
  }
  if (
    !isProductionCheckoutEnvironment() &&
    !isPackageLegalReviewCompleted() &&
    isPlannedPackageCheckoutTestModeEnabled() &&
    !isStripeTestSecretKeyConfigured()
  ) {
    blockers.push("checkout_test_mode_required");
  }
  return blockers;
}
