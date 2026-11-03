import { createHash } from "node:crypto";
import type { YoAudioItem } from "./audioManifest.types-internal";
import { mandarinUnits, mandarinFinal } from "../mandarin/course";
import type { Phrase } from "../mandarin/types";

const phrases: Phrase[] = [...mandarinUnits, mandarinFinal].flatMap((unit) => [
  ...unit.dialogue,
  ...unit.vocabulary,
  ...unit.grammar.map((item) => item.example),
  ...unit.exercises.flatMap((item) => [
    item.model,
    ...("audio" in item && item.audio ? [item.audio] : []),
    ...("choices" in item
      ? item.choices.flatMap((choice) => (choice.phrase ? [choice.phrase] : []))
      : []),
  ]),
]);
export const mandarinCourseAudio: readonly YoAudioItem[] = [
  ...new Set(phrases.map((phrase) => phrase.hanzi)),
].map((text) => {
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
  return {
    id: "zh-course-" + hash,
    targetLanguage: "zh",
    moduleId: "mandarin-foundations",
    lessonId: "v2",
    type: "sentence",
    text,
    spokenText: text,
    storagePath: `yo/zh/mandarin-foundations/v2/mandarin-standard/sentence/${hash}.mp3`,
    accentProfile: "mandarin_standard",
  };
});
