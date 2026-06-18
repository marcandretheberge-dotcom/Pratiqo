"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, EyeOff, Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import type { ProfileDeactivationSnapshot } from "@/lib/admin/profileDeactivation";

type Props = {
  targetUserId: string;
  initialSnapshot: ProfileDeactivationSnapshot;
  initialCanReactivate: boolean;
};

const DEACTIVATE_CONFIRM =
  "Cette action retire le profil des surfaces publiques, mais conserve les données nécessaires aux réservations, paiements, obligations légales et audit.\n\nCette action ne supprime pas automatiquement le compte Stripe ni l'historique des paiements.\n\nConfirmer la désactivation ?";

const REMOVE_PUBLIC_CONFIRM =
  "Retirer ce professeur des surfaces publiques (recherche, fiche publique, SEO) tout en conservant son compte connecté et l'historique des réservations/paiements ?";

const DELETION_REQUEST_CONFIRM =
  "Marquer une demande de suppression reçue et désactiver le profil ? Les données de réservation et de paiement seront conservées.";

const REACTIVATE_CONFIRM =
  "Réactiver ce profil ? Le compte pourra à nouveau se connecter. Les paramètres SEO publics ne seront pas réactivés automatiquement.";

export function ProfileDeactivationCard({
  targetUserId,
  initialSnapshot,
  initialCanReactivate,
}: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [canReactivate, setCanReactivate] = useState(initialCanReactivate);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const callApi = async (
    action: string,
  ): Promise<{ ok: true; snapshot: ProfileDeactivationSnapshot; canReactivate: boolean } | { ok: false; error: string }> => {
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch(`/api/admin/users/${targetUserId}/deactivation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        snapshot?: ProfileDeactivationSnapshot;
        canReactivate?: boolean;
      };
      if (!res.ok) {
        return { ok: false, error: data.error ?? "Action impossible." };
      }
      if (!data.snapshot) {
        return { ok: false, error: "Réponse serveur incomplète." };
      }
      return {
        ok: true,
        snapshot: data.snapshot,
        canReactivate: Boolean(data.canReactivate),
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Action impossible.",
      };
    }
  };

  const runAction = async (action: string, confirmMessage: string) => {
    if (!window.confirm(confirmMessage)) return;
    setBusy(action);
    setError(null);
    const result = await callApi(action);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setSnapshot(result.snapshot);
    setCanReactivate(result.canReactivate);
    setBusy(null);
    router.refresh();
  };

  const isTeacher = snapshot.role === "teacher";
  const isDeactivated = !snapshot.isActive || Boolean(snapshot.profileDeactivatedAt);

  return (
    <section
      className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm"
      data-testid="admin-profile-deactivation-card"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
          <AlertTriangle size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#2C2C2A]">Compte et visibilité</h2>
          <p className="mt-1 text-sm text-slate-600">
            Actions de retrait des surfaces publiques. Aucune suppression définitive des
            réservations, paiements ou données Stripe.
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Compte actif</dt>
          <dd className="mt-1 font-semibold text-slate-800">{snapshot.isActive ? "Oui" : "Non"}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Désactivé le
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {snapshot.profileDeactivatedAt ?? "—"}
          </dd>
        </div>
        {isTeacher && snapshot.teacher ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Marketplace publique
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {snapshot.teacher.isPublic && !snapshot.teacher.deactivatedAt ? "Visible" : "Masqué"}
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                SEO /professeurs
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {snapshot.teacher.publicProfileEnabled && snapshot.teacher.searchIndexingConsent
                  ? "Indexable"
                  : "Désactivé"}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="mt-5">
        <label htmlFor="deactivation-reason" className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Motif (optionnel, audit)
        </label>
        <textarea
          id="deactivation-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Ex. demande utilisateur par courriel"
          className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
          data-testid="admin-deactivation-reason"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
        <p>
          Cette action retire le profil des surfaces publiques, mais conserve les données
          nécessaires aux réservations, paiements, obligations légales et audit.
        </p>
        <p className="mt-2">
          Cette action ne supprime pas automatiquement le compte Stripe ni l&apos;historique des
          paiements.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {!isDeactivated ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runAction("deactivate", DEACTIVATE_CONFIRM)}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            data-testid="admin-deactivate-profile"
          >
            {busy === "deactivate" ? <Loader2 size={16} className="animate-spin" /> : <EyeOff size={16} />}
            Désactiver le profil
          </button>
        ) : null}

        {isTeacher && snapshot.teacher && (snapshot.teacher.isPublic || snapshot.teacher.publicProfileEnabled) ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runAction("remove_public_teacher", REMOVE_PUBLIC_CONFIRM)}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-800 disabled:opacity-60"
            data-testid="admin-remove-public-teacher"
          >
            {busy === "remove_public_teacher" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <EyeOff size={16} />
            )}
            Retirer le profil public professeur
          </button>
        ) : null}

        {!snapshot.deletionRequestedAt ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runAction("mark_deletion_requested", DELETION_REQUEST_CONFIRM)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 disabled:opacity-60"
            data-testid="admin-mark-deletion-requested"
          >
            {busy === "mark_deletion_requested" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldAlert size={16} />
            )}
            Demande de suppression reçue
          </button>
        ) : null}

        {canReactivate ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runAction("reactivate", REACTIVATE_CONFIRM)}
            className="inline-flex items-center gap-2 rounded-2xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-900 disabled:opacity-60"
            data-testid="admin-reactivate-profile"
          >
            {busy === "reactivate" ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            Réactiver le profil
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-rose-700" data-testid="admin-deactivation-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
