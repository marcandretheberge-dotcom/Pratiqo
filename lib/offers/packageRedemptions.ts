/**
 * Package (forfait) session redemption — PR 10B + 10C.
 *
 * A learner uses one session from a package purchased from the same independent
 * teacher. Pratiqo facilitates booking; it does not assign another teacher,
 * impose curriculum, or create Stripe checkout for the redeemed session.
 *
 * PR 10C restores one session credit when a package-credit booking is cancelled
 * or declined before completion (atomic RPC). No monetary Stripe refund.
 *
 * PR 16B: when offer-policy enforcement is ON, student cancellations outside the
 * snapshotted teacher notice window (or manual_review) forfeit the redemption
 * without restoring balance via forfeitPackageRedemptionForBooking.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md.
 *
 * // Future PR: apply rescheduling_policy_code_snapshot and rescheduling_notice_hours_snapshot
 * // to package-credit rescheduling flow.
 *
 * // Legal TODO before public package launch:
 * // Terms must clarify that the package service contract is between the learner
 * // and the independent teacher. Pratiqo acts as a technology marketplace /
 * // payment / booking facilitator. Pratiqo is not the teaching provider and
 * // does not employ the teacher.
 *
 * DO NOT import mutation helpers from client components.
 */

import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";
import {
  canBookTeacherOnDate,
  normalizeAvailableFromDate,
} from "@/lib/teachers/availabilityStartDate";
import type { PackageEntitlementRow, PackageEntitlementStatus } from "./packageEntitlements";

export const PACKAGE_REDEMPTION_BOOKING_FLAG = "ENABLE_PACKAGE_REDEMPTION_BOOKING";
export const PACKAGE_REDEMPTION_BOOKING_UI_FLAG = "NEXT_PUBLIC_ENABLE_PACKAGE_REDEMPTION_BOOKING";

export function isPackageRedemptionBookingEnabled(): boolean {
  return process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING === "true";
}

export function isPackageRedemptionBookingUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PACKAGE_REDEMPTION_BOOKING === "true";
}

export const PACKAGE_REDEMPTION_STATUSES = [
  "reserved",
  "completed",
  "cancelled",
  "reversed",
] as const;

export type PackageRedemptionStatus = (typeof PACKAGE_REDEMPTION_STATUSES)[number];

export type PackageRedemptionRow = {
  id: string;
  package_entitlement_id: string;
  booking_id: string;
  student_id: string;
  teacher_id: string;
  session_number: number;
  status: PackageRedemptionStatus;
  client_request_id: string;
  redeemed_at: string;
};

export type RedeemPackageSessionResult = {
  ok: true;
  idempotent: boolean;
  bookingId: string;
  redemptionId: string;
  entitlementId: string;
  sessionNumber: number;
  remainingSessions: number;
  usedSessions: number;
  entitlementStatus: PackageEntitlementStatus;
};

export type RedeemPackageSessionFailure = {
  ok: false;
  status: number;
  error:
    | "package_redemption_disabled"
    | "invalid_payload"
    | "entitlement_not_found"
    | "entitlement_not_active"
    | "no_remaining_sessions"
    | "booking_minimum_notice"
    | "teacher_not_available_yet"
    | "invalid_learner_profile"
    | "slot_booked"
    | "duplicate_redemption_conflict"
    | "server_error";
  availableFromDate?: string;
};

export type ActivePackageEntitlementSummary = {
  id: string;
  teacherId: string;
  title: string;
  remainingSessions: number;
  usedSessions: number;
  totalSessions: number;
  durationMinutes: number | null;
  status: PackageEntitlementStatus;
};

export const PACKAGE_REVERSAL_SOURCES = [
  "student_cancelled",
  "teacher_cancelled",
  "teacher_rejected",
  "admin_cancelled",
  "system",
] as const;

export type PackageReversalSource = (typeof PACKAGE_REVERSAL_SOURCES)[number];

export type ReversePackageRedemptionResult = {
  ok: true;
  reversed: boolean;
  idempotent: boolean;
  bookingId: string | null;
  redemptionId: string | null;
  entitlementId: string | null;
  sessionNumber: number | null;
  redemptionStatus: PackageRedemptionStatus | null;
  remainingSessions: number | null;
  usedSessions: number | null;
  entitlementStatus: PackageEntitlementStatus | null;
  reversalSource: PackageReversalSource | null;
  reason?: string | null;
};

export type ReversePackageRedemptionFailure = {
  ok: false;
  error:
    | "no_package_redemption"
    | "redemption_not_reversible"
    | "booking_not_found"
    | "invalid_payload"
    | "server_error";
};

export type ForfeitPackageRedemptionResult = {
  ok: true;
  forfeited: boolean;
  idempotent: boolean;
  bookingId: string | null;
  redemptionId: string | null;
  entitlementId: string | null;
  sessionNumber: number | null;
  redemptionStatus: PackageRedemptionStatus | null;
  remainingSessions: number | null;
  usedSessions: number | null;
  entitlementStatus: PackageEntitlementStatus | null;
  manualReviewRequired: boolean;
  reason?: string | null;
};

export type ForfeitPackageRedemptionFailure = {
  ok: false;
  error: "invalid_payload" | "redemption_not_forfeitable" | "server_error";
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asUuid(value: unknown): string | null {
  const text = asTrimmedString(value);
  return text && UUID_RE.test(text) ? text : null;
}

export type ParsedPackageRedemptionRequest = {
  clientRequestId: string;
  slotDate: string;
  timeSlot: string;
  teachingMode: "person" | "online" | "domicile";
  studentLevel: string | null;
  studentAddress: string | null;
  learnerProfileId: string | null;
  durationMinutes: number | null;
};

export function parsePackageRedemptionRequest(
  body: unknown,
): { ok: true; data: ParsedPackageRedemptionRequest } | { ok: false; error: "invalid_payload" } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid_payload" };
  }
  const record = body as Record<string, unknown>;

  // Clients must never send balance or snapshot fields.
  const forbidden = [
    "remaining_sessions",
    "used_sessions",
    "total_sessions",
    "remainingSessions",
    "usedSessions",
    "totalSessions",
    "offer_title_snapshot",
    "offer_price_cents_snapshot",
    "price",
    "amount",
    "teacher_id",
    "teacherId",
  ];
  if (forbidden.some((key) => key in record)) {
    return { ok: false, error: "invalid_payload" };
  }

  const clientRequestId =
    asTrimmedString(record.client_request_id) ?? asTrimmedString(record.clientRequestId);
  const slotDate =
    asTrimmedString(record.slot_date) ??
    asTrimmedString(record.slotDate) ??
    asTrimmedString(record.date);
  const timeSlot =
    asTrimmedString(record.time_slot) ??
    asTrimmedString(record.timeSlot) ??
    asTrimmedString(record.time);
  const teachingMode = asTrimmedString(record.teaching_mode) ?? asTrimmedString(record.teachingMode);
  const studentLevel =
    asTrimmedString(record.student_level) ?? asTrimmedString(record.studentLevel);
  const studentAddress =
    asTrimmedString(record.student_address) ?? asTrimmedString(record.studentAddress);
  const learnerRaw = record.learner_profile_id ?? record.learnerProfileId;
  const learnerProfileId =
    learnerRaw === undefined || learnerRaw === null || learnerRaw === ""
      ? null
      : asUuid(learnerRaw);
  const durationRaw = record.duration_minutes ?? record.durationMinutes;
  let durationMinutes: number | null = null;
  if (durationRaw !== undefined && durationRaw !== null && durationRaw !== "") {
    if (typeof durationRaw !== "number" || !Number.isInteger(durationRaw)) {
      return { ok: false, error: "invalid_payload" };
    }
    durationMinutes = durationRaw;
  }

  if (
    !clientRequestId ||
    clientRequestId.length < 8 ||
    clientRequestId.length > 128 ||
    !slotDate ||
    !ISO_DATE_RE.test(slotDate) ||
    !timeSlot ||
    timeSlot.length > 32 ||
    (teachingMode !== "person" && teachingMode !== "online" && teachingMode !== "domicile") ||
    (learnerRaw !== undefined &&
      learnerRaw !== null &&
      learnerRaw !== "" &&
      learnerProfileId == null) ||
    (durationMinutes != null && (durationMinutes < 15 || durationMinutes > 480)) ||
    (teachingMode === "domicile" && !studentAddress)
  ) {
    return { ok: false, error: "invalid_payload" };
  }

  return {
    ok: true,
    data: {
      clientRequestId,
      slotDate,
      timeSlot,
      teachingMode,
      studentLevel,
      studentAddress: teachingMode === "domicile" ? studentAddress : null,
      learnerProfileId,
      durationMinutes,
    },
  };
}

export function mapPackageEntitlementSummary(
  row: Record<string, unknown>,
): ActivePackageEntitlementSummary | null {
  const id = asUuid(row.id);
  const teacherId = asTrimmedString(row.teacher_id);
  const title = asTrimmedString(row.offer_title_snapshot);
  const remaining = typeof row.remaining_sessions === "number" ? row.remaining_sessions : null;
  const used = typeof row.used_sessions === "number" ? row.used_sessions : null;
  const total = typeof row.total_sessions === "number" ? row.total_sessions : null;
  const status = asTrimmedString(row.status) as PackageEntitlementStatus | null;
  if (!id || !teacherId || !title || remaining == null || used == null || total == null || !status) {
    return null;
  }
  const duration =
    row.offer_duration_minutes_snapshot == null
      ? null
      : typeof row.offer_duration_minutes_snapshot === "number"
        ? row.offer_duration_minutes_snapshot
        : null;
  return {
    id,
    teacherId,
    title,
    remainingSessions: remaining,
    usedSessions: used,
    totalSessions: total,
    durationMinutes: duration,
    status,
  };
}

type RpcAdmin = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
};

function mapRpcException(message: string | undefined): RedeemPackageSessionFailure {
  const text = (message ?? "").toUpperCase();
  if (text.includes("ENTITLEMENT_NOT_FOUND")) {
    return { ok: false, status: 404, error: "entitlement_not_found" };
  }
  if (text.includes("ENTITLEMENT_NOT_ACTIVE")) {
    return { ok: false, status: 409, error: "entitlement_not_active" };
  }
  if (text.includes("NO_REMAINING_SESSIONS")) {
    return { ok: false, status: 409, error: "no_remaining_sessions" };
  }
  if (text.includes("INVALID_LEARNER_PROFILE")) {
    return { ok: false, status: 400, error: "invalid_learner_profile" };
  }
  if (text.includes("SLOT_BOOKED")) {
    return { ok: false, status: 409, error: "slot_booked" };
  }
  if (text.includes("INVALID_PAYLOAD")) {
    return { ok: false, status: 400, error: "invalid_payload" };
  }
  return { ok: false, status: 500, error: "server_error" };
}

export async function redeemPackageSessionBooking(args: {
  admin: RpcAdmin;
  entitlementId: string;
  studentId: string;
  request: ParsedPackageRedemptionRequest;
}): Promise<RedeemPackageSessionResult | RedeemPackageSessionFailure> {
  if (!isPackageRedemptionBookingEnabled()) {
    return { ok: false, status: 400, error: "package_redemption_disabled" };
  }

  if (!isBookingAtLeast24hAhead({ slot_date: args.request.slotDate, time_slot: args.request.timeSlot })) {
    return { ok: false, status: 400, error: "booking_minimum_notice" };
  }

  const { data: entitlement, error: entitlementErr } = await args.admin
    .from("package_entitlements")
    .select("id, teacher_id")
    .eq("id", args.entitlementId)
    .maybeSingle();
  if (entitlementErr) {
    return { ok: false, status: 500, error: "server_error" };
  }
  const teacherId =
    entitlement && typeof entitlement.teacher_id === "string" ? entitlement.teacher_id : null;
  if (!entitlement?.id || !teacherId) {
    return { ok: false, status: 404, error: "entitlement_not_found" };
  }

  const { data: teacher, error: teacherErr } = await args.admin
    .from("teachers")
    .select("id, available_from_date")
    .eq("id", teacherId)
    .maybeSingle();
  if (teacherErr) {
    return { ok: false, status: 500, error: "server_error" };
  }
  const availableFromDate = normalizeAvailableFromDate(teacher?.available_from_date);
  if (!canBookTeacherOnDate(availableFromDate, args.request.slotDate)) {
    return {
      ok: false,
      status: 409,
      error: "teacher_not_available_yet",
      availableFromDate: availableFromDate ?? undefined,
    };
  }

  const { data, error } = await args.admin.rpc("redeem_package_session_booking", {
    p_entitlement_id: args.entitlementId,
    p_student_id: args.studentId,
    p_client_request_id: args.request.clientRequestId,
    p_slot_date: args.request.slotDate,
    p_time_slot: args.request.timeSlot,
    p_teaching_mode: args.request.teachingMode,
    p_student_level: args.request.studentLevel,
    p_student_address: args.request.studentAddress,
    p_learner_profile_id: args.request.learnerProfileId,
    p_duration_minutes: args.request.durationMinutes,
  });

  if (error) {
    return mapRpcException(error.message);
  }

  if (!data || typeof data !== "object") {
    return { ok: false, status: 500, error: "server_error" };
  }

  const row = data as Record<string, unknown>;
  const bookingId = asUuid(row.booking_id);
  const redemptionId = asUuid(row.redemption_id);
  const entitlementId = asUuid(row.entitlement_id);
  if (!bookingId || !redemptionId || !entitlementId) {
    return { ok: false, status: 500, error: "server_error" };
  }

  return {
    ok: true,
    idempotent: row.idempotent === true,
    bookingId,
    redemptionId,
    entitlementId,
    sessionNumber: Number(row.session_number),
    remainingSessions: Number(row.remaining_sessions),
    usedSessions: Number(row.used_sessions),
    entitlementStatus: String(row.entitlement_status) as PackageEntitlementStatus,
  };
}

export async function reversePackageRedemptionForBooking(args: {
  admin: RpcAdmin;
  bookingId: string;
  actorUserId?: string | null;
  source: PackageReversalSource;
  reason?: string | null;
}): Promise<ReversePackageRedemptionResult | ReversePackageRedemptionFailure> {
  const bookingId = asUuid(args.bookingId);
  if (!bookingId) {
    return { ok: false, error: "invalid_payload" };
  }
  if (!(PACKAGE_REVERSAL_SOURCES as readonly string[]).includes(args.source)) {
    return { ok: false, error: "invalid_payload" };
  }

  const { data, error } = await args.admin.rpc("reverse_package_redemption_for_booking", {
    p_booking_id: bookingId,
    p_actor_user_id: asUuid(args.actorUserId) ?? null,
    p_source: args.source,
    p_reason: args.reason ?? null,
  });

  if (error) {
    const text = (error.message ?? "").toUpperCase();
    if (text.includes("REDEMPTION_NOT_REVERSIBLE")) {
      return { ok: false, error: "redemption_not_reversible" };
    }
    if (text.includes("INVALID_PAYLOAD")) {
      return { ok: false, error: "invalid_payload" };
    }
    return { ok: false, error: "server_error" };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "server_error" };
  }

  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return { ok: false, error: "server_error" };
  }

  if (row.reason === "no_package_redemption" && row.reversed !== true) {
    return {
      ok: true,
      reversed: false,
      idempotent: true,
      bookingId,
      redemptionId: null,
      entitlementId: null,
      sessionNumber: null,
      redemptionStatus: null,
      remainingSessions: null,
      usedSessions: null,
      entitlementStatus: null,
      reversalSource: null,
      reason: "no_package_redemption",
    };
  }

  return {
    ok: true,
    reversed: row.reversed === true,
    idempotent: row.idempotent === true,
    bookingId: asUuid(row.booking_id) ?? bookingId,
    redemptionId: asUuid(row.redemption_id),
    entitlementId: asUuid(row.entitlement_id),
    sessionNumber:
      row.session_number == null || row.session_number === undefined
        ? null
        : Number(row.session_number),
    redemptionStatus:
      typeof row.redemption_status === "string"
        ? (row.redemption_status as PackageRedemptionStatus)
        : null,
    remainingSessions:
      row.remaining_sessions == null || row.remaining_sessions === undefined
        ? null
        : Number(row.remaining_sessions),
    usedSessions:
      row.used_sessions == null || row.used_sessions === undefined
        ? null
        : Number(row.used_sessions),
    entitlementStatus:
      typeof row.entitlement_status === "string"
        ? (row.entitlement_status as PackageEntitlementStatus)
        : null,
    reversalSource:
      typeof row.reversal_source === "string"
        ? (row.reversal_source as PackageReversalSource)
        : args.source,
    reason: typeof row.reason === "string" ? row.reason : null,
  };
}

/**
 * Cancel a package redemption without restoring the forfait session
 * (outside teacher notice window / manual_review). Does not mutate balances.
 */
export async function forfeitPackageRedemptionForBooking(args: {
  admin: RpcAdmin;
  bookingId: string;
  actorUserId?: string | null;
  source: PackageReversalSource;
  reason?: string | null;
  policyEvaluationResult?: string | null;
  creditReturnReason?: string | null;
  manualReviewRequired?: boolean;
}): Promise<ForfeitPackageRedemptionResult | ForfeitPackageRedemptionFailure> {
  const bookingId = asUuid(args.bookingId);
  if (!bookingId) {
    return { ok: false, error: "invalid_payload" };
  }
  if (!(PACKAGE_REVERSAL_SOURCES as readonly string[]).includes(args.source)) {
    return { ok: false, error: "invalid_payload" };
  }

  const { data, error } = await args.admin.rpc("forfeit_package_redemption_for_booking", {
    p_booking_id: bookingId,
    p_actor_user_id: asUuid(args.actorUserId) ?? null,
    p_source: args.source,
    p_reason: args.reason ?? null,
    p_policy_evaluation_result: args.policyEvaluationResult ?? null,
    p_credit_return_reason: args.creditReturnReason ?? null,
    p_manual_review_required: args.manualReviewRequired === true,
  });

  if (error) {
    const text = (error.message ?? "").toUpperCase();
    if (text.includes("REDEMPTION_NOT_FORFEITABLE")) {
      return { ok: false, error: "redemption_not_forfeitable" };
    }
    if (text.includes("INVALID_PAYLOAD")) {
      return { ok: false, error: "invalid_payload" };
    }
    return { ok: false, error: "server_error" };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "server_error" };
  }

  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return { ok: false, error: "server_error" };
  }

  return {
    ok: true,
    forfeited: row.forfeited === true,
    idempotent: row.idempotent === true,
    bookingId: asUuid(row.booking_id) ?? bookingId,
    redemptionId: asUuid(row.redemption_id),
    entitlementId: asUuid(row.entitlement_id),
    sessionNumber:
      row.session_number == null || row.session_number === undefined
        ? null
        : Number(row.session_number),
    redemptionStatus:
      typeof row.redemption_status === "string"
        ? (row.redemption_status as PackageRedemptionStatus)
        : null,
    remainingSessions:
      row.remaining_sessions == null || row.remaining_sessions === undefined
        ? null
        : Number(row.remaining_sessions),
    usedSessions:
      row.used_sessions == null || row.used_sessions === undefined
        ? null
        : Number(row.used_sessions),
    entitlementStatus:
      typeof row.entitlement_status === "string"
        ? (row.entitlement_status as PackageEntitlementStatus)
        : null,
    manualReviewRequired: row.manual_review_required === true,
    reason: typeof row.reason === "string" ? row.reason : null,
  };
}

export async function markPackageRedemptionCompletedForBooking(args: {
  admin: RpcAdmin;
  bookingId: string;
}): Promise<{ ok: true; completed: boolean; idempotent: boolean } | { ok: false; error: "server_error" }> {
  const bookingId = asUuid(args.bookingId);
  if (!bookingId) return { ok: false, error: "server_error" };

  const { data, error } = await args.admin.rpc("mark_package_redemption_completed_for_booking", {
    p_booking_id: bookingId,
  });

  if (error || !data || typeof data !== "object") {
    return { ok: false, error: "server_error" };
  }

  const row = data as Record<string, unknown>;
  return {
    ok: true,
    completed: row.completed === true,
    idempotent: row.idempotent === true,
  };
}

export const ACTIVE_PACKAGE_ENTITLEMENT_SELECT =
  "id, teacher_id, offer_title_snapshot, offer_duration_minutes_snapshot, total_sessions, used_sessions, remaining_sessions, status";

/** Read-only listing for BookingModal — own student, same teacher, active with remaining sessions. */
export async function listActivePackageEntitlementsForTeacher(args: {
  admin: {
    from: (table: string) => {
      select: (columns: string) => unknown;
    };
  };
  studentId: string;
  teacherId: string;
}): Promise<ActivePackageEntitlementSummary[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = args.admin.from("package_entitlements").select(ACTIVE_PACKAGE_ENTITLEMENT_SELECT) as any;
  const { data, error } = await query
    .eq("student_id", args.studentId)
    .eq("teacher_id", args.teacherId)
    .eq("status", "active")
    .gt("remaining_sessions", 0)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown[])
    .map((row) => mapPackageEntitlementSummary(row as Record<string, unknown>))
    .filter((row): row is ActivePackageEntitlementSummary => {
      return row != null && row.status === "active" && row.remainingSessions > 0;
    });
}

export type { PackageEntitlementRow };
