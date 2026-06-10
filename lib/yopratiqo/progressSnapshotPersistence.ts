/**
 * Per-user YoPratiqo progress snapshot persistence — typed shapes + server
 * sanitization.
 *
 * What this file provides
 * -----------------------
 *   • `ProgressSnapshotRow` — the row shape stored in
 *     `public.yopratiqo_progress_snapshots`.
 *   • `parseProgressSnapshotPayload(unknown)` — validates the JSON body
 *     the student client POSTs to the progress API. Rejects malformed
 *     payloads, rejects any forbidden raw-quiz field, strips unknown
 *     top-level keys, and never trusts a client-provided user_id.
 *   • `buildSnapshotInsert(input, userId)` — converts a sanitized payload
 *     into the row shape ready for upsert. The `user_id` always comes from
 *     the authenticated session, never from the client.
 *   • `summarizeSnapshotsForBridge(rows)` — projects the user's own
 *     snapshots into a `BookingBridgeSummaryJson` ready to persist on
 *     `booking_yopratiqo_learning_summaries.summary`. Idempotent.
 *
 * Privacy contract
 * ----------------
 *   • Same deny-list as the teacher bridge: `FORBIDDEN_TEACHER_BRIDGE_FIELDS`
 *     is the single source of truth — if a name is forbidden on the
 *     teacher surface, it is forbidden on the persistence surface too.
 *   • The progress table itself has NO `summary jsonb` and NO free-form
 *     metadata column. The sanitizer also rejects unknown top-level keys
 *     so a future client cannot smuggle a hidden payload through.
 *   • Teachers never read this table — see migration 078. The only
 *     teacher-visible path is the consent-gated summary on
 *     `booking_yopratiqo_learning_summaries`, which itself goes through
 *     `lib/yopratiqo/teacherBridgeBookingPersistence.ts`.
 */

import {
  FORBIDDEN_TEACHER_BRIDGE_FIELDS,
} from "@/lib/yopratiqo/teacherBridgeSummary";
import {
  type BookingBridgeSummaryJson,
  buildSafeBookingSummary,
} from "@/lib/yopratiqo/teacherBridgeBookingPersistence";
import type {
  LearningDifficultyTag,
  LearningSkillTag,
} from "@/lib/yopratiqo/teacherBridge";

/** Schema version token stored on every snapshot row. */
export const PROGRESS_SNAPSHOT_VERSION = "yopratiqo-progress-v1";

/** Narrow allow-list of progress lifecycle states, mirrored in the SQL CHECK. */
export const PROGRESS_STATES = ["started", "completed", "reviewed"] as const;
export type ProgressState = (typeof PROGRESS_STATES)[number];

/** Narrow allow-list of opaque score bands (no numeric score is ever stored). */
export const SCORE_BANDS = [
  "needs_practice",
  "developing",
  "solid",
  "confident",
] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

/**
 * The DB row shape returned from `public.yopratiqo_progress_snapshots`.
 * Mirrors migration 078 exactly.
 */
export type ProgressSnapshotRow = {
  id: string;
  user_id: string;
  course_id: string;
  module_id: string;
  module_title: string;
  discipline: string;
  level_label: string | null;
  completed_at: string | null;
  last_activity_at: string;
  progress_state: ProgressState;
  skill_tags: LearningSkillTag[];
  difficulty_tags: LearningDifficultyTag[];
  score_band: ScoreBand | null;
  companion_stage: string | null;
  summary_version: string;
  created_at: string;
  updated_at: string;
};

/**
 * Allow-list of top-level keys the client may set when POSTing a snapshot.
 * The server NEVER reads `user_id` from the body — it always comes from
 * the authenticated session.
 */
export const ALLOWED_PROGRESS_SNAPSHOT_KEYS = [
  "course_id",
  "module_id",
  "module_title",
  "discipline",
  "level_label",
  "progress_state",
  "skill_tags",
  "difficulty_tags",
  "score_band",
  "companion_stage",
] as const;

const ALLOWED_KEYS_SET = new Set<string>(ALLOWED_PROGRESS_SNAPSHOT_KEYS);

/**
 * Validated client payload that the progress API route accepts.
 *
 * Note: there is intentionally no `user_id` field — the API route forces
 * it from `auth.getUser()`.
 */
export type ParsedProgressSnapshotPayload = {
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  discipline: string;
  levelLabel: string | null;
  progressState: ProgressState;
  skillTags: LearningSkillTag[];
  difficultyTags: LearningDifficultyTag[];
  scoreBand: ScoreBand | null;
  companionStage: string | null;
};

export type ParseProgressSnapshotResult =
  | { ok: true; value: ParsedProgressSnapshotPayload }
  | { ok: false; reason: string };

const ALLOWED_SKILL_TAGS: readonly LearningSkillTag[] = [
  "greetings",
  "pronunciation",
  "listening",
  "vocabulary",
  "grammar",
  "culture",
  "conversation",
  "teacher_practice",
];
const ALLOWED_DIFFICULTY_TAGS: readonly LearningDifficultyTag[] = [
  "needs_speaking_practice",
  "needs_listening_repetition",
  "needs_pronunciation_support",
  "needs_vocabulary_review",
  "needs_cultural_context",
  "not_enough_signal",
];

const MAX_ID_LENGTH = 96;
const MAX_TITLE_LENGTH = 160;
const MAX_DISCIPLINE_LENGTH = 64;
const MAX_LEVEL_LENGTH = 32;
const MAX_COMPANION_STAGE_LENGTH = 64;
const MAX_TAGS = 12;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function asEnumString<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (typeof value !== "string") return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function asTagArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] {
  if (!Array.isArray(value)) return [];
  const allowedSet = new Set<string>(allowed);
  const out = new Set<T>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (!allowedSet.has(item)) continue;
    out.add(item as T);
    if (out.size >= MAX_TAGS) break;
  }
  return Array.from(out);
}

/**
 * Parse + validate the JSON body the student client POSTs to the progress
 * API route. Hard-rejects any forbidden raw-quiz key. Silently strips
 * unknown top-level keys (defense in depth). Never trusts a client
 * `user_id`.
 */
export function parseProgressSnapshotPayload(
  body: unknown,
): ParseProgressSnapshotResult {
  if (!isPlainObject(body)) {
    return { ok: false, reason: "Body must be a JSON object" };
  }

  // Hard reject: any forbidden raw-quiz key in the client payload makes
  // the request invalid (don't silently strip — we want to catch broken
  // callers loudly).
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_TEACHER_BRIDGE_FIELDS.includes(key)) {
      return {
        ok: false,
        reason: `body contains forbidden raw-data key: ${key}`,
      };
    }
  }

  // Soft strip: drop any unknown top-level key, INCLUDING any attempt to
  // set `user_id` from the client. The route uses auth.getUser() instead.
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_KEYS_SET.has(key)) filtered[key] = value;
  }

  const courseId = asString(filtered.course_id, MAX_ID_LENGTH);
  const moduleId = asString(filtered.module_id, MAX_ID_LENGTH);
  const moduleTitle = asString(filtered.module_title, MAX_TITLE_LENGTH);
  const discipline = asString(filtered.discipline, MAX_DISCIPLINE_LENGTH);

  if (!courseId) return { ok: false, reason: "course_id is required" };
  if (!moduleId) return { ok: false, reason: "module_id is required" };
  if (!moduleTitle) return { ok: false, reason: "module_title is required" };
  if (!discipline) return { ok: false, reason: "discipline is required" };

  const progressState =
    asEnumString(filtered.progress_state, PROGRESS_STATES) ?? "started";
  const levelLabel = asString(filtered.level_label, MAX_LEVEL_LENGTH);
  const scoreBand = asEnumString(filtered.score_band, SCORE_BANDS);
  const companionStage = asString(
    filtered.companion_stage,
    MAX_COMPANION_STAGE_LENGTH,
  );

  return {
    ok: true,
    value: {
      courseId,
      moduleId,
      moduleTitle,
      discipline,
      levelLabel,
      progressState,
      skillTags: asTagArray(filtered.skill_tags, ALLOWED_SKILL_TAGS),
      difficultyTags: asTagArray(
        filtered.difficulty_tags,
        ALLOWED_DIFFICULTY_TAGS,
      ),
      scoreBand,
      companionStage,
    },
  };
}

/**
 * Build the row payload for `yopratiqo_progress_snapshots` upsert. The
 * `user_id` is supplied by the API route from `auth.getUser()` and is
 * intentionally a separate argument — never read from the client body.
 */
export function buildSnapshotInsert(
  input: ParsedProgressSnapshotPayload,
  userId: string,
): Omit<ProgressSnapshotRow, "id" | "created_at" | "updated_at"> {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    course_id: input.courseId,
    module_id: input.moduleId,
    module_title: input.moduleTitle,
    discipline: input.discipline,
    level_label: input.levelLabel,
    completed_at: input.progressState === "completed" ? now : null,
    last_activity_at: now,
    progress_state: input.progressState,
    skill_tags: input.skillTags,
    difficulty_tags: input.difficultyTags,
    score_band: input.scoreBand,
    companion_stage: input.companionStage,
    summary_version: PROGRESS_SNAPSHOT_VERSION,
  };
}

/**
 * Project the authenticated user's own progress snapshots into the
 * `BookingBridgeSummaryJson` shape that the booking bridge stores on
 * `booking_yopratiqo_learning_summaries.summary`.
 *
 * Rules:
 *   • Only `progress_state === 'completed'` modules count as completed,
 *     so the teacher never sees in-progress drafts.
 *   • All strengths / difficulty tags are deduped via the safe builder.
 *   • The deterministic `suggestedTeacherFocus` is derived from the
 *     difficulty tags — no AI, no free text.
 *   • `lastActivityDate` is the max `last_activity_at` across snapshots.
 *   • The companion stage comes from whichever snapshot has the most
 *     recent activity, which keeps the projection deterministic.
 *
 * Returns `null` if the student has no snapshots at all (the bridge
 * route then persists `summary = null`, matching the "no progress yet"
 * contract).
 */
export function summarizeSnapshotsForBridge(
  rows: ProgressSnapshotRow[],
  fallback: { courseTitle?: string; currentLevel?: string } = {},
): BookingBridgeSummaryJson | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  // Pick the dominant discipline + course title from the most-recent row.
  const byActivity = [...rows].sort(
    (a, b) =>
      new Date(b.last_activity_at).getTime() -
      new Date(a.last_activity_at).getTime(),
  );
  const newest = byActivity[0];

  const completed = byActivity
    .filter((r) => r.progress_state === "completed")
    .map((r) => r.module_title);

  const strengths: LearningSkillTag[] = [];
  const difficultyTags: LearningDifficultyTag[] = [];
  for (const r of rows) {
    for (const t of r.skill_tags) strengths.push(t);
    for (const t of r.difficulty_tags) difficultyTags.push(t);
  }

  // Deterministic teacher-focus strings from difficulty tags.
  const focusByTag: Record<LearningDifficultyTag, string> = {
    needs_speaking_practice: "Speaking warm-up before the lesson core",
    needs_listening_repetition:
      "Listening repetition with slowed-then-natural pace",
    needs_pronunciation_support: "Targeted pronunciation drills",
    needs_vocabulary_review: "Vocabulary review of the last completed module",
    needs_cultural_context: "Cultural context for the next conversation",
    not_enough_signal: "Open conversation to gauge current level",
  };
  const suggestedTeacherFocus = Array.from(new Set(difficultyTags)).map(
    (t) => focusByTag[t],
  );

  const summary = buildSafeBookingSummary({
    product: "YoPratiqo",
    discipline: newest.discipline,
    courseTitle: fallback.courseTitle ?? newest.discipline,
    completedModules: completed,
    currentLevel: newest.level_label ?? fallback.currentLevel ?? "A1",
    strengths,
    difficultyTags,
    suggestedTeacherFocus,
    lastActivityDate: newest.last_activity_at,
    companion: newest.companion_stage
      ? {
          companionId: "companion-yo",
          companionName: "Yo",
          stageName: newest.companion_stage,
          stageIndex: 0,
          progressPercent: completed.length > 0 ? Math.min(100, completed.length * 20) : 0,
        }
      : null,
  });

  return summary;
}
