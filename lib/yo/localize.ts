/**
 * YoPratiqo — tiny, dependency-free localization helpers.
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
 * Set of locale codes the Yo surface currently understands. Kept as a
 * runtime tuple so `getYoLocale` doesn't need to be edited every time
 * `YoLocale` widens — add the new code here and the parser picks it
 * up automatically.
 */
const YO_LOCALES = ["fr", "en", "es"] as const satisfies readonly YoLocale[];

/**
 * Resolve a free-form `?lang=` value to a known `YoLocale`. Anything
 * outside the known set collapses back to the default "fr" so the
 * Quebec audience keeps working even if a typo or unknown locale is
 * passed.
 */
export function getYoLocale(input?: string | string[] | null): YoLocale {
  if (Array.isArray(input)) {
    return getYoLocale(input[0]);
  }
  if (typeof input !== "string") {
    return YO_DEFAULT_LOCALE;
  }
  const normalized = input.trim().toLowerCase();
  return (YO_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as YoLocale)
    : YO_DEFAULT_LOCALE;
}

/**
 * Pluck a localized value. Falls back to FR when the requested locale
 * is missing — FR is the source of truth because every Yo data record
 * was authored in French first. ES support was added later, so
 * `value.es` may legitimately be `undefined` on older records.
 */
export function t(value: YoLocalizedString, locale: YoLocale): string {
  const raw = value[locale];
  return typeof raw === "string" && raw.length > 0 ? raw : value.fr;
}

/**
 * Compact builder used in the data file. `lstr("Bonjour", "Hello",
 * "Hola")` reads better than `{ fr: "Bonjour", en: "Hello", es:
 * "Hola" }`. When `en` is omitted both `en` and `es` receive the FR
 * value; when `es` alone is omitted, the `t()` helper falls back to
 * the FR string at render time.
 */
export function lstr(
  fr: string,
  en?: string,
  es?: string,
): YoLocalizedString {
  return {
    fr,
    en: en ?? fr,
    ...(typeof es === "string" ? { es } : {}),
  };
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

/**
 * BCP-47 `<html lang>` attribute matching a YoLocale. Used by Yo
 * Server Components that want to scope ES rendering for screen
 * readers and browser language hints (e.g. inside the premium
 * module shell when locale === "es").
 */
export function htmlLangFor(locale: YoLocale): string {
  switch (locale) {
    case "en":
      return "en";
    case "es":
      return "es";
    case "fr":
    default:
      return "fr-CA";
  }
}
