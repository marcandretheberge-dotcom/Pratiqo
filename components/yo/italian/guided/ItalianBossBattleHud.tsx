"use client";

import { Flame, Shield, Sparkles } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";

/** A live boss-fight HUD driven solely by answers from the existing final quiz.
 * No additional question, score, level gate, credit, or entitlement. */
export function ItalianBossBattleHud({ locale, correct, answered, total, assisted, passPercent }: {
  locale: YoLocale; correct: number; answered: number; total: number; assisted: boolean; passPercent: number;
}) {
  const required = Math.ceil(total * passPercent / 100);
  const c = {
    fr: { title: "Le défi du gardien", energy: "Pierres de savoir activées", target: "pierres nécessaires pour franchir la porte", helped: "Un indice a été utilisé : tu pourras recommencer sans aide pour gagner le tampon.", ready: "Chaque bonne réponse illumine la porte du château." },
    en: { title: "The guardian challenge", energy: "Knowledge stones lit", target: "stones required to pass the gate", helped: "You used help: replay without assistance to earn the stamp.", ready: "Each correct answer lights up the castle gate." },
    es: { title: "El reto del guardián", energy: "Piedras de conocimiento encendidas", target: "piedras necesarias para abrir la puerta", helped: "Has usado una pista: repite sin ayuda para ganar el sello.", ready: "Cada respuesta correcta ilumina la puerta del castillo." },
  }[locale];
  const safeCorrect = Math.max(0, Math.min(total, Math.floor(correct)));
  return <section data-yoppo-boss-battle data-boss-stones-lit={safeCorrect} className="mb-5 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-[#fff4d5] to-[#e8f2e5] p-4 text-stone-900" aria-label={c.title}>
    <div className="flex items-center gap-2 text-sm font-black text-emerald-900"><Shield size={20} aria-hidden/>{c.title}<span className="ml-auto text-xs font-bold">{answered}/{total}</span></div>
    <div role="progressbar" aria-label={c.energy} aria-valuemin={0} aria-valuemax={total} aria-valuenow={safeCorrect} className="mt-4 flex flex-wrap items-center gap-2">
      {Array.from({length:total},(_,i)=><span key={i} aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-lg border-2 ${i<safeCorrect?"yo-boss-stone-lit border-amber-700 bg-amber-300 text-amber-950":"border-stone-300 bg-white/80 text-stone-400"}`}>
        {i<safeCorrect?<Sparkles size={17}/>:<Flame size={16}/>}
      </span>)}
    </div>
    <p className="mt-3 text-xs font-bold leading-5 text-emerald-900">{required}/{total} {c.target}</p>
    <p className="mt-1 text-xs leading-5 text-stone-700">{assisted?c.helped:c.ready}</p>
    <style>{`@keyframes yo-boss-stone-glow{from{transform:scale(.82);opacity:.5}to{transform:scale(1);opacity:1}}@media(prefers-reduced-motion:no-preference){.yo-boss-stone-lit{animation:yo-boss-stone-glow .38s ease-out both}}`}</style>
  </section>;
}
