import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { buildOnboardingRoleChoicePath, ONBOARDING_ROLE_CHOICE_PATH } from "@/lib/auth/onboardingRoleChoice";
import { hasTeacherOnboardingIntent, resolveLoginOAuthNextPath } from "@/lib/auth/teacherOnboardingIntent";

/** Short-lived marker: user started teacher signup (no PII). */
export const PENDING_TEACHER_INTENT_COOKIE = "pratiqo_pte";
/** Safe internal post-auth path for teacher onboarding. */
export const PENDING_TEACHER_NEXT_COOKIE = "pratiqo_pte_next";

const COOKIE_MAX_AGE_SECONDS = 60 * 15;

function cookieBaseAttributes(): string {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** Client: persist teacher intent before Google OAuth (survives stripped callback query params). */
export function setPendingTeacherOnboardingCookie(nextPath: string): void {
  if (typeof document === "undefined") return;
  const safeNext = sanitizeRelativeRedirectPath(nextPath) ?? "/onboarding/choose-role?intent=teacher";
  document.cookie = `${PENDING_TEACHER_INTENT_COOKIE}=1; ${cookieBaseAttributes()}`;
  document.cookie = `${PENDING_TEACHER_NEXT_COOKIE}=${encodeURIComponent(safeNext)}; ${cookieBaseAttributes()}`;
}

export function clearPendingTeacherOnboardingCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PENDING_TEACHER_INTENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${PENDING_TEACHER_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

export function hasPendingTeacherIntentClient(): boolean {
  return readCookieValue(PENDING_TEACHER_INTENT_COOKIE) === "1";
}

export function readPendingTeacherNextClient(): string | null {
  return sanitizeRelativeRedirectPath(readCookieValue(PENDING_TEACHER_NEXT_COOKIE));
}

export function resolveLoginHrefWithPendingTeacherIntent(defaultHref = "/login"): string {
  if (!hasPendingTeacherIntentClient()) return defaultHref;
  const next = readPendingTeacherNextClient() ?? buildOnboardingRoleChoicePath(true);
  const params = new URLSearchParams();
  params.set("role", "teacher");
  params.set("next", next);
  return `/login?${params.toString()}`;
}

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function readPendingTeacherNextFromCookies(cookieReader: CookieReader): string | null {
  const raw = cookieReader.get(PENDING_TEACHER_NEXT_COOKIE)?.value;
  if (!raw) return null;
  try {
    return sanitizeRelativeRedirectPath(decodeURIComponent(raw));
  } catch {
    return sanitizeRelativeRedirectPath(raw);
  }
}

export function hasPendingTeacherIntentFromCookies(cookieReader: CookieReader): boolean {
  return cookieReader.get(PENDING_TEACHER_INTENT_COOKIE)?.value === "1";
}

/** Merge callback query params with pending teacher-intent cookies. */
export function resolveAuthCallbackParams(
  requestUrl: URL,
  cookieReader: CookieReader,
): { role: string | null; next: string; ref: string | null } {
  let role = requestUrl.searchParams.get("role");
  let next = requestUrl.searchParams.get("next");
  const ref = requestUrl.searchParams.get("ref");

  const pending = hasPendingTeacherIntentFromCookies(cookieReader);
  const pendingNext = readPendingTeacherNextFromCookies(cookieReader);

  if (pending || pendingNext) {
    if (!hasTeacherOnboardingIntent(role, next)) {
      role = "teacher";
      next = pendingNext ?? buildOnboardingRoleChoicePath(true);
    } else if (!next && pendingNext) {
      next = pendingNext;
    }
  }

  const safeNext = resolveLoginOAuthNextPath(role, next);
  return { role, next: safeNext, ref };
}

export function pendingTeacherIntentClearCookieHeaders(): Array<{
  name: string;
  value: string;
  options: { path: string; maxAge: number };
}> {
  return [
    { name: PENDING_TEACHER_INTENT_COOKIE, value: "", options: { path: "/", maxAge: 0 } },
    { name: PENDING_TEACHER_NEXT_COOKIE, value: "", options: { path: "/", maxAge: 0 } },
  ];
}
