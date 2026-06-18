import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { buildLoginHrefWithPreAuthIntent } from "@/lib/auth/preAuthOnboardingIntent";

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
  const safeNext = sanitizeRelativeRedirectPath(nextPath) ?? "/onboarding/teacher";
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

export function resolveLoginHrefWithPendingTeacherIntent(defaultHref = "/connexion"): string {
  if (!hasPendingTeacherIntentClient()) return defaultHref;
  const next = readPendingTeacherNextClient() ?? "/onboarding/teacher";
  return buildLoginHrefWithPreAuthIntent("teacher") + (next.includes("?") ? `&next=${encodeURIComponent(next)}` : "");
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

export {
  resolveAuthCallbackParams,
  pendingOnboardingIntentClearCookieHeaders as pendingTeacherIntentClearCookieHeaders,
} from "@/lib/auth/pendingOnboardingIntent";
