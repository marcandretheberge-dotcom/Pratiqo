import { foundationLesson, base, option, phrase, t, type FoundationLessonSpec } from "../foundations/courseAuthoring";
import type { ItalianDialogueTurn, LocaleText } from "../italian/italianModuleTypes";
import type { CourseQuestion } from "../italian/course/courseTypes";

export { t };
export const p = phrase;
interface PortugueseTurn {
  speaker: string;
  line: string;
  prompt: LocaleText;
  replies: [string, string, string];
  explanation: LocaleText;
}
function feedback(selected: string, expected: string, why: LocaleText): LocaleText {
  return selected === expected ? t(
    "« " + selected + " » convient ici. " + why.fr,
    "“" + selected + "” fits here. " + why.en,
    "«" + selected + "» corresponde aquí. " + why.es,
  ) : t(
    "Tu as choisi « " + selected + " ». Ici, on attend « " + expected + " ». " + why.fr,
    "You chose “" + selected + "”. Here the expected reply is “" + expected + "”. " + why.en,
    "Elegiste «" + selected + "». Aquí se espera «" + expected + "». " + why.es,
  );
}
/** New lessons only: the historical Portuguese builder and its output stay unchanged. */
export function depthLesson(spec: Omit<FoundationLessonSpec, "extra"> & { turns: [PortugueseTurn, PortugueseTurn, PortugueseTurn] }) {
  const { turns, ...lesson } = spec;
  const dialogue: ItalianDialogueTurn[] = turns.map((turn, index) => {
    const options = turn.replies.map((text, i) => option(String(i), text, feedback(text, turn.replies[0], turn.explanation)));
    const offset = (Array.from(spec.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) + index) % options.length;
    return { speaker: turn.speaker, line: turn.line, prompt: turn.prompt,
      options: [...options.slice(offset), ...options.slice(0, offset)], correctId: "0" };
  });
  return foundationLesson({ ...lesson, extra: [{
    ...base(spec.id + "-dialogue", t("Un échange en trois temps", "A three-turn exchange", "Un intercambio en tres pasos"), spec.goal, turns[2].explanation),
    kind: "dialogue", turns: dialogue,
  }] }, "pt-BR");
}
export function writtenChoice(id: string, unitId: string, prompt: LocaleText, replies: [string, string, string], why: LocaleText): CourseQuestion {
  const options = replies.map((text, i) => option(String(i), text, feedback(text, replies[0], why)));
  const offset = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % options.length;
  return { ...base(id, t("Choisis le message qui convient", "Choose the useful message", "Elige el mensaje adecuado"), prompt, why),
    kind: "choice", options: [...options.slice(offset), ...options.slice(0, offset)], correctId: "0", taughtInUnitId: unitId };
}
export function writtenRecall(id: string, unitId: string, prompt: LocaleText, accepted: [string, ...string[]], why: LocaleText): CourseQuestion {
  return { ...base(id, t("Écris pour cette situation", "Write for this situation", "Escribe para esta situación"), prompt, why),
    kind: "type", model: accepted[0], accepted, taughtInUnitId: unitId };
}
