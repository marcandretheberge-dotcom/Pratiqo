import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  markBookingPaymentTransferFailed,
  markBookingPaymentDisputed,
  type BookingPaymentRiskRow,
} from "@/lib/payments/ledger";

export type StripePaymentLookup = {
  bookingId?: string | null;
  transferId?: string | null;
  chargeId?: string | null;
  paymentIntentId?: string | null;
};

export function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

type TransferFailureFields = Stripe.Transfer & {
  failure_message?: string | null;
  failure_code?: string | null;
};

export function transferFailureReason(transfer: Stripe.Transfer, eventId: string): string {
  const failed = transfer as TransferFailureFields;
  const parts = [
    failed.failure_message,
    failed.failure_code,
    failed.description,
    `event:${eventId}`,
  ].filter((part) => typeof part === "string" && part.trim().length > 0);
  return (parts[0] ?? `Stripe transfer.failed (${eventId})`).slice(0, 500);
}

export async function findBookingPaymentForStripeEvent(
  admin: SupabaseClient,
  lookup: StripePaymentLookup,
): Promise<BookingPaymentRiskRow | null> {
  const select =
    "id, booking_id, teacher_id, student_id, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id, payment_status, transfer_status";

  if (lookup.transferId) {
    const { data, error } = await admin
      .from("booking_payments")
      .select(select)
      .eq("stripe_transfer_id", lookup.transferId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as BookingPaymentRiskRow;
  }

  if (lookup.chargeId) {
    const { data, error } = await admin
      .from("booking_payments")
      .select(select)
      .eq("stripe_charge_id", lookup.chargeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as BookingPaymentRiskRow;
  }

  if (lookup.paymentIntentId) {
    const { data, error } = await admin
      .from("booking_payments")
      .select(select)
      .eq("stripe_payment_intent_id", lookup.paymentIntentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as BookingPaymentRiskRow;
  }

  if (lookup.bookingId) {
    const { data, error } = await admin
      .from("booking_payments")
      .select(select)
      .eq("booking_id", lookup.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as BookingPaymentRiskRow;
  }

  return null;
}

export async function handleStripeTransferFailed(
  admin: SupabaseClient,
  transfer: Stripe.Transfer,
  eventId: string,
): Promise<{ ok: boolean; bookingId?: string; skipped?: string }> {
  const bookingId = transfer.metadata?.booking_id ?? null;
  const payment = await findBookingPaymentForStripeEvent(admin, {
    bookingId,
    transferId: transfer.id,
  });

  if (!payment) {
    console.warn("[stripe/webhook] transfer.failed: booking payment not found", {
      transferId: transfer.id,
      bookingId,
      eventId,
    });
    return { ok: false, skipped: "payment_not_found" };
  }

  if (payment.transfer_status === "transferred") {
    console.error("[stripe/webhook] transfer.failed after ledger marked transferred", {
      bookingId: payment.booking_id,
      transferId: transfer.id,
      eventId,
    });
    return { ok: true, bookingId: payment.booking_id, skipped: "already_transferred" };
  }

  if (payment.transfer_status === "failed") {
    return { ok: true, bookingId: payment.booking_id, skipped: "already_failed" };
  }

  const reason = transferFailureReason(transfer, eventId);
  await markBookingPaymentTransferFailed(admin, payment.booking_id, reason);
  console.warn("[stripe/webhook] transfer.failed recorded", {
    bookingId: payment.booking_id,
    transferId: transfer.id,
    reason,
    eventId,
  });
  return { ok: true, bookingId: payment.booking_id };
}

async function ensureDisputePayoutHold(
  admin: SupabaseClient,
  payment: BookingPaymentRiskRow,
  disputeId: string,
): Promise<void> {
  const transferStatus = String(payment.transfer_status ?? "").toLowerCase();
  if (transferStatus === "transferred" || transferStatus === "reversed" || transferStatus === "failed") {
    return;
  }

  if (transferStatus === "not_ready" || transferStatus === "ready") {
    await markBookingPaymentTransferFailed(
      admin,
      payment.booking_id,
      `Payout held pending dispute review (${disputeId})`,
    );
    payment.transfer_status = "failed";
  }
}

async function ensureDisputeSupportCase(
  admin: SupabaseClient,
  payment: BookingPaymentRiskRow,
  dispute: Stripe.Dispute,
): Promise<void> {
  const { data: openCases, error: openErr } = await admin
    .from("support_cases")
    .select("id")
    .eq("booking_id", payment.booking_id)
    .eq("payout_hold", true)
    .in("status", ["new", "waiting_other_party", "under_review"])
    .limit(1);

  if (openErr) {
    throw new Error(openErr.message);
  }
  if (openCases?.length) return;

  const disputeReason = dispute.reason ?? "unknown";
  const description =
    `Automated Stripe alert: card dispute ${dispute.id} was opened (${disputeReason}). ` +
    "Review this booking before any teacher payout or refund action.";

  const { error: insertErr } = await admin.from("support_cases").insert({
    booking_id: payment.booking_id,
    opened_by_user_id: payment.student_id,
    student_id: payment.student_id,
    teacher_id: payment.teacher_id,
    role: "student",
    category: "payment_or_receipt_issue",
    status: "new",
    priority: "urgent",
    payout_hold: true,
    payout_hold_reason: `Stripe dispute ${dispute.id} (${disputeReason})`,
    title: "Stripe card dispute",
    description,
    requested_resolution: "payout_review",
  });

  if (insertErr) {
    throw new Error(insertErr.message);
  }
}

export async function handleStripeChargeDisputeCreated(
  admin: SupabaseClient,
  dispute: Stripe.Dispute,
  eventId: string,
): Promise<{ ok: boolean; bookingId?: string; skipped?: string }> {
  const chargeId = stripeId(dispute.charge as string | Stripe.Charge | null);
  const paymentIntentId = stripeId(dispute.payment_intent as string | Stripe.PaymentIntent | null);
  const payment = await findBookingPaymentForStripeEvent(admin, { chargeId, paymentIntentId });

  if (!payment) {
    console.warn("[stripe/webhook] charge.dispute.created: booking payment not found", {
      disputeId: dispute.id,
      chargeId,
      paymentIntentId,
      eventId,
    });
    return { ok: false, skipped: "payment_not_found" };
  }

  const alreadyDisputed = payment.payment_status === "disputed";

  if (!alreadyDisputed) {
    const reason = `Stripe dispute ${dispute.id} (${dispute.reason ?? "unknown"}) [${eventId}]`;
    await markBookingPaymentDisputed(admin, payment.booking_id, {
      disputeId: dispute.id,
      reason,
    });
    payment.payment_status = "disputed";
  }

  await ensureDisputePayoutHold(admin, payment, dispute.id);
  await ensureDisputeSupportCase(admin, payment, dispute);

  console.warn("[stripe/webhook] charge.dispute.created recorded", {
    bookingId: payment.booking_id,
    disputeId: dispute.id,
    transferStatus: payment.transfer_status,
    eventId,
    alreadyDisputed,
  });

  return {
    ok: true,
    bookingId: payment.booking_id,
    ...(alreadyDisputed ? { skipped: "already_disputed" } : {}),
  };
}
