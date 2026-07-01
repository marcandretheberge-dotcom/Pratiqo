"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Sparkles } from "lucide-react";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useAuth } from "@/components/AuthProvider";
import { logout } from "@/lib/auth";
import { resolveAuthenticatedLoginDestination } from "@/lib/auth/authenticatedLoginDestination";
import { clearPendingOnboardingIntentCookie } from "@/lib/auth/pendingOnboardingIntent";
import { clearPendingTeacherOnboardingCookie } from "@/lib/auth/pendingTeacherIntent";
import {
  buildLoginHrefWithPreAuthIntent,
  parsePublicPreAuthIntent,
  type PreAuthOnboardingIntent,
} from "@/lib/auth/preAuthOnboardingIntent";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

function buildLoginHrefFromConnexion(
  intent: PreAuthOnboardingIntent,
  safeNext: string | null,
  ref: string | null,
): string {
  let href = buildLoginHrefWithPreAuthIntent(intent);
  if (safeNext) href += `&next=${encodeURIComponent(safeNext)}`;
  if (ref) href += `&ref=${encodeURIComponent(ref)}`;
  return href;
}

function ConnexionInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const { user, loading: authLoading, profile, profileHydrated } = useAuth();
  const [busy, setBusy] = useState(false);

  const highlightIntent = useMemo(() => {
    return parsePublicPreAuthIntent(searchParams.get("intent"), searchParams.get("role"));
  }, [searchParams]);

  const safeNext = useMemo(() => sanitizeRelativeRedirectPath(searchParams.get("next")), [searchParams]);
  const ref = searchParams.get("ref");
  const authenticatedDestination = resolveAuthenticatedLoginDestination(profile, safeNext);

  useEffect(() => {
    if (!highlightIntent || user) return;
    router.replace(buildLoginHrefFromConnexion(highlightIntent, safeNext, ref));
  }, [highlightIntent, safeNext, ref, router, user]);

  const continueWithIntent = (intent: PreAuthOnboardingIntent) => {
    router.replace(buildLoginHrefFromConnexion(intent, safeNext, ref));
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

  if (authLoading || (user && !profileHydrated)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--p-text-muted)]">
        Chargement…
      </div>
    );
  }

  if (highlightIntent && !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--p-text-muted)]">
        Redirection…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB]">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#D3D1C7] bg-white px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <PratiqoLogo variant="full" size="md" />
        </Link>
        <LocaleSwitcher variant="light" />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-[var(--p-border-light)] bg-white p-6 shadow-[0_24px_80px_rgba(15,110,86,0.08)] sm:p-10">
          {user ? (
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
                {t("onboardingRoleChoiceEyebrow")}
              </p>
              <h1 className="mt-3 text-2xl font-bold text-[var(--p-text)] sm:text-3xl">
                {t("loginAlreadyConnectedTitle")}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[var(--p-text-muted)]">
                {t("loginAlreadyConnectedBody")}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
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

              <p className="mt-8 text-center text-sm text-[var(--p-text-muted)]">
                <Link href="/" className="font-semibold text-teal-700 hover:underline">
                  ← {t("loginReturnHome")}
                </Link>
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
                {t("onboardingRoleChoiceEyebrow")}
              </p>
              <h1 className="mt-3 text-center text-2xl font-bold text-[var(--p-text)] sm:text-3xl">
                {t("onboardingRoleChoiceHeading")}
              </h1>
              <p className="mt-4 text-center text-sm leading-relaxed text-[var(--p-text-muted)]">
                {t("onboardingRoleChoiceSubtitle")}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => continueWithIntent("learner")}
                  className={cn(
                    "rounded-2xl border px-5 py-6 text-left transition-all",
                    "hover:border-teal-600 hover:bg-teal-50/60",
                    highlightIntent === "teacher"
                      ? "border-slate-200 bg-slate-50"
                      : "border-teal-700 bg-teal-500/5 shadow-sm",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                      <Sparkles size={22} />
                    </span>
                    <div>
                      <p className="text-lg font-bold text-[var(--p-text)]">{t("onboardingRoleChoiceLearner")}</p>
                      <p className="mt-1 text-sm text-[var(--p-text-muted)]">{t("onboardingRoleChoiceLearnerHint")}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-teal-700">{t("onboardingRoleChoiceContinueLearner")}</p>
                </button>

                <button
                  type="button"
                  onClick={() => continueWithIntent("teacher")}
                  className={cn(
                    "rounded-2xl border px-5 py-6 text-left transition-all",
                    "hover:border-teal-600 hover:bg-teal-50/60",
                    highlightIntent === "teacher"
                      ? "border-teal-700 bg-teal-500/10 shadow-[0_18px_44px_rgba(29,158,117,0.18)] ring-2 ring-teal-600/20"
                      : "border-slate-200 bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-sm">
                      <GraduationCap size={22} />
                    </span>
                    <div>
                      <p className="text-lg font-bold text-[var(--p-text)]">{t("onboardingRoleChoiceTeacher")}</p>
                      <p className="mt-1 text-sm text-[var(--p-text-muted)]">{t("onboardingRoleChoiceTeacherCardHint")}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-teal-700">{t("onboardingRoleChoiceContinueTeacher")}</p>
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-[var(--p-text-muted)]">
                <Link href="/" className="font-semibold text-teal-700 hover:underline">
                  ← {t("loginReturnHome")}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--p-text-muted)]">
          Chargement…
        </div>
      }
    >
      <ConnexionInner />
    </Suspense>
  );
}
