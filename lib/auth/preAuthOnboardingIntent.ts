import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import type { ProfileRole } from "@/lib/auth/postAuthRedirect";
import { mergeOnboardingRoleConfirmedDashboard, ONBOARDING_ROLE_CHOICE_PATH } from "@/lib/auth/onboardingRoleChoice";
import { hasTeacherOnboardingIntent } from "@/lib/auth/teacherOnboardingIntent";

export type PreAuthOnboardingIntent = "learner" | "teacher";

export const CONNEXION_PATH = "/connexion";

/** Public URL intents only — never admin or arbitrary roles. */
export function parsePublicPreAuthIntent(
  intentParam: string | null | undefined,
  roleParam?: string | null | undefined,
): PreAuthOnboardingIntent | null {
  if (intentParam === "learner") return "learner";
  if (intentParam === "teacher") return "teacher";
  if (roleParam === "teacher") return "teacher";
  return null;
}

export function oauthNextPathForPreAuthIntent(intent: PreAuthOnboardingIntent): string {
  return intent === "teacher" ? "/onboarding/teacher" : "/student/choose-companion";
}

export function buildLoginHrefWithPreAuthIntent(intent: PreAuthOnboardingIntent): string {
  return `/login?intent=${intent}`;
}

export function buildConnexionHref(highlightIntent?: PreAuthOnboardingIntent | null): string {
  if (highlightIntent) return `${CONNEXION_PATH}?intent=${highlightIntent}`;
  return CONNEXION_PATH;
}

/**
 * Apply pre-auth intent to the persisted primary role.
 * Never downgrades admin or existing teachers choosing learner path.
 */
export function primaryRoleForPreAuthIntent(
  intent: PreAuthOnboardingIntent,
  existingRole: string | null | undefined,
): ProfileRole {
  if (existingRole === "admin") return "admin";
  if (intent === "teacher") return "teacher";
  if (existingRole === "teacher") return "teacher";
  return "student";
}

export function resolveLoginOAuthNextPath(
  roleParam: string | null | undefined,
  nextParam: string | null | undefined,
  intentParam?: string | null,
  defaultPath = "/dashboard",
): string {
  const intent = parsePublicPreAuthIntent(intentParam, roleParam);
  const safeNext = sanitizeRelativeRedirectPath(nextParam);

  if (intent === "teacher") {
    if (safeNext === "/onboarding/teacher" || safeNext?.startsWith("/onboarding/teacher?")) {
      return safeNext;
    }
    if (safeNext?.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
      const params = new URLSearchParams(safeNext.split("?")[1] ?? "");
      const vertical = params.get("vertical");
      if (vertical) return `/onboarding/teacher?vertical=${encodeURIComponent(vertical)}`;
    }
    return oauthNextPathForPreAuthIntent("teacher");
  }

  if (intent === "learner") {
    return oauthNextPathForPreAuthIntent("learner");
  }

  if (hasTeacherOnboardingIntent(roleParam, nextParam)) {
    if (safeNext === "/onboarding/teacher" || safeNext?.startsWith("/onboarding/teacher?")) {
      return safeNext;
    }
    return "/onboarding/teacher";
  }
  if (safeNext === ONBOARDING_ROLE_CHOICE_PATH || safeNext?.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
    return safeNext;
  }
  return safeNext ?? defaultPath;
}

/** Apply explicit pre-auth intent to persisted profile fields after OAuth. */
export function resolveOAuthProfilePatch(input: {
  intent: PreAuthOnboardingIntent | null;
  existingRole: string | null | undefined;
  existingDashboard: unknown;
}): { role: ProfileRole; dashboard: Record<string, unknown> } | null {
  if (!input.intent) return null;
  return {
    role: primaryRoleForPreAuthIntent(input.intent, input.existingRole),
    dashboard: mergeOnboardingRoleConfirmedDashboard(input.existingDashboard),
  };
}
