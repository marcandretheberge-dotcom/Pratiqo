"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  isPratiqoNativeApp,
  postPratiqoNativeMessage,
} from "@/lib/mobile/nativeBridge";

type NativeSessionDetail = {
  accessToken?: string;
  refreshToken?: string;
  intent?: "learner" | "teacher" | null;
};

export function MobileNativeBridge() {
  useEffect(() => {
    if (!isPratiqoNativeApp()) return;

    document.documentElement.dataset.pratiqoNativeApp = "true";

    const handleSession = async (event: Event) => {
      const detail = (event as CustomEvent<NativeSessionDetail>).detail;
      const accessToken = detail?.accessToken?.trim();
      const refreshToken = detail?.refreshToken?.trim();
      if (!accessToken || !refreshToken) return;

      try {
        const supabase = getSupabaseClient();
        const {
          data: { session: existing },
        } = await supabase.auth.getSession();

        if (existing?.access_token === accessToken) return;

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error || !data.session) throw error ?? new Error("Session was not created");

        const ensure = await fetch("/api/auth/profile/ensure", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ intent: detail.intent ?? null }),
        });
        if (!ensure.ok) throw new Error(`Profile ensure failed: ${ensure.status}`);

        window.location.reload();
      } catch (error) {
        console.error("[mobile-bridge] failed to install native session", error);
        postPratiqoNativeMessage({
          type: "auth.web-session-error",
          message: "session_install_failed",
        });
      }
    };

    window.addEventListener("pratiqo:native-auth-session", handleSession);
    postPratiqoNativeMessage({ type: "bridge.ready", version: 1 });

    return () => {
      window.removeEventListener("pratiqo:native-auth-session", handleSession);
      delete document.documentElement.dataset.pratiqoNativeApp;
    };
  }, []);

  return null;
}
