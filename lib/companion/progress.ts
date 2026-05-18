import type { CompanionEvolutionStage } from "@/lib/companion/evolution";

export function safeCompletedLessonCount(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

export function getLessonsRemainingToNextStage(
  currentStage: CompanionEvolutionStage,
  nextStage: CompanionEvolutionStage | null,
  completedLessons: number,
): number {
  if (!nextStage) return 0;
  return Math.max(0, nextStage.unlockAt - safeCompletedLessonCount(completedLessons));
}

export function getStageProgressPercent(
  currentStage: CompanionEvolutionStage,
  nextStage: CompanionEvolutionStage | null,
  completedLessons: number,
): number {
  if (!nextStage) return 100;
  const span = Math.max(1, nextStage.unlockAt - currentStage.unlockAt);
  const progress = Math.max(0, safeCompletedLessonCount(completedLessons) - currentStage.unlockAt);
  return Math.max(0, Math.min(100, Math.round((progress / span) * 100)));
}
