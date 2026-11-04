import type { CourseCatalog } from "./italian/course/courseTypes";
import type { CourseProgress } from "./italian/course/courseProgress";

/** A checkpoint is evidence for its questions, not certification of a skill. */
export function buildCourseJourney(catalog: CourseCatalog, progress: CourseProgress) {
  const passed = catalog.units.map(unit => {
    const assessment = catalog.assessments.find(item => item.id === unit.quizId);
    return Boolean(assessment && (progress.assessments[unit.quizId]?.bestIndependent ?? -1) >= assessment.passPercent);
  });
  // Keep previously started units reachable. Never turn legacy activity into a passed checkpoint.
  const started = catalog.units.map(unit => Boolean(
    progress.resume?.unitId === unit.id || progress.assessments[unit.quizId] ||
    progress.productionsUpdatedAt[unit.productionId] ||
    unit.activityIds.some(id => progress.activities[id]),
  ));
  const steps = catalog.units.map((unit, index) => ({
    unit,
    passed: passed[index],
    unlocked: index === 0 || passed[index - 1] || started[index] || passed[index],
    practiced: unit.activityIds.filter(id => progress.activities[id]?.completed).length,
    independent: unit.activityIds.filter(id => progress.activities[id]?.independent).length,
  }));
  const resumeIndex = steps.findIndex(step => step.unit.id === progress.resume?.unitId && step.unlocked);
  const resume = steps[resumeIndex];
  const continuation = resume?.passed ? steps[resumeIndex + 1] : resume;
  const current = continuation?.unlocked && !continuation.passed ? continuation : steps.find(step => step.unlocked && !step.passed) ?? steps.at(-1);
  return { steps, current, passedCount: passed.filter(Boolean).length };
}

export function canEnterCourseAssessment(catalog: CourseCatalog, progress: CourseProgress, assessmentId: string) {
  const assessment = catalog.assessments.find(item => item.id === assessmentId);
  if (!assessment) return false;
  if (progress.assessments[assessmentId]) return true;
  const { steps } = buildCourseJourney(catalog, progress);
  const unit = steps.find(step => step.unit.quizId === assessmentId);
  return unit ? unit.unlocked : assessment.unitIds.length > 0 && assessment.unitIds.every(id => steps.some(step => step.unit.id === id && step.passed));
}
