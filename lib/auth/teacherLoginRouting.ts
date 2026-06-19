import type { PreAuthOnboardingIntent } from "@/lib/auth/preAuthOnboardingIntent";
import { isOnboardingRoleConfirmed } from "@/lib/auth/onboardingRoleChoice";

/** Teacher should never see Apprenant/Professeur again after intent or role is known. */
export function shouldBypassTeacherRoleChoice(input: {
  profileRole?: string | null;
  pendingIntent?: PreAuthOnboardingIntent | null;
  dashboard?: unknown;
}): boolean {
  if (input.profileRole === "teacher") return true;
  if (input.pendingIntent === "teacher") return true;
  if (isOnboardingRoleConfirmed(input.dashboard) && input.profileRole === "teacher") return true;
  return false;
}

export const TEACHER_SETUP_PATH = "/teacher/verification?setup=1";

export function teacherSetupSectionHref(section: string): string {
  return `/teacher/verification?setup=1&section=${encodeURIComponent(section)}`;
}
