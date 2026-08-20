"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  Loader2,
  Search,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AdminBookingOfferSnapshotSection } from "@/components/admin/AdminBookingOfferSnapshotSection";
import { adminOfferListLabel } from "@/components/admin/AdminPaymentSourceSection";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { adminOfferSnapshotViewStateFromFields } from "@/lib/offers/adminOfferSnapshotDisplay";
import { cn } from "@/lib/utils";
import {
  ADMIN_BOOKING_STATUSES,
  ADMIN_OPS_UNAVAILABLE,
  type AdminAttentionLabel,
  type AdminBookingOpsRow,
  type AdminBookingsSummary,
} from "@/lib/admin/bookingPaymentOperations";

function formatDate(iso: string | null): string {
  if (!iso) return ADMIN_OPS_UNAVAILABLE;
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

function formatMoneyDollars(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) return ADMIN_OPS_UNAVAILABLE;
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} $`;
  }
}

function personLabel(p: { name: string | null; email: string | null } | null): string {
  if (!p) return ADMIN_OPS_UNAVAILABLE;
  if (p.name && p.email) return `${p.name} · ${p.email}`;
  return p.name || p.email || ADMIN_OPS_UNAVAILABLE;
}

function statusBadgeClass(status: string): string {
  if (status === "confirmed" || status === "completed") {
    return "bg-teal-50 text-teal-800 border-teal-200";
  }
  if (status === "pending_payment") return "bg-amber-50 text-amber-800 border-amber-200";
  if (status.startsWith("cancelled")) return "bg-rose-50 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function attentionBadgeClass(label: AdminAttentionLabel): string {
  if (label === "Problème paiement" || label === "Données incohérentes") {
    return "bg-rose-50 text-rose-800 border-rose-200";
  }
  if (label === "Stripe prof incomplet") return "bg-orange-50 text-orange-800 border-orange-200";
  if (label === "Réservation en attente") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function teachingModeLabel(mode: string | null): string {
  if (!mode) return ADMIN_OPS_UNAVAILABLE;
  const m = mode.toLowerCase();
  if (m === "online" || m === "en_ligne" || m === "virtual") return "En ligne";
  if (m === "in_person" || m === "in-person" || m === "presentiel" || m === "présentiel") {
    return "Présentiel";
  }
  if (m === "both" || m === "hybrid") return "Les deux";
  return mode;
}

async function adminFetch(path: string) {
  const { data: sess } = await getSupabaseClient().auth.getSession();
  const token = sess.session?.access_token ?? "";
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

function emptySummary(): AdminBookingsSummary {
  return {
    total: 0,
    pendingPayment: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    needsAttention: 0,
  };
}

function AdminBookingsInner() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = (profile?.role as string | undefined) === "admin";

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<AdminBookingOpsRow[]>([]);
  const [summary, setSummary] = useState<AdminBookingsSummary>(emptySummary);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [needsAttention, setNeedsAttention] = useState(
    searchParams.get("needsAttention") === "1",
  );

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
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (needsAttention) params.set("needsAttention", "1");
      const studentId = searchParams.get("studentId");
      const teacherId = searchParams.get("teacherId");
      if (studentId) params.set("studentId", studentId);
      if (teacherId) params.set("teacherId", teacherId);

      const res = await adminFetch(`/api/admin/bookings?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        bookings?: AdminBookingOpsRow[];
        summary?: AdminBookingsSummary;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement.");
      setBookings(data.bookings ?? []);
      setSummary(data.summary ?? emptySummary());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du chargement.");
      setBookings([]);
      setSummary(emptySummary());
    } finally {
      setLoading(false);
    }
  }, [from, isAdmin, needsAttention, q, searchParams, status, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => bookings.find((b) => b.id === selectedId) ?? null,
    [bookings, selectedId],
  );

  const cards = [
    { label: "Total", value: summary.total },
    { label: "En attente de paiement", value: summary.pendingPayment },
    { label: "Confirmées", value: summary.confirmed },
    { label: "Terminées", value: summary.completed },
    { label: "Annulées", value: summary.cancelled },
    { label: "À surveiller", value: summary.needsAttention },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-teal-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Centre de contrôle
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Réservations</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Suivre les demandes, cours confirmés, annulations et situations à
              traiter.
            </p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
              Admin seulement · lecture seule
            </p>
          </div>
          <Link
            href="/admin/payments"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            Voir les paiements →
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <form
        className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-slate-600">
          Statut
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Tous</option>
            {ADMIN_BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-[2] flex-col gap-1 text-xs text-slate-600">
          Recherche
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Élève, prof, id…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm"
            />
          </div>
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1 text-xs text-slate-600">
          Du
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1 text-xs text-slate-600">
          Au
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={needsAttention}
            onChange={(e) => setNeedsAttention(e.target.checked)}
            className="rounded border-slate-300 text-teal-700"
          />
          À surveiller
        </label>
        <button
          type="submit"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Filtrer
        </button>
      </form>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
          <CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          Aucune réservation pour ces filtres.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Id</th>
                    <th className="px-3 py-2 font-medium">Créée</th>
                    <th className="px-3 py-2 font-medium">Cours</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Élève</th>
                    <th className="px-3 py-2 font-medium">Prof</th>
                    <th className="px-3 py-2 font-medium">Format</th>
                    <th className="px-3 py-2 font-medium">Offre</th>
                    <th className="px-3 py-2 font-medium">Montant</th>
                    <th className="px-3 py-2 font-medium">Paiement</th>
                    <th className="px-3 py-2 font-medium">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      className={cn(
                        "cursor-pointer border-b border-slate-100 hover:bg-teal-50/40",
                        selectedId === b.id && "bg-teal-50/60",
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{b.shortId}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {formatDate(b.createdAt)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {b.lessonDate
                          ? `${b.lessonDate}${b.lessonTime ? ` ${b.lessonTime}` : ""}`
                          : ADMIN_OPS_UNAVAILABLE}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs",
                            statusBadgeClass(b.status),
                          )}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2 text-xs">
                        {personLabel(b.student)}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2 text-xs">
                        {personLabel(b.teacher)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {teachingModeLabel(b.teachingMode)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {adminOfferListLabel(
                          adminOfferSnapshotViewStateFromFields(b),
                          t,
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{formatMoneyDollars(b.price)}</td>
                      <td className="px-3 py-2 text-xs">
                        {b.paymentStatus ?? ADMIN_OPS_UNAVAILABLE}
                      </td>
                      <td className="px-3 py-2">
                        {b.attentionLabels.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {b.attentionLabels.map((l) => (
                              <span
                                key={l}
                                className={cn(
                                  "inline-flex rounded-full border px-1.5 py-0.5 text-[10px]",
                                  attentionBadgeClass(l),
                                )}
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {bookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className={cn(
                    "w-full rounded-lg border border-slate-200 p-3 text-left",
                    selectedId === b.id && "border-teal-300 bg-teal-50/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">{b.shortId}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs",
                        statusBadgeClass(b.status),
                      )}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {personLabel(b.student)}
                  </p>
                  <p className="text-xs text-slate-600">Prof · {personLabel(b.teacher)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(b.createdAt)} · {formatMoneyDollars(b.price)}
                  </p>
                  {b.attentionLabels.length > 0 ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {b.attentionLabels.join(" · ")}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Détail</h2>
            {!selected ? (
              <p className="mt-3 text-sm text-slate-500">
                Sélectionnez une réservation pour voir le détail opérationnel.
              </p>
            ) : (
              <dl className="mt-3 space-y-3 text-sm">
                <Detail label="Id" value={selected.id} mono />
                <Detail label="Statut" value={selected.status} />
                <Detail label="Créée" value={formatDate(selected.createdAt)} />
                <Detail
                  label="Mise à jour"
                  value={formatDate(selected.updatedAt)}
                />
                <Detail
                  label="Date du cours"
                  value={
                    selected.lessonDate
                      ? `${selected.lessonDate}${selected.lessonTime ? ` ${selected.lessonTime}` : ""}`
                      : ADMIN_OPS_UNAVAILABLE
                  }
                />
                <Detail
                  label="Type / sujet"
                  value={selected.lessonType ?? ADMIN_OPS_UNAVAILABLE}
                />
                <Detail
                  label="Format"
                  value={teachingModeLabel(selected.teachingMode)}
                />
                <Detail
                  label="Durée"
                  value={
                    selected.durationMinutes != null
                      ? `${selected.durationMinutes} min`
                      : ADMIN_OPS_UNAVAILABLE
                  }
                />
                <Detail label="Élève" value={personLabel(selected.student)} />
                <Detail label="Prof" value={personLabel(selected.teacher)} />
                <Detail label="Montant" value={formatMoneyDollars(selected.price)} />
                <Detail
                  label="Crédits appliqués"
                  value={
                    selected.creditsApplied != null
                      ? formatMoneyDollars(selected.creditsApplied)
                      : ADMIN_OPS_UNAVAILABLE
                  }
                />
                <Detail
                  label="Statut paiement"
                  value={selected.paymentStatus ?? ADMIN_OPS_UNAVAILABLE}
                />
                <Detail
                  label="Versement"
                  value={selected.transferStatus ?? ADMIN_OPS_UNAVAILABLE}
                />
                <Detail
                  label="Remboursement"
                  value={selected.refundStatus ?? ADMIN_OPS_UNAVAILABLE}
                />
                <Detail
                  label="PaymentIntent"
                  value={selected.stripePaymentIntentId ?? ADMIN_OPS_UNAVAILABLE}
                  mono
                />
                <Detail
                  label="Checkout Session"
                  value={selected.stripeCheckoutSessionId ?? ADMIN_OPS_UNAVAILABLE}
                  mono
                />
                <Detail
                  label="Notes admin"
                  value={ADMIN_OPS_UNAVAILABLE}
                />
                <Detail
                  label="Signaux"
                  value={
                    selected.attentionLabels.length
                      ? selected.attentionLabels.join(", ")
                      : "Aucun"
                  }
                />
                <AdminBookingOfferSnapshotSection
                  snapshotState={adminOfferSnapshotViewStateFromFields(selected)}
                  pricingSource={selected.pricingSource}
                />
                {selected.student?.id ? (
                  <div>
                    <Link
                      href={`/admin/payments?studentId=${selected.student.id}`}
                      className="text-xs font-medium text-teal-700 hover:underline"
                    >
                      Paiements de cet élève →
                    </Link>
                  </div>
                ) : null}
              </dl>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 break-all text-slate-900",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </div>
      }
    >
      <AdminBookingsInner />
    </Suspense>
  );
}
