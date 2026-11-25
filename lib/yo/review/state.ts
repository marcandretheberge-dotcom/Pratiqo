import { learningLanguageId, type YoLearningLanguage } from "@/lib/yo/config/languages";
import { recordAttempt, type SrsActivityRecord } from "@/lib/yo/srs/engine";
import { SRS_DAY_MS } from "@/lib/yo/srs/intervals";

export interface ReviewAttempt {
  version: 1;
  language: YoLearningLanguage;
  itemId: string;
  id: string;
  at: number;
  correct: boolean;
  assisted: boolean;
}

export interface ReviewState {
  version: 1;
  language: YoLearningLanguage;
  records: Record<string, SrsActivityRecord>;
  /** False when at least one result exists only in this open browser session. */
  persistent: boolean;
}

export interface ReviewSummary {
  dueIds: string[];
  /** Tracked items whose next review is in the future. */
  pending: number;
  total: number;
  nextAt: number | null;
}

export const REVIEW_STORAGE_PREFIX = "yo.review.v1.";
export const REVIEW_MAX_EVENTS = 5000;
export const REVIEW_MAX_SESSION_EVENTS = 500;
export const REVIEW_MAX_EVENT_LENGTH = 900;

export const isReviewId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,179}$/.test(value) && value !== "constructor" && value !== "prototype";

export const isReviewTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15 - 14 * SRS_DAY_MS;

export function reviewEventKey(event: Pick<ReviewAttempt, "language" | "itemId" | "id">): string {
  return `${REVIEW_STORAGE_PREFIX}${event.language}.${encodeURIComponent(event.itemId)}/${encodeURIComponent(event.id)}`;
}

export function parseReviewAttempt(raw: string | null, key: string, language: YoLearningLanguage): ReviewAttempt | null {
  if (!raw || raw.length > REVIEW_MAX_EVENT_LENGTH) return null;
  try {
    const event: unknown = JSON.parse(raw);
    if (!event || typeof event !== "object" || Array.isArray(event)) return null;
    const value = event as Record<string, unknown>;
    if (value.version !== 1 || value.language !== language || learningLanguageId(value.language) !== language ||
      !isReviewId(value.itemId) || !isReviewId(value.id) || !isReviewTime(value.at) ||
      typeof value.correct !== "boolean" || typeof value.assisted !== "boolean") return null;
    const parsed: ReviewAttempt = {
      version: 1, language, itemId: value.itemId, id: value.id, at: value.at,
      correct: value.correct, assisted: value.assisted,
    };
    return reviewEventKey(parsed) === key ? parsed : null;
  } catch { return null; }
}

/** Pure projection. Error ties are conservative; replay order does not depend on localStorage enumeration. */
export function reviewStateFromAttempts(language: YoLearningLanguage, attempts: readonly ReviewAttempt[], persistent = true): ReviewState {
  const records: Record<string, SrsActivityRecord> = {};
  const ordered = [...new Map(attempts.filter((event) => event.language === language).map((event) => [reviewEventKey(event), event])).values()]
    .sort((a, b) => a.at - b.at || Number(b.correct) - Number(a.correct) || Number(a.assisted) - Number(b.assisted) || a.id.localeCompare(b.id));
  for (const event of ordered) {
    const record = Object.hasOwn(records, event.itemId) ? records[event.itemId] : null;
    // Repeating a just-corrected answer is useful practice, not delayed recall.
    // Keep its original due date rather than racing through all four intervals.
    if (record && event.correct && !event.assisted && event.at < record.nextReviewAt) continue;
    records[event.itemId] = recordAttempt(record, event.correct, event.assisted, event.at);
  }
  return { version: 1, language, records, persistent };
}

export function getReviewSummary(state: ReviewState, itemIds?: readonly string[], now = Date.now()): ReviewSummary {
  const ids = [...new Set(itemIds ?? Object.keys(state.records))].filter((id) => isReviewId(id) && Object.hasOwn(state.records, id));
  const dueIds = ids.filter((id) => state.records[id].nextReviewAt <= now)
    .sort((a, b) => state.records[a].nextReviewAt - state.records[b].nextReviewAt || a.localeCompare(b));
  const future = ids.map((id) => state.records[id].nextReviewAt).filter((at) => at > now);
  return { dueIds, pending: future.length, total: ids.length, nextAt: future.length ? Math.min(...future) : null };
}
