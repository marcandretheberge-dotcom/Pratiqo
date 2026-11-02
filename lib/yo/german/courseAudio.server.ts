import { germanPublishedAudio } from "./courseAudioPublished";
import {
  assessmentSpeech,
  distinctSpeech,
  unitSpeech,
} from "../italian/course/courseSpeech";
import type {
  CourseAssessment,
  CourseUnit,
} from "../italian/course/courseTypes";
export function germanUnitSpeech(unit: CourseUnit) {
  return distinctSpeech([
    ...unitSpeech(unit),
    ...(unit.cultureStop ? [unit.cultureStop.phrase.it] : []),
  ]);
}
export function germanAudioPaths(
  content: CourseUnit | CourseAssessment,
): Record<string, string> {
  const texts =
    "lessons" in content
      ? germanUnitSpeech(content)
      : assessmentSpeech(content);
  return Object.fromEntries(
    texts.flatMap((text) => {
      const key = text.normalize("NFC").trim(),
        path = germanPublishedAudio[key];
      return path ? [[key, path]] : [];
    }),
  );
}
