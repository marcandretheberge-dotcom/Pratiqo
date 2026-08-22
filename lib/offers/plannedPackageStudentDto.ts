/**
 * Student-safe planned package DTOs — read-only, no financial internals.
 *
 * Hides Stripe ids, teacher_net, platform fees, admin blockers, transfer/refund
 * execution internals. Snapshot + booking schedule only.
 */

import {
  mapStudentPackageTeacherDto,
  teacherProfileHrefForStudentPackage,
  type StudentPackageTeacherDto,
} from "./studentPackages";
import {
  mapStudentPlannedPackageDisplayStatus,
  type StudentPlannedPackageDisplayStatus,
} from "./plannedPackageStudentStatus";

export const STUDENT_PLANNED_PACKAGE_SUPPORT_PATH = "/resolution";

const FORBIDDEN_DTO_KEYS =
  /stripe_payment_intent|stripe_checkout_session|stripe_refund|stripe_transfer|teacher_net|platform_fee|blocker|admin_note|reconciliation|idempotency|balance_transaction/i;

export type StudentPlannedPackageSessionDto = {
  bookingId: string;
  sessionIndex: number;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  isCompleted: boolean;
};

export type StudentPlannedPackageDto = {
  orderId: string;
  title: string;
  teacherName: string;
  teacherProfileUrl: string;
  teacher: StudentPackageTeacherDto;
  status: StudentPlannedPackageDisplayStatus;
  paymentLabel: StudentPlannedPackageDisplayStatus;
  sessionCount: number;
  completedSessionCount: number;
  remainingSessionCount: number;
  nextSession: StudentPlannedPackageSessionDto | null;
  sessions: StudentPlannedPackageSessionDto[];
  supportUrl: string;
  priceCents: number | null;
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
  const timeSlot =
    asTrimmedString(row.time_slot) ?? asTrimmedString(row.time);
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

export function assertStudentPlannedPackageDtoSafe(
  dto: StudentPlannedPackageDto,
): void {
  const json = JSON.stringify(dto);
  if (FORBIDDEN_DTO_KEYS.test(json)) {
    throw new Error("student_planned_package_dto_unsafe_fields");
  }
}

export function mapStudentPlannedPackageSessionDto(
  booking: Record<string, unknown>,
  durationMinutes: number | null,
): StudentPlannedPackageSessionDto | null {
  const bookingId = asTrimmedString(booking.id);
  const sessionIndex = asInt(booking.planned_package_session_index);
  if (!bookingId || sessionIndex == null || sessionIndex < 1) return null;
  const status = asTrimmedString(booking.status) ?? "confirmed";
  const startsAt = bookingStartsAt(booking);
  return {
    bookingId,
    sessionIndex,
    startsAt,
    endsAt: bookingEndsAt(startsAt, durationMinutes),
    status,
    isCompleted: status === "completed",
  };
}

export function buildStudentPlannedPackageDto(args: {
  order: Record<string, unknown>;
  teacher: StudentPackageTeacherDto;
  sessions: StudentPlannedPackageSessionDto[];
  latestCancellationStatus?: string | null;
  latestQuoteStatus?: string | null;
  latestRefundExecutionStatus?: string | null;
}): StudentPlannedPackageDto | null {
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

  const status = mapStudentPlannedPackageDisplayStatus({
    orderStatus: asTrimmedString(args.order.status) ?? "",
    refundStatus: asTrimmedString(args.order.refund_status),
    latestCancellationStatus: args.latestCancellationStatus ?? null,
    latestQuoteStatus: args.latestQuoteStatus ?? null,
    latestRefundExecutionStatus: args.latestRefundExecutionStatus ?? null,
    completedSessionCount,
    sessionCount,
    hasUpcomingSession: Boolean(nextSession),
  });

  const dto: StudentPlannedPackageDto = {
    orderId,
    title,
    teacherName: args.teacher.name,
    teacherProfileUrl: args.teacher.profileHref,
    teacher: args.teacher,
    status,
    paymentLabel: status,
    sessionCount,
    completedSessionCount,
    remainingSessionCount,
    nextSession,
    sessions,
    supportUrl: STUDENT_PLANNED_PACKAGE_SUPPORT_PATH,
    priceCents: asInt(args.order.price_cents_snapshot),
    currency: asTrimmedString(args.order.currency_snapshot) ?? "CAD",
  };

  assertStudentPlannedPackageDtoSafe(dto);
  return dto;
}

const ORDER_SELECT =
  "id, student_id, teacher_id, teacher_offer_id, status, session_count, duration_minutes, price_cents_snapshot, currency_snapshot, title_snapshot, refund_status, refunded_cents, created_at, hold_expires_at, payment_confirmed_at, fulfilled_at";

/**
 * Lists planned package orders for the authenticated student only.
 * Read-only; never returns Stripe/payout/admin internals.
 */
export async function listStudentPlannedPackagesForOwner(args: {
  admin: QueryAdmin;
  studentId: string;
}): Promise<StudentPlannedPackageDto[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderQuery = args.admin.from("planned_package_pending_orders") as any;
  const { data: orderRows, error } = await orderQuery
    .select(ORDER_SELECT)
    .eq("student_id", args.studentId)
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(orderRows) || orderRows.length === 0) {
    return [];
  }

  const orders = orderRows as Record<string, unknown>[];
  const orderIds = orders
    .map((o) => asTrimmedString(o.id))
    .filter((id): id is string => Boolean(id));
  const teacherIds = Array.from(
    new Set(
      orders
        .map((o) => asTrimmedString(o.teacher_id))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teachersQuery = args.admin.from("teachers") as any;
  const { data: teacherRows } = teacherIds.length
    ? await teachersQuery
        .select("id, name, public_profile_slug, image_url")
        .in("id", teacherIds)
    : { data: [] as Record<string, unknown>[] };

  const teachersById = new Map<string, StudentPackageTeacherDto>();
  for (const row of (teacherRows ?? []) as Record<string, unknown>[]) {
    const dto = mapStudentPackageTeacherDto(row);
    if (dto) teachersById.set(dto.id, dto);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookingsQuery = args.admin.from("bookings") as any;
  const { data: bookingRows } = orderIds.length
    ? await bookingsQuery
        .select(
          "id, status, lesson_date, slot_date, date, time_slot, time, planned_package_order_id, planned_package_session_index",
        )
        .in("planned_package_order_id", orderIds)
        .eq("student_id", args.studentId)
    : { data: [] as Record<string, unknown>[] };

  const sessionsByOrder = new Map<string, StudentPlannedPackageSessionDto[]>();
  for (const booking of (bookingRows ?? []) as Record<string, unknown>[]) {
    const orderId = asTrimmedString(booking.planned_package_order_id);
    if (!orderId) continue;
    const order = orders.find((o) => asTrimmedString(o.id) === orderId);
    const duration = order ? asInt(order.duration_minutes) : null;
    const session = mapStudentPlannedPackageSessionDto(booking, duration);
    if (!session) continue;
    const list = sessionsByOrder.get(orderId) ?? [];
    list.push(session);
    sessionsByOrder.set(orderId, list);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancelQuery = args.admin.from("planned_package_cancellation_requests") as any;
  const { data: cancelRows } = orderIds.length
    ? await cancelQuery
        .select("planned_package_order_id, status, created_at")
        .in("planned_package_order_id", orderIds)
        .eq("student_id", args.studentId)
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

  const out: StudentPlannedPackageDto[] = [];
  for (const order of orders) {
    const teacherId = asTrimmedString(order.teacher_id);
    const orderId = asTrimmedString(order.id);
    if (!teacherId || !orderId) continue;
    const teacher =
      teachersById.get(teacherId) ??
      mapStudentPackageTeacherDto({ id: teacherId, name: "—" });
    if (!teacher) continue;

    const dto = buildStudentPlannedPackageDto({
      order,
      teacher,
      sessions: sessionsByOrder.get(orderId) ?? [],
      latestCancellationStatus: cancelByOrder.get(orderId) ?? null,
      latestQuoteStatus: quoteByOrder.get(orderId) ?? null,
      latestRefundExecutionStatus: execByOrder.get(orderId) ?? null,
    });
    if (dto) out.push(dto);
  }

  return out;
}

export async function getStudentPlannedPackageForOwner(args: {
  admin: QueryAdmin;
  studentId: string;
  orderId: string;
}): Promise<StudentPlannedPackageDto | null> {
  const list = await listStudentPlannedPackagesForOwner({
    admin: args.admin,
    studentId: args.studentId,
  });
  return list.find((p) => p.orderId === args.orderId) ?? null;
}

export { teacherProfileHrefForStudentPackage };

export const STUDENT_PLANNED_PACKAGES_READ_ONLY = true;
