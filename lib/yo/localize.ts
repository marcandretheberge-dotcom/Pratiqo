/**
 * Yo Pratiqo — tiny, dependency-free localization helpers.
 *
 * Used by every Yo component that renders user-facing copy. Two design
 * decisions to keep this lightweight:
 *   - No external i18n library. Yo data already carries both languages
 *     side-by-side as `YoLocalizedString`, so a runtime lookup is enough.
 *   - No global locale store / React Context. The page reads `?lang=`
 *     once on the server and threads `locale` down via plain props. That
 *     keeps the page eligible for static generation in Phase 2 and avoids
 *     hydration mismatches.
 */

import type { YoLocale, YoLocalizedString, YoCurrency } from "@/lib/yo/types";

export const YO_DEFAULT_LOCALE: YoLocale = "fr";

/**
 * Resolve a free-form `?lang=` value to a known `YoLocale`. Everything
 * other than "en" (case-insensitive) collapses back to the default "fr"
 * so the Quebec audience keeps working even if a typo or unknown locale
 * is passed.
 */
export function getYoLocale(input?: string | string[] | null): YoLocale {
  if (Array.isArray(input)) {
    return getYoLocale(input[0]);
  }
  if (typeof input !== "string") {
    return YO_DEFAULT_LOCALE;
  }
  const normalized = input.trim().toLowerCase();
  return normalized === "en" ? "en" : YO_DEFAULT_LOCALE;
}

/**
 * Pluck a localized value. Falls back to FR when EN is missing — the FR
 * field is the source of truth for Phase 1 because every Yo data record
 * was authored in French first.
 */
export function t(value: YoLocalizedString, locale: YoLocale): string {
  return value[locale] ?? value.fr;
}

/**
 * Compact builder used in the data file. `lstr("Bonjour", "Hello")` reads
 * better than `{ fr: "Bonjour", en: "Hello" }`. When the EN value is
 * omitted (brand names, Spanish-shaped wording that doesn't translate)
 * both locales receive the same string.
 */
export function lstr(fr: string, en?: string): YoLocalizedString {
  return { fr, en: en ?? fr };
}

/**
 * Format a Yo price in the locale's conventional shape.
 *
 * Quebec French commonly writes "$24,99 CAD" (dollar prefix + comma
 * decimal); Canadian English writes "$24.99 CAD". Currency code stays
 * after the number in both, and is uppercase ISO 4217.
 */
export function formatYoPrice(
  cents: number,
  locale: YoLocale,
  currency: YoCurrency = "CAD",
): string {
  const safeCents = Number.isFinite(cents) && cents >= 0 ? cents : 0;
  const decimal = (safeCents / 100).toFixed(2);
  const formatted = locale === "fr" ? decimal.replace(".", ",") : decimal;
  return `$${formatted} ${currency}`;
}

/**
 * Build the language-toggle URL pair for the current page.
 *
 * Used by `YoIntroExperience` to render a small "Voir en anglais" /
 * "View in French" pill so users can switch locales without leaving the
 * page. Kept pure: pass in the current pathname + the target locale and
 * the helper returns the matching query string.
 */
export function buildYoLocaleHref(
  basePathname: string,
  targetLocale: YoLocale,
): string {
  if (targetLocale === YO_DEFAULT_LOCALE) {
    return basePathname;
  }
  return `${basePathname}?lang=${targetLocale}`;
}
