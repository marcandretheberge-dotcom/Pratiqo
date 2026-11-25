import type { CourseAssessment } from "../italian/course/courseTypes";

export const ASSESSMENT_DRAFT_MAX_LENGTH = 32768;
const CLOCK_SKEW = 60000;
export interface AssessmentDraftContext {
  courseKey: string;
  assessmentId: string;
  resetAt: number;
  total: number;
  revision: string;
  key: string;
}
export interface AssessmentOutcome { correct: boolean; assisted: boolean }
export interface AssessmentDraft {
  version: 1;
  courseKey: string;
  assessmentId: string;
  resetAt: number;
  total: number;
  revision: string;
  started: boolean;
  index: number;
  results: AssessmentOutcome[];
  currentHelp: boolean;
  done: boolean;
  run: number;
  updatedAt: number;
}
export interface AssessmentDraftSnapshot { draft: AssessmentDraft; storageError: boolean }
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;

/** A content revision, not a security token. Changing questions/answers invalidates an old run. */
function revision(assessment: CourseAssessment): string {
  const text = JSON.stringify(assessment.questions);
  let left = 2166136261, right = 5381;
  for (let i = 0; i < text.length; i++) {
    left = Math.imul(left ^ text.charCodeAt(i), 16777619);
    right = Math.imul(right, 33) ^ text.charCodeAt(i);
  }
  return `${(left >>> 0).toString(16)}-${(right >>> 0).toString(16)}`;
}

export function assessmentDraftContext(courseKey: string, assessment: CourseAssessment, resetAt: number | null = 0): AssessmentDraftContext {
  if (!courseKey || courseKey.length > 200 || !assessment.id || assessment.id.length > 160 || !integer(assessment.questions.length, 1, 200)) throw new Error("Invalid course assessment draft context");
  return {
    courseKey, assessmentId: assessment.id, total: assessment.questions.length,
    resetAt: integer(resetAt, 0, Number.MAX_SAFE_INTEGER - CLOCK_SKEW) ? resetAt : 0,
    revision: revision(assessment),
    // Encoded components and a slash delimiter keep course/id boundaries unambiguous.
    key: `yo.course-assessment.v1/${encodeURIComponent(courseKey)}/${encodeURIComponent(assessment.id)}`,
  };
}

export function emptyAssessmentDraft(context: AssessmentDraftContext): AssessmentDraft {
  const { courseKey, assessmentId, resetAt, total, revision } = context;
  return { version: 1, courseKey, assessmentId, resetAt, total, revision, started: false, index: 0, results: [], currentHelp: false, done: false, run: 0, updatedAt: 0 };
}

/** Only aggregate boolean outcomes survive parsing; learner text and selected options never do. */
export function parseAssessmentDraft(raw: string | null, context: AssessmentDraftContext, now = Date.now()): AssessmentDraft {
  const empty = emptyAssessmentDraft(context);
  if (!raw || raw.length > ASSESSMENT_DRAFT_MAX_LENGTH || !integer(now, 0, Number.MAX_SAFE_INTEGER - CLOCK_SKEW)) return empty;
  try {
    const input: unknown = JSON.parse(raw);
    if (!object(input) || input.version !== 1 || input.courseKey !== context.courseKey || input.assessmentId !== context.assessmentId || input.resetAt !== context.resetAt || input.total !== context.total || input.revision !== context.revision || typeof input.started !== "boolean" || typeof input.done !== "boolean" || typeof input.currentHelp !== "boolean" || !integer(input.index, 0, context.total - 1) || !integer(input.run, 0, now + CLOCK_SKEW) || !integer(input.updatedAt, input.run, now + CLOCK_SKEW) || !Array.isArray(input.results) || input.results.length > context.total) return empty;
    const { index, started, done, currentHelp, run, updatedAt } = input;
    const results: AssessmentOutcome[] = [];
    for (const result of input.results) {
      if (!object(result) || typeof result.correct !== "boolean" || typeof result.assisted !== "boolean") return empty;
      results.push({ correct: result.correct, assisted: result.assisted });
    }
    if (!started && (index !== 0 || results.length || currentHelp || done || run !== 0 || updatedAt !== 0)) return empty;
    if (started && (run === 0 || updatedAt < context.resetAt || (results.length !== index && results.length !== index + 1))) return empty;
    if (done && (index !== context.total - 1 || results.length !== context.total)) return empty;
    // Help already seen on this question cannot be lost by forging a less-assisted outcome.
    if (currentHelp && results[index]) results[index].assisted = true;
    return { ...empty, index, started, done, currentHelp, run, updatedAt, results };
  } catch { return empty; }
}

export const assessmentDraftToken = (draft: AssessmentDraft) => `${draft.run}:${draft.index}`;
export const assessmentDraftScore = (draft: AssessmentDraft) => draft.results.filter((result) => result.correct).length;
export const assessmentDraftAssisted = (draft: AssessmentDraft) => draft.currentHelp || draft.results.some((result) => result.assisted);

/** Concurrent views of the same run keep help and choose the conservative first-result conflict. */
export function mergeAssessmentDraft(left: AssessmentDraft, right: AssessmentDraft): AssessmentDraft {
  if (left.courseKey !== right.courseKey || left.assessmentId !== right.assessmentId || left.resetAt !== right.resetAt || left.revision !== right.revision || left.total !== right.total) return left;
  if (left.run !== right.run) return left.run > right.run ? left : right;
  const index = Math.max(left.index, right.index);
  const results = Array.from({ length: Math.max(left.results.length, right.results.length) }, (_, i) => {
    const a = left.results[i], b = right.results[i];
    return {
      correct: a && b ? a.correct && b.correct : (a ?? b).correct,
      assisted: !!(a?.assisted || b?.assisted || (left.index === i && left.currentHelp) || (right.index === i && right.currentHelp)),
    };
  });
  return { ...left, started: left.started || right.started, index, results,
    currentHelp: (left.index === index && left.currentHelp) || (right.index === index && right.currentHelp),
    done: left.done || right.done, updatedAt: Math.max(left.updatedAt, right.updatedAt) };
}

export function createAssessmentDraftStore(context: AssessmentDraftContext, storage: () => StorageLike | null = () => typeof window === "undefined" ? null : window.localStorage, clock = () => Date.now()) {
  const listeners = new Set<() => void>();
  let snapshot: AssessmentDraftSnapshot | null = null;
  const read = () => {
    try {
      const target = storage();
      return { draft: parseAssessmentDraft(target?.getItem(context.key) ?? null, context, clock()), storageError: !target };
    } catch { return { draft: emptyAssessmentDraft(context), storageError: true }; }
  };
  const getSnapshot = (): AssessmentDraftSnapshot => snapshot ?? (snapshot = read());
  const emit = () => listeners.forEach((listener) => listener());
  function publish(draft: AssessmentDraft) {
    let storageError = false;
    try {
      const target = storage(), raw = JSON.stringify(draft);
      if (!target || raw.length > ASSESSMENT_DRAFT_MAX_LENGTH) storageError = true;
      else target.setItem(context.key, raw);
    } catch { storageError = true; }
    snapshot = { draft, storageError };
    emit();
  }
  function synchronize() {
    const current = getSnapshot(), remote = read();
    if (remote.storageError) return;
    const merged = mergeAssessmentDraft(current.draft, remote.draft);
    if (JSON.stringify(merged) !== JSON.stringify(current.draft)) {
      snapshot = { draft: merged, storageError: current.storageError };
      // Persist a conservative merge if concurrent views had different help/results.
      if (JSON.stringify(merged) !== JSON.stringify(remote.draft)) publish(merged);
      else emit();
    }
  }
  function stamp(draft: AssessmentDraft) {
    return Math.max(clock(), context.resetAt, draft.updatedAt + 1, 1);
  }
  function current(token: string): AssessmentDraft | null {
    synchronize();
    const draft = getSnapshot().draft;
    return draft.started && !draft.done && assessmentDraftToken(draft) === token ? draft : null;
  }
  function startFresh() {
    synchronize();
    const old = getSnapshot().draft, at = stamp(old);
    publish({ ...emptyAssessmentDraft(context), started: true, run: at, updatedAt: at });
  }
  return {
    getSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => { if (event.key === context.key) synchronize(); };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => { listeners.delete(listener); if (typeof window !== "undefined") window.removeEventListener("storage", onStorage); };
    },
    start() { synchronize(); if (!getSnapshot().draft.started) startFresh(); },
    restart: startFresh,
    help(token: string) {
      const draft = current(token);
      if (!draft || draft.currentHelp || draft.results[draft.index]) return;
      publish({ ...draft, currentHelp: true, updatedAt: stamp(draft) });
    },
    attempt(token: string, correct: boolean) {
      const draft = current(token);
      if (!draft || typeof correct !== "boolean" || draft.results[draft.index]) return;
      publish({ ...draft, results: [...draft.results, { correct, assisted: draft.currentHelp }], updatedAt: stamp(draft) });
    },
    next(token: string): { correct: number; total: number; assisted: boolean } | null {
      const draft = current(token);
      if (!draft || !draft.results[draft.index]) return null;
      if (draft.index + 1 === context.total) {
        // Mark completion before the explicit callback. Hydration never submits a result.
        publish({ ...draft, done: true, updatedAt: stamp(draft) });
        return { correct: assessmentDraftScore(draft), total: context.total, assisted: assessmentDraftAssisted(draft) };
      }
      publish({ ...draft, index: draft.index + 1, currentHelp: false, updatedAt: stamp(draft) });
      return null;
    },
  };
}
