/**
 * Locale-aware routing helpers — single source of truth for URL building,
 * parsing, and metadata alternates across the app.
 *
 * URL strategy: every public URL is prefixed with the locale (e.g. /fr/tarifs,
 * /en/tarifs, /es/tarifs). The unprefixed form 301-redirects to the default
 * locale at the proxy layer. Locale routing is being rolled out in 4 staged
 * steps; this file is intentionally usable from step 1.1 onward regardless of
 * whether any specific route has been migrated yet.
 */

import { SUPPORTED_LOCALES, isLocale, type Locale } from "./types";

/** All locales the app serves URLs for, in priority order. */
export const LOCALES = SUPPORTED_LOCALES;

/**
 * Default locale that owns the canonical (root-level) URL space. Pratiqo is
 * a French-Canadian first product, so French wins the canonical slot — bare
 * paths like `/tarifs` 301 to `/fr/tarifs` here. This is intentionally
 * decoupled from `DEFAULT_LOCALE` (which still falls back to `en` for
 * translation lookups on first paint before geo/cookie hydration).
 */
export const ROUTING_DEFAULT_LOCALE: Locale = "fr";

/**
 * BCP-47 tag emitted in `<html lang>` and hreflang attributes for each app
 * locale. Kept distinct from the internal short code so we can refine regional
 * targeting (en-CA vs en-US, es-UY vs es-MX) without changing URL shape.
 */
export const LOCALE_BCP47: Record<Locale, string> = {
  en: "en-CA",
  fr: "fr-CA",
  es: "es-UY",
};

/**
 * Joins a locale and a path-relative segment into an absolute app URL path
 * (e.g. `withLocale("/tarifs", "fr")` → `/fr/tarifs`).
 *
 * - Always returns a path starting with `/locale/...`.
 * - The default locale is NOT auto-collapsed: `/fr/tarifs` is preferred to
 *   `/tarifs` for canonical URLs (we 301 from `/tarifs` → `/fr/tarifs` at the
 *   proxy layer).
 * - Hash and query strings on `path` are preserved.
 * - Passing the root path (`"/"` or `""`) yields `/locale`.
 */
export function withLocale(path: string, locale: Locale): string {
  const safe = isLocale(locale) ? locale : ROUTING_DEFAULT_LOCALE;
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return `/${safe}`;
  // Preserve absolute http(s) URLs untouched — callers sometimes pass full URLs.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `/${safe}${withSlash}`;
}

/**
 * Removes a leading locale segment from a pathname, returning the rest.
 * Returns the path unchanged if no recognized locale prefix is present.
 *
 * stripLocale("/fr/tarifs") → "/tarifs"
 * stripLocale("/tarifs")    → "/tarifs"
 * stripLocale("/en")        → "/"
 */
export function stripLocale(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const parts = pathname.split("/");
  // parts[0] is empty because pathname starts with '/'
  const first = parts[1];
  if (first && isLocale(first)) {
    const rest = parts.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

/**
 * Reads the locale from a pathname's first segment. Returns null if the
 * pathname has no recognized locale prefix — callers can fall back to cookie
 * or default in that case.
 */
export function getLocaleFromPath(pathname: string): Locale | null {
  if (!pathname) return null;
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : null;
}

/**
 * True when the pathname starts with `/{locale}/...` (or is exactly `/{locale}`)
 * for any supported locale.
 */
export function pathHasLocale(pathname: string): boolean {
  return getLocaleFromPath(pathname) !== null;
}

/**
 * Build the per-locale URL map (and `x-default`) for a route, suitable for
 * spreading into `metadata.alternates.languages`. All URLs are absolute so
 * Google and crawlers receive canonical hreflang targets.
 *
 * @param path Route-relative path WITHOUT locale prefix (e.g. "/tarifs").
 * @param siteUrl Origin (defaults to SITE_URL). Use empty string for relative.
 * @param overrides Optional per-locale slug overrides (e.g. fr uses
 *   `/tuteurs-prive/montreal` while en uses `/tutors/montreal`).
 */
export function localizedAlternates(
  path: string,
  siteUrl: string,
  overrides?: Partial<Record<Locale, string>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const locale of LOCALES) {
    const localePath = overrides?.[locale] ?? path;
    result[LOCALE_BCP47[locale]] = `${siteUrl}${withLocale(localePath, locale)}`;
  }
  // x-default points to the default locale's URL per Google guidelines.
  result["x-default"] = `${siteUrl}${withLocale(overrides?.[ROUTING_DEFAULT_LOCALE] ?? path, ROUTING_DEFAULT_LOCALE)}`;
  return result;
}

/**
 * Convenience: the canonical absolute URL for a route in a given locale.
 */
export function canonicalUrl(path: string, locale: Locale, siteUrl: string): string {
  return `${siteUrl}${withLocale(path, locale)}`;
}
