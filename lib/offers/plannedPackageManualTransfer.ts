/**
 * Admin-only manual Stripe Connect transfer for eligible planned package payout entries.
 *
 * Transfers platform-collected funds to teacher connected account — one session at a time.
 * No transfer reversals, refunds, automatic payouts, or payout cron.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { isPackageLegalReviewCompleted } from "./plannedPackages";
import { isProductionCheckoutEnvironment } from "./plannedPackageStripeCheckout";
import { plannedPackageTransferGroup } from "./plannedPackageStripeCheckout";
import {
  evaluatePlannedPackageSessionPayoutEligibility,
  type PayoutEligibilityBlocker,
} from "./plannedPackagePayoutEligibility";
import { classifyPlannedPackageSessionStatus } from "./plannedPackageSessionDelivery";
import {
  canUsePlannedPackageManualTransfers,
  isPlannedPackageManualTransfersEnabled,
} from "./plannedPackageManualTransfers";

export type StripeTransfersClient = {
  transfers: {
    create: (
      params: Stripe.TransferCreateParams,
      options?: Stripe.RequestOptions,
    ) => Promise<Stripe.Transfer>;
  };
};

export type PlannedPackageTransferExecutionRow = {
  id: string;
  planned_package_order_id: string;
  payout_eligibility_entry_id: string;
  booking_id: string;
  teacher_id: string;
  student_id: string;
  teacher_offer_id: string | null;
  executed_by: string;
  status: string;
  amount_cents: number;
  currency: string;
  stripe_transfer_id: string | null;
  stripe_transfer_group: string | null;
  stripe_destination_account_id: string | null;
  idempotency_key: string;
  failure_code: string | null;
  failure_message: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExecuteApprovedPlannedPackageTransferInput = {
  admin: SupabaseClient;
  payoutEligibilityEntryId: string;
  adminUserId: string;
  idempotencyKey?: string;
  now?: Date;
  stripeClient?: StripeTransfersClient;
};

export type ExecuteApprovedPlannedPackageTransferSuccess = {
  ok: true;
  execution: PlannedPackageTransferExecutionRow;
  eligibilityEntry: {
    id: string;
    transferStatus: string | null;
    transferredCents: number;
    stripeTransferId: string | null;
  };
  order: { id: string; status: string };
  reusedExisting: boolean;
};

export type ExecuteApprovedPlannedPackageTransferFailure = {
  ok: false;
  status: number;
  error: string;
  blockers?: string[];
};

export type ExecuteApprovedPlannedPackageTransferResult =
  | ExecuteApprovedPlannedPackageTransferSuccess
  | ExecuteApprovedPlannedPackageTransferFailure;

const PAID_ORDER_STATUSES = new Set([
  "paid",
  "payment_confirmed",
  "fulfilling",
  "fulfilled",
  "fulfillment_failed",
]);

const FULFILLED_ORDER_STATUSES = new Set(["fulfilled"]);

const ACTIVE_CANCELLATION_STATUSES = new Set([
  "requested",
  "quote_generated",
  "admin_review_required",
  "approved_for_manual_refund",
]);

const BLOCKING_QUOTE_STATUSES = new Set([
  "draft",
  "admin_review_required",
  "approved_for_manual_refund",
]);

export function buildPlannedPackageTransferIdempotencyKey(
  payoutEligibilityEntryId: string,
): string {
  return `planned-package-transfer-${payoutEligibilityEntryId}`;
}

export function canExecutePlannedPackageTransferInCurrentEnvironment(): boolean {
  if (!canUsePlannedPackageManualTransfers()) return false;
  if (isPackageLegalReviewCompleted()) return true;
  if (isProductionCheckoutEnvironment()) return false;
  return true;
}

function mapExecutionRow(row: Record<string, unknown>): PlannedPackageTransferExecutionRow {
  return {
    id: String(row.id ?? ""),
    planned_package_order_id: String(row.planned_package_order_id ?? ""),
    payout_eligibility_entry_id: String(row.payout_eligibility_entry_id ?? ""),
    booking_id: String(row.booking_id ?? ""),
    teacher_id: String(row.teacher_id ?? ""),
    student_id: String(row.student_id ?? ""),
    teacher_offer_id: (row.teacher_offer_id as string | null) ?? null,
    executed_by: String(row.executed_by ?? ""),
    status: String(row.status ?? ""),
    amount_cents: Number(row.amount_cents ?? 0),
    currency: String(row.currency ?? "CAD"),
    stripe_transfer_id: (row.stripe_transfer_id as string | null) ?? null,
    stripe_transfer_group: (row.stripe_transfer_group as string | null) ?? null,
    stripe_destination_account_id: (row.stripe_destination_account_id as string | null) ?? null,
    idempotency_key: String(row.idempotency_key ?? ""),
    failure_code: (row.failure_code as string | null) ?? null,
    failure_message: (row.failure_message as string | null) ?? null,
    executed_at: (row.executed_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function stripeErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

async function loadEligibilityEntry(admin: SupabaseClient, entryId: string) {
  const { data, error } = await admin
    .from("planned_package_payout_eligibility_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

async function loadOrder(admin: SupabaseClient, orderId: string) {
  const { data, error } = await admin
    .from("planned_package_pending_orders")
    .select(
      "id, status, student_id, teacher_id, teacher_offer_id, session_count, price_cents_snapshot, currency_snapshot, payment_confirmed_at, paid_at, stripe_payment_intent_id, refund_status",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

async function loadBooking(admin: SupabaseClient, bookingId: string) {
  const { data, error } = await admin
    .from("bookings")
    .select(
      "id, status, student_id, teacher_id, teacher_offer_id, planned_package_order_id, planned_package_session_index, booking_source, price_cents",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

async function loadTeacher(admin: SupabaseClient, teacherId: string) {
  const { data, error } = await admin
    .from("teachers")
    .select(
      "id, stripe_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_onboarding_complete, stripe_connect_requirements_due, stripe_connect_disabled_reason",
    )
    .eq("id", teacherId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

async function loadRefundContext(admin: SupabaseClient, orderId: string) {
  const [{ data: cancel }, { data: quote }, { data: execution }] = await Promise.all([
    admin
      .from("planned_package_cancellation_requests")
      .select("status")
      .eq("planned_package_order_id", orderId)
      .in("status", Array.from(ACTIVE_CANCELLATION_STATUSES))
      .limit(1)
      .maybeSingle(),
    admin
      .from("planned_package_refund_quotes")
      .select("quote_status")
      .eq("planned_package_order_id", orderId)
      .neq("quote_status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("planned_package_refund_executions")
      .select("status")
      .eq("planned_package_order_id", orderId)
      .eq("status", "succeeded")
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    cancellationOpen: Boolean(cancel),
    refundQuoteStatus: (quote?.quote_status as string | null) ?? null,
    refundExecuted: Boolean(execution),
  };
}

export async function executeApprovedPlannedPackageTransfer(
  input: ExecuteApprovedPlannedPackageTransferInput,
): Promise<ExecuteApprovedPlannedPackageTransferResult> {
  if (!isPlannedPackageManualTransfersEnabled()) {
    return { ok: false, status: 403, error: "manual_transfers_disabled" };
  }
  if (!canUsePlannedPackageManualTransfers()) {
    return { ok: false, status: 403, error: "manual_transfers_disabled" };
  }
  if (!canExecutePlannedPackageTransferInCurrentEnvironment()) {
    return { ok: false, status: 403, error: "legal_review_required" };
  }

  const entry = await loadEligibilityEntry(input.admin, input.payoutEligibilityEntryId);
  if (!entry) {
    return { ok: false, status: 404, error: "eligibility_entry_not_found" };
  }

  const entryStatus = String(entry.status ?? "");
  if (entryStatus !== "eligible") {
    return { ok: false, status: 409, error: "eligibility_entry_not_eligible" };
  }

  const orderId = String(entry.planned_package_order_id ?? "");
  const bookingId = String(entry.booking_id ?? "");
  const currency = String(entry.currency ?? "CAD").toUpperCase();

  const { data: existingSucceeded } = await input.admin
    .from("planned_package_transfer_executions")
    .select("*")
    .eq("payout_eligibility_entry_id", input.payoutEligibilityEntryId)
    .eq("status", "succeeded")
    .maybeSingle();

  if (existingSucceeded) {
    const order = await loadOrder(input.admin, orderId);
    const amountCents = Number(entry.teacher_net_cents ?? 0);
    return {
      ok: true,
      execution: mapExecutionRow(existingSucceeded as Record<string, unknown>),
      eligibilityEntry: {
        id: input.payoutEligibilityEntryId,
        transferStatus: (entry.transfer_status as string | null) ?? "transferred",
        transferredCents: Number(entry.transferred_cents ?? amountCents),
        stripeTransferId: (entry.stripe_transfer_id as string | null) ?? null,
      },
      order: { id: orderId, status: String(order?.status ?? "") },
      reusedExisting: true,
    };
  }

  const transferStatus = (entry.transfer_status as string | null) ?? null;
  if (transferStatus === "transferred" || entry.stripe_transfer_id) {
    return { ok: false, status: 409, error: "transfer_already_executed" };
  }

  const teacherNetCents = entry.teacher_net_cents;
  if (teacherNetCents === null || teacherNetCents === undefined) {
    return {
      ok: false,
      status: 409,
      error: "payout_pricing_policy_not_finalized",
      blockers: ["payout_pricing_policy_not_finalized"],
    };
  }

  const amountCents = Number(teacherNetCents);
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, status: 409, error: "transfer_amount_missing" };
  }

  const [order, booking, teacher, refundCtx] = await Promise.all([
    loadOrder(input.admin, orderId),
    loadBooking(input.admin, bookingId),
    loadTeacher(input.admin, String(entry.teacher_id ?? "")),
    loadRefundContext(input.admin, orderId),
  ]);

  if (!order) {
    return { ok: false, status: 404, error: "order_not_found" };
  }
  if (!booking) {
    return { ok: false, status: 404, error: "booking_not_found" };
  }

  const orderStatus = String(order.status ?? "");
  if (!PAID_ORDER_STATUSES.has(orderStatus)) {
    return { ok: false, status: 409, error: "order_not_paid" };
  }
  if (!FULFILLED_ORDER_STATUSES.has(orderStatus)) {
    return { ok: false, status: 409, error: "order_not_fulfilled" };
  }

  const hasPayment =
    Boolean(order.payment_confirmed_at) ||
    Boolean(order.paid_at) ||
    Boolean(order.stripe_payment_intent_id);
  if (!hasPayment) {
    return { ok: false, status: 409, error: "order_not_paid" };
  }

  const orderCurrency = String(order.currency_snapshot ?? "CAD").toUpperCase();
  if (orderCurrency !== currency) {
    return { ok: false, status: 409, error: "currency_mismatch", blockers: ["currency_mismatch"] };
  }

  if (classifyPlannedPackageSessionStatus(String(booking.status ?? "")) !== "completed") {
    return { ok: false, status: 409, error: "booking_not_completed" };
  }

  const blockers: string[] = [];
  if (refundCtx.cancellationOpen) blockers.push("cancellation_request_open");
  if (refundCtx.refundExecuted || order.refund_status === "refunded") {
    blockers.push("refund_executed");
  } else if (
    refundCtx.refundQuoteStatus &&
    BLOCKING_QUOTE_STATUSES.has(refundCtx.refundQuoteStatus)
  ) {
    blockers.push(
      refundCtx.refundQuoteStatus === "approved_for_manual_refund"
        ? "refund_approved_or_executed"
        : "refund_quote_pending",
    );
  }

  if (blockers.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "refund_or_cancellation_blocker",
      blockers,
    };
  }

  const freshEval = evaluatePlannedPackageSessionPayoutEligibility({
    order: {
      id: orderId,
      status: orderStatus,
      student_id: String(order.student_id ?? ""),
      teacher_id: String(order.teacher_id ?? ""),
      teacher_offer_id: (order.teacher_offer_id as string | null) ?? null,
      session_count: Number(order.session_count ?? 0),
      price_cents_snapshot: Number(order.price_cents_snapshot ?? 0),
      currency_snapshot: orderCurrency,
      payment_confirmed_at: (order.payment_confirmed_at as string | null) ?? null,
      paid_at: (order.paid_at as string | null) ?? null,
      stripe_payment_intent_id: (order.stripe_payment_intent_id as string | null) ?? null,
      refund_status: (order.refund_status as string | null) ?? null,
    },
    booking: {
      id: bookingId,
      status: String(booking.status ?? ""),
      student_id: String(booking.student_id ?? ""),
      teacher_id: String(booking.teacher_id ?? ""),
      teacher_offer_id: (booking.teacher_offer_id as string | null) ?? null,
      planned_package_order_id: (booking.planned_package_order_id as string | null) ?? null,
      planned_package_session_index:
        booking.planned_package_session_index === null ||
        booking.planned_package_session_index === undefined
          ? null
          : Number(booking.planned_package_session_index),
      booking_source: (booking.booking_source as string | null) ?? null,
      price_cents:
        booking.price_cents === null || booking.price_cents === undefined
          ? null
          : Number(booking.price_cents),
    },
    teacher: teacher
      ? {
          id: String(teacher.id ?? ""),
          stripe_account_id: (teacher.stripe_account_id as string | null) ?? null,
          stripe_connect_charges_enabled:
            teacher.stripe_connect_charges_enabled as boolean | null,
          stripe_connect_payouts_enabled:
            teacher.stripe_connect_payouts_enabled as boolean | null,
          stripe_connect_onboarding_complete:
            teacher.stripe_connect_onboarding_complete as boolean | null,
          stripe_connect_requirements_due: teacher.stripe_connect_requirements_due as boolean | null,
          stripe_connect_disabled_reason:
            (teacher.stripe_connect_disabled_reason as string | null) ?? null,
        }
      : null,
    ...refundCtx,
  });

  const transferBlockers = freshEval.blockers.filter(
    (b: PayoutEligibilityBlocker) => b !== "payout_pricing_policy_not_finalized",
  );

  if (transferBlockers.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "eligibility_entry_not_eligible",
      blockers: transferBlockers,
    };
  }

  if (freshEval.teacherNetCents != null && freshEval.teacherNetCents !== amountCents) {
    return {
      ok: false,
      status: 409,
      error: "transfer_amount_mismatch",
      blockers: ["transfer_amount_mismatch"],
    };
  }

  const stripeAccountId = (teacher?.stripe_account_id as string | null)?.trim() ?? "";
  if (!stripeAccountId) {
    return { ok: false, status: 409, error: "connected_account_missing" };
  }

  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    buildPlannedPackageTransferIdempotencyKey(input.payoutEligibilityEntryId);
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const transferGroup =
    (entry.stripe_transfer_group as string | null)?.trim() ||
    plannedPackageTransferGroup(orderId);

  const { data: pendingExisting } = await input.admin
    .from("planned_package_transfer_executions")
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
        eligibilityEntry: {
          id: input.payoutEligibilityEntryId,
          transferStatus: "transferred",
          transferredCents: amountCents,
          stripeTransferId:
            ((pendingExisting as Record<string, unknown>).stripe_transfer_id as string | null) ??
            null,
        },
        order: { id: orderId, status: orderStatus },
        reusedExisting: true,
      };
    }
    executionId = String((pendingExisting as Record<string, unknown>).id ?? "");
  } else {
    const { data: inserted, error: insertErr } = await input.admin
      .from("planned_package_transfer_executions")
      .insert({
        planned_package_order_id: orderId,
        payout_eligibility_entry_id: input.payoutEligibilityEntryId,
        booking_id: bookingId,
        teacher_id: String(entry.teacher_id ?? ""),
        student_id: String(entry.student_id ?? ""),
        teacher_offer_id: (entry.teacher_offer_id as string | null) ?? null,
        executed_by: input.adminUserId,
        status: "pending",
        amount_cents: amountCents,
        currency,
        stripe_transfer_group: transferGroup,
        stripe_destination_account_id: stripeAccountId,
        idempotency_key: idempotencyKey,
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      if (insertErr?.code === "23505") {
        return { ok: false, status: 409, error: "transfer_already_executed" };
      }
      return { ok: false, status: 500, error: "transfer_execution_failed" };
    }
    executionId = String((inserted as Record<string, unknown>).id ?? "");
  }

  await input.admin
    .from("planned_package_payout_eligibility_entries")
    .update({ transfer_status: "pending", updated_at: nowIso })
    .eq("id", input.payoutEligibilityEntryId);

  const stripeClient = input.stripeClient ?? (stripe as unknown as StripeTransfersClient);
  const sessionIndex = Number(entry.package_session_index ?? 0);

  let stripeTransfer: Stripe.Transfer;
  try {
    stripeTransfer = await stripeClient.transfers.create(
      {
        amount: amountCents,
        currency: currency.toLowerCase(),
        destination: stripeAccountId,
        transfer_group: transferGroup,
        metadata: {
          planned_package_order_id: orderId,
          payout_eligibility_entry_id: input.payoutEligibilityEntryId,
          booking_id: bookingId,
          teacher_id: String(entry.teacher_id ?? ""),
          teacher_offer_id: String(entry.teacher_offer_id ?? ""),
          student_id: String(entry.student_id ?? ""),
          package_session_index: String(sessionIndex),
          package_type: "planned_package",
          executed_by_admin_id: input.adminUserId,
        },
      },
      { idempotencyKey },
    );
  } catch (err) {
    const code = stripeErrorCode(err);
    const message = err instanceof Error ? err.message : "stripe_transfer_failed";
    const failureCode =
      code === "balance_insufficient" ? "insufficient_platform_balance" : "stripe_transfer_failed";

    await input.admin
      .from("planned_package_transfer_executions")
      .update({
        status: "failed",
        failure_code: failureCode,
        failure_message: message.slice(0, 500),
        updated_at: nowIso,
      })
      .eq("id", executionId);

    await input.admin
      .from("planned_package_payout_eligibility_entries")
      .update({ transfer_status: "failed", updated_at: nowIso })
      .eq("id", input.payoutEligibilityEntryId);

    return {
      ok: false,
      status: code === "balance_insufficient" ? 409 : 502,
      error: failureCode === "insufficient_platform_balance"
        ? "insufficient_platform_balance"
        : "stripe_transfer_failed",
    };
  }

  const { data: succeededRow, error: successErr } = await input.admin
    .from("planned_package_transfer_executions")
    .update({
      status: "succeeded",
      stripe_transfer_id: stripeTransfer.id,
      stripe_destination_account_id: stripeAccountId,
      executed_at: nowIso,
      failure_code: null,
      failure_message: null,
      updated_at: nowIso,
    })
    .eq("id", executionId)
    .select("*")
    .single();

  if (successErr || !succeededRow) {
    return { ok: false, status: 500, error: "transfer_execution_failed" };
  }

  await input.admin
    .from("planned_package_payout_eligibility_entries")
    .update({
      transfer_status: "transferred",
      transferred_cents: amountCents,
      transferred_at: nowIso,
      last_transfer_execution_id: executionId,
      stripe_transfer_id: stripeTransfer.id,
      updated_at: nowIso,
    })
    .eq("id", input.payoutEligibilityEntryId);

  return {
    ok: true,
    execution: mapExecutionRow(succeededRow as Record<string, unknown>),
    eligibilityEntry: {
      id: input.payoutEligibilityEntryId,
      transferStatus: "transferred",
      transferredCents: amountCents,
      stripeTransferId: stripeTransfer.id,
    },
    order: { id: orderId, status: orderStatus },
    reusedExisting: false,
  };
}
