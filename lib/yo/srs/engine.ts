/**
 * Shared SRS engine — pure functions only, no IO, no language knowledge
 * (spec §2.3: "Extract, do not rewrite").
 *
 * The transition rules are the Italian course's, verbatim:
 * lib/yo/italian/course/courseProgress.ts `recordCourseActivity` and the
 * activity branch of `parseCourseProgress`. Italian parity is acceptance
 * criterion #1 (spec §2.6) and is locked by
 * tests/yo/yopratiqoSrsEngine.test.ts, which replays identical inputs
 * through both implementations and diffs every resulting record.
 *
 * Rules (identical to the Italian engine):
 *   • A correct UNASSISTED answer increments the streak (cap 4) and the
 *     next review is `lastAt + REVIEW_INTERVAL_DAYS[streak - 1]`.
 *   • A correct ASSISTED answer keeps the streak at 0 and is due tomorrow
 *     (`lastAt + 1 day`) — a revealed solution is practised again soon.
 *   • An incorrect answer resets the streak to 0 and is due immediately
 *     (`nextReviewAt === lastAt`).
 *   • `independent` implies `completed`; a streak > 0 implies the item was
 *     completed independently at least once.
 */

import {
  REVIEW_INTERVAL_DAYS,
  SRS_DAY_MS,
  SRS_MAX_ATTEMPTS,
  SRS_MAX_STREAK,
} from "./intervals";

/** Structurally identical to the Italian `ActivityRecord`. */
export interface SrsActivityRecord {
  attempts: number;
  completed: boolean;
  independent: boolean;
  lastAt: number;
  nextReviewAt: number;
  streak: number;
}

const idIsSafe = (id: unknown): id is string =>
  typeof id === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(id) &&
  id !== "constructor" &&
  id !== "prototype";

const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= min &&
  value <= max;

/**
 * The next review instant for a record with the given streak.
 * `correct` only matters at streak 0: an assisted-correct answer is due
 * tomorrow, a failed one immediately (the Italian engine's exact rule).
 */
export function nextReviewAt(
  streak: number,
  lastAt: number,
  correct = false,
): number {
  if (streak > 0) {
    return lastAt + REVIEW_INTERVAL_DAYS[streak - 1] * SRS_DAY_MS;
  }
  return correct ? lastAt + SRS_DAY_MS : lastAt;
}

/**
 * Apply one answered attempt. Pure: returns a new record, never mutates.
 * Mirrors `recordCourseActivity`'s per-record transition exactly; the
 * Italian wrapper additionally maintains course-level bookkeeping
 * (`updatedAt` monotonic stamps) that is not part of the record itself.
 */
export function recordAttempt(
  record: SrsActivityRecord | null,
  correct: boolean,
  assisted: boolean,
  at: number,
): SrsActivityRecord {
  const streak =
    correct && !assisted
      ? Math.min(SRS_MAX_STREAK, (record?.streak ?? 0) + 1)
      : 0;
  return {
    attempts: Math.min(SRS_MAX_ATTEMPTS, (record?.attempts ?? 0) + 1),
    completed: (record?.completed ?? false) || correct,
    independent: (record?.independent ?? false) || (correct && !assisted),
    lastAt: at,
    nextReviewAt: nextReviewAt(streak, at, correct),
    streak,
  };
}

/**
 * Record-local validation invariants, unchanged from the Italian parser:
 * attempts 1..MAX, streak 0..min(4, attempts), `nextReviewAt` exactly
 * `lastAt + interval(streak)` (or `lastAt + 1d` for an assisted-correct
 * streak-0 record), `independent` ⇒ `completed`, streak > 0 ⇒
 * `independent`, `nextReviewAt` within [lastAt, lastAt + 14d].
 */
export function isValidSrsRecord(value: unknown): value is SrsActivityRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!integer(record.attempts, 1, SRS_MAX_ATTEMPTS)) return false;
  if (typeof record.completed !== "boolean") return false;
  if (typeof record.independent !== "boolean") return false;
  if (!integer(record.lastAt, 0, Number.MAX_SAFE_INTEGER)) return false;
  if (!integer(record.streak, 0, Math.min(SRS_MAX_STREAK, record.attempts))) {
    return false;
  }
  if (
    !integer(
      record.nextReviewAt,
      record.lastAt,
      record.lastAt + REVIEW_INTERVAL_DAYS[3] * SRS_DAY_MS,
    )
  ) {
    return false;
  }
  if (record.independent && !record.completed) return false;
  if (record.streak > 0 && !record.independent) return false;
  const streak = record.streak;
  const lastAt = record.lastAt;
  return (
    record.nextReviewAt === nextReviewAt(streak, lastAt, false) ||
    record.nextReviewAt === nextReviewAt(streak, lastAt, true)
  );
}

/**
 * Validate an untrusted `{ itemId: record }` map against the catalog's
 * item ids — the shared form of the Italian parser's activity branch.
 * Invalid records are dropped, never repaired; unknown ids never survive.
 */
export function parseRecords(
  input: unknown,
  itemIds: Set<string>,
): Record<string, SrsActivityRecord> {
  const parsed: Record<string, SrsActivityRecord> = {};
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return parsed;
  }
  const source = input as Record<string, unknown>;
  for (const id of itemIds) {
    if (!idIsSafe(id)) continue;
    if (!Object.prototype.hasOwnProperty.call(source, id)) continue;
    const value = source[id];
    if (!isValidSrsRecord(value)) continue;
    parsed[id] = {
      attempts: value.attempts,
      completed: value.completed,
      independent: value.independent,
      lastAt: value.lastAt,
      nextReviewAt: value.nextReviewAt,
      streak: value.streak,
    };
  }
  return parsed;
}

/**
 * Due item ids, deterministic order: by `nextReviewAt`, then item id —
 * the Italian `getDueActivityIds` ordering (spec §2.6 criterion 3).
 * Unseen items never enter the queue; only attempted ones do.
 */
export function dueItems(
  records: Record<string, SrsActivityRecord>,
  itemIds: string[],
  now: number,
): string[] {
  if (!integer(now, 0, Number.MAX_SAFE_INTEGER)) return [];
  return itemIds
    .filter((id) => {
      const record = records[id];
      return record !== undefined && record.nextReviewAt <= now;
    })
    .sort(
      (a, b) =>
        records[a].nextReviewAt - records[b].nextReviewAt ||
        a.localeCompare(b),
    );
}
