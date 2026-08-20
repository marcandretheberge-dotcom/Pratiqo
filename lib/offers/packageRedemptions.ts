/**
 * Package (forfait) session redemption — PR 10B.
 *
 * A learner uses one session from a package purchased from the same independent
 * teacher. Pratiqo facilitates booking; it does not assign another teacher,
 * impose curriculum, or create Stripe checkout for the redeemed session.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md.
 *
 * // Future PR: teacher-configurable cancellation/rescheduling preferences for offers/packages,
 * // within Pratiqo marketplace safety and fairness rules.
 *
 * // Package credit reversal on cancellation is intentionally deferred until
 * // cancellation lifecycle is centralized.
 *
 * DO NOT import mutation helpers from client components.
 */

import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";
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
    | "invalid_learner_profile"
    | "slot_booked"
    | "duplicate_redemption_conflict"
    | "server_error";
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
