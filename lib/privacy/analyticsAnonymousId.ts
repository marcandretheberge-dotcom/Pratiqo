/**
 * Shared anonymous analytics id — only created/persisted after analytics consent.
 */

import { hasAnalyticsConsent } from "@/lib/privacy/cookieConsent";

export const ANALYTICS_ANON_STORAGE_KEY = "pratiqo_search_anon_id" as const;

export function getAnalyticsAnonymousId(): string {
  if (typeof window === "undefined") return "";
  if (!hasAnalyticsConsent()) return "";
  try {
    const existing = window.localStorage.getItem(ANALYTICS_ANON_STORAGE_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(ANALYTICS_ANON_STORAGE_KEY, id);
    return id;
  } catch {
    return "";
  }
}
