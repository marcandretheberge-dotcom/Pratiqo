import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import {
  buildOnboardingRoleChoicePath,
  coerceTeacherNextToRoleChoicePath,
  ONBOARDING_ROLE_CHOICE_PATH,
} from "@/lib/auth/onboardingRoleChoice";

/** Only `teacher` is honored from public URL params; never admin or arbitrary roles. */
export function parsePublicSignUpRoleParam(
  value: string | null | undefined,
): "teacher" | null {
  return value === "teacher" ? "teacher" : null;
}

/** True when the user is entering through a teacher-recruitment or teacher-onboarding path. */
export function hasTeacherOnboardingIntent(
  roleParam: string | null | undefined,
  nextParam: string | null | undefined,
): boolean {
  if (parsePublicSignUpRoleParam(roleParam)) return true;
  const safeNext = sanitizeRelativeRedirectPath(nextParam);
  if (!safeNext) return false;
  if (safeNext === ONBOARDING_ROLE_CHOICE_PATH || safeNext.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
    return safeNext.includes("intent=teacher") || Boolean(roleParam === "teacher");
  }
  return safeNext === "/onboarding/teacher" || safeNext.startsWith("/onboarding/teacher?");
}

/**
 * Resolve the OAuth `next` destination for login flows.
 * Teacher intent routes to the role-choice screen (Professeur emphasized), not directly into teacher onboarding.
 */
export function resolveLoginOAuthNextPath(
  roleParam: string | null | undefined,
  nextParam: string | null | undefined,
  defaultPath = "/dashboard",
): string {
  const safeNext = sanitizeRelativeRedirectPath(nextParam);
  if (hasTeacherOnboardingIntent(roleParam, nextParam)) {
    if (safeNext === ONBOARDING_ROLE_CHOICE_PATH || safeNext?.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
      return safeNext;
    }
    return coerceTeacherNextToRoleChoicePath(safeNext);
  }
  return safeNext ?? defaultPath;
}

/**
 * Teacher intent marker for OAuth callback redirects only — not used to assign profiles.role.
 */
export function resolveSignUpRoleParam(
  roleParam: string | null | undefined,
  nextParam: string | null | undefined,
): string | null {
  if (hasTeacherOnboardingIntent(roleParam, nextParam)) return "teacher";
  return parsePublicSignUpRoleParam(roleParam);
}

/** Build login href for teacher recruitment CTAs (preserves campaign query params). */
export function buildTeacherSignupLoginHref(options?: {
  onboardingQuery?: string;
  extraParams?: Record<string, string>;
}): string {
  const roleChoicePath = options?.onboardingQuery
    ? `${ONBOARDING_ROLE_CHOICE_PATH}?intent=teacher&${options.onboardingQuery}`
    : `${ONBOARDING_ROLE_CHOICE_PATH}?intent=teacher`;
  const login = new URLSearchParams();
  login.set("role", "teacher");
  login.set("next", roleChoicePath);
  if (options?.extraParams) {
    for (const [key, value] of Object.entries(options.extraParams)) {
      login.set(key, value);
    }
  }
  return `/login?${login.toString()}`;
}
