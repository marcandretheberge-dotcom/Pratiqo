"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  studentPlannedPackageStatusLabelKey,
  type StudentPlannedPackageDisplayStatus,
} from "@/lib/offers/plannedPackageStudentStatus";
import type {
  StudentPlannedPackageDto,
  StudentPlannedPackageSessionDto,
} from "@/lib/offers/plannedPackageStudentDto";
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
  row: StudentPlannedPackageSessionDto;
  locale: string;
  t: (key: TranslationKey) => string;
}) {
  return (
    <li
      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
      data-testid="student-planned-package-session-row"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-800">
          {t("studentPlannedPackagesSessionNumber").replace("{n}", String(row.sessionIndex))}
        </p>
        <span className="text-xs font-medium text-slate-600">
          {row.isCompleted
            ? t("studentPlannedPackagesSessionCompleted")
            : t("studentPlannedPackagesSessionConfirmed")}
        </span>
      </div>
      {row.startsAt ? (
        <p className="mt-1 text-xs text-slate-500">{formatDateLabel(row.startsAt, locale)}</p>
      ) : null}
    </li>
  );
}

export function StudentPlannedPackageCard({ pkg }: { pkg: StudentPlannedPackageDto }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const statusKey = studentPlannedPackageStatusLabelKey(
    pkg.status as StudentPlannedPackageDisplayStatus,
  );
  const priceLabel =
    pkg.priceCents != null
      ? formatOfferSnapshotPrice(pkg.priceCents, locale, pkg.currency)
      : null;

  return (
    <article
      className="rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm sm:p-5"
      data-testid="student-planned-package-card"
      data-order-id={pkg.orderId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
            {t("studentPlannedPackagesProposedByTeacher")}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{pkg.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {t("studentPlannedPackagesWithTeacher").replace("{name}", pkg.teacherName)}
          </p>
        </div>
        <span
          className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-900"
          data-testid="student-planned-package-status"
        >
          {t(statusKey)}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">{t("studentPlannedPackagesPaymentFacilitated")}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">{t("studentPlannedPackagesConfirmedSessions")}</dt>
          <dd className="font-semibold text-slate-800">{pkg.sessionCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t("studentPlannedPackagesCompletedSessions")}</dt>
          <dd className="font-semibold text-slate-800">{pkg.completedSessionCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t("studentPlannedPackagesRemainingSessions")}</dt>
          <dd className="font-semibold text-slate-800">{pkg.remainingSessionCount}</dd>
        </div>
        {priceLabel ? (
          <div>
            <dt className="text-xs text-slate-500">{t("studentPlannedPackagesPackagePrice")}</dt>
            <dd className="font-semibold text-slate-800">{priceLabel}</dd>
          </div>
        ) : null}
      </dl>

      {pkg.nextSession?.startsAt ? (
        <p className="mt-3 text-sm text-slate-700">
          <span className="font-semibold">{t("studentPlannedPackagesNextSession")}:</span>{" "}
          {formatDateLabel(pkg.nextSession.startsAt, locale)}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={pkg.teacherProfileUrl}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("studentPlannedPackagesViewTeacher")}
        </Link>
        <Link
          href={pkg.supportUrl}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("studentPlannedPackagesContactSupport")}
        </Link>
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
            {t("studentPlannedPackagesSessionsHeading")}
          </p>
          {pkg.sessions.length === 0 ? (
            <p className="text-sm text-slate-600">{t("studentPlannedPackagesSessionsPending")}</p>
          ) : (
            <ul className="space-y-2">
              {pkg.sessions.map((s) => (
                <SessionRow key={s.bookingId} row={s} locale={locale} t={t} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            {t("studentPlannedPackagesNoPayoutDetails")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {t("studentPlannedPackagesNeedHelp")}
          </p>
        </div>
      ) : null}
    </article>
  );
}
