"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { announceAdventureEvaluation } from "@/lib/yo/adventure";
import { emptyProgress, MANDARIN_PROGRESS_KEY, parseProgress } from "@/lib/yo/mandarin/progress";
import { mandarinSnapshot, mergeMandarinProgress, resetMandarinProgress, sameMandarinEpoch, serializeMandarinProgress, stampMandarinUpdate } from "@/lib/yo/mandarin/progressSync";
import type { Progress } from "@/lib/yo/mandarin/types";

export const MANDARIN_PROGRESS_EVENT = "yo-mandarin-progress-change";
let documentActor: string | undefined;
function actor() {
  documentActor ??= "m-" + Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, "0")).join("");
  return documentActor;
}
type ProgressEvent = CustomEvent<{ source: object; progress: Progress }>;

export function useMandarinProgress() {
  const [progress, setProgress] = useState(emptyProgress);
  const latest = useRef(progress);
  const instance = useRef({});
  const loaded = useRef(false);
  const hadStored = useRef(false);
  const [ready, setReady] = useState(false);
  const [stored, setStored] = useState(true);

  const publish = useCallback((next: Progress, notify = true) => {
    const previous = latest.current;
    latest.current = next;
    setProgress(next);
    try {
      const serialized = serializeMandarinProgress(next);
      if (!serialized) { setStored(false); return; }
      const changed = localStorage.getItem(MANDARIN_PROGRESS_KEY) !== serialized;
      if (changed) localStorage.setItem(MANDARIN_PROGRESS_KEY, serialized);
      hadStored.current = true;
      setStored(true);
      if (notify && changed) window.dispatchEvent(new window.CustomEvent(MANDARIN_PROGRESS_EVENT, { detail: { source: instance.current, progress: next } }));
      if (mandarinSnapshot(previous.results) !== mandarinSnapshot(next.results)) announceAdventureEvaluation();
    } catch {
      setStored(false);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANDARIN_PROGRESS_KEY);
      const restored = parseProgress(raw);
      hadStored.current = raw !== null;
      latest.current = restored;
      setProgress(restored);
    } catch { setStored(false); }
    loaded.current = true;
    setReady(true);
    const reconcile = (incoming?: Progress) => {
      try {
        const raw = localStorage.getItem(MANDARIN_PROGRESS_KEY);
        const disk = raw === null && hadStored.current ? resetMandarinProgress(latest.current, actor()) : parseProgress(raw);
        const merged = mergeMandarinProgress(mergeMandarinProgress(latest.current, disk), incoming ?? disk);
        publish(merged);
      } catch { setStored(false); }
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== MANDARIN_PROGRESS_KEY && event.key !== null) return;
      if (event.storageArea !== null && event.storageArea !== window.localStorage) return;
      reconcile(event.newValue ? parseProgress(event.newValue) : undefined);
    };
    const local = (event: Event) => {
      const detail = (event as ProgressEvent).detail;
      if (!detail || detail.source === instance.current) return;
      reconcile(parseProgress(JSON.stringify(detail.progress)));
    };
    const focus = () => reconcile();
    window.addEventListener("storage", storage);
    window.addEventListener("focus", focus);
    window.addEventListener(MANDARIN_PROGRESS_EVENT, local);
    return () => {
      loaded.current = false;
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", focus);
      window.removeEventListener(MANDARIN_PROGRESS_EVENT, local);
    };
  }, [publish]);

  const resetAt = progress.resetAt, resetBy = progress.resetBy;
  const update = useCallback((transform: (current: Progress) => Progress): boolean => {
    if (!loaded.current || !sameMandarinEpoch(latest.current, { resetAt, resetBy } as Progress)) return false;
    const source = latest.current;
    let merged = source;
    try {
      const raw = localStorage.getItem(MANDARIN_PROGRESS_KEY);
      if (raw !== null) merged = mergeMandarinProgress(source, parseProgress(raw));
      else if (hadStored.current) merged = resetMandarinProgress(source, actor());
    } catch { setStored(false); }
    if (!sameMandarinEpoch(source, merged)) { publish(merged); return false; }
    const next = stampMandarinUpdate(merged, transform(merged), merged, actor());
    publish(next);
    return true;
  }, [publish, resetAt, resetBy]);

  const reset = useCallback(() => {
    let current = latest.current;
    try { current = mergeMandarinProgress(current, parseProgress(localStorage.getItem(MANDARIN_PROGRESS_KEY))); } catch { setStored(false); }
    publish(resetMandarinProgress(current, actor()));
  }, [publish]);
  return { progress, ready, stored, update, reset };
}
