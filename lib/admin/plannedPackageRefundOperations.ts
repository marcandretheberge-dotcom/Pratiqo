/**
 * Admin planned package cancellation + refund quote operations.
 * Quote/audit only — never executes Stripe refunds or transfers.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calculatePlannedPackageRefundQuote } from "@/lib/offers/plannedPackageRefundQuote";
import {
  canUsePlannedPackageRefundAdminReview,
  canUsePlannedPackageRefundQuotes,
  PLANNED_PACKAGE_REFUND_POLICY_VERSION,
} from "@/lib/offers/plannedPackageRefundQuotes";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
import type { PlannedPackageSessionDeliveryRow } from "@/lib/offers/plannedPackageSessionDelivery";
import { PACKAGE_LEGAL_REVIEW_COMPLETED_FLAG } from "@/lib/offers/packageLaunchReadiness";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type AdminCancellationRequestDto = {
  id: string;
  orderId: string;
  status: string;
  requestedBy: string;
  reasonCode: string | null;
  reasonNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type AdminRefundQuoteDto = {
  id: string;
  cancellationRequestId: string;
  orderId: string;
  policyVersion: string;
  quoteStatus: string;
  packageTotalCents: number;
  currency: string;
  completedSessionCount: number;
  undeliveredSessionCount: number;
  totalSessionCount: number;
  completedValueCents: number;
  undeliveredValueCents: number;
  penaltyCents: number;
  estimatedRefundCents: number;
  adminAdjustmentCents: number;
  adminAdjustmentReason: string | null;
  legalReviewRequired: boolean;
  manualReviewRequired: boolean;
  blockers: string[];
  warnings: string[];
  createdAt: string;
  noStripeRefundExecuted: true;
};

export type AdminPlannedPackageRefundContext = {
  enabled: boolean;
  cancellationRequest: AdminCancellationRequestDto | null;
  latestQuote: AdminRefundQuoteDto | null;
  noStripeRefundExecuted: true;
  noAutomaticRefund: true;
};

const ORDER_QUOTE_SELECT =
  "id, student_id, teacher_id, status, session_count, price_cents_snapshot, currency_snapshot, payment_confirmed_at, paid_at, stripe_payment_intent_id";

const ACTIVE_QUOTE_STATUSES = new Set(["draft", "admin_review_required", "approved_for_manual_refund"]);
const ACTIVE_REQUEST_STATUSES = new Set([
  "requested",
  "quote_generated",
  "admin_review_required",
  "approved_for_manual_refund",
]);

function isLegalReviewCompleted(): boolean {
  return process.env[PACKAGE_LEGAL_REVIEW_COMPLETED_FLAG] === "true";
}

function mapCancellationRow(row: Record<string, unknown>): AdminCancellationRequestDto {
  return {
    id: String(row.id ?? ""),
    orderId: String(row.planned_package_order_id ?? ""),
    status: String(row.status ?? ""),
    requestedBy: String(row.requested_by ?? ""),
    reasonCode: (row.reason_code as string | null) ?? null,
    reasonNote: (row.reason_note as string | null) ?? null,
    requestedAt: String(row.requested_at ?? row.created_at ?? ""),
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    reviewedBy: (row.reviewed_by as string | null) ?? null,
  };
}

function mapQuoteRow(
  row: Record<string, unknown>,
  snapshot?: Record<string, unknown>,
): AdminRefundQuoteDto {
  const calc = (snapshot ??
    (typeof row.calculation_snapshot === "object" && row.calculation_snapshot
      ? (row.calculation_snapshot as Record<string, unknown>)
      : {})) as Record<string, unknown>;

  return {
    id: String(row.id ?? ""),
    cancellationRequestId: String(row.cancellation_request_id ?? ""),
    orderId: String(row.planned_package_order_id ?? ""),
    policyVersion: String(row.policy_version ?? PLANNED_PACKAGE_REFUND_POLICY_VERSION),
    quoteStatus: String(row.quote_status ?? ""),
    packageTotalCents: Number(row.package_total_cents ?? 0),
    currency: String(row.currency ?? "CAD"),
    completedSessionCount: Number(row.completed_session_count ?? 0),
    undeliveredSessionCount: Number(row.undelivered_session_count ?? 0),
    totalSessionCount: Number(row.total_session_count ?? 0),
    completedValueCents: Number(row.completed_value_cents ?? 0),
    undeliveredValueCents: Number(row.undelivered_value_cents ?? 0),
    penaltyCents: Number(row.penalty_cents ?? 0),
    estimatedRefundCents: Number(row.estimated_refund_cents ?? 0),
    adminAdjustmentCents: Number(row.admin_adjustment_cents ?? 0),
    adminAdjustmentReason: (row.admin_adjustment_reason as string | null) ?? null,
    legalReviewRequired: row.legal_review_required === true,
    manualReviewRequired: row.manual_review_required === true,
    blockers: Array.isArray(calc.blockers)
      ? (calc.blockers as unknown[]).filter((b): b is string => typeof b === "string")
      : [],
    warnings: Array.isArray(calc.warnings)
      ? (calc.warnings as unknown[]).filter((w): w is string => typeof w === "string")
      : [],
    createdAt: String(row.created_at ?? ""),
    noStripeRefundExecuted: true,
  };
}

async function loadOrderForQuote(admin: AdminClient, orderId: string) {
  const { data, error } = await admin
    .from("planned_package_pending_orders")
    .select(ORDER_QUOTE_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
}

async function loadBookingsForQuote(
  admin: AdminClient,
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

export async function getAdminPlannedPackageRefundContext(
  admin: AdminClient,
  orderId: string,
): Promise<AdminPlannedPackageRefundContext> {
  const enabled = canUsePlannedPackageRefundQuotes();

  if (!enabled) {
    return {
      enabled: false,
      cancellationRequest: null,
      latestQuote: null,
      noStripeRefundExecuted: true,
      noAutomaticRefund: true,
    };
  }

  const { data: reqRows } = await admin
    .from("planned_package_cancellation_requests")
    .select("*")
    .eq("planned_package_order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1);

  const req = (reqRows?.[0] ?? null) as Record<string, unknown> | null;

  let latestQuote: AdminRefundQuoteDto | null = null;
  if (req) {
    const { data: quoteRows } = await admin
      .from("planned_package_refund_quotes")
      .select("*")
      .eq("planned_package_order_id", orderId)
      .neq("quote_status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1);
    if (quoteRows?.[0]) {
      latestQuote = mapQuoteRow(quoteRows[0] as Record<string, unknown>);
    }
  }

  return {
    enabled: true,
    cancellationRequest: req ? mapCancellationRow(req) : null,
    latestQuote,
    noStripeRefundExecuted: true,
    noAutomaticRefund: true,
  };
}

export async function adminCreatePlannedPackageCancellationRequest(args: {
  admin: AdminClient;
  orderId: string;
  adminUserId: string;
  reasonCode?: string | null;
  reasonNote?: string | null;
}): Promise<
  | { ok: true; request: AdminCancellationRequestDto }
  | { ok: false; status: number; error: string }
> {
  if (!canUsePlannedPackageAdminOps()) {
    return { ok: false, status: 403, error: "admin_ops_disabled" };
  }
  if (!canUsePlannedPackageRefundQuotes()) {
    return { ok: false, status: 403, error: "refund_quotes_disabled" };
  }

  const order = await loadOrderForQuote(args.admin, args.orderId);
  if (!order) return { ok: false, status: 404, error: "order_not_found" };

  const status = String(order.status ?? "");
  if (!["fulfilled", "payment_confirmed", "fulfilling"].includes(status)) {
    return { ok: false, status: 409, error: "order_not_quote_eligible" };
  }

  const hasPayment =
    Boolean(order.payment_confirmed_at) ||
    Boolean(order.paid_at) ||
    Boolean(order.stripe_payment_intent_id);
  if (!hasPayment) {
    return { ok: false, status: 409, error: "order_unpaid" };
  }

  const { data: existing } = await args.admin
    .from("planned_package_cancellation_requests")
    .select("*")
    .eq("planned_package_order_id", args.orderId)
    .in("status", Array.from(ACTIVE_REQUEST_STATUSES))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { ok: true, request: mapCancellationRow(existing as Record<string, unknown>) };
  }

  const { data: inserted, error } = await args.admin
    .from("planned_package_cancellation_requests")
    .insert({
      planned_package_order_id: args.orderId,
      student_id: order.student_id,
      teacher_id: order.teacher_id,
      status: "requested",
      requested_by: "admin",
      reason_code: args.reasonCode?.trim() || null,
      reason_note: args.reasonNote?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return { ok: false, status: 500, error: "create_failed" };
  }

  return { ok: true, request: mapCancellationRow(inserted as Record<string, unknown>) };
}

export async function adminGeneratePlannedPackageRefundQuote(args: {
  admin: AdminClient;
  orderId: string;
  adminUserId: string;
  supersedeExisting?: boolean;
  adminAdjustmentCents?: number;
  adminAdjustmentReason?: string | null;
}): Promise<
  | { ok: true; quote: AdminRefundQuoteDto; request: AdminCancellationRequestDto }
  | { ok: false; status: number; error: string; blockers?: string[] }
> {
  if (!canUsePlannedPackageRefundQuotes()) {
    return { ok: false, status: 403, error: "refund_quotes_disabled" };
  }

  const order = await loadOrderForQuote(args.admin, args.orderId);
  if (!order) return { ok: false, status: 404, error: "order_not_found" };

  const { data: activeQuote } = await args.admin
    .from("planned_package_refund_quotes")
    .select("*")
    .eq("planned_package_order_id", args.orderId)
    .eq("quote_status", "approved_for_manual_refund")
    .maybeSingle();

  if (activeQuote && !args.supersedeExisting) {
    return { ok: false, status: 409, error: "approved_quote_exists" };
  }

  if (activeQuote && args.supersedeExisting) {
    await args.admin
      .from("planned_package_refund_quotes")
      .update({ quote_status: "superseded" })
      .eq("id", activeQuote.id);
  }

  const createReq = await adminCreatePlannedPackageCancellationRequest({
    admin: args.admin,
    orderId: args.orderId,
    adminUserId: args.adminUserId,
  });
  if (!createReq.ok) {
    return { ok: false, status: createReq.status, error: createReq.error };
  }

  const bookings = await loadBookingsForQuote(args.admin, args.orderId);
  const calculated = calculatePlannedPackageRefundQuote({
    orderId: args.orderId,
    orderStatus: String(order.status ?? ""),
    packageTotalCents: Number(order.price_cents_snapshot ?? 0),
    currency: String(order.currency_snapshot ?? "CAD"),
    sessionCount: Number(order.session_count ?? 0),
    bookings,
    legalReviewCompleted: isLegalReviewCompleted(),
    adminAdjustmentCents: args.adminAdjustmentCents,
    adminAdjustmentReason: args.adminAdjustmentReason,
  });

  if (calculated.blockers.length > 0 && !args.supersedeExisting) {
    return {
      ok: false,
      status: 409,
      error: "quote_blocked",
      blockers: calculated.blockers,
    };
  }

  const quoteStatus = calculated.manualReviewRequired ? "admin_review_required" : "draft";
  const requestStatus = calculated.manualReviewRequired ? "admin_review_required" : "quote_generated";

  const { data: quoteRow, error: quoteErr } = await args.admin
    .from("planned_package_refund_quotes")
    .insert({
      cancellation_request_id: createReq.request.id,
      planned_package_order_id: args.orderId,
      policy_version: calculated.policyVersion,
      quote_status: quoteStatus,
      package_total_cents: calculated.packageTotalCents,
      currency: calculated.currency,
      completed_session_count: calculated.completedSessionCount,
      undelivered_session_count: calculated.undeliveredSessionCount,
      total_session_count: calculated.totalSessionCount,
      completed_value_cents: calculated.completedValueCents,
      undelivered_value_cents: calculated.undeliveredValueCents,
      penalty_cents: calculated.penaltyCents,
      estimated_refund_cents: calculated.estimatedRefundCents,
      admin_adjustment_cents: calculated.adminAdjustmentCents,
      admin_adjustment_reason: calculated.adminAdjustmentReason,
      legal_review_required: calculated.legalReviewRequired,
      manual_review_required: calculated.manualReviewRequired,
      calculation_snapshot: {
        ...calculated.calculationSnapshot,
        blockers: calculated.blockers,
        warnings: calculated.warnings,
      },
    })
    .select("*")
    .single();

  if (quoteErr || !quoteRow) {
    return { ok: false, status: 500, error: "quote_store_failed" };
  }

  await args.admin
    .from("planned_package_cancellation_requests")
    .update({
      status: requestStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: args.adminUserId,
    })
    .eq("id", createReq.request.id);

  const updatedRequest = { ...createReq.request, status: requestStatus };

  return {
    ok: true,
    quote: mapQuoteRow(quoteRow as Record<string, unknown>, {
      blockers: calculated.blockers,
      warnings: calculated.warnings,
    }),
    request: updatedRequest,
  };
}

export async function adminApprovePlannedPackageRefundQuote(args: {
  admin: AdminClient;
  orderId: string;
  quoteId: string;
  adminUserId: string;
}): Promise<
  | { ok: true; quote: AdminRefundQuoteDto; request: AdminCancellationRequestDto }
  | { ok: false; status: number; error: string }
> {
  if (!canUsePlannedPackageRefundAdminReview()) {
    return { ok: false, status: 403, error: "refund_admin_review_disabled" };
  }

  const { data: quoteRow, error } = await args.admin
    .from("planned_package_refund_quotes")
    .select("*")
    .eq("id", args.quoteId)
    .eq("planned_package_order_id", args.orderId)
    .maybeSingle();

  if (error || !quoteRow) {
    return { ok: false, status: 404, error: "quote_not_found" };
  }

  const status = String((quoteRow as Record<string, unknown>).quote_status ?? "");
  if (status === "approved_for_manual_refund") {
    return {
      ok: true,
      quote: mapQuoteRow(quoteRow as Record<string, unknown>),
      request: await loadLatestRequest(args.admin, args.orderId),
    };
  }
  if (!["draft", "admin_review_required"].includes(status)) {
    return { ok: false, status: 409, error: "quote_not_approvable" };
  }

  const now = new Date().toISOString();
  const { data: updatedQuote, error: updErr } = await args.admin
    .from("planned_package_refund_quotes")
    .update({ quote_status: "approved_for_manual_refund" })
    .eq("id", args.quoteId)
    .select("*")
    .single();

  if (updErr || !updatedQuote) {
    return { ok: false, status: 500, error: "approve_failed" };
  }

  const requestId = String((quoteRow as Record<string, unknown>).cancellation_request_id ?? "");
  await args.admin
    .from("planned_package_cancellation_requests")
    .update({
      status: "approved_for_manual_refund",
      reviewed_at: now,
      reviewed_by: args.adminUserId,
    })
    .eq("id", requestId);

  return {
    ok: true,
    quote: mapQuoteRow(updatedQuote as Record<string, unknown>),
    request: await loadLatestRequest(args.admin, args.orderId),
  };
}

async function loadLatestRequest(
  admin: AdminClient,
  orderId: string,
): Promise<AdminCancellationRequestDto> {
  const { data } = await admin
    .from("planned_package_cancellation_requests")
    .select("*")
    .eq("planned_package_order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) {
    throw new Error("request_missing");
  }
  return mapCancellationRow(data as Record<string, unknown>);
}

export async function adminMarkPlannedPackageRefundQuoteForReview(args: {
  admin: AdminClient;
  orderId: string;
  quoteId: string;
  adminUserId: string;
}): Promise<
  | { ok: true; quote: AdminRefundQuoteDto }
  | { ok: false; status: number; error: string }
> {
  if (!canUsePlannedPackageRefundQuotes()) {
    return { ok: false, status: 403, error: "refund_quotes_disabled" };
  }

  const { data: updated, error } = await args.admin
    .from("planned_package_refund_quotes")
    .update({ quote_status: "admin_review_required", manual_review_required: true })
    .eq("id", args.quoteId)
    .eq("planned_package_order_id", args.orderId)
    .select("*")
    .single();

  if (error || !updated) {
    return { ok: false, status: 404, error: "quote_not_found" };
  }

  const requestId = String((updated as Record<string, unknown>).cancellation_request_id ?? "");
  await args.admin
    .from("planned_package_cancellation_requests")
    .update({
      status: "admin_review_required",
      reviewed_at: new Date().toISOString(),
      reviewed_by: args.adminUserId,
    })
    .eq("id", requestId);

  return { ok: true, quote: mapQuoteRow(updated as Record<string, unknown>) };
}
