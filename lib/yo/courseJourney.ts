import type { CourseCatalog } from "./italian/course/courseTypes";
import type { CourseProgress } from "./italian/course/courseProgress";
import { buildLearningJourney } from "./learningJourney";

/** A checkpoint is evidence for its questions, not certification of a skill. */
export function buildCourseJourney(catalog: CourseCatalog, progress: CourseProgress) {
  return buildLearningJourney(catalog.units, unit => {
    const assessment = catalog.assessments.find(item => item.id === unit.quizId);
    return {
      passed: Boolean(assessment && (progress.assessments[unit.quizId]?.bestIndependent ?? -1) >= assessment.passPercent),
      // Legacy activity stays reachable without becoming a passed checkpoint.
      started: Boolean(progress.resume?.unitId === unit.id || progress.assessments[unit.quizId] ||
        progress.productionsUpdatedAt[unit.productionId] || unit.activityIds.some(id => progress.activities[id])),
      practiced: unit.activityIds.filter(id => progress.activities[id]?.completed).length,
      independent: unit.activityIds.filter(id => progress.activities[id]?.independent).length,
    };
  }, progress.resume?.unitId);
}

export function canEnterCourseAssessment(catalog: CourseCatalog, progress: CourseProgress, assessmentId: string) {
  const assessment = catalog.assessments.find(item => item.id === assessmentId);
  if (!assessment) return false;
  if (progress.assessments[assessmentId]) return true;
  const { steps } = buildCourseJourney(catalog, progress);
  const unit = steps.find(step => step.unit.quizId === assessmentId);
  return unit ? unit.unlocked : assessment.unitIds.length > 0 && assessment.unitIds.every(id => steps.some(step => step.unit.id === id && step.passed));
}
