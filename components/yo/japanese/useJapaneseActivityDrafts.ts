"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { JapaneseActivity } from "@/lib/yo/japaneseCourseTypes";
import { createJapaneseActivityDraftStore } from "@/lib/yo/japaneseActivityDraft";
import { JAPANESE_PROGRESS_KEY } from "@/lib/yo/japaneseCourseProgress";
import { JAPANESE_SESSION_KEY } from "@/lib/yo/japaneseSession";

export function useJapaneseActivityDrafts(unit: string, activities: readonly JapaneseActivity[]) {
  const store = useMemo(() => createJapaneseActivityDraftStore(unit, activities), [unit, activities]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    store.refresh();
    const refresh = () => store.refresh();
    const changed = (event: StorageEvent) => {
      try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch { return; }
      if (event.key === null || [store.key, JAPANESE_SESSION_KEY, JAPANESE_PROGRESS_KEY].includes(event.key)) refresh();
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("storage", changed);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("storage", changed); window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh); document.removeEventListener("visibilitychange", visible);
    };
  }, [store]);
  return { store, ...snapshot };
}
