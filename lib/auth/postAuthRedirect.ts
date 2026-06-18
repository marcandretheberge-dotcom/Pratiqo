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
import type { PreAuthOnboardingIntent } from "@/lib/auth/preAuthOnboardingIntent";

export type ProfileRole = "student" | "teacher" | "admin";

export type PostAuthRedirectOptions = {
  /** When set, pre-auth role was already chosen — never funnel to choose-role again. */
  preAuthIntentConsumed?: PreAuthOnboardingIntent | null;
};

export function resolvePostAuthRedirect(
  role: ProfileRole,
  profile: {
    teacher_onboarding_complete?: boolean | null;
    companion_chosen?: boolean | null;
    dashboard?: unknown;
  },
  nextPath?: string | null,
  options?: PostAuthRedirectOptions,
): string {
  const safeNext = sanitizeRelativeRedirectPath(nextPath);

  if (role === "admin") {
    return sanitizeAdminRedirectPath(safeNext) ?? "/admin";
  }

  if (options?.preAuthIntentConsumed) {
    if (role === "teacher") {
      if (safeNext?.startsWith("/onboarding/teacher")) return safeNext;
      if (safeNext?.startsWith("/student")) return "/dashboard";
      return safeNext ?? "/dashboard";
    }
    if (profile.companion_chosen !== true) {
      return safeNext === "/student/choose-companion" ? safeNext : "/student/choose-companion";
    }
    return safeNext ?? "/dashboard";
  }

  if (needsOnboardingRoleChoice({ role, ...profile })) {
    if (safeNext === ONBOARDING_ROLE_CHOICE_PATH || safeNext?.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
      return safeNext;
    }
    const teacherIntent = hasTeacherOnboardingIntent(null, safeNext);
    return resolveRoleChoiceRedirectPath(null, safeNext, teacherIntent ? "teacher" : null);
  }

  if (role === "teacher") {
    if (safeNext?.startsWith("/onboarding/teacher")) return safeNext;
    if (safeNext?.startsWith("/student")) return "/dashboard";
    return safeNext ?? "/dashboard";
  }
  if (profile.companion_chosen !== true) return "/student/choose-companion";
  return safeNext ?? "/dashboard";
}
