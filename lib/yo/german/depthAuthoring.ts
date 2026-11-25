import { base, choice, option, t, foundationLesson, type FoundationLessonSpec } from "../foundations/courseAuthoring";
import type { ItalianDialogueActivity, LocaleText } from "../italian/italianModuleTypes";
import type { CourseQuestion } from "../italian/course/courseTypes";

export { t, phrase as p } from "../foundations/courseAuthoring";

type Turn = [line: string, intention: LocaleText, replies: [string, string, string], explanation: LocaleText];

/** Extensions use the explicit-goal builder; the historical DE/PT builder stays unchanged. */
export function germanDepthLesson(spec: FoundationLessonSpec, turns: [Turn, Turn, Turn]) {
  const dialogue: ItalianDialogueActivity = {
    ...base(`${spec.id}-dialogue`, t("L’échange avec Yoppo", "The exchange with Yoppo", "La conversación con Yoppo"),
      spec.goal, t("Réponds à l’intention de chaque tour.", "Respond to the intention at each turn.", "Responde a la intención de cada turno.")),
    kind: "dialogue",
    turns: turns.map(([line, prompt, replies, explanation], index) => {
      const options = replies.map((reply, n) => option(`${index}-${n}`, reply, n === 0 ? explanation : t(
        `Tu as choisi « ${reply} ». La réponse attendue est « ${replies[0]} ». ${explanation.fr}`,
        `You chose “${reply}”. The expected reply is “${replies[0]}”. ${explanation.en}`,
        `Elegiste «${reply}». La respuesta esperada es «${replies[0]}». ${explanation.es}`,
      )));
      const offset = (index + spec.id.charCodeAt(spec.id.length - 1)) % options.length;
      return { speaker: "Yoppo", line, prompt, correctId: `${index}-0`, options: [...options.slice(offset), ...options.slice(0, offset)] };
    }),
  };
  return foundationLesson({ ...spec, extra: [...(spec.extra ?? []), dialogue] }, "de");
}

/** The first authored answer is correct; rotation prevents a fixed answer position. */
export function depthChoice(id: string, prompt: LocaleText, answers: [string, string, string], explanation: LocaleText): CourseQuestion {
  const options = answers.map((answer, i) => option(String(i), answer, i === 0 ? explanation : t(
    `Tu as choisi « ${answer} ». Le contexte demande « ${answers[0]} ». ${explanation.fr}`,
    `You chose “${answer}”. The context calls for “${answers[0]}”. ${explanation.en}`,
    `Elegiste «${answer}». El contexto requiere «${answers[0]}». ${explanation.es}`,
  )));
  const offset = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % options.length;
  return choice(id, prompt, [...options.slice(offset), ...options.slice(0, offset)], "0", explanation);
}

export function depthRecall(id: string, prompt: LocaleText, model: string, explanation: LocaleText, alternatives: string[] = []): CourseQuestion {
  return { ...base(id, t("Un message à formuler", "Form a message", "Formula un mensaje"), prompt, explanation), kind: "type", model, accepted: [model, ...alternatives] };
}
