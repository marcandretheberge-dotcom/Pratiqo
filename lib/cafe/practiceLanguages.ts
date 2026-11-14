/**
 * Practice-language registry for Café des langues.
 * Interface locale (fr/en/es) is separate from the language being practised.
 */

export type CafePracticeLanguageCode =
  | "fr"
  | "en"
  | "es"
  | "it"
  | "ja"
  | "de"
  | "pt"
  | "zh"
  | "ar";

export type CafePracticeLanguage = {
  code: CafePracticeLanguageCode;
  /** Native / endonym label shown in the picker. */
  nativeName: string;
  /** Stable lounge slug segment. */
  loungeSlug: string;
  /** BCP-47-ish tag for future i18n tooling. */
  bcp47: string;
};

/** Seed set — registry is extensible; UI must not hardcode these elsewhere. */
export const CAFE_PRACTICE_LANGUAGES: readonly CafePracticeLanguage[] = [
  { code: "fr", nativeName: "Français", loungeSlug: "salon-francais", bcp47: "fr" },
  { code: "en", nativeName: "English", loungeSlug: "english-lounge", bcp47: "en" },
  { code: "es", nativeName: "Español", loungeSlug: "salon-espanol", bcp47: "es" },
  { code: "it", nativeName: "Italiano", loungeSlug: "salotto-italiano", bcp47: "it" },
  { code: "ja", nativeName: "日本語", loungeSlug: "salon-japonais", bcp47: "ja" },
  { code: "de", nativeName: "Deutsch", loungeSlug: "deutscher-salon", bcp47: "de" },
  { code: "pt", nativeName: "Português", loungeSlug: "salao-portugues", bcp47: "pt" },
  { code: "zh", nativeName: "中文", loungeSlug: "salon-chinois", bcp47: "zh" },
  { code: "ar", nativeName: "العربية", loungeSlug: "salon-arabe", bcp47: "ar" },
] as const;

const byCode = new Map(CAFE_PRACTICE_LANGUAGES.map((lang) => [lang.code, lang]));

export function isCafePracticeLanguageCode(value: string): value is CafePracticeLanguageCode {
  return byCode.has(value as CafePracticeLanguageCode);
}

export function getCafePracticeLanguage(code: string): CafePracticeLanguage | null {
  return byCode.get(code as CafePracticeLanguageCode) ?? null;
}

export function searchCafePracticeLanguages(query: string): CafePracticeLanguage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...CAFE_PRACTICE_LANGUAGES];
  return CAFE_PRACTICE_LANGUAGES.filter((lang) => {
    return (
      lang.code.includes(q)
      || lang.nativeName.toLowerCase().includes(q)
      || lang.loungeSlug.includes(q)
      || lang.bcp47.toLowerCase().includes(q)
    );
  });
}

export const CAFE_PRACTICE_LANGUAGE_STORAGE_KEY = "pratiqo.cafe.practiceLanguage";
