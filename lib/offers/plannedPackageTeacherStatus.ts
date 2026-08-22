/**
 * Teacher-safe status mapping for planned package orders / sessions.
 * Never leaks admin blockers, raw Stripe ids, or refund/transfer internals.
 */

export const TEACHER_PLANNED_PACKAGE_DISPLAY_STATUSES = [
  "package_pending_confirmation",
  "sessions_confirmed",
  "in_progress",
  "completed",
  "cancellation_under_review",
  "refund_under_review",
  "payout_not_yet_eligible",
  "payout_eligible",
  "payout_under_review",
  "transfer_processing",
  "transfer_sent",
  "transfer_reversed",
  "issue_under_review",
  "payment_setup_required",
] as const;

export type TeacherPlannedPackageDisplayStatus =
  (typeof TEACHER_PLANNED_PACKAGE_DISPLAY_STATUSES)[number];

export type TeacherSessionPayoutDisplayStatus =
  | "payout_not_yet_eligible"
  | "payout_eligible"
  | "payout_under_review"
  | "transfer_processing"
  | "transfer_sent"
  | "transfer_reversed"
  | "issue_under_review";

export type MapTeacherPlannedPackageStatusInput = {
  orderStatus: string;
  refundStatus?: string | null;
  latestCancellationStatus?: string | null;
  latestQuoteStatus?: string | null;
  latestRefundExecutionStatus?: string | null;
  completedSessionCount: number;
  sessionCount: number;
  eligibleCount: number;
  underReviewCount: number;
  transferredCount: number;
  reversedCount: number;
  transferPendingCount: number;
  paymentSetupRequired: boolean;
};

const OPEN_CANCELLATION = new Set([
  "requested",
  "quote_generated",
  "admin_review_required",
  "approved_for_manual_refund",
]);

const OPEN_QUOTE = new Set(["draft", "admin_review_required", "approved_for_manual_refund"]);

export function mapTeacherSessionPayoutDisplayStatus(input: {
  bookingStatus: string;
  eligibilityStatus?: string | null;
  transferExecutionStatus?: string | null;
  reversedCents?: number;
  transferAmountCents?: number;
}): TeacherSessionPayoutDisplayStatus {
  const booking = (input.bookingStatus ?? "").toLowerCase();
  const eligibility = (input.eligibilityStatus ?? "").toLowerCase();
  const transfer = (input.transferExecutionStatus ?? "").toLowerCase();
  const reversed = Math.max(0, input.reversedCents ?? 0);
  const amount = Math.max(0, input.transferAmountCents ?? 0);

  if (reversed > 0 && amount > 0 && reversed >= amount) {
    return "transfer_reversed";
  }
  if (transfer === "succeeded") {
    return reversed > 0 ? "transfer_reversed" : "transfer_sent";
  }
  if (transfer === "pending") return "transfer_processing";
  if (transfer === "failed") return "issue_under_review";

  if (eligibility === "eligible") return "payout_eligible";
  if (eligibility === "admin_review_required" || eligibility === "blocked") {
    return "payout_under_review";
  }
  if (booking !== "completed") return "payout_not_yet_eligible";
  if (eligibility === "not_eligible" || !eligibility) return "payout_not_yet_eligible";
  return "issue_under_review";
}

/**
 * Maps internal order/payout/refund state to a teacher-safe order display status.
 */
export function mapTeacherPlannedPackageDisplayStatus(
  input: MapTeacherPlannedPackageStatusInput,
): TeacherPlannedPackageDisplayStatus {
  if (input.paymentSetupRequired) {
    return "payment_setup_required";
  }

  const refundStatus = (input.refundStatus ?? "").toLowerCase();
  const exec = (input.latestRefundExecutionStatus ?? "").toLowerCase();
  const cancel = (input.latestCancellationStatus ?? "").toLowerCase();
  const quote = (input.latestQuoteStatus ?? "").toLowerCase();
  const order = (input.orderStatus ?? "").toLowerCase();

  if (exec === "succeeded" || refundStatus === "succeeded" || refundStatus === "refunded") {
    return "refund_under_review";
  }
  if (
    exec === "pending" ||
    exec === "failed" ||
    quote === "approved_for_manual_refund" ||
    refundStatus === "pending" ||
    refundStatus === "partial"
  ) {
    return "refund_under_review";
  }
  if (OPEN_QUOTE.has(quote) || OPEN_CANCELLATION.has(cancel)) {
    if (quote === "approved_for_manual_refund" || cancel === "approved_for_manual_refund") {
      return "refund_under_review";
    }
    return "cancellation_under_review";
  }

  if (order === "fulfillment_failed") return "issue_under_review";

  if (
    order === "pending_payment" ||
    order === "expired" ||
    order === "payment_confirmed" ||
    order === "paid" ||
    order === "fulfilling"
  ) {
    return "package_pending_confirmation";
  }

  if (order === "fulfilled") {
    if (input.reversedCount > 0 && input.reversedCount >= input.transferredCount && input.transferredCount > 0) {
      return "transfer_reversed";
    }
    if (input.transferredCount > 0 && input.transferredCount >= input.completedSessionCount && input.completedSessionCount > 0) {
      return "transfer_sent";
    }
    if (input.transferPendingCount > 0) return "transfer_processing";
    if (input.underReviewCount > 0) return "payout_under_review";
    if (input.eligibleCount > 0) return "payout_eligible";
    if (input.sessionCount > 0 && input.completedSessionCount >= input.sessionCount) {
      return "completed";
    }
    if (input.completedSessionCount > 0) {
      if (input.completedSessionCount > input.eligibleCount + input.underReviewCount + input.transferredCount) {
        return "payout_not_yet_eligible";
      }
      return "in_progress";
    }
    return "sessions_confirmed";
  }

  if (order === "cancelled") return "issue_under_review";
  return "issue_under_review";
}

export function teacherPlannedPackageStatusLabelKey(
  status: TeacherPlannedPackageDisplayStatus,
):
  | "teacherPlannedPackagesStatusPendingConfirmation"
  | "teacherPlannedPackagesStatusSessionsConfirmed"
  | "teacherPlannedPackagesStatusInProgress"
  | "teacherPlannedPackagesStatusCompleted"
  | "teacherPlannedPackagesStatusCancellationUnderReview"
  | "teacherPlannedPackagesStatusRefundUnderReview"
  | "teacherPlannedPackagesStatusPayoutNotYetEligible"
  | "teacherPlannedPackagesStatusPayoutEligible"
  | "teacherPlannedPackagesStatusPayoutUnderReview"
  | "teacherPlannedPackagesStatusTransferProcessing"
  | "teacherPlannedPackagesStatusTransferSent"
  | "teacherPlannedPackagesStatusTransferReversed"
  | "teacherPlannedPackagesStatusIssueUnderReview"
  | "teacherPlannedPackagesStatusPaymentSetupRequired" {
  switch (status) {
    case "package_pending_confirmation":
      return "teacherPlannedPackagesStatusPendingConfirmation";
    case "sessions_confirmed":
      return "teacherPlannedPackagesStatusSessionsConfirmed";
    case "in_progress":
      return "teacherPlannedPackagesStatusInProgress";
    case "completed":
      return "teacherPlannedPackagesStatusCompleted";
    case "cancellation_under_review":
      return "teacherPlannedPackagesStatusCancellationUnderReview";
    case "refund_under_review":
      return "teacherPlannedPackagesStatusRefundUnderReview";
    case "payout_not_yet_eligible":
      return "teacherPlannedPackagesStatusPayoutNotYetEligible";
    case "payout_eligible":
      return "teacherPlannedPackagesStatusPayoutEligible";
    case "payout_under_review":
      return "teacherPlannedPackagesStatusPayoutUnderReview";
    case "transfer_processing":
      return "teacherPlannedPackagesStatusTransferProcessing";
    case "transfer_sent":
      return "teacherPlannedPackagesStatusTransferSent";
    case "transfer_reversed":
      return "teacherPlannedPackagesStatusTransferReversed";
    case "payment_setup_required":
      return "teacherPlannedPackagesStatusPaymentSetupRequired";
    default:
      return "teacherPlannedPackagesStatusIssueUnderReview";
  }
}

export function teacherSessionPayoutStatusLabelKey(
  status: TeacherSessionPayoutDisplayStatus,
):
  | "teacherPlannedPackagesStatusPayoutNotYetEligible"
  | "teacherPlannedPackagesStatusPayoutEligible"
  | "teacherPlannedPackagesStatusPayoutUnderReview"
  | "teacherPlannedPackagesStatusTransferProcessing"
  | "teacherPlannedPackagesStatusTransferSent"
  | "teacherPlannedPackagesStatusTransferReversed"
  | "teacherPlannedPackagesStatusIssueUnderReview" {
  switch (status) {
    case "payout_not_yet_eligible":
      return "teacherPlannedPackagesStatusPayoutNotYetEligible";
    case "payout_eligible":
      return "teacherPlannedPackagesStatusPayoutEligible";
    case "payout_under_review":
      return "teacherPlannedPackagesStatusPayoutUnderReview";
    case "transfer_processing":
      return "teacherPlannedPackagesStatusTransferProcessing";
    case "transfer_sent":
      return "teacherPlannedPackagesStatusTransferSent";
    case "transfer_reversed":
      return "teacherPlannedPackagesStatusTransferReversed";
    default:
      return "teacherPlannedPackagesStatusIssueUnderReview";
  }
}

export const TEACHER_PLANNED_PACKAGE_STATUS_READ_ONLY = true;
