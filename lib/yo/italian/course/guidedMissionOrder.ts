import type { CourseProgress } from "./courseProgress";
import { emptyGame, type GuidedState, type GuidedStep } from "./guidedItalian";

/**
 * Presentation order only. Keep the canonical guidedSteps() identifiers and
 * indexes exactly as they were, so persisted v2 drafts and scored progress
 * remain compatible with the protected progression engine.
 *
 * If a visual preparation already taught a lesson's words, omit its redundant
 * "words" screen. Otherwise show words before the listening scene.
 */
export function guidedMissionOrder(steps: readonly GuidedStep[]): number[] {
  const result: number[] = [];
  const lessonNumbers = [...new Set(steps.map(step => step.lesson))];
  for (const lesson of lessonNumbers) {
    const positions = steps.map((step, index) => ({ ...step, index })).filter(step => step.lesson === lesson);
    const prepared = positions.some(step => step.stage === "prepare");
    const stages = prepared ? ["prepare", "scene", "language", "sounds"] : ["words", "scene", "language", "sounds"];
    for (const stage of stages) {
      const found = positions.find(step => step.stage === stage);
      if (found) result.push(found.index);
    }
    result.push(...positions.filter(step => step.stage === "exercise").map(step => step.index));
  }
  return result;
}

export function nextGuidedMissionStep(steps: readonly GuidedStep[], order: readonly number[], state: GuidedState, progress: CourseProgress): number {
  for (const index of order) {
    const step = steps[index];
    if (step.activity ? !progress.activities[step.id]?.completed : !state.seen.includes(step.id)) return index;
  }
  return -1;
}

export function followingGuidedMissionStep(order: readonly number[], at: number): number {
  const position = order.indexOf(at);
  return position >= 0 ? (order[position + 1] ?? -1) : -1;
}

/** A learner who paused on the old, redundant page should proceed to the
 * language explanation, never be forced to repeat the same word lecture. */
export function restoreGuidedMissionDraft(state: GuidedState, steps: readonly GuidedStep[], order: readonly number[]): GuidedState {
  if (order.includes(state.step) || (state.view !== "mission" && state.resumeView !== "mission")) return state;
  const oldStep = steps[state.step];
  if (!oldStep || oldStep.stage !== "words") return state;
  const replacement = steps.findIndex((step, index) => step.lesson === oldStep.lesson && step.stage === "language" && order.includes(index));
  if (replacement < 0) return state;
  return { ...state, step: replacement, game: emptyGame() };
}
