"use client";

import React, { useId, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import {
  formatPublicTeacherOfferAge,
  formatPublicTeacherOfferCapacity,
  formatPublicTeacherOfferLevel,
  formatPublicTeacherOfferPackageChip,
  formatPublicTeacherOfferPriceLabel,
  formatTeacherOfferDiscipline,
  formatTeacherOfferDuration,
  formatTeacherOfferFormatLabel,
  formatTeacherOfferTypeLabel,
} from "@/lib/offers/display";
import type { PublicTeacherOfferDto } from "@/lib/offers/publicTeacherOfferDto";
import { PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS } from "@/lib/teachers/display";
import { cn } from "@/lib/utils";
import { isBookingOfferSelectionEnabled } from "@/lib/offers/bookingOfferSelection";
import { TeacherOfferCoverImage } from "@/components/teacher/TeacherOfferCoverImage";

type Props = {
  offer: PublicTeacherOfferDto;
  onPrepareBooking?: (offerId: string) => void;
};

export function PublicTeacherOfferCard({ offer, onPrepareBooking }: Props) {
  const { t, locale } = useLocale();
  const showPrepareBooking = isBookingOfferSelectionEnabled() && typeof onPrepareBooking === "function";
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const shortText = offer.shortDescription?.trim() || "";
  const fullText = offer.description?.trim() || "";
  const preview = shortText || fullText;
  const canExpand = Boolean(shortText && fullText && fullText !== shortText);
  const chips = [
    formatTeacherOfferTypeLabel(offer.offerType, t),
    formatTeacherOfferFormatLabel(offer.format, t),
    formatTeacherOfferDiscipline(offer.disciplineId, locale),
    formatTeacherOfferDuration(offer.durationMinutes, t),
    formatPublicTeacherOfferPackageChip(offer, t),
    formatPublicTeacherOfferCapacity(offer, t),
    formatPublicTeacherOfferLevel(offer.level, t),
    formatPublicTeacherOfferAge(offer, t),
    offer.specialite?.trim() || null,
  ].filter((value): value is string => Boolean(value));
  const priceLabel = formatPublicTeacherOfferPriceLabel(offer, t, locale);

  return (
    <article
      data-testid="teacher-profile-offer-card"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3">
        <TeacherOfferCoverImage
          imageUrl={offer.imageUrl}
          title={offer.title}
          alt={t("teacherOffersCoverAlt").replace("{title}", offer.title)}
        />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-base font-semibold text-slate-900">{offer.title}</h3>
        <p className="text-sm font-semibold text-slate-800" aria-label={priceLabel}>
          {priceLabel}
        </p>
      </div>
      {chips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li key={chip}>
              <span className={cn(PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS, "px-2.5 py-0.5 text-[11px]")}>
                {chip}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {preview ? <p className="mt-3 text-sm leading-relaxed text-slate-600">{preview}</p> : null}
      {canExpand ? (
        <p
          id={detailsId}
          className={cn(
            "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600",
            !expanded && "hidden",
          )}
        >
          {fullText}
        </p>
      ) : null}
      {canExpand ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="mt-3 rounded-full px-1 py-1 text-sm font-semibold text-slate-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? t("publicTeacherOffersHideDetails") : t("publicTeacherOffersShowDetails")}
        </button>
      ) : null}
      {showPrepareBooking ? (
        <button
          type="button"
          data-testid="teacher-profile-offer-prepare-booking"
          onClick={() => onPrepareBooking(offer.id)}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          {t("bookingOfferSelectionPrepare")}
        </button>
      ) : null}
    </article>
  );
}
