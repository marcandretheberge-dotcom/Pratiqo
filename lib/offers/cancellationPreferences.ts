/**
 * Teacher offer cancellation / rescheduling preferences (PR 16A).
 *
 * Teachers define reasonable preferences per offer. Pratiqo displays them and
 * snapshots them onto bookings. Enforcement (refunds, package credits) is PR 16B.
 *
 * Framing: teacher-defined terms within marketplace safety rules — not
 * a platform-imposed “Politique Pratiqo” style rulebook.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md.
 *
 * // Future PR 16B: enforce cancellation/rescheduling preferences for package
 * // credits and paid bookings within Pratiqo marketplace safety rules.
 */

export const TEACHER_OFFER_POLICY_PREFERENCES = [
  "flexible",
  "standard",
  "strict",
  "manual_review",
] as const;

export type TeacherOfferPolicyPreference = (typeof TEACHER_OFFER_POLICY_PREFERENCES)[number];

export const DEFAULT_TEACHER_OFFER_POLICY_PREFERENCE: TeacherOfferPolicyPreference =
  "standard";

/** Hours before session start when learner-initiated cancel/reschedule is preferred. */
export const TEACHER_OFFER_POLICY_NOTICE_HOURS: Record<
  TeacherOfferPolicyPreference,
  number | null
> = {
  flexible: 12,
  standard: 24,
  strict: 48,
  manual_review: null,
};

export function isTeacherOfferPolicyPreference(
  value: string | null | undefined,
): value is TeacherOfferPolicyPreference {
  return (
    value === "flexible" ||
    value === "standard" ||
    value === "strict" ||
    value === "manual_review"
  );
}

export function parseTeacherOfferPolicyPreference(
  value: unknown,
  fallback: TeacherOfferPolicyPreference = DEFAULT_TEACHER_OFFER_POLICY_PREFERENCE,
): TeacherOfferPolicyPreference {
  if (typeof value === "string" && isTeacherOfferPolicyPreference(value)) {
    return value;
  }
  return fallback;
}

export function noticeHoursForTeacherOfferPolicyPreference(
  preference: TeacherOfferPolicyPreference,
): number | null {
  return TEACHER_OFFER_POLICY_NOTICE_HOURS[preference];
}
