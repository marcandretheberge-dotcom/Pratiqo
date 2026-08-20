import { isTeacherOfferId } from "./teacherOfferDto";
import {
  TEACHER_OFFER_CURRENCIES,
  TEACHER_OFFER_FORMATS,
  TEACHER_OFFER_TYPES,
  type TeacherOfferCurrency,
  type TeacherOfferFormat,
  type TeacherOfferType,
} from "./types";

/**
 * Booking offer snapshots are immutable booking-time copies.
 * Later edits to teacher_offers must not rewrite historical bookings.
 *
 * Offer selection is display/UX + booking-row memory only.
 * Payment must use server-side offer snapshots in a later PR before selected
 * offers can affect checkout.
 *
 * PR 8 will make checkout validate and charge from booking offer snapshots.
 * Until then, legacy booking pricing remains the live payment source.
 */

export const BOOKING_TEACHER_OFFER_SNAPSHOT_VERSION = 1;

export const BOOKING_OFFER_SNAPSHOT_SELECT_COLUMNS = [
  "id",
  "teacher_id",
  "title",
  "short_description",
  "discipline_id",
  "specialite",
  "offer_type",
  "format",
  "status",
  "price_cents",
  "currency",
  "duration_minutes",
  "session_count",
  "published_at",
].join(", ");

export type BookingTeacherOfferSnapshot = {
  teacher_offer_id: string;
  teacher_offer_title_snapshot: string;
  teacher_offer_type_snapshot: TeacherOfferType;
  teacher_offer_format_snapshot: TeacherOfferFormat;
  teacher_offer_price_cents_snapshot: number;
  teacher_offer_currency_snapshot: TeacherOfferCurrency;
  teacher_offer_duration_minutes_snapshot: number | null;
  teacher_offer_session_count_snapshot: number | null;
  teacher_offer_discipline_id_snapshot: string | null;
  teacher_offer_specialite_snapshot: string | null;
  teacher_offer_short_description_snapshot: string | null;
  teacher_offer_snapshot_version: typeof BOOKING_TEACHER_OFFER_SNAPSHOT_VERSION;
};

export type LoadPublishedTeacherOfferSnapshotError = "offer_not_found" | "offer_not_bookable";

export type LoadPublishedTeacherOfferSnapshotResult =
  | { ok: true; snapshot: BookingTeacherOfferSnapshot }
  | { ok: false; error: LoadPublishedTeacherOfferSnapshotError };

type OfferLookupRow = {
  id?: unknown;
  teacher_id?: unknown;
  title?: unknown;
  short_description?: unknown;
  discipline_id?: unknown;
  specialite?: unknown;
  offer_type?: unknown;
  format?: unknown;
  status?: unknown;
  price_cents?: unknown;
  currency?: unknown;
  duration_minutes?: unknown;
  session_count?: unknown;
  published_at?: unknown;
};

export type BookingOfferSnapshotSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: OfferLookupRow | null; error: { message?: string } | null }>;
      };
    };
  };
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function isOfferType(value: unknown): value is TeacherOfferType {
  return typeof value === "string" && (TEACHER_OFFER_TYPES as readonly string[]).includes(value);
}

function isFormat(value: unknown): value is TeacherOfferFormat {
  return typeof value === "string" && (TEACHER_OFFER_FORMATS as readonly string[]).includes(value);
}

function isCurrency(value: unknown): value is TeacherOfferCurrency {
  return typeof value === "string" && (TEACHER_OFFER_CURRENCIES as readonly string[]).includes(value);
}

export function isPublishedBookableTeacherOffer(row: {
  status: unknown;
  published_at: unknown;
}): boolean {
  const publishedAt = asString(row.published_at);
  return row.status === "published" && publishedAt != null;
}

/** Map a DB offer row to booking snapshot fields. Never trust client copies. */
export function mapTeacherOfferRowToBookingSnapshot(
  row: OfferLookupRow,
  teacherId: string,
): LoadPublishedTeacherOfferSnapshotResult {
  const id = asString(row.id);
  const offerTeacherId = asString(row.teacher_id);
  if (!id || !isTeacherOfferId(id) || !offerTeacherId || offerTeacherId !== teacherId) {
    return { ok: false, error: "offer_not_found" };
  }

  if (!isPublishedBookableTeacherOffer({ status: row.status, published_at: row.published_at })) {
    return { ok: false, error: "offer_not_bookable" };
  }

  const title = asString(row.title);
  const offerType = row.offer_type;
  const format = row.format;
  const currency = row.currency;
  const priceCents = asInt(row.price_cents);
  if (!title || !isOfferType(offerType) || !isFormat(format) || !isCurrency(currency) || priceCents == null || priceCents < 0) {
    return { ok: false, error: "offer_not_bookable" };
  }

  return {
    ok: true,
    snapshot: {
      teacher_offer_id: id,
      teacher_offer_title_snapshot: title,
      teacher_offer_type_snapshot: offerType,
      teacher_offer_format_snapshot: format,
      teacher_offer_price_cents_snapshot: priceCents,
      teacher_offer_currency_snapshot: currency,
      teacher_offer_duration_minutes_snapshot: asInt(row.duration_minutes),
      teacher_offer_session_count_snapshot: asInt(row.session_count),
      teacher_offer_discipline_id_snapshot: asString(row.discipline_id),
      teacher_offer_specialite_snapshot: asString(row.specialite),
      teacher_offer_short_description_snapshot: asString(row.short_description),
      teacher_offer_snapshot_version: BOOKING_TEACHER_OFFER_SNAPSHOT_VERSION,
    },
  };
}

export async function loadPublishedTeacherOfferSnapshotForBooking(args: {
  supabase: BookingOfferSnapshotSupabase;
  teacherId: string;
  teacherOfferId: string;
}): Promise<LoadPublishedTeacherOfferSnapshotResult> {
  const teacherId = args.teacherId.trim();
  const teacherOfferId = args.teacherOfferId.trim();
  if (!teacherId || !isTeacherOfferId(teacherOfferId)) {
    return { ok: false, error: "offer_not_found" };
  }

  const { data, error } = await args.supabase
    .from("teacher_offers")
    .select(BOOKING_OFFER_SNAPSHOT_SELECT_COLUMNS)
    .eq("id", teacherOfferId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "offer_not_found" };
  }

  return mapTeacherOfferRowToBookingSnapshot(data, teacherId);
}
