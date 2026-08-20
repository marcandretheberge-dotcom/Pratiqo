import {
  filterPublishedPublicTeacherOffers,
  isPublishedPublicTeacherOffer,
  type PublicTeacherOfferDto,
} from "./publicTeacherOfferDto";

/**
 * Offer selection is display/UX foundation only.
 * Payment must use server-side offer snapshots in a later PR before selected
 * offers can affect checkout.
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

/** Guard for future payload builders — selected offers must stay out of payment APIs. */
export function bookingPayloadExcludesOfferIdentity(payload: Record<string, unknown>): boolean {
  return !FORBIDDEN_BOOKING_OFFER_KEYS.some((key) => key in payload);
}

/** Re-export for callers that already fetch raw rows. */
export { filterPublishedPublicTeacherOffers };
