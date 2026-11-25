import { foundationLesson, base, option, t, phrase, type FoundationLessonSpec } from "../foundations/courseAuthoring";
import type { ItalianDialogueTurn, LocaleText } from "../italian/italianModuleTypes";
import type { CourseQuestion } from "../italian/course/courseTypes";

export { t };
export const p = phrase;

export interface SpanishTurn {
  speaker: string;
  line: string;
  prompt: LocaleText;
  replies: [string, string, string];
  explanation: LocaleText;
}

function checkedReply(selected: string, expected: string, explanation: LocaleText): LocaleText {
  if (selected === expected) return t(
    `« ${selected} » convient ici. ${explanation.fr}`,
    `“${selected}” fits here. ${explanation.en}`,
    `«${selected}» corresponde aquí. ${explanation.es}`,
  );
  return t(
    `Tu as choisi « ${selected} ». Ici, la réponse attendue est « ${expected} ». ${explanation.fr}`,
    `You chose “${selected}”. Here the expected reply is “${expected}”. ${explanation.en}`,
    `Elegiste «${selected}». Aquí se espera «${expected}». ${explanation.es}`,
  );
}

/** Only structural wiring is shared. Every scene, intention and reply is authored below. */
export function spanishLesson(spec: Omit<FoundationLessonSpec, "extra"> & { turns: [SpanishTurn, SpanishTurn] }) {
  const { turns, ...lesson } = spec;
  const dialogueTurns: ItalianDialogueTurn[] = turns.map((turn, index) => {
    const replies = turn.replies.map((text, i) => option(String(i), text, checkedReply(text, turn.replies[0], turn.explanation)));
    const offset = (Number(spec.id.slice(5, 7)) + index) % replies.length;
    return {
      speaker: turn.speaker,
      line: turn.line,
      prompt: turn.prompt,
      options: [...replies.slice(offset), ...replies.slice(0, offset)],
      correctId: "0",
    };
  });
  return foundationLesson({
    ...lesson,
    extra: [{
      ...base(`${spec.id}-dialogue`, t("L’échange continue", "Keep the conversation going", "Sigue la conversación"), spec.goal, turns[1].explanation),
      kind: "dialogue",
      turns: dialogueTurns,
    }],
  }, "es");
}

export function writtenChoice(id: string, unitId: string, prompt: LocaleText, replies: [string, string, string], explanation: LocaleText): CourseQuestion {
  const options = replies.map((text, index) => option(String(index), text, checkedReply(text, replies[0], explanation)));
  const offset = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % options.length;
  return {
    ...base(id, t("Applique dans une nouvelle situation", "Apply it in a new situation", "Aplica lo aprendido en otra situación"), prompt, explanation),
    category: "final",
    kind: "choice",
    options: [...options.slice(offset), ...options.slice(0, offset)],
    correctId: "0",
    taughtInUnitId: unitId,
  };
}

export function writtenRecall(id: string, unitId: string, prompt: LocaleText, accepted: [string, ...string[]], explanation: LocaleText): CourseQuestion {
  return {
    ...base(id, t("Écris le message utile", "Write the useful message", "Escribe el mensaje adecuado"), prompt, explanation),
    category: "final",
    kind: "type",
    model: accepted[0],
    accepted,
    taughtInUnitId: unitId,
  };
}
