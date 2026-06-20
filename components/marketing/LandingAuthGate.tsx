"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { logAuthFlowDecision } from "@/lib/auth/authFlowDiagnostics";
import { hasActiveOnboardingHandoffClient } from "@/lib/auth/onboardingHandoff";
import {
  buildLoginHrefAfterOAuth,
  oauthNextPathForPreAuthIntent,
} from "@/lib/auth/preAuthOnboardingIntent";
import { readPendingOnboardingIntentClient } from "@/lib/auth/pendingOnboardingIntent";
import {
  hasPendingTeacherIntentClient,
  resolveLoginHrefWithPendingTeacherIntent,
} from "@/lib/auth/pendingTeacherIntent";
import { AuthHandoffScreen } from "@/components/marketing/AuthHandoffScreen";

function subscribeToHandoff() {
  return () => {};
}

function getHandoffSnapshot() {
  return hasActiveOnboardingHandoffClient();
}

function getServerHandoffSnapshot() {
  return false;
}

/**
 * Public landing shell. Authenticated users may browse `/` freely unless a
 * pending onboarding intent still needs the public login handoff.
 */
export function LandingAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, profileHydrated } = useAuth();
  const handoffActive = useSyncExternalStore(subscribeToHandoff, getHandoffSnapshot, getServerHandoffSnapshot);
  const pendingIntentWhileHydrating =
    Boolean(user) && !profileHydrated && !authLoading && Boolean(readPendingOnboardingIntentClient());

  useEffect(() => {
    if (!handoffActive || authLoading) return;

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
  }, [user, authLoading, handoffActive]);

  if (handoffActive || pendingIntentWhileHydrating) {
    return <AuthHandoffScreen />;
  }

  return <>{children}</>;
}
