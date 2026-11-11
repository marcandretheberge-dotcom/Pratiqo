"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, LockKeyhole, MapPin } from "lucide-react";
import { ItalianMapCompanion } from "./ItalianMapCompanion";
import type { ItalianWorldView } from "@/lib/yo/italian/worlds";
import type { YoLocale } from "@/lib/yo/types";
import { ItalianAdventureProgressPath } from "./ItalianAdventureProgressPath";
import { ITALIAN_CITY_PATH_STOPS } from "./ItalianAdventurePathGeometry";

type Props = {
  world: ItalianWorldView;
  locale: YoLocale;
  currentUnitId: string;
  hrefForUnit: (unitId: string) => string;
  canReview: (unitId: string) => boolean;
  onPlayCurrentCity?: () => void;
  currentActionLabel?: string;
  selectedUnitId?: string;
  guideUnitId?: string;
  motionActive?: boolean;
  travelerUnitId?: string;
  onSelectCity?: (unitId: string) => void;
  guideMessage?: string;
};

const stops = [
  { x: "25%", y: "27%" },
  { x: "73%", y: "45%" },
  { x: "27%", y: "66%" },
  { x: "73%", y: "86%" },
] as const;

/** Existing progress-derived guide, shared by selection and atlas rendering. */
export function italianWorldGuideId(world: ItalianWorldView, currentUnitId: string, canReview: (id: string) => boolean, guideUnitId?: string) {
  const nextStop = world.citiesWithProgress.find(city => city.unlocked && !city.mastered);
  const selectedStop = world.citiesWithProgress.find(city => city.unitId === (guideUnitId ?? currentUnitId));
  return nextStop?.unitId ?? (selectedStop && (selectedStop.unlocked || canReview(selectedStop.unitId)) ? selectedStop.unitId : [...world.citiesWithProgress].reverse().find(city => canReview(city.unitId))?.unitId ?? world.citiesWithProgress.find(city => city.unlocked)?.unitId);
}

/** Artwork is decorative. City access and every status come from the course journey. */
export function ItalianWorldAtlas({ world, locale, currentUnitId, hrefForUnit, canReview, onPlayCurrentCity, selectedUnitId, guideUnitId, onSelectCity, motionActive = true, travelerUnitId }: Props) {
  const copy = {
    fr: { title: "Carte d'aventure", explore: "Explorer", completed: "Tampon obtenu", locked: "Termine d'abord les missions précédentes", current: "Yoppo t'attend" },
    en: { title: "Adventure map", explore: "Explore", completed: "Stamp earned", locked: "Complete the earlier missions first", current: "Yoppo awaits" },
    es: { title: "Mapa de aventura", explore: "Explorar", completed: "Sello obtenido", locked: "Termina las misiones anteriores primero", current: "Yoppo te espera" },
  }[locale];
  const guideId = italianWorldGuideId(world, currentUnitId, canReview, guideUnitId);
  const guideIndex = world.citiesWithProgress.findIndex(city => city.unitId === guideId);
  const pathProgress = world.complete ? 1 : guideIndex >= 0 ? ITALIAN_CITY_PATH_STOPS[guideIndex] ?? 0 : 0;
  const visitedIndex = world.citiesWithProgress.findIndex(city => city.unitId === travelerUnitId && (city.unlocked || canReview(city.unitId)));
  const travelerIndex = visitedIndex >= 0 ? visitedIndex : guideIndex;

  return <section data-yoppo-immersive-atlas={world.id} aria-label={`${copy.title} · ${world.title[locale]}`} className="yo-illustrated-atlas">
    <Image src={`/images/yo/italian/worlds/${world.id}.webp`} alt="" fill sizes="(min-width: 900px) 520px, 100vw" className="yo-world-art" priority/>
    <ItalianAdventureProgressPath worldId={world.id} progress={pathProgress} illustrated/>
    <ItalianMapCompanion key={world.id} index={travelerIndex} locale={locale} active={motionActive}/>
    <ol aria-label={copy.title} data-yoppo-world-cities={world.id} className="yo-city-list">
      {world.citiesWithProgress.map((city, index) => {
        const accessible = city.unlocked || canReview(city.unitId);
        const isGuide = city.unitId === guideId && accessible;
        const position = stops[index];
        if (!position) return null;
        const label = `${copy.explore} ${city.name} · ${city.step?.unit.title[locale] ?? city.unitId}`;
        const node = <span data-yoppo-map-token={city.unitId} data-yoppo-active-city={isGuide ? "true" : undefined} className="yo-city-marker" data-selected={city.unitId === selectedUnitId ? "true" : undefined} data-status={isGuide ? "current" : city.mastered ? "complete" : accessible ? "open" : "locked"}>
          <span className="yo-city-name">
            {isGuide ? <MapPin size={16} aria-hidden/> : null}
            {city.name}
            {city.mastered ? <Check size={18} aria-label={copy.completed}/> : !accessible ? <LockKeyhole size={15} aria-hidden/> : null}
          </span>
        </span>;
        return <li key={city.unitId} aria-current={isGuide ? "step" : undefined} style={{ left: position.x, top: position.y }}>
          {accessible ? onSelectCity
            ? <button type="button" onClick={() => onSelectCity(city.unitId)} aria-pressed={city.unitId === selectedUnitId} aria-label={label} className="yo-city-link">{node}</button>
            : city.unitId === currentUnitId && onPlayCurrentCity
            ? <button type="button" data-yoppo-current-mission={city.unitId} onClick={onPlayCurrentCity} aria-label={label} className="yo-city-link">{node}</button>
            : <Link href={hrefForUnit(city.unitId)} aria-label={label} className="yo-city-link">{node}</Link>
            : <span aria-label={`${city.name} · ${copy.locked}`} title={copy.locked}>{node}</span>}
        </li>;
      })}
    </ol>
  </section>;
}
