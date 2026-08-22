"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { getClientAccessToken } from "@/lib/auth/clientAccessToken";
import { getSupabaseClient } from "@/lib/supabase";
import type { PlannedPackagePendingOrderDto } from "@/lib/offers/plannedPackageTemporaryHolds";
import { isPlannedPackageTemporaryHoldsUiEnabled } from "@/lib/offers/plannedPackageTemporaryHolds";
import { isPlannedPackageStripeCheckoutUiEnabled } from "@/lib/offers/plannedPackageStripeCheckout";
import { PlannedPackageCheckoutButton } from "./PlannedPackageCheckoutButton";

type Props = {
  draftId: string;
  onCancelPreparation?: () => void;
  onEditSessions?: () => void;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlannedPackagePendingOrderPanel({
  draftId,
  onCancelPreparation,
  onEditSessions,
}: Props) {
  const { t, locale } = useLocale();
  const enabled = isPlannedPackageTemporaryHoldsUiEnabled();
  const [order, setOrder] = useState<PlannedPackagePendingOrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    if (!order) return 0;
    return new Date(order.holdExpiresAt).getTime() - now;
  }, [order, now]);

  const expired = Boolean(order && remainingMs <= 0);

  const createOrder = async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getClientAccessToken(getSupabaseClient());
      if (!token) {
        setError(t("plannedPackageHoldPrepareFailed"));
        return;
      }
      const res = await fetch(
        `/api/planned-packages/session-drafts/${encodeURIComponent(draftId)}/pending-order`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        order?: PlannedPackagePendingOrderDto;
        error?: string;
      };
      if (!res.ok || !json.order) {
        if (json.error === "active_hold_conflict" || json.error === "session_slot_no_longer_available") {
          setError(t("plannedPackageHoldSlotTemporarilyUnavailable"));
        } else {
          setError(t("plannedPackageHoldPrepareFailed"));
        }
        return;
      }
      setOrder(json.order);
    } catch {
      setError(t("plannedPackageHoldPrepareFailed"));
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getClientAccessToken(getSupabaseClient());
      if (!token) return;
      await fetch(
        `/api/planned-packages/pending-orders/${encodeURIComponent(order.id)}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setOrder(null);
      onCancelPreparation?.();
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  const localeTag = locale === "en" ? "en-CA" : locale === "es" ? "es" : "fr-CA";

  if (!order) {
    return (
      <div className="mt-3 space-y-2" data-testid="planned-package-prepare-payment">
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button
          type="button"
          disabled={loading}
          onClick={() => void createOrder()}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-900 disabled:opacity-50"
          data-testid="planned-package-prepare-payment-cta"
        >
          {t("plannedPackageHoldPreparePayment")}
        </button>
      </div>
    );
  }

  return (
    <section
      className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4"
      data-testid="planned-package-pending-order"
    >
      {expired ? (
        <>
          <p className="text-sm font-semibold text-amber-950">{t("plannedPackageHoldExpired")}</p>
          <p className="text-xs text-slate-700">{t("plannedPackageHoldChooseNew")}</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-amber-950">{t("plannedPackageHoldTitle")}</p>
          <p className="text-xs leading-relaxed text-slate-700">{t("plannedPackageHoldBody")}</p>
          <p
            className="font-mono text-lg font-bold text-slate-900"
            data-testid="planned-package-hold-countdown"
          >
            {formatRemaining(remainingMs)}
          </p>
          <ul className="space-y-1 text-sm text-slate-800">
            {order.holds.map((h) => (
              <li key={h.id}>{new Date(h.startsAt).toLocaleString(localeTag)}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-600">{t("plannedPackageHoldConfirmedAfterPayment")}</p>
          <p className="text-xs text-slate-600">{t("plannedPackageHoldReleasedIfUnpaid")}</p>
        </>
      )}

      <PlannedPackageCheckoutButton orderId={order.id} disabled={expired || loading} />

      {!isPlannedPackageStripeCheckoutUiEnabled() ? (
        <button
          type="button"
          disabled
          className="inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500"
        >
          {t("plannedPackagePaymentComingSoon")}
        </button>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!expired ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void cancelOrder()}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800"
            data-testid="planned-package-hold-cancel"
          >
            {t("plannedPackageHoldCancel")}
          </button>
        ) : null}
        {onEditSessions ? (
          <button
            type="button"
            onClick={onEditSessions}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800"
          >
            {t("plannedPackagePreflightEditSessions")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
