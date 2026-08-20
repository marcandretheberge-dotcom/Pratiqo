import {
  filterPublishedPublicTeacherOffers,
  isPublishedPublicTeacherOffer,
  type PublicTeacherOfferDto,
} from "./publicTeacherOfferDto";

/**
 * Gated offer selection in BookingModal (PR 6). When enabled, POST /api/bookings
 * may receive teacher_offer_id so the server snapshots the published offer (PR 7).
 * Checkout charges from that immutable snapshot when ENABLE_OFFER_SNAPSHOT_CHECKOUT
 * is ON (PR 8); otherwise snapshotted bookings are rejected at checkout.
 *
 * Booking offer snapshots are immutable booking-time copies.
 * Later edits to teacher_offers must not rewrite historical bookings.
 */

export const BOOKING_OFFER_SELECTION_FLAG = "NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION";

/** Defaults OFF in production unless explicitly set to "true". */
export function isBookingOfferSelectionEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION === "true";
}

export type SelectedBookingOffer = PublicTeacherOfferDto;

export type BookingOfferSelection = {
  selectedOfferId: string | null;
  selectedOffer: SelectedBookingOffer | null;
};

export function canSelectOfferForBooking(
  offer: Pick<PublicTeacherOfferDto, "status" | "publishedAt" | "teacherId">,
  teacherId: string,
): boolean {
  if (offer.teacherId !== teacherId) return false;
  return isPublishedPublicTeacherOffer(offer);
}

export function getSelectableBookingOffers(
  offers: PublicTeacherOfferDto[] | null | undefined,
  teacherId: string,
): PublicTeacherOfferDto[] {
  const id = teacherId.trim();
  if (!id || !Array.isArray(offers)) return [];
  return offers.filter((offer) => canSelectOfferForBooking(offer, id));
}

export function resolveBookingOfferSelection(
  offers: PublicTeacherOfferDto[] | null | undefined,
  teacherId: string,
  selectedOfferId: string | null | undefined,
): BookingOfferSelection {
  const selectable = getSelectableBookingOffers(offers, teacherId);
  const trimmed = selectedOfferId?.trim() ?? "";
  const selectedOffer = trimmed
    ? selectable.find((offer) => offer.id === trimmed) ?? null
    : null;
  return {
    selectedOfferId: selectedOffer?.id ?? null,
    selectedOffer,
  };
}

const FORBIDDEN_BOOKING_OFFER_KEYS = [
  "teacher_offer_id",
  "teacherOfferId",
  "offer_id",
  "offerId",
] as const;

/** Guard for checkout/payment payloads — selected offers must stay out of Stripe APIs until PR 8. */
export function bookingPayloadExcludesOfferIdentity(payload: Record<string, unknown>): boolean {
  return !FORBIDDEN_BOOKING_OFFER_KEYS.some((key) => key in payload);
}

/** Client may send teacher_offer_id only when the gated picker is enabled and an offer is selected. */
export function buildBookingCreateOfferFields(selectedOfferId: string | null | undefined): {
  teacher_offer_id?: string;
} {
  if (!isBookingOfferSelectionEnabled()) return {};
  const trimmed = selectedOfferId?.trim() ?? "";
  if (!trimmed) return {};
  return { teacher_offer_id: trimmed };
}

/** Re-export for callers that already fetch raw rows. */
export { filterPublishedPublicTeacherOffers };
