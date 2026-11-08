"use client";

import { Compass, MapPin } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { italianWorldForUnit } from "@/lib/yo/italian/worlds";
import type { YoLocale } from "@/lib/yo/types";

const cities = {
  discover: { sky: "#DBEEEA", roofs: "#AE6958", earth: "#C7D8BB", sun: "#ECC671" },
  "daily-life": { sky: "#CDE8F0", roofs: "#B27C5D", earth: "#9EC8C2", sun: "#F1CD83" },
  independence: { sky: "#E4E4F1", roofs: "#806A8D", earth: "#B8CCA9", sun: "#D8B18B" },
} as const;

/** Lightweight original arrival card; decorative motion never gates lessons or audio. */
export function ItalianCityArrival({ unitId, locale, mastered }: {
  unitId: string; locale: YoLocale; mastered: boolean;
}) {
  const world = italianWorldForUnit(unitId);
  const city = world?.cities.find(item => item.unitId === unitId);
  if (!city || !world) return null;
  const position = world.cities.findIndex(item => item.unitId === unitId);
  const colors = cities[world.id as keyof typeof cities] ?? cities.discover;
  const say = {
    fr: { start: "Yoppo arrive à", again: "Destination explorée", detail: "Continue ta visite linguistique, une mission à la fois." },
    en: { start: "Yoppo arrives in", again: "Destination explored", detail: "Keep exploring the language, one mission at a time." },
    es: { start: "Yoppo llega a", again: "Destino explorado", detail: "Continúa tu viaje lingüístico, misión a misión." },
  }[locale];
  return <section data-yoppo-city-arrival={unitId} className="relative isolate min-w-0 overflow-hidden rounded-3xl border-2 border-emerald-200 bg-white shadow-sm" aria-label={`${say.start} ${city.name}`}>
    <svg viewBox="0 0 640 220" preserveAspectRatio="xMidYMid slice" className="block h-auto min-h-40 w-full" role="img" aria-label={`${city.name} — ${say.detail}`}>
      <rect width="640" height="220" fill={colors.sky}/>
      <circle cx={position%2===0?485:120} cy="51" r="28" fill={colors.sun}/>
      <path d="M0 125 Q101 84 212 129 T431 115 T640 127 V220 H0Z" fill={colors.earth}/>
      <path d="M0 179 Q145 146 300 181 T640 160 V220 H0Z" fill="#D8DCC3" />
      <path d="M0 202 Q95 184 176 196 T361 195 T522 166 T640 177" fill="none" stroke="#D1B68E" strokeWidth="24" strokeLinecap="round"/>
      <path d="M0 202 Q95 184 176 196 T361 195 T522 166 T640 177" fill="none" stroke="#FFF2D7" strokeWidth="16" strokeLinecap="round"/>
      <g transform={`translate(${167+(position%3)*32} 25)`}>
        <rect x="0" y="67" width="177" height="102" rx="4" fill={colors.roofs}/>
        <path d="M-9 72 L86 18 L186 72 Z" fill="#965647"/>
        {[24,74,124].map(x=><path key={x} d={`M${x} 169 V116 a16 16 0 0 1 32 0 V169Z`} fill="#F6E8C9" stroke="#A9755B" strokeWidth="2"/>)}
        <rect x="78" y="82" width="21" height="18" rx="3" fill="#FFE5A2"/>
      </g>
      <g transform={`translate(${world.id==="independence"?410:385} 24)`}>
        <rect x="26" y="28" width="46" height="118" fill="#DFBE9E" stroke="#9A7762" strokeWidth="3"/>
        <path d="M18 33 L50 -9 L82 33Z" fill={colors.roofs}/>
        <circle cx="49" cy="52" r="12" fill="#FCE1A0"/>
        <rect x="41" y="88" width="16" height="22" fill="#806D5F"/>
      </g>
      {[44,564].map(x=><g key={x} transform={`translate(${x} 128)`}>
        <path d="M0 64 V-8" stroke="#6B845C" strokeWidth="6"/>
        <path d="M-27 14 L0 -30 L28 14Z" fill="#759D72"/>
        <path d="M-22 38 L0 -3 L23 38Z" fill="#62865F"/>
      </g>)}
      {mastered?<g><circle cx="521" cy="74" r="24" fill="#F6E5AA" opacity=".85"/><path d="M507 73 l10 10 18 -22" stroke="#2D6F52" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/></g>:null}
    </svg>
    <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 sm:bottom-5">
      <div className="rounded-2xl border border-emerald-100 bg-[#fffaf0]/95 px-3 py-2 text-emerald-950 shadow-sm sm:px-4 sm:py-3">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs"><Compass size={14} aria-hidden />{mastered?say.again:say.start}</p>
        <p className="mt-1 flex items-center gap-1 font-serif text-xl font-black sm:text-2xl"><MapPin size={17} aria-hidden/>{city.name}</p>
      </div>
      <div className="yo-yoppo-city-arrival relative rounded-full border-2 border-amber-300 bg-white p-1 shadow-lg" aria-hidden="true"><CompanionAvatar visualId="travel" state={mastered?"celebrating":"map"} size="sm" compact locale={locale}/></div>
    </div>
    <style>{`@keyframes yo-yoppo-city-arrive{from{transform:translateX(-24px) translateY(12px);opacity:.5}to{transform:translateX(0) translateY(0);opacity:1}}@media(prefers-reduced-motion:no-preference){.yo-yoppo-city-arrival{animation:yo-yoppo-city-arrive .7s ease-out both}}`}</style>
  </section>;
}
