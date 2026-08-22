/**
 * Admin planned package order operations — read-only DTOs + safe retry.
 *
 * Service-role only after requireAdminApi. Never exposes Stripe secrets,
 * payment method details, or raw webhook payloads.
 *
 * DO NOT import from client components.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { shortAdminId, type AdminPersonSummary } from "@/lib/admin/bookingPaymentOperations";
import {
  assessPlannedPackageRetryEligibility,
  canUsePlannedPackageAdminOps,
} from "@/lib/offers/plannedPackageAdminOps";
import {
  reconcilePlannedPackageOrder,
  type PlannedPackageAttentionReason,
} from "@/lib/offers/plannedPackageReconciliation";
import { packageOrderHasTeacherTransfer } from "@/lib/offers/plannedPackageManualRefund";
import {
  canUsePlannedPackagePayoutEligibilityLedger,
  isPlannedPackagePayoutEligibilityLedgerEnabled,
} from "@/lib/offers/plannedPackagePayoutEligibilityLedger";
import { canUsePlannedPackageManualTransfers } from "@/lib/offers/plannedPackageManualTransfers";
import {
  fulfillPlannedPackageOrder,
  canUsePlannedPackageFulfillmentEngine,
} from "@/lib/offers/plannedPackageFulfillment";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export const ADMIN_PLANNED_PACKAGE_OPS_UNAVAILABLE = "Non disponible";

export const ADMIN_PLANNED_PACKAGE_FORBIDDEN_KEYS = [
  "client_secret",
  "payment_method",
  "raw_payload",
  "webhook_payload",
] as const;

const ORDER_SELECT =
  "id, student_id, teacher_id, teacher_offer_id, draft_id, status, session_count, duration_minutes, price_cents_snapshot, currency_snapshot, title_snapshot, hold_expires_at, payment_reference, payment_confirmed_at, fulfilled_at, fulfillment_error, stripe_checkout_session_id, stripe_payment_intent_id, stripe_checkout_status, checkout_expires_at, paid_at, stripe_checkout_completed_at, stripe_checkout_expired_at, last_webhook_event_id, last_webhook_event_type, last_webhook_received_at, fulfillment_attempt_count, last_fulfillment_attempt_at, refund_status, refunded_cents, refunded_at, last_refund_execution_id, created_at, updated_at";

type ReconciliationRefundOverlay = {
  latestQuoteStatus?: string | null;
  latestExecutionStatus?: string | null;
  packageTransferDetected?: boolean;
};

type ReconciliationPayoutEligibilityOverlay = {
  ledgerEnabled: boolean;
  manualTransfersEnabled: boolean;
  entries: Array<{
    id: string;
    bookingId: string;
    status: string;
    blockers: string[];
    adminReviewRequired: boolean;
    teacherNetCents: number | null;
    transferStatus: string | null;
    stripeTransferId: string | null;
    transferredCents: number;
  }>;
};

type ReconciliationTransferOverlay = {
  manualTransfersEnabled: boolean;
  entries: Array<{
    entryId: string;
    status: string;
    amountCents: number;
    teacherNetCents: number | null;
  }>;
  latestExecutionStatus: string | null;
  cancellationOpen: boolean;
  refundExecuted: boolean;
};

export type AdminPlannedPackageOrderListRow = {
  id: string;
  shortId: string;
  createdAt: string | null;
  updatedAt: string | null;
  student: AdminPersonSummary | null;
  teacher: AdminPersonSummary | null;
  teacherRowId: string | null;
  offerTitleSnapshot: string;
  totalPriceCents: number;
  currency: string;
  sessionCount: number;
  orderStatus: string;
  stripeCheckoutStatus: string | null;
  fulfillmentStatus: string;
  holdExpiresAt: string | null;
  paymentConfirmedAt: string | null;
  fulfilledAt: string | null;
  needsAttention: boolean;
  attentionReasons: PlannedPackageAttentionReason[];
};

export type AdminPlannedPackageHoldRow = {
  id: string;
  sessionIndex: number;
  startsAt: string;
  endsAt: string;
  status: string;
  expiresAt: string;
};

export type AdminPlannedPackageBookingRow = {
  id: string;
  shortId: string;
  sessionIndex: number | null;
  status: string;
  lessonDate: string | null;
  lessonTime: string | null;
};

export type AdminPlannedPackageOrderDetail = AdminPlannedPackageOrderListRow & {
  durationMinutes: number;
  draftId: string;
  teacherOfferId: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeAmountReceivedCents: number | null;
  stripeCurrency: string | null;
  checkoutExpiresAt: string | null;
  paidAt: string | null;
  stripeCheckoutCompletedAt: string | null;
  stripeCheckoutExpiredAt: string | null;
  lastWebhookEventId: string | null;
  lastWebhookEventType: string | null;
  lastWebhookReceivedAt: string | null;
  fulfillmentError: string | null;
  fulfillmentAttemptCount: number;
  lastFulfillmentAttemptAt: string | null;
  holds: AdminPlannedPackageHoldRow[];
  bookings: AdminPlannedPackageBookingRow[];
  retryEligible: boolean;
  retryBlockers: string[];
  noTeacherTransferMade: true;
  noRefundMade: true;
};

export type AdminPlannedPackageOrdersSummary = {
  total: number;
  needsAttention: number;
  pendingPayment: number;
  paidAwaitingFulfillment: number;
  fulfilled: number;
  expiredCancelled: number;
};

export type AdminPlannedPackageOrderFilter =
  | "needs_attention"
  | "pending_payment"
  | "paid_not_fulfilled"
  | "fulfillment_failed"
  | "fulfilled"
  | "expired_cancelled";

type ProfileLite = { id: string; name: string | null; email: string | null };
type TeacherLite = { id: string; user_id: string | null };

async function loadProfiles(admin: AdminClient, ids: string[]): Promise<Map<string, ProfileLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, ProfileLite>();
  if (unique.length === 0) return map;
  const { data, error } = await admin.from("profiles").select("id, name, email").in("id", unique);
  if (error) {
    console.error("[admin/planned-package-orders] profiles load failed", error.message);
    return map;
  }
  for (const row of (data ?? []) as ProfileLite[]) map.set(row.id, row);
  return map;
}

async function loadTeachers(admin: AdminClient, ids: string[]): Promise<Map<string, TeacherLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, TeacherLite>();
  if (unique.length === 0) return map;
  const { data, error } = await admin.from("teachers").select("id, user_id").in("id", unique);
  if (error) {
    console.error("[admin/planned-package-orders] teachers load failed", error.message);
    return map;
  }
  for (const row of (data ?? []) as TeacherLite[]) map.set(row.id, row);
  return map;
}

function personFrom(profile: ProfileLite | undefined, id: string | null): AdminPersonSummary | null {
  if (!id) return null;
  if (!profile) return { id, name: null, email: null };
  return { id: profile.id, name: profile.name, email: profile.email };
}

function deriveFulfillmentStatus(status: string): string {
  if (status === "fulfilled") return "fulfilled";
  if (status === "fulfillment_failed") return "fulfillment_failed";
  if (status === "fulfilling") return "fulfilling";
  if (status === "payment_confirmed" || status === "paid") return "awaiting_fulfillment";
  return "not_started";
}

function mapOrderRow(
  row: Record<string, unknown>,
  student: AdminPersonSummary | null,
  teacher: AdminPersonSummary | null,
  teacherRowId: string | null,
  reconciliation: ReturnType<typeof reconcilePlannedPackageOrder>,
): AdminPlannedPackageOrderListRow {
  const id = String(row.id ?? "");
  return {
    id,
    shortId: shortAdminId(id),
    createdAt: (row.created_at as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
    student,
    teacher,
    teacherRowId,
    offerTitleSnapshot: String(row.title_snapshot ?? ""),
    totalPriceCents: Number(row.price_cents_snapshot ?? 0),
    currency: String(row.currency_snapshot ?? "CAD"),
    sessionCount: Number(row.session_count ?? 0),
    orderStatus: String(row.status ?? ""),
    stripeCheckoutStatus: (row.stripe_checkout_status as string | null) ?? null,
    fulfillmentStatus: deriveFulfillmentStatus(String(row.status ?? "")),
    holdExpiresAt: (row.hold_expires_at as string | null) ?? null,
    paymentConfirmedAt: (row.payment_confirmed_at as string | null) ?? null,
    fulfilledAt: (row.fulfilled_at as string | null) ?? null,
    needsAttention: reconciliation.needsAttention,
    attentionReasons: reconciliation.attentionReasons,
  };
}

async function loadBookingsForOrder(
  admin: AdminClient,
  orderId: string,
): Promise<AdminPlannedPackageBookingRow[]> {
  const { data, error } = await admin
    .from("bookings")
    .select("id, status, lesson_date, time_slot, planned_package_session_index")
    .eq("planned_package_order_id", orderId)
    .order("planned_package_session_index", { ascending: true });

  if (error) {
    console.error("[admin/planned-package-orders] bookings load failed", error.message);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((b) => ({
    id: String(b.id ?? ""),
    shortId: shortAdminId(String(b.id ?? "")),
    sessionIndex:
      b.planned_package_session_index === null || b.planned_package_session_index === undefined
        ? null
        : Number(b.planned_package_session_index),
    status: String(b.status ?? ""),
    lessonDate: (b.lesson_date as string | null) ?? null,
    lessonTime: (b.time_slot as string | null) ?? null,
  }));
}

async function loadHoldsForOrder(
  admin: AdminClient,
  orderId: string,
): Promise<AdminPlannedPackageHoldRow[]> {
  const { data, error } = await admin
    .from("planned_package_session_holds")
    .select("id, session_index, starts_at, ends_at, status, expires_at")
    .eq("pending_order_id", orderId)
    .order("session_index", { ascending: true });

  if (error) {
    console.error("[admin/planned-package-orders] holds load failed", error.message);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((h) => ({
    id: String(h.id ?? ""),
    sessionIndex: Number(h.session_index ?? 0),
    startsAt: String(h.starts_at ?? ""),
    endsAt: String(h.ends_at ?? ""),
    status: String(h.status ?? ""),
    expiresAt: String(h.expires_at ?? ""),
  }));
}

function buildReconciliation(
  row: Record<string, unknown>,
  holds: AdminPlannedPackageHoldRow[],
  bookings: AdminPlannedPackageBookingRow[],
  refundOverlay: ReconciliationRefundOverlay = {},
  payoutOverlay: ReconciliationPayoutEligibilityOverlay = {
    ledgerEnabled: false,
    manualTransfersEnabled: false,
    entries: [],
  },
  transferOverlay: ReconciliationTransferOverlay = {
    manualTransfersEnabled: false,
    entries: [],
    latestExecutionStatus: null,
    cancellationOpen: false,
    refundExecuted: false,
  },
): ReturnType<typeof reconcilePlannedPackageOrder> {
  const paidAt = (row.paid_at as string | null) ?? null;
  const stripeCheckoutStatus = (row.stripe_checkout_status as string | null) ?? null;
  const stripeAmountReceivedCents =
    stripeCheckoutStatus === "complete" ? Number(row.price_cents_snapshot ?? 0) : null;

  return reconcilePlannedPackageOrder({
    orderId: String(row.id ?? ""),
    status: String(row.status ?? ""),
    sessionCount: Number(row.session_count ?? 0),
    priceCentsSnapshot: Number(row.price_cents_snapshot ?? 0),
    currencySnapshot: String(row.currency_snapshot ?? "CAD"),
    holdExpiresAt: (row.hold_expires_at as string | null) ?? null,
    paymentConfirmedAt: (row.payment_confirmed_at as string | null) ?? null,
    paidAt,
    fulfilledAt: (row.fulfilled_at as string | null) ?? null,
    fulfillmentError: (row.fulfillment_error as string | null) ?? null,
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
    stripeCheckoutStatus,
    stripeAmountReceivedCents,
    stripeCurrency: String(row.currency_snapshot ?? "CAD"),
    lastWebhookReceivedAt: (row.last_webhook_received_at as string | null) ?? null,
    refundStatus: (row.refund_status as string | null) ?? null,
    refundedCents: Number(row.refunded_cents ?? 0),
    latestQuoteStatus: refundOverlay.latestQuoteStatus ?? null,
    latestExecutionStatus: refundOverlay.latestExecutionStatus ?? null,
    packageTransferDetected: refundOverlay.packageTransferDetected ?? false,
    holds: holds.map((h) => ({ status: h.status, sessionIndex: h.sessionIndex })),
    bookings: bookings.map((b) => ({
      id: b.id,
      sessionIndex: b.sessionIndex,
      status: b.status,
    })),
    payoutEligibility: payoutOverlay.ledgerEnabled
      ? {
          ledgerEnabled: true,
          manualTransfersEnabled: payoutOverlay.manualTransfersEnabled,
          entries: payoutOverlay.entries.map((e) => ({
            id: e.id,
            bookingId: e.bookingId,
            status: e.status,
            blockers: e.blockers,
            adminReviewRequired: e.adminReviewRequired,
            teacherNetCents: e.teacherNetCents,
            transferStatus: e.transferStatus,
            stripeTransferId: e.stripeTransferId,
            transferredCents: e.transferredCents,
          })),
        }
      : undefined,
    transferExecutions: transferOverlay.manualTransfersEnabled
      ? {
          manualTransfersEnabled: true,
          entries: transferOverlay.entries,
          latestExecutionStatus: transferOverlay.latestExecutionStatus,
          cancellationOpen: transferOverlay.cancellationOpen,
          refundExecuted: transferOverlay.refundExecuted,
        }
      : undefined,
  });
}

async function loadRefundReconciliationOverlay(
  admin: AdminClient,
  orderId: string,
): Promise<ReconciliationRefundOverlay> {
  const [quoteRes, execRes, transferDetected] = await Promise.all([
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    packageOrderHasTeacherTransfer(admin, orderId).catch(() => false),
  ]);

  return {
    latestQuoteStatus: (quoteRes.data?.quote_status as string | null) ?? null,
    latestExecutionStatus: (execRes.data?.status as string | null) ?? null,
    packageTransferDetected: transferDetected,
  };
}

async function loadPayoutEligibilityReconciliationOverlay(
  admin: AdminClient,
  orderId: string,
): Promise<ReconciliationPayoutEligibilityOverlay> {
  const manualTransfersEnabled = canUsePlannedPackageManualTransfers();
  if (!canUsePlannedPackagePayoutEligibilityLedger()) {
    return { ledgerEnabled: false, manualTransfersEnabled, entries: [] };
  }

  const { data, error } = await admin
    .from("planned_package_payout_eligibility_entries")
    .select(
      "id, booking_id, status, blocker_details, admin_review_required, teacher_net_cents, transfer_status, stripe_transfer_id, transferred_cents",
    )
    .eq("planned_package_order_id", orderId);

  if (error) {
    console.error("[admin/planned-package-orders] payout eligibility load failed", error.message);
    return {
      ledgerEnabled: isPlannedPackagePayoutEligibilityLedgerEnabled(),
      manualTransfersEnabled,
      entries: [],
    };
  }

  const entries = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const details = (row.blocker_details ?? {}) as { blockers?: string[] };
    return {
      id: String(row.id ?? ""),
      bookingId: String(row.booking_id ?? ""),
      status: String(row.status ?? "not_eligible"),
      blockers: Array.isArray(details.blockers)
        ? details.blockers.filter((b): b is string => typeof b === "string")
        : [],
      adminReviewRequired: row.admin_review_required === true,
      teacherNetCents:
        row.teacher_net_cents === null || row.teacher_net_cents === undefined
          ? null
          : Number(row.teacher_net_cents),
      transferStatus: (row.transfer_status as string | null) ?? null,
      stripeTransferId: (row.stripe_transfer_id as string | null) ?? null,
      transferredCents: Number(row.transferred_cents ?? 0),
    };
  });

  return { ledgerEnabled: true, manualTransfersEnabled, entries };
}

async function loadTransferReconciliationOverlay(
  admin: AdminClient,
  orderId: string,
): Promise<ReconciliationTransferOverlay> {
  const manualTransfersEnabled = canUsePlannedPackageManualTransfers();
  if (!manualTransfersEnabled) {
    return {
      manualTransfersEnabled: false,
      entries: [],
      latestExecutionStatus: null,
      cancellationOpen: false,
      refundExecuted: false,
    };
  }

  const [{ data: transfers }, { data: cancel }, { data: refundExec }, { data: eligibility }] =
    await Promise.all([
      admin
        .from("planned_package_transfer_executions")
        .select("payout_eligibility_entry_id, status, amount_cents")
        .eq("planned_package_order_id", orderId)
        .order("created_at", { ascending: false }),
      admin
        .from("planned_package_cancellation_requests")
        .select("status")
        .eq("planned_package_order_id", orderId)
        .in("status", ["requested", "quote_generated", "admin_review_required", "approved_for_manual_refund"])
        .limit(1)
        .maybeSingle(),
      admin
        .from("planned_package_refund_executions")
        .select("status")
        .eq("planned_package_order_id", orderId)
        .eq("status", "succeeded")
        .limit(1)
        .maybeSingle(),
      admin
        .from("planned_package_payout_eligibility_entries")
        .select("id, teacher_net_cents")
        .eq("planned_package_order_id", orderId),
    ]);

  const teacherNetByEntry = new Map(
    ((eligibility ?? []) as { id: string; teacher_net_cents: number | null }[]).map((e) => [
      e.id,
      e.teacher_net_cents,
    ]),
  );

  const entries = ((transfers ?? []) as Record<string, unknown>[]).map((row) => {
    const entryId = String(row.payout_eligibility_entry_id ?? "");
    return {
      entryId,
      status: String(row.status ?? ""),
      amountCents: Number(row.amount_cents ?? 0),
      teacherNetCents: teacherNetByEntry.get(entryId) ?? null,
    };
  });

  const latestExecutionStatus =
    entries.length > 0 ? entries[0]!.status : null;

  return {
    manualTransfersEnabled: true,
    entries,
    latestExecutionStatus,
    cancellationOpen: Boolean(cancel),
    refundExecuted: Boolean(refundExec),
  };
}

function matchesFilter(row: AdminPlannedPackageOrderListRow, filter: AdminPlannedPackageOrderFilter): boolean {
  switch (filter) {
    case "needs_attention":
      return row.needsAttention;
    case "pending_payment":
      return row.orderStatus === "pending_payment";
    case "paid_not_fulfilled":
      return (
        row.attentionReasons.includes("paid_not_fulfilled") ||
        (row.orderStatus === "payment_confirmed" && row.fulfillmentStatus === "awaiting_fulfillment")
      );
    case "fulfillment_failed":
      return row.orderStatus === "fulfillment_failed" || row.attentionReasons.includes("fulfillment_failed");
    case "fulfilled":
      return row.orderStatus === "fulfilled";
    case "expired_cancelled":
      return row.orderStatus === "expired" || row.orderStatus === "cancelled";
    default:
      return true;
  }
}

export async function listAdminPlannedPackageOrders(
  admin: AdminClient,
  args: {
    filter?: AdminPlannedPackageOrderFilter | null;
    q?: string | null;
    limit?: number;
  },
): Promise<{ orders: AdminPlannedPackageOrderListRow[]; summary: AdminPlannedPackageOrdersSummary }> {
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
  const { data, error } = await admin
    .from("planned_package_pending_orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const studentIds = rows.map((r) => String(r.student_id ?? ""));
  const teacherIds = rows.map((r) => String(r.teacher_id ?? ""));

  const [profiles, teachers] = await Promise.all([
    loadProfiles(admin, studentIds),
    loadTeachers(admin, teacherIds),
  ]);

  const teacherUserIds = Array.from(teachers.values())
    .map((t) => t.user_id)
    .filter((id): id is string => Boolean(id));
  const teacherProfiles = await loadProfiles(admin, teacherUserIds);

  const orders: AdminPlannedPackageOrderListRow[] = [];

  for (const row of rows) {
    const studentId = String(row.student_id ?? "");
    const teacherId = String(row.teacher_id ?? "");
    const teacher = teachers.get(teacherId);
    const teacherPerson = teacher?.user_id
      ? personFrom(teacherProfiles.get(teacher.user_id), teacher.user_id)
      : personFrom(undefined, teacherId);

    const holds = await loadHoldsForOrder(admin, String(row.id ?? ""));
    const bookings = await loadBookingsForOrder(admin, String(row.id ?? ""));
    const reconciliation = buildReconciliation(row, holds, bookings);

    orders.push(
      mapOrderRow(
        row,
        personFrom(profiles.get(studentId), studentId),
        teacherPerson,
        teacherId,
        reconciliation,
      ),
    );
  }

  const filter = args.filter ?? null;
  const q = (args.q ?? "").trim().toLowerCase();
  let filtered = orders;
  if (filter) filtered = filtered.filter((o) => matchesFilter(o, filter));
  if (q) {
    filtered = filtered.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.shortId.toLowerCase().includes(q) ||
        o.offerTitleSnapshot.toLowerCase().includes(q) ||
        (o.student?.email?.toLowerCase().includes(q) ?? false) ||
        (o.student?.name?.toLowerCase().includes(q) ?? false),
    );
  }

  const summary: AdminPlannedPackageOrdersSummary = {
    total: orders.length,
    needsAttention: orders.filter((o) => o.needsAttention).length,
    pendingPayment: orders.filter((o) => o.orderStatus === "pending_payment").length,
    paidAwaitingFulfillment: orders.filter(
      (o) => o.orderStatus === "payment_confirmed" || o.orderStatus === "fulfillment_failed",
    ).length,
    fulfilled: orders.filter((o) => o.orderStatus === "fulfilled").length,
    expiredCancelled: orders.filter(
      (o) => o.orderStatus === "expired" || o.orderStatus === "cancelled",
    ).length,
  };

  return { orders: filtered, summary };
}

export async function getAdminPlannedPackageOrderDetail(
  admin: AdminClient,
  orderId: string,
): Promise<AdminPlannedPackageOrderDetail | null> {
  const { data, error } = await admin
    .from("planned_package_pending_orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const studentId = String(row.student_id ?? "");
  const teacherId = String(row.teacher_id ?? "");

  const [profiles, teachers, holds, bookings, refundOverlay, payoutOverlay, transferOverlay] =
    await Promise.all([
    loadProfiles(admin, [studentId]),
    loadTeachers(admin, [teacherId]),
    loadHoldsForOrder(admin, orderId),
    loadBookingsForOrder(admin, orderId),
    loadRefundReconciliationOverlay(admin, orderId),
    loadPayoutEligibilityReconciliationOverlay(admin, orderId),
    loadTransferReconciliationOverlay(admin, orderId),
  ]);

  const teacher = teachers.get(teacherId);
  let teacherPerson: AdminPersonSummary | null = personFrom(undefined, teacherId);
  if (teacher?.user_id) {
    const tp = await loadProfiles(admin, [teacher.user_id]);
    teacherPerson = personFrom(tp.get(teacher.user_id), teacher.user_id);
  }

  const reconciliation = buildReconciliation(
    row,
    holds,
    bookings,
    refundOverlay,
    payoutOverlay,
    transferOverlay,
  );
  const base = mapOrderRow(
    row,
    personFrom(profiles.get(studentId), studentId),
    teacherPerson,
    teacherId,
    reconciliation,
  );

  const retry = assessPlannedPackageRetryEligibility({
    status: base.orderStatus,
    paymentReference: (row.payment_reference as string | null) ?? null,
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
  });

  const stripeCheckoutStatus = (row.stripe_checkout_status as string | null) ?? null;

  return {
    ...base,
    durationMinutes: Number(row.duration_minutes ?? 0),
    draftId: String(row.draft_id ?? ""),
    teacherOfferId: String(row.teacher_offer_id ?? ""),
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
    stripeAmountReceivedCents:
      stripeCheckoutStatus === "complete" ? Number(row.price_cents_snapshot ?? 0) : null,
    stripeCurrency: String(row.currency_snapshot ?? "CAD"),
    checkoutExpiresAt: (row.checkout_expires_at as string | null) ?? null,
    paidAt: (row.paid_at as string | null) ?? null,
    stripeCheckoutCompletedAt: (row.stripe_checkout_completed_at as string | null) ?? null,
    stripeCheckoutExpiredAt: (row.stripe_checkout_expired_at as string | null) ?? null,
    lastWebhookEventId: (row.last_webhook_event_id as string | null) ?? null,
    lastWebhookEventType: (row.last_webhook_event_type as string | null) ?? null,
    lastWebhookReceivedAt: (row.last_webhook_received_at as string | null) ?? null,
    fulfillmentError: (row.fulfillment_error as string | null) ?? null,
    fulfillmentAttemptCount: Number(row.fulfillment_attempt_count ?? 0),
    lastFulfillmentAttemptAt: (row.last_fulfillment_attempt_at as string | null) ?? null,
    holds,
    bookings,
    retryEligible: retry.eligible,
    retryBlockers: retry.blockers,
    noTeacherTransferMade: true,
    noRefundMade: true,
  };
}

export async function adminRetryPlannedPackageFulfillment(args: {
  admin: AdminClient;
  orderId: string;
  adminUserId: string;
}): Promise<
  | { ok: true; fulfillment: Awaited<ReturnType<typeof fulfillPlannedPackageOrder>> }
  | { ok: false; status: number; error: string; blockers?: string[] }
> {
  if (!canUsePlannedPackageAdminOps()) {
    return { ok: false, status: 403, error: "admin_ops_disabled" };
  }
  if (!canUsePlannedPackageFulfillmentEngine()) {
    return { ok: false, status: 403, error: "fulfillment_engine_disabled" };
  }

  const detail = await getAdminPlannedPackageOrderDetail(args.admin, args.orderId);
  if (!detail) {
    return { ok: false, status: 404, error: "order_not_found" };
  }

  if (!detail.retryEligible) {
    return {
      ok: false,
      status: 409,
      error: "retry_not_eligible",
      blockers: detail.retryBlockers,
    };
  }

  const paymentReference =
    detail.stripePaymentIntentId ||
    detail.stripeCheckoutSessionId ||
    `admin-retry:${args.orderId}`;

  const nowIso = new Date().toISOString();
  await args.admin
    .from("planned_package_pending_orders")
    .update({
      fulfillment_attempt_count: detail.fulfillmentAttemptCount + 1,
      last_fulfillment_attempt_at: nowIso,
    })
    .eq("id", args.orderId);

  const idempotencyKey = `admin-retry-${args.orderId}-${detail.fulfillmentAttemptCount + 1}`.slice(
    0,
    128,
  );

  const fulfillment = await fulfillPlannedPackageOrder({
    orderId: args.orderId,
    paymentReference,
    idempotencyKey,
    actor: { kind: "admin", userId: args.adminUserId },
  });

  if (!fulfillment.ok) {
    await args.admin
      .from("planned_package_pending_orders")
      .update({
        fulfillment_error: fulfillment.errors[0]?.slice(0, 500) ?? "fulfillment_failed",
      })
      .eq("id", args.orderId);
    return {
      ok: false,
      status: 409,
      error: fulfillment.errors[0] ?? "fulfillment_failed",
    };
  }

  return { ok: true, fulfillment };
}
