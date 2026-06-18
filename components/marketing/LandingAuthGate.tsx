"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { logAuthFlowDecision } from "@/lib/auth/authFlowDiagnostics";
import {
  buildLoginHrefAfterOAuth,
  oauthNextPathForPreAuthIntent,
} from "@/lib/auth/preAuthOnboardingIntent";
import {
  hasPendingTeacherIntentClient,
  resolveLoginHrefWithPendingTeacherIntent,
} from "@/lib/auth/pendingTeacherIntent";
import { readPendingOnboardingIntentClient } from "@/lib/auth/pendingOnboardingIntent";

/**
 * Public landing shell. Authenticated users may browse `/` freely unless a
 * pending onboarding intent still needs the public login handoff.
 */
export function LandingAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const pendingIntent = readPendingOnboardingIntentClient();
      if (pendingIntent) {
        const handoff = buildLoginHrefAfterOAuth(pendingIntent, oauthNextPathForPreAuthIntent(pendingIntent));
        logAuthFlowDecision("landing-gate", {
          path: "/",
          sessionPresent: true,
          pendingIntentCookie: pendingIntent,
          redirect: handoff,
        });
        window.location.assign(handoff);
      }
      return;
    }

    if (hasPendingTeacherIntentClient()) {
      const handoff = resolveLoginHrefWithPendingTeacherIntent();
      logAuthFlowDecision("landing-gate", {
        path: "/",
        sessionPresent: false,
        pendingIntentCookie: "teacher-legacy",
        redirect: handoff,
      });
      window.location.assign(handoff);
    }
  }, [user, authLoading]);

  return <>{children}</>;
}
