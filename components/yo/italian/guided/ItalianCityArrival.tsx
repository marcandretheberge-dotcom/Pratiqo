"use client";

import { Compass, MapPin } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { italianWorldForUnit } from "@/lib/yo/italian/worlds";
import { italianCityIdentity } from "@/lib/yo/italian/cityIdentity";
import { ItalianCityArtwork } from "./ItalianCityArtwork";
import type { YoLocale } from "@/lib/yo/types";

/** Lightweight original arrival card; decorative motion never gates lessons or audio. */
export function ItalianCityArrival({ unitId, locale, mastered }: {
  unitId: string; locale: YoLocale; mastered: boolean;
}) {
  const world = italianWorldForUnit(unitId);
  const city = world?.cities.find(item => item.unitId === unitId);
  if (!city || !world) return null;
  const identity = italianCityIdentity(unitId);
  const say = {
    fr: { start: "Yoppo arrive à", again: "Destination explorée", detail: "Continue ta visite linguistique, une mission à la fois." },
    en: { start: "Yoppo arrives in", again: "Destination explored", detail: "Keep exploring the language, one mission at a time." },
    es: { start: "Yoppo llega a", again: "Destino explorado", detail: "Continúa tu viaje lingüístico, misión a misión." },
  }[locale];
  return <section data-yoppo-city-arrival={unitId} className="relative isolate min-w-0 overflow-hidden rounded-3xl border-2 border-emerald-200 bg-white shadow-sm" aria-label={`${say.start} ${city.name}`}>
    <ItalianCityArtwork unitId={unitId} locale={locale} className="block h-auto min-h-40 w-full" />    <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 sm:bottom-5">
      <div className="rounded-2xl border border-emerald-100 bg-[#fffaf0]/95 px-3 py-2 text-emerald-950 shadow-sm sm:px-4 sm:py-3">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs"><Compass size={14} aria-hidden />{mastered?say.again:say.start}</p>
        <p className="mt-1 flex items-center gap-1 font-serif text-xl font-black sm:text-2xl"><MapPin size={17} aria-hidden/>{city.name}</p>
      </div>
      <div className="yo-yoppo-city-arrival relative rounded-full border-2 border-amber-300 bg-white p-1 shadow-lg" aria-hidden="true"><CompanionAvatar visualId="travel" state={mastered?"celebrating":"map"} size="sm" compact locale={locale}/></div>
    </div>
    {identity ? <p className="sr-only" data-yoppo-city-cultural-motif={identity.motif}>{identity.inspiration[locale]}</p> : null}
    <style>{`@keyframes yo-yoppo-city-arrive{from{transform:translateX(-24px) translateY(12px);opacity:.5}to{transform:translateX(0) translateY(0);opacity:1}}@media(prefers-reduced-motion:no-preference){.yo-yoppo-city-arrival{animation:yo-yoppo-city-arrive .7s ease-out both}}`}</style>
  </section>;
}
