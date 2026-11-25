import type { YoLocale } from "../types";

export type Localized = Record<YoLocale, string>;
export const L = (fr: string, en: string, es: string): Localized => ({
  fr,
  en,
  es,
});
export interface Phrase {
  hanzi: string;
  pinyin: string;
  meaning: Localized;
}
export const P = (
  hanzi: string,
  pinyin: string,
  fr: string,
  en: string,
  es: string,
): Phrase => ({ hanzi, pinyin, meaning: L(fr, en, es) });
export interface Choice {
  id: string;
  phrase?: Phrase;
  label?: Localized;
  image?: string;
  detail?: Localized;
  feedback: Localized;
}
interface ExerciseBase {
  id: string;
  prompt: Localized;
  hint: Localized;
  explanation: Localized;
  model: Phrase;
  scene?: string;
  /** A written source to interpret; its translation/pinyin can be displayed as help. */
  stimulus?: Phrase;
}
export type Exercise = ExerciseBase &
  (
    | {
        kind: "choice" | "listen" | "visual" | "roleplay" | "tone" | "map";
        choices: Choice[];
        answer: string;
        audio?: Phrase;
        tone?: "1" | "2" | "3" | "4";
      }
    | { kind: "build"; tokens: string[]; answer: string[] }
    | { kind: "write"; accepted: string[] }
    | { kind: "match"; pairs: (Phrase & { image?: string })[] }
  );
export interface Unit {
  id: string;
  number: number;
  title: Localized;
  setting: Localized;
  goals: Localized[];
  scene: string;
  dialogue: (Phrase & { speaker: string })[];
  vocabulary: Phrase[];
  grammar: { title: Localized; text: Localized; example: Phrase }[];
  pronunciation: Localized;
  culture: { title: Localized; text: Localized; source: string };
  character: string;
  reading?: Phrase;
  exercises: Exercise[];
  canDos: Localized[];
}
export type Answer = string | string[] | Record<string, string>;
export interface Attempt {
  answer: Answer;
  checked: boolean;
  correct: boolean;
  assisted: boolean;
  heard: boolean;
  hint: boolean;
  /** Only an explicit restart advances this generation and can clear displayed help. */
  generation?: number;
}
export interface Result {
  passed: boolean;
  independent: boolean;
  attempts: number;
  review: boolean;
}
export interface Progress {
  version: 1;
  unit: string;
  steps: Record<string, number>;
  drafts: Record<string, Attempt>;
  results: Record<string, Result>;
  selfAssessment: Record<string, boolean>;
  trivia: number;
  pinyin: boolean;
  translation: boolean;
  resetAt?: number;
  resetBy?: string;
  sync?: ProgressSync;
}

export type ProgressStamp = [number, string];
export interface AttemptCounter {
  base: number;
  actors: Record<string, number>;
}
export interface ProgressSync {
  clock: number;
  marks: Record<string, ProgressStamp>;
  attempts: Record<string, AttemptCounter>;
}
