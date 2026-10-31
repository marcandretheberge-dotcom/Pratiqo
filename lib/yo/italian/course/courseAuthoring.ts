import type { ItalianActivityBase, ItalianChoiceActivity, ItalianDialogueActivity, ItalianDialogueTurn, ItalianOption, ItalianTypeActivity, LocaleText } from "../italianModuleTypes";
import type { CourseLesson, CoursePhrase } from "./courseTypes";

export const t = (fr: string, en: string, es: string): LocaleText => ({ fr, en, es });
export const phrase = (it: string, fr: string, en: string, es: string): CoursePhrase => ({ it, meaning: t(fr, en, es) });
export function base(id: string, title: LocaleText, prompt: LocaleText, explanation: LocaleText, hint?: LocaleText, hint2?: LocaleText): ItalianActivityBase {
  return { id, category: "greetings", title, prompt, explanation,
    hint: hint ?? t("Cherche les mots que tu reconnais, puis relis la consigne.", "Find the words you recognise, then read the task again.", "Busca las palabras que reconoces y vuelve a leer la consigna."),
    hint2: hint2 ?? explanation };
}
export const option = (id: string, it: string, feedback: LocaleText): ItalianOption => ({ id, it, feedback });
export function choice(id: string, prompt: LocaleText, options: ItalianOption[], correctId: string, explanation: LocaleText, kind: "choice" | "listen" | "culture" = "choice", stimulus?: string): ItalianChoiceActivity {
  return { ...base(id, kind === "listen" ? t("L’oreille de Yoppo", "Yoppo’s listening challenge", "El oído de Yoppo") : t("Trouve le bon sens", "Find the right meaning", "Encuentra el sentido"), prompt, explanation), kind, options, correctId, ...(stimulus ? { stimulus } : {}) };
}
export function recall(id: string, target: CoursePhrase, accepted: string[] = [target.it]): ItalianTypeActivity {
  return { ...base(id, t("À toi d’écrire", "Your turn to write", "Te toca escribir"), t(`Écris en italien : « ${target.meaning.fr} »`, `Write in Italian: “${target.meaning.en}”`, `Escribe en italiano: «${target.meaning.es}»`), t(`Une formulation possible : ${target.it}`, `One possible formulation: ${target.it}`, `Una formulación posible: ${target.it}`)), kind: "type", model: target.it, accepted };
}
export function dialogue(id: string, title: LocaleText, prompt: LocaleText, turns: ItalianDialogueTurn[], explanation: LocaleText): ItalianDialogueActivity {
  return { ...base(id, title, prompt, explanation), kind: "dialogue", turns };
}
export interface LessonSpec extends Omit<CourseLesson, "activities"> {
  order: CoursePhrase;
  recall: CoursePhrase;
  accepted?: string[];
  comprehension: ItalianChoiceActivity;
  listening: ItalianChoiceActivity;
  extra?: CourseLesson["activities"];
}
/** Each task has authored material; only repetitive structural wiring is shared. */
export function lesson(spec: LessonSpec): CourseLesson {
  const { order, recall: recallPhrase, accepted, comprehension, listening, extra = [], ...content } = spec;
  const tokens = order.it.split(/\s+/);
  return { ...content, readingActivityId: comprehension.id, activities: [
    { ...base(`${spec.id}-pairs`, t("Les paires de Yoppo", "Yoppo’s pairs", "Las parejas de Yoppo"), t("Associe les expressions à leur sens.", "Match each expression to its meaning.", "Relaciona cada expresión con su significado."), t("Relis ensuite les expressions à voix haute.", "Then read the expressions aloud.", "Después lee las expresiones en voz alta.")), kind: "match", pairs: spec.vocabulary.slice(0, 4).map((p, i) => ({ id: `${spec.id}-p${i}`, it: p.it, meaning: p.meaning })) },
    { ...base(`${spec.id}-build`, t("L’atelier des phrases", "The sentence workshop", "El taller de frases"), t(`Reconstruis la formulation étudiée : « ${order.meaning.fr} ». Premier mot : ${tokens[0]}`, `Rebuild the studied wording: “${order.meaning.en}”. First word: ${tokens[0]}`, `Reconstruye la formulación estudiada: «${order.meaning.es}». Primera palabra: ${tokens[0]}`), t(`La phrase du modèle : ${order.it}`, `The model sentence: ${order.it}`, `La frase del modelo: ${order.it}`)), kind: "order", tokens, answer: tokens, it: order.it },
    comprehension, listening, recall(`${spec.id}-write`, recallPhrase, accepted), ...extra,
  ] };
}
