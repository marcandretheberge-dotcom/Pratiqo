"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emptyItalianProgress, ITALIAN_PROGRESS_KEY, mergeItalianProgress, parseItalianProgress, recordItalianAttempt, type ItalianModuleProgress } from "@/lib/yo/italian/italianModuleProgress";

export function useItalianModuleProgress(activityIds: readonly string[], stepIds: readonly string[]) {
  const [progress, setProgress] = useState(emptyItalianProgress);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const latest = useRef(progress);
  const persist = useCallback((next: ItalianModuleProgress) => {
    latest.current = next;
    setProgress(next);
    try { window.localStorage.setItem(ITALIAN_PROGRESS_KEY, JSON.stringify(next)); setStorageAvailable(true); }
    catch { setStorageAvailable(false); }
  }, []);

  useEffect(() => {
    try {
      const saved = parseItalianProgress(window.localStorage.getItem(ITALIAN_PROGRESS_KEY), activityIds, stepIds);
      latest.current = saved;
      setProgress(saved);
    } catch { setStorageAvailable(false); }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== ITALIAN_PROGRESS_KEY || event.newValue === null) return;
      const incoming = parseItalianProgress(event.newValue, activityIds, stepIds);
      const merged = mergeItalianProgress(latest.current, incoming);
      latest.current = merged;
      setProgress(merged);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [activityIds, stepIds]);

  const update = useCallback((fn: (current: ItalianModuleProgress) => ItalianModuleProgress) => {
    let base = latest.current;
    try { base = mergeItalianProgress(base, parseItalianProgress(window.localStorage.getItem(ITALIAN_PROGRESS_KEY), activityIds, stepIds)); } catch { /* Memory-only progress remains usable. */ }
    persist(fn(base));
  }, [activityIds, stepIds, persist]);

  const visit = useCallback((id: string) => {
    if (!stepIds.includes(id)) return;
    update((base) => ({ ...base, currentStep: id, updatedAt: Math.max(Date.now(), base.updatedAt + 1) }));
  }, [stepIds, update]);
  const attempt = useCallback((id: string, correct: boolean, assisted: boolean) => {
    if (!activityIds.includes(id)) return;
    update((base) => recordItalianAttempt(base, id, correct, assisted));
  }, [activityIds, update]);
  const reset = useCallback(() => update((base) => emptyItalianProgress(Math.max(Date.now(), base.resetAt + 1, base.updatedAt + 1))), [update]);
  return { progress, ready, storageAvailable, visit, attempt, reset };
}
