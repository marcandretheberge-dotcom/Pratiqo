/**
 * Per-booking teacher-bridge consent persistence — typed shapes + server-
 * side sanitization.
 *
 * What this file provides
 * -----------------------
 *   • `BookingTeacherBridgeRow` — the row shape stored in
 *     `public.booking_yopratiqo_learning_summaries`.
 *   • `parseClientConsentPayload(unknown)` — validates the JSON body the
 *     student client sends to the API route. Rejects malformed payloads,
 *     rejects unknown summary keys, and rejects any forbidden raw-quiz
 *     field.
 *   • `buildSafeBookingSummary(input)` — converts a sanitized
 *     `YoPratiqoProgressSummary` into the storable jsonb shape, preserving
 *     only the allow-listed keys. Idempotent.
 *   • `BOOKING_BRIDGE_SUMMARY_VERSION` — bumpable version token written
 *     alongside the summary so future readers can migrate older shapes.
 *
 * Privacy contract
 * ----------------
 *   • This file is the second line of defense after the consent-card
 *     source-scan and the runtime `assertSafeTeacherBridgeSummary` guard
 *     in `teacherBridgeSummary.ts`. Both must reject the same forbidden
 *     keys; the deny-list lives in ONE place (FORBIDDEN_TEACHER_BRIDGE_FIELDS).
 *   • No raw quiz answers, attempt logs, keystroke history, or private
 *     telemetry can be persisted by going through this module — the
 *     parser strips unknown keys and the runtime guard throws on the
 *     blocked names.
 */

import {
  FORBIDDEN_TEACHER_BRIDGE_FIELDS,
  assertSafeTeacherBridgeSummary,
} from "@/lib/yopratiqo/teacherBridgeSummary";
import type {
  CompanionBridgeSummary,
  LearningDifficultyTag,
  LearningShareConsentState,
  LearningSkillTag,
  YoPratiqoProgressSummary,
} from "@/lib/yopratiqo/teacherBridge";

/** Storable jsonb shape for the summary column. Mirrors the safe summary. */
export type BookingBridgeSummaryJson = {
  product: "YoPratiqo";
  discipline: string;
  courseTitle: string;
  completedModules: string[];
  currentLevel: string;
  strengths: LearningSkillTag[];
  difficultyTags: LearningDifficultyTag[];
  suggestedTeacherFocus: string[];
  lastActivityDate: string | null;
  companion: CompanionBridgeSummary | null;
};

/** Full row shape returned from `booking_yopratiqo_learning_summaries`. */
export type BookingTeacherBridgeRow = {
  id: string;
  booking_id: string;
  student_id: string;
  teacher_id: string;
  consent_granted: boolean;
  consent_granted_at: string | null;
  summary_version: string | null;
  summary: BookingBridgeSummaryJson | null;
  created_at: string;
  updated_at: string;
};

/**
 * Version token. Bump when the storable summary shape changes in a way
 * that requires reader migration. Older rows keep their original token.
 */
export const BOOKING_BRIDGE_SUMMARY_VERSION = "v1";

/**
 * Top-level keys allowed inside the storable summary. Anything else is
 * stripped by `buildSafeBookingSummary` and rejected by the parser.
 */
export const ALLOWED_BOOKING_BRIDGE_SUMMARY_KEYS = [
  "product",
  "discipline",
  "courseTitle",
  "completedModules",
  "currentLevel",
  "strengths",
  "difficultyTags",
  "suggestedTeacherFocus",
  "lastActivityDate",
  "companion",
] as const satisfies readonly (keyof BookingBridgeSummaryJson)[];

const ALLOWED_KEYS_SET = new Set<string>(ALLOWED_BOOKING_BRIDGE_SUMMARY_KEYS);

/**
 * Validated client payload that the API route accepts.
 *
 * The booking_id, student_id, and teacher_id come from the URL + the
 * authenticated user — they are NEVER taken from the JSON body.
 */
export type ParsedClientConsentPayload = {
  consentGranted: boolean;
  summary: BookingBridgeSummaryJson | null;
  summaryVersion: string | null;
};

export type ParseClientConsentResult =
  | { ok: true; value: ParsedClientConsentPayload }
  | { ok: false; reason: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function asStringArray(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, maxLen);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

function asSkillTagArray(value: unknown): LearningSkillTag[] {
  const allowed: LearningSkillTag[] = [
    "greetings",
    "pronunciation",
    "listening",
    "vocabulary",
    "grammar",
    "culture",
    "conversation",
    "teacher_practice",
  ];
  const allowedSet = new Set<string>(allowed);
  if (!Array.isArray(value)) return [];
  const out: LearningSkillTag[] = [];
  for (const item of value) {
    if (typeof item === "string" && allowedSet.has(item)) {
      out.push(item as LearningSkillTag);
    }
  }
  return Array.from(new Set(out));
}

function asDifficultyTagArray(value: unknown): LearningDifficultyTag[] {
  const allowed: LearningDifficultyTag[] = [
    "needs_speaking_practice",
    "needs_listening_repetition",
    "needs_pronunciation_support",
    "needs_vocabulary_review",
    "needs_cultural_context",
    "not_enough_signal",
  ];
  const allowedSet = new Set<string>(allowed);
  if (!Array.isArray(value)) return [];
  const out: LearningDifficultyTag[] = [];
  for (const item of value) {
    if (typeof item === "string" && allowedSet.has(item)) {
      out.push(item as LearningDifficultyTag);
    }
  }
  return Array.from(new Set(out));
}

function asCompanion(value: unknown): CompanionBridgeSummary | null {
  if (!isPlainObject(value)) return null;
  const id = asString(value.companionId, 64);
  const name = asString(value.companionName, 64);
  const stage = asString(value.stageName, 64);
  const stageIndex = typeof value.stageIndex === "number" && Number.isFinite(value.stageIndex)
    ? Math.max(0, Math.floor(value.stageIndex))
    : 0;
  const progressPercent = typeof value.progressPercent === "number" && Number.isFinite(value.progressPercent)
    ? Math.max(0, Math.min(100, Math.floor(value.progressPercent)))
    : 0;
  if (!id || !name || !stage) return null;
  return {
    companionId: id,
    companionName: name,
    stageName: stage,
    stageIndex,
    progressPercent,
  };
}

/**
 * Convert a `YoPratiqoProgressSummary` (or any client-provided JSON-shaped
 * object) into the strict storable jsonb shape. Drops every key that is
 * not on the allow-list, including any forbidden raw-data key. The output
 * is then re-validated by `assertSafeTeacherBridgeSummary` for defense in
 * depth.
 */
export function buildSafeBookingSummary(
  input: YoPratiqoProgressSummary | Record<string, unknown>,
): BookingBridgeSummaryJson {
  const src = input as Record<string, unknown>;
  const safe: BookingBridgeSummaryJson = {
    product: "YoPratiqo",
    discipline: asString(src.discipline, 80) ?? "Languages",
    courseTitle: asString(src.courseTitle, 120) ?? "YoPratiqo course",
    completedModules: asStringArray(src.completedModules, 32, 120),
    currentLevel: asString(src.currentLevel, 32) ?? "A1",
    strengths: asSkillTagArray(src.strengths),
    difficultyTags: asDifficultyTagArray(src.difficultyTags),
    suggestedTeacherFocus: asStringArray(src.suggestedTeacherFocus, 5, 160),
    lastActivityDate: asString(src.lastActivityDate, 64),
    companion: asCompanion(src.companion),
  };

  // Defense in depth: ensure no forbidden key sneaks through the recursive
  // walk inside the runtime guard. `safe` has only the allow-listed keys
  // by construction; this assertion is the contract test.
  assertSafeTeacherBridgeSummary(safe);
  return safe;
}

/**
 * Parse + validate the JSON body the student client POSTs to the bridge
 * API. Never trust raw `body.summary` shape — the parser strips unknown
 * keys and rejects any forbidden raw-quiz field.
 */
export function parseClientConsentPayload(body: unknown): ParseClientConsentResult {
  if (!isPlainObject(body)) {
    return { ok: false, reason: "Body must be a JSON object" };
  }

  const consentGranted = body.consent_granted === true || body.consent_granted === "true";

  // No summary requested → just the consent flag.
  if (body.summary === undefined || body.summary === null) {
    return {
      ok: true,
      value: { consentGranted, summary: null, summaryVersion: null },
    };
  }

  if (!isPlainObject(body.summary)) {
    return { ok: false, reason: "summary must be a JSON object or null" };
  }

  // Hard reject: any forbidden raw-quiz key in the client payload makes
  // the request invalid (don't silently strip — we want to catch broken
  // callers loudly).
  for (const key of Object.keys(body.summary)) {
    if (FORBIDDEN_TEACHER_BRIDGE_FIELDS.includes(key)) {
      return { ok: false, reason: `summary contains forbidden raw-data key: ${key}` };
    }
  }

  // Soft strip: drop any unknown top-level key. The strict shape rebuilder
  // then re-emits ONLY the allow-listed keys.
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body.summary)) {
    if (ALLOWED_KEYS_SET.has(key)) filtered[key] = value;
  }

  let summary: BookingBridgeSummaryJson;
  try {
    summary = buildSafeBookingSummary(filtered);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Invalid summary" };
  }

  const summaryVersion = asString(body.summary_version, 16) ?? BOOKING_BRIDGE_SUMMARY_VERSION;

  return { ok: true, value: { consentGranted, summary, summaryVersion } };
}

/**
 * Convenience: project a `BookingTeacherBridgeRow` into the
 * `LearningShareConsentState` the bridge components consume.
 */
export function rowToConsentState(row: BookingTeacherBridgeRow): LearningShareConsentState {
  return {
    status: row.consent_granted ? "granted" : "revoked",
    grantedAt: row.consent_granted_at,
    revokedAt: row.consent_granted ? null : row.updated_at,
    scope: "summary_only",
    teacherId: row.teacher_id,
    bookingId: row.booking_id,
  };
}
