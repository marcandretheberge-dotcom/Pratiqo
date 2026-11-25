import type { YoLocale } from "@/lib/yo/types";
import { REVIEW_INTERVAL_DAYS } from "@/lib/yo/srs/intervals";

export const YO_LANGUAGE_IDS = ["it", "en", "fr", "es", "de", "pt", "ja", "zh"] as const;
export type YoLearningLanguage = typeof YO_LANGUAGE_IDS[number];

export interface LearningLanguage {
  id: YoLearningLanguage;
  aliases: readonly string[];
  name: Record<YoLocale, string>;
  slug: string;
  speechLocale: string;
  reviewIntervalsDays: typeof REVIEW_INTERVAL_DAYS;
}

const language = (
  id: YoLearningLanguage,
  aliases: readonly string[],
  name: Record<YoLocale, string>,
  slug: string,
  speechLocale: string,
): LearningLanguage => ({ id, aliases, name, slug, speechLocale, reviewIntervalsDays: REVIEW_INTERVAL_DAYS });

/** Identity and authored locale metadata only: this registry enables no service or entitlement. */
export const learningLanguages: Readonly<Record<YoLearningLanguage, LearningLanguage>> = {
  it: language("it", ["it-IT"], { fr: "Italien", en: "Italian", es: "Italiano" }, "italien", "it-IT"),
  en: language("en", ["en-CA"], { fr: "Anglais", en: "English", es: "Inglés" }, "anglais", "en-CA"),
  fr: language("fr", ["fr-CA", "fr-qc"], { fr: "Français québécois", en: "Québec French", es: "Francés de Quebec" }, "francais-quebec", "fr-CA"),
  es: language("es", ["es-419", "es-DO", "es-MX"], { fr: "Espagnol", en: "Spanish", es: "Español" }, "espagnol", "es-419"),
  de: language("de", ["de-DE"], { fr: "Allemand", en: "German", es: "Alemán" }, "allemand", "de-DE"),
  pt: language("pt", ["pt-BR"], { fr: "Portugais brésilien", en: "Brazilian Portuguese", es: "Portugués brasileño" }, "portugais-bresil", "pt-BR"),
  ja: language("ja", ["ja-JP"], { fr: "Japonais", en: "Japanese", es: "Japonés" }, "japonais", "ja-JP"),
  zh: language("zh", ["zh-Hans", "zh-CN"], { fr: "Mandarin", en: "Mandarin", es: "Mandarín" }, "mandarin", "zh-CN"),
};

/** Never guess another course for an unknown language. Existing target-locale aliases share one queue. */
export function learningLanguageId(value: unknown): YoLearningLanguage | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return YO_LANGUAGE_IDS.find((id) => id === normalized || learningLanguages[id].aliases.some((alias) => alias.toLowerCase() === normalized)) ?? null;
}
