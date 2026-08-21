"use client";

import React from "react";
import { useLocale } from "@/lib/locale-context";
import { teacherOfferPublishIssueLabel } from "@/lib/offers/display";

type Props = {
  missingFields: string[];
  onComplete?: () => void;
  className?: string;
};

/**
 * Structured “À compléter” checklist when an offer cannot be published yet.
 */
export function TeacherOfferMissingFieldsAlert({ missingFields, onComplete, className }: Props) {
  const { t } = useLocale();
  const labels = missingFields
    .map((path) => teacherOfferPublishIssueLabel(path, t))
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) return null;

  return (
    <div
      className={className ?? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"}
      role="status"
      data-testid="teacher-offer-missing-fields"
    >
      <p className="text-sm font-semibold text-amber-950">{t("teacherOffersNotPublishable")}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-900">
        {t("teacherOffersToComplete")}
      </p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-amber-950">
        {labels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      {onComplete ? (
        <button
          type="button"
          onClick={onComplete}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800 sm:w-auto"
          data-testid="teacher-offer-complete-cta"
        >
          {t("teacherOffersCompleteCta")}
        </button>
      ) : null}
    </div>
  );
}
