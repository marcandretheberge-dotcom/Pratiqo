import type { CourseUnitSummary } from "./italian/course/courseTypes";

export type JourneyUnit = Pick<CourseUnitSummary, "id" | "number" | "title" | "subtitle" | "objectives" | "activityIds" | "photo">;
export type JourneyEvidence = { passed: boolean; started: boolean; practiced: number; independent: number; midpointPassed?: boolean };

/** Navigation is local learning guidance, never an entitlement or a certification. */
export function buildLearningJourney<U extends JourneyUnit>(
  units: U[], evidence: (unit: U) => JourneyEvidence, resumeId?: string,
) {
  const results = units.map(evidence);
  const steps = units.map((unit, index) => ({
    unit,
    ...results[index],
    unlocked: index === 0 || results[index - 1].passed || results[index].started || results[index].passed,
  }));
  const resumeIndex = steps.findIndex(step => step.unit.id === resumeId && step.unlocked);
  const resume = steps[resumeIndex];
  const continuation = resume?.passed ? steps[resumeIndex + 1] : resume;
  const current = continuation?.unlocked && !continuation.passed ? continuation : steps.find(step => step.unlocked && !step.passed) ?? steps.at(-1);
  return { steps, current, passedCount: results.filter(result => result.passed).length };
}

export type LearningJourney = ReturnType<typeof buildLearningJourney>;
