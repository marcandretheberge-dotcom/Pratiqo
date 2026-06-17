import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";

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
  return safeNext === "/onboarding/teacher" || safeNext.startsWith("/onboarding/teacher?");
}

/**
 * Resolve the OAuth `next` destination for login flows.
 * Teacher intent defaults to `/onboarding/teacher` instead of `/dashboard`.
 */
export function resolveLoginOAuthNextPath(
  roleParam: string | null | undefined,
  nextParam: string | null | undefined,
  defaultPath = "/dashboard",
): string {
  const safeNext = sanitizeRelativeRedirectPath(nextParam);
  if (hasTeacherOnboardingIntent(roleParam, nextParam)) {
    return safeNext ?? "/onboarding/teacher";
  }
  return safeNext ?? defaultPath;
}

/**
 * Role param forwarded into OAuth / auth callback.
 * Honors teacher intent from `role=teacher` or safe `next=/onboarding/teacher`.
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
  const onboardingPath = options?.onboardingQuery
    ? `/onboarding/teacher?${options.onboardingQuery}`
    : "/onboarding/teacher";
  const login = new URLSearchParams();
  login.set("role", "teacher");
  login.set("next", onboardingPath);
  if (options?.extraParams) {
    for (const [key, value] of Object.entries(options.extraParams)) {
      login.set(key, value);
    }
  }
  return `/login?${login.toString()}`;
}
