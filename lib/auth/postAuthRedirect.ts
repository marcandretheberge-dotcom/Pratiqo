import {
  sanitizeAdminRedirectPath,
  sanitizeRelativeRedirectPath,
} from "@/lib/auth/redirects";
import {
  needsOnboardingRoleChoice,
  ONBOARDING_ROLE_CHOICE_PATH,
  resolveRoleChoiceRedirectPath,
} from "@/lib/auth/onboardingRoleChoice";
import { hasTeacherOnboardingIntent } from "@/lib/auth/teacherOnboardingIntent";

export type ProfileRole = "student" | "teacher" | "admin";

export function resolvePostAuthRedirect(
  role: ProfileRole,
  profile: {
    teacher_onboarding_complete?: boolean | null;
    companion_chosen?: boolean | null;
    dashboard?: unknown;
  },
  nextPath?: string | null,
): string {
  const safeNext = sanitizeRelativeRedirectPath(nextPath);

  if (role === "admin") {
    return sanitizeAdminRedirectPath(safeNext) ?? "/admin";
  }

  if (needsOnboardingRoleChoice({ role, ...profile })) {
    if (safeNext === ONBOARDING_ROLE_CHOICE_PATH || safeNext?.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
      return safeNext;
    }
    const teacherIntent = hasTeacherOnboardingIntent(null, safeNext);
    return resolveRoleChoiceRedirectPath(null, safeNext, teacherIntent ? "teacher" : null);
  }

  if (role === "teacher") {
    if (!profile.teacher_onboarding_complete) return "/onboarding/teacher";
    return safeNext ?? "/dashboard";
  }
  if (!profile.companion_chosen) return "/student/choose-companion";
  return safeNext ?? "/dashboard";
}
