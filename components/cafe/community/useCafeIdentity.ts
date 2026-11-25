"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { CafeIdentity } from "@/lib/cafe/communityClient";

/** Local auth events take precedence over an older, pending getSession result. */
export function useCafeIdentity(): { identity: CafeIdentity | null | undefined; authError: boolean } {
  const [identity, setIdentity] = useState<CafeIdentity | null | undefined>(undefined);
  const [authError, setAuthError] = useState(false);
  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe: (() => void) | undefined;
    try {
      const client = getSupabaseClient();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        revision += 1;
        if (!active) return;
        setAuthError(false);
        setIdentity(session?.user?.id && session.access_token
          ? { userId: session.user.id, accessToken: session.access_token } : null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const initialRevision = revision;
      void client.auth.getSession().then(({ data: result, error }) => {
        if (!active || revision !== initialRevision) return;
        if (error) { setAuthError(true); setIdentity(null); return; }
        const session = result.session;
        setIdentity(session?.user?.id && session.access_token
          ? { userId: session.user.id, accessToken: session.access_token } : null);
      }).catch(() => {
        if (active && revision === initialRevision) { setAuthError(true); setIdentity(null); }
      });
    } catch {
      // Setup failure follows the same asynchronous, unmount-safe path as session rejection.
      queueMicrotask(() => { if (active) { setAuthError(true); setIdentity(null); } });
    }
    return () => { active = false; unsubscribe?.(); };
  }, []);
  return { identity, authError };
}
