import type {
  JapaneseActivityBase, JapaneseBuildActivity, JapaneseChoice, JapaneseChoiceActivity,
  JapaneseLocalized, JapaneseMatchActivity, JapanesePhrase, JapaneseReadingActivity,
  JapaneseRoleplayTurn,
} from "./japaneseCourseTypes";

// These helpers belong to the extension only. The original eight modules retain
// their original authoring code, IDs, questions and evaluation semantics.
export const l = (fr: string, en: string, es: string): JapaneseLocalized => ({ fr, en, es });
export const p = (ja: string, kana: string, romaji: string, fr: string, en: string, es: string): JapanesePhrase =>
  ({ ja, kana, romaji, meaning: l(fr, en, es) });
export const learner = l("Toi", "You", "Tú");
export const aya = l("Aya", "Aya", "Aya");
export const staff = l("La personne à l’accueil", "Reception staff", "La persona de recepción");
export const d = (speaker: JapaneseLocalized, phrase: JapanesePhrase) => ({ ...phrase, speaker });
export const vocab = (unit: number, phrases: JapanesePhrase[]) =>
  phrases.map((phrase, index) => ({ ...phrase, id: `jp-${unit}-vocab-${index + 1}` }));
export const a = (id: string, title: JapaneseLocalized, prompt: JapaneseLocalized,
  hint: JapaneseLocalized, explanation: JapaneseLocalized,
  skill: JapaneseActivityBase["skill"] = "grammar"): JapaneseActivityBase =>
  ({ id, title, prompt, hint, explanation, skill });

type Option = { text: JapanesePhrase | JapaneseLocalized; reason: JapaneseLocalized };
export const o = (text: Option["text"], reason: JapaneseLocalized): Option => ({ text, reason });
function options(id: string, correct: Option, wrong: [Option, Option], position: number): JapaneseChoice[] {
  const ordered = [...wrong]; ordered.splice(position % 3, 0, correct);
  return ordered.map((option, index) => {
    const visible = "ja" in option.text ? l(option.text.ja, option.text.ja, option.text.ja) : option.text;
    const expected = "ja" in correct.text ? l(correct.text.ja, correct.text.ja, correct.text.ja) : correct.text;
    return {
      id: `${id}-${index + 1}`,
      ...("ja" in option.text ? { ja: option.text.ja, kana: option.text.kana, romaji: option.text.romaji } : { label: option.text }),
      feedback: l(
        `Ton choix : « ${visible.fr} ». Réponse attendue : « ${expected.fr} ». ${option.reason.fr}`,
        `Your choice: “${visible.en}”. Expected answer: “${expected.en}”. ${option.reason.en}`,
        `Tu elección: «${visible.es}». Respuesta esperada: «${expected.es}». ${option.reason.es}`,
      ),
    };
  });
}
export function choose(base: JapaneseActivityBase, correct: Option, wrong: [Option, Option], position = 0,
  extra: { stimulus?: JapanesePhrase; sourceIds?: string[]; kind?: "choice" | "culture" } = {}): JapaneseChoiceActivity {
  return { ...base, kind: "choice", choices: options(base.id, correct, wrong, position), answerId: `${base.id}-${position % 3 + 1}`, ...extra };
}
export function build(base: JapaneseActivityBase, words: string[], phrase: JapanesePhrase): JapaneseBuildActivity {
  const tokens = words.map((text, index) => ({ id: `${base.id}-token-${index + 1}`, text }));
  return { ...base, kind: "build", tokens: [...tokens.slice(1), tokens[0]], answerOrder: tokens.map(token => token.id), phrase };
}
export function recall(base: JapaneseActivityBase, phrase: JapanesePhrase, variants: string[] = []): JapaneseReadingActivity {
  return { ...base, kind: "reading", responseMode: "recall", stimulus: "", answer: phrase.ja,
    accepted: [...new Set([phrase.ja, phrase.kana, ...variants])], acceptsRomaji: false };
}
export const reading = (base: JapaneseActivityBase, stimulus: string, answer: string): JapaneseReadingActivity =>
  ({ ...base, kind: "reading", stimulus, answer, accepted: [answer], acceptsRomaji: false });
export const match = (base: JapaneseActivityBase, phrases: JapanesePhrase[]): JapaneseMatchActivity =>
  ({ ...base, kind: "match", pairs: phrases.map((phrase, index) => ({ id: `${base.id}-pair-${index + 1}`, phrase })) });
export function turn(id: string, speaker: JapaneseLocalized, line: JapanesePhrase, goal: JapaneseLocalized,
  hint: JapaneseLocalized, correct: Option, wrong: [Option, Option], position: number): JapaneseRoleplayTurn {
  return { id, speaker, line, goal, hint, choices: options(id, correct, wrong, position), answerId: `${id}-${position % 3 + 1}` };
}
