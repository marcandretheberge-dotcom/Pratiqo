"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  Handshake,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";

type AmbassadorStatus = "invited" | "active" | "paused" | "revoked";

type AdminAmbassadorOverview = {
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
  primaryLinkId: string | null;
  primaryCode: string | null;
  primaryDestinationPath: string | null;
  activeLinksCount: number;
  totalLinksCount: number;
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
};

function formatCents(cents: number | null | undefined): string {
  const amount = Number(cents ?? 0);
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number.isFinite(amount) ? amount / 100 : 0);
}

function statusBadge(status: AmbassadorStatus): string {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "revoked") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusLabel(status: AmbassadorStatus): string {
  if (status === "active") return "Actif";
  if (status === "paused") return "En pause";
  if (status === "revoked") return "Révoqué";
  return "Invité";
}

function metric(label: string, value: string | number) {
  return (
    <div className="rounded-2xl border border-[#DCEAE3] bg-white/80 px-4 py-3">
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

export default function AdminAmbassadorsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const isAdmin = (profile?.role as string | undefined) === "admin";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ambassadors, setAmbassadors] = useState<AdminAmbassadorOverview[]>([]);
  const [teacherId, setTeacherId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("teacherId") ?? "";
  });
  const [preferredCode, setPreferredCode] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [query, setQuery] = useState("");

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
      const data = await adminFetch<{ ambassadors?: AdminAmbassadorOverview[] }>(
        "/api/admin/ambassadors",
      );
      setAmbassadors(data.ambassadors ?? []);
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : "Chargement impossible." });
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ambassadors;
    return ambassadors.filter((row) =>
      [
        row.teacherId,
        row.teacherName,
        row.teacherEmail,
        row.primaryCode,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [ambassadors, query]);

  const totals = useMemo(
    () => ({
      active: ambassadors.filter((row) => row.status === "active").length,
      clicks: ambassadors.reduce((sum, row) => sum + row.referralClicks, 0),
      fees: ambassadors.reduce((sum, row) => sum + row.uniqueRealizedNetPlatformContributionCents, 0),
      outstanding: ambassadors.reduce((sum, row) => sum + row.rewardsOutstandingCents, 0),
    }),
    [ambassadors],
  );

  const activate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFlash(null);
    try {
      await adminFetch("/api/admin/ambassadors", {
        method: "POST",
        body: JSON.stringify({
          teacherId,
          preferredCode,
          internalNote,
        }),
      });
      setFlash({ kind: "ok", text: "Ambassadeur activé." });
      setPreferredCode("");
      setInternalNote("");
      await load();
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof Error ? e.message : "Activation impossible." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !isAdmin) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
        >
          <ChevronLeft size={16} aria-hidden />
          Retour admin
        </Link>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <Handshake size={26} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Programme ambassadeurs
                </p>
                <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] sm:text-3xl">
                  Ambassadeurs Pratiqo
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                  Active des professeurs existants comme ambassadeurs, gère leurs liens
                  publics et suit les récompenses calculées à partir des frais plateforme réels.
                </p>
              </div>
            </div>
          </div>
        </section>

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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metric("Ambassadeurs actifs", totals.active)}
          {metric("Clics référés", totals.clicks)}
          {metric("Marge nette réalisée", formatCents(totals.fees))}
          {metric("Récompenses à payer", formatCents(totals.outstanding))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <form
            onSubmit={activate}
            className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <PlusCircle size={18} className="text-teal-700" aria-hidden />
              <h2 className="text-lg font-bold text-[#2C2C2A]">Activer un professeur</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Utilise l’identifiant stable <code className="font-mono">teachers.id</code>.
              L’utilisateur doit déjà être un professeur Pratiqo.
            </p>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Teacher ID
              <input
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
                required
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                placeholder="teacher_..."
              />
            </label>
            <label className="mt-3 block text-sm font-semibold text-slate-700">
              Code souhaité
              <input
                value={preferredCode}
                onChange={(event) => setPreferredCode(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                placeholder="marie-piano"
              />
            </label>
            <label className="mt-3 block text-sm font-semibold text-slate-700">
              Note interne
              <textarea
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                placeholder="Pourquoi ce professeur est sélectionné..."
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0B5845] disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
              Activer comme ambassadeur
            </button>
          </form>

          <section className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#2C2C2A]">Liste des ambassadeurs</h2>
                <p className="text-sm text-slate-600">
                  Les récompenses restent manuelles; aucun paiement automatique n’est lancé ici.
                </p>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-teal-500 sm:w-72"
                placeholder="Filtrer..."
              />
            </div>

            {loading ? (
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Chargement...
              </p>
            ) : filtered.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Aucun ambassadeur pour ce filtre.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {filtered.map((ambassador) => (
                  <Link
                    key={ambassador.ambassadorId}
                    href={`/admin/ambassadors/${ambassador.ambassadorId}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:bg-teal-50/40"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-base font-black text-[#2C2C2A]">
                            {ambassador.teacherName ?? ambassador.teacherId}
                          </h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadge(
                              ambassador.status,
                            )}`}
                          >
                            {statusLabel(ambassador.status)}
                          </span>
                        </div>
                        <p className="mt-1 break-all font-mono text-xs text-slate-500">
                          {ambassador.teacherId}
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {ambassador.primaryCode ? `/r/${ambassador.primaryCode}` : "Aucun lien"}
                          {ambassador.primaryDestinationPath ? (
                            <span className="text-slate-500">
                              {" "}
                              {"->"} {ambassador.primaryDestinationPath}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 self-start text-sm font-bold text-teal-700">
                        Détail
                        <ArrowRight size={16} aria-hidden />
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
                      {metric("Clics", ambassador.referralClicks)}
                      {metric("Learners", ambassador.referredLearners)}
                      {metric("Teachers", ambassador.referredTeachers)}
                      {metric("A payer", formatCents(ambassador.rewardsOutstandingCents))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
