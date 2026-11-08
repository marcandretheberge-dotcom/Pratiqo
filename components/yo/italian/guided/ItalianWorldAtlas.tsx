"use client";

import Link from "next/link";
import { Check, Castle, Flag, LockKeyhole, MapPin, Sparkles } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { ItalianCityArtwork } from "./ItalianCityArtwork";
import type { ItalianWorldView } from "@/lib/yo/italian/worlds";
import type { YoLocale } from "@/lib/yo/types";

type Props = {
  world: ItalianWorldView;
  locale: YoLocale;
  currentUnitId: string;
  hrefForUnit: (unitId: string) => string;
  canReview: (unitId: string) => boolean;
};

/** Original illustrated atlas, not a new game-state engine.
 * Every interactive location still uses the canonical journey entitlement. */
const theme = {
  discover: { sky: "#CBE9E5", hills: "#AFCFB9", ground: "#E8DCB9", road: "#F9F2D9", border: "#E7C78B", stone: "#C68E77", roof: "#9A594E" },
  "daily-life": { sky: "#C6E1EC", hills: "#A8CFC3", ground: "#E5DCB9", road: "#FFF0CB", border: "#D7B87A", stone: "#B87B6A", roof: "#8B625D" },
  independence: { sky: "#E6D8E5", hills: "#BCBCD9", ground: "#D4E1CA", road: "#F6EBCF", border: "#E1BB81", stone: "#C18C75", roof: "#7A687E" },
} as const;

function AtlasLandscape({ world }: { world: ItalianWorldView }) {
  const t = theme[world.id as keyof typeof theme] ?? theme.discover;
  return <svg viewBox="0 0 960 410" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" focusable="false" data-atlas-landscape={world.id}>
    <defs>
      <linearGradient id={`yo-atlas-sky-${world.id}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={t.sky}/><stop offset="1" stopColor="#F8F3E4"/></linearGradient>
      <pattern id={`yo-atlas-dots-${world.id}`} width="23" height="23" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="1.5" fill="#887C61" opacity=".16"/></pattern>
    </defs>
    <rect width="960" height="410" fill={`url(#yo-atlas-sky-${world.id})`}/>
    <circle cx={world.id === "independence" ? 820 : 120} cy="70" r="39" fill="#F2CA75" opacity=".92"/>
    {[{x:62,y:86},{x:267,y:58},{x:505,y:90},{x:735,y:54}].map(cloud=><path key={cloud.x} d={`M${cloud.x} ${cloud.y} c12 -23 37 -20 48 -5 c26 -14 53 11 48 23 h-107Z`} fill="#FFFDF2" opacity=".63"/>)}
    <path d="M0 181 Q140 64 291 164 T598 141 T960 167 V410 H0Z" fill={t.hills}/>
    <path d="M0 237 Q152 152 317 220 T634 197 T960 200 V410 H0Z" fill={t.ground}/>
    {world.id === "daily-life" ? <path d="M0 315 Q214 277 425 332 T960 290 V410 H0Z" fill="#8AC2C6" opacity=".78"/> : null}
    {world.id === "independence" ? <path d="M0 356 Q193 304 369 360 T739 329 T960 345 V410 H0Z" fill="#9DBEC7" opacity=".86"/> : null}
    <path d="M0 302 C190 187 240 370 461 270 S750 239 960 306" stroke="#C1A982" strokeWidth="51" opacity=".65" fill="none" strokeLinecap="round"/>
    <path d="M0 302 C190 187 240 370 461 270 S750 239 960 306" stroke={t.road} strokeWidth="38" fill="none" strokeLinecap="round"/>
    <path d="M0 302 C190 187 240 370 461 270 S750 239 960 306" stroke="#BCA978" strokeWidth="2" strokeDasharray="8 12" fill="none" strokeLinecap="round"/>
    <g transform="translate(397 94)">
      <rect x="0" y="50" width="125" height="95" rx="7" fill={t.stone}/>
      <path d="M-12 57 L61 11 L137 57Z" fill={t.roof}/>
      {[15,50,85].map(x=><path key={x} d={`M${x} 145 V97 a13 13 0 0 1 26 0 V145Z`} fill="#FFF1CA" stroke="#94665A" strokeWidth="2"/>)}
      <rect x="54" y="59" width="18" height="20" rx="3" fill="#FFE4A3"/>
    </g>
    <g transform={world.id === "independence" ? "translate(796 114)" : "translate(768 87)"}>
      <rect x="27" y="16" width="25" height="116" fill="#F2DEC2" stroke="#9C7567" strokeWidth="3"/>
      <path d="M19 18 L39 -5 L60 18Z" fill={t.roof}/>
      <rect x="33" y="5" width="13" height="13" fill="#FFF4B1"/>
      <path d="M39 -4 L10 -25 L68 -25Z" fill="#F1CE7B" opacity=".4"/>
    </g>
    <g stroke="#64866B" strokeLinecap="round" fill="#6F9672">
      {[79,191,605,724,903].map((x,i)=><g key={x} transform={`translate(${x} ${231+(i%2)*35})`}><path d="M0 45V0" strokeWidth="6"/><path d="M-18 23L0 -12L19 23Z"/><path d="M-16 39L0 8L16 39Z" /></g>)}
    </g>
    <rect width="960" height="410" fill={`url(#yo-atlas-dots-${world.id})`} opacity=".38"/>
  </svg>;
}

export function ItalianWorldAtlas({ world, locale, currentUnitId, hrefForUnit, canReview }: Props) {
  const c = {
    fr: { title: "Carte d'aventure", available: "Visiter", mastered: "Ville maîtrisée", locked: "À débloquer", current: "Yoppo est ici", gate: "Porte du monde", passed: "Le passage est ouvert", pending: "Réussis les défis des villes" },
    en: { title: "Adventure map", available: "Visit", mastered: "City mastered", locked: "Locked", current: "Yoppo is here", gate: "World gate", passed: "The gate is open", pending: "Pass the city challenges" },
    es: { title: "Mapa de aventura", available: "Visitar", mastered: "Ciudad dominada", locked: "Bloqueada", current: "Yoppo está aquí", gate: "Puerta del mundo", passed: "El paso está abierto", pending: "Supera los retos de las ciudades" },
  }[locale];
  return <div className="relative isolate mt-4 overflow-hidden rounded-3xl border-2 border-amber-200 shadow-sm" data-yoppo-immersive-atlas={world.id} aria-label={`${c.title}: ${world.title[locale]}`}>
    <AtlasLandscape world={world}/>
    <ol className="relative z-10 grid min-h-72 grid-cols-2 gap-x-3 gap-y-6 px-3 pb-5 pt-6 sm:min-h-64 sm:grid-cols-4 sm:gap-4 sm:px-7 sm:pt-10" aria-label={c.title}>
      {world.citiesWithProgress.map((city,index)=>{
        const active=city.unitId===currentUnitId, available=city.unlocked||canReview(city.unitId);
        const icon=city.mastered?<Check size={25} aria-hidden/>:available?<MapPin size={22} aria-hidden/>:<LockKeyhole size={21} aria-hidden/>;
        const node=<div className={`relative mx-auto flex min-h-28 w-full max-w-40 flex-col items-center rounded-2xl border-2 px-2 py-2 text-center shadow-sm backdrop-blur-[3px] ${active?"border-orange-500 bg-amber-50/95":city.mastered?"border-emerald-700 bg-emerald-50/95":available?"border-amber-500 bg-white/90":"border-stone-300 bg-white/65 text-stone-600"}`}>
          <span className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] ${city.mastered?"border-emerald-900 bg-emerald-700 text-white":available?"border-amber-800 bg-amber-100 text-emerald-900":"border-stone-300 bg-stone-100 text-stone-500"}`}>{icon}</span>
          <span className={`mt-2 h-14 w-full overflow-hidden rounded-xl border border-stone-100 ${available?"":"grayscale opacity-70"}`} aria-hidden="true"><ItalianCityArtwork unitId={city.unitId} locale={locale} compact decorative className="h-full w-full" /></span>
          <span className="mt-1 break-words text-xs font-black leading-5 sm:text-sm">{city.name}</span>
          <span className="mt-auto text-[10px] font-medium leading-4 sm:text-xs">{city.mastered?c.mastered:available?c.available:c.locked}</span>
          {active?<span className="absolute -right-2 -top-5 rounded-full bg-white p-1 shadow-sm" aria-label={c.current}><CompanionAvatar visualId="travel" state="map" size="xs" compact locale={locale}/></span>:null}
        </div>;
        return <li key={city.unitId} className={`relative ${index%2===1?"sm:translate-y-8":""}`} aria-current={active?"step":undefined}>
          {available?<Link href={hrefForUnit(city.unitId)} className="block min-h-28 rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-emerald-900" aria-label={`${c.available} : ${city.name} — ${city.step?.unit.title[locale]??city.unitId}`}>{node}</Link>:<div aria-label={`${city.name}: ${c.locked}`}>{node}</div>}
        </li>;
      })}
    </ol>
    <div data-yoppo-world-gate={world.complete?"open":"closed"} className={`relative z-10 mx-auto mb-4 flex w-fit items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold shadow-sm sm:text-sm ${world.complete?"border-amber-500 bg-amber-50 text-emerald-900":"border-stone-300 bg-stone-50/90 text-stone-600"}`}>
      {world.complete?<Sparkles size={20} aria-hidden/>:<Castle size={20} aria-hidden/>}
      <span>{c.gate} · {world.complete?c.passed:c.pending}</span>
      {world.complete?<Flag size={19} aria-hidden/>:null}
    </div>
    <style>{`@media(prefers-reduced-motion:no-preference){[data-yoppo-immersive-atlas] li[aria-current="step"]>a>div{animation:yo-atlas-arrival .65s ease-out both}}@keyframes yo-atlas-arrival{from{transform:translateY(9px);opacity:.4}to{transform:translateY(0);opacity:1}}`}</style>
  </div>;
}
