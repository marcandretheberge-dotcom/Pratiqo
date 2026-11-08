import type { CourseCatalog, CourseUnitSummary } from "./course/courseTypes";
import type { CourseProgress } from "./course/courseProgress";

export type ItalianCityAchievement = {
  mastered: boolean;
  best: number | null;
  practiced: number;
  total: number;
};

/** Printable evidence only. Never grants stamps, credits, Passes or entitlements. */
export function deriveItalianCityAchievement(
  unit: CourseUnitSummary,
  catalog: CourseCatalog,
  progress: CourseProgress,
): ItalianCityAchievement {
  const assessment = catalog.assessments.find(item =>
    item.id === unit.quizId && item.unitIds.includes(unit.id) && item.theme !== "culture");
  const best = progress.assessments[unit.quizId]?.bestIndependent ?? null;
  return {
    mastered: Boolean(assessment && best !== null && best >= assessment.passPercent),
    best,
    practiced: unit.activityIds.filter(id => progress.activities[id]?.completed).length,
    total: unit.activityIds.length,
  };
}
