"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ChevronLeft,
  Loader2,
  PauseCircle,
  Plus,
  TicketPercent,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  STUDENT_CREDIT_REASON_CODES,
  type StudentCreditReasonCode,
} from "@/lib/admin/studentCreditConstants";

type PromoRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "fixed_amount" | "percent";
  amount_cents: number | null;
  percent_off: number | null;
  currency: string;
  status: "active" | "paused" | "expired" | "archived";
  starts_at: string | null;
  expires_at: string | null;
  max_total_redemptions: number | null;
  max_redemptions_per_user: number | null;
  new_students_only: boolean;
  market_code: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type CreditRow = {
  id: string;
  student_profile_id: string;
  amount_cents: number;
  currency: string;
  remaining_cents: number;
  status: "active" | "used" | "expired" | "voided";
  reason_code: string;
  reason_note: string;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
};

type StudentOption = {
  id: string;
  email: string | null;
  name: string | null;
};

const REASON_LABELS: Record<StudentCreditReasonCode, string> = {
  support_compensation: "Compensation support",
  contest_prize: "Prix de concours",
  local_promotion: "Promotion locale",
  payment_issue: "Problème de paiement",
  admin_test: "Test admin",
  goodwill: "Geste commercial",
  other: "Autre",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatMoneyCents(cents: number, currency = "CAD"): string {
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function statusBadgeClass(status: string): string {
  if (status === "active") return "bg-teal-50 text-teal-800 border-teal-200";
  if (status === "paused") return "bg-amber-50 text-amber-800 border-amber-200";
  if (status === "voided" || status === "expired") return "bg-rose-50 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

async function adminFetch(path: string, init?: RequestInit) {
  const { data: sess } = await getSupabaseClient().auth.getSession();
  const token = sess.session?.access_token ?? "";
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

export default function AdminPromotionsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm text-slate-600">Chargement…</p>
          </div>
        </main>
      }
    >
      <AdminPromotionsPageInner />
    </Suspense>
  );
}

function AdminPromotionsPageInner() {
  // Layout already runs requireAdminPage(); client guard is UX only.
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = (profile?.role as string | undefined) === "admin";
  const initialStudentId = searchParams.get("studentId")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [promoForm, setPromoForm] = useState({
    code: "",
    description: "",
    discountType: "percent" as "fixed_amount" | "percent",
    amountCents: "",
    percentOff: "10",
    currency: "CAD",
    startsAt: "",
    expiresAt: "",
    maxTotalRedemptions: "",
    maxRedemptionsPerUser: "1",
    newStudentsOnly: false,
    marketCode: "",
  });

  const [creditForm, setCreditForm] = useState({
    studentProfileId: initialStudentId,
    amountDollars: "",
    currency: "CAD",
    reasonCode: "support_compensation" as StudentCreditReasonCode,
    reasonNote: "",
    expiresAt: "",
  });

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router, user]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setFlash(null);
    try {
      const studentId = creditForm.studentProfileId.trim();
      const creditsUrl = studentId
        ? `/api/admin/student-credits?studentId=${encodeURIComponent(studentId)}`
        : "/api/admin/student-credits";

      const [promosRes, creditsRes, usersRes] = await Promise.all([
        adminFetch("/api/admin/promotions"),
        adminFetch(creditsUrl),
        adminFetch("/api/admin/users?q="),
      ]);

      const promosData = (await promosRes.json().catch(() => ({}))) as {
        promos?: PromoRow[];
        error?: string;
      };
      if (!promosRes.ok) throw new Error(promosData.error ?? "Erreur codes promo.");

      const creditsData = (await creditsRes.json().catch(() => ({}))) as {
        credits?: CreditRow[];
        error?: string;
      };
      if (!creditsRes.ok) throw new Error(creditsData.error ?? "Erreur crédits.");

      const usersData = (await usersRes.json().catch(() => ({}))) as {
        users?: Array<{ id: string; email: string | null; name: string | null; role: string }>;
        error?: string;
      };
      if (!usersRes.ok) throw new Error(usersData.error ?? "Erreur utilisateurs.");

      setPromos(promosData.promos ?? []);
      setCredits(creditsData.credits ?? []);
      setStudents(
        (usersData.users ?? [])
          .filter((u) => u.role === "student")
          .map((u) => ({ id: u.id, email: u.email, name: u.name })),
      );
    } catch (e) {
      setFlash({
        kind: "err",
        text: e instanceof Error ? e.message : "Chargement impossible.",
      });
    } finally {
      setLoading(false);
    }
  }, [creditForm.studentProfileId]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    void loadAll();
  }, [user, isAdmin, loadAll]);

  const creditTotals = useMemo(() => {
    const granted = credits.reduce((s, c) => s + c.amount_cents, 0);
    const remaining = credits
      .filter((c) => c.status === "active")
      .reduce((s, c) => s + c.remaining_cents, 0);
    return { granted, remaining, activeCount: credits.filter((c) => c.status === "active").length };
  }, [credits]);

  const createPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create-promo");
    setFlash(null);
    try {
      const amountCents =
        promoForm.discountType === "fixed_amount"
          ? Math.round(Number(promoForm.amountCents) * 100)
          : undefined;
      const res = await adminFetch("/api/admin/promotions", {
        method: "POST",
        body: JSON.stringify({
          code: promoForm.code,
          description: promoForm.description || null,
          discountType: promoForm.discountType,
          amountCents,
          percentOff:
            promoForm.discountType === "percent" ? Number(promoForm.percentOff) : undefined,
          currency: promoForm.currency,
          startsAt: promoForm.startsAt || null,
          expiresAt: promoForm.expiresAt || null,
          maxTotalRedemptions: promoForm.maxTotalRedemptions
            ? Number(promoForm.maxTotalRedemptions)
            : null,
          maxRedemptionsPerUser: promoForm.maxRedemptionsPerUser
            ? Number(promoForm.maxRedemptionsPerUser)
            : null,
          newStudentsOnly: promoForm.newStudentsOnly,
          marketCode: promoForm.marketCode || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Création impossible.");
      setFlash({ kind: "ok", text: "Code promo créé. Action journalisée." });
      setPromoForm((f) => ({ ...f, code: "", description: "" }));
      await loadAll();
    } catch (err) {
      setFlash({
        kind: "err",
        text: err instanceof Error ? err.message : "Création impossible.",
      });
    } finally {
      setBusy(null);
    }
  };

  const setPromoStatus = async (id: string, action: "pause" | "archive") => {
    const label = action === "pause" ? "mettre en pause" : "archiver";
    if (
      !window.confirm(
        `Confirmer : ${label} ce code promo ?\n\nCette action est journalisée. Elle n'affecte pas Stripe ni le paiement.`,
      )
    ) {
      return;
    }
    setBusy(`${action}-${id}`);
    setFlash(null);
    try {
      const res = await adminFetch(`/api/admin/promotions/${id}/${action}`, {
        method: "POST",
        body: "{}",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Mise à jour impossible.");
      setFlash({ kind: "ok", text: `Code promo ${action === "pause" ? "en pause" : "archivé"}.` });
      await loadAll();
    } catch (err) {
      setFlash({
        kind: "err",
        text: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    } finally {
      setBusy(null);
    }
  };

  const grantCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("grant-credit");
    setFlash(null);
    try {
      const dollars = Number(creditForm.amountDollars);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        throw new Error("Montant invalide.");
      }
      const amountCents = Math.round(dollars * 100);
      const res = await adminFetch("/api/admin/student-credits", {
        method: "POST",
        body: JSON.stringify({
          studentProfileId: creditForm.studentProfileId,
          amountCents,
          currency: creditForm.currency,
          reasonCode: creditForm.reasonCode,
          reasonNote: creditForm.reasonNote,
          expiresAt: creditForm.expiresAt || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Attribution impossible.");
      setFlash({
        kind: "ok",
        text: "Crédit accordé et ajouté au solde utilisable de l'apprenant. Action journalisée.",
      });
      setCreditForm((f) => ({ ...f, amountDollars: "", reasonNote: "" }));
      await loadAll();
    } catch (err) {
      setFlash({
        kind: "err",
        text: err instanceof Error ? err.message : "Attribution impossible.",
      });
    } finally {
      setBusy(null);
    }
  };

  const voidCredit = async (id: string) => {
    if (
      !window.confirm(
        "Annuler ce crédit ?\n\nPossible seulement s'il est encore entièrement inutilisé et que le solde disponible couvre le montant. Cette action est journalisée et retire le montant du solde utilisable.",
      )
    ) {
      return;
    }
    const reason = window.prompt(
      "Raison d'annulation obligatoire (journalisée) :",
    );
    if (reason === null) return;
    if (!reason.trim()) {
      setFlash({ kind: "err", text: "Une raison d'annulation est obligatoire." });
      return;
    }
    setBusy(`void-${id}`);
    setFlash(null);
    try {
      const res = await adminFetch(`/api/admin/student-credits/${id}/void`, {
        method: "POST",
        body: JSON.stringify({ voidReason: reason.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Annulation impossible.");
      setFlash({ kind: "ok", text: "Crédit annulé. Action journalisée." });
      await loadAll();
    } catch (err) {
      setFlash({
        kind: "err",
        text: err instanceof Error ? err.message : "Annulation impossible.",
      });
    } finally {
      setBusy(null);
    }
  };

  if (!user || !isAdmin) {
    return (
      <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-600">Vérification de l&apos;accès admin…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8" data-testid="admin-promotions-page">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
          >
            <ChevronLeft size={16} aria-hidden />
            Retour au tableau de bord
          </Link>
          <div className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Espace admin
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#2C2C2A]">Promotions & crédits</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Les crédits apprenants accordés ici sont ajoutés au solde utilisable de
              l&apos;apprenant et peuvent être appliqués au paiement selon les règles
              existantes de Pratiqo. Les codes promo restent une fondation admin seulement —
              pas encore appliqués au paiement.
            </p>
          </div>
        </div>

        {flash ? (
          <div
            role="status"
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm font-medium",
              flash.kind === "ok"
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : "border-rose-200 bg-rose-50 text-rose-900",
            )}
          >
            {flash.text}
          </div>
        ) : null}

        {/* ── Codes promo ─────────────────────────────────────────── */}
        <section
          className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
          data-admin-section="promo-codes"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <TicketPercent size={20} aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                Codes promo
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Registre interne. Usage au paiement : non disponible pour l&apos;instant.
              </p>
            </div>
          </div>

          <form
            onSubmit={createPromo}
            className="mt-5 grid gap-3 rounded-2xl border border-[#E6F1EC] bg-[#F8FCFB] p-4 md:grid-cols-2"
            data-testid="admin-promo-create-form"
          >
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Code</span>
              <input
                required
                value={promoForm.code}
                onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
                placeholder="TEST10"
                data-testid="admin-promo-code-input"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Description</span>
              <input
                value={promoForm.description}
                onChange={(e) => setPromoForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Type</span>
              <select
                value={promoForm.discountType}
                onChange={(e) =>
                  setPromoForm((f) => ({
                    ...f,
                    discountType: e.target.value as "fixed_amount" | "percent",
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              >
                <option value="percent">Pourcentage</option>
                <option value="fixed_amount">Montant fixe</option>
              </select>
            </label>
            {promoForm.discountType === "percent" ? (
              <label className="text-sm">
                <span className="font-semibold text-slate-700">Pourcentage (%)</span>
                <input
                  required
                  type="number"
                  min={0.01}
                  max={100}
                  step="0.01"
                  value={promoForm.percentOff}
                  onChange={(e) => setPromoForm((f) => ({ ...f, percentOff: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
                />
              </label>
            ) : (
              <label className="text-sm">
                <span className="font-semibold text-slate-700">Montant (CAD)</span>
                <input
                  required
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={promoForm.amountCents}
                  onChange={(e) => setPromoForm((f) => ({ ...f, amountCents: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
                />
              </label>
            )}
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Devise</span>
              <input
                value={promoForm.currency}
                onChange={(e) => setPromoForm((f) => ({ ...f, currency: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Marché (optionnel)</span>
              <input
                value={promoForm.marketCode}
                onChange={(e) => setPromoForm((f) => ({ ...f, marketCode: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
                placeholder="CA"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Date de début</span>
              <input
                type="datetime-local"
                value={promoForm.startsAt}
                onChange={(e) => setPromoForm((f) => ({ ...f, startsAt: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Date d&apos;expiration</span>
              <input
                type="datetime-local"
                value={promoForm.expiresAt}
                onChange={(e) => setPromoForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Limite totale</span>
              <input
                type="number"
                min={1}
                value={promoForm.maxTotalRedemptions}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, maxTotalRedemptions: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Limite par utilisateur</span>
              <input
                type="number"
                min={1}
                value={promoForm.maxRedemptionsPerUser}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, maxRedemptionsPerUser: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={promoForm.newStudentsOnly}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, newStudentsOnly: e.target.checked }))
                }
              />
              <span className="font-semibold text-slate-700">Nouveaux apprenants seulement</span>
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy === "create-promo"}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              >
                {busy === "create-promo" ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Plus size={16} aria-hidden />
                )}
                Créer le code promo
              </button>
            </div>
          </form>

          <div className="mt-5 overflow-x-auto">
            {loading ? (
              <p className="text-sm text-slate-500">Chargement…</p>
            ) : promos.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun code promo pour l&apos;instant.</p>
            ) : (
              <table className="min-w-full text-left text-sm" data-testid="admin-promo-table">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Code</th>
                    <th className="px-2 py-2">Statut</th>
                    <th className="px-2 py-2">Rabais</th>
                    <th className="px-2 py-2">Expiration</th>
                    <th className="px-2 py-2">Usage</th>
                    <th className="px-2 py-2">Créé</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p) => (
                    <tr key={p.id} className="border-t border-[#E6F1EC]">
                      <td className="px-2 py-3 font-semibold text-[#2C2C2A]">{p.code}</td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-bold",
                            statusBadgeClass(p.status),
                          )}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        {p.discount_type === "percent"
                          ? `${p.percent_off} %`
                          : formatMoneyCents(p.amount_cents ?? 0, p.currency)}
                      </td>
                      <td className="px-2 py-3">{formatDate(p.expires_at)}</td>
                      <td className="px-2 py-3 text-slate-500">Non disponible</td>
                      <td className="px-2 py-3">{formatDate(p.created_at)}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          {p.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => void setPromoStatus(p.id, "pause")}
                              disabled={busy === `pause-${p.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900"
                            >
                              <PauseCircle size={14} aria-hidden />
                              Pause
                            </button>
                          ) : null}
                          {p.status !== "archived" ? (
                            <button
                              type="button"
                              onClick={() => void setPromoStatus(p.id, "archive")}
                              disabled={busy === `archive-${p.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              <Archive size={14} aria-hidden />
                              Archiver
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Crédits apprenants ──────────────────────────────────── */}
        <section
          className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
          data-admin-section="student-credits"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Wallet size={20} aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                Crédits apprenants
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Attribution manuelle avec raison obligatoire. Le montant est ajouté au solde
                utilisable (`credit_balance`). L&apos;annulation n&apos;est possible que si le
                crédit est encore entièrement inutilisé.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Total accordé : {formatMoneyCents(creditTotals.granted)} · Restant actif :{" "}
                {formatMoneyCents(creditTotals.remaining)} · Actifs : {creditTotals.activeCount}
              </p>
            </div>
          </div>

          <form
            onSubmit={grantCredit}
            className="mt-5 grid gap-3 rounded-2xl border border-[#E6F1EC] bg-[#F8FCFB] p-4 md:grid-cols-2"
            data-testid="admin-credit-grant-form"
          >
            <label className="text-sm md:col-span-2">
              <span className="font-semibold text-slate-700">Apprenant</span>
              <select
                required
                value={creditForm.studentProfileId}
                onChange={(e) =>
                  setCreditForm((f) => ({ ...f, studentProfileId: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
                data-testid="admin-credit-student-select"
              >
                <option value="">Sélectionner…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.name || "Sans nom") + (s.email ? ` — ${s.email}` : "")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Montant (CAD)</span>
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={creditForm.amountDollars}
                onChange={(e) =>
                  setCreditForm((f) => ({ ...f, amountDollars: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
                data-testid="admin-credit-amount-input"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Devise</span>
              <input
                value={creditForm.currency}
                onChange={(e) => setCreditForm((f) => ({ ...f, currency: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Raison</span>
              <select
                value={creditForm.reasonCode}
                onChange={(e) =>
                  setCreditForm((f) => ({
                    ...f,
                    reasonCode: e.target.value as StudentCreditReasonCode,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              >
                {STUDENT_CREDIT_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {REASON_LABELS[code]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold text-slate-700">Expiration (optionnelle)</span>
              <input
                type="datetime-local"
                value={creditForm.expiresAt}
                onChange={(e) => setCreditForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="font-semibold text-slate-700">Note obligatoire</span>
              <textarea
                required
                rows={3}
                value={creditForm.reasonNote}
                onChange={(e) => setCreditForm((f) => ({ ...f, reasonNote: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2"
                placeholder="Ex. Compensation pour cours annulé le 12 août — ticket #1234"
                data-testid="admin-credit-reason-note"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy === "grant-credit"}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              >
                {busy === "grant-credit" ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Plus size={16} aria-hidden />
                )}
                Accorder le crédit
              </button>
            </div>
          </form>

          <div className="mt-5 overflow-x-auto">
            {loading ? (
              <p className="text-sm text-slate-500">Chargement…</p>
            ) : credits.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun crédit enregistré.</p>
            ) : (
              <table className="min-w-full text-left text-sm" data-testid="admin-credits-table">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Apprenant</th>
                    <th className="px-2 py-2">Montant</th>
                    <th className="px-2 py-2">Restant</th>
                    <th className="px-2 py-2">Utilisable</th>
                    <th className="px-2 py-2">Statut</th>
                    <th className="px-2 py-2">Raison</th>
                    <th className="px-2 py-2">Expiration</th>
                    <th className="px-2 py-2">Créé</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((c) => (
                    <tr key={c.id} className="border-t border-[#E6F1EC]">
                      <td className="px-2 py-3 font-mono text-xs">{c.student_profile_id.slice(0, 8)}…</td>
                      <td className="px-2 py-3">{formatMoneyCents(c.amount_cents, c.currency)}</td>
                      <td className="px-2 py-3">
                        {formatMoneyCents(c.remaining_cents, c.currency)}
                      </td>
                      <td className="px-2 py-3">
                        {c.status === "active" && c.remaining_cents > 0 ? "Oui" : "Non"}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-bold",
                            statusBadgeClass(c.status),
                          )}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="font-semibold text-slate-700">{c.reason_code}</div>
                        <div className="max-w-xs truncate text-xs text-slate-500">
                          {c.reason_note}
                        </div>
                      </td>
                      <td className="px-2 py-3">{formatDate(c.expires_at)}</td>
                      <td className="px-2 py-3">{formatDate(c.created_at)}</td>
                      <td className="px-2 py-3">
                        {c.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => void voidCredit(c.id)}
                            disabled={busy === `void-${c.id}`}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800"
                          >
                            Annuler
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
