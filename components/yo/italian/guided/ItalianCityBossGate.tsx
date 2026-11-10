"use client";

import { Castle, CheckCircle2, Flag } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { italianWorldForUnit } from "@/lib/yo/italian/worlds";
import type { YoLocale } from "@/lib/yo/types";

/** Original boss gate, attached only to the EXISTING unit quiz.
 * The animation is a projection of a verified challenge result; it never scores
 * answers or unlocks a unit by itself. */
export function ItalianCityBossGate({ unitId, locale, variant }: {
  unitId: string; locale: YoLocale; variant: "challenge" | "victory";
}) {
  const city = italianWorldForUnit(unitId)?.cities.find(item => item.unitId === unitId);
  if (!city) return null;
  const won = variant === "victory";
  const c = {
    fr: { title: "La porte du défi", enter: "Le dernier défi de", victory: "La porte de", open: "est ouverte !", challenge: "Relie tes connaissances pour franchir la porte.", reward: "Le chemin s'illumine. Ton tampon récompense une réussite vérifiée." },
    en: { title: "The challenge gate", enter: "The final challenge in", victory: "The gate of", open: "is open!", challenge: "Use what you have learned to pass the gate.", reward: "The road lights up. Your stamp recognises a verified result." },
    es: { title: "La puerta del desafío", enter: "El desafío final de", victory: "¡La puerta de", open: "está abierta!", challenge: "Usa lo aprendido para cruzar la puerta.", reward: "El camino se ilumina. Tu sello reconoce un resultado validado." },
  }[locale];

  return <figure data-yoppo-city-boss={unitId} data-boss-outcome={variant} className="mb-5 overflow-hidden rounded-3xl border-2 border-amber-300 bg-[#f9efd7]">
    <div className="relative isolate overflow-hidden">
      <svg viewBox="0 0 640 230" preserveAspectRatio="xMidYMid slice" className="block max-h-64 w-full" role="img" aria-label={won?`${c.victory} ${city.name} ${c.open}`:`${c.enter} ${city.name}`}>
        <rect width="640" height="230" fill="#E8F1E7"/>
        <circle cx="525" cy="48" r="31" fill="#EFCA78"/>
        <path d="M0 142 Q135 78 296 145 T640 111 V230 H0Z" fill="#C5D8BC"/>
        <path d="M0 188 Q210 157 334 179 T640 150 V230 H0Z" fill="#B7CFAC"/>
        <path d="M291 220 L307 136 L348 136 L389 220" fill="#E8CB99"/>
        <path d="M310 228 L313 138 L325 138 L327 228" fill="#FFF1C4" opacity=".7"/>
        <g className={won?"yo-city-boss-open":""} transform="translate(209 36)">
          <rect x="0" y="47" width="221" height="151" rx="7" fill="#C9A783" stroke="#876B58" strokeWidth="3"/>
          <path d="M-12 48 L110 5 L233 48Z" fill="#916659"/>
          {[11,48,83,123,161,197].map(x=><rect key={x} x={x} y="35" width="22" height="21" rx="3" fill="#C9A783" stroke="#876B58" strokeWidth="2"/>)}
          <path d="M63 197 V113 A47 47 0 0 1 157 113 V197Z" fill="#72594E" stroke="#F3DFC1" strokeWidth="6"/>
          <g className={won?"yo-city-gate-door-open":"yo-city-gate-door-closed"} data-yoppo-gate-door>
            <path d="M68 197 V112 A42 42 0 0 1 110 70 V197Z" fill="#916E58" stroke="#4F463C" strokeWidth="4"/>
            <path d="M152 197 V112 A42 42 0 0 0 110 70 V197Z" fill="#916E58" stroke="#4F463C" strokeWidth="4"/>
            <path d="M110 79 V192 M82 121 V181 M138 121 V181" stroke="#CBA879" strokeWidth="3"/>
          </g>
          <rect x="37" y="75" width="27" height="31" rx="5" fill={won?"#FFE7A6":"#D7D0B9"}/>
          <rect x="156" y="75" width="27" height="31" rx="5" fill={won?"#FFE7A6":"#D7D0B9"}/>
          <path d="M110 27 V-8 M110 -8 l31 8 -31 9" stroke="#34694F" strokeWidth="4" fill="#DFB863" strokeLinejoin="round"/>
        </g>
        {won ? <g className="yo-city-boss-rays" stroke="#F2CB6A" strokeWidth="5" strokeLinecap="round">
          <path d="M317 21V4"/><path d="M270 39l-13 -15"/><path d="M368 39l13 -15"/><path d="M415 69l20 -9"/><path d="M229 69l-20 -9"/>
        </g> : null}
        {[{x:56,y:172},{x:564,y:156}].map(({x,y})=><g key={x} transform={`translate(${x} ${y})`}><path d="M0 49 V0" stroke="#6A8658" strokeWidth="6"/><path d="M-19 22 L0 -23 L20 22Z" fill="#779C70"/><path d="M-16 40L0 5L17 40Z" fill="#638B61"/></g>)}
      </svg>
      <div className="absolute bottom-2 right-3 rounded-full border-2 border-amber-200 bg-white p-1 shadow-sm sm:bottom-4 sm:right-6" aria-hidden="true">
        <CompanionAvatar visualId="travel" state={won?"celebrating":"teacher_ready"} size="xs" compact locale={locale}/>
      </div>
    </div>
    <figcaption className="flex items-start gap-3 bg-[#fffaf0] px-4 py-3 text-stone-900">
      <span className="mt-0.5 text-emerald-900">{won?<CheckCircle2 size={21} aria-hidden/>:<Castle size={21} aria-hidden/>}</span>
      <div>
        <p className="text-sm font-black sm:text-base">{won?`${c.victory} ${city.name} ${c.open}`:`${c.enter} ${city.name}`}</p>
        <p className="mt-1 text-xs leading-5 text-stone-700 sm:text-sm">{won?c.reward:c.challenge}</p>
      </div>
      {won?<Flag size={19} className="ml-auto shrink-0 text-emerald-800" aria-hidden/>:null}
    </figcaption>
    <style>{`
      .yo-city-gate-door-open{transform-box:fill-box;transform-origin:center top;transform:translateY(-36px) scaleY(.18)}
      .yo-city-boss-rays{opacity:1}
      @media(prefers-reduced-motion:no-preference){
        .yo-city-boss-open .yo-city-gate-door-open{animation:yo-city-gate-unlock 1.25s cubic-bezier(.21,.75,.28,1) both}
        .yo-city-boss-rays{animation:yo-city-rays-light 1.2s ease-out both}
      }
      @keyframes yo-city-gate-unlock{from{transform:translateY(0) scaleY(1)}to{transform:translateY(-36px) scaleY(.18)}}
      @keyframes yo-city-rays-light{from{opacity:0}to{opacity:1}}
    `}</style>
  </figure>;
}
