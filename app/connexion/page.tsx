"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Sparkles } from "lucide-react";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import {
  buildLoginHrefWithPreAuthIntent,
  parsePublicPreAuthIntent,
  type PreAuthOnboardingIntent,
} from "@/lib/auth/preAuthOnboardingIntent";
import {
  needsOnboardingRoleChoice,
  resolveProfileDashboardFromAuth,
} from "@/lib/auth/onboardingRoleChoice";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";

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
  const { user, loading: authLoading, profile } = useAuth();

  const highlightIntent = useMemo(() => {
    return parsePublicPreAuthIntent(searchParams.get("intent"), searchParams.get("role"));
  }, [searchParams]);

  const safeNext = useMemo(() => sanitizeRelativeRedirectPath(searchParams.get("next")), [searchParams]);
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (authLoading || !user || !profile?.role) return;
    const row = profile as {
      role?: string | null;
      companion_chosen?: boolean | null;
      teacher_onboarding_complete?: boolean | null;
    };
    if (
      !needsOnboardingRoleChoice({
        role: row.role,
        companion_chosen: row.companion_chosen,
        teacher_onboarding_complete: row.teacher_onboarding_complete,
        dashboard: resolveProfileDashboardFromAuth(profile as Record<string, unknown>),
      })
    ) {
      const role =
        row.role === "admin" || row.role === "teacher" || row.role === "student" ? row.role : "student";
      router.replace(
        resolvePostAuthRedirect(role, {
          teacher_onboarding_complete: row.teacher_onboarding_complete,
          companion_chosen: row.companion_chosen,
          dashboard: resolveProfileDashboardFromAuth(profile as Record<string, unknown>),
        }, safeNext),
      );
    }
  }, [authLoading, user, profile, router, safeNext]);

  useEffect(() => {
    if (!highlightIntent) return;
    router.replace(buildLoginHrefFromConnexion(highlightIntent, safeNext, ref));
  }, [highlightIntent, safeNext, ref, router]);

  const continueWithIntent = (intent: PreAuthOnboardingIntent) => {
    router.replace(buildLoginHrefFromConnexion(intent, safeNext, ref));
  };

  if (highlightIntent || (user && profile?.role)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-[var(--p-text-muted)]">
        Redirection…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB]">
      <header className="sticky top-0 z-50 bg-white border-b border-[#D3D1C7] h-14 flex items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <PratiqoLogo variant="full" size="md" />
        </Link>
        <LocaleSwitcher variant="light" />
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="rounded-3xl border border-[var(--p-border-light)] bg-white p-6 sm:p-10 shadow-[0_24px_80px_rgba(15,110,86,0.08)]">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
            {t("onboardingRoleChoiceEyebrow")}
          </p>
          <h1 className="mt-3 text-center text-2xl sm:text-3xl font-bold text-[var(--p-text)]">
            {t("onboardingRoleChoiceHeading")}
          </h1>
          <p className="mt-4 text-center text-sm text-[var(--p-text-muted)] leading-relaxed">
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
              ← Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-[var(--p-text-muted)]">
          Chargement…
        </div>
      }
    >
      <ConnexionInner />
    </Suspense>
  );
}
