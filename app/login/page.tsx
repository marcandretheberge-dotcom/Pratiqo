"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogIn, Mail } from "lucide-react";
import { cn } from "../../lib/utils";
import PratiqoLogo from "../../components/PratiqoLogo";
import { LocaleSwitcher } from "../../components/LocaleSwitcher";
import {
  ensureAuthenticatedProfile,
  loginWithGoogle,
  sendPasswordResetEmail,
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from "../../lib/auth";
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
import { AuthHandoffScreen } from "../../components/marketing/AuthHandoffScreen";
import { logAuthFlowDecision } from "../../lib/auth/authFlowDiagnostics";
import {
  readPendingOnboardingIntentClient,
} from "../../lib/auth/pendingOnboardingIntent";

type HandoffProfile = {
  role?: string | null;
  teacher_onboarding_complete?: boolean | null;
  companion_chosen?: boolean | null;
  dashboard?: unknown;
};

async function fetchProfileForHandoff(
  userId: string,
  maxAttempts = 8,
): Promise<HandoffProfile | null> {
  const supabase = getSupabaseClient();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role, teacher_onboarding_complete, companion_chosen, dashboard")
      .eq("id", userId)
      .maybeSingle();
    if (profileRow) return profileRow as HandoffProfile;
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
  }
  return null;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const intentParam = searchParams.get("intent");
  const roleParam = searchParams.get("role");
  const nextParam = searchParams.get("next");
  const refCode = searchParams.get("ref") ?? undefined;
  const authError = searchParams.get("auth_error");
  const preAuthIntent = resolvePreAuthIntent(intentParam, roleParam, nextParam);
  const oauthNext = resolveLoginOAuthNextPath(roleParam, nextParam, preAuthIntent);

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

  // Scrolling away from a focused email/password field while the browser's
  // native autofill/password-suggestion popup is open can leave that popup
  // visually stuck at a stale position (a browser-chrome artifact, not part
  // of this page's DOM). Blurring on scroll dismisses it before that happens.
  useEffect(() => {
    function blurFieldOnScroll() {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && (active.type === "email" || active.type === "password")) {
        active.blur();
      }
    }
    window.addEventListener("scroll", blurFieldOnScroll, { passive: true });
    return () => window.removeEventListener("scroll", blurFieldOnScroll);
  }, []);

  const { t } = useLocale();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const redirectAfterEnsuredProfile = (profile: HandoffProfile | null | undefined) => {
    const currentRole: ProfileRole =
      profile?.role === "admin" || profile?.role === "teacher" ? profile.role : "student";
    const effectiveRole: ProfileRole = preAuthIntent
      ? primaryRoleForPreAuthIntent(preAuthIntent, profile?.role)
      : currentRole;
    const redirectPath = resolvePostAuthRedirect(
      effectiveRole,
      {
        teacher_onboarding_complete: profile?.teacher_onboarding_complete,
        companion_chosen: profile?.companion_chosen,
        dashboard: mergeOnboardingRoleConfirmedDashboard(profile?.dashboard),
      },
      oauthNext,
      preAuthIntent ? { preAuthIntentConsumed: preAuthIntent } : undefined,
    );

    if (redirectPath === "/" || redirectPath === "") {
      logAuthFlowDecision("login-email-handoff", { error: "refusing-root-fallback" });
      setFormError(t("loginGenericAuthError"));
      return;
    }

    clearPendingOnboardingIntentCookie();
    clearPendingTeacherOnboardingCookie();
    window.location.assign(redirectPath);
  };

  if (user && preAuthIntent) {
    return <AuthHandoffScreen />;
  }

  const handleGoogleLogin = async (options?: { forceAccountSelection?: boolean }) => {
    if (!legalAccepted || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await loginWithGoogle(oauthNext, {
        intent: preAuthIntent ?? undefined,
        referralCode: refCode,
        forceAccountSelection: options?.forceAccountSelection,
      });
    } catch (e) {
      console.error(e);
      setFormError(t("loginGenericAuthError"));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!legalAccepted || busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    const displayName = normalizedEmail.split("@")[0] || null;

    setFormError(null);
    setFormMessage(null);

    if (!normalizedEmail || !password) {
      setFormError(t("loginEmailPasswordRequired"));
      return;
    }
    if (authMode === "signup" && password.length < 8) {
      setFormError(t("loginPasswordMinimum"));
      return;
    }

    setBusy(true);
    try {
      if (authMode === "login") {
        await signInWithEmailPassword(normalizedEmail, password);
        const ensured = await ensureAuthenticatedProfile({ intent: preAuthIntent, displayName }) as {
          profile?: HandoffProfile | null;
        };
        setFormMessage(t("loginSuccessRedirecting"));
        redirectAfterEnsuredProfile(ensured.profile);
      } else {
        const result = await signUpWithEmailPassword(normalizedEmail, password, {
          intent: preAuthIntent,
          redirectPath: oauthNext,
          referralCode: refCode,
          displayName,
        });
        if (result.session) {
          const ensured = await ensureAuthenticatedProfile({ intent: preAuthIntent, displayName }) as {
            profile?: HandoffProfile | null;
          };
          setFormMessage(t("loginSuccessRedirecting"));
          redirectAfterEnsuredProfile(ensured.profile);
        } else {
          setFormMessage(t("loginCheckEmailConfirm"));
        }
      }
    } catch (e) {
      console.error("[login] email/password auth failed", e);
      setFormError(t("loginGenericAuthError"));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    setFormError(null);
    setFormMessage(null);
    if (!normalizedEmail) {
      setFormError(t("loginEmailRequiredForReset"));
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(normalizedEmail);
      setFormMessage(t("loginPasswordResetSent"));
    } catch (e) {
      console.error("[login] password reset failed", e);
      setFormMessage(t("loginPasswordResetSent"));
    } finally {
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

          <div className="mb-5">
            <h1 className="text-center text-2xl font-black text-[var(--p-text)]">
              {authMode === "login" ? t("loginEmailTitle") : t("loginCreateAccountTitle")}
            </h1>
          </div>

          {formError ? (
            <p className="text-center text-sm font-semibold text-red-700 bg-red-500/10 rounded-2xl px-4 py-3 mb-4">
              {formError}
            </p>
          ) : null}

          {formMessage ? (
            <p className="text-center text-sm font-semibold text-teal-800 bg-teal-500/10 rounded-2xl px-4 py-3 mb-4">
              {formMessage}
            </p>
          ) : null}

          <form
            className="space-y-4"
            onSubmit={handleEmailAuth}
            data-testid="login-email-password-form"
          >
            <label className="block">
              <span className="text-sm font-bold text-[var(--p-text)]">{t("loginEmailLabel")}</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--p-text)] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                placeholder="nom@exemple.com"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[var(--p-text)]">{t("loginPasswordLabel")}</span>
              <input
                type="password"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                minLength={authMode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--p-text)] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                required
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--p-text-muted)]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  data-testid="login-remember-me"
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
                />
                {t("loginRememberMe")}
              </label>
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                data-testid="login-forgot-password"
                className="text-sm font-bold text-teal-700 underline underline-offset-4 transition hover:text-teal-900"
              >
                {t("loginForgotPassword")}
              </button>
            </div>

            <p className="text-xs text-[var(--p-text-muted)] leading-relaxed">
              {t("loginRememberMeNote")}
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                data-testid="login-legal-accept"
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm font-semibold text-[var(--p-text)] leading-snug">
                {t("loginAcceptTermsLabel")}
              </span>
            </label>

            <p className="text-xs text-[var(--p-text-muted)] text-center leading-relaxed">
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
              type="submit"
              disabled={!legalAccepted || busy}
              data-testid="login-email-submit"
              className={cn(
                "w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all",
                "bg-teal-600 hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
              )}
            >
              <Mail size={18} />
              {busy
                ? t("loginWorking")
                : authMode === "login"
                  ? t("loginEmailSubmit")
                  : t("loginCreateAccountSubmit")}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--p-text-muted)]">
            {authMode === "login" ? t("loginNoAccountPrompt") : t("loginAlreadyHaveAccountPrompt")}{" "}
            <button
              type="button"
              onClick={() => {
                setAuthMode((mode) => (mode === "login" ? "signup" : "login"));
                setFormError(null);
                setFormMessage(null);
              }}
              data-testid="login-auth-mode-switch"
              className="font-bold text-teal-700 underline underline-offset-4"
            >
              {authMode === "login" ? t("loginSwitchToSignup") : t("loginSwitchToLogin")}
            </button>
          </p>

          <div className="my-6 flex items-center gap-3" data-testid="login-or-divider">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--p-text-muted)]">
              {t("loginOrDivider")}
            </p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--p-text-muted)]">
            {t("loginOtherWays")}
          </p>

          <button
            type="button"
            disabled={!legalAccepted || busy}
            onClick={() => void handleGoogleLogin()}
            data-testid="login-google-button"
            className={cn(
              "w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all",
              "bg-teal-600 hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
            )}
          >
            <LogIn size={18} />
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
