"use client";
import { useCallback, useEffect, useState } from "react";
import {
  finishMissionScene, missionSceneKey, queueMissionScene, readMissionCinema, writeMissionCinema,
  type MissionCinemaScene, type MissionCinemaState,
} from "@/lib/yo/travelCinema";

/** Save the real learning/reward outcome before present(). Closing a film only closes a film. */
export function useMissionCinema(namespace: string, { active = true }: { active?: boolean } = {}) {
  const [snapshot, setSnapshot] = useState<{ namespace: string; state: MissionCinemaState } | null>(null);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setSnapshot({ namespace, state: readMissionCinema(namespace) }); });
    return () => { cancelled = true; };
  }, [namespace]);

  const present = useCallback((scene: MissionCinemaScene) => {
    const current = readMissionCinema(namespace), next = queueMissionScene(current, { ...scene, scope: namespace });
    if (next === current) return false;
    writeMissionCinema(namespace, next);
    setSnapshot({ namespace, state: next });
    return true;
  }, [namespace]);

  const scene = active && snapshot?.namespace === namespace ? snapshot.state.queue[0] ?? null : null;
  const visibleKey = scene ? missionSceneKey(scene) : null;
  const finish = useCallback(() => {
    if (!visibleKey) return;
    const current = readMissionCinema(namespace), next = finishMissionScene(current, visibleKey);
    if (next === current) return;
    writeMissionCinema(namespace, next);
    setSnapshot({ namespace, state: next });
  }, [namespace, visibleKey]);

  return { scene, present, finish };
}
