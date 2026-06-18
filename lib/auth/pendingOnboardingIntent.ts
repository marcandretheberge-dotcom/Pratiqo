import {
  parsePublicPreAuthIntent,
  type PreAuthOnboardingIntent,
  resolveLoginOAuthNextPath,
} from "@/lib/auth/preAuthOnboardingIntent";
import {
  hasPendingTeacherIntentFromCookies,
  PENDING_TEACHER_INTENT_COOKIE,
  PENDING_TEACHER_NEXT_COOKIE,
  readPendingTeacherNextFromCookies,
} from "@/lib/auth/pendingTeacherIntent";
import { hasTeacherOnboardingIntent } from "@/lib/auth/teacherOnboardingIntent";

/** Short-lived marker: pre-auth onboarding intent (learner | teacher). */
export const PENDING_ONBOARDING_INTENT_COOKIE = "pratiqo_poi";

const COOKIE_MAX_AGE_SECONDS = 60 * 15;

function cookieBaseAttributes(): string {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function setPendingOnboardingIntentCookie(intent: PreAuthOnboardingIntent): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PENDING_ONBOARDING_INTENT_COOKIE}=${intent}; ${cookieBaseAttributes()}`;
}

export function clearPendingOnboardingIntentCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PENDING_ONBOARDING_INTENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return null;
}

export function readPendingOnboardingIntentClient(): PreAuthOnboardingIntent | null {
  const raw = readCookieValue(PENDING_ONBOARDING_INTENT_COOKIE);
  return raw === "learner" || raw === "teacher" ? raw : null;
}

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function readPendingOnboardingIntentFromCookies(
  cookieReader: CookieReader,
): PreAuthOnboardingIntent | null {
  const raw = cookieReader.get(PENDING_ONBOARDING_INTENT_COOKIE)?.value;
  return raw === "learner" || raw === "teacher" ? raw : null;
}

export function resolvePreAuthIntentFromCallback(input: {
  intentParam: string | null;
  roleParam: string | null;
  nextParam: string | null;
  cookieReader: CookieReader;
}): PreAuthOnboardingIntent | null {
  const fromQuery = parsePublicPreAuthIntent(input.intentParam, input.roleParam);
  if (fromQuery) return fromQuery;

  const fromCookie = readPendingOnboardingIntentFromCookies(input.cookieReader);
  if (fromCookie) return fromCookie;

  if (hasPendingTeacherIntentFromCookies(input.cookieReader) || hasTeacherOnboardingIntent(input.roleParam, input.nextParam)) {
    return "teacher";
  }

  return null;
}

export function resolveAuthCallbackParams(
  requestUrl: URL,
  cookieReader: CookieReader,
): { role: string | null; next: string; ref: string | null; intent: PreAuthOnboardingIntent | null } {
  const intentParam = requestUrl.searchParams.get("intent");
  let role = requestUrl.searchParams.get("role");
  let next = requestUrl.searchParams.get("next");
  const ref = requestUrl.searchParams.get("ref");

  const intent = resolvePreAuthIntentFromCallback({
    intentParam,
    roleParam: role,
    nextParam: next,
    cookieReader,
  });

  if (intent === "teacher") {
    role = "teacher";
    if (!next || !hasTeacherOnboardingIntent(role, next)) {
      next = readPendingTeacherNextFromCookies(cookieReader) ?? "/onboarding/teacher";
    }
  } else if (intent === "learner") {
    next = "/student/choose-companion";
  } else if (hasPendingTeacherIntentFromCookies(cookieReader)) {
    role = "teacher";
    next = readPendingTeacherNextFromCookies(cookieReader) ?? "/onboarding/teacher";
  }

  const safeNext = resolveLoginOAuthNextPath(role, next, intent);
  return { role, next: safeNext, ref, intent };
}

export function pendingOnboardingIntentClearCookieHeaders(): Array<{
  name: string;
  value: string;
  options: { path: string; maxAge: number };
}> {
  return [
    { name: PENDING_ONBOARDING_INTENT_COOKIE, value: "", options: { path: "/", maxAge: 0 } },
    { name: PENDING_TEACHER_INTENT_COOKIE, value: "", options: { path: "/", maxAge: 0 } },
    { name: PENDING_TEACHER_NEXT_COOKIE, value: "", options: { path: "/", maxAge: 0 } },
  ];
}
