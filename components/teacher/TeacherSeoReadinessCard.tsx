"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, ExternalLink, Loader2, Search } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import type { TeacherSeoMissingReasonKey, TeacherSeoPublicationEvaluation } from "@/lib/seo/teacherSeoPublication";
import type { TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";

const MISSING_REASON_I18N: Record<TeacherSeoMissingReasonKey, TranslationKey> = {
  display_name: "teacherSeoMissingDisplayName",
  public_bio: "teacherSeoMissingPublicBio",
  main_subject: "teacherSeoMissingMainSubject",
  location_or_format: "teacherSeoMissingLocationOrFormat",
  teaching_format: "teacherSeoMissingTeachingFormat",
  onboarding_incomplete: "teacherSeoMissingOnboarding",
  admin_hidden: "teacherSeoMissingAdminHidden",
  identity_failed: "teacherSeoMissingIdentityFailed",
  unsupported_market: "teacherSeoMissingUnsupportedMarket",
  search_consent_missing: "teacherSeoMissingSearchConsent",
  public_profile_intent_missing: "teacherSeoMissingPublicIntent",
  slug_missing: "teacherSeoMissingSlug",
  not_admin_published: "teacherSeoMissingAdminPublish",
  payout_not_ready: "teacherSeoMissingPayoutNotReady",
};

type Props = {
  className?: string;
};

export function TeacherSeoReadinessCard({ className }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluation, setEvaluation] = useState<TeacherSeoPublicationEvaluation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"ok" | "error">("ok");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }

    const res = await fetch("/api/teacher/profile/seo-publication", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json().catch(() => ({}))) as {
      evaluation?: TeacherSeoPublicationEvaluation;
      error?: string;
    };
    if (res.ok && body.evaluation) {
      setEvaluation(body.evaluation);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runAction = async (action: "request" | "withdraw") => {
    setSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setMessage(t("sessionExpiredShort"));
      setMessageKind("error");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/teacher/profile/seo-publication", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      evaluation?: TeacherSeoPublicationEvaluation;
      missingReasonKeys?: TeacherSeoMissingReasonKey[];
    };

    if (!res.ok) {
      setMessage(body.error || t("anErrorOccurred"));
      setMessageKind("error");
      if (body.evaluation) setEvaluation(body.evaluation);
      setSaving(false);
      return;
    }

    if (body.evaluation) setEvaluation(body.evaluation);
    setMessage(
      action === "request" ? t("teacherSeoRequestPublicationSuccess") : t("teacherSeoWithdrawRequestSuccess"),
    );
    setMessageKind("ok");
    setSaving(false);
  };

  if (loading) {
    return (
      <section
        className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}
        data-testid="teacher-seo-readiness-card"
      >
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden />
      </section>
    );
  }

  if (!evaluation) return null;

  const checklistKeys = evaluation.missingReasonKeys.filter(
    (key) => key !== "not_admin_published" && key !== "search_consent_missing",
  );

  const statusTone = evaluation.isIndexable
    ? "border-teal-200 bg-teal-50/80 text-teal-950"
    : evaluation.teacherRequestedPublication
      ? "border-sky-200 bg-sky-50/80 text-sky-950"
      : evaluation.contentReady
        ? "border-amber-200 bg-amber-50/80 text-amber-950"
        : "border-slate-200 bg-slate-50/80 text-slate-900";

  return (
    <section
      className={cn("rounded-2xl border p-5 shadow-sm", statusTone, className)}
      data-testid="teacher-seo-readiness-card"
      aria-labelledby="teacher-seo-readiness-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p id="teacher-seo-readiness-title" className="text-xs font-bold uppercase tracking-widest opacity-80">
            <Search className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {t("teacherSeoReadinessTitle")}
          </p>
          <p className="text-sm leading-relaxed opacity-90">{t("teacherSeoReadinessIntro")}</p>
          <p className="text-xs leading-relaxed opacity-80">{t("teacherSeoReadinessDisclaimer")}</p>
        </div>
        {evaluation.previewPath ? (
          <Link
            href={evaluation.previewPath}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-current/20 bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white"
            data-testid="teacher-seo-preview-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} aria-hidden />
            {t("teacherSeoPreviewLink")}
          </Link>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">{t("teacherSeoStatusPublic")}</dt>
          <dd>{evaluation.isPublic ? t("teacherSeoYes") : t("teacherSeoNo")}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t("teacherSeoStatusIndexable")}</dt>
          <dd>{evaluation.isIndexable ? t("teacherSeoYes") : t("teacherSeoNo")}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t("teacherSeoStatusSitemap")}</dt>
          <dd>{evaluation.isSitemapEligible ? t("teacherSeoYes") : t("teacherSeoNo")}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t("teacherSeoStatusRequested")}</dt>
          <dd>{evaluation.teacherRequestedPublication ? t("teacherSeoYes") : t("teacherSeoNo")}</dd>
        </div>
      </dl>

      {checklistKeys.length > 0 ? (
        <ul className="mt-4 space-y-2" data-testid="teacher-seo-readiness-checklist">
          {checklistKeys.map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm">
              <CircleDashed className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
              <span>{t(MISSING_REASON_I18N[key])}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 text-teal-700" aria-hidden />
          {evaluation.teacherRequestedPublication
            ? t("teacherSeoReadinessAwaitingAdmin")
            : t("teacherSeoReadinessReadyToRequest")}
        </p>
      )}

      {evaluation.paidBookingCtaEnabled && !evaluation.payoutReady ? (
        <p className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {t("teacherSeoPayoutWarning")}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void runAction("request")}
          disabled={saving || !evaluation.canRequestPublication}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="teacher-seo-request-button"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t("teacherSeoRequestPublicationButton")}
        </button>
        {evaluation.teacherRequestedPublication && !evaluation.isPublic ? (
          <button
            type="button"
            onClick={() => void runAction("withdraw")}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-current/25 bg-white/70 px-4 py-2.5 text-sm font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="teacher-seo-withdraw-button"
          >
            {t("teacherSeoWithdrawRequestButton")}
          </button>
        ) : null}
      </div>

      {message ? (
        <p
          className={cn("mt-3 text-sm font-medium", messageKind === "ok" ? "text-teal-900" : "text-rose-800")}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
