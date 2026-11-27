import type { InterestId } from "../../interests/preferences";
import type { CourseLesson, CourseUnit } from "../course/courseTypes";
import { artInterestUnit } from "./art";
import { foodInterestUnit } from "./food";
import { historyInterestUnit } from "./history";
import { musicInterestUnit } from "./music";
import { natureInterestUnit } from "./nature";
import { sportInterestUnit } from "./sport";

/** Immutable authored v1 packages. The selector combines equivalent lesson slots. */
export const italianInterestUnits: Record<InterestId, CourseUnit> = {
  music: musicInterestUnit,
  art: artInterestUnit,
  history: historyInterestUnit,
  sport: sportInterestUnit,
  food: foodInterestUnit,
  nature: natureInterestUnit,
};
export const italianInterestAllUnits: CourseUnit[] = Object.values(italianInterestUnits);
export const italianInterestLessons: CourseLesson[] = italianInterestAllUnits.flatMap(unit => unit.lessons);
export { italianInterestSources } from "./sources";
export { italianInterestUnitOneQuiz, italianInterestUnitOneProduction } from "./authoring";

export function findItalianInterestLesson(lessonId: string): CourseLesson | undefined {
  return italianInterestLessons.find(lesson => lesson.id === lessonId);
}
