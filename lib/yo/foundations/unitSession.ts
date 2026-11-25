import type { CourseUnit } from "../italian/course/courseTypes";

export type UnitSessionView = "learn" | "practice" | "quiz" | "write";
export interface UnitSessionDraft {
  version: 1; unitId: string; resetAt: number; lessonId: string; activityId: string;
  view: UnitSessionView; study: number; assisted: boolean; solved: boolean; wrong: boolean; resultAssisted: boolean;
}

/** Cursor and assistance only. Free answers and personal notes are not copied here. */
export function parseUnitSession(raw: string | null, unit: CourseUnit, resetAt: number): UnitSessionDraft | null {
  if (!raw || raw.length > 3000) return null;
  try {
    const value = JSON.parse(raw) as Partial<UnitSessionDraft>;
    if (!value || value.version !== 1 || value.unitId !== unit.id || value.resetAt !== resetAt ||
      !["learn", "practice", "quiz", "write"].includes(String(value.view)) ||
      !Number.isInteger(value.study) || value.study! < 0 || value.study! > 5 ||
      ![value.assisted, value.solved, value.wrong, value.resultAssisted].every(item => typeof item === "boolean")) return null;
    const lesson = unit.lessons.find(item => item.id === value.lessonId);
    if (!lesson?.activities.some(item => item.id === value.activityId)) return null;
    if (value.solved && value.wrong || value.resultAssisted && !value.solved) return null;
    return {
      version: 1, unitId: unit.id, resetAt, lessonId: lesson.id, activityId: value.activityId!, view: value.view!, study: value.study!,
      assisted: value.assisted! || value.wrong! || value.resultAssisted!, solved: value.solved!, wrong: value.wrong!, resultAssisted: value.resultAssisted!,
    };
  } catch { return null; }
}
