import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { awardCredit } from "@/lib/credits";
import { dollarsToCents } from "@/lib/payments/amounts";
import {
  getBookingPaymentForRefund,
  markBookingPaymentRefunded,
  markBookingPaymentRefundFailed,
  type BookingPaymentRowForRefund,
} from "@/lib/payments/ledger";
import type { RefundMethod, RefundPlan, RefundStatus } from "@/lib/bookingCancellation";

export type RefundExecutionOutcome = {
  /** Final refund status to persist on the booking row after this attempt. */
  finalStatus: RefundStatus;
  /** Method actually used (may differ from the plan when fallbacks kick in). */
  method: RefundMethod | null;
  /** Reason for non-completion (only set when finalStatus !== "refunded"). */
  reason?: string;
  /** True when Stripe refund/credit award actually happened. */
  executed: boolean;
  /** Refund identifier for follow-up audit (Stripe refund id or credits ref). */
  externalId?: string | null;
};

type ExecuteBookingRefundInput = {
  admin: SupabaseClient;
  bookingId: string;
  studentId: string;
  plan: RefundPlan;
  /** Lesson date for the credit description (best-effort, may be empty). */
  lessonDate?: string | null;
  /** Optional Stripe PI id from the bookings row, used as a last-resort fallback. */
  bookingStripePaymentIntentId?: string | null;
};

/**
 * Execute the refund plan computed at cancellation time.
 *
 * Side-effects: writes to `booking_payments` (refund_status / stripe_refund_id /
 * refunded_cents / refunded_at) and may credit the student's wallet. Idempotent
 * via Stripe idempotency keys and the (user_id, type, reference_id) unique
 * constraint on `credit_transactions`.
 *
 * This function never throws — failures are returned as `finalStatus: "pending"`
 * with a `reason` so the caller can surface a soft error and support can retry.
 */
export async function executeBookingRefund(
  input: ExecuteBookingRefundInput,
): Promise<RefundExecutionOutcome> {
  const { admin, bookingId, studentId, plan } = input;

  // pending_review / not_required / refunded / rejected: nothing to do here.
  if (plan.refund_status !== "pending") {
    return { finalStatus: plan.refund_status, method: plan.refund_method, executed: false };
  }

  if (plan.refund_method === "pratiqo_credit") {
    return executePratiqoCreditRefund(admin, bookingId, studentId, plan, input.lessonDate ?? null);
  }

  // plan.refund_method === "original_payment"
  return executeStripeRefund(admin, bookingId, plan, input.bookingStripePaymentIntentId ?? null);
}

async function executePratiqoCreditRefund(
  admin: SupabaseClient,
  bookingId: string,
  studentId: string,
  plan: RefundPlan,
  lessonDate: string | null,
): Promise<RefundExecutionOutcome> {
  const dollars = Number(plan.refund_amount);
  if (!Number.isFinite(dollars) || dollars <= 0) {
    return {
      finalStatus: "refunded",
      method: "pratiqo_credit",
      executed: false,
      reason: "refund_amount missing — nothing to credit",
    };
  }

  const description =
    lessonDate && lessonDate.trim()
      ? `Crédit Pratiqo — annulation du cours du ${lessonDate.trim()}`
      : "Crédit Pratiqo — annulation de réservation";

  try {
    const { awarded } = await awardCredit(
      studentId,
      "booking_refund",
      description,
      `refund:${bookingId}`,
      dollars,
    );

    if (!awarded) {
      return {
        finalStatus: "refunded",
        method: "pratiqo_credit",
        executed: false,
        reason: "credit already awarded for this booking",
        externalId: `refund:${bookingId}`,
      };
    }

    return {
      finalStatus: "refunded",
      method: "pratiqo_credit",
      executed: true,
      externalId: `refund:${bookingId}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "credit award failed";
    console.error("[refunds] pratiqo credit award failed", { bookingId, message });
    return { finalStatus: "pending", method: "pratiqo_credit", executed: false, reason: message };
  }
}

async function executeStripeRefund(
  admin: SupabaseClient,
  bookingId: string,
  plan: RefundPlan,
  fallbackPaymentIntentId: string | null,
): Promise<RefundExecutionOutcome> {
  let payment: BookingPaymentRowForRefund | null = null;
  try {
    payment = await getBookingPaymentForRefund(admin, bookingId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ledger fetch failed";
    console.error("[refunds] failed to load booking_payments", { bookingId, message });
    return { finalStatus: "pending", method: "original_payment", executed: false, reason: message };
  }

  // Already refunded (idempotency): treat as success.
  if (payment?.refund_status === "refunded") {
    return {
      finalStatus: "refunded",
      method: "original_payment",
      executed: false,
      externalId: payment.stripe_refund_id ?? null,
    };
  }

  const paymentIntentId =
    payment?.stripe_payment_intent_id ?? fallbackPaymentIntentId ?? null;
  if (!paymentIntentId) {
    return {
      finalStatus: "pending",
      method: "original_payment",
      executed: false,
      reason: "no Stripe payment_intent on file",
    };
  }

  // 1) If the teacher transfer already went out, reverse it before refunding the
  //    customer so platform funds are available to fund the refund.
  let reversal: Stripe.TransferReversal | null = null;
  if (
    payment &&
    payment.transfer_status === "transferred" &&
    payment.stripe_transfer_id &&
    payment.teacher_net_cents > 0
  ) {
    try {
      reversal = await stripe.transfers.createReversal(
        payment.stripe_transfer_id,
        {
          amount: payment.teacher_net_cents,
          metadata: { booking_id: bookingId, reason: "booking_cancelled" },
        },
        { idempotencyKey: `booking_reversal_${bookingId}` },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "transfer reversal failed";
      console.error("[refunds] transfer reversal failed", { bookingId, message });
      await markBookingPaymentRefundFailed(admin, bookingId, `reversal: ${message}`).catch(
        (e) => console.error("[refunds] mark refund failed (after reversal)", e),
      );
      return { finalStatus: "pending", method: "original_payment", executed: false, reason: message };
    }
  }

  // 2) Refund the original payment. Default to a full refund unless we have a
  //    capped amount lower than the captured charge.
  const refundAmountCents = clampRefundAmountCents(payment, plan.refund_amount);

  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        // Omitting `amount` issues a full refund. We pass it only when our plan
        // explicitly requires a smaller amount (e.g. partial refund support
        // policy in the future).
        ...(refundAmountCents != null ? { amount: refundAmountCents } : {}),
        metadata: { booking_id: bookingId, reason: "booking_cancelled" },
      },
      { idempotencyKey: `booking_refund_${bookingId}` },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe refund failed";
    console.error("[refunds] Stripe refund failed", { bookingId, message });
    await markBookingPaymentRefundFailed(admin, bookingId, message).catch((e) =>
      console.error("[refunds] mark refund failed", e),
    );
    return { finalStatus: "pending", method: "original_payment", executed: false, reason: message };
  }

  if (payment) {
    const charged = payment.amount_cents;
    const refunded = Math.max(0, Math.round(refund.amount ?? 0));
    const isFull = refunded >= charged;
    try {
      await markBookingPaymentRefunded(admin, bookingId, { refund, reversal, isFull });
    } catch (err) {
      // Stripe refund succeeded but ledger write failed. Surface as `pending`
      // so support can reconcile from Stripe.
      const message = err instanceof Error ? err.message : "ledger write failed";
      console.error("[refunds] ledger write failed after Stripe refund", { bookingId, message });
      return {
        finalStatus: "pending",
        method: "original_payment",
        executed: true,
        reason: message,
        externalId: refund.id,
      };
    }
  }

  return {
    finalStatus: "refunded",
    method: "original_payment",
    executed: true,
    externalId: refund.id,
  };
}

function clampRefundAmountCents(
  payment: BookingPaymentRowForRefund | null,
  planRefundAmountDollars: number | null,
): number | null {
  if (planRefundAmountDollars == null) return null;
  const planCents = dollarsToCents(planRefundAmountDollars);
  if (planCents <= 0) return null;

  // Without a ledger row we can't sanity-check against the captured amount, so
  // we let Stripe enforce the cap. With a ledger row we cap to the remaining
  // refundable amount and skip the `amount` param entirely if it would be a
  // full refund.
  if (!payment) return planCents;
  const refundable = Math.max(0, payment.amount_cents - payment.refunded_cents);
  if (refundable <= 0) return null;
  const target = Math.min(planCents, refundable);
  if (target >= payment.amount_cents) return null;
  return target;
}
