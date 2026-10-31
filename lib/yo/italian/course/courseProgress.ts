import type { CourseCatalog } from "./courseTypes";

export const ITALIAN_COURSE_PROGRESS_KEY = "yopratiqo:italian-course:a1:v1";
export const COURSE_REVIEW_INTERVAL_DAYS = [1, 3, 7, 14] as const;
export const COURSE_PROGRESS_MAX_LENGTH = 524288;
const DAY = 86400000;
const MAX_ATTEMPTS = 100000;
const MAX_CLOCK_SKEW = 60000;

export interface ActivityRecord {
  attempts: number;
  completed: boolean;
  independent: boolean;
  lastAt: number;
  nextReviewAt: number;
  streak: number;
}
export interface AssessmentResult {
  correct: number;
  total: number;
  assisted: boolean;
  completedAt: number;
}
export interface AssessmentRecord {
  attempts: number;
  last: AssessmentResult;
  bestIndependent: number | null;
  bestAssisted: number | null;
}
export interface CourseResume {
  unitId: string;
  lessonId: string;
  activityId?: string;
}
export interface CourseProgress {
  version: 1;
  resetAt: number;
  updatedAt: number;
  activities: Record<string, ActivityRecord>;
  assessments: Record<string, AssessmentRecord>;
  productions: Record<string, boolean>;
  /** Separate field clocks preserve unchecking and navigation across tabs. */
  productionsUpdatedAt: Record<string, number>;
  resume: CourseResume | null;
  resumeUpdatedAt: number;
}

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => value !== null && typeof value === "object" && !Array.isArray(value);
const own = (value: JsonObject, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const idIsSafe = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(id) && id !== "constructor" && id !== "prototype";
const integer = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
const score = (value: unknown): number | null => integer(value, 0, 100) ? value : null;
const best = (a: number | null, b: number | null): number | null => a === null ? b : b === null ? a : Math.max(a, b);
const sortedKeys = (left: object, right: object = {}): string[] => [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();

/** The compact catalog is the sole authority; no lesson content enters this module. */
function catalogIndex(catalog: CourseCatalog) {
  const activities = new Set<string>();
  const productions = new Set<string>();
  const assessments = new Map<string, number>();
  const lessons = new Map<string, Map<string, Set<string>>>();
  for (const unit of catalog.units) {
    if (!idIsSafe(unit.id)) continue;
    const unitLessons = new Map<string, Set<string>>();
    for (const lesson of unit.lessons) {
      if (!idIsSafe(lesson.id)) continue;
      const ids = new Set(lesson.activityIds.filter(idIsSafe));
      unitLessons.set(lesson.id, ids);
      for (const id of ids) activities.add(id);
    }
    lessons.set(unit.id, unitLessons);
    if (idIsSafe(unit.productionId)) productions.add(unit.productionId);
  }
  for (const item of catalog.assessments) {
    if (idIsSafe(item.id) && integer(item.questionCount, 1, 200)) assessments.set(item.id, item.questionCount);
  }
  return { activities, productions, assessments, lessons };
}

function validResume(value: unknown, index: ReturnType<typeof catalogIndex>): value is CourseResume {
  if (!object(value) || !idIsSafe(value.unitId) || !idIsSafe(value.lessonId)) return false;
  const lesson = index.lessons.get(value.unitId)?.get(value.lessonId);
  return !!lesson && (value.activityId === undefined || (idIsSafe(value.activityId) && lesson.has(value.activityId)));
}

export function emptyCourseProgress(resetAt = 0): CourseProgress {
  const stamp = integer(resetAt, 0, Number.MAX_SAFE_INTEGER) ? resetAt : 0;
  return { version: 1, resetAt: stamp, updatedAt: stamp, activities: {}, assessments: {}, productions: {}, productionsUpdatedAt: {}, resume: null, resumeUpdatedAt: stamp };
}

/** Aggregate results only: unknown fields, identifiers and personal text are discarded. */
export function parseCourseProgress(raw: string | null, catalog: CourseCatalog, now = Date.now()): CourseProgress {
  const empty = emptyCourseProgress();
  if (!raw || raw.length > COURSE_PROGRESS_MAX_LENGTH || !integer(now, 0, Number.MAX_SAFE_INTEGER - MAX_CLOCK_SKEW)) return empty;
  try {
    const input: unknown = JSON.parse(raw);
    if (!object(input) || input.version !== 1 || !integer(input.resetAt, 0, now + MAX_CLOCK_SKEW) || !integer(input.updatedAt, input.resetAt, now + MAX_CLOCK_SKEW)) return empty;
    const { resetAt, updatedAt } = input;
    const parsed = emptyCourseProgress(resetAt);
    parsed.updatedAt = updatedAt;
    const index = catalogIndex(catalog);
    if (object(input.activities)) for (const id of index.activities) {
      if (!own(input.activities, id)) continue;
      const value = input.activities[id];
      if (!object(value) || !integer(value.attempts, 1, MAX_ATTEMPTS) || typeof value.completed !== "boolean" || typeof value.independent !== "boolean" || !integer(value.lastAt, resetAt, updatedAt) || !integer(value.streak, 0, Math.min(4, value.attempts)) || !integer(value.nextReviewAt, value.lastAt, value.lastAt + 14 * DAY)) continue;
      if ((value.independent && !value.completed) || (value.streak > 0 && !value.independent)) continue;
      const interval = value.streak === 0 ? 0 : COURSE_REVIEW_INTERVAL_DAYS[value.streak - 1] * DAY;
      // A revealed solution is due tomorrow, a failed attempt immediately.
      if (value.nextReviewAt !== value.lastAt + interval && !(value.streak === 0 && value.nextReviewAt === value.lastAt + DAY)) continue;
      parsed.activities[id] = { attempts: value.attempts, completed: value.completed, independent: value.independent, lastAt: value.lastAt, nextReviewAt: value.nextReviewAt, streak: value.streak };
    }
    if (object(input.assessments)) for (const [id, total] of index.assessments) {
      if (!own(input.assessments, id)) continue;
      const value = input.assessments[id];
      if (!object(value) || !integer(value.attempts, 1, MAX_ATTEMPTS) || !object(value.last)) continue;
      const last = value.last;
      if (last.total !== total || !integer(last.correct, 0, total) || typeof last.assisted !== "boolean" || !integer(last.completedAt, resetAt, updatedAt)) continue;
      const percent = Math.round(100 * last.correct / total);
      parsed.assessments[id] = {
        attempts: value.attempts,
        last: { correct: last.correct, total, assisted: last.assisted, completedAt: last.completedAt },
        bestIndependent: best(score(value.bestIndependent), last.assisted ? null : percent),
        bestAssisted: best(score(value.bestAssisted), last.assisted ? percent : null),
      };
    }
    if (object(input.productions) && object(input.productionsUpdatedAt)) for (const id of index.productions) {
      if (!own(input.productions, id) || !own(input.productionsUpdatedAt, id)) continue;
      const value = input.productions[id];
      const stamp = input.productionsUpdatedAt[id];
      if (typeof value !== "boolean" || !integer(stamp, resetAt, updatedAt)) continue;
      parsed.productions[id] = value;
      parsed.productionsUpdatedAt[id] = stamp;
    }
    if (validResume(input.resume, index) && integer(input.resumeUpdatedAt, resetAt, updatedAt)) {
      parsed.resume = { unitId: input.resume.unitId, lessonId: input.resume.lessonId, ...(input.resume.activityId === undefined ? {} : { activityId: input.resume.activityId }) };
      parsed.resumeUpdatedAt = input.resumeUpdatedAt;
    }
    return parsed;
  } catch { return empty; }
}

function latestActivity(a: ActivityRecord, b: ActivityRecord): ActivityRecord {
  if (a.lastAt !== b.lastAt) return a.lastAt > b.lastAt ? a : b;
  // Identical millisecond clocks converge conservatively: the sooner review wins.
  if (a.nextReviewAt !== b.nextReviewAt) return a.nextReviewAt < b.nextReviewAt ? a : b;
  return a.streak <= b.streak ? a : b;
}
function latestAssessment(a: AssessmentResult, b: AssessmentResult): AssessmentResult {
  if (a.completedAt !== b.completedAt) return a.completedAt > b.completedAt ? a : b;
  if (a.correct !== b.correct) return a.correct < b.correct ? a : b;
  return a.assisted ? a : b;
}
function resumeKey(value: CourseResume | null): string {
  return value ? `${value.unitId}/${value.lessonId}/${value.activityId ?? ""}` : "";
}

/** Merge is commutative and idempotent. Counters use max, never sum replayed events. */
export function mergeCourseProgress(left: CourseProgress, right: CourseProgress): CourseProgress {
  if (left.resetAt !== right.resetAt) return left.resetAt > right.resetAt ? left : right;
  const merged = emptyCourseProgress(left.resetAt);
  merged.updatedAt = Math.max(left.updatedAt, right.updatedAt);
  for (const id of sortedKeys(left.activities, right.activities)) {
    const a = left.activities[id], b = right.activities[id];
    merged.activities[id] = a && b ? { ...latestActivity(a, b), attempts: Math.max(a.attempts, b.attempts), completed: a.completed || b.completed, independent: a.independent || b.independent } : a ?? b;
  }
  for (const id of sortedKeys(left.assessments, right.assessments)) {
    const a = left.assessments[id], b = right.assessments[id];
    merged.assessments[id] = a && b ? {
      attempts: Math.max(a.attempts, b.attempts), last: latestAssessment(a.last, b.last), bestIndependent: best(a.bestIndependent, b.bestIndependent), bestAssisted: best(a.bestAssisted, b.bestAssisted),
    } : a ?? b;
  }
  for (const id of sortedKeys(left.productions, right.productions)) {
    const a = left.productionsUpdatedAt[id] ?? -1, b = right.productionsUpdatedAt[id] ?? -1;
    merged.productionsUpdatedAt[id] = Math.max(a, b);
    merged.productions[id] = a === b ? left.productions[id] === true && right.productions[id] === true : (a > b ? left.productions[id] : right.productions[id]);
  }
  const resumeSource = left.resumeUpdatedAt === right.resumeUpdatedAt
    ? (resumeKey(left.resume) <= resumeKey(right.resume) ? left : right)
    : (left.resumeUpdatedAt > right.resumeUpdatedAt ? left : right);
  merged.resume = resumeSource.resume;
  merged.resumeUpdatedAt = resumeSource.resumeUpdatedAt;
  return merged;
}

function nextStamp(progress: CourseProgress, now: number): number | null {
  return integer(now, 0, Number.MAX_SAFE_INTEGER - 14 * DAY) ? Math.max(now, progress.updatedAt + 1) : null;
}

export function recordCourseActivity(progress: CourseProgress, catalog: CourseCatalog, id: string, correct: boolean, assisted: boolean, now = Date.now()): CourseProgress {
  if (!catalogIndex(catalog).activities.has(id) || typeof correct !== "boolean" || typeof assisted !== "boolean") return progress;
  const stamp = nextStamp(progress, now);
  if (stamp === null) return progress;
  const previous = progress.activities[id];
  const streak = correct && !assisted ? Math.min(4, (previous?.streak ?? 0) + 1) : 0;
  const interval = streak ? COURSE_REVIEW_INTERVAL_DAYS[streak - 1] * DAY : correct ? DAY : 0;
  return { ...progress, updatedAt: stamp, activities: { ...progress.activities, [id]: {
    attempts: Math.min(MAX_ATTEMPTS, (previous?.attempts ?? 0) + 1), completed: (previous?.completed ?? false) || correct, independent: (previous?.independent ?? false) || (correct && !assisted), lastAt: stamp, nextReviewAt: stamp + interval, streak,
  } } };
}

/** Call once, after every question has a final result. Partial totals never count. */
export function recordCourseAssessment(progress: CourseProgress, catalog: CourseCatalog, id: string, correct: number, total: number, assisted: boolean, now = Date.now()): CourseProgress {
  if (catalogIndex(catalog).assessments.get(id) !== total || !integer(total, 1, 200) || !integer(correct, 0, total) || typeof assisted !== "boolean") return progress;
  const stamp = nextStamp(progress, now);
  if (stamp === null) return progress;
  const previous = progress.assessments[id];
  const percent = Math.round(100 * correct / total);
  return { ...progress, updatedAt: stamp, assessments: { ...progress.assessments, [id]: {
    attempts: Math.min(MAX_ATTEMPTS, (previous?.attempts ?? 0) + 1), last: { correct, total, assisted, completedAt: stamp },
    bestIndependent: best(previous?.bestIndependent ?? null, assisted ? null : percent),
    bestAssisted: best(previous?.bestAssisted ?? null, assisted ? percent : null),
  } } };
}

export function markCourseProduction(progress: CourseProgress, catalog: CourseCatalog, id: string, done: boolean, now = Date.now()): CourseProgress {
  if (!catalogIndex(catalog).productions.has(id) || typeof done !== "boolean" || progress.productions[id] === done) return progress;
  const stamp = nextStamp(progress, now);
  if (stamp === null) return progress;
  return { ...progress, updatedAt: stamp, productions: { ...progress.productions, [id]: done }, productionsUpdatedAt: { ...progress.productionsUpdatedAt, [id]: stamp } };
}

export function setCourseResume(progress: CourseProgress, catalog: CourseCatalog, unitId: string, lessonId: string, activityId?: string, now = Date.now()): CourseProgress {
  const resume: CourseResume = { unitId, lessonId, ...(activityId === undefined ? {} : { activityId }) };
  if (!validResume(resume, catalogIndex(catalog)) || resumeKey(progress.resume) === resumeKey(resume)) return progress;
  const stamp = nextStamp(progress, now);
  if (stamp === null) return progress;
  return { ...progress, updatedAt: stamp, resume, resumeUpdatedAt: stamp };
}

export function resetCourseProgress(progress: CourseProgress, now = Date.now()): CourseProgress {
  const stamp = nextStamp(progress, now);
  return stamp === null ? progress : emptyCourseProgress(stamp);
}

/** Unseen activities are learning tasks; only attempted activities enter the review queue. */
export function getDueActivityIds(progress: CourseProgress, catalog: CourseCatalog, now = Date.now()): string[] {
  if (!integer(now, 0, Number.MAX_SAFE_INTEGER)) return [];
  return [...catalogIndex(catalog).activities].filter(id => progress.activities[id]?.nextReviewAt <= now)
    .sort((a, b) => progress.activities[a].nextReviewAt - progress.activities[b].nextReviewAt || a.localeCompare(b));
}

/** Stable ordering prevents storage-event write loops between otherwise identical tabs. */
export function serializeCourseProgress(progress: CourseProgress): string {
  const ordered = <T>(values: Record<string, T>) => Object.fromEntries(Object.keys(values).sort().map(id => [id, values[id]]));
  return JSON.stringify({ version: 1, resetAt: progress.resetAt, updatedAt: progress.updatedAt,
    activities: ordered(progress.activities), assessments: ordered(progress.assessments), productions: ordered(progress.productions), productionsUpdatedAt: ordered(progress.productionsUpdatedAt), resume: progress.resume, resumeUpdatedAt: progress.resumeUpdatedAt });
}
