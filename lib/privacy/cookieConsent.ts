/**
 * Browser-side cookie / local-storage consent source of truth.
 *
 * SSR-safe: every exported reader returns conservative defaults on the server.
 * Storage uses first-party localStorage with defensive try/catch so Safari,
 * iOS Safari, and private contexts fail closed instead of crashing.
 */

import type { Locale } from "@/lib/i18n/types";

export const COOKIE_CONSENT_STORAGE_KEY = "pratiqo_cookie_consent_v1" as const;
export const COOKIE_CONSENT_VERSION = 1 as const;
export const COOKIE_CONSENT_EVENT = "pratiqo:cookie-consent" as const;
export const OPEN_COOKIE_PREFERENCES_EVENT = "pratiqo:open-cookie-preferences" as const;

export type CookieConsentSource = "banner" | "preferences";

export type CookieConsent = {
  version: typeof COOKIE_CONSENT_VERSION;
  necessary: true;
  analytics: boolean;
  diagnostics: boolean;
  locale: Locale;
  updatedAt: string;
  source: CookieConsentSource;
};

export type CookieConsentInput = {
  analytics: boolean;
  diagnostics: boolean;
  locale: Locale;
  source: CookieConsentSource;
};

const ANALYTICS_STORAGE_KEYS = ["pratiqo_search_anon_id"] as const;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage;
    const probe = "__pratiqo_cookie_consent_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.necessary !== true) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.diagnostics !== "boolean") return null;
    if (parsed.locale !== "fr" && parsed.locale !== "en" && parsed.locale !== "es") return null;
    if (typeof parsed.updatedAt !== "string" || !parsed.updatedAt.trim()) return null;
    if (parsed.source !== "banner" && parsed.source !== "preferences") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: parsed.analytics,
      diagnostics: parsed.diagnostics,
      locale: parsed.locale,
      updatedAt: parsed.updatedAt,
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieConsent | null {
  const s = storage();
  if (!s) return null;
  return parseConsent(s.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

export function hasRecordedCookieConsent(): boolean {
  return readCookieConsent() !== null;
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.analytics === true;
}

export function hasDiagnosticsConsent(): boolean {
  // Diagnostics are errors-only and necessary for reliability at launch, but
  // this still reads the stored choice so future legal/product changes can make
  // it configurable without changing call-sites.
  return readCookieConsent()?.diagnostics !== false;
}

export function clearAnalyticsPersistence(): void {
  const s = storage();
  if (!s) return;
  for (const key of ANALYTICS_STORAGE_KEYS) {
    try {
      s.removeItem(key);
    } catch {
      /* storage can be unavailable in private contexts */
    }
  }
}

export function writeCookieConsent(input: CookieConsentInput): CookieConsent | null {
  const s = storage();
  if (!s) return null;
  const record: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: input.analytics,
    diagnostics: input.diagnostics,
    locale: input.locale,
    updatedAt: new Date().toISOString(),
    source: input.source,
  };
  try {
    s.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
    if (!record.analytics) clearAnalyticsPersistence();
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: record }));
    return record;
  } catch {
    return null;
  }
}

export function acceptAllCookieConsent(locale: Locale, source: CookieConsentSource = "banner"): CookieConsent | null {
  return writeCookieConsent({
    analytics: true,
    diagnostics: true,
    locale,
    source,
  });
}

export function acceptNecessaryOnlyCookieConsent(
  locale: Locale,
  source: CookieConsentSource = "banner",
): CookieConsent | null {
  return writeCookieConsent({
    analytics: false,
    diagnostics: true,
    locale,
    source,
  });
}

export function clearCookieConsentForTesting(): void {
  const s = storage();
  if (!s || typeof window === "undefined") return;
  try {
    s.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    clearAnalyticsPersistence();
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: null }));
  } catch {
    /* ignore */
  }
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT));
}
