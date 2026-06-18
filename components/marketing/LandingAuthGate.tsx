"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  hasPendingTeacherIntentClient,
  resolveLoginHrefWithPendingTeacherIntent,
} from "@/lib/auth/pendingTeacherIntent";

/**
 * Public landing shell. Authenticated users may browse `/` freely; only
 * logged-out users with a stale pending-teacher cookie resume OAuth.
 */
export function LandingAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || user) return;
    if (hasPendingTeacherIntentClient()) {
      window.location.assign(resolveLoginHrefWithPendingTeacherIntent());
    }
  }, [user, authLoading]);

  return <>{children}</>;
}
