import { base, choice, option, t, foundationLesson, type FoundationLessonSpec } from "../foundations/courseAuthoring";
import type { ItalianDialogueActivity, LocaleText } from "../italian/italianModuleTypes";
import type { CourseQuestion } from "../italian/course/courseTypes";

export { t, phrase as p } from "../foundations/courseAuthoring";

type Turn = [line: string, intention: LocaleText, answers: [string, string, string], explanation: LocaleText];

/** Only authored data is assembled here; checking and progression stay in the shared engine. */
export function englishLesson(spec: FoundationLessonSpec & { dictationAccepted?: string[] }, turns: [Turn, Turn, Turn]) {
  const activity: ItalianDialogueActivity = {
    ...base(`${spec.id}-dialogue`, t("L’échange avec Yoppo", "The exchange with Yoppo", "La conversación con Yoppo"),
      spec.goal, t("Réponds à l’intention indiquée pour chaque tour.", "Respond to the stated intention at each turn.", "Responde a la intención indicada en cada turno.")),
    kind: "dialogue",
    turns: turns.map(([line, prompt, answers, explanation], index) => {
      const options = answers.map((answer, n) => option(`${index}-${n}`, answer, n === 0 ? explanation : t(
        `Tu as choisi « ${answer} ». L’intention demande « ${answers[0]} ». ${explanation.fr}`,
        `You chose “${answer}”. The intention calls for “${answers[0]}”. ${explanation.en}`,
        `Elegiste « ${answer} ». La intención requiere « ${answers[0]} ». ${explanation.es}`,
      )));
      const offset = (index + spec.id.charCodeAt(spec.id.length - 1)) % options.length;
      return { speaker: "Yoppo", line, prompt, correctId: `${index}-0`, options: [...options.slice(offset), ...options.slice(0, offset)] };
    }),
  };
  const result = foundationLesson({ ...spec, extra: [...(spec.extra ?? []), activity] }, "en");
  if (spec.dictationAccepted) {
    const dictation = result.activities.find(item => item.id === `${spec.id}-dictation`);
    if (dictation?.kind === "type") dictation.accepted = spec.dictationAccepted;
  }
  return result;
}

export function writtenChoice(id: string, prompt: LocaleText, answers: [string, string, string], explanation: LocaleText): CourseQuestion {
  const options = answers.map((answer, index) => option(String(index), answer, index === 0 ? explanation : t(
    `Tu as choisi « ${answer} ». La situation correspond à « ${answers[0]} ». ${explanation.fr}`,
    `You chose “${answer}”. The situation matches “${answers[0]}”. ${explanation.en}`,
    `Elegiste « ${answer} ». La situación corresponde a « ${answers[0]} ». ${explanation.es}`,
  )));
  const offset = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % options.length;
  return choice(id, prompt, [...options.slice(offset), ...options.slice(0, offset)], "0", explanation);
}

export function writtenRecall(id: string, prompt: LocaleText, model: string, explanation: LocaleText, alternatives: string[] = []): CourseQuestion {
  return { ...base(id, t("Un message à retrouver", "Recall a message", "Recuerda un mensaje"), prompt, explanation), kind: "type", model, accepted: [model, ...alternatives] };
}
