import {
  missingFieldsFromPublishIssues,
  type TeacherOfferPublishIssue,
} from "@/lib/offers/publishReadiness";
import type { PlannedPackageLaunchBlockerCode } from "@/lib/offers/plannedPackages";

/** Structured 422 body for incomplete or launch-gated publish attempts. */
export function offerNotPublishableResponseBody(failure: {
  error: "offer_not_publishable";
  issues?: TeacherOfferPublishIssue[];
  blockers?: PlannedPackageLaunchBlockerCode[];
}) {
  const issues = failure.issues ?? [];
  return {
    error: failure.error,
    issues,
    missingFields: missingFieldsFromPublishIssues(issues),
    ...(failure.blockers && failure.blockers.length > 0 ? { blockers: failure.blockers } : {}),
  };
}

export const OFFER_NOT_PUBLISHABLE_STATUS = 422;
