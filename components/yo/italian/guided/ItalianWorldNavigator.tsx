"use client";

import { useState } from "react";
import { ArrowRight, Check, Gamepad2, LockKeyhole, Music2, Sparkles, X } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
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
  /** Existing guided player handles lessons. Navigation cannot award a result. */
  onPlayCurrentCity?: () => void;
  currentActionLabel?: string;
  missionHint?: string;
  triviaAvailable?: boolean;
  onOpenTrivia?: () => void;
  showGuide?: boolean;
  onDismissGuide?: () => void;
};

/**
 * Map-only game shell. The landscape stays mounted as lessons are opened in
 * a separate dialog. World travel remains a visual projection of verified
 * assessments; it never grants credit, Passes, stamps or paid access.
 */
export function ItalianWorldNavigator({
  journey, locale, currentUnitId, hrefForUnit, canReview, onPlayCurrentCity,
  currentActionLabel, missionHint, triviaAvailable = false, onOpenTrivia,
  showGuide = false, onDismissGuide,
}: Props) {
  const worlds = projectItalianWorlds(journey);
  const initial = worlds.findIndex(item => item.cities.some(city => city.unitId === currentUnitId));
  const [selected, setSelected] = useState(Math.max(0, initial));
  const [portalArrival, setPortalArrival] = useState<string | null>(null);
  const feedback = useLearningFeedback();
  const copy = {
    fr: {
      world: "Monde", choose: "Choisir un monde", next: "Monde suivant", flute: "Jouer de la flûte",
      arrived: "Nouveau monde découvert !", trivia: "Jouer au Trivia",
      guide: "Touche la ville illuminée. Je t'accompagne dans ta prochaine mission !",
      close: "Passer la visite", stamp: "Yoppo Pass gagné",
    },
    en: {
      world: "World", choose: "Choose a world", next: "Next world", flute: "Play the flute",
      arrived: "New world discovered!", trivia: "Play Trivia",
      guide: "Tap the glowing city. I'll guide you through your next mission!",
      close: "Skip the tour", stamp: "Yoppo Pass earned",
    },
    es: {
      world: "Mundo", choose: "Elegir un mundo", next: "Mundo siguiente", flute: "Tocar la flauta",
      arrived: "¡Nuevo mundo descubierto!", trivia: "Jugar al Trivia",
      guide: "Toca la ciudad iluminada. ¡Te guiaré en tu próxima misión!",
      close: "Saltar la visita", stamp: "Yoppo Pass obtenido",
    },
  }[locale];
  const world = worlds[selected] ?? worlds[0];
  if (!world || !italianWorldForUnit(currentUnitId)) return null;

  function canSelectWorld(index: number) {
    const item = worlds[index];
    return index === 0 || item.open || item.complete ||
      item.cities.some(city => canReview(city.unitId)) || Boolean(worlds[index - 1]?.complete);
  }

  const currentWorld = italianWorldForUnit(currentUnitId)?.id === world.id;
  const canTravel = canUseItalianFlute(worlds, selected);

  return <section data-yoppo-world-map aria-label={copy.choose}
    className="relative mx-auto max-w-full" data-yoppo-map-only
    style={{ width: "min(100%, 480px, max(320px, calc((100dvh - 96px) * 0.5714286)))" }}>
    <ItalianWorldAtlas world={world} locale={locale} currentUnitId={currentUnitId}
      hrefForUnit={hrefForUnit} canReview={canReview}
      onPlayCurrentCity={currentWorld ? onPlayCurrentCity : undefined}
      currentActionLabel={currentActionLabel} guideMessage={missionHint}/>
    <nav aria-label={copy.choose}
      className="absolute right-4 top-[86px] z-30 flex items-center gap-1.5 rounded-full border border-white/75 bg-[#183f42]/80 p-1.5 shadow-xl backdrop-blur-sm sm:right-6">
      {worlds.map((item, index) => {
        const accessible = canSelectWorld(index);
        const active = selected === index;
        return <button key={item.id} type="button" disabled={!accessible}
          aria-label={`${copy.world} ${item.number} : ${item.title[locale]}`}
          aria-current={active ? "step" : undefined}
          onClick={() => { setSelected(index); setPortalArrival(null); }}
          className={`grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-black focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${active
            ? "border-amber-300 bg-[#ffe9a2] text-[#533918]"
            : accessible ? "border-white/60 bg-[#2d796d] text-white"
              : "border-stone-500 bg-stone-700 text-stone-300 opacity-65"}`}>
          {item.complete ? <Check size={18} aria-hidden/> : accessible ? item.number : <LockKeyhole size={16} aria-hidden/>}
        </button>;
      })}
    </nav>
    {world.passEarned ? <span className="absolute right-4 top-[143px] z-20 rounded-full bg-[#fff0b9] px-3 py-1 text-[11px] font-bold text-amber-950 shadow-lg">{copy.stamp}</span> : null}
    {showGuide && currentWorld && onDismissGuide ? <div data-yoppo-map-guide
      className="absolute bottom-[82px] left-3 z-30 flex max-w-[240px] items-start gap-2 rounded-2xl border-2 border-[#fae1a9] bg-white/95 p-2.5 text-[#17493d] shadow-lg sm:left-5">
      <CompanionAvatar visualId="travel" state="teacher_ready" size="xs" locale={locale} compact />
      <p className="text-xs font-bold leading-5">{copy.guide}</p>
      <button type="button" onClick={onDismissGuide} aria-label={copy.close}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2">
        <X size={17} aria-hidden/>
      </button>
    </div> : null}
    {triviaAvailable && currentWorld && onOpenTrivia ? <button type="button"
      data-yoppo-trivia-map={currentUnitId} onClick={onOpenTrivia}
      className="absolute bottom-16 left-3 z-20 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-amber-200 bg-[#fff8d9] px-4 py-2 text-xs font-black text-[#63421d] shadow-lg focus-visible:outline-4 focus-visible:outline-offset-2 sm:left-5">
      <Gamepad2 size={18} aria-hidden/>{copy.trivia}
    </button> : null}
    {world.complete && selected < worlds.length - 1 ? <button type="button"
      data-yoppo-flute={world.id} disabled={!canTravel}
      aria-label={copy.flute + " · " + copy.next}
      onClick={() => {
        if (!canTravel) return;
        setSelected(selected + 1);
        setPortalArrival(worlds[selected + 1].id);
        feedback.sample("unlock");
      }}
      className="absolute bottom-16 right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#f2da9c] bg-[#fff1c2] px-4 py-2.5 text-sm font-black text-[#603b18] shadow-xl focus-visible:outline-4 focus-visible:outline-offset-2 disabled:opacity-50">
      <Music2 size={21} aria-hidden/>{copy.flute}<ArrowRight size={15} aria-hidden/>
    </button> : null}
    {portalArrival === world.id ? <div role="status" data-yoppo-portal-arrival={world.id}
      className="yo-portal-arrival absolute bottom-16 right-3 z-20 flex items-center gap-2 rounded-full bg-[#e4f8d3] px-3 py-2 text-xs font-bold text-emerald-950 shadow-xl">
      <Sparkles size={18} aria-hidden/>{copy.arrived}
    </div> : null}
    <style>{`@keyframes yo-portal-shine{from{opacity:.2;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:no-preference){.yo-portal-arrival{animation:yo-portal-shine .5s ease-out}}`}</style>
  </section>;
}
