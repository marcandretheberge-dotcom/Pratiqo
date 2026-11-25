import type { JapaneseActivity, JapaneseCourseUnit } from "./japaneseCourseTypes";

export const JAPANESE_PROGRESS_KEY = "yopratiqo:japanese-foundations:v1";
export const JAPANESE_COURSE_PATH = "/yo/langues/japonais/parcours";
export type JapaneseAnswer = string | string[] | Record<string, string>;
export interface JapanesePracticeResult {
  passed: boolean;
  independent: boolean;
  needsReview: boolean;
  attempts: number;
}
export interface JapaneseCourseProgress {
  version: 1;
  results: Record<string, JapanesePracticeResult>;
  practicedKanji: string[];
  lastUnit: string;
  lastSteps: Record<string, string>;
}

export function emptyJapaneseProgress(): JapaneseCourseProgress {
  return { version: 1, results: {}, practicedKanji: [], lastUnit: "module-1", lastSteps: {} };
}

const validId = (value: string) => /^jp[-a-z0-9]{1,100}$/.test(value);
const validModule = (value: string) => /^module-[1-8]$/.test(value) || value === "bilan";
const MAX_RESULTS = 500;

/** Never normalize away small kana, long vowels or diacritics: they can change a word. */
export function normalizeJapaneseAnswer(value: string, acceptsRomaji = false): string {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  return acceptsRomaji ? normalized.toLocaleLowerCase("en") : normalized;
}

export function checkJapaneseAnswer(activity: JapaneseActivity, answer: JapaneseAnswer): boolean {
  if (activity.kind === "reading") {
    return typeof answer === "string" && answer.trim().length > 0 &&
      activity.accepted.some((accepted) => normalizeJapaneseAnswer(accepted, activity.acceptsRomaji) === normalizeJapaneseAnswer(answer, activity.acceptsRomaji));
  }
  if (activity.kind === "build") {
    if (!Array.isArray(answer)) return false;
    return [activity.answerOrder, ...(activity.alternativeOrders ?? [])].some((order) =>
      order.length === answer.length && order.every((id, index) => id === answer[index]));
  }
  if (activity.kind === "match") {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return false;
    return activity.pairs.length > 0 && activity.pairs.every((pair) => answer[pair.id] === pair.id);
  }
  return typeof answer === "string" && answer === activity.answerId;
}

/** Aggregate practice only. No raw answers, handwriting, audio or free writing is persisted. */
export function recordJapaneseResult(progress: JapaneseCourseProgress, id: string, correct: boolean, assisted: boolean): JapaneseCourseProgress {
  if (!validId(id)) return progress;
  const previous = progress.results[id];
  return {
    ...progress,
    results: {
      ...progress.results,
      [id]: {
        passed: !!previous?.passed || correct,
        independent: !!previous?.independent || (correct && !assisted),
        needsReview: !correct || assisted,
        attempts: Math.min(99, (previous?.attempts ?? 0) + 1),
      },
    },
  };
}

/**
 * Combine snapshots without counting the same saved attempt twice. Success is
 * cumulative; the review flag follows the snapshot with more checked attempts.
 * On equal attempt counts, the latest stored snapshot wins (including bookmarks).
 * Storage has no atomic cross-tab counter, so simultaneous attempts on the same
 * item are conservatively counted once rather than inventing extra attempts.
 */
export function mergeJapaneseProgress(current: JapaneseCourseProgress, latest: JapaneseCourseProgress): JapaneseCourseProgress {
  const results: Record<string, JapanesePracticeResult> = {};
  const ids = [...new Set([...Object.keys(latest.results), ...Object.keys(current.results)])].sort().slice(0, MAX_RESULTS);
  for (const id of ids) {
    const previous = current.results[id];
    const incoming = latest.results[id];
    if (!previous || !incoming) {
      results[id] = { ...(incoming ?? previous) };
      continue;
    }
    const mostPractised = incoming.attempts >= previous.attempts ? incoming : previous;
    const passed = previous.passed || incoming.passed;
    results[id] = {
      passed,
      independent: passed && (previous.independent || incoming.independent),
      needsReview: mostPractised.needsReview,
      attempts: Math.max(previous.attempts, incoming.attempts),
    };
  }
  const lastSteps = { ...current.lastSteps, ...latest.lastSteps };
  return {
    version: 1,
    results,
    // Canonical set/key order makes equivalent cross-tab snapshots serialize
    // identically, avoiding an endless sequence of storage-event echo writes.
    practicedKanji: [...new Set([...current.practicedKanji, ...latest.practicedKanji])].sort().slice(0, 40),
    lastUnit: latest.lastUnit,
    lastSteps: Object.fromEntries(Object.keys(lastSteps).sort().map((unit) => [unit, lastSteps[unit]])),
  };
}

export function parseJapaneseProgress(raw: string | null): JapaneseCourseProgress {
  const clean = emptyJapaneseProgress();
  if (!raw || raw.length > 120000) return clean;
  try {
    const input: unknown = JSON.parse(raw);
    if (!input || typeof input !== "object" || !("version" in input) || input.version !== 1) return clean;
    const source = input as Record<string, unknown>;
    if (source.results && typeof source.results === "object" && !Array.isArray(source.results)) {
      for (const [id, value] of Object.entries(source.results).slice(0, MAX_RESULTS)) {
        if (!validId(id) || !value || typeof value !== "object" || Array.isArray(value)) continue;
        const item = value as Record<string, unknown>;
        if (typeof item.passed !== "boolean" || typeof item.independent !== "boolean" || typeof item.needsReview !== "boolean") continue;
        clean.results[id] = {
          passed: item.passed,
          independent: item.passed && item.independent,
          needsReview: item.needsReview,
          attempts: typeof item.attempts === "number" && Number.isFinite(item.attempts) ? Math.min(99, Math.max(0, Math.floor(item.attempts))) : 0,
        };
      }
    }
    if (Array.isArray(source.practicedKanji)) clean.practicedKanji = [...new Set(source.practicedKanji.filter((item): item is string => typeof item === "string" && /^[\u3400-\u9fff]$/.test(item)))].slice(0, 40);
    if (typeof source.lastUnit === "string" && validModule(source.lastUnit)) clean.lastUnit = source.lastUnit;
    if (source.lastSteps && typeof source.lastSteps === "object" && !Array.isArray(source.lastSteps)) {
      for (const [unit, step] of Object.entries(source.lastSteps)) {
        if (validModule(unit) && typeof step === "string" && /^[a-z0-9-]{1,110}$/.test(step)) clean.lastSteps[unit] = step;
      }
    }
  } catch { /* A blocked or corrupt local store never blocks the lesson. */ }
  return clean;
}

export function japaneseUnitPracticeIds(unit: JapaneseCourseUnit): string[] {
  return [...unit.activities.map((item) => item.id), ...unit.roleplay.turns.map((turn) => turn.id)];
}

export function japaneseUnitProgress(unit: JapaneseCourseUnit, progress: JapaneseCourseProgress) {
  const ids = japaneseUnitPracticeIds(unit);
  const passed = ids.filter((id) => progress.results[id]?.passed).length;
  const independent = ids.filter((id) => progress.results[id]?.independent).length;
  const review = ids.filter((id) => progress.results[id]?.needsReview).length;
  return { passed, independent, review, total: ids.length, complete: ids.length > 0 && passed === ids.length };
}
