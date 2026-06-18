import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { ONBOARDING_ROLE_CHOICE_PATH } from "@/lib/auth/onboardingRoleChoice";
import {
  buildConnexionHref,
  buildLoginHrefWithPreAuthIntent,
  parsePublicPreAuthIntent,
  resolveLoginOAuthNextPath,
} from "@/lib/auth/preAuthOnboardingIntent";

export { resolveLoginOAuthNextPath };

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
  if (parsePublicPreAuthIntent(null, roleParam) === "teacher") return true;
  const safeNext = sanitizeRelativeRedirectPath(nextParam);
  if (!safeNext) return false;
  if (safeNext === ONBOARDING_ROLE_CHOICE_PATH || safeNext.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
    return safeNext.includes("intent=teacher") || Boolean(roleParam === "teacher");
  }
  return safeNext === "/onboarding/teacher" || safeNext.startsWith("/onboarding/teacher?");
}

export function resolveSignUpRoleParam(
  roleParam: string | null | undefined,
  nextParam: string | null | undefined,
): string | null {
  if (hasTeacherOnboardingIntent(roleParam, nextParam)) return "teacher";
  return parsePublicSignUpRoleParam(roleParam);
}

/** Teacher recruitment CTAs → pre-auth connexion with Professeur emphasized. */
export function buildTeacherSignupLoginHref(options?: {
  onboardingQuery?: string;
  extraParams?: Record<string, string>;
}): string {
  const href = buildConnexionHref("teacher");
  if (!options?.onboardingQuery && !options?.extraParams) return href;
  const params = new URLSearchParams(href.includes("?") ? href.split("?")[1] : "");
  if (options.onboardingQuery) {
    for (const part of options.onboardingQuery.split("&")) {
      const [key, value] = part.split("=");
      if (key) params.set(key, value ?? "");
    }
  }
  if (options.extraParams) {
    for (const [key, value] of Object.entries(options.extraParams)) {
      params.set(key, value);
    }
  }
  return `${buildConnexionHref("teacher").split("?")[0]}?${params.toString()}`;
}

/** Direct login href when pre-auth connexion was already completed. */
export function buildTeacherLoginHref(): string {
  return buildLoginHrefWithPreAuthIntent("teacher");
}
