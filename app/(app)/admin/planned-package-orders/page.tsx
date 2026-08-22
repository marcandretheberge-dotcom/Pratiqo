"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronLeft, Loader2, Package, Search } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import type {
  AdminPlannedPackageOrderListRow,
  AdminPlannedPackageOrdersSummary,
} from "@/lib/admin/plannedPackageOrderOperations";

const FILTERS = [
  { id: "", labelKey: "plannedPackageAdminOpsFilterAll" },
  { id: "needs_attention", labelKey: "plannedPackageAdminOpsNeedsAttention" },
  { id: "pending_payment", labelKey: "plannedPackageAdminOpsPendingPayment" },
  { id: "paid_not_fulfilled", labelKey: "plannedPackageAdminOpsPaidAwaitingFulfillment" },
  { id: "fulfillment_failed", labelKey: "plannedPackageAdminOpsFulfillmentFailed" },
  { id: "fulfilled", labelKey: "plannedPackageAdminOpsFulfilled" },
  { id: "expired_cancelled", labelKey: "plannedPackageAdminOpsExpiredCancelled" },
] as const;

function formatDate(iso: string | null): string {
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

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: currency || "CAD",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

async function adminFetch(path: string, init?: RequestInit) {
  const { data: sess } = await getSupabaseClient().auth.getSession();
  const token = sess.session?.access_token ?? "";
  return fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
}

function emptySummary(): AdminPlannedPackageOrdersSummary {
  return {
    total: 0,
    needsAttention: 0,
    pendingPayment: 0,
    paidAwaitingFulfillment: 0,
    fulfilled: 0,
    expiredCancelled: 0,
  };
}

function PlannedPackageOrdersInner() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = (profile?.role as string | undefined) === "admin";

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminPlannedPackageOrderListRow[]>([]);
  const [summary, setSummary] = useState<AdminPlannedPackageOrdersSummary>(emptySummary);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const [filter, setFilter] = useState(searchParams.get("filter") ?? "");
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const load = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("filter", filter);
      if (q.trim()) params.set("q", q.trim());
      const res = await adminFetch(`/api/admin/planned-package-orders?${params.toString()}`);
      if (res.status === 403) {
        setDisabled(true);
        setOrders([]);
        setSummary(emptySummary());
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as {
        orders: AdminPlannedPackageOrderListRow[];
        summary: AdminPlannedPackageOrdersSummary;
      };
      setOrders(data.orders ?? []);
      setSummary(data.summary ?? emptySummary());
    } catch {
      setError(t("plannedPackageAdminOpsLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, filter, q, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    router.replace(qs ? `/admin/planned-package-orders?${qs}` : "/admin/planned-package-orders");
  }, [filter, q, router]);

  if (!user) {
    return (
      <div className="p-6 text-sm text-slate-600">{t("plannedPackageAdminOpsSignInRequired")}</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-sm text-rose-700">{t("plannedPackageAdminOpsAdminOnly")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          <ChevronLeft size={16} aria-hidden />
          Admin
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Package className="text-teal-700" size={22} aria-hidden />
          <h1 className="text-2xl font-bold text-slate-900">{t("plannedPackageAdminOpsTitle")}</h1>
        </div>
        <p className="text-sm text-slate-600">{t("plannedPackageAdminOpsSubtitle")}</p>
      </header>

      {disabled ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          {t("plannedPackageAdminOpsDisabled")}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: t("plannedPackageAdminOpsSummaryTotal"), value: summary.total },
              { label: t("plannedPackageAdminOpsNeedsAttention"), value: summary.needsAttention },
              { label: t("plannedPackageAdminOpsPendingPayment"), value: summary.pendingPayment },
              {
                label: t("plannedPackageAdminOpsPaidAwaitingFulfillment"),
                value: summary.paidAwaitingFulfillment,
              },
              { label: t("plannedPackageAdminOpsFulfilled"), value: summary.fulfilled },
              {
                label: t("plannedPackageAdminOpsExpiredCancelled"),
                value: summary.expiredCancelled,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                  aria-hidden
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("plannedPackageAdminOpsSearchPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {FILTERS.map((f) => (
                  <option key={f.id || "all"} value={f.id}>
                    {t(f.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {error ? (
            <p className="text-sm text-rose-700">{error}</p>
          ) : loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="animate-spin" size={16} aria-hidden />
              {t("plannedPackageAdminOpsLoading")}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-600">{t("plannedPackageAdminOpsEmpty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#DCEAE3] bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t("plannedPackageAdminOpsColOrder")}</th>
                    <th className="px-4 py-3">{t("plannedPackageAdminOpsColCreated")}</th>
                    <th className="px-4 py-3">{t("plannedPackageAdminOpsColStudent")}</th>
                    <th className="px-4 py-3">{t("plannedPackageAdminOpsColOffer")}</th>
                    <th className="px-4 py-3">{t("plannedPackageAdminOpsColAmount")}</th>
                    <th className="px-4 py-3">{t("plannedPackageAdminOpsColStatus")}</th>
                    <th className="px-4 py-3">{t("plannedPackageAdminOpsColAttention")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono">
                        <Link
                          href={`/admin/planned-package-orders/${order.id}`}
                          className="font-semibold text-teal-700 hover:underline"
                        >
                          {order.shortId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        {order.student?.name || order.student?.email || "—"}
                      </td>
                      <td className="px-4 py-3">{order.offerTitleSnapshot}</td>
                      <td className="px-4 py-3">
                        {formatMoney(order.totalPriceCents, order.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-bold",
                            order.orderStatus === "fulfilled"
                              ? "border-teal-200 bg-teal-50 text-teal-800"
                              : order.orderStatus === "fulfillment_failed"
                                ? "border-rose-200 bg-rose-50 text-rose-800"
                                : "border-slate-200 bg-slate-50 text-slate-700",
                          )}
                        >
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.needsAttention ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                            <AlertTriangle size={12} aria-hidden />
                            {t("plannedPackageAdminOpsNeedsAttention")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-slate-500">{t("plannedPackageAdminOpsNoTransferRefundNote")}</p>
        </>
      )}
    </div>
  );
}

export default function PlannedPackageOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 p-6 text-sm text-slate-600">
          <Loader2 className="animate-spin" size={16} aria-hidden />
          Chargement…
        </div>
      }
    >
      <PlannedPackageOrdersInner />
    </Suspense>
  );
}
