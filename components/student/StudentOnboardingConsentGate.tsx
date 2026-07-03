"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getClientAccessToken } from "@/lib/auth/clientAccessToken";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import type { CompanionType } from "@/lib/companions";
import { cn } from "@/lib/utils";

type ConsentActorChoice = "self_14_plus" | "parent_guardian" | "under_14";

type StudentOnboardingConsentGateProps = {
  companionType?: CompanionType | null;
  onBack?: () => void;
  onSuccess?: () => void;
  framed?: boolean;
};

export function StudentOnboardingConsentGate({
  companionType = null,
  onBack,
  onSuccess,
  framed = true,
}: StudentOnboardingConsentGateProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const { mergeAuthProfile, refreshProfile } = useAuth();
  const [actorType, setActorType] = useState<ConsentActorChoice | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedLearningData, setAcceptedLearningData] = useState(false);
  const [acknowledgedMinorLessons, setAcknowledgedMinorLessons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockedUnder14 = actorType === "under_14";
  const canSubmit = useMemo(
    () =>
      (actorType === "self_14_plus" || actorType === "parent_guardian") &&
      acceptedTerms &&
      acceptedPrivacy &&
      acceptedLearningData &&
      acknowledgedMinorLessons,
    [actorType, acceptedTerms, acceptedPrivacy, acceptedLearningData, acknowledgedMinorLessons],
  );

  const submit = async () => {
    if (!canSubmit || actorType === "under_14" || saving) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const accessToken = await getClientAccessToken(supabase);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/student/onboarding-consent", {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({
          actorType,
          acceptedTerms,
          acceptedPrivacy,
          acceptedLearningData,
          acknowledgedMinorLessons,
          locale,
          companionType,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { stage?: string; error?: string } | null;
        console.error("[student/consent-gate] save failed", {
          status: res.status,
          stage: payload?.stage ?? "unknown",
          error: payload?.error ?? "unknown",
        });
        setError(t("studentConsentSaveError"));
        return;
      }

      const payload = (await res.json().catch(() => null)) as {
        profile?: Record<string, unknown> | null;
      } | null;

      if (payload?.profile) {
        mergeAuthProfile(payload.profile);
      } else {
        void refreshProfile();
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.replace("/dashboard");
      }
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="w-full max-w-2xl rounded-3xl border border-teal-100 bg-white p-5 shadow-[0_24px_80px_rgba(15,110,86,0.12)] sm:p-7">
      <div className="space-y-3 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
          {t("studentConsentEyebrow")}
        </p>
        <h1 className="text-2xl font-black text-[#214238] sm:text-3xl">{t("studentConsentTitle")}</h1>
        <p className="mx-auto max-w-xl text-sm font-medium leading-relaxed text-[#5F6F68]">
          {t("studentConsentIntro")}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <fieldset>
          <legend className="text-sm font-black text-[#214238]">{t("studentConsentQuestion")}</legend>
          <div className="mt-3 grid gap-3">
            {[
              ["self_14_plus", t("studentConsentOptionSelf14Plus")],
              ["parent_guardian", t("studentConsentOptionParentGuardian")],
              ["under_14", t("studentConsentOptionUnder14")],
            ].map(([value, label]) => {
              const active = actorType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActorType(value as ConsentActorChoice)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left text-sm font-bold transition",
                    active
                      ? "border-teal-600 bg-teal-50 text-teal-900"
                      : "border-slate-200 bg-white text-[#2C2C2A] hover:border-teal-200 hover:bg-teal-50/50",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {blockedUnder14 ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-900">
            {t("studentConsentUnder14Blocked")}
          </p>
        ) : null}

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={acceptedTerms && acceptedPrivacy}
              onChange={(event) => {
                setAcceptedTerms(event.target.checked);
                setAcceptedPrivacy(event.target.checked);
              }}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-sm font-semibold leading-snug text-[#2C2C2A]">
              {t("studentConsentTermsPrivacy")}{" "}
              <Link href="/legal/cgu" className="text-teal-700 underline underline-offset-2">
                {t("footerTerms")}
              </Link>{" "}
              /{" "}
              <Link href="/legal/confidentialite" className="text-teal-700 underline underline-offset-2">
                {t("loginPrivacyPolicy")}
              </Link>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={acceptedLearningData}
              onChange={(event) => setAcceptedLearningData(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-sm font-semibold leading-snug text-[#2C2C2A]">
              {t("studentConsentLearningData")}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={acknowledgedMinorLessons}
              onChange={(event) => setAcknowledgedMinorLessons(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-sm font-semibold leading-snug text-[#2C2C2A]">
              {t("studentConsentMinorLessons")}
            </span>
          </label>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack ?? (() => router.replace("/student/choose-companion"))}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-[#31564B] transition hover:bg-slate-50"
          >
            {t("studentConsentBack")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit || saving}
            className="min-h-11 rounded-2xl bg-teal-700 px-5 text-sm font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? t("studentConsentSaving") : t("studentConsentConfirm")}
          </button>
        </div>
      </div>
    </div>
  );

  if (!framed) return content;

  return (
    <div className="flex min-h-[calc(100dvh-120px)] items-center justify-center px-4 py-10">
      {content}
    </div>
  );
}
