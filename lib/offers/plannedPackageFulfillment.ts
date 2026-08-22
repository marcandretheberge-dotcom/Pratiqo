/**
 * Planned package fulfillment engine — converts payment_confirmed orders
 * into confirmed session bookings. No Stripe, transfers, entitlements, or redemptions.
 */

import { createClient } from "@supabase/supabase-js";
import { parseStartsAtToBookingSlot } from "./validatePlannedPackageDraftSessions";
import { allocatePlannedPackageSessionCents } from "./plannedPackageAllocation";
import {
  canUsePlannedPackageTemporaryHolds,
  type PlannedPackagePendingOrderStatus,
} from "./plannedPackageTemporaryHolds";

export const ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE_FLAG =
  "ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE";

export const ENABLE_PLANNED_PACKAGE_PAYMENT_SIMULATION_FLAG =
  "ENABLE_PLANNED_PACKAGE_PAYMENT_SIMULATION";

export type FulfillPlannedPackageOrderResult = {
  ok: boolean;
  orderId: string;
  status: PlannedPackagePendingOrderStatus | string | null;
  bookingsCreated: number;
  existingBookingsReused: number;
  bookingIds: string[];
  errors: string[];
  blockers: string[];
  idempotent?: boolean;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_admin");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Server-only flag. Do not rely on NEXT_PUBLIC for fulfillment. */
export function isPlannedPackageFulfillmentEngineEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE === "true";
}

export function canUsePlannedPackageFulfillmentEngine(): boolean {
  return canUsePlannedPackageTemporaryHolds() && isPlannedPackageFulfillmentEngineEnabled();
}

/**
 * Dev/test payment simulation is never on by default in production.
 * Requires explicit ENABLE_PLANNED_PACKAGE_PAYMENT_SIMULATION=true,
 * or non-production NODE_ENV with fulfillment engine enabled.
 */
export function canSimulatePlannedPackagePaymentConfirmed(): boolean {
  if (!canUsePlannedPackageFulfillmentEngine()) return false;
  if (process.env.ENABLE_PLANNED_PACKAGE_PAYMENT_SIMULATION === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export type FulfillTrustedActor =
  | { kind: "admin"; userId: string }
  | { kind: "service"; label: string };

function isTrustedActor(actor: FulfillTrustedActor | null | undefined): boolean {
  if (!actor) return false;
  if (actor.kind === "admin" && typeof actor.userId === "string" && actor.userId.length > 0) {
    return true;
  }
  if (actor.kind === "service" && typeof actor.label === "string" && actor.label.length > 0) {
    return true;
  }
  return false;
}

export async function markPlannedPackageOrderPaymentConfirmed(args: {
  orderId: string;
  paymentReference: string;
  actor: FulfillTrustedActor;
  /** Stripe webhook bypasses simulation gate and hold-expiry check. */
  source?: "simulation" | "stripe_webhook";
}): Promise<
  | { ok: true; orderId: string; status: "payment_confirmed" }
  | { ok: false; status: number; error: string }
> {
  if (!canUsePlannedPackageFulfillmentEngine()) {
    return { ok: false, status: 403, error: "fulfillment_engine_disabled" };
  }
  if (!isTrustedActor(args.actor)) {
    return { ok: false, status: 403, error: "trusted_context_required" };
  }
  const fromStripe = args.source === "stripe_webhook";
  if (!fromStripe) {
    if (!canSimulatePlannedPackagePaymentConfirmed()) {
      return { ok: false, status: 403, error: "payment_simulation_disabled" };
    }
  } else if (args.actor.kind !== "service") {
    return { ok: false, status: 403, error: "trusted_context_required" };
  }

  const ref = args.paymentReference.trim();
  if (ref.length < 4 || ref.length > 200) {
    return { ok: false, status: 400, error: "invalid_payment_reference" };
  }

  const admin = adminClient();
  const { data: order, error } = await admin
    .from("planned_package_pending_orders")
    .select("id, status, hold_expires_at")
    .eq("id", args.orderId)
    .maybeSingle();

  if (error || !order) {
    return { ok: false, status: 404, error: "order_not_found" };
  }

  const status = String(order.status ?? "");
  if (status === "payment_confirmed" || status === "fulfilling" || status === "fulfilled") {
    return { ok: true, orderId: args.orderId, status: "payment_confirmed" };
  }
  if (status !== "pending_payment") {
    return { ok: false, status: 409, error: "order_not_pending_payment" };
  }

  const holdExpiresAt = typeof order.hold_expires_at === "string" ? order.hold_expires_at : null;
  const now = new Date();
  if (
    !fromStripe &&
    holdExpiresAt &&
    new Date(holdExpiresAt).getTime() <= now.getTime()
  ) {
    return { ok: false, status: 409, error: "hold_expired" };
  }

  const { error: updateErr } = await admin
    .from("planned_package_pending_orders")
    .update({
      status: "payment_confirmed",
      payment_reference: ref,
      payment_confirmed_at: now.toISOString(),
      fulfillment_error: null,
    })
    .eq("id", args.orderId)
    .eq("status", "pending_payment");

  if (updateErr) {
    return { ok: false, status: 500, error: "server_error" };
  }

  return { ok: true, orderId: args.orderId, status: "payment_confirmed" };
}

export async function fulfillPlannedPackageOrder(args: {
  orderId: string;
  paymentReference?: string;
  idempotencyKey: string;
  actor: FulfillTrustedActor;
  now?: Date;
}): Promise<FulfillPlannedPackageOrderResult> {
  const empty = (error: string, status: string | null = null): FulfillPlannedPackageOrderResult => ({
    ok: false,
    orderId: args.orderId,
    status,
    bookingsCreated: 0,
    existingBookingsReused: 0,
    bookingIds: [],
    errors: [error],
    blockers: [error],
  });

  if (!canUsePlannedPackageFulfillmentEngine()) {
    return empty("fulfillment_engine_disabled");
  }
  if (!isTrustedActor(args.actor)) {
    return empty("trusted_context_required");
  }

  const key = args.idempotencyKey.trim();
  if (key.length < 8 || key.length > 128) {
    return empty("invalid_idempotency_key");
  }

  const admin = adminClient();
  const { data: order, error: orderErr } = await admin
    .from("planned_package_pending_orders")
    .select("*")
    .eq("id", args.orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return empty("order_not_found");
  }

  const status = String(order.status ?? "");
  const sessionCount = Number(order.session_count);
  const durationMinutes = Number(order.duration_minutes);
  const priceCents = Number(order.price_cents_snapshot);

  if (!Number.isInteger(sessionCount) || sessionCount < 2) {
    return empty("invalid_session_count", status);
  }
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    return empty("invalid_price", status);
  }

  const { data: holds, error: holdsErr } = await admin
    .from("planned_package_session_holds")
    .select("*")
    .eq("pending_order_id", args.orderId)
    .order("session_index", { ascending: true });

  if (holdsErr || !holds || holds.length === 0) {
    return empty("holds_missing_or_invalid", status);
  }

  const allocations = allocatePlannedPackageSessionCents(priceCents, sessionCount);
  const sessions: Array<Record<string, unknown>> = [];

  for (const hold of holds as Record<string, unknown>[]) {
    const sessionIndex = Number(hold.session_index);
    const startsAt = typeof hold.starts_at === "string" ? hold.starts_at : "";
    const endsAt = typeof hold.ends_at === "string" ? hold.ends_at : "";
    const holdStatus = String(hold.status ?? "");
    if (!Number.isInteger(sessionIndex) || sessionIndex < 1) {
      return empty("holds_missing_or_invalid", status);
    }
    if (holdStatus !== "active" && holdStatus !== "converted") {
      return empty("holds_missing_or_invalid", status);
    }
    const slot = parseStartsAtToBookingSlot(startsAt, durationMinutes);
    if (!slot) {
      return empty("invalid_hold_slot", status);
    }
    sessions.push({
      session_index: sessionIndex,
      slot_date: slot.slotDate,
      time_slot: slot.timeSlot,
      price_cents: allocations[sessionIndex - 1] ?? 0,
      duration_minutes: durationMinutes,
      starts_at: startsAt,
      ends_at: endsAt || slot.endsAtIso,
    });
  }

  if (sessions.length !== sessionCount) {
    return empty("session_count_mismatch", status);
  }

  const paymentReference =
    (args.paymentReference ?? (typeof order.payment_reference === "string" ? order.payment_reference : "")).trim() ||
    `fulfill:${args.orderId}`;

  const { data: rpcData, error: rpcErr } = await admin.rpc("fulfill_planned_package_order", {
    p_order_id: args.orderId,
    p_payment_reference: paymentReference,
    p_idempotency_key: key,
    p_sessions: sessions,
  });

  if (rpcErr) {
    return empty("fulfillment_rpc_failed", status);
  }

  const payload = (rpcData ?? {}) as Record<string, unknown>;
  const ok = payload.ok === true;
  const bookingIds = Array.isArray(payload.booking_ids)
    ? (payload.booking_ids as unknown[]).filter((id): id is string => typeof id === "string")
    : [];

  return {
    ok,
    orderId: typeof payload.order_id === "string" ? payload.order_id : args.orderId,
    status: typeof payload.status === "string" ? payload.status : status,
    bookingsCreated: Number(payload.bookings_created ?? 0) || 0,
    existingBookingsReused: Number(payload.existing_bookings_reused ?? 0) || 0,
    bookingIds,
    errors: ok
      ? []
      : [typeof payload.error === "string" ? payload.error : "fulfillment_failed"],
    blockers: ok
      ? []
      : [typeof payload.error === "string" ? payload.error : "fulfillment_failed"],
    idempotent: payload.idempotent === true,
  };
}

export async function simulatePlannedPackagePaymentConfirmedAndFulfill(args: {
  orderId: string;
  paymentReference: string;
  idempotencyKey: string;
  actor: FulfillTrustedActor;
}): Promise<
  | { ok: true; marked: true; fulfillment: FulfillPlannedPackageOrderResult }
  | { ok: false; status: number; error: string; fulfillment?: FulfillPlannedPackageOrderResult }
> {
  if (!canSimulatePlannedPackagePaymentConfirmed()) {
    return { ok: false, status: 403, error: "payment_simulation_disabled" };
  }

  const marked = await markPlannedPackageOrderPaymentConfirmed({
    orderId: args.orderId,
    paymentReference: args.paymentReference,
    actor: args.actor,
  });
  if (!marked.ok) {
    return { ok: false, status: marked.status, error: marked.error };
  }

  const fulfillment = await fulfillPlannedPackageOrder({
    orderId: args.orderId,
    paymentReference: args.paymentReference,
    idempotencyKey: args.idempotencyKey,
    actor: args.actor,
  });

  if (!fulfillment.ok) {
    return {
      ok: false,
      status: 409,
      error: fulfillment.errors[0] ?? "fulfillment_failed",
      fulfillment,
    };
  }

  return { ok: true, marked: true, fulfillment };
}
