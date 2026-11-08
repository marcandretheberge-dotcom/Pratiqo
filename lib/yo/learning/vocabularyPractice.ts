import type { YoLocale } from "../types";
import { scrambleItalianItems } from "../italian/italianModuleLogic";
import { vocabularyArtwork } from "../personalized/approvedVocabulary";
import type { VocabularyPicture } from "../personalized/types";
export type RecallWord = { id: string; text: string; meaning: Record<YoLocale, string>; reading?: string; number?: string };
export type RecallChoice = { id: string; label: Record<YoLocale, string> };
/** The answer is never printed in the listening prompt. Options express a meaning or a number. */
export function recallChoices(words: readonly RecallWord[], target: RecallWord, seed: string): RecallChoice[] {
  const candidates = words.filter(w => w.id !== target.id && Boolean(w.number) === Boolean(target.number));
  const alternatives = scrambleItalianItems(candidates, seed).slice(0, 2);
  return scrambleItalianItems([target, ...alternatives], seed + ":positions").map(w => ({
    id: w.id, label: w.number ? { fr: w.number, en: w.number, es: w.number } : w.meaning,
  }));
}
/** Repeat retrieval, not a four-picture elimination cycle. The same target can recur,
 * with at least two intervening tasks and freshly selected distractors. */
export function recallQueue(count: number, seed: string): number[] {
  if (count < 1) return [];
  const base = scrambleItalianItems(Array.from({ length: count }, (_, i) => i), seed);
  if (count < 4) return base;
  return [...base.slice(0, 3), base[0], ...base.slice(3), base[1]];
}
/** Abstract legacy art cannot leak into new vocabulary choices. Text lives outside artwork. */
export function isObjectPicture(p: VocabularyPicture): boolean {
  return p.kind === "object" && !p.label && !p.detail && !p.caption && Boolean(p.artwork && vocabularyArtwork[p.artwork].subject === "object");
}
export function validObjectChoices(pictures: readonly VocabularyPicture[]): boolean {
  return pictures.length === 4 && pictures.every(isObjectPicture) && new Set(pictures.map(p => p.artwork)).size === 4;
}
