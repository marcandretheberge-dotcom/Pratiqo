/**
 * Read-only reconciliation for planned package pending orders.
 * Used by admin list/detail — never mutates money or bookings.
 */

import { classifyPlannedPackageSessionStatus } from "./plannedPackageSessionDelivery";

export type PlannedPackageAttentionReason =
  | "paid_not_fulfilled"
  | "fulfillment_failed"
  | "fulfilled_missing_bookings"
  | "booking_count_mismatch"
  | "hold_not_converted"
  | "amount_mismatch"
  | "currency_mismatch"
  | "checkout_expired_but_order_pending"
  | "hold_expired_before_payment"
  | "webhook_missing"
  | "duplicate_booking_risk"
  | "approved_refund_not_executed"
  | "refund_execution_failed"
  | "refund_succeeded_but_order_not_marked"
  | "transfer_reversal_required"
  | "completed_session_missing_payout_eligibility"
  | "eligible_session_blocked_by_refund"
  | "payout_eligibility_admin_review_required"
  | "payout_allocation_mismatch"
  | "payout_pricing_policy_not_finalized";

export type PlannedPackagePayoutEligibilityReconciliationEntry = {
  bookingId: string;
  status: string;
  blockers: string[];
  adminReviewRequired: boolean;
};

export type PlannedPackageReconciliationInput = {
  orderId: string;
  status: string;
  sessionCount: number;
  priceCentsSnapshot: number;
  currencySnapshot: string;
  holdExpiresAt: string | null;
  paymentConfirmedAt: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  fulfillmentError: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutStatus: string | null;
  stripeAmountReceivedCents: number | null;
  stripeCurrency: string | null;
  lastWebhookReceivedAt: string | null;
  refundStatus: string | null;
  refundedCents: number;
  latestQuoteStatus: string | null;
  latestExecutionStatus: string | null;
  packageTransferDetected: boolean;
  holds: Array<{ status: string; sessionIndex: number }>;
  bookings: Array<{ id: string; sessionIndex: number | null; status?: string }>;
  payoutEligibility?: {
    ledgerEnabled: boolean;
    entries: PlannedPackagePayoutEligibilityReconciliationEntry[];
  };
};

export type PlannedPackageReconciliationResult = {
  needsAttention: boolean;
  attentionReasons: PlannedPackageAttentionReason[];
};

const PAID_LIKE_STATUSES = new Set([
  "paid",
  "payment_confirmed",
  "fulfilling",
  "fulfillment_failed",
  "fulfilled",
]);

const PRE_FULFILLMENT_PAID = new Set(["paid", "payment_confirmed", "fulfilling", "fulfillment_failed"]);

export function reconcilePlannedPackageOrder(
  input: PlannedPackageReconciliationInput,
): PlannedPackageReconciliationResult {
  const reasons: PlannedPackageAttentionReason[] = [];
  const status = String(input.status ?? "");

  const hasStripePayment =
    Boolean(input.paidAt) ||
    Boolean(input.paymentConfirmedAt) ||
    input.stripeCheckoutStatus === "complete" ||
    Boolean(input.stripePaymentIntentId);

  const bookingCount = input.bookings.length;
  const convertedHolds = input.holds.filter((h) => h.status === "converted").length;
  const activeHolds = input.holds.filter((h) => h.status === "active").length;

  if (PRE_FULFILLMENT_PAID.has(status) && hasStripePayment && status !== "fulfilled") {
    reasons.push("paid_not_fulfilled");
  }

  if (status === "fulfillment_failed" || Boolean(input.fulfillmentError)) {
    if (!reasons.includes("fulfillment_failed")) {
      reasons.push("fulfillment_failed");
    }
  }

  if (status === "fulfilled") {
    if (bookingCount === 0) {
      reasons.push("fulfilled_missing_bookings");
    } else if (bookingCount !== input.sessionCount) {
      reasons.push("booking_count_mismatch");
    }
    if (convertedHolds < input.sessionCount && activeHolds > 0) {
      reasons.push("hold_not_converted");
    }
  }

  if (
    input.stripeAmountReceivedCents != null &&
    Number.isInteger(input.priceCentsSnapshot) &&
    input.stripeAmountReceivedCents !== input.priceCentsSnapshot
  ) {
    reasons.push("amount_mismatch");
  }

  if (
    input.stripeCurrency &&
    input.currencySnapshot &&
    input.stripeCurrency.toUpperCase() !== input.currencySnapshot.toUpperCase()
  ) {
    reasons.push("currency_mismatch");
  }

  if (
    status === "pending_payment" &&
    input.stripeCheckoutStatus === "expired"
  ) {
    reasons.push("checkout_expired_but_order_pending");
  }

  if (
    status === "pending_payment" &&
    input.holdExpiresAt &&
    new Date(input.holdExpiresAt).getTime() <= Date.now()
  ) {
    reasons.push("hold_expired_before_payment");
  }

  if (
    PAID_LIKE_STATUSES.has(status) &&
    input.stripeCheckoutSessionId &&
    !input.lastWebhookReceivedAt &&
    hasStripePayment
  ) {
    reasons.push("webhook_missing");
  }

  if (bookingCount > input.sessionCount) {
    reasons.push("duplicate_booking_risk");
  }

  if (input.packageTransferDetected) {
    reasons.push("transfer_reversal_required");
  }

  if (
    input.latestQuoteStatus === "approved_for_manual_refund" &&
    input.latestExecutionStatus !== "succeeded"
  ) {
    reasons.push("approved_refund_not_executed");
  }

  if (input.latestExecutionStatus === "failed") {
    reasons.push("refund_execution_failed");
  }

  if (
    input.latestExecutionStatus === "succeeded" &&
    input.refundStatus !== "refunded" &&
    input.refundStatus !== "partial"
  ) {
    reasons.push("refund_succeeded_but_order_not_marked");
  }

  if (input.payoutEligibility?.ledgerEnabled && status === "fulfilled") {
    const completedBookingIds = input.bookings
      .filter(
        (b) =>
          classifyPlannedPackageSessionStatus(String(b.status ?? "")) === "completed",
      )
      .map((b) => b.id);
    const entryByBooking = new Map(
      input.payoutEligibility.entries.map((e) => [e.bookingId, e]),
    );

    if (completedBookingIds.some((id) => !entryByBooking.has(id))) {
      reasons.push("completed_session_missing_payout_eligibility");
    }

    const refundBlocksPayout =
      input.refundStatus === "refunded" ||
      input.refundStatus === "partial" ||
      input.latestQuoteStatus === "approved_for_manual_refund" ||
      input.latestExecutionStatus === "succeeded";

    for (const entry of input.payoutEligibility.entries) {
      if (entry.adminReviewRequired || entry.status === "admin_review_required") {
        reasons.push("payout_eligibility_admin_review_required");
      }
      if (entry.blockers.includes("allocation_mismatch")) {
        reasons.push("payout_allocation_mismatch");
      }
      if (entry.blockers.includes("payout_pricing_policy_not_finalized")) {
        reasons.push("payout_pricing_policy_not_finalized");
      }
      if (entry.status === "eligible" && refundBlocksPayout) {
        reasons.push("eligible_session_blocked_by_refund");
      }
    }
  }

  const unique = Array.from(new Set(reasons));

  if (status === "fulfilled" && bookingCount === input.sessionCount && convertedHolds === input.sessionCount) {
    const clean = unique.filter(
      (r) =>
        r !== "paid_not_fulfilled" &&
        r !== "fulfillment_failed" &&
        r !== "fulfilled_missing_bookings" &&
        r !== "booking_count_mismatch" &&
        r !== "hold_not_converted" &&
        r !== "duplicate_booking_risk",
    );
    return { needsAttention: clean.length > 0, attentionReasons: clean };
  }

  if (status === "cancelled" || status === "expired") {
    const terminal = unique.filter(
      (r) =>
        r !== "paid_not_fulfilled" &&
        r !== "fulfillment_failed" &&
        r !== "fulfilled_missing_bookings",
    );
    return {
      needsAttention: terminal.some((r) =>
        ["amount_mismatch", "currency_mismatch", "webhook_missing", "duplicate_booking_risk"].includes(r),
      ),
      attentionReasons: terminal.filter((r) =>
        ["amount_mismatch", "currency_mismatch", "webhook_missing", "duplicate_booking_risk"].includes(r),
      ),
    };
  }

  const filtered =
    status === "pending_payment"
      ? unique.filter((r) => r !== "paid_not_fulfilled" && r !== "fulfillment_failed")
      : unique;

  return {
    needsAttention: filtered.length > 0,
    attentionReasons: filtered,
  };
}
