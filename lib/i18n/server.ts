import { cookies } from "next/headers";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import {
  DEFAULT_LOCALE,
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

export function getDictionary(locale: Locale | string | null | undefined = DEFAULT_LOCALE): Dictionary {
  return dictionaries[normalizeLocale(locale)] ?? dictionaries.en;
}

export function t(locale: Locale | string | null | undefined, key: TranslationKey): string {
  const dictionary = getDictionary(locale);
  return dictionary[key] ?? dictionaries.en[key] ?? String(key);
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("pratiqo-locale")?.value);
}
