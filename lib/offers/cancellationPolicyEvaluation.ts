/**
 * PR 16B — Pure cancellation policy evaluator for package-credit bookings.
 *
 * Uses booking snapshot preference fields only (never live teacher_offers).
 * Does not mutate balances, Stripe, payouts, or refunds.
 *
 * Preference codes come from PR 16A (`flexible` | `standard` | `strict` | `manual_review`).
 * Notice hours are derived from the preference code (no separate hours snapshot column).
 *
 * // Future PR: apply rescheduling_policy / reschedule preference snapshots
 * // to package-credit rescheduling flow.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md
 */

import {
  isTeacherOfferPolicyPreference,
  noticeHoursForTeacherOfferPolicyPreference,
  type TeacherOfferPolicyPreference,
} from "./cancellationPreferences";

export type PackageCancellationPolicyReason =
  | "within_notice_window"
  | "outside_notice_window"
  | "manual_policy"
  | "missing_policy_snapshot"
  | "already_completed"
  | "not_package_credit"
  | "legacy_behavior";

export type PackageCancellationPolicyEvaluation = {
  eligibleForAutomaticCreditReturn: boolean;
  requiresManualReview: boolean;
  reason: PackageCancellationPolicyReason;
  noticeHours: number | null;
  policyCode: string | null;
};

export type EvaluatePackageCancellationPolicyInput = {
  bookingStartAt: Date | null;
  cancellationRequestedAt: Date;
  /** Booking snapshot: teacher_offer_cancellation_preference_snapshot */
  policyCodeSnapshot: string | null | undefined;
  bookingPaymentSource: string | null | undefined;
  redemptionStatus: string | null | undefined;
  bookingStatus: string | null | undefined;
  /** When true, treat as package-credit even if payment source is missing. */
  hasPackageRedemption?: boolean;
};

function isPackageCreditBooking(input: EvaluatePackageCancellationPolicyInput): boolean {
  if (input.bookingPaymentSource === "package_credit") return true;
  return input.hasPackageRedemption === true;
}

/**
 * Evaluate whether a package-credit booking may automatically restore a session.
 * Pure — no I/O, no mutation.
 */
export function evaluatePackageCancellationPolicy(
  input: EvaluatePackageCancellationPolicyInput,
): PackageCancellationPolicyEvaluation {
  if (!isPackageCreditBooking(input)) {
    return {
      eligibleForAutomaticCreditReturn: false,
      requiresManualReview: false,
      reason: "not_package_credit",
      noticeHours: null,
      policyCode: null,
    };
  }

  const bookingStatus = String(input.bookingStatus ?? "").trim().toLowerCase();
  const redemptionStatus = String(input.redemptionStatus ?? "").trim().toLowerCase();
  if (bookingStatus === "completed" || redemptionStatus === "completed") {
    return {
      eligibleForAutomaticCreditReturn: false,
      requiresManualReview: false,
      reason: "already_completed",
      noticeHours: null,
      policyCode:
        typeof input.policyCodeSnapshot === "string" && input.policyCodeSnapshot.trim()
          ? input.policyCodeSnapshot.trim()
          : null,
    };
  }

  const rawCode =
    typeof input.policyCodeSnapshot === "string" ? input.policyCodeSnapshot.trim() : "";
  if (!rawCode || !isTeacherOfferPolicyPreference(rawCode)) {
    // Missing / unknown snapshot → legacy PR 10C restore (safe rollout).
    return {
      eligibleForAutomaticCreditReturn: true,
      requiresManualReview: false,
      reason: "missing_policy_snapshot",
      noticeHours: null,
      policyCode: rawCode || null,
    };
  }

  const policyCode: TeacherOfferPolicyPreference = rawCode;
  const noticeHours = noticeHoursForTeacherOfferPolicyPreference(policyCode);

  if (policyCode === "manual_review") {
    return {
      eligibleForAutomaticCreditReturn: false,
      requiresManualReview: true,
      reason: "manual_policy",
      noticeHours: null,
      policyCode,
    };
  }

  if (!input.bookingStartAt || Number.isNaN(input.bookingStartAt.getTime())) {
    // Cannot evaluate window → conservative: no automatic restore + manual review.
    return {
      eligibleForAutomaticCreditReturn: false,
      requiresManualReview: true,
      reason: "manual_policy",
      noticeHours,
      policyCode,
    };
  }

  const requiredMs = (noticeHours ?? 0) * 60 * 60 * 1000;
  const leadMs = input.bookingStartAt.getTime() - input.cancellationRequestedAt.getTime();
  const withinWindow = leadMs >= requiredMs;

  if (withinWindow) {
    return {
      eligibleForAutomaticCreditReturn: true,
      requiresManualReview: false,
      reason: "within_notice_window",
      noticeHours,
      policyCode,
    };
  }

  return {
    eligibleForAutomaticCreditReturn: false,
    requiresManualReview: false,
    reason: "outside_notice_window",
    noticeHours,
    policyCode,
  };
}

/** UI hint for cancel confirmation (client may mirror evaluator when flag ON). */
export type PackageCancelPolicyUiHint = "eligible" | "outside_window" | "manual" | null;

export function packageCancelPolicyUiHintFromEvaluation(
  evaluation: PackageCancellationPolicyEvaluation | null,
): PackageCancelPolicyUiHint {
  if (!evaluation || evaluation.reason === "not_package_credit") return null;
  if (evaluation.reason === "manual_policy") return "manual";
  if (evaluation.eligibleForAutomaticCreditReturn) return "eligible";
  if (evaluation.reason === "outside_notice_window" || evaluation.reason === "already_completed") {
    return "outside_window";
  }
  // missing_policy_snapshot → eligible restore (legacy)
  if (evaluation.reason === "missing_policy_snapshot") return "eligible";
  return null;
}
