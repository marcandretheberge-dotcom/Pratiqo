"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Compass, LockKeyhole, MapPin, Ticket } from "lucide-react";
import type { LearningJourney } from "@/lib/yo/learningJourney";
import type { YoLocale } from "@/lib/yo/types";
import { italianWorldForUnit, projectItalianWorlds } from "@/lib/yo/italian/worlds";

type Props = {
  journey: LearningJourney;
  locale: YoLocale;
  currentUnitId: string;
  hrefForUnit: (unitId: string) => string;
  canReview: (unitId: string) => boolean;
};

/**
 * World selection is navigation only. Canonical assessed results determine all
 * unlocked cities and earned passes; this UI cannot mint currency or access.
 */
export function ItalianWorldNavigator({ journey, locale, currentUnitId, hrefForUnit, canReview }: Props) {
  const worlds = projectItalianWorlds(journey);
  const initial = worlds.findIndex(world => world.cities.some(city => city.unitId === currentUnitId));
  const [selected, setSelected] = useState(Math.max(0, initial));
  const c = {
    fr: { title: "Les mondes de Yoppo", intro: "Chaque ville est un module; ses missions t'apprennent à utiliser l'italien.", world: "Monde", pass: "Yoppo Pass gagné", complete: "Monde terminé", locked: "Termine le monde précédent", here: "Ta ville", done: "Défi validé", open: "Explorer la ville", unavailable: "Ville verrouillée", goal: "Dans cette ville", preview: "Les villes donnent un décor au cours; tes réussites réelles ouvrent la route." },
    en: { title: "Yoppo's worlds", intro: "Each city is a module; its missions teach you how to use Italian.", world: "World", pass: "Yoppo Pass earned", complete: "World completed", locked: "Finish the previous world", here: "Your city", done: "Challenge passed", open: "Explore the city", unavailable: "City locked", goal: "In this city", preview: "Cities give the course a setting; your real achievements open the path." },
    es: { title: "Los mundos de Yoppo", intro: "Cada ciudad es un módulo; sus misiones te enseñan a usar el italiano.", world: "Mundo", pass: "Yoppo Pass obtenido", complete: "Mundo completado", locked: "Termina el mundo anterior", here: "Tu ciudad", done: "Reto superado", open: "Explorar la ciudad", unavailable: "Ciudad bloqueada", goal: "En esta ciudad", preview: "Las ciudades son el escenario del curso; tus logros reales abren el camino." },
  }[locale];

  function canOpenWorld(index: number) {
    const world = worlds[index];
    return index === 0 || world.open || world.complete || world.cities.some(city => canReview(city.unitId)) || worlds[index - 1]?.complete;
  }

  const world = worlds[selected] ?? worlds[0];
  if (!world || !italianWorldForUnit(currentUnitId)) return null;

  return <section data-yoppo-world-map aria-label={c.title} className="mb-7 rounded-3xl border-2 border-emerald-200 bg-gradient-to-b from-[#edf5ed] to-[#fbf9f3] p-4 sm:p-6">
    <div className="flex items-start gap-3">
      <Compass size={25} className="mt-1 shrink-0 text-emerald-800" aria-hidden />
      <div>
        <h2 className="text-xl font-black text-emerald-950 sm:text-2xl">{c.title}</h2>
        <p className="mt-1 text-sm leading-6 text-stone-700">{c.intro}</p>
      </div>
    </div>
    <nav aria-label={c.title} className="mt-5 grid grid-cols-3 gap-2">
      {worlds.map((item, index) => {
        const accessible = canOpenWorld(index);
        return <button key={item.id} type="button" disabled={!accessible} aria-current={selected === index ? "step" : undefined}
          onClick={() => setSelected(index)}
          className={`min-h-16 rounded-2xl border-2 p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${selected === index ? "border-emerald-800 bg-white text-emerald-950 shadow-sm" : accessible ? "border-emerald-200 bg-emerald-50 text-stone-800" : "border-stone-200 bg-stone-100 text-stone-500"}`}>
          <span className="flex items-center gap-1 text-xs font-black">
            {item.complete ? <Check size={15} aria-hidden /> : accessible ? <MapPin size={15} aria-hidden /> : <LockKeyhole size={14} aria-hidden />}
            {c.world} {item.number}
          </span>
          <span className="mt-1 block text-xs font-semibold leading-5">{item.title[locale]}</span>
        </button>;
      })}
    </nav>
    <div className="mt-5 rounded-2xl bg-white/80 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{c.world} {world.number} / {worlds.length}</p>
          <h3 className="mt-1 text-lg font-bold text-emerald-950">{world.title[locale]}</h3>
          <p className="mt-1 text-sm text-stone-600">{world.description[locale]}</p>
        </div>
        {world.passEarned ? <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"><Ticket size={17} aria-hidden />{c.pass}</span> : null}
      </div>
      <ol className="relative mt-4 grid grid-cols-2 gap-3 md:grid-cols-4" data-yoppo-world-cities={world.id}>
        {world.citiesWithProgress.map((city, index) => {
          const current = city.unitId === currentUnitId;
          const accessible = city.unlocked || canReview(city.unitId);
          const content = <div className={`flex h-full min-h-32 flex-col rounded-xl border-2 p-3 text-left ${current ? "border-orange-500 bg-orange-50" : city.mastered ? "border-emerald-500 bg-emerald-50" : accessible ? "border-emerald-200 bg-white" : "border-stone-200 bg-stone-50 text-stone-500"}`}>
            <span className="flex items-center justify-between gap-1 text-xs font-black">
              <span>{index + 1}. {city.name}</span>
              {city.mastered ? <Check size={16} aria-hidden /> : accessible ? <MapPin size={15} aria-hidden /> : <LockKeyhole size={15} aria-hidden />}
            </span>
            <span className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{city.step?.unit.title[locale] ?? city.unitId}</span>
            <span className="mt-auto pt-3 text-xs font-medium">{current ? c.here : city.mastered ? c.done : accessible ? c.open : c.unavailable}</span>
            {accessible ? <ArrowRight size={15} aria-hidden className="mt-1 shrink-0" /> : null}
          </div>;
          return <li key={city.unitId} aria-current={current ? "step" : undefined}>
            {accessible ? <Link href={hrefForUnit(city.unitId)} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800" aria-label={`${c.open} : ${city.name} — ${city.step?.unit.title[locale] ?? city.unitId}`}>{content}</Link>
              : <div aria-label={`${city.name} : ${c.unavailable}`}>{content}</div>}
          </li>;
        })}
      </ol>
      <p className="mt-4 text-xs leading-5 text-stone-600">{c.preview}</p>
    </div>
  </section>;
}
