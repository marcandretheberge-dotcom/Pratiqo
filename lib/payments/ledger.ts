import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { transferGroupForBooking } from "@/lib/payments/amounts";

type JsonRecord = Record<string, unknown>;

export type BookingPaymentDraft = {
  bookingId: string;
  teacherId: string;
  studentId: string;
  amountCents: number;
  platformFeeCents: number;
  teacherNetCents: number;
  currency?: string | null;
  stripeCheckoutSessionId?: string | null;
  transferGroup?: string | null;
  metadata?: JsonRecord;
};

export type BookingPaymentPaidUpdate = BookingPaymentDraft & {
  stripePaymentIntentId: string;
  stripeChargeId: string | null;
  paidAt?: string | null;
};

export type BookingPaymentRowForTransfer = {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  amount_cents: number;
  platform_fee_cents: number;
  teacher_net_cents: number;
  currency: string;
  payment_status: string;
  transfer_status: string;
};

export type BookingPaymentRiskRow = BookingPaymentRowForTransfer & {
  teacher_id: string;
  student_id: string;
};

function safeCents(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

function normalizeCurrency(currency: string | null | undefined): string {
  const c = String(currency || "cad").trim().toLowerCase();
  return /^[a-z]{3}$/.test(c) ? c : "cad";
}

export function paymentIntentIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const paymentIntent = session.payment_intent;
  if (typeof paymentIntent === "string") return paymentIntent;
  if (paymentIntent && typeof paymentIntent === "object") return paymentIntent.id;
  return null;
}

export function chargeIdFromPaymentIntent(paymentIntent: Stripe.PaymentIntent): string | null {
  const latestCharge = paymentIntent.latest_charge;
  if (typeof latestCharge === "string") return latestCharge;
  if (latestCharge && typeof latestCharge === "object") return latestCharge.id;
  return null;
}

export async function retrievePaymentIntentChargeId(paymentIntentId: string): Promise<string | null> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  return chargeIdFromPaymentIntent(paymentIntent);
}

export async function upsertUnpaidBookingPayment(
  admin: SupabaseClient,
  draft: BookingPaymentDraft,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing, error: existingErr } = await admin
    .from("booking_payments")
    .select("payment_status, transfer_status, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id, paid_at")
    .eq("booking_id", draft.bookingId)
    .maybeSingle();

  if (existingErr) {
    throw new Error(`Failed to check existing booking payment: ${existingErr.message}`);
  }

  const existingPayment = existing as {
    payment_status?: string | null;
    transfer_status?: string | null;
    stripe_checkout_session_id?: string | null;
    stripe_payment_intent_id?: string | null;
    stripe_charge_id?: string | null;
    paid_at?: string | null;
  } | null;
  const alreadyPaid = existingPayment?.payment_status === "paid";

  const { error } = await admin.from("booking_payments").upsert(
    {
      booking_id: draft.bookingId,
      teacher_id: draft.teacherId,
      student_id: draft.studentId,
      provider: "stripe",
      stripe_checkout_session_id: draft.stripeCheckoutSessionId ?? existingPayment?.stripe_checkout_session_id ?? null,
      transfer_group: draft.transferGroup ?? transferGroupForBooking(draft.bookingId),
      amount_cents: safeCents(draft.amountCents),
      platform_fee_cents: safeCents(draft.platformFeeCents),
      teacher_net_cents: safeCents(draft.teacherNetCents),
      currency: normalizeCurrency(draft.currency),
      payment_status: alreadyPaid ? existingPayment?.payment_status : "unpaid",
      transfer_status: alreadyPaid ? (existingPayment?.transfer_status ?? "not_ready") : "not_ready",
      refund_status: "not_required",
      stripe_payment_intent_id: existingPayment?.stripe_payment_intent_id ?? null,
      stripe_charge_id: existingPayment?.stripe_charge_id ?? null,
      paid_at: existingPayment?.paid_at ?? null,
      metadata: draft.metadata ?? {},
      updated_at: now,
    },
    { onConflict: "booking_id" },
  );

  if (error) {
    throw new Error(`Failed to upsert unpaid booking payment: ${error.message}`);
  }
}

export async function upsertPaidBookingPayment(
  admin: SupabaseClient,
  update: BookingPaymentPaidUpdate,
): Promise<void> {
  const paidAt = update.paidAt ?? new Date().toISOString();
  const { data: existing, error: existingErr } = await admin
    .from("booking_payments")
    .select("transfer_status, stripe_checkout_session_id, stripe_transfer_id, transfer_created_at")
    .eq("booking_id", update.bookingId)
    .maybeSingle();

  if (existingErr) {
    throw new Error(`Failed to check existing paid booking payment: ${existingErr.message}`);
  }

  const existingTransfer = existing as {
    transfer_status?: string | null;
    stripe_checkout_session_id?: string | null;
    stripe_transfer_id?: string | null;
    transfer_created_at?: string | null;
  } | null;
  const preservedTransferStatus =
    existingTransfer?.transfer_status && existingTransfer.transfer_status !== "not_ready"
      ? existingTransfer.transfer_status
      : "not_ready";

  const { error } = await admin.from("booking_payments").upsert(
    {
      booking_id: update.bookingId,
      teacher_id: update.teacherId,
      student_id: update.studentId,
      provider: "stripe",
      stripe_checkout_session_id: update.stripeCheckoutSessionId ?? existingTransfer?.stripe_checkout_session_id ?? null,
      stripe_payment_intent_id: update.stripePaymentIntentId,
      stripe_charge_id: update.stripeChargeId,
      transfer_group: update.transferGroup ?? transferGroupForBooking(update.bookingId),
      amount_cents: safeCents(update.amountCents),
      platform_fee_cents: safeCents(update.platformFeeCents),
      teacher_net_cents: safeCents(update.teacherNetCents),
      currency: normalizeCurrency(update.currency),
      payment_status: "paid",
      transfer_status: preservedTransferStatus,
      stripe_transfer_id: existingTransfer?.stripe_transfer_id ?? null,
      transfer_created_at: existingTransfer?.transfer_created_at ?? null,
      refund_status: "not_required",
      paid_at: paidAt,
      metadata: update.metadata ?? {},
      updated_at: paidAt,
    },
    { onConflict: "booking_id" },
  );

  if (error) {
    throw new Error(`Failed to upsert paid booking payment: ${error.message}`);
  }
}

export async function getBookingPaymentForTransfer(
  admin: SupabaseClient,
  bookingId: string,
): Promise<BookingPaymentRowForTransfer | null> {
  const { data, error } = await admin
    .from("booking_payments")
    .select(
      "id, booking_id, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id, amount_cents, platform_fee_cents, teacher_net_cents, currency, payment_status, transfer_status",
    )
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch booking payment: ${error.message}`);
  }

  return (data as BookingPaymentRowForTransfer | null) ?? null;
}

export async function markBookingPaymentTransferFailed(
  admin: SupabaseClient,
  bookingId: string,
  reason: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("booking_payments")
    .update({
      transfer_status: "failed",
      failed_at: now,
      failure_reason: reason.slice(0, 500),
      updated_at: now,
    })
    .eq("booking_id", bookingId);

  if (error) {
    throw new Error(`Failed to mark booking transfer failed: ${error.message}`);
  }
}

export async function markBookingPaymentDisputed(
  admin: SupabaseClient,
  bookingId: string,
  params: { disputeId: string; reason?: string },
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing, error: readErr } = await admin
    .from("booking_payments")
    .select("metadata, payment_status")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (readErr) {
    throw new Error(`Failed to read booking payment for dispute: ${readErr.message}`);
  }

  if (String(existing?.payment_status ?? "") === "disputed") {
    return;
  }

  const priorMeta =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const { error } = await admin
    .from("booking_payments")
    .update({
      payment_status: "disputed",
      failure_reason: (params.reason ?? `Stripe dispute ${params.disputeId}`).slice(0, 500),
      metadata: {
        ...priorMeta,
        stripe_dispute_id: params.disputeId,
        stripe_dispute_recorded_at: now,
      },
      updated_at: now,
    })
    .eq("booking_id", bookingId);

  if (error) {
    throw new Error(`Failed to mark booking payment disputed: ${error.message}`);
  }
}

export async function markBookingPaymentTransferred(
  admin: SupabaseClient,
  bookingId: string,
  transfer: Stripe.Transfer,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("booking_payments")
    .update({
      transfer_status: "transferred",
      stripe_transfer_id: transfer.id,
      transfer_created_at: now,
      failure_reason: null,
      updated_at: now,
    })
    .eq("booking_id", bookingId);

  if (error) {
    throw new Error(`Failed to mark booking payment transferred: ${error.message}`);
  }
}
