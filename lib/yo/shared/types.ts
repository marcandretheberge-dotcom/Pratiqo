import type { YoLocale } from "../types";
import type { VocabularyPicture } from "../personalized/types";
export type Text = Record<YoLocale, string>;
export const L = (fr: string, en: string, es: string): Text => ({ fr, en, es });
export type Phrase = { id: string; text: string; meaning: Text; reading?: string; parts?: string[] };
export type Concept = { title: Text; body: Text; examples: string[] };
export type Exercise = { id: string; kind: "reply" | "listen" | "order"; prompt: Text; answer: string; options: string[]; cue?: string };
export type Mission = { id: string; title: Text; goal: Text; phrases: string[]; visuals: { phrase: string; pictures: VocabularyPicture[]; answer: string }[]; conversation: string[]; concepts: Concept[]; remember: Text; practice: Exercise[] };
export type IntroCourse = {
  version: 1; slug: string; language: string; speechLocale: string; name: Text; nativeName: string; greeting: string;
  city: string; legacyPath: string; teacherQuery: string; phrases: Phrase[]; glossary: { text: string; meaning: Text; group: "words" | "verbs" | "numbers" }[];
  missions: Mission[]; final: Exercise[]; sources: { title: string; url: string }[];
};
export type IntroProfile = { experience: "new" | "some" | "confident"; goal: "travel" | "family" | "work" | "conversation" | "thorough"; minutes: number; entry: number };
export type Answer = { correct: boolean; assisted: boolean };
export type Draft = { selected: string | null; tiles: number[]; checked: boolean; correct: boolean; assisted: boolean; heard: boolean; transcript: boolean };
export type IntroState = {
  version: 1; language: string; profile: IntroProfile | null;
  view: "map" | "lesson" | "final" | "result"; resume: "lesson" | "final" | null; step: number; finalIndex: number;
  draft: Draft; completed: string[]; visited: string[]; answers: Answer[]; best: number;
};
export type Step = { id: string; mission: number; kind: "visual" | "words" | "scene" | "concept" | "exercise"; index: number };

export type VocabularyGroup = VocabularyPicture[];
