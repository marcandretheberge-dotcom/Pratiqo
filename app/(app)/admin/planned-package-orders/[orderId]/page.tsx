"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import type { AdminPlannedPackageOrderDetail } from "@/lib/admin/plannedPackageOrderOperations";

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

function formatMoney(cents: number | null, currency: string): string {
  if (cents === null) return "—";
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: currency || "CAD",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function attentionLabel(
  reason: string,
  t: (key: string) => string,
): string {
  const key = `plannedPackageAdminOpsReason_${reason}`;
  const translated = t(key);
  return translated === key ? reason : translated;
}

async function adminFetch(path: string, init?: RequestInit) {
  const { data: sess } = await getSupabaseClient().auth.getSession();
  const token = sess.session?.access_token ?? "";
  return fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export default function PlannedPackageOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const isAdmin = (profile?.role as string | undefined) === "admin";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<AdminPlannedPackageOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !isAdmin || !orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/planned-package-orders/${orderId}`);
      if (res.status === 403) {
        setDisabled(true);
        setOrder(null);
        return;
      }
      if (res.status === 404) {
        setError(t("plannedPackageAdminOpsOrderNotFound"));
        setOrder(null);
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as { order: AdminPlannedPackageOrderDetail };
      setOrder(data.order);
    } catch {
      setError(t("plannedPackageAdminOpsLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRetry() {
    if (!order || !order.retryEligible) return;
    setRetrying(true);
    setRetryMessage(null);
    try {
      const res = await adminFetch(
        `/api/admin/planned-package-orders/${order.id}/retry-fulfillment`,
        { method: "POST" },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string; blockers?: string[] };
      if (!res.ok) {
        setRetryMessage(data.error ?? t("plannedPackageAdminOpsRetryFailed"));
        return;
      }
      setRetryMessage(t("plannedPackageAdminOpsRetrySuccess"));
      await load();
    } catch {
      setRetryMessage(t("plannedPackageAdminOpsRetryFailed"));
    } finally {
      setRetrying(false);
    }
  }

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
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <Link
        href="/admin/planned-package-orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
      >
        <ChevronLeft size={16} aria-hidden />
        {t("plannedPackageAdminOpsTitle")}
      </Link>

      {disabled ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          {t("plannedPackageAdminOpsDisabled")}
        </section>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="animate-spin" size={16} aria-hidden />
          {t("plannedPackageAdminOpsLoading")}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : order ? (
        <>
          <header className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {t("plannedPackageAdminOpsDetailTitle")} · {order.shortId}
            </h1>
            {order.needsAttention ? (
              <p className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <AlertTriangle size={16} aria-hidden />
                {t("plannedPackageAdminOpsNeedsAttention")}
                {order.attentionReasons.length > 0
                  ? ` — ${order.attentionReasons.map((r) => attentionLabel(r, (k) => t(k as never))).join(", ")}`
                  : ""}
              </p>
            ) : null}
          </header>

          <Section title={t("plannedPackageAdminOpsSectionOrder")}>
            <Row label={t("plannedPackageAdminOpsFieldStatus")} value={order.orderStatus} />
            <Row label={t("plannedPackageAdminOpsFieldStudent")} value={person(order.student)} />
            <Row label={t("plannedPackageAdminOpsFieldTeacher")} value={person(order.teacher)} />
            <Row label={t("plannedPackageAdminOpsFieldOffer")} value={order.offerTitleSnapshot} />
            <Row
              label={t("plannedPackageAdminOpsFieldPrice")}
              value={formatMoney(order.totalPriceCents, order.currency)}
            />
            <Row label={t("plannedPackageAdminOpsFieldSessions")} value={String(order.sessionCount)} />
            <Row
              label={t("plannedPackageAdminOpsFieldDuration")}
              value={`${order.durationMinutes} min`}
            />
            <Row label={t("plannedPackageAdminOpsFieldCreated")} value={formatDate(order.createdAt)} />
            <Row label={t("plannedPackageAdminOpsFieldUpdated")} value={formatDate(order.updatedAt)} />
          </Section>

          <Section title={t("plannedPackageAdminOpsSectionStripe")}>
            <Row label="Checkout session" value={order.stripeCheckoutSessionId ?? "—"} mono />
            <Row label="Payment intent" value={order.stripePaymentIntentId ?? "—"} mono />
            <Row label={t("plannedPackageAdminOpsFieldCheckoutStatus")} value={order.stripeCheckoutStatus ?? "—"} />
            <Row
              label={t("plannedPackageAdminOpsFieldAmountReceived")}
              value={formatMoney(order.stripeAmountReceivedCents, order.stripeCurrency ?? "CAD")}
            />
            <Row label={t("plannedPackageAdminOpsFieldPaidAt")} value={formatDate(order.paidAt)} />
            <Row
              label={t("plannedPackageAdminOpsFieldWebhookReceived")}
              value={formatDate(order.lastWebhookReceivedAt)}
            />
            <Row label="Webhook event" value={order.lastWebhookEventType ?? "—"} />
          </Section>

          <Section title={t("plannedPackageAdminOpsSectionHolds")}>
            {order.holds.length === 0 ? (
              <p className="text-sm text-slate-600">—</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.holds.map((h) => (
                  <li key={h.id} className="rounded-xl border border-slate-100 px-3 py-2">
                    #{h.sessionIndex} · {formatDate(h.startsAt)} → {formatDate(h.endsAt)} · {h.status}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("plannedPackageAdminOpsSectionFulfillment")}>
            <Row label={t("plannedPackageAdminOpsFieldFulfillmentStatus")} value={order.fulfillmentStatus} />
            <Row
              label={t("plannedPackageAdminOpsFieldPaymentConfirmedAt")}
              value={formatDate(order.paymentConfirmedAt)}
            />
            <Row label={t("plannedPackageAdminOpsFieldFulfilledAt")} value={formatDate(order.fulfilledAt)} />
            <Row label={t("plannedPackageAdminOpsFieldFulfillmentError")} value={order.fulfillmentError ?? "—"} />
            <Row
              label={t("plannedPackageAdminOpsFieldAttemptCount")}
              value={String(order.fulfillmentAttemptCount)}
            />
            {order.bookings.length === 0 ? (
              <p className="text-sm text-slate-600">{t("plannedPackageAdminOpsNoBookings")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.bookings.map((b) => (
                  <li key={b.id} className="rounded-xl border border-slate-100 px-3 py-2 font-mono">
                    {b.shortId} · idx {b.sessionIndex ?? "—"} · {b.status}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("plannedPackageAdminOpsSectionActions")}>
            <p className="text-xs text-slate-500">{t("plannedPackageAdminOpsNoTransferRefundNote")}</p>
            <p className="text-xs text-slate-500">{t("plannedPackageAdminOpsNoTeacherTransfer")}</p>
            <p className="text-xs text-slate-500">{t("plannedPackageAdminOpsNoRefund")}</p>
            <button
              type="button"
              disabled={!order.retryEligible || retrying}
              onClick={() => void handleRetry()}
              className={cn(
                "mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold",
                order.retryEligible
                  ? "bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-60"
                  : "cursor-not-allowed bg-slate-100 text-slate-400",
              )}
            >
              <RefreshCw size={16} className={retrying ? "animate-spin" : ""} aria-hidden />
              {t("plannedPackageAdminOpsRetryFulfillment")}
            </button>
            {!order.retryEligible && order.retryBlockers.length > 0 ? (
              <p className="mt-2 text-xs text-amber-800">
                {order.retryBlockers.join(", ")}
              </p>
            ) : null}
            {retryMessage ? <p className="mt-2 text-sm text-slate-700">{retryMessage}</p> : null}
          </Section>
        </>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-medium text-slate-900 sm:max-w-[65%] sm:text-right", mono && "font-mono text-xs break-all")}>
        {value}
      </span>
    </div>
  );
}

function person(p: { name: string | null; email: string | null } | null): string {
  if (!p) return "—";
  if (p.name && p.email) return `${p.name} · ${p.email}`;
  return p.name || p.email || "—";
}
