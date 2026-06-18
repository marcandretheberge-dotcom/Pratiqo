import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { hasTeacherOnboardingIntent } from "@/lib/auth/teacherOnboardingIntent";

export const ONBOARDING_ROLE_CHOICE_PATH = "/onboarding/choose-role";

export function isOnboardingRoleConfirmed(dashboard: unknown): boolean {
  if (typeof dashboard !== "object" || dashboard === null || Array.isArray(dashboard)) return false;
  return (dashboard as Record<string, unknown>).onboarding_role_confirmed === true;
}

export function needsOnboardingRoleChoice(profile: {
  role?: string | null;
  companion_chosen?: boolean | null;
  teacher_onboarding_complete?: boolean | null;
  dashboard?: unknown;
}): boolean {
  if (profile.role === "admin") return false;
  if (isOnboardingRoleConfirmed(profile.dashboard)) return false;
  if (profile.role === "teacher") return false;
  if (profile.companion_chosen) return false;
  if (profile.teacher_onboarding_complete) return false;
  return true;
}

export function hasTeacherRoleChoiceIntent(
  roleParam: string | null | undefined,
  nextParam: string | null | undefined,
  intentParam: string | null | undefined,
): boolean {
  if (intentParam === "teacher") return true;
  return hasTeacherOnboardingIntent(roleParam, nextParam);
}

export function buildOnboardingRoleChoicePath(teacherIntent = false): string {
  return teacherIntent ? `${ONBOARDING_ROLE_CHOICE_PATH}?intent=teacher` : ONBOARDING_ROLE_CHOICE_PATH;
}

/** Map teacher onboarding/recruitment `next` paths onto the role-choice screen, preserving safe query params. */
export function coerceTeacherNextToRoleChoicePath(nextParam: string | null | undefined): string {
  const safeNext = sanitizeRelativeRedirectPath(nextParam);
  if (!safeNext) return buildOnboardingRoleChoicePath(true);
  if (safeNext === ONBOARDING_ROLE_CHOICE_PATH || safeNext.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
    return safeNext;
  }
  if (safeNext.startsWith("/onboarding/teacher?")) {
    const params = new URLSearchParams(safeNext.split("?")[1] ?? "");
    const vertical = params.get("vertical");
    if (vertical) {
      const out = new URLSearchParams({ intent: "teacher", vertical });
      return `${ONBOARDING_ROLE_CHOICE_PATH}?${out.toString()}`;
    }
  }
  return buildOnboardingRoleChoicePath(true);
}

/** Normalize post-auth `next` for users who still need the role-choice screen. */
export function resolveRoleChoiceRedirectPath(
  roleParam: string | null | undefined,
  nextParam: string | null | undefined,
  intentParam?: string | null,
): string {
  const safeNext = sanitizeRelativeRedirectPath(nextParam);
  if (safeNext === ONBOARDING_ROLE_CHOICE_PATH || safeNext?.startsWith(`${ONBOARDING_ROLE_CHOICE_PATH}?`)) {
    return safeNext;
  }
  if (hasTeacherRoleChoiceIntent(roleParam, nextParam, intentParam ?? null)) {
    return coerceTeacherNextToRoleChoicePath(safeNext);
  }
  return ONBOARDING_ROLE_CHOICE_PATH;
}

export function mergeOnboardingRoleConfirmedDashboard(existing: unknown): Record<string, unknown> {
  const base =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  base.onboarding_role_confirmed = true;
  return base;
}
