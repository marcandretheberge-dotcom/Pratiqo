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
