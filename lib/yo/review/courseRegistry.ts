import type { CourseCatalog } from "../italian/course/courseTypes";
import { GUIDED_PROGRESS_KEY } from "../personalized/profile";
import { GERMAN_PROGRESS_KEY } from "../german/courseLogic";
import { PORTUGUESE_PROGRESS_KEY } from "../portuguese/courseLogic";
import { foundationSettings, type TextCourseLanguage } from "../foundations/experience";

/** Only canonical learner stores participate; demos and historical copies stay isolated. */
export function reviewLanguageForCourseKey(key: string): TextCourseLanguage | null {
  if (key === GUIDED_PROGRESS_KEY) return "it";
  if (key === GERMAN_PROGRESS_KEY) return "de";
  if (key === PORTUGUESE_PROGRESS_KEY) return "pt-BR";
  for (const language of ["en", "es", "fr-CA"] as const) {
    if (key === foundationSettings[language].progressKey) return language;
  }
  return null;
}

export function courseReviewId(unitId: string, lessonId: string, activityId: string) {
  return `course:${unitId}:${lessonId}:${activityId}`;
}
export function courseReviewIds(catalog: CourseCatalog): string[] {
  return catalog.units.flatMap(unit => unit.lessons.flatMap(lesson =>
    lesson.activityIds.map(id => courseReviewId(unit.id, lesson.id, id))));
}
export function findCourseReviewId(catalog: CourseCatalog, activityId: string): string | null {
  for (const unit of catalog.units) for (const lesson of unit.lessons) {
    if (lesson.activityIds.includes(activityId)) return courseReviewId(unit.id, lesson.id, activityId);
  }
  return null;
}
