"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { announceAdventureEvaluation } from "@/lib/yo/adventure";
import {
  emptyProgress,
  MANDARIN_PROGRESS_KEY,
  parseProgress,
} from "@/lib/yo/mandarin/progress";
import type { Progress } from "@/lib/yo/mandarin/types";
export function useMandarinProgress() {
  const [progress, setProgress] = useState(emptyProgress);
  const latest = useRef(progress);
  const [ready, setReady] = useState(false);
  const [stored, setStored] = useState(true);
  useEffect(() => {
    try {
      latest.current = parseProgress(
        localStorage.getItem(MANDARIN_PROGRESS_KEY),
      );
      setProgress(latest.current);
    } catch {
      setStored(false);
    }
    setReady(true);
  }, []);
  const update = useCallback((transform: (current: Progress) => Progress) => {
    const previous = latest.current;
    const next = transform(previous);
    latest.current = next;
    setProgress(next);
    try {
      localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify(next));
      setStored(true);
      if (JSON.stringify(previous.results) !== JSON.stringify(next.results)) announceAdventureEvaluation();
    } catch {
      setStored(false);
    }
  }, []);
  return { progress, ready, stored, update };
}
