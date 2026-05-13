export type { Dictionary, Locale, TranslationKey } from "./types";
export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isLocale,
  localeToBcp47,
  normalizeLocale,
} from "./types";
export { getDictionary, getLocale, t } from "./server";
export {
  LOCALES,
  ROUTING_DEFAULT_LOCALE,
  LOCALE_BCP47,
  withLocale,
  stripLocale,
  getLocaleFromPath,
  pathHasLocale,
  localizedAlternates,
  canonicalUrl,
} from "./routing";
