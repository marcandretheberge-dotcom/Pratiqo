"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

export type IntroJourneyId = "english-intro" | "french-quebec-intro" | "spanish-intro";
export const explorationKey = (id: IntroJourneyId) => `yopratiqo:exploration:${id}:v1`;

export function parseExploration(raw: string | null, ids: string[], initial: number) {
  let index = initial;
  let visited: string[] = [];
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (value && typeof value === "object" && "version" in value && value.version === 1) {
      if ("current" in value && typeof value.current === "string" && ids.includes(value.current)) index = ids.indexOf(value.current);
      if ("visited" in value && Array.isArray(value.visited)) visited = ids.filter(id => value.visited instanceof Array && value.visited.includes(id));
    }
  } catch { /* A broken local bookmark must not block a lesson. */ }
  return { index, visited };
}

/** Bookmarks only: a visited screen is not a successful exercise or a completion. */
export function useExplorationJourney(id: IntroJourneyId | undefined, ids: string[], initial: number) {
  const [index, setIndex] = useState(initial);
  const [visited, setVisited] = useState<string[]>([]);
  const [loadedId, setLoadedId] = useState<IntroJourneyId>();
  const ready = !id || loadedId === id;
  const [stored, setStored] = useState(true);
  const loaded = useRef<IntroJourneyId | null>(null);
  useEffect(() => {
    if (!id || loaded.current === id) return;
    loaded.current = id;
    setStored(true);
    try {
      const saved = parseExploration(window.localStorage.getItem(explorationKey(id)), ids, initial);
      setIndex(saved.index);
      setVisited(saved.visited);
    } catch { setStored(false); }
    setLoadedId(id);
  }, [id, ids, initial]);
  useEffect(() => {
    if (!id || !ready || !ids[index]) return;
    try {
      window.localStorage.setItem(explorationKey(id), JSON.stringify({
        version: 1, current: ids[index], visited: ids.filter(item => visited.includes(item) || item === ids[index]),
      }));
    } catch { setStored(false); }
  }, [id, ready, index, ids, visited]);
  const move = useCallback((change: SetStateAction<number>) => {
    if (!ready) return;
    const next = Math.max(0, Math.min(ids.length - 1, typeof change === "function" ? change(index) : change));
    setVisited(current => ids.filter(item => current.includes(item) || item === ids[index] || item === ids[next]));
    setIndex(next);
  }, [ready, ids, index]);
  return { index, move, visited, ready, stored };
}
