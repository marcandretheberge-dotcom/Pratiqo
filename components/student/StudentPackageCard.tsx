"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  studentPackageProgress,
  studentPackageRedemptionStatusLabelKey,
  studentPackageStatusLabelKey,
  type StudentPackageDto,
  type StudentPackageRedemptionDto,
} from "@/lib/offers/studentPackages";
import { formatOfferSnapshotPrice } from "@/lib/offers/adminOfferSnapshotDisplay";
import { cn } from "@/lib/utils";

function formatDateLabel(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // slot_date alone or date-only
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

function RedemptionRow({
  row,
  locale,
  t,
}: {
  row: StudentPackageRedemptionDto;
  locale: string;
  t: (key: TranslationKey) => string;
}) {
  const statusKey = studentPackageRedemptionStatusLabelKey(row.status);
  const restored = row.status === "reversed" || row.status === "cancelled";
  return (
    <li
      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
      data-testid="student-package-redemption-row"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-800">
          {t("studentPackagesSessionNumber").replace("{n}", String(row.sessionNumber))}
        </p>
        <span className="text-xs font-medium text-slate-600">{t(statusKey)}</span>
      </div>
      {row.bookingStartAt ? (
        <p className="mt-1 text-xs text-slate-500">
          {formatDateLabel(row.bookingStartAt, locale)}
        </p>
      ) : null}
      {restored ? (
        <p className="mt-1.5 text-xs text-teal-800">{t("studentPackagesSessionReturnedBody")}</p>
      ) : null}
    </li>
  );
}

export function StudentPackageCard({ pkg }: { pkg: StudentPackageDto }) {
  const { t, locale } = useLocale();
  const [historyOpen, setHistoryOpen] = useState(false);
  const progress = studentPackageProgress({
    usedSessions: pkg.package.usedSessions,
    totalSessions: pkg.package.totalSessions,
    remainingSessions: pkg.package.remainingSessions,
  });
  const statusKey = studentPackageStatusLabelKey(pkg.package.status);
  const canBook =
    pkg.package.status === "active" && pkg.package.remainingSessions > 0;
  const priceLabel = formatOfferSnapshotPrice(
    pkg.package.priceCents,
    locale,
    pkg.package.currency || "CAD",
  );

  return (
    <article
      className="rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm sm:p-5"
      data-testid="student-package-card"
    >
      <div className="flex gap-3">
        {pkg.teacher.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pkg.teacher.avatarUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-800"
            aria-hidden
          >
            {pkg.teacher.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">{pkg.package.title}</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {t("studentPackagesOfferedByTeacher").replace("{name}", pkg.teacher.name)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                pkg.package.status === "active"
                  ? "bg-teal-50 text-teal-800"
                  : pkg.package.status === "fully_used"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-amber-50 text-amber-900",
              )}
            >
              {t(statusKey)}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">{t("studentPackagesProposedByTeacher")}</p>

      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">{t("studentPackagesRemainingSessions")}</span>
          <span className="font-bold tabular-nums text-slate-900">{progress.remainingSessions}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">{t("studentPackagesUsedSessions")}</span>
          <span className="font-semibold tabular-nums text-slate-800">
            {t("studentPackagesUsedOfTotal")
              .replace("{used}", String(progress.usedSessions))
              .replace("{total}", String(progress.totalSessions))}
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={progress.percentUsed}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("studentPackagesUsedSessions")}
        >
          <div
            className="h-full rounded-full bg-teal-600 transition-[width]"
            style={{ width: `${progress.percentUsed}%` }}
          />
        </div>
      </div>

      <dl className="mt-3 grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
        {pkg.package.durationMinutes != null ? (
          <div>
            <dt className="inline text-slate-500">{t("studentPackagesDuration")}: </dt>
            <dd className="inline font-medium text-slate-800">
              {t("studentPackagesDurationMinutes").replace(
                "{n}",
                String(pkg.package.durationMinutes),
              )}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="inline text-slate-500">{t("studentPackagesPrice")}: </dt>
          <dd className="inline font-medium text-slate-800">{priceLabel}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">{t("studentPackagesActivatedOn")}: </dt>
          <dd className="inline font-medium text-slate-800">
            {formatDateLabel(pkg.package.activatedAt, locale)}
          </dd>
        </div>
        {pkg.offerSnapshot.specialite ? (
          <div className="sm:col-span-2">
            <dt className="inline text-slate-500">{t("studentPackagesSpecialite")}: </dt>
            <dd className="inline font-medium text-slate-800">{pkg.offerSnapshot.specialite}</dd>
          </div>
        ) : null}
        {pkg.offerSnapshot.shortDescription ? (
          <div className="sm:col-span-2">
            <p className="leading-relaxed text-slate-600">{pkg.offerSnapshot.shortDescription}</p>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          href={pkg.teacher.profileHref}
          className={cn(
            "inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-bold transition",
            canBook
              ? "bg-teal-700 text-white hover:bg-teal-800"
              : "border border-[#DCEAE3] bg-[#F3FAF6] text-teal-800 hover:bg-teal-50",
          )}
          data-testid="student-package-book-cta"
        >
          {canBook ? t("studentPackagesBookWithTeacher") : t("studentPackagesViewTeacher")}
        </Link>
      </div>

      {pkg.redemptions.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-800"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            data-testid="student-package-history-toggle"
          >
            {t("studentPackagesHistoryTitle")}
            {historyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {historyOpen ? (
            <ul className="mt-2 space-y-2" data-testid="student-package-history">
              {pkg.redemptions.map((row) => (
                <RedemptionRow key={row.id} row={row} locale={locale} t={t} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
