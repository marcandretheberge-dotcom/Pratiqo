"use client";

import React, { useEffect, useRef, useState } from "react";
import { PublicTeacherOfferCard } from "@/components/teacher/PublicTeacherOfferCard";
import { useLocale } from "@/lib/locale-context";
import { fetchPublishedTeacherOffers } from "@/lib/offers/publicOffers";
import type { PublicTeacherOfferDto } from "@/lib/offers/publicTeacherOfferDto";

type Props = {
  teacherId: string;
  onOffersLoaded?: (offers: PublicTeacherOfferDto[]) => void;
  onPrepareBooking?: (offerId: string) => void;
};

export function PublicTeacherOffersSection({ teacherId, onOffersLoaded, onPrepareBooking }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<PublicTeacherOfferDto[]>([]);
  const onOffersLoadedRef = useRef(onOffersLoaded);
  onOffersLoadedRef.current = onOffersLoaded;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOffers([]);
    void (async () => {
      try {
        const rows = await fetchPublishedTeacherOffers(teacherId);
        if (!cancelled) {
          setOffers(rows);
          onOffersLoadedRef.current?.(rows);
        }
      } catch {
        if (!cancelled) setOffers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  if (loading) {
    return (
      <div
        data-testid="teacher-profile-offers-loading"
        className="space-y-2"
        aria-hidden="true"
      >
        <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
        <div className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
      </div>
    );
  }

  if (offers.length === 0) return null;

  return (
    <section
      data-testid="teacher-profile-offers"
      aria-labelledby="teacher-profile-offers-heading"
      className="space-y-3"
    >
      <h2
        id="teacher-profile-offers-heading"
        className="text-[10px] font-bold uppercase tracking-widest text-slate-600"
      >
        {t("publicTeacherOffersSection")}
      </h2>
      <div className="space-y-3">
        {offers.map((offer) => (
          <PublicTeacherOfferCard
            key={offer.id}
            offer={offer}
            onPrepareBooking={onPrepareBooking}
          />
        ))}
      </div>
    </section>
  );
}
