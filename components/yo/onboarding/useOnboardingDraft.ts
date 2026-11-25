"use client";
import { useEffect, useSyncExternalStore } from "react";
import type { createOnboardingDraftStore } from "@/lib/yo/onboarding/draftStore";

export function useOnboardingDraft<T>(store: ReturnType<typeof createOnboardingDraftStore<T>>) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    store.refresh();
    const refresh = () => store.refresh();
    const changed = (event: StorageEvent) => {
      try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch { return; }
      if (event.key === null || store.watchKeys.includes(event.key)) refresh();
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("storage", changed); window.addEventListener("focus", refresh); window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("storage", changed); window.removeEventListener("focus", refresh); window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [store]);
  return snapshot;
}
