"use client";

import React from "react";
import { Check } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import {
  formatPublicTeacherOfferPackageChip,
  formatPublicTeacherOfferPriceLabel,
  formatTeacherOfferDuration,
  formatTeacherOfferFormatLabel,
  formatTeacherOfferTypeLabel,
} from "@/lib/offers/display";
import { getBookingOfferSelectionNoteKey } from "@/lib/offers/offerSnapshotCheckout";
import type { PublicTeacherOfferDto } from "@/lib/offers/publicTeacherOfferDto";
import { PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS } from "@/lib/teachers/display";
import { cn } from "@/lib/utils";
import { TeacherOfferCoverImage } from "@/components/teacher/TeacherOfferCoverImage";

type Props = {
  offers: PublicTeacherOfferDto[];
  selectedOfferId: string | null;
  onSelect: (offerId: string) => void;
  onClear: () => void;
};

export function BookingOfferPicker({ offers, selectedOfferId, onSelect, onClear }: Props) {
  const { t, locale } = useLocale();

  return (
    <section
      data-testid="booking-offer-picker"
      aria-labelledby="booking-offer-picker-heading"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="space-y-1">
        <h3
          id="booking-offer-picker-heading"
          className="text-sm font-semibold text-slate-900"
        >
          {t("bookingOfferSelectionTitle")}
        </h3>
        <p className="text-xs leading-relaxed text-slate-600">{t(getBookingOfferSelectionNoteKey())}</p>
      </div>

      <div className="space-y-2">
        {offers.map((offer) => {
          const selected = offer.id === selectedOfferId;
          const chips = [
            formatTeacherOfferTypeLabel(offer.offerType, t),
            formatTeacherOfferFormatLabel(offer.format, t),
            formatTeacherOfferDuration(offer.durationMinutes, t),
            formatPublicTeacherOfferPackageChip(offer, t),
          ].filter(Boolean);
          const priceLabel = formatPublicTeacherOfferPriceLabel(offer, t, locale);
          const coverAlt = t("teacherOffersCoverAlt").replace("{title}", offer.title);
          return (
            <button
              key={offer.id}
              type="button"
              data-testid={`booking-offer-option-${offer.id}`}
              aria-pressed={selected}
              onClick={() => onSelect(offer.id)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                selected
                  ? "border-teal-600 bg-teal-50/40"
                  : "border-slate-200 bg-slate-50/40 hover:border-slate-300",
              )}
            >
              <div className="mb-2">
                <TeacherOfferCoverImage
                  imageUrl={offer.imageUrl}
                  title={offer.title}
                  alt={coverAlt}
                  aspectClassName="aspect-[16/9] max-h-28"
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{offer.title}</p>
                  {offer.shortDescription ? (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{offer.shortDescription}</p>
                  ) : null}
                  {chips.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {chips.map((chip) => (
                        <li key={chip}>
                          <span
                            className={cn(
                              PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS,
                              "px-2 py-0.5 text-[10px]",
                            )}
                          >
                            {chip}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs font-semibold text-slate-800">{priceLabel}</span>
                  {selected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700">
                      <Check size={14} aria-hidden />
                      {t("bookingOfferSelectionSelected")}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        data-testid="booking-offer-clear"
        onClick={onClear}
        disabled={!selectedOfferId}
        className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
      >
        {t("bookingOfferSelectionNone")}
      </button>
    </section>
  );
}
