"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, Loader2, Search, ShieldAlert } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { getAdminTeacherSeoPublicationCopy } from "@/lib/seo/adminTeacherSeoPublicationCopy";
import type {
  TeacherGoogleSeoPublicationStatus,
  TeacherSeoMissingReasonKey,
  TeacherSeoPublicationEvaluation,
} from "@/lib/seo/teacherSeoPublication";
import type { Locale } from "@/lib/i18n/types";

const STATUS_PILL_CLASS: Record<TeacherGoogleSeoPublicationStatus, string> = {
  not_published: "border-slate-200 bg-slate-50 text-slate-800",
  requested: "border-sky-200 bg-sky-50 text-sky-950",
  blocked: "border-amber-200 bg-amber-50 text-amber-950",
  ready_to_publish: "border-teal-200 bg-teal-50 text-teal-950",
  published_in_google: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

type Props = {
  targetUserId: string;
  initialEvaluation: TeacherSeoPublicationEvaluation;
  teacherId: string;
  locale?: Locale;
};

function formatMarkerDate(value: string | null, absentLabel: string): string {
  if (!value) return absentLabel;
  try {
    return new Date(value).toLocaleString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function TeacherSeoPublicationCard({
  targetUserId,
  initialEvaluation,
  teacherId,
  locale = "fr",
}: Props) {
  const router = useRouter();
  const copy = getAdminTeacherSeoPublicationCopy(locale);
  const [evaluation, setEvaluation] = useState(initialEvaluation);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewHref =
    evaluation.previewPath ??
    (evaluation.canonicalUrl
      ? evaluation.canonicalUrl.replace(/^https?:\/\/[^/]+/, "")
      : `/teacher/profile/${teacherId}`);

  const callApi = async (action: string) => {
    const { data: sess } = await getSupabaseClient().auth.getSession();
    const token = sess.session?.access_token ?? "";
    const res = await fetch(`/api/admin/users/${targetUserId}/teacher-seo-publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      evaluation?: TeacherSeoPublicationEvaluation;
      adminPublishBlockers?: TeacherSeoMissingReasonKey[];
    };
    if (!res.ok) {
      return {
        ok: false as const,
        error: data.error ?? "Action impossible.",
        blockers: data.adminPublishBlockers,
      };
    }
    if (!data.evaluation) {
      return { ok: false as const, error: "Réponse serveur incomplète." };
    }
    return { ok: true as const, evaluation: data.evaluation };
  };

  const runAction = async (action: string, confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(action);
    setError(null);
    setMessage(null);
    const result = await callApi(action);
    setBusy(null);
    if (!result.ok) {
      setError(
        result.blockers?.length
          ? `${result.error}: ${result.blockers.map((b) => copy.missingReasonLabels[b]).join(", ")}`
          : result.error,
      );
      return;
    }
    setEvaluation(result.evaluation);
    setMessage(
      action === "publish"
        ? copy.publishSuccess
        : action === "unpublish"
          ? copy.removeFromGoogleSuccess
          : action === "hide_marketplace"
            ? copy.hideMarketplaceSuccess
            : copy.requestCorrectionsSuccess,
    );
    router.refresh();
  };

  const blockers = evaluation.adminPublishBlockers.length
    ? evaluation.adminPublishBlockers
    : evaluation.missingReasonKeys;
  const statusLabel = copy.googleSeoStatusLabels[evaluation.googleSeoStatus];
  const statusPillClass = STATUS_PILL_CLASS[evaluation.googleSeoStatus];

  return (
    <section
      className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
      data-testid="admin-teacher-seo-publication-card"
    >
      <div className="flex items-start gap-3">
        <Search className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-900">{copy.sectionTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.sectionDescription}</p>
        </div>
      </div>

      <div
        className="mt-5 rounded-2xl border border-[#DCEAE3] bg-[#F8FCFA] p-4"
        data-testid="admin-teacher-seo-google-toggle-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">{copy.sectionTitle}</p>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusPillClass}`}
            data-testid="admin-teacher-seo-status-pill"
          >
            {statusLabel}
          </span>
        </div>

        <p className="mt-3 text-sm text-slate-600">{copy.disclaimerIndexing}</p>
        <p className="mt-2 text-sm text-slate-600">{copy.disclaimerTeacherConsent}</p>

        {blockers.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" aria-hidden />
              {copy.blockersTitle}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5" data-testid="admin-teacher-seo-blockers">
              {blockers.map((key) => (
                <li key={key}>{copy.missingReasonLabels[key] ?? key}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {evaluation.paidBookingCtaEnabled && !evaluation.payoutReady ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {copy.payoutBlockerNote}
            {evaluation.payoutBlockers.length ? ` (${evaluation.payoutBlockers.join(", ")})` : null}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3" data-testid="admin-teacher-seo-toggle-actions">
          <button
            type="button"
            disabled={Boolean(busy) || !evaluation.canAdminPublish}
            onClick={() => void runAction("publish", copy.publishConfirm)}
            className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="admin-teacher-seo-publish-button"
          >
            {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {copy.publishButton}
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || !evaluation.canAdminRemoveFromGoogle}
            onClick={() => void runAction("unpublish", copy.removeFromGoogleConfirm)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="admin-teacher-seo-unpublish-button"
          >
            {busy === "unpublish" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {copy.removeFromGoogleButton}
          </button>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {copy.marketplaceVisibilityLabel}
          </dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {evaluation.isPublic ? copy.marketplacePublic : copy.marketplacePrivate}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {copy.teacherRequestLabel}
          </dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {evaluation.teacherRequestedPublication
              ? copy.teacherRequestYes
              : copy.teacherRequestNo}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{copy.sitemapLabel}</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {evaluation.isSitemapEligible ? copy.sitemapIncluded : copy.sitemapExcluded}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{copy.markerLabel}</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {formatMarkerDate(evaluation.publicProfileLastIndexableAt, copy.markerAbsent)}
          </dd>
        </div>
      </dl>

      {evaluation.canonicalUrl ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold text-slate-700">URL :</span>{" "}
            <a href={evaluation.canonicalUrl} className="text-teal-700 underline" target="_blank" rel="noreferrer">
              {evaluation.canonicalUrl}
            </a>
          </p>
          {evaluation.generatedTitle ? (
            <p>
              <span className="font-semibold text-slate-700">Title :</span> {evaluation.generatedTitle}
            </p>
          ) : null}
          {evaluation.generatedDescription ? (
            <p>
              <span className="font-semibold text-slate-700">Meta :</span>{" "}
              {evaluation.generatedDescription}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          data-testid="admin-teacher-seo-preview-link"
        >
          <Eye className="h-4 w-4" aria-hidden />
          {copy.previewButton}
        </Link>
        {evaluation.canAdminHideFromMarketplace ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runAction("hide_marketplace", copy.hideMarketplaceConfirm)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="admin-teacher-seo-hide-marketplace-button"
          >
            {busy === "hide_marketplace" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {copy.hideMarketplaceButton}
          </button>
        ) : null}
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void runAction("request_corrections", copy.requestCorrectionsConfirm)}
          className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="admin-teacher-seo-corrections-button"
        >
          {copy.requestCorrectionsButton}
        </button>
      </div>

      {evaluation.previewPath ? (
        <p className="mt-3 text-xs text-slate-500">
          <a
            href={evaluation.previewPath}
            className="inline-flex items-center gap-1 text-teal-700 underline"
            target="_blank"
            rel="noreferrer"
          >
            {evaluation.previewPath}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-medium text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm font-medium text-teal-900" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
