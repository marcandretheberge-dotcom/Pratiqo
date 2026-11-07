import type { LocaleText } from "../italian/italianModuleTypes";
export type VocabularyPicture = { id: string; kind: "greeting" | "feeling" | "profile" | "age" | "question"; label: string; detail?: string; mood?: "happy" | "neutral" | "sad"; time?: "day" | "night"; waving?: boolean; country?: "CA" | "IT" | "FR"; alt: LocaleText };
export type VisualWord = { id: string; it: string; meaning: LocaleText; choices: VocabularyPicture[]; correctId: string };
export type WordBankEntry = { it: string; meaning: LocaleText; group: "expressions" | "words" | "verbs" | "numbers"; note?: LocaleText };
