import type { SpeechLanguage, SpeechScenarioId } from "../speech/catalog";

/** Map curriculum tags explicitly; never fall back to another language. */
export function courseSpeechLanguage(language: string): SpeechLanguage | null {
  switch (language) {
    case "en": return "en";
    case "fr":
    case "fr-CA": return "fr";
    case "es": return "es";
    case "it": return "it";
    case "ja": return "ja";
    case "de": return "de";
    case "pt":
    case "pt-BR": return "pt";
    case "zh":
    case "zh-Hans": return "zh";
    default: return null;
  }
}

/** A starting suggestion from the published unit themes; learners can choose another scene. */
export function courseSpeechScenario(language: SpeechLanguage, unitNumber: number): SpeechScenarioId {
  const themes: Partial<Record<SpeechLanguage, SpeechScenarioId[]>> = {
    it: ["introduction", "introduction", "introduction", "workplace", "cafe", "directions", "cafe", "directions", "introduction", "hotel", "introduction", "directions"],
    de: ["introduction", "cafe", "directions", "directions", "hotel", "workplace", "workplace", "directions"],
    pt: ["introduction", "cafe", "directions", "workplace", "hotel", "workplace", "workplace", "directions"],
    ja: ["introduction", "directions", "directions", "cafe", "workplace", "introduction", "directions", "introduction"],
    zh: ["introduction", "cafe", "cafe", "introduction", "directions", "workplace", "cafe", "introduction"],
  };
  return themes[language]?.[unitNumber - 1] ?? "introduction";
}
