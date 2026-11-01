/** Original beginner-course content. Course outcomes are internal, not a JLPT or university award. */
export type JapaneseLocalized = { fr: string; en: string; es: string };

export interface JapanesePhrase {
  ja: string;
  kana: string;
  romaji: string;
  meaning: JapaneseLocalized;
}

export interface JapaneseChoice {
  id: string;
  ja?: string;
  kana?: string;
  romaji?: string;
  label?: JapaneseLocalized;
  feedback: JapaneseLocalized;
}

export interface JapaneseActivityBase {
  id: string;
  title: JapaneseLocalized;
  prompt: JapaneseLocalized;
  hint: JapaneseLocalized;
  explanation: JapaneseLocalized;
  skill: "listening" | "reading" | "grammar" | "culture" | "vocabulary";
}

export interface JapaneseChoiceActivity extends JapaneseActivityBase {
  kind: "choice" | "listening" | "culture";
  stimulus?: JapanesePhrase;
  choices: JapaneseChoice[];
  answerId: string;
  sourceIds?: string[];
}

export interface JapaneseBuildActivity extends JapaneseActivityBase {
  kind: "build";
  tokens: Array<{ id: string; text: string }>;
  answerOrder: string[];
  alternativeOrders?: string[][];
  phrase: JapanesePhrase;
}

export interface JapaneseReadingActivity extends JapaneseActivityBase {
  kind: "reading";
  stimulus: string;
  answer: string;
  accepted: string[];
  acceptsRomaji: boolean;
}

export interface JapaneseMatchActivity extends JapaneseActivityBase {
  kind: "match";
  pairs: Array<{ id: string; phrase: JapanesePhrase }>;
}

export type JapaneseActivity = JapaneseChoiceActivity | JapaneseBuildActivity | JapaneseReadingActivity | JapaneseMatchActivity;

export interface JapaneseRoleplayTurn {
  id: string;
  speaker: JapaneseLocalized;
  line: JapanesePhrase;
  goal: JapaneseLocalized;
  hint: JapaneseLocalized;
  choices: JapaneseChoice[];
  answerId: string;
}

export interface JapaneseCourseUnit {
  id: string;
  slug: string;
  number: number;
  title: JapaneseLocalized;
  subtitle: JapaneseLocalized;
  setting: JapaneseLocalized;
  estimatedMinutes: number;
  goals: JapaneseLocalized[];
  dialogue: Array<JapanesePhrase & { speaker: JapaneseLocalized }>;
  vocabulary: Array<JapanesePhrase & { id: string }>;
  grammar: Array<{ id: string; title: JapaneseLocalized; explanation: JapaneseLocalized; example: JapanesePhrase }>;
  kana: string[];
  kanji: string[];
  activities: JapaneseActivity[];
  roleplay: { title: JapaneseLocalized; context: JapaneseLocalized; turns: JapaneseRoleplayTurn[] };
  culture: { title: JapaneseLocalized; note: JapaneseLocalized; reflection: JapaneseLocalized; sourceIds: string[] };
  writing: { prompt: JapaneseLocalized; model: JapanesePhrase; checklist: JapaneseLocalized[] };
  canDos: JapaneseLocalized[];
}

export interface JapaneseKanjiCard {
  character: string;
  meaning: JapaneseLocalized;
  word: JapanesePhrase;
  mnemonic: JapaneseLocalized;
  strokes: string[];
  sourceFile: string;
}

export interface JapaneseCourseSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  purpose: JapaneseLocalized;
}
