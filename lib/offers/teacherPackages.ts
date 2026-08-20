/**
 * Teacher package visibility helpers (PR 12).
 *
 * Read-only view of package_entitlements sold by the authenticated teacher.
 * Uses entitlement snapshot fields only — never live teacher_offers.
 * Does not mutate balances or create bookings/checkout.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md.
 *
 * DO NOT import mutation helpers from client components.
 */

import type { PackageEntitlementStatus } from "./packageEntitlements";
import type { PackageRedemptionStatus } from "./packageRedemptions";
import { studentPackageProgress, type StudentPackageProgress } from "./studentPackages";

export const TEACHER_PACKAGE_VISIBILITY_FLAG = "ENABLE_TEACHER_PACKAGE_VISIBILITY";
export const TEACHER_PACKAGE_VISIBILITY_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY";

export function isTeacherPackageVisibilityEnabled(): boolean {
  return process.env.ENABLE_TEACHER_PACKAGE_VISIBILITY === "true";
}

export function isTeacherPackageVisibilityUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY === "true";
}

export type TeacherPackageStudentDto = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type TeacherPackageOfferSnapshotDto = {
  teacherOfferId: string | null;
  disciplineId: string | null;
  specialite: string | null;
  shortDescription: string | null;
  snapshotVersion: number | null;
};

export type TeacherPackageRedemptionDto = {
  id: string;
  bookingId: string;
  sessionNumber: number;
  status: PackageRedemptionStatus | string;
  redeemedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  reversedAt: string | null;
  bookingStartAt: string | null;
  bookingStatus: string | null;
  bookingHref: string;
};

export type TeacherPackageNextBookingDto = {
  bookingId: string;
  startAt: string;
  status: string;
  bookingHref: string;
};

export type TeacherPackageDto = {
  id: string;
  student: TeacherPackageStudentDto;
  package: {
    title: string;
    priceCents: number;
    currency: string;
    durationMinutes: number | null;
    totalSessions: number;
    usedSessions: number;
    remainingSessions: number;
    status: PackageEntitlementStatus | string;
    activatedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    refundedAt: string | null;
  };
  offerSnapshot: TeacherPackageOfferSnapshotDto;
  redemptions: TeacherPackageRedemptionDto[];
  nextBooking: TeacherPackageNextBookingDto | null;
};

export type TeacherPackageProgress = StudentPackageProgress;

const TEACHER_PACKAGE_ENTITLEMENT_SELECT =
  "id, student_id, teacher_id, teacher_offer_id, offer_title_snapshot, offer_type_snapshot, offer_price_cents_snapshot, offer_currency_snapshot, offer_duration_minutes_snapshot, offer_session_count_snapshot, offer_discipline_id_snapshot, offer_specialite_snapshot, offer_short_description_snapshot, offer_snapshot_version, total_sessions, used_sessions, remaining_sessions, status, activated_at, completed_at, cancelled_at, refunded_at, created_at";

const TEACHER_PACKAGE_REDEMPTION_SELECT =
  "id, package_entitlement_id, booking_id, session_number, status, redeemed_at, completed_at, cancelled_at, reversed_at";

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

export const teacherPackageProgress = studentPackageProgress;

export function teacherPackageStatusLabelKey(
  status: string | null | undefined,
):
  | "teacherPackagesStatusActive"
  | "teacherPackagesStatusFullyUsed"
  | "teacherPackagesStatusCancelled"
  | "teacherPackagesStatusRefunded"
  | "teacherPackagesStatusUnknown" {
  switch (status) {
    case "active":
      return "teacherPackagesStatusActive";
    case "fully_used":
      return "teacherPackagesStatusFullyUsed";
    case "cancelled":
      return "teacherPackagesStatusCancelled";
    case "refunded":
      return "teacherPackagesStatusRefunded";
    default:
      return "teacherPackagesStatusUnknown";
  }
}

export function teacherPackageRedemptionStatusLabelKey(
  status: string | null | undefined,
):
  | "teacherPackagesRedemptionReserved"
  | "teacherPackagesRedemptionCompleted"
  | "teacherPackagesRedemptionCancelled"
  | "teacherPackagesRedemptionReversed"
  | "teacherPackagesStatusUnknown" {
  switch (status) {
    case "reserved":
      return "teacherPackagesRedemptionReserved";
    case "completed":
      return "teacherPackagesRedemptionCompleted";
    case "cancelled":
      return "teacherPackagesRedemptionCancelled";
    case "reversed":
      return "teacherPackagesRedemptionReversed";
    default:
      return "teacherPackagesStatusUnknown";
  }
}

export function teacherBookingHrefForPackageSession(input: {
  bookingStatus: string | null | undefined;
  bookingStartAt: string | null | undefined;
}): string {
  const status = asTrimmedString(input.bookingStatus);
  if (status === "confirmed" || status === "pending_payment") return "/dashboard";
  return "/teacher/history";
}

function parseBookingStartMs(startAt: string | null): number | null {
  if (!startAt) return null;
  // slot_dateTtime or ISO
  const normalized = startAt.includes("T")
    ? startAt.length === 16
      ? `${startAt}:00`
      : startAt
    : `${startAt}T12:00:00`;
  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function pickNextTeacherPackageBooking(
  redemptions: TeacherPackageRedemptionDto[],
  nowMs: number = Date.now(),
): TeacherPackageNextBookingDto | null {
  let best: TeacherPackageNextBookingDto | null = null;
  let bestMs = Number.POSITIVE_INFINITY;
  for (const row of redemptions) {
    if (row.status !== "reserved") continue;
    const bookingStatus = asTrimmedString(row.bookingStatus);
    if (bookingStatus && !["confirmed", "pending_payment"].includes(bookingStatus)) continue;
    const startMs = parseBookingStartMs(row.bookingStartAt);
    if (startMs == null || startMs < nowMs) continue;
    if (startMs < bestMs) {
      bestMs = startMs;
      best = {
        bookingId: row.bookingId,
        startAt: row.bookingStartAt!,
        status: bookingStatus ?? "confirmed",
        bookingHref: teacherBookingHrefForPackageSession({
          bookingStatus,
          bookingStartAt: row.bookingStartAt,
        }),
      };
    }
  }
  return best;
}

export function mapTeacherPackageStudentDto(row: Record<string, unknown>): TeacherPackageStudentDto | null {
  const id = asTrimmedString(row.id);
  if (!id) return null;
  const name = asTrimmedString(row.name) ?? "—";
  const avatarUrl = asTrimmedString(row.photo_url);
  return { id, name, avatarUrl };
}

export function mapTeacherPackageRedemptionDto(
  row: Record<string, unknown>,
  booking?: Record<string, unknown> | null,
): TeacherPackageRedemptionDto | null {
  const id = asTrimmedString(row.id);
  const bookingId = asTrimmedString(row.booking_id);
  const sessionNumber = asInt(row.session_number);
  if (!id || !bookingId || sessionNumber == null || sessionNumber < 1) return null;

  const slotDate =
    asTrimmedString(booking?.slot_date) ?? asTrimmedString(booking?.date) ?? null;
  const timeSlot =
    asTrimmedString(booking?.time_slot) ?? asTrimmedString(booking?.time) ?? null;
  const bookingStartAt = slotDate && timeSlot ? `${slotDate}T${timeSlot}` : slotDate;
  const bookingStatus = asTrimmedString(booking?.status);

  return {
    id,
    bookingId,
    sessionNumber,
    status: asTrimmedString(row.status) ?? "reserved",
    redeemedAt: asTrimmedString(row.redeemed_at),
    completedAt: asTrimmedString(row.completed_at),
    cancelledAt: asTrimmedString(row.cancelled_at),
    reversedAt: asTrimmedString(row.reversed_at),
    bookingStartAt,
    bookingStatus,
    bookingHref: teacherBookingHrefForPackageSession({
      bookingStatus,
      bookingStartAt,
    }),
  };
}

export function mapTeacherPackageDto(args: {
  entitlement: Record<string, unknown>;
  student: TeacherPackageStudentDto;
  redemptions: TeacherPackageRedemptionDto[];
  nowMs?: number;
}): TeacherPackageDto | null {
  const id = asTrimmedString(args.entitlement.id);
  const title = asTrimmedString(args.entitlement.offer_title_snapshot);
  const totalSessions = asInt(args.entitlement.total_sessions);
  const usedSessions = asInt(args.entitlement.used_sessions);
  const remainingSessions = asInt(args.entitlement.remaining_sessions);
  const priceCents = asInt(args.entitlement.offer_price_cents_snapshot);
  if (
    !id ||
    !title ||
    totalSessions == null ||
    usedSessions == null ||
    remainingSessions == null ||
    priceCents == null
  ) {
    return null;
  }

  const sorted = args.redemptions.slice().sort((a, b) => a.sessionNumber - b.sessionNumber);

  return {
    id,
    student: args.student,
    package: {
      title,
      priceCents,
      currency: asTrimmedString(args.entitlement.offer_currency_snapshot) ?? "CAD",
      durationMinutes: asInt(args.entitlement.offer_duration_minutes_snapshot),
      totalSessions,
      usedSessions,
      remainingSessions,
      status: asTrimmedString(args.entitlement.status) ?? "active",
      activatedAt: asTrimmedString(args.entitlement.activated_at),
      completedAt: asTrimmedString(args.entitlement.completed_at),
      cancelledAt: asTrimmedString(args.entitlement.cancelled_at),
      refundedAt: asTrimmedString(args.entitlement.refunded_at),
    },
    offerSnapshot: {
      teacherOfferId: asTrimmedString(args.entitlement.teacher_offer_id),
      disciplineId: asTrimmedString(args.entitlement.offer_discipline_id_snapshot),
      specialite: asTrimmedString(args.entitlement.offer_specialite_snapshot),
      shortDescription: asTrimmedString(args.entitlement.offer_short_description_snapshot),
      snapshotVersion: asInt(args.entitlement.offer_snapshot_version),
    },
    redemptions: sorted,
    nextBooking: pickNextTeacherPackageBooking(sorted, args.nowMs),
  };
}

type QueryAdmin = {
  from: (table: string) => unknown;
};

/**
 * Lists package entitlements sold by this teacher (any status), with safe
 * student display fields and redemption history. Read-only.
 */
export async function listTeacherPackagesForOwner(args: {
  admin: QueryAdmin;
  teacherId: string;
  nowMs?: number;
}): Promise<TeacherPackageDto[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entQuery = args.admin.from("package_entitlements") as any;
  const { data: entitlementRows, error: entErr } = await entQuery
    .select(TEACHER_PACKAGE_ENTITLEMENT_SELECT)
    .eq("teacher_id", args.teacherId)
    .order("created_at", { ascending: false });

  if (entErr || !Array.isArray(entitlementRows) || entitlementRows.length === 0) {
    return [];
  }

  const entitlements = entitlementRows as Record<string, unknown>[];
  const entitlementIds = entitlements
    .map((row) => asTrimmedString(row.id))
    .filter((id): id is string => Boolean(id));
  const studentIds = Array.from(
    new Set(
      entitlements
        .map((row) => asTrimmedString(row.student_id))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesQuery = args.admin.from("profiles") as any;
  const { data: profileRows } = studentIds.length
    ? await profilesQuery.select("id, name, photo_url").in("id", studentIds)
    : { data: [] as Record<string, unknown>[] };

  const studentsById = new Map<string, TeacherPackageStudentDto>();
  for (const row of (profileRows ?? []) as Record<string, unknown>[]) {
    const dto = mapTeacherPackageStudentDto(row);
    if (dto) studentsById.set(dto.id, dto);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const redQuery = args.admin.from("package_redemptions") as any;
  const { data: redemptionRows } = entitlementIds.length
    ? await redQuery
        .select(TEACHER_PACKAGE_REDEMPTION_SELECT)
        .eq("teacher_id", args.teacherId)
        .in("package_entitlement_id", entitlementIds)
        .order("session_number", { ascending: true })
    : { data: [] as Record<string, unknown>[] };

  const redemptions = (redemptionRows ?? []) as Record<string, unknown>[];
  const bookingIds = Array.from(
    new Set(
      redemptions
        .map((row) => asTrimmedString(row.booking_id))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookingsQuery = args.admin.from("bookings") as any;
  const { data: bookingRows } = bookingIds.length
    ? await bookingsQuery
        .select("id, status, slot_date, date, time_slot, time, teacher_id")
        .in("id", bookingIds)
        .eq("teacher_id", args.teacherId)
    : { data: [] as Record<string, unknown>[] };

  const bookingsById = new Map<string, Record<string, unknown>>();
  for (const row of (bookingRows ?? []) as Record<string, unknown>[]) {
    const id = asTrimmedString(row.id);
    if (id) bookingsById.set(id, row);
  }

  const redemptionsByEntitlement = new Map<string, TeacherPackageRedemptionDto[]>();
  for (const row of redemptions) {
    const entitlementId = asTrimmedString(row.package_entitlement_id);
    const bookingId = asTrimmedString(row.booking_id);
    if (!entitlementId) continue;
    const dto = mapTeacherPackageRedemptionDto(
      row,
      bookingId ? bookingsById.get(bookingId) ?? null : null,
    );
    if (!dto) continue;
    const list = redemptionsByEntitlement.get(entitlementId) ?? [];
    list.push(dto);
    redemptionsByEntitlement.set(entitlementId, list);
  }

  const out: TeacherPackageDto[] = [];
  for (const entitlement of entitlements) {
    const studentId = asTrimmedString(entitlement.student_id);
    if (!studentId) continue;
    const student =
      studentsById.get(studentId) ??
      mapTeacherPackageStudentDto({ id: studentId, name: "—" });
    if (!student) continue;
    const entitlementId = asTrimmedString(entitlement.id);
    const dto = mapTeacherPackageDto({
      entitlement,
      student,
      redemptions: entitlementId
        ? redemptionsByEntitlement.get(entitlementId) ?? []
        : [],
      nowMs: args.nowMs,
    });
    if (dto) out.push(dto);
  }

  return out;
}

export const TEACHER_PACKAGES_READ_ONLY = true;
