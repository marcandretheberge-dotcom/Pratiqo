"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { learningLanguageId } from "@/lib/yo/config/languages";
import { getReviewSummary, readReviewState, subscribeReview, REVIEW_CHANGED_EVENT, type ReviewState } from "@/lib/yo/review/store";

type Snapshot = { state: ReviewState; now: number };
const snapshots = new Map<string, Snapshot>();
const serverSnapshot = () => null;

function snapshotFor(language: string): Snapshot {
  const cached = snapshots.get(language);
  if (cached) return cached;
  const next = { state: readReviewState(language), now: Date.now() };
  snapshots.set(language, next);
  return next;
}

export function useReviewQueue(language: string, itemIds?: readonly string[]) {
  const refresh = useCallback(() => {
    snapshots.delete(language);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(REVIEW_CHANGED_EVENT, { detail: learningLanguageId(language) }));
  }, [language]);
  const subscribe = useCallback((changed: () => void) => {
    const update = () => { snapshots.delete(language); changed(); };
    const stop = subscribeReview(language, update);
    const visible = () => { if (document.visibilityState === "visible") update(); };
    // A remount must read the disk even when no subscriber observed a prior tab's changes.
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(visible, 60_000);
    return () => { stop(); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", visible); window.clearInterval(timer); };
  }, [language]);
  const getSnapshot = useCallback(() => snapshotFor(language), [language]);
  const current = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const summary = useMemo(() => current
    ? getReviewSummary(current.state, itemIds, current.now)
    : { dueIds: [], pending: 0, total: 0, nextAt: null }, [current, itemIds]);
  return { ...summary, ready: current !== null, persistent: current?.state.persistent ?? true, refresh };
}
