"use client";

import { useSyncExternalStore } from "react";
import { EFFECTS_KEY } from "@/lib/yo/adventureSound";
import { EFFECTS_VOLUME_KEY, useLearningFeedback } from "../feedback/LearningFeedback";

function readSound(): string {
  try {
    const rawVolume = localStorage.getItem(EFFECTS_VOLUME_KEY);
    const value = rawVolume === null ? 1 : Number(rawVolume);
    const volume = Number.isFinite(value) && value >= 0 && value <= 1 ? value : 1;
    return `${localStorage.getItem(EFFECTS_KEY) !== "true"}:${volume}`;
  } catch { return "true:1"; }
}

function subscribe(changed: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === EFFECTS_KEY || event.key === EFFECTS_VOLUME_KEY) changed();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/** A missing feedback provider is not a mute choice. Wait for saved preferences before playback. */
export function useCinemaSound() {
  const feedback = useLearningFeedback();
  const saved = useSyncExternalStore(subscribe, readSound, () => null);
  if (feedback.present) return { ready: feedback.ready, sound: feedback.sound, volume: feedback.volume };
  const [sound, volume] = (saved ?? "true:1").split(":");
  return { ready: saved !== null, sound: sound === "true", volume: Number(volume) };
}
