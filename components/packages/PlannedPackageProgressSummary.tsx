"use client";

import React from "react";
import { useLocale } from "@/lib/locale-context";
import {
  formatPlannedPackageDateLabel,
  type PlannedPackageProgressCounts,
} from "@/lib/offers/plannedPackageDashboardUi";

export function PlannedPackageProgressSummary({
  counts,
  nextStartsAt,
  variant,
}: {
  counts: PlannedPackageProgressCounts;
  nextStartsAt?: string | null;
  variant: "student" | "teacher";
}) {
  const { t, locale } = useLocale();
  const items: Array<{ label: string; value: string }> = [
    { label: t("plannedPackageDashboardTotalSessions"), value: String(counts.sessionCount) },
    {
      label: t("plannedPackageDashboardCompletedSessions"),
      value: String(counts.completedSessionCount),
    },
    {
      label: t("plannedPackageDashboardRemainingSessions"),
      value: String(counts.remainingSessionCount),
    },
  ];
  if (variant === "teacher") {
    items.push(
      {
        label: t("plannedPackageDashboardEligible"),
        value: String(counts.eligibleCount ?? 0),
      },
      {
        label: t("plannedPackageDashboardTransferSent"),
        value: String(counts.transferredCount ?? 0),
      },
      {
        label: t("plannedPackageDashboardUnderReview"),
        value: String(counts.underReviewCount ?? 0),
      },
    );
  }

  return (
    <div data-testid="planned-package-progress-summary">
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-slate-500">{item.label}</dt>
            <dd className="font-semibold text-slate-800">{item.value}</dd>
          </div>
        ))}
      </dl>
      {nextStartsAt ? (
        <p className="mt-3 break-words text-sm text-slate-700">
          <span className="font-semibold">{t("plannedPackageDashboardNextSession")}:</span>{" "}
          {formatPlannedPackageDateLabel(nextStartsAt, locale)}
        </p>
      ) : null}
    </div>
  );
}
