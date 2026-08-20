/**
 * Student “Mes forfaits” dashboard helpers (PR 11).
 *
 * Read-only visibility into package_entitlements / package_redemptions owned by
 * the authenticated learner. Uses entitlement snapshot fields only — never live
 * teacher_offers. Does not mutate balances or create bookings/checkout.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md.
 *
 * DO NOT import mutation helpers from client components.
 */

import type { PackageEntitlementStatus } from "./packageEntitlements";
import type { PackageRedemptionStatus } from "./packageRedemptions";
import { resolveTeacherPublicPhoto } from "@/lib/teacherPhoto";

export const STUDENT_PACKAGE_DASHBOARD_FLAG = "ENABLE_STUDENT_PACKAGE_DASHBOARD";
export const STUDENT_PACKAGE_DASHBOARD_UI_FLAG = "NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD";

export function isStudentPackageDashboardEnabled(): boolean {
  return process.env.ENABLE_STUDENT_PACKAGE_DASHBOARD === "true";
}

export function isStudentPackageDashboardUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD === "true";
}

export type StudentPackageTeacherDto = {
  id: string;
  name: string;
  slug: string | null;
  avatarUrl: string | null;
  profileHref: string;
};

export type StudentPackageOfferSnapshotDto = {
  teacherOfferId: string | null;
  disciplineId: string | null;
  specialite: string | null;
  shortDescription: string | null;
  snapshotVersion: number | null;
};

export type StudentPackageRedemptionDto = {
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
};

export type StudentPackageDto = {
  id: string;
  teacher: StudentPackageTeacherDto;
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
  offerSnapshot: StudentPackageOfferSnapshotDto;
  redemptions: StudentPackageRedemptionDto[];
};

export type StudentPackageProgress = {
  usedSessions: number;
  totalSessions: number;
  remainingSessions: number;
  percentUsed: number;
};

const STUDENT_PACKAGE_ENTITLEMENT_SELECT =
  "id, student_id, teacher_id, teacher_offer_id, offer_title_snapshot, offer_type_snapshot, offer_price_cents_snapshot, offer_currency_snapshot, offer_duration_minutes_snapshot, offer_session_count_snapshot, offer_discipline_id_snapshot, offer_specialite_snapshot, offer_short_description_snapshot, offer_snapshot_version, total_sessions, used_sessions, remaining_sessions, status, activated_at, completed_at, cancelled_at, refunded_at, created_at";

const STUDENT_PACKAGE_REDEMPTION_SELECT =
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

export function studentPackageProgress(input: {
  usedSessions: number;
  totalSessions: number;
  remainingSessions: number;
}): StudentPackageProgress {
  const total = Math.max(0, input.totalSessions);
  const used = Math.max(0, Math.min(input.usedSessions, total || input.usedSessions));
  const remaining = Math.max(0, input.remainingSessions);
  const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return {
    usedSessions: used,
    totalSessions: total,
    remainingSessions: remaining,
    percentUsed,
  };
}

/** i18n key for entitlement status; unknown → studentPackagesStatusUnknown */
export function studentPackageStatusLabelKey(
  status: string | null | undefined,
):
  | "studentPackagesStatusActive"
  | "studentPackagesStatusFullyUsed"
  | "studentPackagesStatusCancelled"
  | "studentPackagesStatusRefunded"
  | "studentPackagesStatusUnknown" {
  switch (status) {
    case "active":
      return "studentPackagesStatusActive";
    case "fully_used":
      return "studentPackagesStatusFullyUsed";
    case "cancelled":
      return "studentPackagesStatusCancelled";
    case "refunded":
      return "studentPackagesStatusRefunded";
    default:
      return "studentPackagesStatusUnknown";
  }
}

/** i18n key for redemption status */
export function studentPackageRedemptionStatusLabelKey(
  status: string | null | undefined,
):
  | "studentPackagesRedemptionReserved"
  | "studentPackagesRedemptionCompleted"
  | "studentPackagesRedemptionCancelled"
  | "studentPackagesRedemptionReversed"
  | "studentPackagesStatusUnknown" {
  switch (status) {
    case "reserved":
      return "studentPackagesRedemptionReserved";
    case "completed":
      return "studentPackagesRedemptionCompleted";
    case "cancelled":
      return "studentPackagesRedemptionCancelled";
    case "reversed":
      return "studentPackagesRedemptionReversed";
    default:
      return "studentPackagesStatusUnknown";
  }
}

export function teacherProfileHrefForStudentPackage(input: {
  teacherId: string;
  slug?: string | null;
}): string {
  const slug = asTrimmedString(input.slug);
  if (slug) return `/professeurs/${encodeURIComponent(slug)}`;
  return `/teacher/profile/${encodeURIComponent(input.teacherId)}`;
}

export function mapStudentPackageTeacherDto(row: Record<string, unknown>): StudentPackageTeacherDto | null {
  const id = asTrimmedString(row.id);
  if (!id) return null;
  const name = asTrimmedString(row.name) ?? "—";
  const slug = asTrimmedString(row.public_profile_slug);
  const avatarUrl =
    resolveTeacherPublicPhoto(
      asTrimmedString(row.profile_photo_url) ?? asTrimmedString(row.photo_url),
      asTrimmedString(row.image_url),
    ) || null;
  return {
    id,
    name,
    slug,
    avatarUrl: avatarUrl || null,
    profileHref: teacherProfileHrefForStudentPackage({ teacherId: id, slug }),
  };
}

export function mapStudentPackageRedemptionDto(
  row: Record<string, unknown>,
  booking?: Record<string, unknown> | null,
): StudentPackageRedemptionDto | null {
  const id = asTrimmedString(row.id);
  const bookingId = asTrimmedString(row.booking_id);
  const sessionNumber = asInt(row.session_number);
  if (!id || !bookingId || sessionNumber == null || sessionNumber < 1) return null;

  const slotDate =
    asTrimmedString(booking?.slot_date) ?? asTrimmedString(booking?.date) ?? null;
  const timeSlot =
    asTrimmedString(booking?.time_slot) ?? asTrimmedString(booking?.time) ?? null;
  const bookingStartAt =
    slotDate && timeSlot ? `${slotDate}T${timeSlot}` : slotDate;

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
    bookingStatus: asTrimmedString(booking?.status),
  };
}

export function mapStudentPackageDto(args: {
  entitlement: Record<string, unknown>;
  teacher: StudentPackageTeacherDto;
  redemptions: StudentPackageRedemptionDto[];
}): StudentPackageDto | null {
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

  const currency = asTrimmedString(args.entitlement.offer_currency_snapshot) ?? "CAD";
  const status = asTrimmedString(args.entitlement.status) ?? "active";

  return {
    id,
    teacher: args.teacher,
    package: {
      title,
      priceCents,
      currency,
      durationMinutes: asInt(args.entitlement.offer_duration_minutes_snapshot),
      totalSessions,
      usedSessions,
      remainingSessions,
      status,
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
    redemptions: args.redemptions
      .slice()
      .sort((a, b) => a.sessionNumber - b.sessionNumber),
  };
}

type QueryAdmin = {
  from: (table: string) => unknown;
};

/**
 * Lists all package entitlements for the authenticated student (any status),
 * with safe teacher display fields and redemption history. Read-only.
 */
export async function listStudentPackagesForOwner(args: {
  admin: QueryAdmin;
  studentId: string;
}): Promise<StudentPackageDto[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entQuery = args.admin.from("package_entitlements") as any;
  const { data: entitlementRows, error: entErr } = await entQuery
    .select(STUDENT_PACKAGE_ENTITLEMENT_SELECT)
    .eq("student_id", args.studentId)
    .order("created_at", { ascending: false });

  if (entErr || !Array.isArray(entitlementRows) || entitlementRows.length === 0) {
    return [];
  }

  const entitlements = entitlementRows as Record<string, unknown>[];
  const entitlementIds = entitlements
    .map((row) => asTrimmedString(row.id))
    .filter((id): id is string => Boolean(id));
  const teacherIds = Array.from(
    new Set(
      entitlements
        .map((row) => asTrimmedString(row.teacher_id))
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
  const redQuery = args.admin.from("package_redemptions") as any;
  const { data: redemptionRows } = entitlementIds.length
    ? await redQuery
        .select(STUDENT_PACKAGE_REDEMPTION_SELECT)
        .eq("student_id", args.studentId)
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
        .select("id, status, slot_date, date, time_slot, time")
        .in("id", bookingIds)
        .eq("student_id", args.studentId)
    : { data: [] as Record<string, unknown>[] };

  const bookingsById = new Map<string, Record<string, unknown>>();
  for (const row of (bookingRows ?? []) as Record<string, unknown>[]) {
    const id = asTrimmedString(row.id);
    if (id) bookingsById.set(id, row);
  }

  const redemptionsByEntitlement = new Map<string, StudentPackageRedemptionDto[]>();
  for (const row of redemptions) {
    const entitlementId = asTrimmedString(row.package_entitlement_id);
    const bookingId = asTrimmedString(row.booking_id);
    if (!entitlementId) continue;
    const dto = mapStudentPackageRedemptionDto(
      row,
      bookingId ? bookingsById.get(bookingId) ?? null : null,
    );
    if (!dto) continue;
    const list = redemptionsByEntitlement.get(entitlementId) ?? [];
    list.push(dto);
    redemptionsByEntitlement.set(entitlementId, list);
  }

  const out: StudentPackageDto[] = [];
  for (const entitlement of entitlements) {
    const teacherId = asTrimmedString(entitlement.teacher_id);
    if (!teacherId) continue;
    const teacher =
      teachersById.get(teacherId) ??
      mapStudentPackageTeacherDto({ id: teacherId, name: "—" });
    if (!teacher) continue;
    const entitlementId = asTrimmedString(entitlement.id);
    const dto = mapStudentPackageDto({
      entitlement,
      teacher,
      redemptions: entitlementId
        ? redemptionsByEntitlement.get(entitlementId) ?? []
        : [],
    });
    if (dto) out.push(dto);
  }

  return out;
}

/** Static assert helpers for tests — forbid mutation surface in this module. */
export const STUDENT_PACKAGES_READ_ONLY = true;
