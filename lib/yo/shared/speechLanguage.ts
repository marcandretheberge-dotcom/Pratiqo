import type { SpeechLanguage, SpeechScenarioId } from "../speech/catalog";
import { learningLanguageId } from "../config/languages";

/** Map curriculum tags explicitly; never fall back to another language. */
export function courseSpeechLanguage(language: string): SpeechLanguage | null {
  return learningLanguageId(language);
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
