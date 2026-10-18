"use client";

import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import { hasStudentOnboardingConsent } from "@/lib/auth/studentOnboardingConsent";
import { LearningProjectCard } from "./LearningProjectCard";

/** Content only: never redirects or changes the existing auth/consent gates. */
export function StudentLearningProject({
  manage = false,
  hidden = false,
  onSearchPage = false,
}: {
  manage?: boolean;
  hidden?: boolean;
  onSearchPage?: boolean;
}) {
  const { user, profile, profileHydrated } = useAuth();
  const { locale } = useLocale();
  if (
    hidden ||
    !user ||
    !profileHydrated ||
    profile?.role !== "student" ||
    profile.companion_chosen !== true ||
    !hasStudentOnboardingConsent(profile)
  )
    return null;
  return (
    <LearningProjectCard
      key={user.id}
      userId={user.id}
      locale={locale}
      manage={manage}
      onSearchPage={onSearchPage}
    />
  );
}
