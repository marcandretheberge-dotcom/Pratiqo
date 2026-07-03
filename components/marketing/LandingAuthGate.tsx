"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { resolvePostLoginDestination } from "@/lib/auth/authenticatedLoginDestination";
import { logAuthFlowDecision } from "@/lib/auth/authFlowDiagnostics";
import { hasActiveOnboardingHandoffClient } from "@/lib/auth/onboardingHandoff";
import {
  buildLoginHrefAfterOAuth,
  oauthNextPathForPreAuthIntent,
  type PreAuthOnboardingIntent,
} from "@/lib/auth/preAuthOnboardingIntent";
import {
  clearOAuthReturnPending,
  hasOAuthReturnPending,
  readOAuthReturnIntent,
  subscribeToOAuthReturn,
} from "@/lib/auth/oauthReturnHandoff";
import {
  clearPendingOnboardingIntentCookie,
  readPendingOnboardingIntentClient,
} from "@/lib/auth/pendingOnboardingIntent";
import {
  clearPendingTeacherOnboardingCookie,
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

function getOAuthReturnSnapshot() {
  return hasOAuthReturnPending();
}

function getServerOAuthReturnSnapshot() {
  return false;
}

function resolvePendingIntent(): PreAuthOnboardingIntent | null {
  return readPendingOnboardingIntentClient() ?? readOAuthReturnIntent();
}

function forwardOAuthCodeToCallback(): boolean {
  if (typeof window === "undefined") return false;
  const { pathname, search } = window.location;
  if (pathname.startsWith("/auth/callback")) return false;
  const params = new URLSearchParams(search);
  if (!params.has("code")) return false;
  logAuthFlowDecision("landing-gate", {
    stage: "client-oauth-code-forward",
    path: pathname,
    hasCode: true,
    intent: params.get("intent") ?? "none",
    next: params.get("next") ?? "none",
    redirect: `/auth/callback?${params.toString()}`,
  });
  window.location.replace(`/auth/callback?${params.toString()}`);
  return true;
}

function assignRecoveryDestination(
  destination: string,
  fields: Record<string, string | boolean | null | undefined>,
): void {
  if (destination === "/" || destination === "") return;
  logAuthFlowDecision("landing-gate", {
    path: "/",
    sessionPresent: true,
    ...fields,
    redirect: destination,
  });
  clearPendingOnboardingIntentCookie();
  clearPendingTeacherOnboardingCookie();
  clearOAuthReturnPending();
  window.location.assign(destination);
}

/**
 * Public landing shell. Authenticated users may browse `/` freely unless a
 * pending onboarding intent or OAuth return marker still needs recovery.
 */
export function LandingAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, profile, profileHydrated } = useAuth();
  const handoffActive = useSyncExternalStore(subscribeToHandoff, getHandoffSnapshot, getServerHandoffSnapshot);
  const oauthReturnPending = useSyncExternalStore(
    subscribeToOAuthReturn,
    getOAuthReturnSnapshot,
    getServerOAuthReturnSnapshot,
  );
  const recoveryActive = handoffActive || oauthReturnPending;

  useEffect(() => {
    if (forwardOAuthCodeToCallback()) return;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (forwardOAuthCodeToCallback()) return;

    const pendingIntent = resolvePendingIntent();
    const shouldRecover = recoveryActive || Boolean(pendingIntent);

    if (!shouldRecover) return;

    if (user && profileHydrated) {
      const destination = resolvePostLoginDestination({
        profile,
        preAuthIntent: pendingIntent,
        oauthNextPath: pendingIntent ? oauthNextPathForPreAuthIntent(pendingIntent) : null,
      });
      assignRecoveryDestination(destination, {
        stage: "profile-recovery",
        pendingIntentCookie: pendingIntent ?? "none",
        profileRole: String(profile?.role ?? "null"),
        profileExists: Boolean(profile?.role),
        finalDestination: destination,
      });
      return;
    }

    if (user) {
      if (pendingIntent) {
        const handoff = buildLoginHrefAfterOAuth(pendingIntent, oauthNextPathForPreAuthIntent(pendingIntent));
        logAuthFlowDecision("landing-gate", {
          stage: "login-handoff",
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
        stage: "teacher-legacy-handoff",
        path: "/",
        sessionPresent: false,
        pendingIntentCookie: "teacher-legacy",
        redirect: handoff,
      });
      window.location.assign(handoff);
      return;
    }

    if (oauthReturnPending) {
      clearOAuthReturnPending();
    }
  }, [user, authLoading, profileHydrated, profile, recoveryActive, oauthReturnPending]);

  if (recoveryActive) {
    return <AuthHandoffScreen />;
  }

  return <>{children}</>;
}
