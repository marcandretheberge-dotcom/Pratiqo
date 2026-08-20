/**
 * Pure decision module for booking cancellation outcomes.
 *
 * The cancel API uses this to decide what should happen for a given
 * cancellation request *before* it touches Stripe or `support_cases`.
 * Keeping the policy pure makes it trivial to unit-test and forces all
 * branches (auto-refund / manual review / late no-refund / no payment)
 * to be explicit and reviewable.
 *
 * Honest user-facing principle: each outcome maps to a stable copy key
 * the UI surfaces back to the student/teacher. We never use vague keys
 * like "selon la situation" or "à notre discrétion" — those V9 launch
 * audit blockers were replaced with the keys defined below.
 *
 * IMPORTANT: This module does NOT itself execute the refund. It only
 * decides whether the route should *attempt* a Stripe refund or open a
 * manual-review support case. Actual Stripe IO lives in
 * `lib/payments/refunds.ts`. This separation keeps the route thin and
 * the decision logic 100% deterministic for tests.
 */

import type { CancellerRole } from "@/lib/bookingCancellation";

/**
 * Discriminator for the cancel API response. The UI maps each value to a
 * specific i18n title/body pair so the copy never claims a refund unless
 * `outcome === "refund_executed"`.
 */
export type CancellationOutcome =
  /** Free booking or no paid Stripe payment ledger row. Booking is cancelled, no refund applies. */
  | "no_payment"
  /** Stripe refund was successfully created and recorded in booking_payments. */
  | "refund_executed"
  /** A support_cases row was opened with payout_hold=true. Manual review will decide the refund. */
  | "manual_review"
  /** Student cancelled <24h with no exceptional-review request. No refund, no manual case opened. */
  | "late_no_refund"
  /** Package-credit booking cancelled; forfait session restored (not a Stripe refund). */
  | "package_credit_restored";

export type CancellationOutcomeCopyKey =
  | "cancelOutcomeNoPayment"
  | "cancelOutcomeRefundExecuted"
  | "cancelOutcomeManualReview"
  | "cancelOutcomeLateNoRefund"
  | "cancelOutcomeReviewRequested"
  | "cancelOutcomePackageCreditRestored";

/**
 * Caller-friendly copy key map. The UI picks `<key>Title` / `<key>Body`
 * from the locale dictionary. `cancelOutcomeReviewRequested` is the
 * specific variant shown when a student requested an *exceptional review*
 * within the late-cancellation window — it confirms the request was
 * received without claiming any refund.
 */
export function copyKeyForOutcome(
  outcome: CancellationOutcome,
  exceptionalReviewRequested: boolean,
): CancellationOutcomeCopyKey {
  if (outcome === "manual_review" && exceptionalReviewRequested) {
    return "cancelOutcomeReviewRequested";
  }
  switch (outcome) {
    case "no_payment":
      return "cancelOutcomeNoPayment";
    case "refund_executed":
      return "cancelOutcomeRefundExecuted";
    case "manual_review":
      return "cancelOutcomeManualReview";
    case "late_no_refund":
      return "cancelOutcomeLateNoRefund";
    case "package_credit_restored":
      return "cancelOutcomePackageCreditRestored";
  }
}

export type CancellationDecision =
  /** Route should attempt a Stripe refund and fall back to manual review if anything blocks it. */
  | { kind: "attempt_auto_refund"; reason: "teacher_cancelled" | "student_more_than_24h" }
  /** Route should open a manual-review support case (no Stripe call). */
  | { kind: "open_manual_review"; reason: "exceptional_review_requested" }
  /** Route should cancel the booking without opening a support case. */
  | { kind: "late_no_refund"; reason: "student_less_than_24h" };

export type CancellationDecisionInput = {
  cancellerRole: CancellerRole;
  isLate: boolean;
  /** True when the student opted into exceptional review via the cancel dialog. Ignored when not late. */
  exceptionalReviewRequested?: boolean;
};

/**
 * Decide what the cancel route should do with a given cancellation request.
 *
 * Rules (mirrored from CLAUDE.md "PART B — User-visible cancellation outcome"):
 *   1. Teacher cancels → always attempt auto-refund (teacher-initiated cancellation
 *      is a marketplace policy refund and should never be at the student's expense).
 *   2. Student cancels >24h before lesson → attempt auto-refund.
 *   3. Student cancels <24h with `exceptional_review = true` → open manual-review case.
 *   4. Student cancels <24h without exceptional review → cancel, no refund, no case.
 *
 * The "attempt" branches still degrade to manual review at refund-execution time
 * if the booking has no Stripe payment, the refund call fails, or the teacher
 * payout has already been transferred. That degradation is decided in
 * `lib/payments/refunds.ts`, not here.
 */
export function decideCancellationAction(input: CancellationDecisionInput): CancellationDecision {
  if (input.cancellerRole === "teacher") {
    return { kind: "attempt_auto_refund", reason: "teacher_cancelled" };
  }
  if (!input.isLate) {
    return { kind: "attempt_auto_refund", reason: "student_more_than_24h" };
  }
  if (input.exceptionalReviewRequested) {
    return { kind: "open_manual_review", reason: "exceptional_review_requested" };
  }
  return { kind: "late_no_refund", reason: "student_less_than_24h" };
}
