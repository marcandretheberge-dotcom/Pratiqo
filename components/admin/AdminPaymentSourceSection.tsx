"use client";

import React from "react";
import { useLocale } from "@/lib/locale-context";
import {
  formatAdminPricingSourceLabel,
  formatOfferSnapshotPrice,
  getOfferSnapshotAdminSummary,
  paymentAmountDiffersFromSnapshotPrice,
  type AdminOfferSnapshotDto,
  type AdminOfferSnapshotViewState,
  type AdminPricingSource,
} from "@/lib/offers/adminOfferSnapshotDisplay";
import { cn } from "@/lib/utils";

type Props = {
  pricingSource: AdminPricingSource;
  snapshotState: AdminOfferSnapshotViewState;
  chargedAmountCents: number | null;
  subtotalCents: number | null;
  currency?: string | null;
  packageEntitlementId?: string | null;
  packageRedemptionId?: string | null;
  packageRedemptionStatus?: string | null;
  packageRedemptionSessionNumber?: number | null;
  packageRedemptionReversedAt?: string | null;
  packageRedemptionReversalSource?: string | null;
  className?: string;
};

export function AdminPaymentSourceSection({
  pricingSource,
  snapshotState,
  chargedAmountCents,
  subtotalCents,
  currency = "CAD",
  packageEntitlementId = null,
  packageRedemptionId = null,
  packageRedemptionStatus = null,
  packageRedemptionSessionNumber = null,
  packageRedemptionReversedAt = null,
  packageRedemptionReversalSource = null,
  className,
}: Props) {
  const { t, locale } = useLocale();

  const snapshot =
    snapshotState.kind === "complete" ? snapshotState.snapshot : null;
  const showMismatch =
    snapshot != null &&
    paymentAmountDiffersFromSnapshotPrice({
      chargedAmountCents,
      subtotalCents,
      snapshotPriceCents: snapshot.priceCents,
    });
  const showPackageMeta =
    pricingSource === "package_credit" ||
    Boolean(packageEntitlementId) ||
    Boolean(packageRedemptionId);

  return (
    <section
      className={cn("rounded-lg border border-slate-200 bg-slate-50/60 p-3", className)}
      data-testid="admin-payment-offer-source"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {t("adminPaymentSourceHeading")}
      </h3>

      <dl className="mt-2 space-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">{t("adminPaymentSourceLabel")}</dt>
          <dd className="text-slate-900">{formatAdminPricingSourceLabel(pricingSource, t)}</dd>
        </div>

        {snapshotState.kind === "incomplete" ? (
          <p className="text-sm font-medium text-amber-900">{t("adminOfferSnapshotIncomplete")}</p>
        ) : null}

        {snapshot ? (
          <>
            <div>
              <dt className="text-xs text-slate-500">{t("adminPaymentSourceOffer")}</dt>
              <dd className="text-slate-900">
                {getOfferSnapshotAdminSummary(snapshot, t, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t("adminPaymentSourceSnapshotPrice")}</dt>
              <dd className="text-slate-900">
                {formatOfferSnapshotPrice(snapshot.priceCents, locale, snapshot.currency)}
              </dd>
            </div>
          </>
        ) : pricingSource === "package_credit" ? (
          <p className="mt-3 text-sm text-slate-600">{t("adminPaymentSourcePackageCreditBody")}</p>
        ) : pricingSource === "legacy_teacher_price" ? (
          <p className="text-xs text-slate-600">{t("adminOfferSnapshotClassicRate")}</p>
        ) : null}

        {showPackageMeta ? (
          <>
            {packageEntitlementId ? (
              <div>
                <dt className="text-xs text-slate-500">{t("adminPaymentSourcePackageEntitlementId")}</dt>
                <dd className="font-mono text-xs text-slate-900">{packageEntitlementId}</dd>
              </div>
            ) : null}
            {packageRedemptionId ? (
              <div>
                <dt className="text-xs text-slate-500">{t("adminPaymentSourcePackageRedemptionId")}</dt>
                <dd className="font-mono text-xs text-slate-900">{packageRedemptionId}</dd>
              </div>
            ) : null}
            {packageRedemptionStatus ? (
              <div>
                <dt className="text-xs text-slate-500">{t("adminPaymentSourcePackageRedemptionStatus")}</dt>
                <dd className="text-slate-900">{packageRedemptionStatus}</dd>
              </div>
            ) : null}
            {packageRedemptionSessionNumber != null ? (
              <div>
                <dt className="text-xs text-slate-500">{t("adminPaymentSourcePackageSessionNumber")}</dt>
                <dd className="text-slate-900">{packageRedemptionSessionNumber}</dd>
              </div>
            ) : null}
            {packageRedemptionReversedAt ? (
              <div>
                <dt className="text-xs text-slate-500">{t("adminPaymentSourcePackageReversedAt")}</dt>
                <dd className="text-slate-900">{packageRedemptionReversedAt}</dd>
              </div>
            ) : null}
            {packageRedemptionReversalSource ? (
              <div>
                <dt className="text-xs text-slate-500">{t("adminPaymentSourcePackageReversalSource")}</dt>
                <dd className="text-slate-900">{packageRedemptionReversalSource}</dd>
              </div>
            ) : null}
          </>
        ) : null}

        <div>
          <dt className="text-xs text-slate-500">{t("adminPaymentSourceChargedAmount")}</dt>
          <dd className="text-slate-900">
            {chargedAmountCents != null
              ? formatOfferSnapshotPrice(chargedAmountCents, locale, currency ?? "CAD")
              : "—"}
          </dd>
        </div>
      </dl>

      {showMismatch ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-900">
          {t("adminPaymentSnapshotAmountMismatch")}
        </p>
      ) : null}
    </section>
  );
}

export function adminOfferListLabel(
  snapshotState: AdminOfferSnapshotViewState,
  t: (key: "adminOfferSnapshotListOffer" | "adminOfferSnapshotListIncomplete" | "adminOfferSnapshotListClassic") => string,
): string {
  if (snapshotState.kind === "complete") {
    const title = snapshotState.snapshot.title;
    return title.length > 24 ? `${title.slice(0, 21)}…` : title;
  }
  if (snapshotState.kind === "incomplete") return t("adminOfferSnapshotListIncomplete");
  return t("adminOfferSnapshotListClassic");
}

export function adminPaymentSourceListLabel(
  pricingSource: AdminPricingSource,
  t: (
    key:
      | "adminOfferSnapshotListOffer"
      | "adminOfferSnapshotListClassic"
      | "adminOfferSnapshotListPackage"
      | "adminPaymentSourceUnknown",
  ) => string,
): string {
  if (pricingSource === "offer_snapshot") return t("adminOfferSnapshotListOffer");
  if (pricingSource === "legacy_teacher_price") return t("adminOfferSnapshotListClassic");
  if (pricingSource === "package_credit") return t("adminOfferSnapshotListPackage");
  return t("adminPaymentSourceUnknown");
}
