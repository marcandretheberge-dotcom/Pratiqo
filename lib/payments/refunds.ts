/**
 * Stripe refund executor for booking cancellations.
 *
 * Honest-by-design contract:
 *   - We only return `kind: "refunded"` AFTER `stripe.refunds.create` returns
 *     a refund object AND we have written the refund metadata back to
 *     `booking_payments`. Anything else degrades to `manual_review_required`,
 *     `failed`, `no_payment`, or `already_refunded` — never a false success.
 *   - The Stripe call uses a stable idempotency key derived from the booking
 *     id, so a retry from the same booking can never create a duplicate
 *     refund.
 *   - When the teacher payout was already transferred, we DO NOT attempt
 *     auto-reversal in this PR (Stripe Connect transfer reversals are a
 *     separate launch milestone). The case is escalated to manual review
 *     instead, so the support team can reverse the transfer + issue the
 *     refund deliberately.
 *
 * Restricted-systems compliance:
 *   - No Stripe product IDs, price IDs, or payment math is altered here. We
 *     only call `stripe.refunds.create` with the existing payment_intent.
 *   - No tax math is altered: the refund is a full Stripe-side refund of the
 *     captured amount stored in `booking_payments.amount_cents`. Stripe
 *     refunds the matching tax line items automatically.
 *   - No Supabase RLS or migrations touched: all required columns
 *     (`stripe_refund_id`, `refund_status`, `refunded_at`, `refunded_cents`,
 *     `metadata`) already exist on `booking_payments` since migration 038.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";

/**
 * Minimal slice of the Stripe SDK we need for refunds. Defined explicitly
 * so we can dependency-inject a stub from tests without booting the real
 * Stripe client (which requires STRIPE_SECRET_KEY).
 */
export type StripeRefundsClient = {
  refunds: {
    create: (
      params: Stripe.RefundCreateParams,
      options?: Stripe.RequestOptions,
    ) => Promise<Stripe.Refund>;
  };
};

export type RefundActor = "student" | "teacher" | "admin" | "system";

export type AttemptStripeBookingRefundInput = {
  bookingId: string;
  /** Who triggered the cancellation. Stored in booking_payments.metadata for audit. */
  actor: RefundActor;
  /** Stripe-side reason code; defaults to `requested_by_customer`. */
  stripeReason?: "duplicate" | "fraudulent" | "requested_by_customer";
  /**
   * Optional cancellation reason slug (e.g. "schedule_conflict") stored alongside
   * the refund metadata for support traceability. Free-form strings up to 200 chars
   * are allowed; longer values are truncated.
   */
  cancellationReason?: string | null;
};

export type AttemptStripeBookingRefundOutcome =
  /** Stripe refund created and persisted to booking_payments. */
  | {
      kind: "refunded";
      stripeRefundId: string;
      amountCents: number;
      currency: string;
      idempotencyKey: string;
    }
  /** booking_payments already has a recorded refund — short-circuit (no Stripe call). */
  | {
      kind: "already_refunded";
      stripeRefundId: string | null;
      amountCents: number;
    }
  /** No paid payment ledger row to refund (free booking, legacy, or unpaid). */
  | {
      kind: "no_payment";
      reason: "no_payment_row" | "not_paid";
    }
  /** Refund must be handled by support (transfer already paid out, dispute, etc.). */
  | {
      kind: "manual_review_required";
      reason:
        | "transfer_already_completed"
        | "disputed"
        | "transfer_status_reversed"
        | "missing_payment_reference"
        | "ambiguous_payment_state";
    }
  /** Stripe rejected the refund call. The failure_reason is persisted on booking_payments. */
  | {
      kind: "failed";
      reason: string;
    };

type BookingPaymentRefundRow = {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  stripe_transfer_id: string | null;
  amount_cents: number;
  refunded_cents: number;
  currency: string;
  payment_status: string;
  transfer_status: string;
  refund_status: string;
  refunded_at: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Stable idempotency key. We tie it to the booking id so any number of
 * retries for the *same* cancellation funnel into a single Stripe refund.
 * Using the booking id (not the payment intent id) means even if the
 * upstream caller forgets to short-circuit on `already_refunded`, Stripe
 * will return the existing refund instead of creating a duplicate.
 */
export function buildBookingRefundIdempotencyKey(bookingId: string): string {
  return `booking_refund_${bookingId}`;
}

function clampReason(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 200);
}

async function loadBookingPayment(
  admin: SupabaseClient,
  bookingId: string,
): Promise<BookingPaymentRefundRow | null> {
  const { data, error } = await admin
    .from("booking_payments")
    .select(
      "id, booking_id, stripe_payment_intent_id, stripe_charge_id, stripe_refund_id, stripe_transfer_id, amount_cents, refunded_cents, currency, payment_status, transfer_status, refund_status, refunded_at, metadata",
    )
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load booking_payment: ${error.message}`);
  }
  return (data as BookingPaymentRefundRow | null) ?? null;
}

async function recordRefundSuccess(
  admin: SupabaseClient,
  payment: BookingPaymentRefundRow,
  refund: Stripe.Refund,
  input: AttemptStripeBookingRefundInput,
  idempotencyKey: string,
): Promise<void> {
  const refundedCents = Math.max(payment.refunded_cents, payment.amount_cents);
  const now = new Date().toISOString();
  const priorMeta =
    payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
      ? payment.metadata
      : {};

  const { error } = await admin
    .from("booking_payments")
    .update({
      refund_status: "refunded",
      stripe_refund_id: refund.id,
      refunded_cents: refundedCents,
      refunded_at: now,
      payment_status: "refunded",
      // The transfer_status is preserved as-is. If the transfer hadn't
      // happened yet ("not_ready" / "ready") we set it to "not_required"
      // so the auto-complete cron's payout path skips this booking even
      // if it ever races with a stale "confirmed" status.
      transfer_status:
        payment.transfer_status === "not_ready" || payment.transfer_status === "ready"
          ? "not_required"
          : payment.transfer_status,
      metadata: {
        ...priorMeta,
        last_refund: {
          stripe_refund_id: refund.id,
          stripe_payment_intent_id: payment.stripe_payment_intent_id,
          amount_cents: refundedCents,
          currency: payment.currency,
          actor: input.actor,
          cancellation_reason: clampReason(input.cancellationReason ?? null),
          idempotency_key: idempotencyKey,
          recorded_at: now,
        },
      },
      updated_at: now,
    })
    .eq("id", payment.id);

  if (error) {
    throw new Error(`Stripe refund created (${refund.id}) but ledger update failed: ${error.message}`);
  }
}

async function recordRefundFailure(
  admin: SupabaseClient,
  payment: BookingPaymentRefundRow,
  failureMessage: string,
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("booking_payments")
    .update({
      refund_status: "failed",
      failure_reason: failureMessage.slice(0, 500),
      updated_at: now,
    })
    .eq("id", payment.id)
    .then(undefined, (e) => {
      // Failure to persist the failure must not throw — the caller still
      // returns a `failed` outcome and the route falls back to manual review.
      console.error("[refunds] failed to persist refund failure", e);
    });
}

/**
 * Attempt to create a Stripe refund for the booking. See module docblock for
 * the honest-success contract. Throws only if loading the payment ledger
 * itself fails — Stripe-side failures are converted to a `failed` outcome
 * and persisted onto `booking_payments.failure_reason`.
 *
 * `stripeClient` is the third argument so tests can inject a stub without
 * booting the real Stripe SDK; production callers omit it.
 */
export async function attemptStripeBookingRefund(
  admin: SupabaseClient,
  input: AttemptStripeBookingRefundInput,
  stripeClient: StripeRefundsClient = stripe as unknown as StripeRefundsClient,
): Promise<AttemptStripeBookingRefundOutcome> {
  const payment = await loadBookingPayment(admin, input.bookingId);
  if (!payment) {
    return { kind: "no_payment", reason: "no_payment_row" };
  }

  if (payment.refund_status === "refunded" || payment.stripe_refund_id) {
    return {
      kind: "already_refunded",
      stripeRefundId: payment.stripe_refund_id,
      amountCents: payment.refunded_cents || payment.amount_cents,
    };
  }

  // Disputed payments never auto-refund: Stripe controls the lifecycle via
  // the dispute response flow. Escalate to support.
  if (String(payment.payment_status).toLowerCase() === "disputed") {
    return { kind: "manual_review_required", reason: "disputed" };
  }

  if (payment.refunded_cents > 0 || String(payment.payment_status).toLowerCase() === "partially_refunded") {
    return { kind: "manual_review_required", reason: "ambiguous_payment_state" };
  }

  if (payment.payment_status !== "paid") {
    const hasCredibleStripeReference = Boolean(
      payment.stripe_payment_intent_id || payment.stripe_charge_id || payment.stripe_refund_id,
    );
    if (hasCredibleStripeReference) {
      return { kind: "manual_review_required", reason: "ambiguous_payment_state" };
    }
    return { kind: "no_payment", reason: "not_paid" };
  }

  if (payment.payment_status === "paid" && !payment.stripe_payment_intent_id) {
    return { kind: "manual_review_required", reason: "missing_payment_reference" };
  }

  // Already-reversed transfers shouldn't get a fresh auto-refund either —
  // a previous reversal/refund cycle was completed by support and we don't
  // want to double-refund. Send to manual review for inspection.
  if (payment.transfer_status === "reversed") {
    return { kind: "manual_review_required", reason: "transfer_status_reversed" };
  }

  // If the teacher payout was already transferred, the safest path is to
  // open a manual-review case. Reversing transfers + refunding atomically
  // is feasible (`reverse_transfer: true`) but warrants its own dedicated
  // PR with explicit teacher-side disclosure. Until then we don't pretend.
  if (payment.transfer_status === "transferred") {
    return { kind: "manual_review_required", reason: "transfer_already_completed" };
  }

  if (!payment.stripe_payment_intent_id) {
    return { kind: "manual_review_required", reason: "missing_payment_reference" };
  }

  const idempotencyKey = buildBookingRefundIdempotencyKey(input.bookingId);
  const reason = input.stripeReason ?? "requested_by_customer";

  let refund: Stripe.Refund;
  try {
    refund = await stripeClient.refunds.create(
      {
        payment_intent: payment.stripe_payment_intent_id,
        reason,
        metadata: {
          booking_id: input.bookingId,
          actor: input.actor,
          cancellation_reason: clampReason(input.cancellationReason ?? null) ?? "",
        },
      },
      { idempotencyKey },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe refund failed";
    await recordRefundFailure(admin, payment, message);
    return { kind: "failed", reason: message };
  }

  // Defensive: Stripe occasionally returns a refund whose status is
  // `requires_action` or `failed` immediately. Treat anything other than
  // `succeeded` / `pending` as a soft failure that warrants manual review,
  // so we never claim "refund completed" to the user without confirmation.
  const stripeStatus = String(refund.status ?? "").toLowerCase();
  if (stripeStatus !== "succeeded" && stripeStatus !== "pending") {
    await recordRefundFailure(admin, payment, `Stripe refund status: ${refund.status ?? "unknown"}`);
    return {
      kind: "failed",
      reason: `Stripe refund returned status: ${refund.status ?? "unknown"}`,
    };
  }

  await recordRefundSuccess(admin, payment, refund, input, idempotencyKey);

  return {
    kind: "refunded",
    stripeRefundId: refund.id,
    amountCents: payment.amount_cents,
    currency: payment.currency,
    idempotencyKey,
  };
}
