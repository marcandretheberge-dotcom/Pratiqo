"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AuthProfileSyncRetry } from "@/components/auth/AuthProfileSyncRetry";
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
  notifyOAuthReturnChanged,
} from "@/lib/auth/oauthReturnHandoff";
import { resolveOAuthRedirectOrigin } from "@/lib/auth/oauthCallback";
import {
  clearPendingOnboardingIntentCookie,
  readPendingOnboardingIntentClient,
} from "@/lib/auth/pendingOnboardingIntent";
import {
  clearPendingTeacherOnboardingCookie,
} from "@/lib/auth/pendingTeacherIntent";
import { AuthHandoffScreen } from "@/components/marketing/AuthHandoffScreen";

/** Max wait for OAuth/profile recovery before offering retry (ms). */
const HANDOFF_RECOVERY_TIMEOUT_MS = 12_000;

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

function clearStaleAuthHandoffState(): void {
  clearPendingOnboardingIntentCookie();
  clearPendingTeacherOnboardingCookie();
  clearOAuthReturnPending();
  notifyOAuthReturnChanged();
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
  const origin = resolveOAuthRedirectOrigin();
  window.location.replace(`${origin}/auth/callback?${params.toString()}`);
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
  clearStaleAuthHandoffState();
  window.location.assign(destination);
}

/**
 * Public landing shell. Authenticated users may browse `/` freely unless a
 * pending onboarding intent or OAuth return marker still needs recovery.
 */
export function LandingAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, profile, profileHydrated, profileSyncError, retryProfileSync } = useAuth();
  const [handoffTimedOut, setHandoffTimedOut] = useState(false);
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
    if (!recoveryActive || !user || profileHydrated || profileSyncError) {
      setHandoffTimedOut(false);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      clearStaleAuthHandoffState();
      setHandoffTimedOut(true);
      logAuthFlowDecision("landing-gate", {
        stage: "handoff-recovery-timeout",
        path: "/",
        sessionPresent: true,
        profileHydrated: false,
      });
    }, HANDOFF_RECOVERY_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [recoveryActive, user, profileHydrated, profileSyncError]);

  useEffect(() => {
    if (authLoading) return;
    if (forwardOAuthCodeToCallback()) return;

    if (!user) {
      if (recoveryActive || resolvePendingIntent()) {
        clearStaleAuthHandoffState();
      }
      return;
    }

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
    }
  }, [user, authLoading, profileHydrated, profile, recoveryActive, oauthReturnPending]);

  if (user && (profileSyncError || handoffTimedOut)) {
    return <AuthProfileSyncRetry onRetry={retryProfileSync} />;
  }

  if (recoveryActive && user) {
    return <AuthHandoffScreen />;
  }

  return <>{children}</>;
}
