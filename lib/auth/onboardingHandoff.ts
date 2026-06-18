import { readPendingOnboardingIntentClient } from "@/lib/auth/pendingOnboardingIntent";
import { hasPendingTeacherIntentClient } from "@/lib/auth/pendingTeacherIntent";

/** Client-only: pending OAuth/onboarding handoff still in progress. */
export function hasActiveOnboardingHandoffClient(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(readPendingOnboardingIntentClient()) || hasPendingTeacherIntentClient();
}
