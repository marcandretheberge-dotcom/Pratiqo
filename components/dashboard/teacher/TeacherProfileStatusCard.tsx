/**
 * Compact teacher profile status for the dashboard command center.
 * Full visibility checklist lives in Gestion du profil (/teacher/verification).
 */

"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import {
  evaluateTeacherProfilePublishEligibility,
  teacherProfileVisibilityStatusBodyKey,
  teacherProfileVisibilityStatusLabelKey,
  type TeacherProfilePublishInput,
} from "@/lib/teachers/profilePublishEligibility";
import type { TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";

export type TeacherProfileStatusCardProps = {
  teacher: TeacherProfilePublishInput | null;
  /** When teacher row is still loading / missing. */
  loading?: boolean;
  manageHref?: string;
  className?: string;
};

export function TeacherProfileStatusCard({
  teacher,
  loading = false,
  manageHref = "/teacher/verification",
  className,
}: TeacherProfileStatusCardProps) {
  const { t } = useLocale();

  if (loading || !teacher) {
    return (
      <section
        className={cn(
          "rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]",
          className,
        )}
        data-testid="teacher-profile-status-card"
        aria-labelledby="teacher-profile-status-heading"
      >
        <h2 id="teacher-profile-status-heading" className="text-[11px] font-bold uppercase tracking-widest text-[#00694c]">
          {t("teacherDashProfileStatusHeading")}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{t("teacherDashProfileStatusLoading")}</p>
        <Link
          href={manageHref}
          className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
        >
          {t("teacherDashManageProfileCta")}
        </Link>
      </section>
    );
  }

  const evaluation = evaluateTeacherProfilePublishEligibility(teacher);
  const statusLabel = t(teacherProfileVisibilityStatusLabelKey(evaluation.status) as TranslationKey);
  const statusBody = t(teacherProfileVisibilityStatusBodyKey(evaluation.status) as TranslationKey);
  const missingCount = evaluation.missingSectionIds.length;
  const discoveryFirstBody = evaluation.marketplaceVisible
    ? t("teacherDashDiscoveryFirstVisibleBody" as TranslationKey)
    : null;

  const tone =
    evaluation.status === "public"
      ? "calm"
      : evaluation.status === "incomplete" || evaluation.status === "admin_hidden"
        ? "action"
        : "neutral";

  const primaryCta =
    evaluation.status === "ready_to_publish"
      ? { href: manageHref, label: t("teacherProfilePublishButton") }
      : evaluation.status === "incomplete"
        ? { href: manageHref.includes("?") ? manageHref : `${manageHref}?setup=1`, label: t("teacherDashFixProfileCta") }
        : { href: manageHref, label: t("teacherDashManageProfileCta") };

  return (
    <section
      className={cn(
        "rounded-xl border bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]",
        tone === "action" ? "border-amber-200/90" : "border-slate-200/90",
        className,
      )}
      data-testid="teacher-profile-status-card"
      data-status={evaluation.status}
      aria-labelledby="teacher-profile-status-heading"
    >
      <h2 id="teacher-profile-status-heading" className="text-[11px] font-bold uppercase tracking-widest text-[#00694c]">
        {t("teacherDashProfileStatusHeading")}
      </h2>
      <p className="mt-2 text-base font-bold text-slate-900">{statusLabel}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        {discoveryFirstBody ??
        (evaluation.status === "incomplete" && missingCount > 0
          ? t("teacherDashProfileBlockersBody").replace("{count}", String(missingCount))
          : statusBody)}
      </p>
      {evaluation.marketplaceVisible ? (
        <p className="mt-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs leading-relaxed text-teal-900">
          {t("teacherDashDiscoveryFirstStripeBody" as TranslationKey)}
        </p>
      ) : null}
      <Link
        href={primaryCta.href}
        className={cn(
          "mt-3 inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
          tone === "action"
            ? "bg-amber-50 text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100"
            : "text-teal-700 underline-offset-2 hover:underline",
        )}
      >
        {primaryCta.label}
      </Link>
    </section>
  );
}
