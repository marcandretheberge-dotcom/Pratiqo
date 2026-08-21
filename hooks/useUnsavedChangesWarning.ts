"use client";

import { useEffect } from "react";

/**
 * Registers native beforeunload when `dirty` is true.
 * Does not block in-app navigation by itself (browser only).
 */
export function useUnsavedChangesWarning(dirty: boolean, enabled = true): void {
  useEffect(() => {
    if (!enabled || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, enabled]);
}
