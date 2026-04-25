export type Locale = "fr-CA" | "en-CA" | "es";

export const DEFAULT_LOCALE: Locale = "fr-CA";

export const SUPPORTED_LOCALES: Locale[] = ["fr-CA", "en-CA", "es"];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "fr-CA" || value === "en-CA" || value === "es";
}

/** BCP 47 tag for `toLocaleDateString` */
export function localeToBcp47(locale: Locale): string {
  if (locale === "es") return "es-419";
  return locale;
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const lang = navigator.language || "fr-CA";
  if (lang === "fr-CA" || lang.startsWith("fr-CA")) return "fr-CA";
  if (lang.startsWith("fr")) return "fr-CA";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("en")) return "en-CA";
  return DEFAULT_LOCALE;
}
