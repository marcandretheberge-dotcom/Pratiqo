"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  AdminStripeDiagnosticLabel,
  AdminStripeDiagnosticsFilter,
  AdminStripeDiagnosticsResult,
  AdminStripeDiagnosticsTeacher,
} from "@/lib/admin/stripeDiagnostics";

type ApiPayload = {
  readOnly?: boolean;
  diagnostics?: AdminStripeDiagnosticsResult;
  error?: string;
};

const FILTERS: Array<{ id: AdminStripeDiagnosticsFilter; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "missing_stripe_account", label: "Sans compte Stripe" },
  { id: "onboarding_incomplete", label: "Onboarding incomplet" },
  { id: "charges_disabled", label: "Charges desactivees" },
  { id: "payouts_disabled", label: "Payouts desactives" },
  { id: "requirements_due", label: "Requirements dues" },
  { id: "sync_stale", label: "Sync stale" },
  { id: "identity_failed", label: "Identite failed" },
  { id: "possible_false_negative", label: "Faux negatif possible" },
  { id: "market_unsupported", label: "Marche non supporte" },
];

function emptyDiagnostics(): AdminStripeDiagnosticsResult {
  return {
    generatedAt: new Date(0).toISOString(),
    filter: "all",
    query: "",
    summary: {
      totalTeachers: 0,
      teachersWithStripeAccount: 0,
      teachersWithoutStripeAccount: 0,
      onboardingComplete: 0,
      chargesEnabled: 0,
      payoutsEnabled: 0,
      requirementsDueNonEmpty: 0,
      disabledReasonNonEmpty: 0,
      paymentReadyUnderCurrentLogic: 0,
      payoutReadyUnderCurrentLogic: 0,
      identityVerified: 0,
      identityPending: 0,
      identityFailed: 0,
      syncNeverRun: 0,
      syncStaleOver24h: 0,
      syncStaleOver7d: 0,
      possibleFalseNegatives: 0,
      marketNotSupported: 0,
      countryCodeMissing: 0,
    },
    teachers: [],
  };
}

async function adminFetch(path: string) {
  const { data: sess } = await getSupabaseClient().auth.getSession();
  const token = sess.session?.access_token ?? "";
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

function formatDate(value: string | null): string {
  if (!value) return "Jamais";
  try {
    return new Date(value).toLocaleString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function yesNo(value: boolean | null): string {
  if (value === true) return "Oui";
  if (value === false) return "Non";
  return "Non disponible";
}

function readinessClass(ready: boolean): string {
  return ready
    ? "border-teal-200 bg-teal-50 text-teal-800"
    : "border-rose-200 bg-rose-50 text-rose-800";
}

function freshnessClass(value: AdminStripeDiagnosticsTeacher["connect"]["syncFreshness"]): string {
  if (value === "fresh") return "border-teal-200 bg-teal-50 text-teal-800";
  if (value === "stale") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function actionSeverityClass(value: AdminStripeDiagnosticsTeacher["actionSummary"]["severity"]): string {
  if (value === "ok") return "border-teal-200 bg-teal-50 text-teal-800";
  if (value === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function actionOwnerLabel(value: AdminStripeDiagnosticsTeacher["actionSummary"]["owner"]): string {
  if (value === "teacher") return "Teacher";
  if (value === "admin") return "Admin";
  if (value === "stripe") return "Stripe";
  return "None";
}

function labelText(label: AdminStripeDiagnosticLabel): string {
  const labels: Record<AdminStripeDiagnosticLabel, string> = {
    missing_stripe_account: "Compte Stripe manquant",
    connect_started: "Connect commence",
    onboarding_incomplete: "Onboarding incomplet",
    onboarding_complete: "Onboarding complet",
    charges_enabled: "Charges activees",
    charges_disabled: "Charges desactivees",
    payouts_enabled: "Payouts actifs",
    payouts_disabled: "Payouts desactives",
    requirements_due_blocking_current_logic: "Requirements bloquantes",
    disabled_by_stripe: "Disabled by Stripe",
    market_not_supported: "Marche non supporte",
    country_code_missing: "Pays manquant",
    sync_never_run: "Sync jamais run",
    sync_stale_over_24h: "Sync > 24 h",
    sync_stale_over_7d: "Sync > 7 j",
    identity_verified: "Identite verifiee",
    identity_pending: "Identite en attente",
    identity_failed: "Identite echouee",
    identity_missing: "Identite manquante",
    possible_false_negative_from_collapsed_requirements: "Faux negatif possible",
  };
  return labels[label];
}

function labelClass(label: AdminStripeDiagnosticLabel): string {
  if (
    label === "onboarding_complete" ||
    label === "charges_enabled" ||
    label === "payouts_enabled" ||
    label === "identity_verified"
  ) {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }
  if (
    label === "possible_false_negative_from_collapsed_requirements" ||
    label === "sync_stale_over_24h" ||
    label === "sync_stale_over_7d" ||
    label === "requirements_due_blocking_current_logic"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (
    label === "disabled_by_stripe" ||
    label === "identity_failed" ||
    label === "charges_disabled" ||
    label === "payouts_disabled"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function renderBadges(labels: AdminStripeDiagnosticLabel[], fallback: string) {
  if (labels.length === 0) return <span className="text-sm text-slate-500">{fallback}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${labelClass(label)}`}
        >
          {labelText(label)}
        </span>
      ))}
    </div>
  );
}

export default function AdminStripeDiagnosticsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const isAdmin = (profile?.role as string | undefined) === "admin";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AdminStripeDiagnosticsFilter>("all");
  const [q, setQ] = useState("");
  const [diagnostics, setDiagnostics] = useState<AdminStripeDiagnosticsResult>(emptyDiagnostics);

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
      params.set("filter", filter);
      if (q.trim()) params.set("q", q.trim());
      const response = await adminFetch(`/api/admin/stripe-diagnostics?${params.toString()}`);
      const data = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok) throw new Error(data.error ?? "Erreur lors du chargement.");
      setDiagnostics(data.diagnostics ?? emptyDiagnostics());
    } catch (err) {
      setDiagnostics(emptyDiagnostics());
      setError(err instanceof Error ? err.message : "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, [filter, isAdmin, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const summaryCards = useMemo(
    () => [
      { label: "Professeurs", value: diagnostics.summary.totalTeachers },
      { label: "Avec compte Stripe", value: diagnostics.summary.teachersWithStripeAccount },
      { label: "Sans compte Stripe", value: diagnostics.summary.teachersWithoutStripeAccount },
      { label: "Onboarding complet", value: diagnostics.summary.onboardingComplete },
      { label: "Charges activees", value: diagnostics.summary.chargesEnabled },
      { label: "Payouts actifs", value: diagnostics.summary.payoutsEnabled },
      { label: "Requirements due", value: diagnostics.summary.requirementsDueNonEmpty },
      { label: "Disabled reason", value: diagnostics.summary.disabledReasonNonEmpty },
      { label: "Payment ready", value: diagnostics.summary.paymentReadyUnderCurrentLogic },
      { label: "Payout ready", value: diagnostics.summary.payoutReadyUnderCurrentLogic },
      { label: "Identite verifiee", value: diagnostics.summary.identityVerified },
      { label: "Identite pending", value: diagnostics.summary.identityPending },
      { label: "Identite failed", value: diagnostics.summary.identityFailed },
      { label: "Sync jamais run", value: diagnostics.summary.syncNeverRun },
      { label: "Sync > 24 h", value: diagnostics.summary.syncStaleOver24h },
      { label: "Sync > 7 j", value: diagnostics.summary.syncStaleOver7d },
      { label: "Faux negatifs possibles", value: diagnostics.summary.possibleFalseNegatives },
      { label: "Marche non supporte", value: diagnostics.summary.marketNotSupported },
      { label: "Pays manquant", value: diagnostics.summary.countryCodeMissing },
    ],
    [diagnostics.summary],
  );

  if (!user || !isAdmin) return null;

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm sm:p-7">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-teal-700"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Centre de controle
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <ShieldCheck size={24} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Admin seulement · lecture seule
                </p>
                <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] sm:text-3xl">
                  Diagnostics Stripe Connect
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                  Vue de diagnostic des champs Stripe Connect et Stripe Identity deja synchronises
                  en base. Cette page ne cree aucun compte, aucun lien d&apos;onboarding et n&apos;appelle pas
                  l&apos;API Stripe.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden />
              Rafraichir
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Rechercher nom, email ou ID Stripe"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setFilter(candidate.id)}
                  className={
                    filter === candidate.id
                      ? "rounded-full bg-teal-700 px-3 py-1.5 text-xs font-bold text-white"
                      : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50"
                  }
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <p className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle size={16} aria-hidden />
            {error}
          </p>
        ) : null}

        <section aria-labelledby="stripe-summary-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="stripe-summary-heading" className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              Resume
            </h2>
            {loading ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Chargement...
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500">
                Genere le {formatDate(diagnostics.generatedAt)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-[#DCEAE3] bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-[#0F6E56]">{card.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-[#2C2C2A]">Professeurs</h2>
            <p className="mt-1 text-sm text-slate-600">
              {diagnostics.teachers.length} resultat(s). Les IDs Stripe sont masques par defaut.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1460px] divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Country / market</th>
                  <th className="px-4 py-3">Connect status</th>
                  <th className="px-4 py-3">What this means / next action</th>
                  <th className="px-4 py-3">Payment readiness</th>
                  <th className="px-4 py-3">Payout readiness</th>
                  <th className="px-4 py-3">Identity status</th>
                  <th className="px-4 py-3">Sync freshness</th>
                  <th className="px-4 py-3">Blockers</th>
                  <th className="px-4 py-3">Warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diagnostics.teachers.map((teacher) => (
                  <tr key={teacher.userId} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{teacher.name ?? "Sans nom"}</p>
                      <p className="mt-1 text-xs text-slate-500">{teacher.email ?? "Email indisponible"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {teacher.maskedStripeAccountId ?? "Stripe: aucun compte"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">{teacher.countryCode ?? "Manquant"}</p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          teacher.marketPayoutSupported
                            ? "border-teal-200 bg-teal-50 text-teal-800"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        {teacher.marketPayoutSupported ? "Payout supporte" : "Payout bloque"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-xs text-slate-700">
                        <p>Onboarding: {yesNo(teacher.connect.onboardingComplete)}</p>
                        <p>Charges: {yesNo(teacher.connect.chargesEnabled)}</p>
                        <p>Payouts: {yesNo(teacher.connect.payoutsEnabled)}</p>
                        <p>Requirements: {teacher.connect.requirementsDue.length}</p>
                        {teacher.connect.disabledReason ? (
                          <p className="font-semibold text-rose-700">{teacher.connect.disabledReason}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${actionSeverityClass(
                              teacher.actionSummary.severity,
                            )}`}
                          >
                            Severity: {teacher.actionSummary.severity}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                            Owner: {actionOwnerLabel(teacher.actionSummary.owner)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            What this means
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {teacher.actionSummary.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            {teacher.actionSummary.explanation}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            What to do next
                          </p>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-700">
                            {teacher.actionSummary.nextSteps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${readinessClass(
                          teacher.currentLogic.paymentReady,
                        )}`}
                      >
                        {teacher.currentLogic.paymentReady ? "Ready" : "Blocked"}
                      </span>
                      <p className="mt-2 text-xs text-slate-500">
                        {teacher.currentLogic.paymentBlockers.join(", ") || "Aucun blocker"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${readinessClass(
                          teacher.currentLogic.payoutReady,
                        )}`}
                      >
                        {teacher.currentLogic.payoutReady ? "Ready" : "Blocked"}
                      </span>
                      <p className="mt-2 text-xs text-slate-500">
                        {teacher.currentLogic.payoutBlockers.join(", ") || "Aucun blocker"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold capitalize text-slate-900">{teacher.identity.status}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Stripe: {teacher.identity.stripeIdentityStatus ?? "none"}
                      </p>
                      {teacher.identity.failedReason ? (
                        <p className="mt-1 text-xs font-semibold text-rose-700">
                          {teacher.identity.failedReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${freshnessClass(
                          teacher.connect.syncFreshness,
                        )}`}
                      >
                        {teacher.connect.syncFreshness}
                      </span>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(teacher.connect.lastSyncedAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {renderBadges(
                        teacher.labels.filter(
                          (label) =>
                            label === "missing_stripe_account" ||
                            label === "onboarding_incomplete" ||
                            label === "charges_disabled" ||
                            label === "payouts_disabled" ||
                            label === "requirements_due_blocking_current_logic" ||
                            label === "disabled_by_stripe" ||
                            label === "market_not_supported" ||
                            label === "country_code_missing",
                        ),
                        "Aucun blocker",
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {renderBadges(teacher.warnings, "Aucun warning")}
                      {teacher.connect.requirementsDue.length > 0 ? (
                        <details className="mt-2 text-xs text-slate-600">
                          <summary className="cursor-pointer font-semibold text-slate-700">
                            Requirements raw
                          </summary>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {teacher.connect.requirementsDueDetails.map((item) => (
                              <li key={item.raw}>
                                <span className="font-mono text-[11px] text-slate-700">{item.raw}</span>
                                <span className="mx-1 text-slate-400">=</span>
                                <span className="font-semibold text-slate-800">{item.friendly}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!loading && diagnostics.teachers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                      Aucun professeur ne correspond a ce filtre.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
