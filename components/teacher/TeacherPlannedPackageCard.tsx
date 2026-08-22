"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  teacherPlannedPackageStatusLabelKey,
  teacherSessionPayoutStatusLabelKey,
  type TeacherPlannedPackageDisplayStatus,
  type TeacherSessionPayoutDisplayStatus,
} from "@/lib/offers/plannedPackageTeacherStatus";
import type {
  TeacherPlannedPackageDto,
  TeacherPlannedPackageSessionDto,
} from "@/lib/offers/plannedPackageTeacherDto";
import { formatOfferSnapshotPrice } from "@/lib/offers/adminOfferSnapshotDisplay";
import { cn } from "@/lib/utils";

function formatDateLabel(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
      const dateOnly = new Date(`${iso.slice(0, 10)}T12:00:00`);
      if (!Number.isNaN(dateOnly.getTime())) {
        return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(dateOnly);
      }
    }
    return iso;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: iso.includes("T") ? "short" : undefined,
  }).format(d);
}

function SessionRow({
  row,
  locale,
  t,
}: {
  row: TeacherPlannedPackageSessionDto;
  locale: string;
  t: (key: TranslationKey) => string;
}) {
  const payoutKey = teacherSessionPayoutStatusLabelKey(
    row.payoutStatus as TeacherSessionPayoutDisplayStatus,
  );
  return (
    <li
      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
      data-testid="teacher-planned-package-session-row"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-800">
          {t("teacherPlannedPackagesSessionNumber").replace("{n}", String(row.sessionIndex))}
        </p>
        <span className="text-xs font-medium text-slate-600">
          {row.isCompleted
            ? t("teacherPlannedPackagesSessionCompleted")
            : t("teacherPlannedPackagesSessionConfirmed")}
        </span>
      </div>
      {row.startsAt ? (
        <p className="mt-1 text-xs text-slate-500">{formatDateLabel(row.startsAt, locale)}</p>
      ) : null}
      <p className="mt-1 text-xs font-medium text-teal-800">{t(payoutKey)}</p>
    </li>
  );
}

export function TeacherPlannedPackageCard({ pkg }: { pkg: TeacherPlannedPackageDto }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const statusKey = teacherPlannedPackageStatusLabelKey(
    pkg.status as TeacherPlannedPackageDisplayStatus,
  );
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
      className="rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm sm:p-5"
      data-testid="teacher-planned-package-card"
      data-order-id={pkg.orderId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
            {t("teacherPlannedPackagesProposedByYou")}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{pkg.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {t("teacherPlannedPackagesWithStudent").replace("{name}", pkg.studentName)}
          </p>
        </div>
        <span
          className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-900"
          data-testid="teacher-planned-package-status"
        >
          {t(statusKey)}
        </span>
      </div>

      {pkg.paymentSetup.required ? (
        <p
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
          data-testid="teacher-planned-package-payment-setup"
        >
          {t("teacherPlannedPackagesPaymentSetupRequired")}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">{t("teacherPlannedPackagesUpcomingSessions")}</dt>
          <dd className="font-semibold text-slate-800">{pkg.remainingSessionCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t("teacherPlannedPackagesCompletedSessions")}</dt>
          <dd className="font-semibold text-slate-800">{pkg.completedSessionCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t("teacherPlannedPackagesRemainingSessions")}</dt>
          <dd className="font-semibold text-slate-800">{pkg.remainingSessionCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t("teacherPlannedPackagesEligibleCount")}</dt>
          <dd className="font-semibold text-slate-800">{pkg.payoutSummary.eligibleCount}</dd>
        </div>
      </dl>

      {pkg.nextSession?.startsAt ? (
        <p className="mt-3 text-sm text-slate-700">
          <span className="font-semibold">{t("teacherPlannedPackagesNextSession")}:</span>{" "}
          {formatDateLabel(pkg.nextSession.startsAt, locale)}
        </p>
      ) : null}

      {estimatedLabel ? (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold">{t("teacherPlannedPackagesEstimatedAmount")}:</span>{" "}
          {estimatedLabel}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={pkg.supportUrl}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("teacherPlannedPackagesContactSupport")}
        </Link>
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
            {t("teacherPlannedPackagesSessionsHeading")}
          </p>
          {pkg.sessions.length === 0 ? (
            <p className="text-sm text-slate-600">{t("teacherPlannedPackagesSessionsPending")}</p>
          ) : (
            <ul className="space-y-2">
              {pkg.sessions.map((s) => (
                <SessionRow key={s.bookingId} row={s} locale={locale} t={t} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            {t("teacherPlannedPackagesNoTransferExecution")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {t("teacherPlannedPackagesNoAdminDetails")}
          </p>
        </div>
      ) : null}
    </article>
  );
}
