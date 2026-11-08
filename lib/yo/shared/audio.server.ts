import { YOPRATIQO_AUDIO_MANIFEST } from "../audio/audioManifest";
import { germanPublishedAudio } from "../german/courseAudioPublished";
import { portuguesePublishedAudio } from "../portuguese/courseAudioPublished";
import mandarinAudio from "../mandarin/audioPaths.json";
import { japaneseFoundationAudio } from "../audio/japaneseFoundationAudio";
import type { IntroCourse } from "./types";
const spokenKey = (s: string) => s.normalize("NFC").replace(/[’‘]/g,"'").replace(/[.,!?。！？¡¿]/g,"").replace(/\s+/g,"").toLowerCase();
/** Language-scoped matches, ignoring presentation punctuation only. A manifest path is not a claim of live availability. */
export function introAudioPaths(c: IntroCourse): Record<string, string> {
  const result: Record<string, string> = {};
  const local: Record<string, string> = c.language === "de" ? germanPublishedAudio : c.language === "pt-BR" ? portuguesePublishedAudio : c.language === "zh-Hans" ? mandarinAudio : {};
  const lang = c.language === "fr-CA" ? "fr" : c.language;
  const accent = c.language === "es" ? "latin_american_neutral" : c.language === "en" ? "canadian_english" : c.language === "fr-CA" ? "quebec_french" : c.language === "ja" ? "japanese_standard" : null;
  const items = [...YOPRATIQO_AUDIO_MANIFEST, ...japaneseFoundationAudio].filter(a => a.targetLanguage === lang && (!accent || a.accentProfile === accent));
  for (const p of c.phrases) {
    const text = p.text.normalize("NFC").trim();
    const path = local[text] ?? Object.entries(local).find(([t]) => spokenKey(t) === spokenKey(text))?.[1] ?? items.find(a => spokenKey(a.text) === spokenKey(text))?.storagePath;
    if (path) result[text] = path;
  }
  return result;
}
