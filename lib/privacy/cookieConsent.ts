/**
 * Browser-side cookie / local-storage consent source of truth.
 *
 * SSR-safe: every exported reader returns conservative defaults on the server.
 * Storage uses localStorage with defensive try/catch (Safari private mode, ITP).
 */

export const COOKIE_CONSENT_STORAGE_KEY = "pratiqo_cookie_consent_v1" as const;
export const COOKIE_CONSENT_VERSION = 1 as const;

export type CookieConsentSource = "banner" | "preferences";

export type CookieConsent = {
  version: typeof COOKIE_CONSENT_VERSION;
  necessary: true;
  analytics: boolean;
  diagnostics: boolean;
  locale: string;
  updatedAt: string;
  source: CookieConsentSource;
};

export type CookieConsentInput = {
  analytics: boolean;
  diagnostics: boolean;
  locale: string;
  source: CookieConsentSource;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.necessary !== true) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.diagnostics !== "boolean") return null;
    if (typeof parsed.locale !== "string" || !parsed.locale.trim()) return null;
    if (typeof parsed.updatedAt !== "string" || !parsed.updatedAt.trim()) return null;
    if (parsed.source !== "banner" && parsed.source !== "preferences") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: parsed.analytics,
      diagnostics: parsed.diagnostics,
      locale: parsed.locale.trim(),
      updatedAt: parsed.updatedAt,
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

/** Read stored consent. Returns null when absent or invalid (SSR → null). */
export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** True when the user has saved a valid consent record. */
export function hasRecordedCookieConsent(): boolean {
  return readCookieConsent() !== null;
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.analytics === true;
}

export function hasDiagnosticsConsent(): boolean {
  return readCookieConsent()?.diagnostics === true;
}

/** Persist consent. No-op on server or when storage is unavailable. */
export function writeCookieConsent(input: CookieConsentInput): CookieConsent | null {
  if (typeof window === "undefined") return null;
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
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent("pratiqo:cookie-consent", { detail: record }));
    return record;
  } catch {
    return null;
  }
}

export function acceptAllCookieConsent(locale: string, source: CookieConsentSource = "banner"): CookieConsent | null {
  return writeCookieConsent({
    analytics: true,
    diagnostics: true,
    locale,
    source,
  });
}

export function acceptNecessaryOnlyCookieConsent(
  locale: string,
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
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("pratiqo:cookie-consent", { detail: null }));
  } catch {
    /* ignore */
  }
}
