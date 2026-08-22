/**
 * Teacher-safe planned package DTOs — read-only sold packages visibility.
 *
 * Allows estimated teacher amounts already computed on eligibility/transfer.
 * Hides raw Stripe ids, platform fees, admin notes, reconciliation blockers.
 */

import { isTeacherPayoutReadyForCheckout } from "@/lib/payments/connect";
import {
  mapTeacherPlannedPackageDisplayStatus,
  mapTeacherSessionPayoutDisplayStatus,
  type TeacherPlannedPackageDisplayStatus,
  type TeacherSessionPayoutDisplayStatus,
} from "./plannedPackageTeacherStatus";

export const TEACHER_PLANNED_PACKAGE_SUPPORT_PATH = "/resolution";

/** Forbidden in serialized DTO — estimatedTeacherAmountCents is allowed. */
const FORBIDDEN_DTO_KEYS =
  /stripe_payment_intent|stripe_checkout_session|stripe_refund_id|stripe_transfer_id|stripe_transfer_reversal|platform_fee|blocker_details|admin_note|reconciliation|idempotency|balance_transaction|teacher_net_cents/i;

export type TeacherPlannedPackageSessionDto = {
  bookingId: string;
  sessionIndex: number;
  startsAt: string | null;
  endsAt: string | null;
  bookingStatus: string;
  isCompleted: boolean;
  payoutStatus: TeacherSessionPayoutDisplayStatus;
  transferStatus: TeacherSessionPayoutDisplayStatus | null;
};

export type TeacherPlannedPackagePayoutSummaryDto = {
  eligibleCount: number;
  underReviewCount: number;
  transferredCount: number;
  estimatedTeacherAmountCents: number | null;
  currency: string;
};

export type TeacherPlannedPackagePaymentSetupDto = {
  required: boolean;
  label: "payment_setup_required" | null;
};

export type TeacherPlannedPackageStudentDto = {
  id: string;
  name: string;
};

export type TeacherPlannedPackageDto = {
  orderId: string;
  title: string;
  studentName: string;
  student: TeacherPlannedPackageStudentDto;
  status: TeacherPlannedPackageDisplayStatus;
  sessionCount: number;
  completedSessionCount: number;
  remainingSessionCount: number;
  nextSession: TeacherPlannedPackageSessionDto | null;
  payoutSummary: TeacherPlannedPackagePayoutSummaryDto;
  sessions: TeacherPlannedPackageSessionDto[];
  paymentSetup: TeacherPlannedPackagePaymentSetupDto;
  supportUrl: string;
  currency: string;
};

type QueryAdmin = {
  from: (table: string) => unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function bookingStartsAt(row: Record<string, unknown>): string | null {
  const lessonDate =
    asTrimmedString(row.lesson_date) ??
    asTrimmedString(row.slot_date) ??
    asTrimmedString(row.date);
  const timeSlot = asTrimmedString(row.time_slot) ?? asTrimmedString(row.time);
  if (lessonDate && timeSlot) return `${lessonDate}T${timeSlot}`;
  return lessonDate;
}

function bookingEndsAt(
  startsAt: string | null,
  durationMinutes: number | null,
): string | null {
  if (!startsAt || durationMinutes == null || durationMinutes <= 0) return null;
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setMinutes(d.getMinutes() + durationMinutes);
  return d.toISOString();
}

export function assertTeacherPlannedPackageDtoSafe(
  dto: TeacherPlannedPackageDto,
): void {
  const json = JSON.stringify(dto);
  if (FORBIDDEN_DTO_KEYS.test(json)) {
    throw new Error("teacher_planned_package_dto_unsafe_fields");
  }
}

export function mapTeacherPlannedPackageStudentDto(
  row: Record<string, unknown>,
): TeacherPlannedPackageStudentDto | null {
  const id = asTrimmedString(row.id);
  if (!id) return null;
  return {
    id,
    name: asTrimmedString(row.name) ?? "—",
  };
}

export function mapTeacherPlannedPackageSessionDto(args: {
  booking: Record<string, unknown>;
  durationMinutes: number | null;
  eligibilityStatus?: string | null;
  transferExecutionStatus?: string | null;
  reversedCents?: number;
  transferAmountCents?: number;
}): TeacherPlannedPackageSessionDto | null {
  const bookingId = asTrimmedString(args.booking.id);
  const sessionIndex = asInt(args.booking.planned_package_session_index);
  if (!bookingId || sessionIndex == null || sessionIndex < 1) return null;
  const bookingStatus = asTrimmedString(args.booking.status) ?? "confirmed";
  const startsAt = bookingStartsAt(args.booking);
  const payoutStatus = mapTeacherSessionPayoutDisplayStatus({
    bookingStatus,
    eligibilityStatus: args.eligibilityStatus,
    transferExecutionStatus: args.transferExecutionStatus,
    reversedCents: args.reversedCents,
    transferAmountCents: args.transferAmountCents,
  });
  const transferOnly =
    payoutStatus === "transfer_sent" ||
    payoutStatus === "transfer_reversed" ||
    payoutStatus === "transfer_processing"
      ? payoutStatus
      : null;

  return {
    bookingId,
    sessionIndex,
    startsAt,
    endsAt: bookingEndsAt(startsAt, args.durationMinutes),
    bookingStatus,
    isCompleted: bookingStatus === "completed",
    payoutStatus,
    transferStatus: transferOnly,
  };
}

export function buildTeacherPlannedPackageDto(args: {
  order: Record<string, unknown>;
  student: TeacherPlannedPackageStudentDto;
  sessions: TeacherPlannedPackageSessionDto[];
  latestCancellationStatus?: string | null;
  latestQuoteStatus?: string | null;
  latestRefundExecutionStatus?: string | null;
  paymentSetupRequired: boolean;
  estimatedTeacherAmountCents?: number | null;
}): TeacherPlannedPackageDto | null {
  const orderId = asTrimmedString(args.order.id);
  const title = asTrimmedString(args.order.title_snapshot);
  const sessionCount = asInt(args.order.session_count);
  if (!orderId || !title || sessionCount == null || sessionCount < 1) return null;

  const sessions = args.sessions
    .slice()
    .sort((a, b) => a.sessionIndex - b.sessionIndex);
  const completedSessionCount = sessions.filter((s) => s.isCompleted).length;
  const remainingSessionCount = Math.max(0, sessionCount - completedSessionCount);

  const now = Date.now();
  const upcoming = sessions
    .filter((s) => !s.isCompleted && s.startsAt)
    .filter((s) => {
      const t = new Date(s.startsAt!).getTime();
      return !Number.isNaN(t) && t >= now - 60 * 60 * 1000;
    })
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
  const nextSession = upcoming[0] ?? null;

  const eligibleCount = sessions.filter((s) => s.payoutStatus === "payout_eligible").length;
  const underReviewCount = sessions.filter(
    (s) => s.payoutStatus === "payout_under_review" || s.payoutStatus === "issue_under_review",
  ).length;
  const transferredCount = sessions.filter((s) => s.payoutStatus === "transfer_sent").length;
  const reversedCount = sessions.filter((s) => s.payoutStatus === "transfer_reversed").length;
  const transferPendingCount = sessions.filter(
    (s) => s.payoutStatus === "transfer_processing",
  ).length;

  const currency = asTrimmedString(args.order.currency_snapshot) ?? "CAD";

  const status = mapTeacherPlannedPackageDisplayStatus({
    orderStatus: asTrimmedString(args.order.status) ?? "",
    refundStatus: asTrimmedString(args.order.refund_status),
    latestCancellationStatus: args.latestCancellationStatus ?? null,
    latestQuoteStatus: args.latestQuoteStatus ?? null,
    latestRefundExecutionStatus: args.latestRefundExecutionStatus ?? null,
    completedSessionCount,
    sessionCount,
    eligibleCount,
    underReviewCount,
    transferredCount,
    reversedCount,
    transferPendingCount,
    paymentSetupRequired:
      args.paymentSetupRequired && eligibleCount > 0,
  });

  const dto: TeacherPlannedPackageDto = {
    orderId,
    title,
    studentName: args.student.name,
    student: args.student,
    status,
    sessionCount,
    completedSessionCount,
    remainingSessionCount,
    nextSession,
    payoutSummary: {
      eligibleCount,
      underReviewCount,
      transferredCount,
      estimatedTeacherAmountCents:
        args.estimatedTeacherAmountCents != null && args.estimatedTeacherAmountCents >= 0
          ? args.estimatedTeacherAmountCents
          : null,
      currency,
    },
    sessions,
    paymentSetup: {
      required: args.paymentSetupRequired,
      label: args.paymentSetupRequired ? "payment_setup_required" : null,
    },
    supportUrl: TEACHER_PLANNED_PACKAGE_SUPPORT_PATH,
    currency,
  };

  assertTeacherPlannedPackageDtoSafe(dto);
  return dto;
}

const ORDER_SELECT =
  "id, student_id, teacher_id, teacher_offer_id, status, session_count, duration_minutes, price_cents_snapshot, currency_snapshot, title_snapshot, refund_status, refunded_cents, created_at, hold_expires_at, payment_confirmed_at, fulfilled_at";

const TEACHER_CONNECT_SELECT =
  "id, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_requirements_due, stripe_connect_disabled_reason";

/**
 * Lists planned package orders sold by this teacher only.
 * Read-only; never returns Stripe secret/admin internals.
 */
export async function listTeacherPlannedPackagesForOwner(args: {
  admin: QueryAdmin;
  teacherId: string;
}): Promise<TeacherPlannedPackageDto[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherQuery = args.admin.from("teachers") as any;
  const { data: teacherRow } = await teacherQuery
    .select(TEACHER_CONNECT_SELECT)
    .eq("id", args.teacherId)
    .maybeSingle();

  const paymentSetupRequired = !isTeacherPayoutReadyForCheckout({
    stripe_account_id: teacherRow?.stripe_account_id ?? null,
    stripe_connect_onboarding_complete:
      teacherRow?.stripe_connect_onboarding_complete ?? null,
    stripe_connect_charges_enabled: teacherRow?.stripe_connect_charges_enabled ?? null,
    stripe_connect_payouts_enabled: teacherRow?.stripe_connect_payouts_enabled ?? null,
    stripe_connect_requirements_due: teacherRow?.stripe_connect_requirements_due ?? null,
    stripe_connect_disabled_reason: teacherRow?.stripe_connect_disabled_reason ?? null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderQuery = args.admin.from("planned_package_pending_orders") as any;
  const { data: orderRows, error } = await orderQuery
    .select(ORDER_SELECT)
    .eq("teacher_id", args.teacherId)
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(orderRows) || orderRows.length === 0) {
    return [];
  }

  const orders = orderRows as Record<string, unknown>[];
  const orderIds = orders
    .map((o) => asTrimmedString(o.id))
    .filter((id): id is string => Boolean(id));
  const studentIds = Array.from(
    new Set(
      orders
        .map((o) => asTrimmedString(o.student_id))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesQuery = args.admin.from("profiles") as any;
  const { data: profileRows } = studentIds.length
    ? await profilesQuery.select("id, name").in("id", studentIds)
    : { data: [] as Record<string, unknown>[] };

  const studentsById = new Map<string, TeacherPlannedPackageStudentDto>();
  for (const row of (profileRows ?? []) as Record<string, unknown>[]) {
    const dto = mapTeacherPlannedPackageStudentDto(row);
    if (dto) studentsById.set(dto.id, dto);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookingsQuery = args.admin.from("bookings") as any;
  const { data: bookingRows } = orderIds.length
    ? await bookingsQuery
        .select(
          "id, status, lesson_date, slot_date, date, time_slot, time, planned_package_order_id, planned_package_session_index, student_id",
        )
        .in("planned_package_order_id", orderIds)
        .eq("teacher_id", args.teacherId)
    : { data: [] as Record<string, unknown>[] };

  const bookings = (bookingRows ?? []) as Record<string, unknown>[];
  const bookingIds = bookings
    .map((b) => asTrimmedString(b.id))
    .filter((id): id is string => Boolean(id));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eligQuery = args.admin.from("planned_package_payout_eligibility_entries") as any;
  const { data: eligRows } = bookingIds.length
    ? await eligQuery
        .select(
          "booking_id, planned_package_order_id, status, teacher_net_cents, currency, transfer_status",
        )
        .in("planned_package_order_id", orderIds)
        .eq("teacher_id", args.teacherId)
    : { data: [] as Record<string, unknown>[] };

  const eligibilityByBooking = new Map<string, Record<string, unknown>>();
  for (const row of (eligRows ?? []) as Record<string, unknown>[]) {
    const bookingId = asTrimmedString(row.booking_id);
    if (bookingId) eligibilityByBooking.set(bookingId, row);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transferQuery = args.admin.from("planned_package_transfer_executions") as any;
  const { data: transferRows } = bookingIds.length
    ? await transferQuery
        .select(
          "id, booking_id, planned_package_order_id, status, amount_cents, reversed_cents",
        )
        .in("planned_package_order_id", orderIds)
        .eq("teacher_id", args.teacherId)
        .order("created_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const transferByBooking = new Map<string, Record<string, unknown>>();
  for (const row of (transferRows ?? []) as Record<string, unknown>[]) {
    const bookingId = asTrimmedString(row.booking_id);
    if (bookingId && !transferByBooking.has(bookingId)) {
      transferByBooking.set(bookingId, row);
    }
  }

  const sessionsByOrder = new Map<string, TeacherPlannedPackageSessionDto[]>();
  const estimatedByOrder = new Map<string, number>();

  for (const booking of bookings) {
    const orderId = asTrimmedString(booking.planned_package_order_id);
    const bookingId = asTrimmedString(booking.id);
    if (!orderId || !bookingId) continue;
    const order = orders.find((o) => asTrimmedString(o.id) === orderId);
    const duration = order ? asInt(order.duration_minutes) : null;
    const elig = eligibilityByBooking.get(bookingId);
    const transfer = transferByBooking.get(bookingId);
    const session = mapTeacherPlannedPackageSessionDto({
      booking,
      durationMinutes: duration,
      eligibilityStatus: elig ? asTrimmedString(elig.status) : null,
      transferExecutionStatus: transfer ? asTrimmedString(transfer.status) : null,
      reversedCents: transfer ? asInt(transfer.reversed_cents) ?? 0 : 0,
      transferAmountCents: transfer ? asInt(transfer.amount_cents) ?? 0 : 0,
    });
    if (!session) continue;
    const list = sessionsByOrder.get(orderId) ?? [];
    list.push(session);
    sessionsByOrder.set(orderId, list);

    const net = elig ? asInt(elig.teacher_net_cents) : null;
    if (net != null && net > 0) {
      estimatedByOrder.set(orderId, (estimatedByOrder.get(orderId) ?? 0) + net);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancelQuery = args.admin.from("planned_package_cancellation_requests") as any;
  const { data: cancelRows } = orderIds.length
    ? await cancelQuery
        .select("planned_package_order_id, status, created_at")
        .in("planned_package_order_id", orderIds)
        .order("created_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const cancelByOrder = new Map<string, string>();
  for (const row of (cancelRows ?? []) as Record<string, unknown>[]) {
    const orderId = asTrimmedString(row.planned_package_order_id);
    const status = asTrimmedString(row.status);
    if (orderId && status && !cancelByOrder.has(orderId)) {
      cancelByOrder.set(orderId, status);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quoteQuery = args.admin.from("planned_package_refund_quotes") as any;
  const { data: quoteRows } = orderIds.length
    ? await quoteQuery
        .select("planned_package_order_id, quote_status, created_at")
        .in("planned_package_order_id", orderIds)
        .neq("quote_status", "superseded")
        .order("created_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const quoteByOrder = new Map<string, string>();
  for (const row of (quoteRows ?? []) as Record<string, unknown>[]) {
    const orderId = asTrimmedString(row.planned_package_order_id);
    const status = asTrimmedString(row.quote_status);
    if (orderId && status && !quoteByOrder.has(orderId)) {
      quoteByOrder.set(orderId, status);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const execQuery = args.admin.from("planned_package_refund_executions") as any;
  const { data: execRows } = orderIds.length
    ? await execQuery
        .select("planned_package_order_id, status, created_at")
        .in("planned_package_order_id", orderIds)
        .order("created_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const execByOrder = new Map<string, string>();
  for (const row of (execRows ?? []) as Record<string, unknown>[]) {
    const orderId = asTrimmedString(row.planned_package_order_id);
    const status = asTrimmedString(row.status);
    if (orderId && status && !execByOrder.has(orderId)) {
      execByOrder.set(orderId, status);
    }
  }

  const out: TeacherPlannedPackageDto[] = [];
  for (const order of orders) {
    const studentId = asTrimmedString(order.student_id);
    const orderId = asTrimmedString(order.id);
    if (!studentId || !orderId) continue;
    const student =
      studentsById.get(studentId) ??
      mapTeacherPlannedPackageStudentDto({ id: studentId, name: "—" });
    if (!student) continue;

    const dto = buildTeacherPlannedPackageDto({
      order,
      student,
      sessions: sessionsByOrder.get(orderId) ?? [],
      latestCancellationStatus: cancelByOrder.get(orderId) ?? null,
      latestQuoteStatus: quoteByOrder.get(orderId) ?? null,
      latestRefundExecutionStatus: execByOrder.get(orderId) ?? null,
      paymentSetupRequired,
      estimatedTeacherAmountCents: estimatedByOrder.get(orderId) ?? null,
    });
    if (dto) out.push(dto);
  }

  return out;
}

export async function getTeacherPlannedPackageForOwner(args: {
  admin: QueryAdmin;
  teacherId: string;
  orderId: string;
}): Promise<TeacherPlannedPackageDto | null> {
  const list = await listTeacherPlannedPackagesForOwner({
    admin: args.admin,
    teacherId: args.teacherId,
  });
  return list.find((p) => p.orderId === args.orderId) ?? null;
}

export const TEACHER_PLANNED_PACKAGES_READ_ONLY = true;
