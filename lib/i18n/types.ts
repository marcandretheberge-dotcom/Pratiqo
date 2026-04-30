import en from "./locales/en.json";

export type Locale = "en" | "fr" | "es";
export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;
export type LegacyLocale = Locale | "en-CA" | "fr-CA" | "es-419" | "es-UY";

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES = ["en", "fr", "es"] as const satisfies readonly Locale[];

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  if (value === "fr" || value === "fr-CA" || value.startsWith("fr-")) return "fr";
  if (value === "es" || value === "es-419" || value === "es-UY" || value.startsWith("es-")) return "es";
  if (value === "en" || value === "en-CA" || value.startsWith("en-")) return "en";
  return DEFAULT_LOCALE;
}

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "fr" || value === "es";
}

/** BCP 47 tag for Intl/date formatting. */
export function localeToBcp47(locale: Locale | string | null | undefined): string {
  const normalized = normalizeLocale(locale);
  if (normalized === "fr") return "fr-CA";
  if (normalized === "es") return "es-UY";
  return "en-CA";
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(navigator.language || DEFAULT_LOCALE);
}
