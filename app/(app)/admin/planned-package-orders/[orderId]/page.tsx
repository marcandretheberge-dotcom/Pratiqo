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
import type { AdminPlannedPackageRefundContext } from "@/lib/admin/plannedPackageRefundOperations";

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
  const [refund, setRefund] = useState<AdminPlannedPackageRefundContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);
  const [executeConfirmOpen, setExecuteConfirmOpen] = useState(false);
  const [executeConfirmText, setExecuteConfirmText] = useState("");
  const [executeAcknowledged, setExecuteAcknowledged] = useState(false);

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
      const data = (await res.json()) as {
        order: AdminPlannedPackageOrderDetail;
        refund?: AdminPlannedPackageRefundContext;
      };
      setOrder(data.order);
      setRefund(data.refund ?? null);
    } catch {
      setError(t("plannedPackageAdminOpsLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateCancellationRequest() {
    if (!order) return;
    setRefundBusy(true);
    setRefundMessage(null);
    try {
      const res = await adminFetch(
        `/api/admin/planned-package-orders/${order.id}/cancellation-request`,
        { method: "POST", body: JSON.stringify({}) },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setRefundMessage(data.error ?? t("plannedPackageRefundQuoteActionFailed"));
        return;
      }
      setRefundMessage(t("plannedPackageRefundCancellationCreated"));
      await load();
    } catch {
      setRefundMessage(t("plannedPackageRefundQuoteActionFailed"));
    } finally {
      setRefundBusy(false);
    }
  }

  async function handleGenerateQuote() {
    if (!order) return;
    setRefundBusy(true);
    setRefundMessage(null);
    try {
      const res = await adminFetch(
        `/api/admin/planned-package-orders/${order.id}/refund-quote`,
        { method: "POST", body: JSON.stringify({}) },
      );
      const data = (await res.json()) as { error?: string; blockers?: string[] };
      if (!res.ok) {
        setRefundMessage(
          data.blockers?.length
            ? `${data.error}: ${data.blockers.join(", ")}`
            : (data.error ?? t("plannedPackageRefundQuoteActionFailed")),
        );
        return;
      }
      setRefundMessage(t("plannedPackageRefundQuoteGenerated"));
      await load();
    } catch {
      setRefundMessage(t("plannedPackageRefundQuoteActionFailed"));
    } finally {
      setRefundBusy(false);
    }
  }

  async function handleExecuteRefund() {
    if (!order || !refund?.latestQuote) return;
    if (executeConfirmText !== "REFUND" || !executeAcknowledged) return;
    setRefundBusy(true);
    setRefundMessage(null);
    try {
      const res = await adminFetch(
        `/api/admin/planned-package-orders/${order.id}/refund-quotes/${refund.latestQuote.id}/execute`,
        {
          method: "POST",
          body: JSON.stringify({ confirm: "REFUND" }),
        },
      );
      const data = (await res.json()) as { error?: string; execution?: { stripeRefundId?: string | null } };
      if (!res.ok) {
        setRefundMessage(data.error ?? t("plannedPackageManualRefundFailed"));
        return;
      }
      setRefundMessage(t("plannedPackageManualRefundExecuted"));
      setExecuteConfirmOpen(false);
      setExecuteConfirmText("");
      setExecuteAcknowledged(false);
      await load();
    } catch {
      setRefundMessage(t("plannedPackageManualRefundFailed"));
    } finally {
      setRefundBusy(false);
    }
  }

  async function handleQuoteAction(action: "approve" | "mark_for_review") {
    if (!order || !refund?.latestQuote) return;
    setRefundBusy(true);
    setRefundMessage(null);
    try {
      const res = await adminFetch(
        `/api/admin/planned-package-orders/${order.id}/refund-quote/action`,
        {
          method: "POST",
          body: JSON.stringify({ action, quoteId: refund.latestQuote.id }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setRefundMessage(data.error ?? t("plannedPackageRefundQuoteActionFailed"));
        return;
      }
      setRefundMessage(
        action === "approve"
          ? t("plannedPackageRefundApprovedForManual")
          : t("plannedPackageRefundMarkedForReview"),
      );
      await load();
    } catch {
      setRefundMessage(t("plannedPackageRefundQuoteActionFailed"));
    } finally {
      setRefundBusy(false);
    }
  }

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

          <Section title={t("plannedPackageRefundSectionTitle")}>
            {!refund?.enabled ? (
              <p className="text-sm text-amber-900">{t("plannedPackageRefundQuotesDisabled")}</p>
            ) : (
              <>
                <Row
                  label={t("plannedPackageRefundCancellationRequest")}
                  value={refund.cancellationRequest?.status ?? "—"}
                />
                {refund.latestQuote ? (
                  <>
                    <Row label={t("plannedPackageRefundQuoteStatus")} value={refund.latestQuote.quoteStatus} />
                    <Row
                      label={t("plannedPackageRefundPolicyVersion")}
                      value={refund.latestQuote.policyVersion}
                    />
                    <Row
                      label={t("plannedPackageRefundEstimatedAmount")}
                      value={formatMoney(
                        refund.latestQuote.estimatedRefundCents,
                        refund.latestQuote.currency,
                      )}
                    />
                    <Row
                      label={t("plannedPackageRefundCompletedSessions")}
                      value={String(refund.latestQuote.completedSessionCount)}
                    />
                    <Row
                      label={t("plannedPackageRefundUndeliveredSessions")}
                      value={String(refund.latestQuote.undeliveredSessionCount)}
                    />
                    <Row
                      label={t("plannedPackageRefundEstimatedPenalty")}
                      value={formatMoney(refund.latestQuote.penaltyCents, refund.latestQuote.currency)}
                    />
                    {refund.latestQuote.manualReviewRequired ? (
                      <p className="text-xs text-amber-800">{t("plannedPackageRefundAdminReviewRequired")}</p>
                    ) : null}
                    {refund.latestQuote.legalReviewRequired ? (
                      <p className="text-xs text-amber-800">{t("plannedPackageRefundLegalReviewRequired")}</p>
                    ) : null}
                    {refund.latestQuote.warnings.length > 0 ? (
                      <p className="text-xs text-slate-600">{refund.latestQuote.warnings.join(", ")}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-slate-600">—</p>
                )}
                <p className="text-xs text-slate-500">{t("plannedPackageRefundNotFinalDecision")}</p>
                <p className="text-xs text-slate-500">{t("plannedPackageRefundNoAutomaticRefund")}</p>
                {refund.latestExecution?.status === "succeeded" ? (
                  <>
                    <p className="text-xs font-medium text-teal-800">{t("plannedPackageManualRefundExecuted")}</p>
                    <Row
                      label={t("plannedPackageManualRefundAmount")}
                      value={formatMoney(
                        refund.latestExecution.amountCents,
                        refund.latestExecution.currency,
                      )}
                    />
                    <Row
                      label={t("plannedPackageManualRefundStripeReference")}
                      value={refund.latestExecution.stripeRefundId ?? "—"}
                      mono
                    />
                  </>
                ) : refund.latestExecution?.status === "failed" ? (
                  <p className="text-xs text-rose-700">{t("plannedPackageManualRefundFailed")}</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">{t("plannedPackageRefundNoStripeExecuted")}</p>
                    <p className="text-xs text-slate-500">{t("plannedPackageRefundActualNotAvailable")}</p>
                  </>
                )}
                {refund.orderRefundStatus ? (
                  <Row
                    label={t("plannedPackageManualRefundOrderStatus")}
                    value={refund.orderRefundStatus}
                  />
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={refundBusy}
                    onClick={() => void handleCreateCancellationRequest()}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {t("plannedPackageRefundCreateCancellationRequest")}
                  </button>
                  <button
                    type="button"
                    disabled={refundBusy}
                    onClick={() => void handleGenerateQuote()}
                    className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    {t("plannedPackageRefundGenerateEstimate")}
                  </button>
                  {refund.latestQuote &&
                  refund.latestQuote.quoteStatus !== "approved_for_manual_refund" ? (
                    <>
                      <button
                        type="button"
                        disabled={refundBusy}
                        onClick={() => void handleQuoteAction("mark_for_review")}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
                      >
                        {t("plannedPackageRefundMarkForReview")}
                      </button>
                      <button
                        type="button"
                        disabled={refundBusy}
                        onClick={() => void handleQuoteAction("approve")}
                        className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-60"
                      >
                        {t("plannedPackageRefundApproveForManual")}
                      </button>
                    </>
                  ) : null}
                </div>
                {refund.canExecuteManualRefund ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                    <h3 className="text-sm font-bold text-rose-950">
                      {t("plannedPackageManualRefundSectionTitle")}
                    </h3>
                    <p className="mt-2 text-xs text-rose-900">{t("plannedPackageManualRefundStripeWarning")}</p>
                    <p className="mt-1 text-xs text-rose-900">{t("plannedPackageManualRefundNoTeacherTransfer")}</p>
                    <p className="mt-1 text-xs text-rose-900">{t("plannedPackageManualRefundNoTransferReversal")}</p>
                    {!executeConfirmOpen ? (
                      <button
                        type="button"
                        disabled={refundBusy}
                        onClick={() => setExecuteConfirmOpen(true)}
                        className="mt-3 rounded-xl bg-rose-700 px-3 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-60"
                      >
                        {t("plannedPackageManualRefundExecuteStripe")}
                      </button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <label className="flex items-start gap-2 text-xs text-rose-950">
                          <input
                            type="checkbox"
                            checked={executeAcknowledged}
                            onChange={(e) => setExecuteAcknowledged(e.target.checked)}
                            className="mt-0.5"
                          />
                          {t("plannedPackageManualRefundConfirmAcknowledge")}
                        </label>
                        <input
                          type="text"
                          value={executeConfirmText}
                          onChange={(e) => setExecuteConfirmText(e.target.value)}
                          placeholder="REFUND"
                          className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm"
                          aria-label={t("plannedPackageManualRefundConfirmTypeRefund")}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={
                              refundBusy ||
                              executeConfirmText !== "REFUND" ||
                              !executeAcknowledged
                            }
                            onClick={() => void handleExecuteRefund()}
                            className="rounded-xl bg-rose-700 px-3 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-60"
                          >
                            {t("plannedPackageManualRefundExecuteStripe")}
                          </button>
                          <button
                            type="button"
                            disabled={refundBusy}
                            onClick={() => {
                              setExecuteConfirmOpen(false);
                              setExecuteConfirmText("");
                              setExecuteAcknowledged(false);
                            }}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-950"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : refund.manualRefundsEnabled === false ? (
                  <p className="mt-2 text-xs text-amber-800">{t("plannedPackageManualRefundsDisabled")}</p>
                ) : null}
                {refundMessage ? <p className="mt-2 text-sm text-slate-700">{refundMessage}</p> : null}
              </>
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
