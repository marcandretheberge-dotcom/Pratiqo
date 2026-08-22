"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { StudentPlannedPackageDto } from "@/lib/offers/plannedPackageStudentDto";
import { studentPlannedPackageStatusLabelKey } from "@/lib/offers/plannedPackageStudentStatus";
import { studentPlannedPackageProgressCounts } from "@/lib/offers/plannedPackageDashboardUi";
import { isSafeStudentTeacherProfileHref } from "@/lib/offers/plannedPackageDashboardLinks";
import { formatOfferSnapshotPrice } from "@/lib/offers/adminOfferSnapshotDisplay";
import { cn } from "@/lib/utils";
import { PlannedPackageStatusBadge } from "@/components/packages/PlannedPackageStatusBadge";
import { PlannedPackageProgressSummary } from "@/components/packages/PlannedPackageProgressSummary";
import { PlannedPackageSessionTimeline } from "@/components/packages/PlannedPackageSessionTimeline";
import { PlannedPackageSupportCta } from "@/components/packages/PlannedPackageSupportCta";

export function StudentPlannedPackageCard({ pkg }: { pkg: StudentPlannedPackageDto }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const statusKey = studentPlannedPackageStatusLabelKey(pkg.status);
  const priceLabel =
    pkg.priceCents != null
      ? formatOfferSnapshotPrice(pkg.priceCents, locale, pkg.currency)
      : null;
  const teacherHref = isSafeStudentTeacherProfileHref(pkg.teacherProfileUrl)
    ? pkg.teacherProfileUrl
    : null;

  return (
    <article
      className="overflow-hidden rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm sm:p-5"
      data-testid="student-planned-package-card"
      data-order-id={pkg.orderId}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
            {t("studentPlannedPackagesProposedByTeacher")}
          </p>
          <h3 className="mt-1 break-words text-lg font-bold text-slate-900">{pkg.title}</h3>
          <p className="mt-1 truncate text-sm text-slate-600" title={pkg.teacherName}>
            {t("studentPlannedPackagesWithTeacher").replace("{name}", pkg.teacherName)}
          </p>
        </div>
        <PlannedPackageStatusBadge status={pkg.status} label={t(statusKey)} />
      </div>

      <p className="mt-3 text-xs text-slate-500">{t("studentPlannedPackagesPaymentFacilitated")}</p>

      <PlannedPackageProgressSummary
        variant="student"
        counts={studentPlannedPackageProgressCounts(pkg)}
        nextStartsAt={pkg.nextSession?.startsAt}
      />

      {priceLabel ? (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold">{t("studentPlannedPackagesPackagePrice")}:</span>{" "}
          {priceLabel}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {teacherHref ? (
          <Link
            href={teacherHref}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("studentPlannedPackagesViewTeacher")}
          </Link>
        ) : null}
        <button
          type="button"
          className={cn(
            "inline-flex min-h-10 items-center gap-1 rounded-full bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800",
          )}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-testid="student-planned-package-toggle-detail"
        >
          {t("studentPlannedPackagesViewPackage")}
          {open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        </button>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4" data-testid="student-planned-package-detail">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {t("plannedPackageDashboardSessionsHeading")}
          </p>
          <PlannedPackageSessionTimeline
            variant="student"
            sessions={pkg.sessions}
            sessionCount={pkg.sessionCount}
            nextBookingId={pkg.nextSession?.bookingId}
            packageStatus={pkg.status}
          />
          <PlannedPackageSupportCta
            message={t("plannedPackageDashboardStudentSupportCta")}
            noFinancialAction={t("plannedPackageDashboardNoFinancialAction")}
          />
        </div>
      ) : null}
    </article>
  );
}
