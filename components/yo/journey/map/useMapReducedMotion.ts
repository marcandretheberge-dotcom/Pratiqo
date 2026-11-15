"use client";
import { useSyncExternalStore } from "react";
const query = "(prefers-reduced-motion: reduce)";
function subscribe(changed: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(query);
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }
  media.addListener(changed);
  return () => media.removeListener(changed);
}
/** The installed Motion hook snapshots this preference only at mount. Map
 * travel must also stop immediately when the learner changes it mid-session. */
export function useMapReducedMotion() {
  return useSyncExternalStore(subscribe, () => typeof window.matchMedia !== "function" || window.matchMedia(query).matches, () => true);
}
