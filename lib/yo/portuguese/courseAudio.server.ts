import { portuguesePublishedAudio } from "./courseAudioPublished";
import {
  assessmentSpeech,
  distinctSpeech,
  unitSpeech,
} from "../italian/course/courseSpeech";
import type {
  CourseAssessment,
  CourseUnit,
} from "../italian/course/courseTypes";
export const portugueseUnitSpeech = (unit: CourseUnit) =>
  distinctSpeech([
    ...unitSpeech(unit),
    ...(unit.cultureStop ? [unit.cultureStop.phrase.it] : []),
  ]);
export function portugueseAudioPaths(
  content: CourseUnit | CourseAssessment,
): Record<string, string> {
  const texts =
    "lessons" in content
      ? portugueseUnitSpeech(content)
      : assessmentSpeech(content);
  return Object.fromEntries(
    texts.flatMap((text) => {
      const key = text.normalize("NFC").trim(),
        path = portuguesePublishedAudio[key];
      return path ? [[key, path]] : [];
    }),
  );
}
