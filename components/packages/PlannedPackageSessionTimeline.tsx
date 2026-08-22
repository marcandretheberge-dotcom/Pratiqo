"use client";

import React from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import { ownerBookingDashboardHref } from "@/lib/offers/plannedPackageDashboardLinks";
import {
  formatPlannedPackageDateLabel,
  formatPlannedPackageSessionOfTotal,
  isPlannedPackageReviewStatus,
} from "@/lib/offers/plannedPackageDashboardUi";
import { PlannedPackageStatusBadge } from "@/components/packages/PlannedPackageStatusBadge";
import { teacherSessionPayoutStatusLabelKey } from "@/lib/offers/plannedPackageTeacherStatus";
import type { TeacherSessionPayoutDisplayStatus } from "@/lib/offers/plannedPackageTeacherStatus";

export type PlannedPackageTimelineSession = {
  bookingId: string;
  sessionIndex: number;
  startsAt: string | null;
  isCompleted: boolean;
  payoutStatus?: TeacherSessionPayoutDisplayStatus;
};

export function PlannedPackageSessionTimeline({
  sessions,
  sessionCount,
  nextBookingId,
  variant,
  packageStatus,
}: {
  sessions: PlannedPackageTimelineSession[];
  sessionCount: number;
  nextBookingId?: string | null;
  variant: "student" | "teacher";
  packageStatus?: string;
}) {
  const { t, locale } = useLocale();
  const packageUnderReview = packageStatus ? isPlannedPackageReviewStatus(packageStatus) : false;

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-slate-600" data-testid="planned-package-sessions-empty">
        {t("plannedPackageDashboardSessionsPending")}
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-testid="planned-package-session-timeline">
      {sessions.map((row) => {
        const isNext = row.bookingId === nextBookingId;
        const sessionStatus = packageUnderReview
          ? "under_review"
          : row.isCompleted
            ? "completed"
            : "upcoming";
        const sessionLabel =
          sessionStatus === "under_review"
            ? t("plannedPackageDashboardUnderReview")
            : sessionStatus === "completed"
              ? t("plannedPackageDashboardCompleted")
              : t("plannedPackageDashboardUpcoming");
        const payoutKey =
          variant === "teacher" && row.payoutStatus
            ? teacherSessionPayoutStatusLabelKey(row.payoutStatus)
            : null;

        return (
          <li
            key={row.bookingId}
            className={cn(
              "rounded-xl border bg-slate-50/80 px-3 py-2.5 text-sm",
              isNext ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-100",
            )}
            data-testid={
              variant === "teacher"
                ? "teacher-planned-package-session-row"
                : "student-planned-package-session-row"
            }
            data-next={isNext ? "true" : "false"}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 font-semibold text-slate-800">
                {formatPlannedPackageSessionOfTotal(
                  t("plannedPackageDashboardSessionOfTotal"),
                  row.sessionIndex,
                  sessionCount,
                )}
              </p>
              <PlannedPackageStatusBadge status={sessionStatus} label={sessionLabel} />
            </div>
            {row.startsAt ? (
              <p className="mt-1 break-words text-xs text-slate-500">
                {formatPlannedPackageDateLabel(row.startsAt, locale)}
              </p>
            ) : null}
            {payoutKey ? (
              <p className="mt-1 text-xs font-medium text-teal-800">{t(payoutKey)}</p>
            ) : null}
            <Link
              href={ownerBookingDashboardHref()}
              className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-teal-800 hover:underline"
            >
              {t("plannedPackageDashboardViewSession")}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
