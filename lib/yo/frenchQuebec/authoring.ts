import { foundationLesson, base, option, phrase, t, type FoundationLessonSpec } from "../foundations/courseAuthoring";
import type { CourseLesson } from "../italian/course/courseTypes";
import type { ItalianDialogueActivity, LocaleText } from "../italian/italianModuleTypes";
export { t, phrase };
export type Phrase = [string, string, string, string];
type Turn = [line: string, answer: string, wrong1: string, wrong2: string];
export type QuebecLessonSpec = Omit<FoundationLessonSpec, "words" | "reading" | "extra"> & {
  words: Phrase[]; reading: Phrase;
  conversation: { speaker: string; context: LocaleText; turns: Turn[] };
};

/** Original authored scenes; this helper only connects the existing exercise formats. */
export function quebecLesson(spec: QuebecLessonSpec): CourseLesson {
  const { words, reading, conversation, ...content } = spec;
  const dialogue: ItalianDialogueActivity = {
    ...base(`${spec.id}-conversation`, t("À toi dans la conversation", "Your turn in the conversation", "Tu turno en la conversación"), conversation.context, spec.grammar),
    kind: "dialogue",
    turns: conversation.turns.map(([line, answer, wrong1, wrong2], index) => {
      const feedback = t("Cette réponse répond à la demande de ton interlocuteur.", "This reply addresses what the other person is asking.", "Esta respuesta corresponde a lo que pregunta la otra persona.");
      const retry = (selected: string) => t(
        `Tu as choisi « ${selected} ». Pour répondre à « ${line} » dans cette scène, utilise « ${answer} ». ${conversation.context.fr}`,
        `You chose “${selected}”. To answer “${line}” in this scene, use “${answer}”. ${conversation.context.en}`,
        `Elegiste «${selected}». Para responder a «${line}» en esta escena, usa «${answer}». ${conversation.context.es}`,
      );
      const options = [option("answer", answer, feedback), option("other-1", wrong1, retry(wrong1)), option("other-2", wrong2, retry(wrong2))];
      const offset = (Number(spec.id.match(/u(\d+)/)?.[1] ?? 0) + index) % options.length;
      return { speaker: conversation.speaker, line, prompt: conversation.context, options: [...options.slice(offset), ...options.slice(0, offset)], correctId: "answer" };
    }),
  };
  return foundationLesson({ ...content, words: words.map(value => phrase(...value)), reading: phrase(...reading), extra: [dialogue] }, "fr-CA");
}
