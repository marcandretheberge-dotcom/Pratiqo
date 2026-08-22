/**
 * Admin-only manual Stripe refund execution for approved planned package refund quotes.
 *
 * Platform charge refund only — no transfer reversals, no teacher payouts.
 * Not legal advice. Requires approved quote and admin context.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { calculatePlannedPackageRefundQuote } from "./plannedPackageRefundQuote";
import { isPackageLegalReviewCompleted } from "./plannedPackages";
import {
  canUsePlannedPackageManualRefunds,
  isPlannedPackageManualRefundsEnabled,
} from "./plannedPackageManualRefunds";
import { packageOrderHasUnreversedPlannedPackageTransfer } from "./plannedPackageTransferReversal";
import { isProductionCheckoutEnvironment } from "./plannedPackageStripeCheckout";
import type { PlannedPackageSessionDeliveryRow } from "./plannedPackageSessionDelivery";

export type StripeRefundsClient = {
  refunds: {
    create: (
      params: Stripe.RefundCreateParams,
      options?: Stripe.RequestOptions,
    ) => Promise<Stripe.Refund>;
  };
};

export type PlannedPackageRefundExecutionRow = {
  id: string;
  planned_package_order_id: string;
  cancellation_request_id: string;
  refund_quote_id: string;
  executed_by: string;
  status: string;
  amount_cents: number;
  currency: string;
  stripe_refund_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  idempotency_key: string;
  failure_code: string | null;
  failure_message: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExecuteApprovedPlannedPackageRefundInput = {
  admin: SupabaseClient;
  refundQuoteId: string;
  adminUserId: string;
  idempotencyKey?: string;
  now?: Date;
  stripeClient?: StripeRefundsClient;
};

export type ExecuteApprovedPlannedPackageRefundSuccess = {
  ok: true;
  execution: PlannedPackageRefundExecutionRow;
  order: {
    id: string;
    refundStatus: string | null;
    refundedCents: number;
    refundedAt: string | null;
  };
  reusedExisting: boolean;
};

export type ExecuteApprovedPlannedPackageRefundFailure = {
  ok: false;
  status: number;
  error: string;
  blockers?: string[];
};

export type ExecuteApprovedPlannedPackageRefundResult =
  | ExecuteApprovedPlannedPackageRefundSuccess
  | ExecuteApprovedPlannedPackageRefundFailure;

const PAID_ORDER_STATUSES = new Set([
  "paid",
  "payment_confirmed",
  "fulfilling",
  "fulfilled",
  "fulfillment_failed",
]);

const TRANSFER_BLOCKING_STATUSES = new Set(["transferred", "reversed"]);

export function buildPlannedPackageRefundIdempotencyKey(refundQuoteId: string): string {
  return `planned-package-refund-${refundQuoteId}`;
}

export function canExecutePlannedPackageRefundInCurrentEnvironment(): boolean {
  if (!canUsePlannedPackageManualRefunds()) return false;
  if (isPackageLegalReviewCompleted()) return true;
  if (isProductionCheckoutEnvironment()) return false;
  return true;
}

export async function packageOrderHasTeacherTransfer(
  admin: SupabaseClient,
  orderId: string,
): Promise<boolean> {
  const [legacyTransfer, plannedUnreversed] = await Promise.all([
    (async () => {
      const { data: bookings, error: bookingErr } = await admin
        .from("bookings")
        .select("id")
        .eq("planned_package_order_id", orderId);

      if (bookingErr) throw new Error(bookingErr.message);

      const bookingIds = ((bookings ?? []) as { id: string }[]).map((b) => b.id);
      if (bookingIds.length === 0) return false;

      const { data: payments, error: payErr } = await admin
        .from("booking_payments")
        .select("id, stripe_transfer_id, transfer_status")
        .in("booking_id", bookingIds);

      if (payErr) throw new Error(payErr.message);

      return ((payments ?? []) as { stripe_transfer_id: string | null; transfer_status: string }[]).some(
        (p) =>
          Boolean(p.stripe_transfer_id) ||
          TRANSFER_BLOCKING_STATUSES.has(String(p.transfer_status ?? "")),
      );
    })(),
    packageOrderHasUnreversedPlannedPackageTransfer(admin, orderId).catch(() => false),
  ]);

  return legacyTransfer || plannedUnreversed;
}

async function loadQuoteContext(admin: SupabaseClient, refundQuoteId: string) {
  const { data: quote, error } = await admin
    .from("planned_package_refund_quotes")
    .select("*")
    .eq("id", refundQuoteId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (quote as Record<string, unknown> | null) ?? null;
}

async function loadOrder(admin: SupabaseClient, orderId: string) {
  const { data, error } = await admin
    .from("planned_package_pending_orders")
    .select(
      "id, status, session_count, price_cents_snapshot, currency_snapshot, payment_confirmed_at, paid_at, stripe_payment_intent_id, stripe_checkout_session_id, refund_status, refunded_cents, refunded_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

async function loadBookings(
  admin: SupabaseClient,
  orderId: string,
): Promise<PlannedPackageSessionDeliveryRow[]> {
  const { data, error } = await admin
    .from("bookings")
    .select("id, status, lesson_date, time_slot, planned_package_session_index")
    .eq("planned_package_order_id", orderId)
    .order("planned_package_session_index", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Record<string, unknown>[]).map((b) => ({
    bookingId: String(b.id ?? ""),
    sessionIndex: Number(b.planned_package_session_index ?? 0),
    status: String(b.status ?? ""),
    lessonDate: (b.lesson_date as string | null) ?? null,
    lessonTime: (b.time_slot as string | null) ?? null,
  }));
}

function mapExecutionRow(row: Record<string, unknown>): PlannedPackageRefundExecutionRow {
  return {
    id: String(row.id ?? ""),
    planned_package_order_id: String(row.planned_package_order_id ?? ""),
    cancellation_request_id: String(row.cancellation_request_id ?? ""),
    refund_quote_id: String(row.refund_quote_id ?? ""),
    executed_by: String(row.executed_by ?? ""),
    status: String(row.status ?? ""),
    amount_cents: Number(row.amount_cents ?? 0),
    currency: String(row.currency ?? "CAD"),
    stripe_refund_id: (row.stripe_refund_id as string | null) ?? null,
    stripe_payment_intent_id: (row.stripe_payment_intent_id as string | null) ?? null,
    stripe_charge_id: (row.stripe_charge_id as string | null) ?? null,
    idempotency_key: String(row.idempotency_key ?? ""),
    failure_code: (row.failure_code as string | null) ?? null,
    failure_message: (row.failure_message as string | null) ?? null,
    executed_at: (row.executed_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function quoteMatchesRecalculation(
  quote: Record<string, unknown>,
  recalculated: ReturnType<typeof calculatePlannedPackageRefundQuote>,
): boolean {
  const estimated = Number(quote.estimated_refund_cents ?? 0);
  const currency = String(quote.currency ?? "CAD").toUpperCase();
  const policyVersion = String(quote.policy_version ?? "");
  return (
    estimated === recalculated.estimatedRefundCents &&
    currency === recalculated.currency.toUpperCase() &&
    policyVersion === recalculated.policyVersion
  );
}

export async function executeApprovedPlannedPackageRefund(
  input: ExecuteApprovedPlannedPackageRefundInput,
): Promise<ExecuteApprovedPlannedPackageRefundResult> {
  if (!isPlannedPackageManualRefundsEnabled()) {
    return { ok: false, status: 403, error: "manual_refunds_disabled" };
  }
  if (!canUsePlannedPackageManualRefunds()) {
    return { ok: false, status: 403, error: "manual_refunds_disabled" };
  }
  if (!canExecutePlannedPackageRefundInCurrentEnvironment()) {
    return { ok: false, status: 403, error: "legal_review_required" };
  }

  const quote = await loadQuoteContext(input.admin, input.refundQuoteId);
  if (!quote) {
    return { ok: false, status: 404, error: "quote_not_found" };
  }

  const quoteStatus = String(quote.quote_status ?? "");
  if (quoteStatus !== "approved_for_manual_refund") {
    return { ok: false, status: 409, error: "quote_not_approved" };
  }

  const amountCents = Number(quote.estimated_refund_cents ?? 0);
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, status: 409, error: "refund_amount_zero" };
  }

  const orderId = String(quote.planned_package_order_id ?? "");
  const cancellationRequestId = String(quote.cancellation_request_id ?? "");
  const currency = String(quote.currency ?? "CAD").toUpperCase();

  const { data: existingSucceeded } = await input.admin
    .from("planned_package_refund_executions")
    .select("*")
    .eq("refund_quote_id", input.refundQuoteId)
    .eq("status", "succeeded")
    .maybeSingle();

  if (existingSucceeded) {
    const order = await loadOrder(input.admin, orderId);
    return {
      ok: true,
      execution: mapExecutionRow(existingSucceeded as Record<string, unknown>),
      order: {
        id: orderId,
        refundStatus: (order?.refund_status as string | null) ?? null,
        refundedCents: Number(order?.refunded_cents ?? 0),
        refundedAt: (order?.refunded_at as string | null) ?? null,
      },
      reusedExisting: true,
    };
  }

  const order = await loadOrder(input.admin, orderId);
  if (!order) {
    return { ok: false, status: 404, error: "order_not_found" };
  }

  const orderStatus = String(order.status ?? "");
  if (!PAID_ORDER_STATUSES.has(orderStatus)) {
    return { ok: false, status: 409, error: "order_not_paid" };
  }

  const hasPayment =
    Boolean(order.payment_confirmed_at) ||
    Boolean(order.paid_at) ||
    Boolean(order.stripe_payment_intent_id);
  if (!hasPayment) {
    return { ok: false, status: 409, error: "order_not_paid" };
  }

  const paymentIntentId = (order.stripe_payment_intent_id as string | null) ?? null;
  if (!paymentIntentId) {
    return { ok: false, status: 409, error: "payment_reference_missing" };
  }

  const orderCurrency = String(order.currency_snapshot ?? "CAD").toUpperCase();
  if (orderCurrency !== currency) {
    return { ok: false, status: 409, error: "currency_mismatch", blockers: ["currency_mismatch"] };
  }

  if (await packageOrderHasTeacherTransfer(input.admin, orderId)) {
    return { ok: false, status: 409, error: "transfer_reversal_required" };
  }

  const bookings = await loadBookings(input.admin, orderId);
  const recalculated = calculatePlannedPackageRefundQuote({
    orderId,
    orderStatus,
    packageTotalCents: Number(order.price_cents_snapshot ?? 0),
    currency: orderCurrency,
    sessionCount: Number(order.session_count ?? 0),
    bookings,
    legalReviewCompleted: isPackageLegalReviewCompleted(),
  });

  if (recalculated.blockers.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "quote_blocked",
      blockers: recalculated.blockers,
    };
  }

  if (!quoteMatchesRecalculation(quote, recalculated)) {
    return { ok: false, status: 409, error: "quote_stale" };
  }

  const idempotencyKey =
    input.idempotencyKey?.trim() || buildPlannedPackageRefundIdempotencyKey(input.refundQuoteId);
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const { data: pendingExisting } = await input.admin
    .from("planned_package_refund_executions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  let executionId: string;
  if (pendingExisting) {
    const pendingStatus = String((pendingExisting as Record<string, unknown>).status ?? "");
    if (pendingStatus === "succeeded") {
      return {
        ok: true,
        execution: mapExecutionRow(pendingExisting as Record<string, unknown>),
        order: {
          id: orderId,
          refundStatus: (order.refund_status as string | null) ?? null,
          refundedCents: Number(order.refunded_cents ?? 0),
          refundedAt: (order.refunded_at as string | null) ?? null,
        },
        reusedExisting: true,
      };
    }
    executionId = String((pendingExisting as Record<string, unknown>).id ?? "");
  } else {
    const { data: inserted, error: insertErr } = await input.admin
      .from("planned_package_refund_executions")
      .insert({
        planned_package_order_id: orderId,
        cancellation_request_id: cancellationRequestId,
        refund_quote_id: input.refundQuoteId,
        executed_by: input.adminUserId,
        status: "pending",
        amount_cents: amountCents,
        currency,
        stripe_payment_intent_id: paymentIntentId,
        idempotency_key: idempotencyKey,
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      if (insertErr?.code === "23505") {
        return { ok: false, status: 409, error: "refund_already_executed" };
      }
      return { ok: false, status: 500, error: "refund_execution_failed" };
    }
    executionId = String((inserted as Record<string, unknown>).id ?? "");
  }

  const stripeClient = input.stripeClient ?? (stripe as unknown as StripeRefundsClient);
  const policyVersion = String(quote.policy_version ?? "");

  let stripeRefund: Stripe.Refund;
  try {
    stripeRefund = await stripeClient.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: {
          planned_package_order_id: orderId,
          cancellation_request_id: cancellationRequestId,
          refund_quote_id: input.refundQuoteId,
          package_type: "planned_package",
          policy_version: policyVersion,
          executed_by_admin_id: input.adminUserId,
        },
      },
      { idempotencyKey },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "stripe_refund_failed";
    await input.admin
      .from("planned_package_refund_executions")
      .update({
        status: "failed",
        failure_code: "stripe_refund_failed",
        failure_message: message.slice(0, 500),
        updated_at: nowIso,
      })
      .eq("id", executionId);

    return { ok: false, status: 502, error: "stripe_refund_failed" };
  }

  const chargeId =
    typeof stripeRefund.charge === "string"
      ? stripeRefund.charge
      : stripeRefund.charge?.id ?? null;

  const { data: succeededRow, error: successErr } = await input.admin
    .from("planned_package_refund_executions")
    .update({
      status: "succeeded",
      stripe_refund_id: stripeRefund.id,
      stripe_charge_id: chargeId,
      executed_at: nowIso,
      failure_code: null,
      failure_message: null,
      updated_at: nowIso,
    })
    .eq("id", executionId)
    .select("*")
    .single();

  if (successErr || !succeededRow) {
    return { ok: false, status: 500, error: "refund_execution_failed" };
  }

  const priorRefunded = Number(order.refunded_cents ?? 0);
  const totalRefunded = priorRefunded + amountCents;
  const packageTotal = Number(order.price_cents_snapshot ?? 0);
  const refundStatus =
    totalRefunded >= packageTotal && packageTotal > 0 ? "refunded" : "partial";

  await input.admin
    .from("planned_package_pending_orders")
    .update({
      refund_status: refundStatus,
      refunded_cents: totalRefunded,
      refunded_at: nowIso,
      last_refund_execution_id: executionId,
      updated_at: nowIso,
    })
    .eq("id", orderId);

  return {
    ok: true,
    execution: mapExecutionRow(succeededRow as Record<string, unknown>),
    order: {
      id: orderId,
      refundStatus,
      refundedCents: totalRefunded,
      refundedAt: nowIso,
    },
    reusedExisting: false,
  };
}
