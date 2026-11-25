"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { announceAdventureEvaluation } from "@/lib/yo/adventure";
import { emptyJapaneseProgress, JAPANESE_PROGRESS_KEY, mergeJapaneseProgress, parseJapaneseProgress, type JapaneseCourseProgress } from "@/lib/yo/japaneseCourseProgress";
import { JAPANESE_SESSION_KEY, readJapaneseSession } from "@/lib/yo/japaneseSession";

export function useJapaneseCourseProgress() {
  const [progress, setProgress] = useState<JapaneseCourseProgress>(emptyJapaneseProgress);
  const currentProgress = useRef(progress);
  const unsavedProgress = useRef(false);
  const epoch = useRef<string | null>(null);
  const observedPresent = useRef(false);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try {
      const session = readJapaneseSession(window.localStorage, epoch.current !== null);
      const raw = session.progressRaw;
      if (session.epoch) epoch.current = session.epoch;
      observedPresent.current = raw !== null;
      const restored = raw === null ? currentProgress.current : mergeJapaneseProgress(currentProgress.current, parseJapaneseProgress(raw));
      currentProgress.current = restored;
      setProgress(restored);
      setStorageAvailable(true);
    }
    catch { setStorageAvailable(false); }
    setReady(true);

    function synchronize(event?: StorageEvent) {
      if (event && event.key !== null && event.key !== JAPANESE_PROGRESS_KEY && event.key !== JAPANESE_SESSION_KEY) return;
      try {
        const storage = window.localStorage;
        if (event?.storageArea && event.storageArea !== storage) return;
        // Read the current value: a queued event may describe an older write.
        const session = readJapaneseSession(storage, epoch.current !== null), raw = session.progressRaw;
        const reset = epoch.current !== null && session.epoch !== epoch.current;
        if (session.epoch) epoch.current = session.epoch;
        observedPresent.current = raw !== null;
        const latest = parseJapaneseProgress(raw);
        const merged = raw === null || reset ? latest : unsavedProgress.current
          ? mergeJapaneseProgress(latest, currentProgress.current)
          : mergeJapaneseProgress(currentProgress.current, latest);
        currentProgress.current = merged;
        setProgress(merged);
        // Reconcile distinct results if two tabs wrote before receiving events.
        // The comparison prevents echo writes; explicit removal stays removed.
        const serialized = JSON.stringify(merged);
        if (raw !== null && serialized !== JSON.stringify(latest)) {
          unsavedProgress.current = true;
          storage.setItem(JAPANESE_PROGRESS_KEY, serialized);
        }
        unsavedProgress.current = false;
        setStorageAvailable(true);
      } catch { setStorageAvailable(false); }
    }
    const focus = () => synchronize();
    window.addEventListener("storage", synchronize);
    window.addEventListener("focus", focus);
    return () => { window.removeEventListener("storage", synchronize); window.removeEventListener("focus", focus); };
  }, []);

  const update = useCallback((transform: (current: JapaneseCourseProgress) => JapaneseCourseProgress, expectedEpoch?: string) => {
    let base = currentProgress.current;
    let storage: Storage | undefined;
    let raw: string | null = null;
    try {
      const availableStorage = window.localStorage;
      const session = readJapaneseSession(availableStorage, epoch.current !== null);
      raw = session.progressRaw;
      const reset = epoch.current !== null && session.epoch !== epoch.current || raw === null && observedPresent.current;
      if (session.epoch) epoch.current = session.epoch;
      observedPresent.current = raw !== null;
      if (reset || expectedEpoch && session.epoch !== expectedEpoch) {
        currentProgress.current = parseJapaneseProgress(raw); unsavedProgress.current = false;
        setProgress(currentProgress.current); setStorageAvailable(true);
        return false;
      }
      if (raw !== null) {
        const latest = parseJapaneseProgress(raw);
        base = unsavedProgress.current ? mergeJapaneseProgress(latest, base) : mergeJapaneseProgress(base, latest);
      }
      storage = availableStorage;
    } catch { /* Keep the current in-memory session when storage is blocked. */ }
    const receivedResults = JSON.stringify(base.results) !== JSON.stringify(currentProgress.current.results);
    const transformed = transform(base);
    const next = mergeJapaneseProgress(transformed, transformed);
    currentProgress.current = next;
    let saved = false;
    if (storage) {
      try {
        const serialized = JSON.stringify(next);
        if (serialized !== raw) storage.setItem(JAPANESE_PROGRESS_KEY, serialized);
        observedPresent.current = true;
        if (epoch.current !== null) {
          const confirmed = readJapaneseSession(storage);
          if (confirmed.epoch !== epoch.current) {
            epoch.current = confirmed.epoch; observedPresent.current = confirmed.progressRaw !== null;
            currentProgress.current = parseJapaneseProgress(confirmed.progressRaw); unsavedProgress.current = false;
            setProgress(currentProgress.current); setStorageAvailable(true);
            return false;
          }
        }
        saved = true;
      } catch { /* Quota/privacy failures must not prevent practising. */ }
    }
    unsavedProgress.current = !saved;
    // Persist inside the event call, before a link can unmount this hook. Never
    // put storage writes or the transform inside a replayable React updater.
    setProgress(next);
    setStorageAvailable(saved);
    if (saved && !receivedResults && JSON.stringify(base.results) !== JSON.stringify(next.results)) announceAdventureEvaluation();
    return true;
  }, []);
  return { progress, update, ready, storageAvailable };
}
