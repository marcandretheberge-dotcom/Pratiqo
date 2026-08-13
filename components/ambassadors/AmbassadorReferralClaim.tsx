"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

export function AmbassadorReferralClaim() {
  const attemptedUserRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    const claimForSession = async (session: Session | null) => {
      const userId = session?.user.id ?? null;
      if (!session?.access_token || !userId || attemptedUserRef.current === userId) return;

      attemptedUserRef.current = userId;
      try {
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
    };

    void supabase.auth.getSession().then(({ data }) => claimForSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void claimForSession(session);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
