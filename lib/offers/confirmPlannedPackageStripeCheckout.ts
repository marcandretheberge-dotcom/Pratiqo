/**
 * Stripe webhook handlers for planned package checkout.
 * Marks payment_confirmed and runs fulfillment — no transfer / payout.
 */

import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  fulfillPlannedPackageOrder,
  markPlannedPackageOrderPaymentConfirmed,
} from "./plannedPackageFulfillment";
import { canUsePlannedPackageFulfillmentEngine } from "./plannedPackageFulfillment";
import { PLANNED_PACKAGE_STRIPE_METADATA_TYPE } from "./plannedPackageStripeCheckout";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_admin");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isPlannedPackageSession(md: Record<string, string> | undefined): boolean {
  return (
    md?.package_type === PLANNED_PACKAGE_STRIPE_METADATA_TYPE &&
    typeof md.planned_package_order_id === "string" &&
    md.planned_package_order_id.length > 0
  );
}

export async function confirmPlannedPackageStripeCheckout(args: {
  session: Stripe.Checkout.Session;
  paymentIntentId: string;
  webhookEventId?: string;
  webhookEventType?: string;
}): Promise<{ ok: boolean; orderId?: string; error?: string; idempotent?: boolean }> {
  const md = args.session.metadata as Record<string, string> | undefined;
  if (!isPlannedPackageSession(md)) {
    return { ok: false, error: "not_planned_package" };
  }
  if (!canUsePlannedPackageFulfillmentEngine()) {
    return { ok: false, error: "fulfillment_engine_disabled" };
  }

  const orderId = md!.planned_package_order_id;
  const admin = adminClient();

  const { data: order, error: orderErr } = await admin
    .from("planned_package_pending_orders")
    .select(
      "id, status, price_cents_snapshot, currency_snapshot, student_id, stripe_checkout_session_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { ok: false, error: "order_not_found" };
  }

  if (args.session.payment_status !== "paid") {
    return { ok: false, error: "payment_not_paid" };
  }

  const expectedCents = Number(order.price_cents_snapshot);
  const paidCents = args.session.amount_total;
  const currency = (args.session.currency ?? "").toUpperCase();
  const expectedCurrency = String(order.currency_snapshot ?? "CAD").toUpperCase();

  if (
    !Number.isInteger(expectedCents) ||
    paidCents == null ||
    paidCents !== expectedCents ||
    currency !== expectedCurrency
  ) {
    return { ok: false, error: "amount_mismatch" };
  }

  const storedSessionId =
    typeof order.stripe_checkout_session_id === "string" ? order.stripe_checkout_session_id : null;
  if (storedSessionId && storedSessionId !== args.session.id) {
    return { ok: false, error: "session_mismatch" };
  }

  const status = String(order.status ?? "");
  if (status === "fulfilled") {
    return { ok: true, orderId, idempotent: true };
  }

  const paymentReference = args.paymentIntentId || args.session.id;
  const nowIso = new Date().toISOString();
  const webhookMeta: Record<string, unknown> = {
    stripe_checkout_session_id: args.session.id,
    stripe_payment_intent_id: args.paymentIntentId,
    stripe_checkout_status: "complete",
    paid_at: nowIso,
    stripe_checkout_completed_at: nowIso,
  };
  if (args.webhookEventId) webhookMeta.last_webhook_event_id = args.webhookEventId;
  if (args.webhookEventType) webhookMeta.last_webhook_event_type = args.webhookEventType;
  if (args.webhookEventId || args.webhookEventType) {
    webhookMeta.last_webhook_received_at = nowIso;
  }

  if (status === "pending_payment") {
    const marked = await markPlannedPackageOrderPaymentConfirmed({
      orderId,
      paymentReference,
      actor: { kind: "service", label: "stripe_webhook" },
      source: "stripe_webhook",
    });
    if (!marked.ok && marked.error !== "order_not_pending_payment") {
      return { ok: false, error: marked.error };
    }
  }

  const { data: beforeFulfill } = await admin
    .from("planned_package_pending_orders")
    .select("fulfillment_attempt_count")
    .eq("id", orderId)
    .maybeSingle();
  const attemptCount = Number(beforeFulfill?.fulfillment_attempt_count ?? 0) + 1;

  await admin
    .from("planned_package_pending_orders")
    .update({
      ...webhookMeta,
      fulfillment_attempt_count: attemptCount,
      last_fulfillment_attempt_at: nowIso,
    })
    .eq("id", orderId);

  const idempotencyKey = `stripe-fulfill-${args.session.id}`.slice(0, 128);
  const fulfillment = await fulfillPlannedPackageOrder({
    orderId,
    paymentReference,
    idempotencyKey,
    actor: { kind: "service", label: "stripe_webhook" },
  });

  if (!fulfillment.ok) {
    await admin
      .from("planned_package_pending_orders")
      .update({
        fulfillment_error: (fulfillment.errors[0] ?? "fulfillment_failed").slice(0, 500),
      })
      .eq("id", orderId);
    return { ok: false, orderId, error: fulfillment.errors[0] ?? "fulfillment_failed" };
  }

  return { ok: true, orderId, idempotent: fulfillment.idempotent === true };
}

export async function expirePlannedPackageStripeCheckout(
  session: Stripe.Checkout.Session,
  webhookMeta?: { eventId?: string; eventType?: string },
): Promise<void> {
  const md = session.metadata as Record<string, string> | undefined;
  if (!isPlannedPackageSession(md)) return;

  const orderId = md!.planned_package_order_id;
  const admin = adminClient();
  const nowIso = new Date().toISOString();

  const update: Record<string, unknown> = {
    stripe_checkout_status: "expired",
    stripe_checkout_expired_at: nowIso,
  };
  if (webhookMeta?.eventId) update.last_webhook_event_id = webhookMeta.eventId;
  if (webhookMeta?.eventType) update.last_webhook_event_type = webhookMeta.eventType;
  if (webhookMeta?.eventId || webhookMeta?.eventType) {
    update.last_webhook_received_at = nowIso;
  }

  await admin
    .from("planned_package_pending_orders")
    .update(update)
    .eq("id", orderId)
    .eq("status", "pending_payment");
}
