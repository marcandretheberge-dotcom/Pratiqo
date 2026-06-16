"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

export type ActivePromoView = {
  id: string;
  started_at: string;
  ends_at: string;
  commission_rate_bps: number;
  ended_early_at: string | null;
  is_active: boolean;
};

export type PromoHistoryRow = {
  id: string;
  started_at: string;
  ends_at: string;
  commission_rate_bps: number;
  ended_early_at: string | null;
  created_at: string;
  created_by_email: string | null;
  ended_early_by_email: string | null;
};

type Props = {
  teacherId: string;
  activePromo: ActivePromoView | null;
  history: PromoHistoryRow[];
  isPaidPro: boolean;
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function FounderPromoCard({ teacherId, activePromo, history, isPaidPro }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"activate" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activate = async () => {
    if (!window.confirm(
      "Activer la promotion fondateur pour 6 mois à 5 % de commission ?\n\nCette action est journalisée. Elle n'active PAS le statut Membre Pro payé.",
    )) return;
    setBusy("activate");
    setError(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch(`/api/admin/users/${teacherId}/founder-promo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Activation impossible.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activation impossible.");
    } finally {
      setBusy(null);
    }
  };

  const endEarly = async () => {
    if (!window.confirm(
      "Terminer immédiatement la promotion fondateur ?\n\nLe taux standard s'appliquera aux prochaines réservations, sauf si le professeur est abonné à Membre Pro.",
    )) return;
    setBusy("end");
    setError(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch(`/api/admin/users/${teacherId}/founder-promo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Terminaison impossible.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terminaison impossible.");
    } finally {
      setBusy(null);
    }
  };

  const hasActivePromo = activePromo?.is_active === true;

  return (
    <section
      className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
      data-testid="founder-promo-card"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Sparkles size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#2C2C2A]">Promotion fondateur</h2>
          <p className="mt-1 text-xs text-slate-600">
            Promotion temporaire qui réduit la commission à 5 % pendant 6 mois.{" "}
            <strong>N&apos;active pas</strong> le statut Membre Pro payé.
          </p>
        </div>
      </div>

      {hasActivePromo && activePromo ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm">
          <p className="font-bold text-amber-900">
            Active jusqu&apos;au {formatDate(activePromo.ends_at)}
          </p>
          <p className="mt-1 text-amber-900">
            Commission promotionnelle :{" "}
            <strong>{(activePromo.commission_rate_bps / 100).toFixed(2)} %</strong>
          </p>
          <p className="mt-1 text-xs text-amber-900/80">
            Démarrée le {formatDateTime(activePromo.started_at)}.
          </p>
          <p className="mt-2 text-xs text-amber-900/80">
            Après cette date, si le professeur n&apos;est pas abonné à Membre Pro, le taux
            standard s&apos;appliquera selon les règles de commission en vigueur.
          </p>
          <button
            type="button"
            onClick={endEarly}
            disabled={busy !== null}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 disabled:opacity-60"
            data-testid="founder-promo-end-button"
          >
            {busy === "end" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
            Terminer la promotion
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-bold text-slate-800">Aucune promotion fondateur active.</p>
          {isPaidPro ? (
            <p className="mt-1 text-xs text-slate-600">
              Ce professeur a un abonnement Membre Pro payé actif. Le taux Membre Pro
              s&apos;applique déjà; la promotion fondateur n&apos;ajouterait rien et est
              donc inutile.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600">
              Active une promotion de 6 mois à 5 % pour ce professeur. Le taux standard
              s&apos;appliquera de nouveau à l&apos;échéance, sauf abonnement Membre Pro
              actif.
            </p>
          )}
          <button
            type="button"
            onClick={activate}
            disabled={busy !== null}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
            data-testid="founder-promo-activate-button"
          >
            {busy === "activate" ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={14} aria-hidden />
            )}
            Activer pour 6 mois
          </button>
        </div>
      )}

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900" role="alert">
          {error}
        </div>
      ) : null}

      {history.length > 0 ? (
        <details className="mt-5 rounded-2xl border border-slate-200 bg-white">
          <summary className="cursor-pointer rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700">
            Historique ({history.length})
          </summary>
          <ul className="divide-y divide-slate-100 px-4 pb-3 text-xs">
            {history.map((row) => {
              const ended = row.ended_early_at != null;
              return (
                <li key={row.id} className="py-2">
                  <p className="font-semibold text-slate-800">
                    {formatDate(row.started_at)} → {formatDate(row.ends_at)} (
                    {(row.commission_rate_bps / 100).toFixed(2)} %)
                  </p>
                  <p className="text-slate-600">
                    Activée par {row.created_by_email ?? "(admin)"} le{" "}
                    {formatDateTime(row.created_at)}.
                  </p>
                  {ended ? (
                    <p className="text-rose-700">
                      Terminée par {row.ended_early_by_email ?? "(admin)"} le{" "}
                      {formatDateTime(row.ended_early_at)}.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
