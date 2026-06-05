import en from "./locales/en.json";

export type Locale = "en" | "fr" | "es";
export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;
export type LegacyLocale = Locale | "en-CA" | "fr-CA" | "es-419" | "es-UY";

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES = ["en", "fr", "es"] as const satisfies readonly Locale[];

/**
 * Normalize any locale-shaped value (BCP 47 tag, underscore variant, or
 * human-readable language name) to one of the three supported locales.
 *
 * Historically this helper only recognized the strict BCP 47 set
 * (`fr`, `fr-CA`, `fr-*`, etc.) and fell through to `DEFAULT_LOCALE` for
 * everything else. That caused booking reminder emails to be sent in English
 * to French-speaking users whose stored locale was `fr_CA` (underscore form
 * coming back from some auth providers) or `français` / `French` (human-name
 * form coming from a saved profile preference). The migration
 * `020_normalize_locale_codes.sql` handles the underscore form on disk, but
 * the runtime helper was not aligned with the contract.
 *
 * The DEFAULT_LOCALE fall-through is preserved so frontend UI defaults stay
 * stable for genuinely unknown values (e.g. `"klingon"`).
 */
export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const raw = String(value).trim();
  if (!raw) return DEFAULT_LOCALE;

  // Fast path: existing exact / prefix checks preserve previous behavior.
  if (raw === "fr" || raw === "fr-CA" || raw.startsWith("fr-")) return "fr";
  if (raw === "es" || raw === "es-419" || raw === "es-UY" || raw.startsWith("es-")) return "es";
  if (raw === "en" || raw === "en-CA" || raw.startsWith("en-")) return "en";

  // Defensive normalization: lowercase, swap `_` for `-`, strip diacritics.
  // Matches the on-disk normalization defined in
  // supabase/migrations/020_normalize_locale_codes.sql so the runtime helper
  // and the database stay consistent.
  const norm = raw
    .toLowerCase()
    .replace(/_/g, "-")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (norm === "fr" || norm.startsWith("fr-")) return "fr";
  if (norm === "es" || norm.startsWith("es-")) return "es";
  if (norm === "en" || norm.startsWith("en-")) return "en";

  // Human-readable language names (FR/EN/ES contract from the launch brief).
  if (norm === "french" || norm === "francais") return "fr";
  if (norm === "english" || norm === "anglais" || norm === "ingles") return "en";
  if (norm === "spanish" || norm === "espanol" || norm === "espagnol") return "es";

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
