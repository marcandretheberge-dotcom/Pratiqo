"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { cn } from "../../lib/utils";
import PratiqoLogo from "../../components/PratiqoLogo";
import { LocaleSwitcher } from "../../components/LocaleSwitcher";
import { loginWithGoogle } from "../../lib/auth";
import { resolvePostAuthRedirect, type ProfileRole } from "../../lib/auth/postAuthRedirect";
import { mergeOnboardingRoleConfirmedDashboard } from "../../lib/auth/onboardingRoleChoice";
import {
  primaryRoleForPreAuthIntent,
  resolveLoginOAuthNextPath,
  resolvePreAuthIntent,
  CONNEXION_PATH,
} from "../../lib/auth/preAuthOnboardingIntent";
import {
  clearPendingOnboardingIntentCookie,
  setPendingOnboardingIntentCookie,
} from "../../lib/auth/pendingOnboardingIntent";
import {
  clearPendingTeacherOnboardingCookie,
  setPendingTeacherOnboardingCookie,
} from "../../lib/auth/pendingTeacherIntent";
import { useAuth } from "../../components/AuthProvider";
import { useLocale } from "../../lib/locale-context";
import { getSupabaseClient } from "../../lib/supabase";
import { sanitizeRelativeRedirectPath } from "../../lib/auth/redirects";
import { AuthHandoffScreen } from "../../components/marketing/AuthHandoffScreen";
import { logAuthFlowDecision } from "../../lib/auth/authFlowDiagnostics";
import {
  readPendingOnboardingIntentClient,
} from "../../lib/auth/pendingOnboardingIntent";

async function fetchProfileForHandoff(
  userId: string,
  maxAttempts = 8,
): Promise<{
  role?: string | null;
  teacher_onboarding_complete?: boolean | null;
  companion_chosen?: boolean | null;
  dashboard?: unknown;
} | null> {
  const supabase = getSupabaseClient();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role, teacher_onboarding_complete, companion_chosen, dashboard")
      .eq("id", userId)
      .maybeSingle();
    if (profileRow) return profileRow as {
      role?: string | null;
      teacher_onboarding_complete?: boolean | null;
      companion_chosen?: boolean | null;
      dashboard?: unknown;
    };
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
  }
  return null;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const intentParam = searchParams.get("intent");
  const roleParam = searchParams.get("role");
  const nextParam = searchParams.get("next");
  const refCode = searchParams.get("ref") ?? undefined;
  const authError = searchParams.get("auth_error");
  const preAuthIntent = resolvePreAuthIntent(intentParam, roleParam, nextParam);
  const oauthNext = resolveLoginOAuthNextPath(roleParam, nextParam, preAuthIntent);

  useEffect(() => {
    if (loading || user) return;
    if (!preAuthIntent) {
      const params = new URLSearchParams();
      const safeNext = sanitizeRelativeRedirectPath(nextParam);
      if (safeNext) params.set("next", safeNext);
      if (refCode) params.set("ref", refCode);
      const qs = params.toString();
      router.replace(qs ? `${CONNEXION_PATH}?${qs}` : CONNEXION_PATH);
    }
  }, [loading, user, preAuthIntent, nextParam, refCode, router]);

  useEffect(() => {
    if (!preAuthIntent) return;
    setPendingOnboardingIntentCookie(preAuthIntent);
    if (preAuthIntent === "teacher") {
      setPendingTeacherOnboardingCookie(oauthNext);
    }
  }, [preAuthIntent, oauthNext]);

  useEffect(() => {
    if (loading || !user || !preAuthIntent) return;

    let cancelled = false;
    void (async () => {
      const pendingCookie = readPendingOnboardingIntentClient();
      logAuthFlowDecision("login-handoff", {
        path: "/login",
        sessionPresent: true,
        userIdPresent: Boolean(user.id),
        incomingIntent: preAuthIntent,
        pendingIntentCookie: pendingCookie ?? "none",
        safeNext: oauthNext,
      });

      const profile = await fetchProfileForHandoff(user.id);

      if (cancelled) return;

      const effectiveRole: ProfileRole = primaryRoleForPreAuthIntent(preAuthIntent, profile?.role);

      const redirectPath = resolvePostAuthRedirect(
        effectiveRole,
        {
          teacher_onboarding_complete: profile?.teacher_onboarding_complete,
          companion_chosen: profile?.companion_chosen,
          dashboard: mergeOnboardingRoleConfirmedDashboard(profile?.dashboard),
        },
        oauthNext,
        { preAuthIntentConsumed: preAuthIntent },
      );

      logAuthFlowDecision("login-handoff", {
        profileRowPresent: Boolean(profile),
        profileRole: profile?.role ?? "null",
        effectiveRole,
        redirect: redirectPath,
      });

      if (redirectPath === "/" || redirectPath === "") {
        logAuthFlowDecision("login-handoff", { error: "refusing-root-fallback" });
        return;
      }

      clearPendingOnboardingIntentCookie();
      clearPendingTeacherOnboardingCookie();
      window.location.assign(redirectPath);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, oauthNext, preAuthIntent]);

  const { t } = useLocale();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user && preAuthIntent) {
    return <AuthHandoffScreen />;
  }

  const handleLogin = async (options?: { forceAccountSelection?: boolean }) => {
    if (!legalAccepted || busy || !preAuthIntent) return;
    setBusy(true);
    try {
      await loginWithGoogle(oauthNext, {
        intent: preAuthIntent,
        referralCode: refCode,
        forceAccountSelection: options?.forceAccountSelection,
      });
    } catch (e) {
      console.error(e);
      alert("Connexion impossible. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  if (!preAuthIntent && !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-[var(--p-text-muted)]">
        Redirection…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB]">
      <header
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          background: "white",
          zIndex: 50,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          borderBottom: "0.5px solid #D3D1C7",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <PratiqoLogo variant="full" size="md" />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LocaleSwitcher />
        </div>
      </header>

      <div className="flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-[var(--p-border-light)] bg-white p-8 sm:p-10 shadow-[0_24px_80px_rgba(15,110,86,0.08)]">
          <div className="flex justify-center mb-8">
            <PratiqoLogo variant="full" size="md" />
          </div>

          {authError ? (
            <p className="text-center text-sm font-semibold text-red-700 bg-red-500/10 rounded-2xl px-4 py-3 mb-6">
              {t("loginAuthErrorSession")}
            </p>
          ) : null}

          {preAuthIntent === "learner" ? (
            <div className="mb-6 rounded-2xl border border-teal-600/20 bg-teal-500/10 px-4 py-4 text-center">
              <p className="text-sm font-bold text-teal-800">{t("loginIntentLearnerTitle")}</p>
              <p className="mt-2 text-sm text-teal-900/80 leading-relaxed">{t("loginIntentContinueHint")}</p>
            </div>
          ) : null}

          {preAuthIntent === "teacher" ? (
            <div className="mb-6 rounded-2xl border border-teal-600/20 bg-teal-500/10 px-4 py-4 text-center">
              <p className="text-sm font-bold text-teal-800">{t("loginIntentTeacherTitle")}</p>
              <p className="mt-2 text-sm text-teal-900/80 leading-relaxed">{t("loginIntentContinueHint")}</p>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={(e) => setLegalAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-sm font-semibold text-[var(--p-text)] leading-snug">
              {t("loginAcceptTermsLabel")}
            </span>
          </label>

          <p className="text-xs text-[var(--p-text-muted)] mb-6 text-center leading-relaxed">
            {t("loginContinueAccept")}{" "}
            <Link href="/legal/cgu" className="font-semibold text-teal-700 underline underline-offset-2">
              {t("footerTerms")}
            </Link>{" "}
            {t("loginConsentAnd")}{" "}
            <Link href="/legal/confidentialite" className="font-semibold text-teal-700 underline underline-offset-2">
              {t("loginPrivacyPolicy")}
            </Link>
            .
          </p>

          <button
            type="button"
            disabled={!legalAccepted || busy}
            onClick={() => void handleLogin()}
            className={cn(
              "w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all",
              "bg-teal-600 hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
            )}
          >
            <LogIn size={18} />
            {busy ? "Connexion…" : "Se connecter avec Google"}
          </button>

          <div className="mt-4 text-center">
            <p className="text-xs font-medium text-[var(--p-text-muted)]">
              {t("loginWrongGoogleAccountPrompt")}
            </p>
            <button
              type="button"
              disabled={!legalAccepted || busy}
              onClick={() => void handleLogin({ forceAccountSelection: true })}
              className="mt-1 text-sm font-bold text-teal-700 underline underline-offset-4 transition hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t("loginChangeGoogleAccount")}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--p-text-muted)]">
            <Link href={CONNEXION_PATH} className="font-semibold text-teal-700 hover:underline">
              ← Changer de parcours
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-[var(--p-text-muted)]">
            <Link href="/" className="font-semibold text-teal-700 hover:underline">
              ← Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-[var(--p-text-muted)]">Chargement…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
