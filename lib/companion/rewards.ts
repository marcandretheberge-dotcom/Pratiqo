import {
  COMPANIONS,
  getCompanionStage,
  getCompanionStageIndex,
  type CompanionType,
} from "@/lib/companions";
import { COMPANION_MILESTONE_AMOUNTS } from "@/lib/credits";

export const COMPLETED_LESSON_FOR_COMPANION_FILTER = "status.eq.completed,completed_at.not.is.null";

export type CompanionRewardStatus = {
  status?: string | null;
  completed_at?: string | null;
};

export function isCompletedLessonForCompanion(row: CompanionRewardStatus): boolean {
  const status = String(row.status ?? "").toLowerCase();
  return status === "completed" || Boolean(row.completed_at);
}

export function isRewardCompanionType(value: string | null | undefined): value is CompanionType {
  return value === "phoenix" || value === "forest" || value === "dragon" || value === "star";
}

export function getCompanionMilestoneForCompletedLesson(
  companionType: CompanionType,
  completedLessonCount: number,
):
  | {
      companionName: string;
      previousEmoji: string;
      nextEmoji: string;
      previousStageName: string;
      nextStageName: string;
      stageIndex: number;
      amount: number;
    }
  | null {
  const total = Math.max(0, Math.floor(Number.isFinite(completedLessonCount) ? completedLessonCount : 0));
  if (total <= 0) return null;

  const previousCount = Math.max(0, total - 1);
  const previousStageIndex = getCompanionStageIndex(companionType, previousCount);
  const nextStageIndex = getCompanionStageIndex(companionType, total);
  if (previousStageIndex === nextStageIndex) return null;

  const previousStage = getCompanionStage(companionType, previousCount);
  const nextStage = getCompanionStage(companionType, total);

  return {
    companionName: COMPANIONS[companionType].name,
    previousEmoji: previousStage.emoji,
    nextEmoji: nextStage.emoji,
    previousStageName: previousStage.name,
    nextStageName: nextStage.name,
    stageIndex: nextStageIndex,
    amount: COMPANION_MILESTONE_AMOUNTS[nextStageIndex] ?? 0,
  };
}
