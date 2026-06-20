export const STUDENT_ONBOARDING_CONSENT_VERSION = "student_onboarding_consent_v1_2026_06";

export type StudentOnboardingConsentActorType = "self_14_plus" | "parent_guardian";

export function isStudentOnboardingConsentActorType(
  value: unknown,
): value is StudentOnboardingConsentActorType {
  return value === "self_14_plus" || value === "parent_guardian";
}

export function hasStudentOnboardingConsent(profile: {
  student_onboarding_consent_completed_at?: unknown;
  student_onboarding_consent_version?: unknown;
} | null | undefined): boolean {
  return (
    typeof profile?.student_onboarding_consent_completed_at === "string" &&
    profile.student_onboarding_consent_completed_at.length > 0 &&
    profile.student_onboarding_consent_version === STUDENT_ONBOARDING_CONSENT_VERSION
  );
}
