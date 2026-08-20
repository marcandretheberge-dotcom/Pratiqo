/**
 * Server-owned package (forfait) entitlements.
 *
 * Created only after a successful paid checkout for a booking whose
 * immutable offer snapshot type is `package`. Never reads live teacher_offers
 * for snapshot values. Session redemption is implemented in
 * lib/offers/packageRedemptions.ts (PR 10B) via an atomic RPC.
 *
 * DO NOT import from client components for mutation.
 */

export const PACKAGE_ENTITLEMENTS_FLAG = "ENABLE_PACKAGE_ENTITLEMENTS";

export function isPackageEntitlementsEnabled(): boolean {
  return process.env.ENABLE_PACKAGE_ENTITLEMENTS === "true";
}

export const PACKAGE_ENTITLEMENT_STATUSES = [
  "active",
  "fully_used",
  "cancelled",
  "refunded",
] as const;

export type PackageEntitlementStatus = (typeof PACKAGE_ENTITLEMENT_STATUSES)[number];

export type PackageEntitlementSnapshotInput = {
  id?: string | null;
  teacher_id?: string | null;
  student_id?: string | null;
  teacher_offer_id?: string | null;
  teacher_offer_title_snapshot?: string | null;
  teacher_offer_type_snapshot?: string | null;
  teacher_offer_format_snapshot?: string | null;
  teacher_offer_price_cents_snapshot?: number | string | null;
  teacher_offer_currency_snapshot?: string | null;
  teacher_offer_duration_minutes_snapshot?: number | string | null;
  teacher_offer_session_count_snapshot?: number | string | null;
  teacher_offer_discipline_id_snapshot?: string | null;
  teacher_offer_specialite_snapshot?: string | null;
  teacher_offer_short_description_snapshot?: string | null;
  teacher_offer_snapshot_version?: number | string | null;
};

export type ParsedPackageOfferSnapshot = {
  teacherOfferId: string | null;
  title: string;
  format: string;
  priceCents: number;
  currency: "CAD";
  durationMinutes: number | null;
  sessionCount: number;
  disciplineId: string | null;
  specialite: string | null;
  shortDescription: string | null;
  snapshotVersion: number | null;
};

export type ParsePackageOfferSnapshotError =
  | "not_a_package_snapshot"
  | "incomplete_offer_snapshot"
  | "invalid_offer_snapshot_price"
  | "invalid_currency"
  | "invalid_package_session_count";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

export function bookingSnapshotIsPackage(
  booking: PackageEntitlementSnapshotInput,
): boolean {
  return asTrimmedString(booking.teacher_offer_type_snapshot) === "package";
}

export function parsePackageOfferSnapshotFromBooking(
  booking: PackageEntitlementSnapshotInput,
):
  | { ok: true; snapshot: ParsedPackageOfferSnapshot }
  | { ok: false; error: ParsePackageOfferSnapshotError } {
  if (!bookingSnapshotIsPackage(booking)) {
    return { ok: false, error: "not_a_package_snapshot" };
  }

  const title = asTrimmedString(booking.teacher_offer_title_snapshot);
  const format = asTrimmedString(booking.teacher_offer_format_snapshot);
  const currency = asTrimmedString(booking.teacher_offer_currency_snapshot);
  const priceCents = asInt(booking.teacher_offer_price_cents_snapshot);
  const sessionCount = asInt(booking.teacher_offer_session_count_snapshot);
  const teacherOfferId = asTrimmedString(booking.teacher_offer_id);
  const snapshotVersionRaw = booking.teacher_offer_snapshot_version;
  const snapshotVersion =
    snapshotVersionRaw == null || snapshotVersionRaw === ""
      ? null
      : asInt(snapshotVersionRaw);

  if (!title || !format || !teacherOfferId || priceCents == null || sessionCount == null) {
    return { ok: false, error: "incomplete_offer_snapshot" };
  }

  if (priceCents < 0) {
    return { ok: false, error: "invalid_offer_snapshot_price" };
  }

  if (currency !== "CAD") {
    return { ok: false, error: "invalid_currency" };
  }

  if (sessionCount < 1) {
    return { ok: false, error: "invalid_package_session_count" };
  }

  if (snapshotVersion != null && snapshotVersion < 1) {
    return { ok: false, error: "incomplete_offer_snapshot" };
  }

  const durationRaw = booking.teacher_offer_duration_minutes_snapshot;

  return {
    ok: true,
    snapshot: {
      teacherOfferId,
      title,
      format,
      priceCents,
      currency: "CAD",
      durationMinutes: durationRaw == null || durationRaw === "" ? null : asInt(durationRaw),
      sessionCount,
      disciplineId: asTrimmedString(booking.teacher_offer_discipline_id_snapshot),
      specialite: asTrimmedString(booking.teacher_offer_specialite_snapshot),
      shortDescription: asTrimmedString(booking.teacher_offer_short_description_snapshot),
      snapshotVersion,
    },
  };
}

export type PackageEntitlementRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  booking_id: string;
  payment_id: string | null;
  teacher_offer_id: string | null;
  offer_title_snapshot: string;
  offer_type_snapshot: "package";
  offer_format_snapshot: string;
  offer_price_cents_snapshot: number;
  offer_currency_snapshot: "CAD";
  offer_duration_minutes_snapshot: number | null;
  offer_session_count_snapshot: number;
  offer_discipline_id_snapshot: string | null;
  offer_specialite_snapshot: string | null;
  offer_short_description_snapshot: string | null;
  offer_snapshot_version: number | null;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  status: PackageEntitlementStatus;
  activated_at: string | null;
};

export type CreatePackageEntitlementResult =
  | { ok: true; skipped: true; reason: "disabled" | "not_a_package_snapshot" }
  | { ok: true; skipped: false; created: boolean; entitlement: PackageEntitlementRow }
  | {
      ok: false;
      error:
        | ParsePackageOfferSnapshotError
        | "missing_booking_parties"
        | "insert_failed";
    };

export type PackageEntitlementAdmin = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
    };
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    };
  };
};

const PACKAGE_ENTITLEMENT_SELECT =
  "id, student_id, teacher_id, booking_id, payment_id, teacher_offer_id, offer_title_snapshot, offer_type_snapshot, offer_format_snapshot, offer_price_cents_snapshot, offer_currency_snapshot, offer_duration_minutes_snapshot, offer_session_count_snapshot, offer_discipline_id_snapshot, offer_specialite_snapshot, offer_short_description_snapshot, offer_snapshot_version, total_sessions, used_sessions, remaining_sessions, status, activated_at";

function mapEntitlementRow(row: Record<string, unknown>): PackageEntitlementRow {
  return {
    id: String(row.id),
    student_id: String(row.student_id),
    teacher_id: String(row.teacher_id),
    booking_id: String(row.booking_id),
    payment_id: row.payment_id == null ? null : String(row.payment_id),
    teacher_offer_id: row.teacher_offer_id == null ? null : String(row.teacher_offer_id),
    offer_title_snapshot: String(row.offer_title_snapshot),
    offer_type_snapshot: "package",
    offer_format_snapshot: String(row.offer_format_snapshot),
    offer_price_cents_snapshot: Number(row.offer_price_cents_snapshot),
    offer_currency_snapshot: "CAD",
    offer_duration_minutes_snapshot:
      row.offer_duration_minutes_snapshot == null
        ? null
        : Number(row.offer_duration_minutes_snapshot),
    offer_session_count_snapshot: Number(row.offer_session_count_snapshot),
    offer_discipline_id_snapshot:
      row.offer_discipline_id_snapshot == null ? null : String(row.offer_discipline_id_snapshot),
    offer_specialite_snapshot:
      row.offer_specialite_snapshot == null ? null : String(row.offer_specialite_snapshot),
    offer_short_description_snapshot:
      row.offer_short_description_snapshot == null
        ? null
        : String(row.offer_short_description_snapshot),
    offer_snapshot_version:
      row.offer_snapshot_version == null ? null : Number(row.offer_snapshot_version),
    total_sessions: Number(row.total_sessions),
    used_sessions: Number(row.used_sessions),
    remaining_sessions: Number(row.remaining_sessions),
    status: String(row.status) as PackageEntitlementStatus,
    activated_at: row.activated_at == null ? null : String(row.activated_at),
  };
}

async function loadExistingByBookingId(
  admin: PackageEntitlementAdmin,
  bookingId: string,
): Promise<PackageEntitlementRow | null> {
  const { data, error } = await admin
    .from("package_entitlements")
    .select(PACKAGE_ENTITLEMENT_SELECT)
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error || !data) return null;
  return mapEntitlementRow(data);
}

/**
 * Create a package entitlement from a paid booking snapshot.
 * Idempotent on booking_id. Never reads live teacher_offers.
 */
export async function createPackageEntitlementFromPaidBooking(args: {
  admin: { from: (table: string) => unknown };
  booking: PackageEntitlementSnapshotInput;
  paymentId?: string | null;
}): Promise<CreatePackageEntitlementResult> {
  const admin = args.admin as PackageEntitlementAdmin;
  if (!isPackageEntitlementsEnabled()) {
    return { ok: true, skipped: true, reason: "disabled" };
  }

  const parsed = parsePackageOfferSnapshotFromBooking(args.booking);
  if (!parsed.ok) {
    if (parsed.error === "not_a_package_snapshot") {
      return { ok: true, skipped: true, reason: "not_a_package_snapshot" };
    }
    return { ok: false, error: parsed.error };
  }

  const bookingId = asTrimmedString(args.booking.id);
  const studentId = asTrimmedString(args.booking.student_id);
  const teacherId = asTrimmedString(args.booking.teacher_id);
  if (!bookingId || !studentId || !teacherId) {
    return { ok: false, error: "missing_booking_parties" };
  }

  const existing = await loadExistingByBookingId(admin, bookingId);
  if (existing) {
    return { ok: true, skipped: false, created: false, entitlement: existing };
  }

  const { snapshot } = parsed;
  const now = new Date().toISOString();
  const insertRow = {
    student_id: studentId,
    teacher_id: teacherId,
    booking_id: bookingId,
    payment_id: args.paymentId ?? null,
    teacher_offer_id: snapshot.teacherOfferId,
    offer_title_snapshot: snapshot.title,
    offer_type_snapshot: "package",
    offer_format_snapshot: snapshot.format,
    offer_price_cents_snapshot: snapshot.priceCents,
    offer_currency_snapshot: snapshot.currency,
    offer_duration_minutes_snapshot: snapshot.durationMinutes,
    offer_session_count_snapshot: snapshot.sessionCount,
    offer_discipline_id_snapshot: snapshot.disciplineId,
    offer_specialite_snapshot: snapshot.specialite,
    offer_short_description_snapshot: snapshot.shortDescription,
    offer_snapshot_version: snapshot.snapshotVersion,
    total_sessions: snapshot.sessionCount,
    used_sessions: 0,
    remaining_sessions: snapshot.sessionCount,
    status: "active",
    activated_at: now,
  };

  const { data, error } = await admin
    .from("package_entitlements")
    .insert(insertRow)
    .select(PACKAGE_ENTITLEMENT_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      const raced = await loadExistingByBookingId(admin, bookingId);
      if (raced) {
        return { ok: true, skipped: false, created: false, entitlement: raced };
      }
    }
    return { ok: false, error: "insert_failed" };
  }

  if (!data) {
    return { ok: false, error: "insert_failed" };
  }

  return { ok: true, skipped: false, created: true, entitlement: mapEntitlementRow(data) };
}

export const PACKAGE_BOOKING_SNAPSHOT_SELECT =
  "id, teacher_id, student_id, teacher_offer_id, teacher_offer_title_snapshot, teacher_offer_type_snapshot, teacher_offer_format_snapshot, teacher_offer_price_cents_snapshot, teacher_offer_currency_snapshot, teacher_offer_duration_minutes_snapshot, teacher_offer_session_count_snapshot, teacher_offer_discipline_id_snapshot, teacher_offer_specialite_snapshot, teacher_offer_short_description_snapshot, teacher_offer_snapshot_version";

/**
 * Webhook / booking-success hook. Loads snapshot + payment id if needed.
 * Never throws; logs via returned result so payment confirmation stays intact.
 */
export async function maybeCreatePackageEntitlementAfterPaidBooking(args: {
  admin: { from: (table: string) => unknown };
  bookingId: string;
  booking?: PackageEntitlementSnapshotInput | null;
}): Promise<CreatePackageEntitlementResult> {
  const admin = args.admin as PackageEntitlementAdmin;
  if (!isPackageEntitlementsEnabled()) {
    return { ok: true, skipped: true, reason: "disabled" };
  }

  let booking = args.booking ?? null;
  const hasType = asTrimmedString(booking?.teacher_offer_type_snapshot);
  if (!booking || !hasType || !asTrimmedString(booking.id)) {
    const { data, error } = await admin
      .from("bookings")
      .select(PACKAGE_BOOKING_SNAPSHOT_SELECT)
      .eq("id", args.bookingId)
      .maybeSingle();
    if (error || !data) {
      return { ok: false, error: "missing_booking_parties" };
    }
    booking = data as PackageEntitlementSnapshotInput;
  }

  if (!bookingSnapshotIsPackage(booking)) {
    return { ok: true, skipped: true, reason: "not_a_package_snapshot" };
  }

  const { data: payment } = await admin
    .from("booking_payments")
    .select("id")
    .eq("booking_id", args.bookingId)
    .maybeSingle();

  return createPackageEntitlementFromPaidBooking({
    admin,
    booking: { ...booking, id: asTrimmedString(booking.id) ?? args.bookingId },
    paymentId: payment?.id == null ? null : String(payment.id),
  });
}
