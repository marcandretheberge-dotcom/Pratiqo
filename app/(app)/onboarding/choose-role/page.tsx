"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import {
  clearPendingTeacherOnboardingCookie,
  hasPendingTeacherIntentClient,
} from "@/lib/auth/pendingTeacherIntent";
import {
  hasTeacherRoleChoiceIntent,
  needsOnboardingRoleChoice,
  resolveProfileDashboardFromAuth,
} from "@/lib/auth/onboardingRoleChoice";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import PratiqoLogo from "@/components/PratiqoLogo";

function ChooseRoleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, profile } = useAuth();
  const { t } = useLocale();
  const [busy, setBusy] = useState<"student" | "teacher" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teacherIntent = useMemo(
    () =>
      hasTeacherRoleChoiceIntent(
        searchParams.get("role"),
        searchParams.get("next"),
        searchParams.get("intent") ?? (hasPendingTeacherIntentClient() ? "teacher" : null),
      ),
    [searchParams],
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const row = profile as {
      role?: string | null;
      companion_chosen?: boolean | null;
      teacher_onboarding_complete?: boolean | null;
      dashboard?: unknown;
    } | null;

    if (
      row &&
      !needsOnboardingRoleChoice({
        role: row.role,
        companion_chosen: row.companion_chosen,
        teacher_onboarding_complete: row.teacher_onboarding_complete,
        dashboard: resolveProfileDashboardFromAuth(row as Record<string, unknown>),
      })
    ) {
      const redirectPath = resolvePostAuthRedirect(
        row.role === "admin" || row.role === "teacher" || row.role === "student" ? row.role : "student",
        {
          teacher_onboarding_complete: row.teacher_onboarding_complete,
          companion_chosen: row.companion_chosen,
          dashboard: row.dashboard,
        },
      );
      router.replace(redirectPath);
    }
  }, [loading, user, profile, router]);

  const chooseRole = async (role: "student" | "teacher") => {
    if (busy) return;
    setBusy(role);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError(t("loginAuthErrorSession"));
        return;
      }

      const res = await fetch("/api/onboarding/select-role", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || t("loginAuthErrorSession"));
        return;
      }

      clearPendingTeacherOnboardingCookie();
      router.replace(
        resolvePostAuthRedirect(role, {
          teacher_onboarding_complete: false,
          companion_chosen: false,
          dashboard: { onboarding_role_confirmed: true },
        }),
      );
    } catch (e) {
      console.error(e);
      setError(t("loginAuthErrorSession"));
    } finally {
      setBusy(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-[var(--p-text-muted)]">
        <Loader2 className="h-9 w-9 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB]">
      <header className="bg-white border-b border-[var(--p-border-light)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <PratiqoLogo variant="icon" size="md" />
          </Link>
          <p className="text-sm font-bold text-[#2C2C2A]">{t("onboardingRoleChoiceTitle")}</p>
          <span className="w-8" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="rounded-3xl border border-[var(--p-border-light)] bg-white p-6 sm:p-10 shadow-[0_24px_80px_rgba(15,110,86,0.08)]">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
            {t("onboardingRoleChoiceEyebrow")}
          </p>
          <h1 className="mt-3 text-center text-2xl sm:text-3xl font-bold text-[var(--p-text)]">
            {t("onboardingRoleChoiceHeading")}
          </h1>

          {teacherIntent ? (
            <p className="mt-4 text-center text-sm font-semibold text-teal-800 bg-teal-500/10 rounded-2xl px-4 py-3">
              {t("onboardingRoleChoiceTeacherHint")}
            </p>
          ) : (
            <p className="mt-4 text-center text-sm text-[var(--p-text-muted)] leading-relaxed">
              {t("onboardingRoleChoiceSubtitle")}
            </p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void chooseRole("student")}
              className={cn(
                "rounded-2xl border px-5 py-6 text-left transition-all",
                "hover:border-teal-600 hover:bg-teal-50/60 disabled:opacity-60",
                teacherIntent ? "border-slate-200 bg-slate-50" : "border-teal-700 bg-teal-500/5 shadow-sm",
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
              <p className="mt-4 text-sm font-semibold text-teal-700">
                {busy === "student" ? t("loading") : t("onboardingRoleChoiceContinueLearner")}
              </p>
            </button>

            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void chooseRole("teacher")}
              className={cn(
                "rounded-2xl border px-5 py-6 text-left transition-all",
                "hover:border-teal-600 hover:bg-teal-50/60 disabled:opacity-60",
                teacherIntent
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
              <p className="mt-4 text-sm font-semibold text-teal-700">
                {busy === "teacher" ? t("loading") : t("onboardingRoleChoiceContinueTeacher")}
              </p>
            </button>
          </div>

          {error ? <p className="mt-6 text-center text-sm font-semibold text-red-700">{error}</p> : null}
        </div>
      </main>
    </div>
  );
}

export default function OnboardingChooseRolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-sm text-[var(--p-text-muted)]">
          Chargement…
        </div>
      }
    >
      <ChooseRoleInner />
    </Suspense>
  );
}
