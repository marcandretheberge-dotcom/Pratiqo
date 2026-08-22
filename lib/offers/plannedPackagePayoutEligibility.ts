/**
 * Planned package payout eligibility evaluation — ledger only, no Stripe transfer.
 *
 * Progressive payout principle: one entry per fulfilled package session booking.
 * Eligibility is not payment.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { allocatePlannedPackageSessionCents } from "./plannedPackageAllocation";
import { classifyPlannedPackageSessionStatus } from "./plannedPackageSessionDelivery";
import { plannedPackageTransferGroup } from "./plannedPackageStripeCheckout";
import {
  canUsePlannedPackagePayoutEligibilityLedger,
} from "./plannedPackagePayoutEligibilityLedger";
import { teacherPayoutReadinessContractFailureReasons } from "@/lib/teachers/readinessContracts";

export { canUsePlannedPackagePayoutEligibilityLedger } from "./plannedPackagePayoutEligibilityLedger";

export type PayoutEligibilityStatus =
  | "not_eligible"
  | "eligible"
  | "blocked"
  | "admin_review_required"
  | "superseded";

export type PayoutEligibilityBlocker =
  | "ledger_disabled"
  | "order_not_found"
  | "order_not_paid"
  | "order_not_fulfilled"
  | "booking_not_found"
  | "booking_not_completed"
  | "booking_not_package_session"
  | "booking_order_mismatch"
  | "allocation_missing"
  | "allocation_mismatch"
  | "currency_mismatch"
  | "cancellation_request_open"
  | "refund_quote_pending"
  | "refund_approved_or_executed"
  | "refund_executed"
  | "teacher_payment_not_ready"
  | "payout_pricing_policy_not_finalized"
  | "admin_review_required";

export type EvaluatePlannedPackageSessionPayoutEligibilityResult = {
  eligible: boolean;
  status: PayoutEligibilityStatus;
  reason: string | null;
  blockers: PayoutEligibilityBlocker[];
  grossSessionAmountCents: number;
  currency: string;
  platformFeeCents: number | null;
  teacherNetCents: number | null;
  adminReviewRequired: boolean;
};

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

type OrderRow = {
  id: string;
  status: string;
  student_id: string;
  teacher_id: string;
  teacher_offer_id: string | null;
  session_count: number;
  price_cents_snapshot: number;
  currency_snapshot: string;
  payment_confirmed_at: string | null;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  refund_status: string | null;
};

type BookingRow = {
  id: string;
  status: string;
  student_id: string;
  teacher_id: string;
  teacher_offer_id: string | null;
  planned_package_order_id: string | null;
  planned_package_session_index: number | null;
  booking_source: string | null;
  price_cents: number | null;
};

type TeacherRow = {
  id: string;
  stripe_account_id: string | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_payouts_enabled: boolean | null;
  stripe_connect_onboarding_complete: boolean | null;
  stripe_connect_requirements_due: boolean | null;
  stripe_connect_disabled_reason: string | null;
};

function expectedGrossCents(order: OrderRow, sessionIndex: number): number {
  const allocations = allocatePlannedPackageSessionCents(
    Number(order.price_cents_snapshot),
    Number(order.session_count),
  );
  const idx = sessionIndex - 1;
  if (idx < 0 || idx >= allocations.length) {
    throw new Error("allocation_missing");
  }
  return allocations[idx]!;
}

export function evaluatePlannedPackageSessionPayoutEligibility(args: {
  order: OrderRow;
  booking: BookingRow;
  teacher: TeacherRow | null;
  cancellationOpen: boolean;
  refundQuoteStatus: string | null;
  refundExecuted: boolean;
  now?: Date;
}): EvaluatePlannedPackageSessionPayoutEligibilityResult {
  const blockers: PayoutEligibilityBlocker[] = [];
  const now = args.now ?? new Date();
  const currency = String(args.order.currency_snapshot ?? "CAD").toUpperCase();

  let grossSessionAmountCents = 0;
  try {
    const sessionIndex = Number(args.booking.planned_package_session_index ?? 0);
    grossSessionAmountCents = expectedGrossCents(args.order, sessionIndex);
    if (
      args.booking.price_cents != null &&
      Number.isInteger(args.booking.price_cents) &&
      args.booking.price_cents !== grossSessionAmountCents
    ) {
      blockers.push("allocation_mismatch");
    }
  } catch {
    blockers.push("allocation_missing");
  }

  if (!args.booking.planned_package_order_id) {
    blockers.push("booking_not_package_session");
  }
  if (
    args.booking.planned_package_order_id &&
    args.booking.planned_package_order_id !== args.order.id
  ) {
    blockers.push("booking_order_mismatch");
  }

  const orderStatus = String(args.order.status ?? "");
  if (!PAID_ORDER_STATUSES.has(orderStatus)) {
    blockers.push("order_not_paid");
  }
  if (!FULFILLED_ORDER_STATUSES.has(orderStatus)) {
    blockers.push("order_not_fulfilled");
  }

  const hasPayment =
    Boolean(args.order.payment_confirmed_at) ||
    Boolean(args.order.paid_at) ||
    Boolean(args.order.stripe_payment_intent_id);
  if (!hasPayment) {
    blockers.push("order_not_paid");
  }

  const deliveryClass = classifyPlannedPackageSessionStatus(args.booking.status);
  if (deliveryClass !== "completed") {
    blockers.push("booking_not_completed");
  }

  if (args.cancellationOpen) {
    blockers.push("cancellation_request_open");
  }

  if (args.refundExecuted || args.order.refund_status === "refunded") {
    blockers.push("refund_executed");
  } else if (
    args.refundQuoteStatus &&
    BLOCKING_QUOTE_STATUSES.has(args.refundQuoteStatus)
  ) {
    if (args.refundQuoteStatus === "approved_for_manual_refund") {
      blockers.push("refund_approved_or_executed");
    } else {
      blockers.push("refund_quote_pending");
    }
  }

  if (args.teacher) {
    const paymentBlockers = teacherPayoutReadinessContractFailureReasons(args.teacher);
    if (paymentBlockers.length > 0) {
      blockers.push("teacher_payment_not_ready");
    }
  } else {
    blockers.push("teacher_payment_not_ready");
  }

  // Package-specific commission not finalized — store gross only.
  blockers.push("payout_pricing_policy_not_finalized");

  const hardBlockers = blockers.filter(
    (b) =>
      b !== "payout_pricing_policy_not_finalized" &&
      b !== "teacher_payment_not_ready",
  );

  const adminReviewRequired =
    blockers.includes("payout_pricing_policy_not_finalized") ||
    blockers.includes("teacher_payment_not_ready") ||
    blockers.includes("refund_quote_pending") ||
    blockers.includes("cancellation_request_open") ||
    blockers.includes("allocation_missing") ||
    blockers.includes("allocation_mismatch");

  let status: PayoutEligibilityStatus = "not_eligible";
  let reason: string | null = null;

  if (hardBlockers.includes("booking_not_completed")) {
    status = "not_eligible";
    reason = "session_not_completed";
  } else if (
    hardBlockers.includes("refund_executed") ||
    hardBlockers.includes("refund_approved_or_executed")
  ) {
    status = "blocked";
    reason = "blocked_by_refund";
  } else if (hardBlockers.includes("cancellation_request_open")) {
    status = "blocked";
    reason = "blocked_by_cancellation";
  } else if (hardBlockers.length > 0) {
    status = "blocked";
    reason = hardBlockers[0] ?? "blocked";
  } else if (adminReviewRequired) {
    status = "admin_review_required";
    reason = "admin_review_required";
  } else {
    status = "eligible";
    reason = "session_completed";
  }

  const eligible = status === "eligible";

  return {
    eligible,
    status,
    reason,
    blockers: Array.from(new Set(blockers)),
    grossSessionAmountCents,
    currency,
    platformFeeCents: null,
    teacherNetCents: null,
    adminReviewRequired,
  };
}

async function loadOrder(admin: SupabaseClient, orderId: string): Promise<OrderRow | null> {
  const { data, error } = await admin
    .from("planned_package_pending_orders")
    .select(
      "id, status, student_id, teacher_id, teacher_offer_id, session_count, price_cents_snapshot, currency_snapshot, payment_confirmed_at, paid_at, stripe_payment_intent_id, refund_status",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OrderRow | null) ?? null;
}

async function loadBookings(admin: SupabaseClient, orderId: string): Promise<BookingRow[]> {
  const { data, error } = await admin
    .from("bookings")
    .select(
      "id, status, student_id, teacher_id, teacher_offer_id, planned_package_order_id, planned_package_session_index, booking_source, price_cents",
    )
    .eq("planned_package_order_id", orderId)
    .order("planned_package_session_index", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as BookingRow[]) ?? [];
}

async function loadTeacher(admin: SupabaseClient, teacherId: string): Promise<TeacherRow | null> {
  const { data, error } = await admin
    .from("teachers")
    .select(
      "id, stripe_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_onboarding_complete, stripe_connect_requirements_due, stripe_connect_disabled_reason",
    )
    .eq("id", teacherId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TeacherRow | null) ?? null;
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

export async function upsertPlannedPackagePayoutEligibilityForBooking(args: {
  admin: SupabaseClient;
  order: OrderRow;
  booking: BookingRow;
  teacher: TeacherRow | null;
  cancellationOpen: boolean;
  refundQuoteStatus: string | null;
  refundExecuted: boolean;
  now?: Date;
}): Promise<{ id: string; status: PayoutEligibilityStatus }> {
  const evaluated = evaluatePlannedPackageSessionPayoutEligibility(args);
  const now = args.now ?? new Date();
  const nowIso = now.toISOString();
  const sessionIndex = Number(args.booking.planned_package_session_index ?? 0);
  const transferGroup = plannedPackageTransferGroup(args.order.id);

  const row = {
    planned_package_order_id: args.order.id,
    booking_id: args.booking.id,
    teacher_id: args.order.teacher_id,
    student_id: args.order.student_id,
    teacher_offer_id: args.order.teacher_offer_id,
    package_session_index: sessionIndex,
    total_session_count: Number(args.order.session_count),
    status: evaluated.status,
    gross_session_amount_cents: evaluated.grossSessionAmountCents,
    currency: evaluated.currency,
    platform_fee_cents: evaluated.platformFeeCents,
    teacher_net_cents: evaluated.teacherNetCents,
    eligibility_reason: evaluated.reason,
    blocker_code: evaluated.blockers[0] ?? null,
    blocker_details: { blockers: evaluated.blockers, reason: evaluated.reason },
    eligible_at: evaluated.status === "eligible" ? nowIso : null,
    blocked_at:
      evaluated.status === "blocked" || evaluated.status === "admin_review_required"
        ? nowIso
        : null,
    admin_review_required: evaluated.adminReviewRequired,
    stripe_transfer_id: null,
    stripe_transfer_group: transferGroup,
    updated_at: nowIso,
  };

  const { data: existing } = await args.admin
    .from("planned_package_payout_eligibility_entries")
    .select("id, status, eligible_at")
    .eq("booking_id", args.booking.id)
    .maybeSingle();

  if (existing) {
    const patch = {
      ...row,
      eligible_at:
        evaluated.status === "eligible"
          ? ((existing.eligible_at as string | null) ?? nowIso)
          : null,
    };
    const { data: updated, error } = await args.admin
      .from("planned_package_payout_eligibility_entries")
      .update(patch)
      .eq("id", existing.id)
      .select("id, status")
      .single();
    if (error || !updated) throw new Error(error?.message ?? "update_failed");
    return updated as { id: string; status: PayoutEligibilityStatus };
  }

  const { data: inserted, error } = await args.admin
    .from("planned_package_payout_eligibility_entries")
    .insert(row)
    .select("id, status")
    .single();
  if (error || !inserted) throw new Error(error?.message ?? "insert_failed");
  return inserted as { id: string; status: PayoutEligibilityStatus };
}

export async function syncPlannedPackagePayoutEligibilityForOrder(args: {
  admin: SupabaseClient;
  orderId: string;
  now?: Date;
}): Promise<
  | { ok: true; entries: Array<{ bookingId: string; status: PayoutEligibilityStatus }> }
  | { ok: false; error: string }
> {
  if (!canUsePlannedPackagePayoutEligibilityLedger()) {
    return { ok: false, error: "payout_eligibility_disabled" };
  }

  const order = await loadOrder(args.admin, args.orderId);
  if (!order) return { ok: false, error: "order_not_found" };
  if (!FULFILLED_ORDER_STATUSES.has(String(order.status ?? ""))) {
    return { ok: false, error: "order_not_fulfilled" };
  }

  const bookings = await loadBookings(args.admin, args.orderId);
  if (bookings.length === 0) {
    return { ok: false, error: "no_package_bookings" };
  }

  const teacher = await loadTeacher(args.admin, order.teacher_id);
  const refundCtx = await loadRefundContext(args.admin, args.orderId);

  const entries: Array<{ bookingId: string; status: PayoutEligibilityStatus }> = [];

  for (const booking of bookings) {
    if (!booking.planned_package_order_id) continue;
    const result = await upsertPlannedPackagePayoutEligibilityForBooking({
      admin: args.admin,
      order,
      booking,
      teacher,
      ...refundCtx,
      now: args.now,
    });
    entries.push({ bookingId: booking.id, status: result.status });
  }

  return { ok: true, entries };
}

export type PlannedPackagePayoutEligibilityEntryDto = {
  id: string;
  bookingId: string;
  bookingShortId: string;
  sessionIndex: number;
  bookingStatus: string;
  lessonDate: string | null;
  lessonTime: string | null;
  grossSessionAmountCents: number;
  currency: string;
  status: PayoutEligibilityStatus;
  blockers: string[];
  adminReviewRequired: boolean;
  eligibleAt: string | null;
  eligibilityReason: string | null;
  noStripeTransferCreated: true;
};

export async function listPlannedPackagePayoutEligibilityForOrder(
  admin: SupabaseClient,
  orderId: string,
): Promise<PlannedPackagePayoutEligibilityEntryDto[]> {
  const { data: rows, error } = await admin
    .from("planned_package_payout_eligibility_entries")
    .select(
      "id, booking_id, package_session_index, gross_session_amount_cents, currency, status, blocker_details, admin_review_required, eligible_at, eligibility_reason",
    )
    .eq("planned_package_order_id", orderId)
    .order("package_session_index", { ascending: true });

  if (error) throw new Error(error.message);

  const bookingIds = ((rows ?? []) as { booking_id: string }[]).map((r) => r.booking_id);
  const { data: bookings } =
    bookingIds.length > 0
      ? await admin
          .from("bookings")
          .select("id, status, lesson_date, time_slot")
          .in("id", bookingIds)
      : { data: [] };

  const bookingMap = new Map(
    ((bookings ?? []) as { id: string; status: string; lesson_date: string | null; time_slot: string | null }[]).map(
      (b) => [b.id, b],
    ),
  );

  return ((rows ?? []) as Record<string, unknown>[]).map((row) => {
    const bookingId = String(row.booking_id ?? "");
    const booking = bookingMap.get(bookingId);
    const details = (row.blocker_details ?? {}) as { blockers?: string[] };
    return {
      id: String(row.id ?? ""),
      bookingId,
      bookingShortId: bookingId.slice(0, 8),
      sessionIndex: Number(row.package_session_index ?? 0),
      bookingStatus: String(booking?.status ?? "unknown"),
      lessonDate: (booking?.lesson_date as string | null) ?? null,
      lessonTime: (booking?.time_slot as string | null) ?? null,
      grossSessionAmountCents: Number(row.gross_session_amount_cents ?? 0),
      currency: String(row.currency ?? "CAD"),
      status: String(row.status ?? "not_eligible") as PayoutEligibilityStatus,
      blockers: Array.isArray(details.blockers)
        ? details.blockers.filter((b): b is string => typeof b === "string")
        : [],
      adminReviewRequired: row.admin_review_required === true,
      eligibleAt: (row.eligible_at as string | null) ?? null,
      eligibilityReason: (row.eligibility_reason as string | null) ?? null,
      noStripeTransferCreated: true as const,
    };
  });
}
