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
import {
  clearPendingOnboardingIntentCookie,
  setPendingOnboardingIntentCookie,
} from "../../lib/auth/pendingOnboardingIntent";
import {
  clearPendingTeacherOnboardingCookie,
  setPendingTeacherOnboardingCookie,
} from "../../lib/auth/pendingTeacherIntent";
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
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleGoogleLogin = async (options?: { forceAccountSelection?: boolean }) => {
    if (!legalAccepted || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await loginWithGoogle(oauthNext, {
        intent: loginIntent,
        intentQuery: intentParam === "student" ? "student" : loginIntent,
        referralCode: refCode,
        forceAccountSelection: options?.forceAccountSelection === true,
      });
    } catch (e) {
      console.error("[login] Google auth failed", e);
      setFormError(t("loginGenericAuthError"));
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
      console.error("[login] sign out failed", e);
      alert("Deconnexion impossible. Reessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB]">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#D3D1C7] bg-white px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <PratiqoLogo variant="full" size="md" />
        </Link>
        <LocaleSwitcher variant="light" />
      </header>

      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-[var(--p-border-light)] bg-white p-6 shadow-[0_24px_80px_rgba(15,110,86,0.08)] sm:p-10">
          <div className="mb-6 flex justify-center sm:mb-7">
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
              <div className="mb-5 text-center">
                <h1 className="text-2xl font-black text-[var(--p-text)] sm:text-[1.65rem]">
                  {t("loginAccountTitle")}
                </h1>
              </div>

              {preAuthIntent === "learner" ? (
                <div className="mb-5 rounded-2xl border border-teal-600/20 bg-teal-500/10 px-4 py-4 text-center">
                  <p className="text-sm font-bold text-teal-800">{t("loginIntentLearnerTitle")}</p>
                  <p className="mt-2 text-sm leading-relaxed text-teal-900/80">{t("loginIntentContinueHint")}</p>
                </div>
              ) : null}

              {preAuthIntent === "teacher" ? (
                <div className="mb-5 rounded-2xl border border-teal-600/20 bg-teal-500/10 px-4 py-4 text-center">
                  <p className="text-sm font-bold text-teal-800">{t("loginIntentTeacherTitle")}</p>
                  <p className="mt-2 text-sm leading-relaxed text-teal-900/80">{t("loginIntentContinueHint")}</p>
                </div>
              ) : null}

              {formError ? (
                <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-700">
                  {formError}
                </p>
              ) : null}

              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(e) => setLegalAccepted(e.target.checked)}
                  data-testid="login-legal-accept"
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
                <Link
                  href="/legal/confidentialite"
                  className="font-semibold text-teal-700 underline underline-offset-2"
                >
                  {t("loginPrivacyPolicy")}
                </Link>
                .
              </p>

              <button
                type="button"
                disabled={!legalAccepted || busy}
                onClick={() => void handleGoogleLogin()}
                data-testid="login-google-button"
                className={cn(
                  "flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white transition-all",
                  "bg-teal-600 hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
                )}
              >
                <LogIn size={18} aria-hidden />
                {busy ? t("loginWorking") : t("loginContinueWithGoogle")}
              </button>

              <div className="mt-4 text-center" data-testid="login-change-google">
                <p className="text-xs font-medium text-[var(--p-text-muted)]">
                  {t("loginWrongGoogleAccountPrompt")}
                </p>
                <button
                  type="button"
                  disabled={!legalAccepted || busy}
                  onClick={() => void handleGoogleLogin({ forceAccountSelection: true })}
                  data-testid="login-change-google-button"
                  className="mt-1 text-sm font-bold text-teal-700 underline underline-offset-4 transition hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {t("loginChangeGoogleAccount")}
                </button>
              </div>

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
          Chargement...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
