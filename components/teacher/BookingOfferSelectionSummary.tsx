"use client";

import React from "react";
import { useLocale } from "@/lib/locale-context";
import {
  formatPublicTeacherOfferPriceLabel,
  formatTeacherOfferFormatLabel,
  formatTeacherOfferTypeLabel,
} from "@/lib/offers/display";
import { getBookingOfferSelectionNoteKey } from "@/lib/offers/offerSnapshotCheckout";
import type { PublicTeacherOfferDto } from "@/lib/offers/publicTeacherOfferDto";

type Props = {
  offer: PublicTeacherOfferDto;
  onChangeOffer?: () => void;
};

export function BookingOfferSelectionSummary({ offer, onChangeOffer }: Props) {
  const { t, locale } = useLocale();
  const priceLabel = formatPublicTeacherOfferPriceLabel(offer, t, locale);

  return (
    <div
      data-testid="booking-selected-offer-summary"
      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            {t("bookingOfferSelectionSelected")}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{offer.title}</p>
          <p className="mt-1 text-xs text-slate-600">
            {[
              formatTeacherOfferTypeLabel(offer.offerType, t),
              formatTeacherOfferFormatLabel(offer.format, t),
              priceLabel,
            ].join(" · ")}
          </p>
        </div>
        {onChangeOffer ? (
          <button
            type="button"
            data-testid="booking-offer-change"
            onClick={onChangeOffer}
            className="shrink-0 text-xs font-semibold text-slate-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            {t("bookingOfferSelectionChange")}
          </button>
        ) : null}
      </div>
      <p className="text-[11px] leading-relaxed text-slate-600">{t(getBookingOfferSelectionNoteKey())}</p>
    </div>
  );
}
