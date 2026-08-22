"use client";

import React, { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { getClientAccessToken } from "@/lib/auth/clientAccessToken";
import { getSupabaseClient } from "@/lib/supabase";
import { isPlannedPackageStripeCheckoutUiEnabled } from "@/lib/offers/plannedPackageStripeCheckout";

type Props = {
  orderId: string;
  disabled?: boolean;
};

export function PlannedPackageCheckoutButton({ orderId, disabled }: Props) {
  const { t } = useLocale();
  const enabled = isPlannedPackageStripeCheckoutUiEnabled();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getClientAccessToken(getSupabaseClient());
      if (!token) {
        setError(t("plannedPackageCheckoutStartFailed"));
        return;
      }
      const res = await fetch(
        `/api/planned-packages/pending-orders/${encodeURIComponent(orderId)}/checkout`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        if (json.error === "teacher_payment_not_ready") {
          setError(t("plannedPackageCheckoutTeacherNotReady"));
        } else if (json.error === "package_legal_review_required") {
          setError(t("plannedPackageCheckoutLegalRequired"));
        } else if (
          json.error === "planned_package_checkout_disabled" ||
          json.error === "checkout_test_mode_required"
        ) {
          setError(t("plannedPackageCheckoutNotEnabled"));
        } else {
          setError(t("plannedPackageCheckoutStartFailed"));
        }
        return;
      }
      window.location.href = json.url;
    } catch {
      setError(t("plannedPackageCheckoutStartFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="planned-package-checkout-button">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <p className="text-xs text-slate-600">{t("plannedPackageCheckoutProposedByTeacher")}</p>
      <p className="text-xs text-slate-600">{t("plannedPackageCheckoutSessionsAfterPayment")}</p>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void startCheckout()}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-teal-600 bg-teal-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="planned-package-buy-cta"
      >
        {loading ? t("plannedPackageCheckoutSecurePayment") : t("plannedPackageBuyPackage")}
      </button>
      <p className="text-xs text-slate-500">{t("plannedPackageCheckoutFacilitatedByPratiqo")}</p>
    </div>
  );
}
