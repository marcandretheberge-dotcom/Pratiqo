"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { TeacherPlannedPackageDto } from "@/lib/offers/plannedPackageTeacherDto";
import { teacherPlannedPackageStatusLabelKey } from "@/lib/offers/plannedPackageTeacherStatus";
import { teacherPlannedPackageProgressCounts } from "@/lib/offers/plannedPackageDashboardUi";
import { PLANNED_PACKAGE_TEACHER_PAYMENT_SETUP_HREF } from "@/lib/offers/plannedPackageDashboardLinks";
import { formatOfferSnapshotPrice } from "@/lib/offers/adminOfferSnapshotDisplay";
import { cn } from "@/lib/utils";
import { PlannedPackageStatusBadge } from "@/components/packages/PlannedPackageStatusBadge";
import { PlannedPackageProgressSummary } from "@/components/packages/PlannedPackageProgressSummary";
import { PlannedPackageSessionTimeline } from "@/components/packages/PlannedPackageSessionTimeline";
import { PlannedPackageSupportCta } from "@/components/packages/PlannedPackageSupportCta";

export function TeacherPlannedPackageCard({ pkg }: { pkg: TeacherPlannedPackageDto }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const statusKey = teacherPlannedPackageStatusLabelKey(pkg.status);
  const estimatedLabel =
    pkg.payoutSummary.estimatedTeacherAmountCents != null
      ? formatOfferSnapshotPrice(
          pkg.payoutSummary.estimatedTeacherAmountCents,
          locale,
          pkg.payoutSummary.currency,
        )
      : null;

  return (
    <article
      className="overflow-hidden rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm sm:p-5"
      data-testid="teacher-planned-package-card"
      data-order-id={pkg.orderId}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
            {t("teacherPlannedPackagesProposedByYou")}
          </p>
          <h3 className="mt-1 break-words text-lg font-bold text-slate-900">{pkg.title}</h3>
          <p className="mt-1 truncate text-sm text-slate-600" title={pkg.studentName}>
            {t("teacherPlannedPackagesWithStudent").replace("{name}", pkg.studentName)}
          </p>
        </div>
        <PlannedPackageStatusBadge status={pkg.status} label={t(statusKey)} />
      </div>

      {pkg.paymentSetup.required ? (
        <p
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
          data-testid="teacher-planned-package-payment-setup"
        >
          {t("teacherPlannedPackagesPaymentSetupRequired")}{" "}
          <Link
            href={PLANNED_PACKAGE_TEACHER_PAYMENT_SETUP_HREF}
            className="font-bold underline"
          >
            {t("plannedPackageDashboardPaymentSetupCta")}
          </Link>
        </p>
      ) : null}

      <PlannedPackageProgressSummary
        variant="teacher"
        counts={teacherPlannedPackageProgressCounts({
          sessionCount: pkg.sessionCount,
          completedSessionCount: pkg.completedSessionCount,
          remainingSessionCount: pkg.remainingSessionCount,
          eligibleCount: pkg.payoutSummary.eligibleCount,
          transferredCount: pkg.payoutSummary.transferredCount,
          underReviewCount: pkg.payoutSummary.underReviewCount,
        })}
        nextStartsAt={pkg.nextSession?.startsAt}
      />

      {estimatedLabel ? (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold">{t("teacherPlannedPackagesEstimatedAmount")}:</span>{" "}
          {estimatedLabel}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "inline-flex min-h-10 items-center gap-1 rounded-full bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800",
          )}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-testid="teacher-planned-package-toggle-detail"
        >
          {t("teacherPlannedPackagesViewPackage")}
          {open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        </button>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4" data-testid="teacher-planned-package-detail">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {t("plannedPackageDashboardSessionsHeading")}
          </p>
          <PlannedPackageSessionTimeline
            variant="teacher"
            sessions={pkg.sessions.map((s) => ({
              bookingId: s.bookingId,
              sessionIndex: s.sessionIndex,
              startsAt: s.startsAt,
              isCompleted: s.isCompleted,
              payoutStatus: s.payoutStatus,
            }))}
            sessionCount={pkg.sessionCount}
            nextBookingId={pkg.nextSession?.bookingId}
            packageStatus={pkg.status}
          />
          <PlannedPackageSupportCta
            message={t("plannedPackageDashboardTeacherSupportCta")}
            noFinancialAction={t("plannedPackageDashboardNoFinancialAction")}
          />
        </div>
      ) : null}
    </article>
  );
}
