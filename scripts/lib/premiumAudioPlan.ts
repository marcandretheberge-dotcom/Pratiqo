import { createHash } from "node:crypto";
import type { YoAudioItem } from "../../lib/yo/audio/audioManifest.types-internal";
import { getYoAudioAccentProfile, type YoAudioAccentProfileId } from "../../lib/yo/audio/accentProfiles";
import type { YoTargetLanguage } from "../../lib/yo/types";
import { introCourses } from "../../lib/yo/shared/course";
import { introAudioPaths } from "../../lib/yo/shared/audio.server";
import { courseSpeechLanguage } from "../../lib/yo/shared/speechLanguage";
import { personalizedItalianUnits, moduleBank, placementChecks } from "../../lib/yo/personalized/courseData";
import { unitSpeech, activitySpeech, distinctSpeech } from "../../lib/yo/italian/course/courseSpeech";
import { courseAudioPaths } from "../../lib/yo/italian/course/courseAudio.server";
import { FLORENCE_DISCOVERY_PHRASES } from "../../lib/yo/italian/travel/journey";

export interface PremiumRecordingItem extends YoAudioItem { locale: string }
export type PremiumAudioScope = "introductions" | "italian-current" | "all";
export type PremiumAudioCoverage = { language: string; total: number; recorded: number; missing: number };

const accents: Record<YoTargetLanguage, YoAudioAccentProfileId> = {
  en: "canadian_english", fr: "quebec_french", es: "latin_american_neutral",
  it: "italian_standard", de: "german_standard", pt: "brazilian_portuguese",
  ja: "japanese_standard", zh: "mandarin_standard",
};

/** Offline inventory only. Planned object paths are never published as playable recordings. */
export function buildPremiumAudioPlan(scope: PremiumAudioScope): { items: PremiumRecordingItem[]; coverage: PremiumAudioCoverage[] } {
  if (!["introductions", "italian-current", "all"].includes(scope)) throw new Error("Unknown premium recording scope.");
  const items: PremiumRecordingItem[] = [], coverage: PremiumAudioCoverage[] = [];
  function collect(language: YoTargetLanguage, locale: string, texts: readonly string[], recordedPaths: Record<string, string>) {
    const phrases = distinctSpeech(texts), missing = phrases.filter(text => !recordedPaths[text]);
    coverage.push({ language, total: phrases.length, recorded: phrases.length - missing.length, missing: missing.length });
    const accentProfile = accents[language], profile = getYoAudioAccentProfile(accentProfile);
    for (const text of missing) {
      const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
      items.push({
        id: `premium-gap-${language}-${hash}`, targetLanguage: language, locale,
        moduleId: "premium-gap-fill", lessonId: "v1", type: "sentence", text, spokenText: text,
        storagePath: `yo/${language}/premium-gap-fill/v1/${profile.pathSlug}/sentence/${hash}.mp3`,
        accentProfile, ttsInstructions: profile.ttsInstructions,
      });
    }
  }
  if (scope === "introductions" || scope === "all") {
    for (const course of introCourses) {
      const language = courseSpeechLanguage(course.language);
      if (!language) throw new Error(`Unmapped curriculum language: ${course.language}`);
      collect(language, course.speechLocale, course.phrases.map(phrase => phrase.text), introAudioPaths(course));
    }
  }
  if (scope === "italian-current" || scope === "all") {
    const texts = distinctSpeech([
      ...personalizedItalianUnits.flatMap(unit => [...unitSpeech(unit), ...moduleBank(unit).map(word => word.it)]),
      ...FLORENCE_DISCOVERY_PHRASES,
      ...placementChecks.flatMap(check => activitySpeech(check.activity)),
    ]);
    collect("it", "it-IT", texts, courseAudioPaths(texts));
  }
  return { items, coverage };
}
