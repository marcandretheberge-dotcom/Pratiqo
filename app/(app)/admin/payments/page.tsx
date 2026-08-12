"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  CreditCard,
  Loader2,
  Search,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  ADMIN_OPS_UNAVAILABLE,
  ADMIN_PAYMENT_STATUSES,
  type AdminAttentionLabel,
  type AdminPaymentOpsRow,
  type AdminPaymentsSummary,
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

function formatMoneyCents(cents: number | null, currency = "CAD"): string {
  if (cents === null || Number.isNaN(cents)) return ADMIN_OPS_UNAVAILABLE;
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: currency || "CAD",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
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
  if (status === "paid") return "bg-teal-50 text-teal-800 border-teal-200";
  if (status === "unpaid" || status === "requires_action") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  if (status === "failed" || status === "disputed") {
    return "bg-rose-50 text-rose-800 border-rose-200";
  }
  if (status === "refunded" || status === "partially_refunded") {
    return "bg-orange-50 text-orange-800 border-orange-200";
  }
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

async function adminFetch(path: string) {
  const { data: sess } = await getSupabaseClient().auth.getSession();
  const token = sess.session?.access_token ?? "";
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

function emptySummary(): AdminPaymentsSummary {
  return {
    count: 0,
    grossCents: 0,
    platformFeeCents: 0,
    teacherNetCents: 0,
    creditsAppliedTotal: 0,
    failedOrPending: 0,
    refundOrDispute: 0,
  };
}

function AdminPaymentsInner() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = (profile?.role as string | undefined) === "admin";

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<AdminPaymentOpsRow[]>([]);
  const [summary, setSummary] = useState<AdminPaymentsSummary>(emptySummary);
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

      const res = await adminFetch(`/api/admin/payments?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        payments?: AdminPaymentOpsRow[];
        summary?: AdminPaymentsSummary;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement.");
      setPayments(data.payments ?? []);
      setSummary(data.summary ?? emptySummary());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du chargement.");
      setPayments([]);
      setSummary(emptySummary());
    } finally {
      setLoading(false);
    }
  }, [from, isAdmin, needsAttention, q, searchParams, status, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => payments.find((p) => p.id === selectedId) ?? null,
    [payments, selectedId],
  );

  const cards = [
    { label: "Paiements bruts", value: formatMoneyCents(summary.grossCents) },
    {
      label: "Commission plateforme",
      value: formatMoneyCents(summary.platformFeeCents),
    },
    {
      label: "Versements profs",
      value: formatMoneyCents(summary.teacherNetCents),
    },
    {
      label: "Crédits appliqués",
      value: formatMoneyDollars(summary.creditsAppliedTotal),
    },
    { label: "Échoués / en attente", value: String(summary.failedOrPending) },
    { label: "Rembours. / litiges", value: String(summary.refundOrDispute) },
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
            <h1 className="text-2xl font-semibold text-slate-900">Paiements</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Suivre les paiements, crédits, commissions, Stripe et versements.
            </p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
              Admin seulement · lecture seule
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            Voir les réservations →
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
            <p className="mt-1 text-lg font-semibold text-slate-900">{c.value}</p>
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
          Statut paiement
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Tous</option>
            {ADMIN_PAYMENT_STATUSES.map((s) => (
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
              placeholder="Élève, prof, PI, booking…"
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
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
          <CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          Aucun paiement pour ces filtres.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Id</th>
                    <th className="px-3 py-2 font-medium">Booking</th>
                    <th className="px-3 py-2 font-medium">Créé</th>
                    <th className="px-3 py-2 font-medium">Élève</th>
                    <th className="px-3 py-2 font-medium">Prof</th>
                    <th className="px-3 py-2 font-medium">Brut</th>
                    <th className="px-3 py-2 font-medium">Commission</th>
                    <th className="px-3 py-2 font-medium">Prof net</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Versement</th>
                    <th className="px-3 py-2 font-medium">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "cursor-pointer border-b border-slate-100 hover:bg-teal-50/40",
                        selectedId === p.id && "bg-teal-50/60",
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{p.shortId}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {p.bookingId.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="max-w-[9rem] truncate px-3 py-2 text-xs">
                        {personLabel(p.student)}
                      </td>
                      <td className="max-w-[9rem] truncate px-3 py-2 text-xs">
                        {personLabel(p.teacher)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {formatMoneyCents(p.amountCents, p.currency ?? "CAD")}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {formatMoneyCents(p.platformFeeCents, p.currency ?? "CAD")}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {formatMoneyCents(p.teacherNetCents, p.currency ?? "CAD")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs",
                            statusBadgeClass(p.paymentStatus ?? ""),
                          )}
                        >
                          {p.paymentStatus ?? ADMIN_OPS_UNAVAILABLE}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {p.transferStatus ?? ADMIN_OPS_UNAVAILABLE}
                      </td>
                      <td className="px-3 py-2">
                        {p.attentionLabels.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.attentionLabels.map((l) => (
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
              {payments.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "w-full rounded-lg border border-slate-200 p-3 text-left",
                    selectedId === p.id && "border-teal-300 bg-teal-50/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">{p.shortId}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs",
                        statusBadgeClass(p.paymentStatus ?? ""),
                      )}
                    >
                      {p.paymentStatus ?? ADMIN_OPS_UNAVAILABLE}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {formatMoneyCents(p.amountCents, p.currency ?? "CAD")}
                  </p>
                  <p className="text-xs text-slate-600">{personLabel(p.student)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(p.createdAt)} · versement{" "}
                    {p.transferStatus ?? ADMIN_OPS_UNAVAILABLE}
                  </p>
                  {p.attentionLabels.length > 0 ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {p.attentionLabels.join(" · ")}
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
                Sélectionnez un paiement pour voir le détail opérationnel.
              </p>
            ) : (
              <dl className="mt-3 space-y-3 text-sm">
                <Detail label="Id" value={selected.id} mono />
                <Detail label="Booking" value={selected.bookingId} mono />
                <Detail label="Créé" value={formatDate(selected.createdAt)} />
                <Detail label="Mis à jour" value={formatDate(selected.updatedAt)} />
                <Detail label="Élève" value={personLabel(selected.student)} />
                <Detail label="Prof" value={personLabel(selected.teacher)} />
                <Detail
                  label="Montant brut"
                  value={formatMoneyCents(selected.amountCents, selected.currency ?? "CAD")}
                />
                <Detail
                  label="Sous-total"
                  value={formatMoneyCents(selected.subtotalCents, selected.currency ?? "CAD")}
                />
                <Detail
                  label="Commission plateforme"
                  value={formatMoneyCents(
                    selected.platformFeeCents,
                    selected.currency ?? "CAD",
                  )}
                />
                <Detail
                  label="Net professeur"
                  value={formatMoneyCents(
                    selected.teacherNetCents,
                    selected.currency ?? "CAD",
                  )}
                />
                <Detail
                  label="Crédits appliqués"
                  value={
                    selected.creditsApplied != null
                      ? formatMoneyDollars(selected.creditsApplied)
                      : ADMIN_OPS_UNAVAILABLE
                  }
                />
                <Detail
                  label="Code promo"
                  value={selected.promoCode ?? ADMIN_OPS_UNAVAILABLE}
                />
                <Detail
                  label="Frais Stripe"
                  value={
                    selected.stripeFeeCents != null
                      ? formatMoneyCents(selected.stripeFeeCents, selected.currency ?? "CAD")
                      : ADMIN_OPS_UNAVAILABLE
                  }
                />
                <Detail
                  label="Statut paiement"
                  value={selected.paymentStatus ?? ADMIN_OPS_UNAVAILABLE}
                />
                <Detail
                  label="Statut versement"
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
                  label="Charge"
                  value={selected.stripeChargeId ?? ADMIN_OPS_UNAVAILABLE}
                  mono
                />
                <Detail
                  label="Transfer"
                  value={selected.stripeTransferId ?? ADMIN_OPS_UNAVAILABLE}
                  mono
                />
                <Detail
                  label="Échec"
                  value={selected.failureReason ?? ADMIN_OPS_UNAVAILABLE}
                />
                <Detail
                  label="Signaux"
                  value={
                    selected.attentionLabels.length
                      ? selected.attentionLabels.join(", ")
                      : "Aucun"
                  }
                />
                {selected.bookingId ? (
                  <div>
                    <Link
                      href={`/admin/bookings?q=${encodeURIComponent(selected.bookingId.slice(0, 8))}`}
                      className="text-xs font-medium text-teal-700 hover:underline"
                    >
                      Voir la réservation →
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

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </div>
      }
    >
      <AdminPaymentsInner />
    </Suspense>
  );
}
