import {
  sanitizeAdminRedirectPath,
  sanitizeRelativeRedirectPath,
} from "@/lib/auth/redirects";

export type ProfileRole = "student" | "teacher" | "admin";

export function resolvePostAuthRedirect(
  role: ProfileRole,
  profile: {
    teacher_onboarding_complete?: boolean | null;
    companion_chosen?: boolean | null;
  },
  nextPath?: string | null,
): string {
  const safeNext = sanitizeRelativeRedirectPath(nextPath);

  if (role === "admin") {
    return sanitizeAdminRedirectPath(safeNext) ?? "/admin";
  }
  if (role === "teacher") {
    if (!profile.teacher_onboarding_complete) return "/onboarding/teacher";
    return safeNext ?? "/dashboard";
  }
  if (!profile.companion_chosen) return "/student/choose-companion";
  return safeNext ?? "/dashboard";
}
