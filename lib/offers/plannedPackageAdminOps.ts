/**
 * Planned package admin operations — internal safety layer only.
 * No payout, refund, transfer, or public launch.
 */

import {
  canUsePlannedPackageFulfillmentEngine,
  isPlannedPackageFulfillmentEngineEnabled,
} from "./plannedPackageFulfillment";
import { canUsePlannedPackageStripeCheckout } from "./plannedPackageStripeCheckout";

export const ENABLE_PLANNED_PACKAGE_ADMIN_OPS_FLAG = "ENABLE_PLANNED_PACKAGE_ADMIN_OPS";

/** Server-only. Do not rely on NEXT_PUBLIC for admin ops. */
export function isPlannedPackageAdminOpsEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS === "true";
}

/** Admin ops requires fulfillment engine in the dependency chain. */
export function canUsePlannedPackageAdminOps(): boolean {
  return isPlannedPackageAdminOpsEnabled() && canUsePlannedPackageFulfillmentEngine();
}

export type PlannedPackageRetryBlocker =
  | "admin_ops_disabled"
  | "fulfillment_engine_disabled"
  | "order_not_found"
  | "order_cancelled"
  | "order_expired"
  | "order_refunded"
  | "already_fulfilled"
  | "payment_not_confirmed"
  | "payment_reference_missing"
  | "unsafe_status";

const RETRY_ELIGIBLE_STATUSES = new Set(["payment_confirmed", "fulfillment_failed"]);

export function assessPlannedPackageRetryEligibility(order: {
  status: string;
  paymentReference: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
}): { eligible: boolean; blockers: PlannedPackageRetryBlocker[] } {
  const blockers: PlannedPackageRetryBlocker[] = [];

  if (!isPlannedPackageAdminOpsEnabled()) blockers.push("admin_ops_disabled");
  if (!isPlannedPackageFulfillmentEngineEnabled()) blockers.push("fulfillment_engine_disabled");

  const status = String(order.status ?? "");
  if (status === "cancelled") blockers.push("order_cancelled");
  if (status === "expired") blockers.push("order_expired");
  if (status === "refunded") blockers.push("order_refunded");
  if (status === "fulfilled") blockers.push("already_fulfilled");

  if (!RETRY_ELIGIBLE_STATUSES.has(status)) {
    if (!blockers.includes("already_fulfilled")) {
      blockers.push("unsafe_status");
    }
  }

  const hasPaymentRef =
    (order.paymentReference && order.paymentReference.trim().length >= 4) ||
    Boolean(order.stripeCheckoutSessionId) ||
    Boolean(order.stripePaymentIntentId);

  if (!hasPaymentRef && RETRY_ELIGIBLE_STATUSES.has(status)) {
    blockers.push("payment_reference_missing");
  }

  if (
    (status === "pending_payment" || status === "paid") &&
    !blockers.includes("unsafe_status")
  ) {
    blockers.push("payment_not_confirmed");
  }

  return { eligible: blockers.length === 0, blockers };
}

/** Whether Stripe checkout is part of the stack (informational for admin UI). */
export function plannedPackageAdminOpsStripeLayerEnabled(): boolean {
  return canUsePlannedPackageStripeCheckout();
}
