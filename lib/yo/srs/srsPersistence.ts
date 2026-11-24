/**
 * Server-side SRS persistence discipline (spec §1.5, §2.4).
 *
 * Mirrors lib/yopratiqo/progressSnapshotPersistence.ts exactly in posture:
 *   • `FORBIDDEN_TEACHER_BRIDGE_FIELDS` is the single deny-list — any
 *     forbidden raw-data key in a client payload hard-rejects the request.
 *   • Unknown top-level keys are stripped; `user_id` is NEVER read from
 *     the body — routes force it from the authenticated session.
 *   • The server never trusts client-supplied scheduling: /record loads
 *     the stored record and applies the shared engine itself with the
 *     server clock; /import runs the payload through the Italian course
 *     parser's validation invariants and drops (counts) invalid records
 *     instead of repairing them.
 */

import { FORBIDDEN_TEACHER_BRIDGE_FIELDS } from "@/lib/yopratiqo/teacherBridgeSummary";
import {
  parseCourseProgress,
  type CourseProgress,
} from "@/lib/yo/italian/course/courseProgress";
import { personalizedItalianCatalog } from "@/lib/yo/personalized/courseData";
import {
  italianCatalogItemIds,
  ITALIAN_LANGUAGE,
  ITALIAN_SRS_COURSE_ID,
} from "@/lib/yo/srs/adapters/italian";
import type { SrsActivityRecord } from "@/lib/yo/srs/engine";

/** Row shape of public.yo_srs_items (migration 20261124155352). */
export interface SrsItemRow {
  user_id: string;
  item_id: string;
  language: string;
  course_id: string;
  streak: number;
  attempts: number;
  completed: boolean;
  independent: boolean;
  last_at: number;
  next_review_at: number;
}

/** XP ledger event types appended by the record route (spec §2.4). */
export const SRS_XP_EVENTS = {
  practice: { eventType: "srs_practice", xp: 5 },
  independent: { eventType: "srs_independent", xp: 5 },
  mastery: { eventType: "srs_mastery", xp: 50 },
} as const;

export interface SrsXpEvent {
  eventType: string;
  xp: number;
  itemId: string;
}

/**
 * XP earned by one recorded attempt, per the Italian preview rewards
 * (practice 5, independent correct +5, mastery — streak reaching 4 — +50).
 * Lesson-complete and bilan XP stay with the course code, not the engine.
 */
export function xpEventsForAttempt(
  itemId: string,
  previous: SrsActivityRecord | null,
  next: SrsActivityRecord,
  correct: boolean,
  assisted: boolean,
): SrsXpEvent[] {
  const events: SrsXpEvent[] = [{ ...SRS_XP_EVENTS.practice, itemId }];
  if (correct && !assisted) {
    events.push({ ...SRS_XP_EVENTS.independent, itemId });
  }
  if (next.streak === 4 && (previous?.streak ?? 0) < 4) {
    events.push({ ...SRS_XP_EVENTS.mastery, itemId });
  }
  return events;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectForbiddenKeys(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_TEACHER_BRIDGE_FIELDS.includes(key)) {
      return `body contains forbidden raw-data key: ${key}`;
    }
  }
  return null;
}

const idIsSafe = (id: unknown): id is string =>
  typeof id === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(id) &&
  id !== "constructor" &&
  id !== "prototype";

// ─────────────────────────────────────────────────────────────────────────
// POST /api/yo/srs/record
// ─────────────────────────────────────────────────────────────────────────

export type ParsedSrsRecordPayload = {
  itemId: string;
  attemptId: string;
  language: string;
  correct: boolean;
  assisted: boolean;
};

export type ParseSrsRecordResult =
  | { ok: true; value: ParsedSrsRecordPayload }
  | { ok: false; reason: string };

const activeItemIds = italianCatalogItemIds(personalizedItalianCatalog);

const RECORD_KEYS = new Set(["attemptId", "itemId", "language", "correct", "assisted", "at"]);

/**
 * Validate a /record body. Only the outcome is accepted — never a
 * client-computed streak or due date (spec §2.6 criterion 5): scheduling
 * fields in the body are not in the allow-list and are stripped, and the
 * server recomputes the record from its own stored state.
 */
export function parseSrsRecordPayload(body: unknown): ParseSrsRecordResult {
  if (!isPlainObject(body)) {
    return { ok: false, reason: "Body must be a JSON object" };
  }
  const forbidden = rejectForbiddenKeys(body);
  if (forbidden) return { ok: false, reason: forbidden };

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (RECORD_KEYS.has(key)) filtered[key] = value;
  }

  if (typeof filtered.attemptId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(filtered.attemptId)) {
    return { ok: false, reason: "attemptId must be a random UUID" };
  }
  if (!idIsSafe(filtered.itemId)) {
    return { ok: false, reason: "itemId is required and must be a safe id" };
  }
  const language = filtered.language ?? ITALIAN_LANGUAGE;
  if (language !== ITALIAN_LANGUAGE) {
    return { ok: false, reason: `unsupported language: ${String(language)}` };
  }
  if (!activeItemIds.has(filtered.itemId)) {
    return { ok: false, reason: `unknown itemId: ${filtered.itemId}` };
  }
  if (typeof filtered.correct !== "boolean" || typeof filtered.assisted !== "boolean") {
    return { ok: false, reason: "correct and assisted must be booleans" };
  }
  if (
    filtered.at !== undefined &&
    (typeof filtered.at !== "number" || !Number.isSafeInteger(filtered.at) || filtered.at < 0)
  ) {
    return { ok: false, reason: "at must be a non-negative integer timestamp" };
  }
  return {
    ok: true,
    value: {
      itemId: filtered.itemId,
      attemptId: filtered.attemptId,
      language: ITALIAN_LANGUAGE,
      correct: filtered.correct,
      assisted: filtered.assisted,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/yo/srs/import
// ─────────────────────────────────────────────────────────────────────────

export type SrsImportPlan = {
  /** Validated activity records ready to upsert, keyed by item id. */
  records: Record<string, SrsActivityRecord>;
  imported: number;
  dropped: number;
};

export type ParseSrsImportResult =
  | { ok: true; value: SrsImportPlan }
  | { ok: false; reason: string };

/**
 * Validate a one-time localStorage import body: `{ progress }` where
 * progress is the existing local CourseProgress (object or JSON string).
 * Runs through `parseCourseProgress` — the Italian parser's invariants,
 * unchanged — then counts how many raw activity records were dropped.
 */
export function parseSrsImportPayload(
  body: unknown,
  now = Date.now(),
): ParseSrsImportResult {
  if (!isPlainObject(body)) {
    return { ok: false, reason: "Body must be a JSON object" };
  }
  const forbidden = rejectForbiddenKeys(body);
  if (forbidden) return { ok: false, reason: forbidden };

  const progress = body.progress;
  let raw: string | null = null;
  let rawActivityCount = 0;
  if (typeof progress === "string") {
    raw = progress;
    try {
      const parsed: unknown = JSON.parse(progress);
      if (isPlainObject(parsed) && isPlainObject(parsed.activities)) {
        rawActivityCount = Object.keys(parsed.activities).length;
      }
    } catch {
      rawActivityCount = 0;
    }
  } else if (isPlainObject(progress)) {
    raw = JSON.stringify(progress);
    if (isPlainObject(progress.activities)) {
      rawActivityCount = Object.keys(progress.activities).length;
    }
  } else {
    return { ok: false, reason: "progress is required" };
  }

  const parsed: CourseProgress = parseCourseProgress(raw, personalizedItalianCatalog, now);
  const records: Record<string, SrsActivityRecord> = { ...parsed.activities };
  const imported = Object.keys(records).length;
  return {
    ok: true,
    value: { records, imported, dropped: Math.max(0, rawActivityCount - imported) },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Row builders
// ─────────────────────────────────────────────────────────────────────────

export function buildSrsItemRow(
  userId: string,
  itemId: string,
  record: SrsActivityRecord,
): SrsItemRow {
  return {
    user_id: userId,
    item_id: itemId,
    language: ITALIAN_LANGUAGE,
    course_id: ITALIAN_SRS_COURSE_ID,
    streak: record.streak,
    attempts: record.attempts,
    completed: record.completed,
    independent: record.independent,
    last_at: record.lastAt,
    next_review_at: record.nextReviewAt,
  };
}

export function srsRecordFromRow(row: {
  attempts: number;
  completed: boolean;
  independent: boolean;
  last_at: number;
  next_review_at: number;
  streak: number;
}): SrsActivityRecord {
  return {
    attempts: row.attempts,
    completed: row.completed,
    independent: row.independent,
    lastAt: row.last_at,
    nextReviewAt: row.next_review_at,
    streak: row.streak,
  };
}
