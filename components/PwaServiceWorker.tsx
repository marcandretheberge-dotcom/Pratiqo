"use client";

import { useEffect } from "react";
import { isPratiqoNativeApp } from "@/lib/mobile/nativeBridge";

export function PwaServiceWorker() {
  useEffect(() => {
    if (isPratiqoNativeApp()) return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration is best-effort; the app must remain usable without offline support.
    });
  }, []);

  return null;
}
