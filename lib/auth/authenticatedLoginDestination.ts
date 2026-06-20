import { resolvePostAuthRedirect, type ProfileRole } from "@/lib/auth/postAuthRedirect";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";

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

export function resolveAuthenticatedLoginDestination(
  profile: AuthenticatedLoginProfile | null | undefined,
  nextPath?: string | null,
): string {
  const safeNext = sanitizeRelativeRedirectPath(nextPath);
  const role = normalizeAuthenticatedRole(profile?.role);

  if (!role) return safeNext ?? "/dashboard";

  return resolvePostAuthRedirect(
    role,
    {
      teacher_onboarding_complete: profile?.teacher_onboarding_complete,
      companion_chosen: profile?.companion_chosen,
      student_onboarding_consent_completed_at: profile?.student_onboarding_consent_completed_at,
      student_onboarding_consent_version: profile?.student_onboarding_consent_version,
      dashboard: profile?.dashboard,
    },
    safeNext,
  );
}
