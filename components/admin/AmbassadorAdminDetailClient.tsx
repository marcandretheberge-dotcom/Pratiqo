"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronLeft,
  Handshake,
  Loader2,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  ReceiptText,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";

type AmbassadorStatus = "invited" | "active" | "paused" | "revoked";
type RewardStatus = "pending" | "earned" | "paid" | "void" | "reversed";

type AmbassadorLink = {
  id: string;
  ambassadorId: string | null;
  teacherId: string;
  code: string;
  destinationPath: string;
  campaign: string | null;
  attributionWindowDays: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type AmbassadorReward = {
  id: string;
  ambassadorLinkId: string;
  rewardKey: string;
  rewardType: string;
  amountCents: number;
  currency: string;
  ruleVersion: string;
  status: RewardStatus;
  earnedAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
};

type AmbassadorDetail = {
  ambassadorId: string;
  teacherId: string;
  ambassadorUserId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  status: AmbassadorStatus;
  selectedAt: string | null;
  activatedAt: string | null;
  pausedAt: string | null;
  revokedAt: string | null;
  internalNote: string | null;
  primaryCode: string | null;
  referralClicks: number;
  referredLearners: number;
  referredTeachers: number;
  referredStudentEligibleBookings: number;
  referredTeacherEligibleBookings: number;
  uniqueEligibleCompletedBookings: number;
  uniqueRealizedPlatformFeeCents: number;
  uniqueRealizedNetPlatformContributionCents: number;
  rewardsOutstandingCents: number;
  rewardsPaidCents: number;
  rewardsReversedUnrecoveredCents: number;
  ambassadorTotalEconomicCostCents: number;
  netContributionAfterAmbassadorCostCents: number;
  links: AmbassadorLink[];
  rewards: AmbassadorReward[];
};

type Props = {
  ambassadorId: string;
};

function formatCents(cents: number | null | undefined): string {
  const amount = Number(cents ?? 0);
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number.isFinite(amount) ? amount / 100 : 0);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: AmbassadorStatus): string {
  if (status === "active") return "Actif";
  if (status === "paused") return "En pause";
  if (status === "revoked") return "Révoqué";
  return "Invité";
}

function statusClass(status: AmbassadorStatus): string {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "revoked") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function rewardStatusClass(status: RewardStatus): string {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "void" || status === "reversed") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function metric(label: string, value: string | number) {
  return (
    <div className="rounded-2xl border border-[#DCEAE3] bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-[#0F6E56]">{value}</p>
    </div>
  );
}

async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const { data: sess } = await getSupabaseClient().auth.getSession();
  const token = sess.session?.access_token ?? "";
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Requête admin impossible.");
  return data;
}

export function AmbassadorAdminDetailClient({ ambassadorId }: Props) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const isAdmin = (profile?.role as string | undefined) === "admin";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [ambassador, setAmbassador] = useState<AmbassadorDetail | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newDestination, setNewDestination] = useState("/trouver-un-prof");
  const [newCampaign, setNewCampaign] = useState("");
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router, user]);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFlash(null);
    try {
      const data = await adminFetch<{ ambassador?: AmbassadorDetail }>(
        `/api/admin/ambassadors/${encodeURIComponent(ambassadorId)}`,
      );
      setAmbassador(data.ambassador ?? null);
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : "Chargement impossible." });
    } finally {
      setLoading(false);
    }
  }, [ambassadorId, isAdmin]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const activeRewardCount = useMemo(
    () =>
      ambassador?.rewards.filter((reward) => reward.status === "pending" || reward.status === "earned")
        .length ?? 0,
    [ambassador],
  );

  const setStatus = async (status: "active" | "paused" | "revoked") => {
    setBusy(`status:${status}`);
    setFlash(null);
    try {
      await adminFetch(`/api/admin/ambassadors/${encodeURIComponent(ambassadorId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status, internalNote: statusNote }),
      });
      setFlash({ kind: "ok", text: `Statut mis à jour: ${statusLabel(status)}.` });
      await load();
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : "Mise à jour impossible." });
    } finally {
      setBusy(null);
    }
  };

  const createLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("link:create");
    setFlash(null);
    try {
      await adminFetch(`/api/admin/ambassadors/${encodeURIComponent(ambassadorId)}/links`, {
        method: "POST",
        body: JSON.stringify({
          preferredCode: newCode,
          destinationPath: newDestination,
          campaign: newCampaign,
        }),
      });
      setFlash({ kind: "ok", text: "Lien créé." });
      setNewCode("");
      setNewCampaign("");
      await load();
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : "Création impossible." });
    } finally {
      setBusy(null);
    }
  };

  const toggleLink = async (link: AmbassadorLink) => {
    setBusy(`link:${link.id}`);
    setFlash(null);
    try {
      await adminFetch(`/api/admin/ambassador-links/${encodeURIComponent(link.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !link.active }),
      });
      setFlash({ kind: "ok", text: link.active ? "Lien désactivé." : "Lien activé." });
      await load();
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : "Mise à jour du lien impossible." });
    } finally {
      setBusy(null);
    }
  };

  const markPaid = async (reward: AmbassadorReward) => {
    const note = window.prompt("Note interne de paiement manuel (optionnelle)") ?? "";
    setBusy(`reward:${reward.id}`);
    setFlash(null);
    try {
      await adminFetch(`/api/admin/ambassador-rewards/${encodeURIComponent(reward.id)}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ paymentNote: note }),
      });
      setFlash({ kind: "ok", text: "Récompense marquée payée." });
      await load();
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : "Marquage impossible." });
    } finally {
      setBusy(null);
    }
  };

  if (!user || !isAdmin) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <Link
          href="/admin/ambassadors"
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
        >
          <ChevronLeft size={16} aria-hidden />
          Retour aux ambassadeurs
        </Link>

        {flash ? (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              flash.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {flash.text}
          </p>
        ) : null}

        {loading ? (
          <section className="rounded-3xl border border-[#DCEAE3] bg-white p-8 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              Chargement...
            </p>
          </section>
        ) : !ambassador ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-900">
            Ambassadeur introuvable.
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <Handshake size={26} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Ambassadeur
                    </p>
                    <h1 className="mt-1 break-words text-2xl font-bold text-[#2C2C2A] sm:text-3xl">
                      {ambassador.teacherName ?? ambassador.teacherId}
                    </h1>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {ambassador.teacherEmail ?? "Email non disponible"} · {ambassador.teacherId}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                          ambassador.status,
                        )}`}
                      >
                        {statusLabel(ambassador.status)}
                      </span>
                      {ambassador.primaryCode ? (
                        <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 font-mono text-xs font-bold text-teal-800">
                          /r/{ambassador.primaryCode}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:w-[34rem]">
                  {metric("Clics", ambassador.referralClicks)}
                  {metric("Bookings éligibles", ambassador.uniqueEligibleCompletedBookings)}
                  {metric("A payer", formatCents(ambassador.rewardsOutstandingCents))}
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metric("Marge plateforme nette", formatCents(ambassador.uniqueRealizedNetPlatformContributionCents))}
              {metric("Coût ambassadeur total", formatCents(ambassador.ambassadorTotalEconomicCostCents))}
              {metric("Payé", formatCents(ambassador.rewardsPaidCents))}
              {metric("Net après coût", formatCents(ambassador.netContributionAfterAmbassadorCostCents))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#2C2C2A]">Statut du programme</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Mettre en pause ou révoquer bloque les nouvelles sessions de suivi.
                  Les attributions et récompenses historiques restent auditables.
                </p>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Note interne
                  <textarea
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                    placeholder={ambassador.internalNote ?? "Raison ou contexte..."}
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void setStatus("active")}
                    disabled={busy !== null || ambassador.status === "active"}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 disabled:opacity-50"
                  >
                    <PlayCircle size={16} aria-hidden />
                    Réactiver
                  </button>
                  <button
                    type="button"
                    onClick={() => void setStatus("paused")}
                    disabled={busy !== null || ambassador.status === "paused"}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 disabled:opacity-50"
                  >
                    <PauseCircle size={16} aria-hidden />
                    Pause
                  </button>
                  <button
                    type="button"
                    onClick={() => void setStatus("revoked")}
                    disabled={busy !== null || ambassador.status === "revoked"}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50"
                  >
                    <ShieldAlert size={16} aria-hidden />
                    Révoquer
                  </button>
                </div>
              </div>

              <form
                onSubmit={createLink}
                className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle size={18} className="text-teal-700" aria-hidden />
                  <h2 className="text-lg font-bold text-[#2C2C2A]">Nouveau lien</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Code
                    <input
                      value={newCode}
                      onChange={(event) => setNewCode(event.target.value)}
                      required
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                      placeholder="marie-espagnol"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Destination
                    <input
                      value={newDestination}
                      onChange={(event) => setNewDestination(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                      placeholder="/trouver-un-prof"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Campagne
                    <input
                      value={newCampaign}
                      onChange={(event) => setNewCampaign(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                      placeholder="instagram"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0B5845] disabled:opacity-60"
                >
                  {busy === "link:create" ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                  ) : null}
                  Créer le lien
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#2C2C2A]">Liens de référence</h2>
              <div className="mt-4 space-y-3">
                {ambassador.links.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Aucun lien.
                  </p>
                ) : (
                  ambassador.links.map((link) => (
                    <div
                      key={link.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="break-all font-mono text-sm font-black text-[#2C2C2A]">
                          /r/{link.code}
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-600">
                          {link.destinationPath} · {link.campaign ?? "sans campagne"} · fenêtre{" "}
                          {link.attributionWindowDays} jours
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Créé le {formatDate(link.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/r/${link.code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Ouvrir
                          <ArrowUpRight size={14} aria-hidden />
                        </a>
                        <button
                          type="button"
                          onClick={() => void toggleLink(link)}
                          disabled={busy !== null}
                          className={`rounded-full border px-3 py-2 text-xs font-bold ${
                            link.active
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          } disabled:opacity-60`}
                        >
                          {busy === `link:${link.id}` ? "..." : link.active ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#2C2C2A]">Récompenses</h2>
                  <p className="text-sm text-slate-600">
                    {activeRewardCount} récompense(s) en attente ou gagnée(s). Paiement manuel seulement.
                  </p>
                </div>
                <ReceiptText size={22} className="text-teal-700" aria-hidden />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Montant</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Règle</th>
                      <th className="px-3 py-2">Créé</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ambassador.rewards.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-5 text-slate-500">
                          Aucune récompense.
                        </td>
                      </tr>
                    ) : (
                      ambassador.rewards.map((reward) => (
                        <tr key={reward.id} className="border-t border-slate-100">
                          <td className="px-3 py-3">
                            <p className="font-semibold text-[#2C2C2A]">{reward.rewardType}</p>
                            <p className="max-w-xs break-all font-mono text-xs text-slate-500">
                              {reward.rewardKey}
                            </p>
                          </td>
                          <td className="px-3 py-3 font-bold text-[#0F6E56]">
                            {formatCents(reward.amountCents)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${rewardStatusClass(
                                reward.status,
                              )}`}
                            >
                              {reward.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-600">
                            {reward.ruleVersion}
                          </td>
                          <td className="px-3 py-3 text-slate-600">{formatDate(reward.createdAt)}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => void markPaid(reward)}
                              disabled={
                                busy !== null ||
                                (reward.status !== "pending" && reward.status !== "earned")
                              }
                              className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 disabled:opacity-40"
                            >
                              {busy === `reward:${reward.id}` ? "..." : "Marquer payé"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
