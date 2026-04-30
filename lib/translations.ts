import en from "./i18n/locales/en.json";
import fr from "./i18n/locales/fr.json";
import es from "./i18n/locales/es.json";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type Dictionary,
  type Locale,
  type TranslationKey,
} from "./i18n/types";

export type { TranslationKey } from "./i18n/types";

export const translations: Record<Locale, Dictionary> = {
  en,
  fr,
  es,
};

/**
 * Compatibility shim for the previous API: t(key, locale).
 * New server code should prefer: import { t } from "@/lib/i18n/server" and call t(locale, key).
 * New client code should prefer: import { useTranslation } from "@/lib/i18n/client".
 */
export function t(key: TranslationKey, locale: Locale | string | null | undefined = DEFAULT_LOCALE): string {
  const normalized = normalizeLocale(locale);
  const pack = translations[normalized] ?? translations.en;
  return pack[key] ?? translations.en[key] ?? String(key);
}
