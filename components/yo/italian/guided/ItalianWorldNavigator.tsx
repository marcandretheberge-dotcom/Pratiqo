"use client";

import { useState } from "react";
import { ArrowRight, Check, Compass, LockKeyhole, MapPin, Music2, Sparkles, Ticket } from "lucide-react";
import { ItalianWorldAtlas } from "./ItalianWorldAtlas";
import type { LearningJourney } from "@/lib/yo/learningJourney";
import type { YoLocale } from "@/lib/yo/types";
import { canUseItalianFlute, italianWorldForUnit, projectItalianWorlds } from "@/lib/yo/italian/worlds";
import { useLearningFeedback } from "../../feedback/LearningFeedback";

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
  const [portalArrival, setPortalArrival] = useState<string | null>(null);
  const feedback = useLearningFeedback();
  const c = {
    fr: { title: "Les mondes de Yoppo", intro: "Quatre villes, des missions et un château à conquérir.", world: "Monde", pass: "Yoppo Pass gagné", complete: "Monde terminé", locked: "Termine le monde précédent", here: "Ta ville", done: "Défi validé", open: "Explorer la ville", unavailable: "Ville verrouillée", goal: "Dans cette ville", preview: "Les villes donnent un décor au cours; tes réussites réelles ouvrent la route." },
    en: { title: "Yoppo's worlds", intro: "Four cities, exciting missions and a castle to unlock.", world: "World", pass: "Yoppo Pass earned", complete: "World completed", locked: "Finish the previous world", here: "Your city", done: "Challenge passed", open: "Explore the city", unavailable: "City locked", goal: "In this city", preview: "Cities give the course a setting; your real achievements open the path." },
    es: { title: "Los mundos de Yoppo", intro: "Cuatro ciudades, misiones y un castillo por conquistar.", world: "Mundo", pass: "Yoppo Pass obtenido", complete: "Mundo completado", locked: "Termina el mundo anterior", here: "Tu ciudad", done: "Reto superado", open: "Explorar la ciudad", unavailable: "Ciudad bloqueada", goal: "En esta ciudad", preview: "Las ciudades son el escenario del curso; tus logros reales abren el camino." },
  }[locale];

  function canOpenWorld(index: number) {
    const world = worlds[index];
    return index === 0 || world.open || world.complete || world.cities.some(city => canReview(city.unitId)) || worlds[index - 1]?.complete;
  }

  const world = worlds[selected] ?? worlds[0];
  const portal = {
    fr: { flute: "La Flûte des horizons", found: "Les quatre villes sont maîtrisées : Yoppo t'offre une flûte magique pour rejoindre le prochain monde !", travel: "Jouer de la flûte et voyager", arrived: "Le portail s'illumine. Nouveau monde découvert !", denied: "Il faut réussir les quatre défis des villes; la flûte n'ouvre aucun niveau non acquis.", safe: "Pass et flûte : objets de collection, sans débit de crédits ni saut d'évaluation." },
    en: { flute: "Flute of Horizons", found: "You mastered all four cities: Yoppo gives you a magic flute to travel to the next world!", travel: "Play the flute and travel", arrived: "The portal shines. A new world awaits!", denied: "Pass all four city challenges; the flute cannot open an unearned level.", safe: "Pass and flute are collectibles: no credits spent and no exams bypassed." },
    es: { flute: "Flauta de los horizontes", found: "Dominaste las cuatro ciudades: ¡Yoppo te regala una flauta mágica para viajar al siguiente mundo!", travel: "Tocar la flauta y viajar", arrived: "El portal se ilumina. ¡Un mundo nuevo te espera!", denied: "Debes superar los cuatro retos de las ciudades; la flauta no abre niveles no ganados.", safe: "El Pass y la flauta son coleccionables: no consumen créditos ni saltan exámenes." },
  }[locale];
  if (!world || !italianWorldForUnit(currentUnitId)) return null;

  return <section data-yoppo-world-map aria-label={c.title}
    className="mb-8 rounded-[30px] border border-[#f4dfb9] bg-gradient-to-b from-[#fff9e9] via-[#eaf5e9] to-[#f9f6eb] p-2.5 shadow-sm sm:p-5">
    <div className="flex items-center gap-3 px-2 py-3 sm:px-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#236d67] text-[#ffecaf] shadow-[0_4px_0_#164d46]">
        <Compass size={24} aria-hidden/>
      </span>
      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-tight text-[#183f39] sm:text-2xl">{c.title}</h2>
        <p className="mt-0.5 text-xs leading-5 text-[#47635b] sm:text-sm">{c.intro}</p>
      </div>
    </div>

    <nav aria-label={c.title} className="my-2 grid grid-cols-3 gap-1.5 rounded-[22px] bg-[#d9e9d8] p-1.5 sm:gap-2 sm:p-2">
      {worlds.map((item, index) => {
        const accessible = canOpenWorld(index);
        const active = selected === index;
        return <button key={item.id} type="button" disabled={!accessible}
          aria-current={active ? "step" : undefined}
          onClick={() => { setSelected(index); setPortalArrival(null); }}
          className={"flex min-h-[66px] flex-col items-center justify-center gap-1 rounded-[17px] border-2 px-1.5 py-2 text-center shadow-sm transition-transform focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ffb04a] disabled:opacity-60 sm:min-h-[71px] " +
            (active ? "border-[#c98229] bg-[#fff2c4] text-[#583e1b] shadow-[0_3px_0_#ca9856] " :
              accessible ? "border-white/75 bg-white text-[#255c53] hover:-translate-y-0.5 " :
                "border-[#d1dfd7] bg-[#e5ebe5] text-[#70807a]")}>
          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide sm:text-xs">
            {item.complete ? <Check size={14} aria-hidden/> : accessible ? <MapPin size={14} aria-hidden/> : <LockKeyhole size={13} aria-hidden/>}
            {c.world} {item.number}
          </span>
          <span className="line-clamp-1 text-[10px] font-semibold leading-4 sm:text-sm">{item.title[locale]}</span>
        </button>;
      })}
    </nav>

    <ItalianWorldAtlas world={world} locale={locale} currentUnitId={currentUnitId}
      hrefForUnit={hrefForUnit} canReview={canReview}/>

    {world.complete && selected < worlds.length - 1 ? <div data-yoppo-flute={world.id}
      className="relative mx-1 mt-6 overflow-hidden rounded-3xl border-2 border-[#e7b450] bg-gradient-to-r from-[#fff1b7] via-[#ffe0a7] to-[#e6f5d6] p-4 shadow-[0_5px_0_#b48a43] sm:p-5">
      <span className="pointer-events-none absolute -right-5 -top-9 h-32 w-32 rounded-full bg-white/55 blur-xl" aria-hidden/>
      <div className="relative flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-[#d3a24f] bg-[#fff6d5] text-[#9c5c1e] shadow-sm">
          <Music2 size={28} aria-hidden/>
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-black text-[#573c1b]">{portal.flute}</h4>
          <p className="mt-1 text-sm leading-6 text-[#654f2c]">{portal.found}</p>
        </div>
      </div>
      <button type="button" disabled={!canUseItalianFlute(worlds, selected)}
        onClick={() => {
          if (!canUseItalianFlute(worlds, selected)) return;
          const destination = worlds[selected + 1];
          setSelected(selected + 1);
          setPortalArrival(destination.id);
          feedback.sample("unlock");
        }}
        className="relative mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#195b4e] bg-[#237762] px-4 py-3 text-sm font-black text-white shadow-[0_5px_0_#154c3c] transition-transform hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ffbc53] disabled:opacity-55">
        <Sparkles size={19} aria-hidden/>{portal.travel}<ArrowRight size={17} aria-hidden/>
      </button>
      {!canUseItalianFlute(worlds, selected) ? <p className="mt-3 text-xs text-[#7b5b27]">{portal.denied}</p> : null}
      <p className="mt-3 text-xs leading-5 text-[#735d39]">{portal.safe}</p>
    </div> : null}
    {portalArrival === world.id ? <div role="status" data-yoppo-portal-arrival={world.id}
      className="yo-portal-arrival mx-1 mt-4 flex items-center gap-3 rounded-2xl border border-[#b6dc9d] bg-[#e4f8d3] p-4 font-black text-[#275c43]">
      <Sparkles size={22} aria-hidden/><span>{portal.arrived}</span>
    </div> : null}
    <style>{`@keyframes yo-portal-shine{from{opacity:.2;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@media(prefers-reduced-motion:no-preference){.yo-portal-arrival{animation:yo-portal-shine .55s ease-out}}`}</style>
  </section>;
}
