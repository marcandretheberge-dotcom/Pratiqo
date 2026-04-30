"use client";

import { useEffect } from "react";

/**
 * Silently removes `session_id` from the address bar after a successful
 * payment verification so the URL looks clean in the user's browser history.
 */
export function SuccessCleaner() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("session_id")) {
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  }, []);

  return null;
}
