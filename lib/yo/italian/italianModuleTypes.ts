import type { YoLocale } from "../types";

export type LocaleText = Record<YoLocale, string>;
export type ItalianCategory = "greetings" | "cafe" | "city";
export type ItalianActivityCategory = ItalianCategory | "final";

export interface ItalianVocabularyItem {
  id: string;
  it: string;
  meaning: LocaleText;
  category: ItalianCategory;
  note?: LocaleText;
}

export interface ItalianActivityBase {
  id: string;
  title: LocaleText;
  prompt: LocaleText;
  hint: LocaleText;
  hint2: LocaleText;
  explanation: LocaleText;
  category: ItalianActivityCategory;
}

export interface ItalianOption {
  id: string;
  it?: string;
  label?: LocaleText;
  feedback: LocaleText;
}

export interface ItalianMatchActivity extends ItalianActivityBase {
  kind: "match";
  pairs: { id: string; it: string; meaning: LocaleText }[];
}

export interface ItalianOrderActivity extends ItalianActivityBase {
  kind: "order";
  tokens: string[];
  answer: string[];
  distractors?: string[];
  it: string;
}

export interface ItalianChoiceActivity extends ItalianActivityBase {
  kind: "choice" | "listen" | "culture";
  stimulus?: string;
  options: ItalianOption[];
  correctId: string;
  sourceIds?: string[];
}

export interface ItalianTypeActivity extends ItalianActivityBase {
  kind: "type";
  accepted: string[];
  model: string;
}

export interface ItalianCafeActivity extends ItalianActivityBase {
  kind: "cafe";
  orderText: string;
  menu: { id: string; it: string; priceCents: number }[];
  order: { itemId: string; quantity: number }[];
  budgetCents: number;
}

export type ItalianMapDirection = "up" | "down" | "left" | "right";

export interface ItalianMapActivity extends ItalianActivityBase {
  kind: "map";
  path: ItalianMapDirection[];
  instructions: string[];
  gridSize: 3;
  start: { row: number; col: number };
  goal: { row: number; col: number };
}

export interface ItalianDialogueTurn {
  speaker: string;
  line: string;
  prompt: LocaleText;
  options: ItalianOption[];
  correctId: string;
}

export interface ItalianDialogueActivity extends ItalianActivityBase {
  kind: "dialogue";
  turns: ItalianDialogueTurn[];
}

export type ItalianActivity =
  | ItalianMatchActivity
  | ItalianOrderActivity
  | ItalianChoiceActivity
  | ItalianTypeActivity
  | ItalianCafeActivity
  | ItalianMapActivity
  | ItalianDialogueActivity;

export interface ItalianCultureSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessedOn: string;
  supports: LocaleText;
}
