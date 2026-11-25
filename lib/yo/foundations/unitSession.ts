import type { CourseUnit } from "../italian/course/courseTypes";
import { exerciseDraftRevision, TYPED_DRAFT_MAX_LENGTH } from "./typedDraft";

export type UnitSessionView = "learn" | "practice" | "quiz" | "write";
export const UNIT_SESSION_MAX_LENGTH = 32768;
export interface UnitTypedResponse {
  revision: string; text: string; assisted: boolean; solved: boolean; wrong: boolean; resultAssisted: boolean;
  generation: number; textAt: number; updatedAt: number;
}
export interface UnitSessionDraft {
  version: 1; unitId: string; resetAt: number; lessonId: string; activityId: string;
  view: UnitSessionView; study: number; assisted: boolean; solved: boolean; wrong: boolean; resultAssisted: boolean;
  courseKey?: string; activityRevision?: string; unitRevision?: string; typedResponses?: Record<string, UnitTypedResponse>;
}

const timestamp = (value: unknown, now: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= now + 60000;

/** Only the scope is inspected here: stale views must not replace a newer reset or revision. */
export function unitSessionScope(raw: string | null): { courseKey: string; unitId: string; resetAt: number; revision: string } | null {
  if (!raw || raw.length > UNIT_SESSION_MAX_LENGTH) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || typeof value.courseKey !== "string" || value.courseKey.length > 200 || typeof value.unitId !== "string" || value.unitId.length > 160 || !timestamp(value.resetAt, Date.now()) || (value.unitRevision !== undefined && (typeof value.unitRevision !== "string" || value.unitRevision.length > 80))) return null;
    return { courseKey: value.courseKey, unitId: value.unitId, resetAt: value.resetAt, revision: value.unitRevision ?? "" };
  } catch { return null; }
}

export function emptyUnitTypedResponse(revision: string): UnitTypedResponse {
  return { revision, text: "", assisted: false, solved: false, wrong: false, resultAssisted: false, generation: 0, textAt: 0, updatedAt: 0 };
}

/** Explicit edits carry their own clock. Passive cursor/help saves never make old text newer. */
export function editUnitTypedResponse(value: UnitTypedResponse, text: string, now = Date.now()): UnitTypedResponse {
  if (value.solved || text.length > TYPED_DRAFT_MAX_LENGTH || text === value.text) return value;
  const at = Math.max(now, value.updatedAt + 1);
  return { ...value, text, textAt: at, updatedAt: at };
}

export function restartUnitTypedResponse(value: UnitTypedResponse, now = Date.now()): UnitTypedResponse {
  const at = Math.max(now, value.updatedAt + 1, value.generation + 1);
  return { ...emptyUnitTypedResponse(value.revision), generation: at, textAt: at, updatedAt: at };
}

/** Merge only local exercise drafts; course grades, attempts, rewards and cursors are untouched. */
export function mergeUnitTypedResponses(left: Record<string, UnitTypedResponse>, right: Record<string, UnitTypedResponse>): Record<string, UnitTypedResponse> {
  const merged: Record<string, UnitTypedResponse> = { ...left };
  for (const [id, b] of Object.entries(right)) {
    const a = Object.hasOwn(merged, id) ? merged[id] : undefined;
    if (!a) { merged[id] = b; continue; }
    if (a.revision !== b.revision) continue;
    if (a.generation !== b.generation) { merged[id] = a.generation > b.generation ? a : b; continue; }
    const solved = a.solved || b.solved;
    const assisted = a.assisted || b.assisted || a.wrong || b.wrong || a.resultAssisted || b.resultAssisted;
    // A checked answer remains the displayed answer. An unchecked stale tab cannot replace it.
    const text = a.solved !== b.solved ? (a.solved ? a : b) : a.textAt > b.textAt || (a.textAt === b.textAt && a.text >= b.text) ? a : b;
    merged[id] = { ...text, solved, assisted, wrong: !solved && (a.wrong || b.wrong), resultAssisted: solved && assisted, updatedAt: Math.max(a.updatedAt, b.updatedAt) };
  }
  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
}

/** Legacy cursors remain valid. Bounded typed inputs require an explicit matching course namespace. */
export function parseUnitSession(raw: string | null, unit: CourseUnit, resetAt: number, courseKey?: string): UnitSessionDraft | null {
  if (!raw || raw.length > UNIT_SESSION_MAX_LENGTH) return null;
  try {
    const value = JSON.parse(raw) as Partial<UnitSessionDraft>;
    if (!value || value.version !== 1 || value.unitId !== unit.id || value.resetAt !== resetAt ||
      !["learn", "practice", "quiz", "write"].includes(String(value.view)) ||
      !Number.isInteger(value.study) || value.study! < 0 || value.study! > 5 ||
      ![value.assisted, value.solved, value.wrong, value.resultAssisted].every(item => typeof item === "boolean")) return null;
    const lesson = unit.lessons.find(item => item.id === value.lessonId);
    const activity = lesson?.activities.find(item => item.id === value.activityId);
    if (!lesson || !activity) return null;
    if (value.solved && value.wrong || value.resultAssisted && !value.solved) return null;
    if (courseKey && value.courseKey !== undefined && value.courseKey !== courseKey) return null;
    const changed = value.activityRevision !== undefined && value.activityRevision !== exerciseDraftRevision(activity);
    const draft: UnitSessionDraft = {
      version: 1, unitId: unit.id, resetAt, lessonId: lesson.id, activityId: value.activityId!, view: value.view!, study: value.study!,
      assisted: !changed && (value.assisted! || value.wrong! || value.resultAssisted!), solved: !changed && value.solved!, wrong: !changed && value.wrong!, resultAssisted: !changed && value.resultAssisted!,
    };
    if (courseKey && value.courseKey === courseKey) {
      draft.courseKey = courseKey;
      draft.activityRevision = exerciseDraftRevision(activity);
      if (typeof value.unitRevision === "string" && value.unitRevision.length <= 80) draft.unitRevision = value.unitRevision;
      draft.typedResponses = {};
      const responses = value.typedResponses;
      if (responses && typeof responses === "object" && !Array.isArray(responses)) {
        for (const item of unit.lessons.flatMap(entry => entry.activities)) {
          if (item.kind !== "type" || !Object.hasOwn(responses, item.id)) continue;
          const response = responses[item.id];
          const now = Date.now();
          if (!response || typeof response !== "object" || response.revision !== exerciseDraftRevision(item) || typeof response.text !== "string" || response.text.length > TYPED_DRAFT_MAX_LENGTH || ![response.assisted, response.solved, response.wrong, response.resultAssisted].every(flag => typeof flag === "boolean") || response.solved && response.wrong || response.resultAssisted && !response.solved || ![response.generation ?? 0, response.textAt ?? 0, response.updatedAt ?? 0].every(value => timestamp(value, now)) || (response.generation ?? 0) > (response.updatedAt ?? 0) || (response.textAt ?? 0) > (response.updatedAt ?? 0)) continue;
          draft.typedResponses[item.id] = { revision: response.revision, text: response.text,
            assisted: response.assisted || response.wrong || response.resultAssisted, solved: response.solved, wrong: response.wrong, resultAssisted: response.resultAssisted,
            generation: response.generation ?? 0, textAt: response.textAt ?? 0, updatedAt: response.updatedAt ?? 0 };
        }
      }
    }
    return draft;
  } catch { return null; }
}
