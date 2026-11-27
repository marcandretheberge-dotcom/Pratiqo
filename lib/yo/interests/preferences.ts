import type { YoLocale } from "../types";
import { learningLanguageId, learningLanguages, YO_LANGUAGE_IDS } from "../config/languages";

/** Preferences select authored practice. They never grant course or payment access. */
export const interestIds = ["music", "art", "history", "sport", "food", "nature"] as const;
export type InterestId = typeof interestIds[number];
export const interestLabels: Record<InterestId, Record<YoLocale, string>> = {
  music: { fr: "Musique", en: "Music", es: "Música" },
  art: { fr: "Arts", en: "Art", es: "Arte" },
  history: { fr: "Histoire", en: "History", es: "Historia" },
  sport: { fr: "Sport", en: "Sport", es: "Deporte" },
  food: { fr: "Cuisine", en: "Food", es: "Gastronomía" },
  nature: { fr: "Nature", en: "Nature", es: "Naturaleza" },
};
export function parseInterests(value: unknown): InterestId[] {
  if (!Array.isArray(value) || value.length > interestIds.length) return [];
  return [...new Set(value.filter((v): v is InterestId => interestIds.includes(v as InterestId)))].slice(0, 3);
}
export function toggleInterest(selected: readonly InterestId[], interest: InterestId): InterestId[] {
  return selected.includes(interest) ? selected.filter(id => id !== interest) : [...selected, interest].slice(0, 3);
}
export const interestLanguages = ["it", "en", "fr-CA", "es", "de", "pt-BR", "ja", "zh-CN"] as const;
export type InterestLanguage = typeof interestLanguages[number];
export function interestLanguage(value: string): InterestLanguage | null {
  const id = learningLanguageId(value) ?? YO_LANGUAGE_IDS.find(id => learningLanguages[id].slug === value);
  return id ? ({ it: "it", en: "en", fr: "fr-CA", es: "es", de: "de", pt: "pt-BR", ja: "ja", zh: "zh-CN" } as const)[id] : null;
}
export function interestPreferenceKey(language: InterestLanguage) { return `yo.interests.v1.${language}`; }
export const INTEREST_PREFERENCES_CHANGED_EVENT = "yo:interest-preferences-changed";
export function readInterestPreferences(language: InterestLanguage): InterestId[] | null {
  try {
    const raw = localStorage.getItem(interestPreferenceKey(language));
    if (raw === null || raw.length > 500) return null;
    return parseInterests(JSON.parse(raw));
  } catch { return null; }
}
export function writeInterestPreferences(language: InterestLanguage, interests: readonly InterestId[]): boolean {
  try {
    localStorage.setItem(interestPreferenceKey(language), JSON.stringify(parseInterests(interests)));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(INTEREST_PREFERENCES_CHANGED_EVENT, { detail: { language } }));
    return true;
  }
  catch { return false; }
}
