import {
  TEACHER_OFFER_CURRENCIES,
  TEACHER_OFFER_FORMATS,
  TEACHER_OFFER_TYPES,
  type TeacherOfferCurrency,
  type TeacherOfferFormat,
  type TeacherOfferType,
} from "./types";

/** Server-only gate for charging checkout from booking offer snapshots. Defaults OFF. */
export const OFFER_SNAPSHOT_CHECKOUT_FLAG = "ENABLE_OFFER_SNAPSHOT_CHECKOUT";

/** Client UI hint when offer selection + snapshot checkout are both enabled in preview. */
export const OFFER_SNAPSHOT_CHECKOUT_UI_FLAG = "NEXT_PUBLIC_ENABLE_OFFER_SNAPSHOT_CHECKOUT";

export function isOfferSnapshotCheckoutEnabled(): boolean {
  return process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT === "true";
}

export function isOfferSnapshotCheckoutUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_OFFER_SNAPSHOT_CHECKOUT === "true";
}

export function getBookingOfferSelectionNoteKey():
  | "bookingOfferSelectionCheckoutNote"
  | "bookingOfferSelectionPreviewNote" {
  return isOfferSnapshotCheckoutUiEnabled()
    ? "bookingOfferSelectionCheckoutNote"
    : "bookingOfferSelectionPreviewNote";
}

/** Immediate single-booking offer types that may charge via snapshot in PR 8. */
export const CHECKOUT_READY_OFFER_TYPES = [
  "private_lesson",
  "intro_session",
  "assessment",
] as const satisfies readonly TeacherOfferType[];

export type CheckoutReadyOfferType = (typeof CHECKOUT_READY_OFFER_TYPES)[number];

// Packages and group-style offers need redemption/capacity logic before checkout can charge them.

export type BookingOfferSnapshotCheckoutRow = {
  teacher_offer_id?: string | null;
  teacher_offer_title_snapshot?: string | null;
  teacher_offer_type_snapshot?: string | null;
  teacher_offer_format_snapshot?: string | null;
  teacher_offer_price_cents_snapshot?: number | string | null;
  teacher_offer_currency_snapshot?: string | null;
  teacher_offer_snapshot_version?: number | string | null;
};

export function bookingHasOfferSnapshotIntent(
  booking: BookingOfferSnapshotCheckoutRow,
): boolean {
  return Boolean(booking.teacher_offer_id?.trim());
}

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

function isOfferType(value: unknown): value is TeacherOfferType {
  return typeof value === "string" && (TEACHER_OFFER_TYPES as readonly string[]).includes(value);
}

function isFormat(value: unknown): value is TeacherOfferFormat {
  return typeof value === "string" && (TEACHER_OFFER_FORMATS as readonly string[]).includes(value);
}

function isCurrency(value: unknown): value is TeacherOfferCurrency {
  return typeof value === "string" && (TEACHER_OFFER_CURRENCIES as readonly string[]).includes(value);
}

export function isCheckoutReadyOfferType(
  value: unknown,
): value is CheckoutReadyOfferType {
  return (
    typeof value === "string" &&
    (CHECKOUT_READY_OFFER_TYPES as readonly string[]).includes(value)
  );
}

export type ParsedBookingOfferSnapshotCheckout = {
  teacherOfferId: string;
  title: string;
  offerType: CheckoutReadyOfferType;
  format: TeacherOfferFormat;
  priceCents: number;
  currency: TeacherOfferCurrency;
  snapshotVersion: number | null;
};

export type ParseBookingOfferSnapshotCheckoutError =
  | "incomplete_offer_snapshot"
  | "unsupported_offer_type_for_checkout"
  | "invalid_offer_snapshot_price"
  | "invalid_currency";

export function parseBookingOfferSnapshotCheckoutRow(
  booking: BookingOfferSnapshotCheckoutRow,
):
  | { ok: true; snapshot: ParsedBookingOfferSnapshotCheckout }
  | { ok: false; error: ParseBookingOfferSnapshotCheckoutError } {
  const teacherOfferId = asTrimmedString(booking.teacher_offer_id);
  const title = asTrimmedString(booking.teacher_offer_title_snapshot);
  const offerType = booking.teacher_offer_type_snapshot;
  const format = booking.teacher_offer_format_snapshot;
  const currency = booking.teacher_offer_currency_snapshot;
  const priceCents = asInt(booking.teacher_offer_price_cents_snapshot);
  const snapshotVersionRaw = booking.teacher_offer_snapshot_version;
  const snapshotVersion =
    snapshotVersionRaw == null || snapshotVersionRaw === ""
      ? null
      : asInt(snapshotVersionRaw);

  if (
    !teacherOfferId ||
    !title ||
    !isOfferType(offerType) ||
    !isFormat(format) ||
    !isCurrency(currency) ||
    priceCents == null
  ) {
    return { ok: false, error: "incomplete_offer_snapshot" };
  }

  if (!isCheckoutReadyOfferType(offerType)) {
    return { ok: false, error: "unsupported_offer_type_for_checkout" };
  }

  if (priceCents < 0) {
    return { ok: false, error: "invalid_offer_snapshot_price" };
  }

  if (currency !== "CAD") {
    return { ok: false, error: "invalid_currency" };
  }

  if (snapshotVersion != null && snapshotVersion < 1) {
    return { ok: false, error: "incomplete_offer_snapshot" };
  }

  return {
    ok: true,
    snapshot: {
      teacherOfferId,
      title,
      offerType,
      format,
      priceCents,
      currency,
      snapshotVersion,
    },
  };
}
