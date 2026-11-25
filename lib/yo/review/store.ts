import { learningLanguageId, type YoLearningLanguage } from "@/lib/yo/config/languages";
import {
  REVIEW_MAX_EVENTS, REVIEW_MAX_SESSION_EVENTS, REVIEW_STORAGE_PREFIX, isReviewId, isReviewTime,
  parseReviewAttempt, reviewEventKey, reviewStateFromAttempts,
  type ReviewAttempt, type ReviewState,
} from "./state";

export { getReviewSummary } from "./state";
export type { ReviewState, ReviewSummary } from "./state";

export interface ReviewAttemptInput {
  language: string;
  itemId: string;
  correct: boolean;
  assisted: boolean;
  attemptId?: string;
  at?: number;
}
export interface ReviewWriteResult { recorded: boolean; saved: boolean }
export type ReviewStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem">;
export const REVIEW_CHANGED_EVENT = "yo-review-updated";

function newAttemptId(at: number): string {
  const unique = globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `r-${at}-${unique}`;
}

/**
 * One immutable storage key per accepted attempt. Concurrent tabs append distinct
 * keys, so a read/modify/write race cannot erase either tab's evidence. No course
 * progress, answer text, account identifiers, XP or entitlement is stored here.
 *
 * The bounded journal does not evict receipts: replay remains idempotent. At the
 * cap or on browser storage failure, this session keeps the result and the UI
 * explicitly reports that it could not be saved. Existing progress is untouched.
 */
export function createReviewStore(
  storageProvider: () => ReviewStorage | null,
  clock: () => number = Date.now,
  changed: (language: YoLearningLanguage) => void = () => {},
) {
  const unsaved = new Map<string, ReviewAttempt>();
  const full = new Set<YoLearningLanguage>();

  function storage(): ReviewStorage | null {
    try { return storageProvider(); } catch { return null; }
  }

  function readEvents(language: YoLearningLanguage) {
    const events = new Map<string, ReviewAttempt>();
    let persistent = !full.has(language), eventCount = 0;
    const disk = storage();
    if (!disk) persistent = false;
    else try {
      const prefix = `${REVIEW_STORAGE_PREFIX}${language}.`;
      for (let index = 0; index < disk.length; index++) {
        const key = disk.key(index);
        if (!key?.startsWith(REVIEW_STORAGE_PREFIX)) continue;
        eventCount++;
        if (!key.startsWith(prefix)) continue;
        const event = parseReviewAttempt(disk.getItem(key), key, language);
        if (event) events.set(key, event);
      }
    } catch { persistent = false; }
    for (const [key, event] of unsaved) {
      if (event.language !== language) continue;
      // A persisted receipt always wins a later duplicate, including across tabs.
      if (events.has(key)) unsaved.delete(key);
      else { events.set(key, event); persistent = false; }
    }
    return { events: [...events.values()], persistent, eventCount, disk };
  }

  function read(language: string): ReviewState {
    const id = learningLanguageId(language);
    if (!id) throw new TypeError("Unsupported learning language");
    const snapshot = readEvents(id);
    return reviewStateFromAttempts(id, snapshot.events, snapshot.persistent);
  }

  function record(input: ReviewAttemptInput): ReviewWriteResult {
    const language = learningLanguageId(input.language), at = input.at ?? clock();
    if (!language || !isReviewId(input.itemId) || !isReviewTime(at) ||
      typeof input.correct !== "boolean" || typeof input.assisted !== "boolean" ||
      input.attemptId !== undefined && !isReviewId(input.attemptId)) return { recorded: false, saved: false };
    const snapshot = readEvents(language);
    const previous = snapshot.events.filter((event) => event.itemId === input.itemId);
    // This is a targeted review queue, not an invented obligation for every right answer.
    if (!previous.length && input.correct && !input.assisted) return { recorded: false, saved: snapshot.persistent };
    const id = input.attemptId ?? newAttemptId(at);
    const duplicate = previous.find((event) => event.id === id);
    if (duplicate) return { recorded: false, saved: !unsaved.has(reviewEventKey(duplicate)) };
    const event: ReviewAttempt = {
      version: 1, language, itemId: input.itemId, id,
      at: input.at === undefined ? Math.max(at, ...previous.map((item) => item.at + 1)) : at,
      correct: input.correct, assisted: input.assisted,
    };
    if (!isReviewTime(event.at)) return { recorded: false, saved: false };
    const key = reviewEventKey(event);
    let saved = false;
    if (snapshot.disk && snapshot.eventCount < REVIEW_MAX_EVENTS) {
      try { snapshot.disk.setItem(key, JSON.stringify(event)); saved = true; } catch { /* Session-only feedback below. */ }
    }
    if (!saved) {
      if (unsaved.size >= REVIEW_MAX_SESSION_EVENTS) {
        full.add(language);
        changed(language);
        return { recorded: false, saved: false };
      }
      unsaved.set(key, event);
    }
    changed(language);
    return { recorded: true, saved };
  }

  return { read, record };
}

const browserStore = createReviewStore(
  () => typeof window === "undefined" ? null : window.localStorage,
  Date.now,
  (language) => { if (typeof window !== "undefined") window.dispatchEvent(new window.CustomEvent(REVIEW_CHANGED_EVENT, { detail: language })); },
);

export const recordReviewAttempt = (input: ReviewAttemptInput): ReviewWriteResult => browserStore.record(input);
export const readReviewState = (language: string): ReviewState => browserStore.read(language);

export function subscribeReview(language: string, callback: () => void): () => void {
  const id = learningLanguageId(language);
  if (!id || typeof window === "undefined") return () => {};
  const local = (event: Event) => { if ((event as CustomEvent<YoLearningLanguage>).detail === id) callback(); };
  const remote = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(`${REVIEW_STORAGE_PREFIX}${id}.`)) callback();
  };
  window.addEventListener(REVIEW_CHANGED_EVENT, local);
  window.addEventListener("storage", remote);
  return () => { window.removeEventListener(REVIEW_CHANGED_EVENT, local); window.removeEventListener("storage", remote); };
}
