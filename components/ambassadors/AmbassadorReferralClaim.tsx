"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";

export function AmbassadorReferralClaim() {
  const { user, profileHydrated } = useAuth();
  const attemptedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !profileHydrated || attemptedUserRef.current === user.id) return;

    attemptedUserRef.current = user.id;
    let cancelled = false;

    void (async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token || session.user.id !== user.id) {
          if (!cancelled) attemptedUserRef.current = null;
          return;
        }

        const response = await fetch("/api/ambassadors/referral/claim", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: "same-origin",
        });

        if (!response.ok && !cancelled) {
          attemptedUserRef.current = null;
        }
      } catch (error) {
        console.warn("[ambassador/referral] background claim failed", error);
        if (!cancelled) attemptedUserRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileHydrated, user]);

  return null;
}
