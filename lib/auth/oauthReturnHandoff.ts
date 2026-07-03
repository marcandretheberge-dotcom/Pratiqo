import type { PreAuthOnboardingIntent } from "@/lib/auth/preAuthOnboardingIntent";

const OAUTH_RETURN_KEY = "pratiqo_oauth_return";
const OAUTH_INTENT_KEY = "pratiqo_oauth_intent";

function readIntent(raw: string | null): PreAuthOnboardingIntent | null {
  return raw === "learner" || raw === "teacher" ? raw : null;
}

/** Mark that the browser initiated Google OAuth and should recover on landing if needed. */
export function markOAuthReturnPending(intent?: PreAuthOnboardingIntent | null): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(OAUTH_RETURN_KEY, "1");
  if (intent) {
    sessionStorage.setItem(OAUTH_INTENT_KEY, intent);
  } else {
    sessionStorage.removeItem(OAUTH_INTENT_KEY);
  }
}

export function hasOAuthReturnPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(OAUTH_RETURN_KEY) === "1";
}

export function readOAuthReturnIntent(): PreAuthOnboardingIntent | null {
  if (typeof sessionStorage === "undefined") return null;
  return readIntent(sessionStorage.getItem(OAUTH_INTENT_KEY));
}

export function clearOAuthReturnPending(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(OAUTH_RETURN_KEY);
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
}

export function subscribeToOAuthReturn(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("pratiqo-oauth-return", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("pratiqo-oauth-return", handler);
  };
}

export function notifyOAuthReturnChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("pratiqo-oauth-return"));
}
