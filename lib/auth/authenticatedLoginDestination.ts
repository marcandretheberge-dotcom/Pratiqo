import { CONNEXION_PATH } from "@/lib/auth/preAuthOnboardingIntent";
import { guardAuthRedirectPath } from "@/lib/auth/oauthCallbackRedirect";
import { resolvePostAuthRedirect, type ProfileRole } from "@/lib/auth/postAuthRedirect";
import {
  oauthNextPathForPreAuthIntent,
  type PreAuthOnboardingIntent,
} from "@/lib/auth/preAuthOnboardingIntent";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { hasStudentOnboardingConsent } from "@/lib/auth/studentOnboardingConsent";

export type AuthenticatedLoginProfile = {
  role?: string | null;
  teacher_onboarding_complete?: boolean | null;
  companion_chosen?: boolean | null;
  student_onboarding_consent_completed_at?: string | null;
  student_onboarding_consent_version?: string | null;
  dashboard?: unknown;
};

export function normalizeAuthenticatedRole(role: string | null | undefined): ProfileRole | null {
  if (role === "admin" || role === "teacher" || role === "student") return role;
  return null;
}

function profileForPostAuthRedirect(profile: AuthenticatedLoginProfile | null | undefined) {
  return {
    teacher_onboarding_complete: profile?.teacher_onboarding_complete,
    companion_chosen: profile?.companion_chosen,
    student_onboarding_consent_completed_at: profile?.student_onboarding_consent_completed_at,
    student_onboarding_consent_version: profile?.student_onboarding_consent_version,
    dashboard: profile?.dashboard,
  };
}

function isOnboardingFunnelPath(path: string | null, role: ProfileRole): boolean {
  if (!path) return false;
  if (role === "teacher") {
    return path === "/onboarding/teacher" || path.startsWith("/onboarding/teacher?");
  }
  return (
    path === "/student/choose-companion" ||
    path.startsWith("/student/choose-companion") ||
    path === "/student/consent" ||
    path.startsWith("/student/consent")
  );
}

function resolveSafeNextForPostLogin(input: {
  profile: AuthenticatedLoginProfile | null | undefined;
  preAuthIntent?: PreAuthOnboardingIntent | null;
  nextPath?: string | null;
  oauthNextPath?: string | null;
  role: ProfileRole | null;
}): string | null {
  const explicitNext = sanitizeRelativeRedirectPath(input.nextPath);
  const fallbackNext =
    sanitizeRelativeRedirectPath(input.oauthNextPath) ??
    (input.preAuthIntent ? oauthNextPathForPreAuthIntent(input.preAuthIntent) : null);
  const profileSnapshot = profileForPostAuthRedirect(input.profile);

  if (input.preAuthIntent && input.role === "teacher" && profileSnapshot.teacher_onboarding_complete) {
    if (explicitNext && !isOnboardingFunnelPath(explicitNext, "teacher")) return explicitNext;
    return null;
  }

  if (
    input.preAuthIntent &&
    input.role === "student" &&
    profileSnapshot.companion_chosen === true &&
    hasStudentOnboardingConsent(profileSnapshot)
  ) {
    if (explicitNext && !isOnboardingFunnelPath(explicitNext, "student")) return explicitNext;
    return null;
  }

  return explicitNext ?? fallbackNext;
}

/** Single client/server-safe resolver for post-login and post-OAuth handoff destinations. */
export function resolvePostLoginDestination(input: {
  profile: AuthenticatedLoginProfile | null | undefined;
  preAuthIntent?: PreAuthOnboardingIntent | null;
  nextPath?: string | null;
  oauthNextPath?: string | null;
}): string {
  const role = normalizeAuthenticatedRole(input.profile?.role);
  const profileSnapshot = profileForPostAuthRedirect(input.profile);
  const safeNext = resolveSafeNextForPostLogin({ ...input, role });

  if (input.preAuthIntent && role) {
    const path = resolvePostAuthRedirect(
      role,
      profileSnapshot,
      safeNext,
      { preAuthIntentConsumed: input.preAuthIntent },
    );
    return guardAuthRedirectPath(path, input.preAuthIntent);
  }

  if (!role) {
    return guardAuthRedirectPath(safeNext ?? CONNEXION_PATH, input.preAuthIntent ?? null);
  }

  const path = resolvePostAuthRedirect(role, profileSnapshot, safeNext);
  return guardAuthRedirectPath(path, input.preAuthIntent ?? null);
}

export function resolveAuthenticatedLoginDestination(
  profile: AuthenticatedLoginProfile | null | undefined,
  nextPath?: string | null,
  preAuthIntent?: PreAuthOnboardingIntent | null,
  oauthNextPath?: string | null,
): string {
  return resolvePostLoginDestination({
    profile,
    preAuthIntent,
    nextPath,
    oauthNextPath,
  });
}
