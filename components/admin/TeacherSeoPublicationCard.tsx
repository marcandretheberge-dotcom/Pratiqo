"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, Loader2, Search, ShieldAlert } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import type { TeacherSeoMissingReasonKey, TeacherSeoPublicationEvaluation } from "@/lib/seo/teacherSeoPublication";

const MISSING_REASON_LABELS: Record<TeacherSeoMissingReasonKey, string> = {
  display_name: "Nom public manquant",
  public_bio: "Bio publique insuffisante",
  main_subject: "Matière principale manquante",
  location_or_format: "Ville/région ou format en ligne manquant",
  teaching_format: "Format d'enseignement non défini",
  onboarding_incomplete: "Onboarding incomplet",
  admin_hidden: "Profil masqué par l'administration",
  identity_failed: "Vérification d'identité échouée",
  unsupported_market: "Marché non pris en charge",
  search_consent_missing: "Consentement Google manquant",
  public_profile_intent_missing: "Demande de publication manquante",
  slug_missing: "URL publique (slug) manquante",
  not_admin_published: "En attente de publication admin",
  payout_not_ready: "Stripe Connect / paiements non prêts",
};

type Props = {
  targetUserId: string;
  initialEvaluation: TeacherSeoPublicationEvaluation;
  teacherId: string;
};

function publicationStatusLabel(evaluation: TeacherSeoPublicationEvaluation): string {
  if (evaluation.isSitemapEligible) return "Publié dans le sitemap";
  if (!evaluation.teacherRequestedPublication) return "Non demandé";
  if (evaluation.adminPublishBlockers.length === 0) return "Prêt pour publication";
  return "Bloqué";
}

function formatMarkerDate(value: string | null): string {
  if (!value) return "Absent";
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
}: Props) {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState(initialEvaluation);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewHref =
    evaluation.previewPath ??
    (evaluation.canonicalUrl ? evaluation.canonicalUrl.replace(/^https?:\/\/[^/]+/, "") : `/teacher/profile/${teacherId}`);

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
          ? `${result.error}: ${result.blockers.map((b) => MISSING_REASON_LABELS[b]).join(", ")}`
          : result.error,
      );
      return;
    }
    setEvaluation(result.evaluation);
    setMessage(
      action === "publish"
        ? "Profil publié pour le SEO."
        : action === "unpublish"
          ? "Profil retiré de Google / rendu privé."
          : "Demande de corrections envoyée — le professeur devra soumettre à nouveau.",
    );
    router.refresh();
  };

  const blockers = evaluation.adminPublishBlockers.length
    ? evaluation.adminPublishBlockers
    : evaluation.missingReasonKeys;
  const statusLabel = publicationStatusLabel(evaluation);
  const hasTeacherRequest = evaluation.teacherRequestedPublication;
  const canUnpublishSeo = evaluation.adminPublished || evaluation.isSitemapEligible;

  return (
    <section
      className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
      data-testid="admin-teacher-seo-publication-card"
    >
      <div className="flex items-start gap-3">
        <Search className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-900">Publication SEO du profil</h2>
          <p className="mt-1 text-sm text-slate-600">
            Contrôlez si ce profil de professeur peut être publié dans Google et ajouté au sitemap.
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Statut actuel</dt>
          <dd className="mt-1 font-semibold text-slate-900">{statusLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">SEO indexable</dt>
          <dd className="mt-1 font-semibold text-slate-900">{evaluation.isIndexable ? "Oui" : "Non"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Statut public</dt>
          <dd className="mt-1 font-semibold text-slate-900">{evaluation.isPublic ? "Public" : "Privé"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Demande de publication</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {hasTeacherRequest ? "Demandé par le professeur" : "Non demandé"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Sitemap</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {evaluation.isSitemapEligible ? "Inclus" : "Exclu"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Marqueur admin public_profile_last_indexable_at
          </dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {formatMarkerDate(evaluation.publicProfileLastIndexableAt)}
          </dd>
        </div>
      </dl>

      {!hasTeacherRequest ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Le professeur doit d&apos;abord demander la publication et accepter l&apos;indexation.
        </p>
      ) : null}

      {blockers.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Éléments manquants ou bloquants
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockers.map((key) => (
              <li key={key}>{MISSING_REASON_LABELS[key] ?? key}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation.paidBookingCtaEnabled && !evaluation.payoutReady ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          Connect Stripe doit être complété avant la publication d&apos;un profil qui accepte les réservations payantes.
          {evaluation.payoutBlockers.length ? ` (${evaluation.payoutBlockers.join(", ")})` : null}
        </p>
      ) : null}

      {evaluation.canonicalUrl ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold text-slate-700">URL canonique :</span>{" "}
            <a href={evaluation.canonicalUrl} className="text-teal-700 underline" target="_blank" rel="noreferrer">
              {evaluation.canonicalUrl}
            </a>
          </p>
          {evaluation.generatedTitle ? (
            <p>
              <span className="font-semibold text-slate-700">Titre :</span> {evaluation.generatedTitle}
            </p>
          ) : null}
          {evaluation.generatedDescription ? (
            <p>
              <span className="font-semibold text-slate-700">Meta description :</span>{" "}
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
          Prévisualiser le profil
        </Link>
        <button
          type="button"
          disabled={Boolean(busy) || !evaluation.canAdminPublish}
          onClick={() =>
            void runAction(
              "publish",
              "Publier ce profil pour le SEO (is_public=true, indexable si éligible) ?",
            )
          }
          className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="admin-teacher-seo-publish-button"
        >
          {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Publier le profil SEO
        </button>
        {canUnpublishSeo ? (
          <button
            type="button"
            disabled={Boolean(busy) || !evaluation.canAdminUnpublish}
            onClick={() =>
              void runAction(
                "unpublish",
                "Retirer ce profil de Google et le rendre privé (is_public=false) ?",
              )
            }
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="admin-teacher-seo-unpublish-button"
          >
            {busy === "unpublish" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Retirer de Google / rendre privé
          </button>
        ) : null}
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            void runAction(
              "request_corrections",
              "Demander des corrections (retire le consentement SEO et dépublie) ?",
            )
          }
          className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="admin-teacher-seo-corrections-button"
        >
          Demander corrections
        </button>
      </div>

      {evaluation.previewPath ? (
        <p className="mt-3 text-xs text-slate-500">
          Lien public :{" "}
          <a href={evaluation.previewPath} className="inline-flex items-center gap-1 text-teal-700 underline" target="_blank" rel="noreferrer">
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
