/**
 * Student-safe status mapping for planned package orders.
 * Never leaks admin blockers, Stripe ids, or payout internals.
 */

export const STUDENT_PLANNED_PACKAGE_DISPLAY_STATUSES = [
  "payment_pending",
  "payment_received",
  "sessions_confirmed",
  "in_progress",
  "completed",
  "cancellation_under_review",
  "refund_under_review",
  "refunded",
  "issue_under_review",
] as const;

export type StudentPlannedPackageDisplayStatus =
  (typeof STUDENT_PLANNED_PACKAGE_DISPLAY_STATUSES)[number];

export type MapStudentPlannedPackageStatusInput = {
  orderStatus: string;
  refundStatus?: string | null;
  latestCancellationStatus?: string | null;
  latestQuoteStatus?: string | null;
  latestRefundExecutionStatus?: string | null;
  completedSessionCount: number;
  sessionCount: number;
  hasUpcomingSession: boolean;
};

const OPEN_CANCELLATION = new Set([
  "requested",
  "quote_generated",
  "admin_review_required",
  "approved_for_manual_refund",
]);

const OPEN_QUOTE = new Set(["draft", "admin_review_required", "approved_for_manual_refund"]);

/**
 * Maps internal order/refund/cancellation state to a student-safe display status.
 */
export function mapStudentPlannedPackageDisplayStatus(
  input: MapStudentPlannedPackageStatusInput,
): StudentPlannedPackageDisplayStatus {
  const refundStatus = (input.refundStatus ?? "").toLowerCase();
  const exec = (input.latestRefundExecutionStatus ?? "").toLowerCase();
  const cancel = (input.latestCancellationStatus ?? "").toLowerCase();
  const quote = (input.latestQuoteStatus ?? "").toLowerCase();
  const order = (input.orderStatus ?? "").toLowerCase();

  if (exec === "succeeded" || refundStatus === "succeeded" || refundStatus === "refunded") {
    return "refunded";
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

  if (order === "fulfillment_failed") {
    return "issue_under_review";
  }

  if (order === "pending_payment" || order === "expired") {
    return "payment_pending";
  }

  if (
    order === "payment_confirmed" ||
    order === "paid" ||
    order === "fulfilling"
  ) {
    return "payment_received";
  }

  if (order === "fulfilled") {
    if (
      input.sessionCount > 0 &&
      input.completedSessionCount >= input.sessionCount
    ) {
      return "completed";
    }
    if (input.completedSessionCount > 0) {
      return "in_progress";
    }
    return input.hasUpcomingSession ? "sessions_confirmed" : "sessions_confirmed";
  }

  if (order === "cancelled") {
    return "issue_under_review";
  }

  return "issue_under_review";
}

export function studentPlannedPackageStatusLabelKey(
  status: StudentPlannedPackageDisplayStatus,
):
  | "studentPlannedPackagesStatusPaymentPending"
  | "studentPlannedPackagesStatusPaymentReceived"
  | "studentPlannedPackagesStatusSessionsConfirmed"
  | "studentPlannedPackagesStatusInProgress"
  | "studentPlannedPackagesStatusCompleted"
  | "studentPlannedPackagesStatusCancellationUnderReview"
  | "studentPlannedPackagesStatusRefundUnderReview"
  | "studentPlannedPackagesStatusRefunded"
  | "studentPlannedPackagesStatusIssueUnderReview" {
  switch (status) {
    case "payment_pending":
      return "studentPlannedPackagesStatusPaymentPending";
    case "payment_received":
      return "studentPlannedPackagesStatusPaymentReceived";
    case "sessions_confirmed":
      return "studentPlannedPackagesStatusSessionsConfirmed";
    case "in_progress":
      return "studentPlannedPackagesStatusInProgress";
    case "completed":
      return "studentPlannedPackagesStatusCompleted";
    case "cancellation_under_review":
      return "studentPlannedPackagesStatusCancellationUnderReview";
    case "refund_under_review":
      return "studentPlannedPackagesStatusRefundUnderReview";
    case "refunded":
      return "studentPlannedPackagesStatusRefunded";
    default:
      return "studentPlannedPackagesStatusIssueUnderReview";
  }
}

export const STUDENT_PLANNED_PACKAGE_STATUS_READ_ONLY = true;
