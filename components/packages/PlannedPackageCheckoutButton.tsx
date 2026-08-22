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
  const [termsAccepted, setTermsAccepted] = useState(false);

  if (!enabled) return null;

  const startCheckout = async () => {
    if (!termsAccepted) {
      setError(t("plannedPackageConsentRequired"));
      return;
    }
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
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ learnerPackageTermsAccepted: true }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        if (json.error === "teacher_payment_not_ready") {
          setError(t("plannedPackageCheckoutTeacherNotReady"));
        } else if (json.error === "package_legal_review_required") {
          setError(t("plannedPackageCheckoutLegalRequired"));
        } else if (json.error === "learner_package_terms_required") {
          setError(t("plannedPackageConsentRequired"));
        } else if (
          json.error === "planned_package_checkout_disabled" ||
          json.error === "checkout_test_mode_required" ||
          json.error === "planned_package_public_purchase_disabled"
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
    <div className="space-y-3" data-testid="planned-package-checkout-button">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div
        className="space-y-1.5 text-xs leading-relaxed text-slate-600"
        data-testid="planned-package-consent-block"
      >
        <p>{t("plannedPackageConsentIndependentTeacher")}</p>
        <p>{t("plannedPackageConsentScheduledSessions")}</p>
        <p>{t("plannedPackageCheckoutFacilitatedByPratiqo")}</p>
        <p>{t("plannedPackageCheckoutSessionsAfterPayment")}</p>
        <p>{t("plannedPackageConsentCancellationPolicy")}</p>
        <p>{t("plannedPackageConsentSupportContact")}</p>
      </div>
      <div
        className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600"
        data-testid="planned-package-cancellation-summary"
      >
        <p>{t("plannedPackageCancellationContactSupport")}</p>
        <p>{t("plannedPackageCancellationCompletedDiffers")}</p>
        <p>{t("plannedPackageCancellationReviewedByPolicy")}</p>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          className="mt-1"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          data-testid="planned-package-learner-terms-checkbox"
        />
        <span>{t("plannedPackageConsentCheckbox")}</span>
      </label>
      <button
        type="button"
        disabled={disabled || loading || !termsAccepted}
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
