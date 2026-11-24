"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { announceAdventureEvaluation } from "@/lib/yo/adventure";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import { emptyCourseProgress, ITALIAN_COURSE_PROGRESS_KEY, markCourseProduction, mergeCourseProgress, parseCourseProgress, recordCourseActivity, recordCourseAssessment, resetCourseProgress, serializeCourseProgress, setCourseResume, type CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { importLocalSrsProgress, syncSrsActivityRecord } from "@/lib/yo/srs/srsClientSync";

export function useItalianCourseProgress(catalog: CourseCatalog, storageKey = ITALIAN_COURSE_PROGRESS_KEY) {
  const [progress, setProgress] = useState(emptyCourseProgress);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const latest = useRef(progress);
  const previousKey = useRef(storageKey);
  const importAttempted = useRef(false);

  const apply = useCallback((next: CourseProgress) => {
    if (serializeCourseProgress(next) === serializeCourseProgress(latest.current)) return;
    latest.current = next;
    setProgress(next);
  }, []);

  const persist = useCallback((next: CourseProgress) => {
    apply(next);
    try { window.localStorage.setItem(storageKey, serializeCourseProgress(next)); setStorageAvailable(true); return true; }
    catch { setStorageAvailable(false); return false; }
  }, [apply, storageKey]);

  useEffect(() => {
    // Catalog changes only prune invalid identifiers; they must not erase memory-only work.
    const memory = previousKey.current === storageKey ? parseCourseProgress(serializeCourseProgress(latest.current), catalog) : emptyCourseProgress();
    previousKey.current = storageKey;
    try { apply(mergeCourseProgress(memory, parseCourseProgress(window.localStorage.getItem(storageKey), catalog))); }
    catch { apply(memory); setStorageAvailable(false); }
    setReady(true);

    // One-time, fire-and-forget: offer the existing local progress to the
    // server import (spec §2.4). The server enforces one-time-ness and
    // validation; signed-out learners stay local-only. Never blocks.
    if (!importAttempted.current) {
      importAttempted.current = true;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = parseCourseProgress(raw, catalog);
          if (Object.keys(parsed.activities).length > 0) {
            void importLocalSrsProgress(JSON.stringify({ version: parsed.version, resetAt: parsed.resetAt, updatedAt: parsed.updatedAt, activities: parsed.activities }));
          }
        }
      } catch { /* storage unavailable: local-only, as before */ }
    }

    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey || event.newValue === null) return;
      let merged = mergeCourseProgress(latest.current, parseCourseProgress(event.newValue, catalog));
      let stored: string | null;
      try {
        stored = window.localStorage.getItem(storageKey);
        // Events may arrive after another write: include the current disk value as well.
        merged = mergeCourseProgress(merged, parseCourseProgress(stored, catalog));
      } catch { apply(merged); setStorageAvailable(false); return; }
      apply(merged);
      // Repair a concurrent last-writer overwrite, including attempts from before a reset.
      if (serializeCourseProgress(merged) !== stored) persist(merged);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [catalog, apply, persist, storageKey]);

  const update = useCallback((change: (current: CourseProgress) => CourseProgress, evaluated = false) => {
    let base = latest.current;
    try { base = mergeCourseProgress(base, parseCourseProgress(window.localStorage.getItem(storageKey), catalog)); }
    catch { setStorageAvailable(false); }
    const receivedProgress = serializeCourseProgress(base) !== serializeCourseProgress(latest.current);
    const next = change(base);
    if (next === base) { apply(base); return; }
    // No storage side effects inside a React state updater: actions persist immediately once.
    const saved = persist(next);
    // A simultaneous cross-tab merge is recognised silently, never as this attempt's reward.
    if (saved && evaluated && !receivedProgress) announceAdventureEvaluation();
  }, [catalog, apply, persist, storageKey]);

  const recordActivity = useCallback((id: string, correct: boolean, assisted: boolean) => {
    update(base => recordCourseActivity(base, catalog, id, correct, assisted), true);
    // Write-through to the server SRS state when signed in (spec §1.5);
    // fire-and-forget — localStorage remains the offline cache.
    void syncSrsActivityRecord(id, correct, assisted);
  }, [catalog, update]);
  const recordAssessment = useCallback((id: string, correct: number, total: number, assisted: boolean) => update(base => recordCourseAssessment(base, catalog, id, correct, total, assisted), true), [catalog, update]);
  const markProduction = useCallback((id: string, done: boolean) => update(base => markCourseProduction(base, catalog, id, done)), [catalog, update]);
  const setResume = useCallback((unitId: string, lessonId: string, activityId?: string) => update(base => setCourseResume(base, catalog, unitId, lessonId, activityId)), [catalog, update]);
  const reset = useCallback(() => update(base => resetCourseProgress(base)), [update]);
  return { progress, ready, storageAvailable, recordActivity, recordAssessment, markProduction, setResume, reset };
}
