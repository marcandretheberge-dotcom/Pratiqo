import {
  germanLesson,
  type GermanLessonSpec,
  t,
  phrase,
} from "../german/courseAuthoring";
import type { CoursePhrase, CourseLesson } from "../italian/course/courseTypes";
import type { LocaleText } from "../italian/italianModuleTypes";
export { t, phrase };
type Phrase = [string, string, string, string];
export function lesson(
  id: string,
  title: LocaleText,
  grammar: LocaleText,
  sound: LocaleText,
  words: Phrase[],
  reading: Phrase,
  question: LocaleText,
  answers: [string, string, string],
): CourseLesson {
  const vocabulary: CoursePhrase[] = words.map((word) => phrase(...word));
  const spec: GermanLessonSpec = {
    id: `ptbr1-${id}`,
    title,
    grammar,
    sound,
    words: vocabulary,
    reading: phrase(...reading),
    question,
    answers,
    listen: vocabulary[0].it,
    heard: [
      vocabulary[0].meaning,
      vocabulary[2].meaning,
      vocabulary[3].meaning,
    ],
  };
  return germanLesson(spec, "pt-BR");
}
