import {
  missingFieldsFromPublishIssues,
  type OfferNotPublishableFailure,
} from "@/lib/offers/publishReadiness";

/** Structured 422 body for incomplete publish attempts. */
export function offerNotPublishableResponseBody(failure: OfferNotPublishableFailure) {
  return {
    error: failure.error,
    issues: failure.issues,
    missingFields: missingFieldsFromPublishIssues(failure.issues),
  };
}

export const OFFER_NOT_PUBLISHABLE_STATUS = 422;
