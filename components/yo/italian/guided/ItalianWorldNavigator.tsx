"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown, Gamepad2, Music2, Sparkles, X } from "lucide-react";
import { ItalianWorldAtlas, italianWorldGuideId } from "./ItalianWorldAtlas";
import type { LearningJourney } from "@/lib/yo/learningJourney";
import type { YoLocale } from "@/lib/yo/types";
import { canUseItalianFlute, italianWorldForUnit, projectItalianWorlds } from "@/lib/yo/italian/worlds";
import { useLearningFeedback } from "../../feedback/LearningFeedback";
import { primary } from "./copy";

type Props = {
  journey: LearningJourney;
  locale: YoLocale;
  currentUnitId: string;
  hrefForUnit: (unitId: string) => string;
  canReview: (unitId: string) => boolean;
  onPlayCurrentCity?: () => void;
  currentActionLabel?: string;
  guideUnitId?: string;
  motionActive?: boolean;
  startAtCurrentCity?: boolean;
  currentMissionTitle?: string;
  missionHint?: string;
  triviaAvailable?: boolean;
  onOpenTrivia?: () => void;
  showGuide?: boolean;
  onDismissGuide?: () => void;
};

export function ItalianWorldNavigator({
  journey, locale, currentUnitId, hrefForUnit, canReview, onPlayCurrentCity,
  currentActionLabel, guideUnitId, motionActive, startAtCurrentCity = false, currentMissionTitle, missionHint, triviaAvailable = false, onOpenTrivia,
  showGuide = false, onDismissGuide,
}: Props) {
  const worlds = projectItalianWorlds(journey);
  const initial = worlds.findIndex(item => item.cities.some(city => city.unitId === currentUnitId));
  const [selected, setSelected] = useState(Math.max(0, initial));
  const [inspection, setInspection] = useState(() => {
    const world = worlds[Math.max(0, initial)];
    return { unitId: currentUnitId, worldId: world.id, guideId: italianWorldGuideId(world, currentUnitId, canReview, guideUnitId), travel: startAtCurrentCity };
  });
  const [portalArrival, setPortalArrival] = useState<string | null>(null);
  const feedback = useLearningFeedback();
  const copy = {
    fr: { language: "Italien · A1", world: "Monde", choose: "Choisir un monde", next: "Monde suivant", flute: "Jouer de la flûte", arrived: "Nouveau monde découvert !", trivia: "Jouer au Trivia", guide: "Touche la ville illuminée ou continue ta mission ici.", close: "Passer la visite", stamp: "Yoppo Pass gagné", stamps: "tampons", continue: "Continuer", gateOpen: "Les 4 tampons sont dans ton passeport", gateClosed: "Gagne les 4 tampons pour explorer le monde suivant" },
    en: { language: "Italian · A1", world: "World", choose: "Choose a world", next: "Next world", flute: "Play the flute", arrived: "New world discovered!", trivia: "Play Trivia", guide: "Tap the highlighted city or continue your mission here.", close: "Skip the tour", stamp: "Yoppo Pass earned", stamps: "stamps", continue: "Continue", gateOpen: "All 4 stamps are in your passport", gateClosed: "Earn all 4 stamps to explore the next world" },
    es: { language: "Italiano · A1", world: "Mundo", choose: "Elegir un mundo", next: "Mundo siguiente", flute: "Tocar la flauta", arrived: "¡Nuevo mundo descubierto!", trivia: "Jugar al Trivia", guide: "Toca la ciudad iluminada o continúa tu misión aquí.", close: "Saltar la visita", stamp: "Yoppo Pass obtenido", stamps: "sellos", continue: "Continuar", gateOpen: "Los 4 sellos están en tu pasaporte", gateClosed: "Consigue los 4 sellos para explorar el siguiente mundo" },
  }[locale];
  const world = worlds[selected] ?? worlds[0];
  if (!world || !italianWorldForUnit(currentUnitId)) return null;

  function canSelectWorld(index: number) {
    const item = worlds[index];
    return index === 0 || item.open || item.complete || item.cities.some(city => canReview(city.unitId)) || Boolean(worlds[index - 1]?.complete);
  }

  const currentWorld = italianWorldForUnit(currentUnitId)?.id === world.id;
  const canTravel = canUseItalianFlute(worlds, selected);
  const completed = world.citiesWithProgress.filter(city => city.mastered).length;
  const guideId = italianWorldGuideId(world, currentUnitId, canReview, guideUnitId);
  // Only a real guide advance supersedes this session's cosmetic destination.
  const currentInspection = inspection.worldId === world.id && inspection.guideId === guideId;
  const inspectedCity = currentInspection ? inspection.unitId : guideId;
  const selectedCity = world.citiesWithProgress.find(city => city.unitId === inspectedCity && (city.unlocked || canReview(city.unitId)));
  const travelerUnitId = currentInspection && inspection.travel ? selectedCity?.unitId : guideId;
  const isCurrentCity = currentWorld && selectedCity?.unitId === currentUnitId;
  const destination = selectedCity ?? world.citiesWithProgress.find(city => city.unlocked && !city.mastered)
    ?? world.citiesWithProgress.find(city => city.unlocked || canReview(city.unitId));

  return <section data-yoppo-world-map aria-label={copy.choose} className="yo-adventure-board" data-yoppo-map-only>
    <header className="yo-world-heading">
      <p className="yo-world-language">{copy.language}</p>
      <div className="yo-world-selector">
        <h1>{world.title[locale]}</h1>
        <ChevronDown size={19} aria-hidden/>
        <select aria-label={copy.choose} value={selected} onChange={event => { setSelected(Number(event.target.value)); setPortalArrival(null); }}>
          {worlds.map((item, index) => <option key={item.id} value={index} disabled={!canSelectWorld(index)}>{copy.world} {item.number} · {item.title[locale]}</option>)}
        </select>
      </div>
      <p className="yo-world-stamps">{completed} / 4 {copy.stamps}</p>
    </header>
    <ItalianWorldAtlas world={world} locale={locale} currentUnitId={currentUnitId} hrefForUnit={hrefForUnit} canReview={canReview} onPlayCurrentCity={currentWorld ? onPlayCurrentCity : undefined} selectedUnitId={selectedCity?.unitId} guideUnitId={guideUnitId} motionActive={motionActive} onSelectCity={unitId => setInspection({ unitId, worldId: world.id, guideId, travel: true })} travelerUnitId={travelerUnitId}/>
    <div className="yo-world-action">
      {isCurrentCity && onPlayCurrentCity ? <>
        <p className="yo-action-context">{selectedCity?.name} · {missionHint}</p>
        <h2>{currentMissionTitle ?? selectedCity?.step?.unit.title[locale]}</h2>
        <button type="button" className={`${primary} yo-map-continue`} onClick={onPlayCurrentCity} aria-label={currentActionLabel}>{copy.continue}<ArrowRight size={18} aria-hidden/></button>
      </> : destination ? <>
        <p className="yo-action-context">{destination.name}</p>
        <h2>{destination.step?.unit.title[locale]}</h2>
        <Link href={hrefForUnit(destination.unitId)} scroll={false} className={`${primary} yo-map-continue`}>{copy.continue}<ArrowRight size={18} aria-hidden/></Link>
      </> : null}
      {showGuide && currentWorld && onDismissGuide ? <div data-yoppo-map-guide className="yo-map-guide">
        <p>{copy.guide}</p><button type="button" onClick={onDismissGuide} aria-label={copy.close} className="yo-icon-button"><X size={17} aria-hidden/></button>
      </div> : null}
      <div className="yo-map-extras">
        {triviaAvailable && currentWorld && onOpenTrivia ? <button type="button" data-yoppo-trivia-map={currentUnitId} onClick={onOpenTrivia}><Gamepad2 size={18} aria-hidden/>{copy.trivia}</button> : null}
        {world.complete && selected < worlds.length - 1 ? <button type="button" data-yoppo-flute={world.id} disabled={!canTravel} aria-label={`${copy.flute} · ${copy.next}`} onClick={() => {
          if (!canTravel) return;
          setSelected(selected + 1); setPortalArrival(worlds[selected + 1].id); feedback.sample("unlock");
        }}><Music2 size={18} aria-hidden/>{copy.flute}<ArrowRight size={16} aria-hidden/></button> : null}
      </div>
      <p data-yoppo-world-gate={world.complete ? "open" : "closed"} className="yo-world-gate">{world.complete ? copy.gateOpen : copy.gateClosed}</p>
      {world.passEarned ? <p className="yo-world-earned"><Sparkles size={16} aria-hidden/>{copy.stamp}</p> : null}
      {portalArrival === world.id ? <p role="status" data-yoppo-portal-arrival={world.id} className="yo-world-earned">{copy.arrived}</p> : null}
    </div>
  </section>;
}
