"use client";

import React from "react";
import { useLocale } from "@/lib/locale-context";
import type { TeacherOfferFormValues } from "@/lib/offers/clientPayload";
import { dollarsInputToPriceCents } from "@/lib/offers/clientPayload";
import {
  formatPublicTeacherOfferPackageChip,
  formatPublicTeacherOfferPriceLabel,
  formatTeacherOfferDiscipline,
  formatTeacherOfferDuration,
  formatTeacherOfferFormatLabel,
  formatTeacherOfferTypeLabel,
} from "@/lib/offers/display";
import type { TeacherOfferFormat, TeacherOfferType } from "@/lib/offers/types";
import { TEACHER_OFFER_FORMATS, TEACHER_OFFER_MVP_TYPES } from "@/lib/offers/types";
import { PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS } from "@/lib/teachers/display";
import { TeacherOfferCoverImage } from "@/components/teacher/TeacherOfferCoverImage";
import { cn } from "@/lib/utils";

type Props = {
  values: TeacherOfferFormValues;
  coverImageUrl?: string | null;
  className?: string;
};

/**
 * Live local preview of how an offer may appear on the public profile.
 * Uses form state only — never fetches teacher_offers.
 */
export function TeacherOfferPreview({ values, coverImageUrl = null, className }: Props) {
  const { t, locale } = useLocale();
  const title = values.title.trim() || t("teacherOffersPreviewTitlePlaceholder");
  const offerType =
    values.offerType && (TEACHER_OFFER_MVP_TYPES as readonly string[]).includes(values.offerType)
      ? (values.offerType as TeacherOfferType)
      : null;
  const format =
    values.format && (TEACHER_OFFER_FORMATS as readonly string[]).includes(values.format)
      ? (values.format as TeacherOfferFormat)
      : null;
  const priceCents = dollarsInputToPriceCents(values.priceDollars);
  const durationRaw = values.durationMinutes.trim();
  const durationMinutes =
    durationRaw && /^\d+$/.test(durationRaw) ? Number.parseInt(durationRaw, 10) : null;
  const sessionRaw = values.sessionCount.trim();
  const sessionCount =
    sessionRaw && /^\d+$/.test(sessionRaw) ? Number.parseInt(sessionRaw, 10) : null;
  const shortDescription =
    values.shortDescription.trim() || t("teacherOffersPreviewSummaryPlaceholder");
  const disciplineLabel =
    formatTeacherOfferDiscipline(values.disciplineId, locale) ||
    t("teacherOffersPreviewDisciplinePlaceholder");

  const chips = [
    offerType ? formatTeacherOfferTypeLabel(offerType, t) : null,
    format ? formatTeacherOfferFormatLabel(format, t) : null,
    disciplineLabel,
    formatTeacherOfferDuration(durationMinutes, t),
    offerType === "package"
      ? formatPublicTeacherOfferPackageChip(
          { offerType: "package", sessionCount },
          t,
        )
      : null,
  ].filter((value): value is string => Boolean(value));

  const priceLabel =
    priceCents != null && offerType
      ? formatPublicTeacherOfferPriceLabel({ offerType, priceCents }, t, locale)
      : t("teacherOffersPreviewPricePlaceholder");

  const alt = t("teacherOffersCoverAlt").replace("{title}", title);

  return (
    <aside
      aria-labelledby="teacher-offer-preview-title"
      className={cn("rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-4", className)}
    >
      <p
        id="teacher-offer-preview-title"
        className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-800"
      >
        {t("teacherOffersPreviewLabel")}
      </p>
      <div className="mt-3">
        <TeacherOfferCoverImage imageUrl={coverImageUrl} title={title} alt={alt} />
      </div>
      <article className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm font-semibold text-slate-800">{priceLabel}</p>
        </div>
        {chips.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <li key={chip}>
                <span
                  className={cn(
                    PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS,
                    "px-2.5 py-0.5 text-[11px]",
                  )}
                >
                  {chip}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{shortDescription}</p>
      </article>
    </aside>
  );
}
