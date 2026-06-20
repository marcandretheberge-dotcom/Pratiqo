"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import PratiqoLogo from "../../components/PratiqoLogo";
import { LocaleSwitcher } from "../../components/LocaleSwitcher";
import { useAuth } from "../../components/AuthProvider";
import { loginWithGoogle, logout } from "../../lib/auth";
import { resolveAuthenticatedLoginDestination } from "../../lib/auth/authenticatedLoginDestination";
import { clearPendingOnboardingIntentCookie, setPendingOnboardingIntentCookie } from "../../lib/auth/pendingOnboardingIntent";
import { clearPendingTeacherOnboardingCookie, setPendingTeacherOnboardingCookie } from "../../lib/auth/pendingTeacherIntent";
import {
  CONNEXION_PATH,
  resolveLoginOAuthNextPath,
  resolvePreAuthIntent,
  type PreAuthOnboardingIntent,
} from "../../lib/auth/preAuthOnboardingIntent";
import { useLocale } from "../../lib/locale-context";
import { cn } from "../../lib/utils";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading, profile, profileHydrated } = useAuth();
  const { t } = useLocale();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const intentParam = searchParams.get("intent");
  const roleParam = searchParams.get("role");
  const nextParam = searchParams.get("next");
  const refCode = searchParams.get("ref") ?? undefined;
  const authError = searchParams.get("auth_error");
  const preAuthIntent = resolvePreAuthIntent(intentParam, roleParam, nextParam);
  const loginIntent: PreAuthOnboardingIntent = preAuthIntent ?? "learner";
  const oauthNext = resolveLoginOAuthNextPath(roleParam, nextParam, loginIntent);
  const authenticatedDestination = resolveAuthenticatedLoginDestination(profile, nextParam);

  useEffect(() => {
    if (loading || user || !preAuthIntent) return;
    setPendingOnboardingIntentCookie(preAuthIntent);
    if (preAuthIntent === "teacher") {
      setPendingTeacherOnboardingCookie(oauthNext);
    }
  }, [loading, user, preAuthIntent, oauthNext]);

  const handleLogin = async () => {
    if (!legalAccepted || busy) return;
    setBusy(true);
    try {
      await loginWithGoogle(oauthNext, {
        intent: loginIntent,
        intentQuery: intentParam === "student" ? "student" : loginIntent,
        referralCode: refCode,
        forceAccountSelection: true,
      });
    } catch (e) {
      console.error(e);
      alert("Connexion impossible. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = () => {
    clearPendingOnboardingIntentCookie();
    clearPendingTeacherOnboardingCookie();
    router.replace(authenticatedDestination);
  };

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      clearPendingOnboardingIntentCookie();
      clearPendingTeacherOnboardingCookie();
      await logout();
      router.replace("/");
    } catch (e) {
      console.error(e);
      alert("Déconnexion impossible. Réessaie dans un instant.");
      setBusy(false);
    }
  };

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
          <div className="mb-8 flex justify-center">
            <PratiqoLogo variant="full" size="md" />
          </div>

          {authError ? (
            <p className="mb-6 rounded-2xl bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-700">
              {t("loginAuthErrorSession")}
            </p>
          ) : null}

          {loading || (user && !profileHydrated) ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-[var(--p-text-muted)]">
              {t("loadingAccount")}
            </div>
          ) : user ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[var(--p-text)]">{t("loginAlreadyConnectedTitle")}</h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--p-text-muted)]">
                {t("loginAlreadyConnectedBody")}
              </p>

              <div className="mt-7 grid gap-3">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="h-12 rounded-2xl bg-teal-700 px-4 text-sm font-bold text-white transition hover:brightness-[0.98]"
                >
                  {t("loginContinueDashboard")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={busy}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {busy ? t("loginWorking") : t("loginSignOut")}
                </button>
              </div>

              <p className="mt-5 text-sm text-[var(--p-text-muted)]">
                <Link href="/" className="font-semibold text-teal-700 hover:underline">
                  ← {t("loginReturnHome")}
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="mb-6 text-center text-2xl font-bold text-[var(--p-text)]">
                {t("loginAccountTitle")}
              </h1>

              {preAuthIntent === "learner" ? (
                <div className="mb-6 rounded-2xl border border-teal-600/20 bg-teal-500/10 px-4 py-4 text-center">
                  <p className="text-sm font-bold text-teal-800">{t("loginIntentLearnerTitle")}</p>
                  <p className="mt-2 text-sm leading-relaxed text-teal-900/80">{t("loginIntentContinueHint")}</p>
                </div>
              ) : null}

              {preAuthIntent === "teacher" ? (
                <div className="mb-6 rounded-2xl border border-teal-600/20 bg-teal-500/10 px-4 py-4 text-center">
                  <p className="text-sm font-bold text-teal-800">{t("loginIntentTeacherTitle")}</p>
                  <p className="mt-2 text-sm leading-relaxed text-teal-900/80">{t("loginIntentContinueHint")}</p>
                </div>
              ) : null}

              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(e) => setLegalAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm font-semibold leading-snug text-[var(--p-text)]">
                  {t("loginAcceptTermsLabel")}
                </span>
              </label>

              <p className="mb-6 text-center text-xs leading-relaxed text-[var(--p-text-muted)]">
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
                  "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white transition-all",
                  "bg-teal-600 hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
                )}
              >
                <LogIn size={18} />
                {busy ? t("loginWorking") : t("loginContinueWithGoogle")}
              </button>

              {preAuthIntent ? (
                <p className="mt-6 text-center text-sm text-[var(--p-text-muted)]">
                  <Link href={CONNEXION_PATH} className="font-semibold text-teal-700 hover:underline">
                    ← {t("loginChangePath")}
                  </Link>
                  <span className="mt-1 block text-xs">{t("loginChangePathHelper")}</span>
                </p>
              ) : null}

              <p className="mt-4 text-center text-sm text-[var(--p-text-muted)]">
                <Link href="/" className="font-semibold text-teal-700 hover:underline">
                  ← {t("loginReturnHome")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--p-text-muted)]">
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
