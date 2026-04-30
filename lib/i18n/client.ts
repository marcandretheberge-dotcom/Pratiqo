"use client";

import { useCallback, useState } from "react";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isLocale,
  localeToBcp47,
  normalizeLocale,
  type Dictionary,
  type Locale,
  type TranslationKey,
} from "./types";

const dictionaries: Record<Locale, Dictionary> = {
  en,
  fr,
  es,
};

export function t(locale: Locale | string | null | undefined, key: TranslationKey): string {
  const normalized = normalizeLocale(locale);
  return dictionaries[normalized][key] ?? dictionaries.en[key] ?? String(key);
}

export function useTranslation(initialLocale: Locale | string | null | undefined = DEFAULT_LOCALE) {
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));

  const translate = useCallback((key: TranslationKey) => t(locale, key), [locale]);
  const setLocale = useCallback((nextLocale: Locale | string) => {
    setLocaleState(normalizeLocale(nextLocale));
  }, []);

  return {
    t: translate,
    locale,
    setLocale,
  };
}

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isLocale,
  localeToBcp47,
  normalizeLocale,
};

export type { Dictionary, Locale, TranslationKey };
