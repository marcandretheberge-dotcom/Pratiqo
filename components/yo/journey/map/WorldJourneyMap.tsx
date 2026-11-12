"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { adventureCopy } from "@/lib/yo/adventure";
import { mapProgressRevision, parseMapBookmark, type MapBookmark, type MapDestination, type WorldMapModel } from "@/lib/yo/worldMap";
import { MapTraveler } from "./MapTraveler";
import { roadPath, roadPoint } from "./roadGeometry";
import { worldRoads } from "./worldRoads";
import { WorldScenery } from "./WorldScenery";
import { worldMapStyles } from "./worldMapStyles";

const copy = {
  fr: { map: "Mon voyage avec Yoppo", continue: "Continuer", explore: "Explorer", chapter: "Étapes", previous: "Étapes précédentes", next: "Étapes suivantes", loading: "Yoppo prépare la carte…", locked: "Termine les étapes précédentes pour continuer." },
  en: { map: "My journey with Yoppo", continue: "Continue", explore: "Explore", chapter: "Stops", previous: "Previous stops", next: "Next stops", loading: "Yoppo is preparing the map…", locked: "Complete the earlier steps to continue." },
  es: { map: "Mi viaje con Yoppo", continue: "Continuar", explore: "Explorar", chapter: "Etapas", previous: "Etapas anteriores", next: "Etapas siguientes", loading: "Yoppo prepara el mapa…", locked: "Completa las etapas anteriores para continuar." },
};

type Props = { model: WorldMapModel; locale: YoLocale; ready?: boolean; active?: boolean;
  href?: (id: string) => string; onContinue?: (id: string) => void };

/** Browsing is isolated from the course ledger. A city tap never runs a lesson action. */
export function WorldJourneyMap({ model, locale, ready = true, active = true, href, onContinue }: Props) {
  const c = copy[locale], key = `yo.map-view.v1.${model.id}`;
  const [view, setView] = useState<MapBookmark | null>(null);
  const latestModel = useRef(model);
  useLayoutEffect(() => { latestModel.current = model; }, [model]);
  const bookmark = useRef<MapBookmark | null>(null);
  useEffect(() => {
    if (!ready) return;
    const m = latestModel.current;
    const index = Math.max(0, m.destinations.findIndex(d => d.id === m.guideId && d.accessible));
    let saved: MapBookmark | null = null;
    try { saved = parseMapBookmark(sessionStorage.getItem(key), m); } catch { /* Browsing still works without storage. */ }
    const initial = saved ?? { revision: mapProgressRevision(m), destinationId: m.destinations[index]?.id, chapter: Math.floor(index / 4), position: index % 4 };
    bookmark.current = initial;
    setView(initial);
    const persist = () => { try { if (bookmark.current) sessionStorage.setItem(key, JSON.stringify(bookmark.current)); } catch { /* Cosmetic only. */ } };
    window.addEventListener("pagehide", persist);
    return () => { persist(); window.removeEventListener("pagehide", persist); };
  }, [key, ready]);

  if (!ready || !view) return <section className="yo-shared-map-loading" aria-busy="true"><style>{worldMapStyles}</style><p role="status">{c.loading}</p></section>;
  const guideIndex = model.destinations.findIndex(d => d.id === model.guideId && d.accessible);
  const revision = mapProgressRevision(model);
  const sameGuide = view.revision === revision;
  const chapter = sameGuide ? view.chapter : Math.max(0, Math.floor(guideIndex / 4));
  const destinations = model.destinations.slice(chapter * 4, chapter * 4 + 4);
  const selected = destinations.find(d => d.id === (sameGuide ? view.destinationId : model.guideId) && d.accessible)
    ?? destinations.find(d => d.accessible);
  const selectedIndex = selected ? destinations.indexOf(selected) : -1;
  const road = worldRoads[model.world];
  const count = Math.ceil(model.destinations.length / 4);
  const target = selected?.href ?? (selected && href ? href(selected.id) : undefined);

  function remember(next: MapBookmark) {
    bookmark.current = next; setView(next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* Never block navigation for a cosmetic preference. */ }
  }
  function select(destination: MapDestination) {
    if (!destination.accessible || destination.id === selected?.id) return;
    remember({ revision, destinationId: destination.id, chapter, position: bookmark.current?.position ?? selectedIndex });
  }
  function changeChapter(next: number) {
    const group = model.destinations.slice(next * 4, next * 4 + 4), first = group.find(d => d.accessible);
    remember({ revision, destinationId: first?.id, chapter: next, position: Math.max(0, group.findIndex(d => d.id === first?.id)) });
  }
  function savePosition(position: number) {
    bookmark.current = { revision, destinationId: selected?.id, chapter, position };
  }

  return <section data-shared-world-map={model.id} data-canonical-guide={model.guideId} data-yoppo-position={model.guideId} data-selected-destination={selected?.id} aria-label={c.map} className="yo-shared-world-map">
    <style>{worldMapStyles}</style>
    <header className="yo-shared-map-heading"><p>{c.map}</p><h2>{model.title[locale]}</h2>
      <nav aria-label={c.chapter}>
        {count > 1 && <button type="button" aria-label={c.previous} disabled={chapter === 0} onClick={() => changeChapter(chapter - 1)}><ChevronLeft size={20}/></button>}
        <span>{c.chapter} {chapter * 4 + 1}–{Math.min(model.destinations.length, chapter * 4 + 4)} / {model.destinations.length}</span>
        {count > 1 && <button type="button" aria-label={c.next} disabled={chapter === count - 1} onClick={() => changeChapter(chapter + 1)}><ChevronRight size={20}/></button>}
      </nav>
    </header>
    <div className="yo-shared-atlas" data-map-chapter={chapter}>
      <WorldScenery world={model.world} chapter={chapter}/>
      <svg aria-hidden="true" className="yo-shared-road" viewBox={`0 0 ${road.width} ${road.height}`}>
        <path d={roadPath(road)} fill="none" stroke="#fff6dc" strokeWidth="10" strokeLinecap="round"/>
        <path d={roadPath(road)} fill="none" stroke="#c49955" strokeWidth="4" strokeLinecap="round"/>
      </svg>
      <MapTraveler key={chapter} index={selectedIndex} locale={locale} road={road} active={active}
        initialPosition={sameGuide && view.chapter === chapter ? view.position : selectedIndex} onPosition={savePosition}/>
      <ol className="yo-shared-destinations">{destinations.map((d, i) => {
        const point = roadPoint(i, road);
        return <li key={d.id} style={{ left: `${point[0] / road.width * 100}%`, top: `${point[1] / road.height * 100}%` }}
          data-journey-unit={d.id} data-unlocked={d.accessible} data-destination-state={d.state} aria-current={d.id === model.guideId ? "step" : undefined}>
          <button type="button" disabled={!d.accessible} onClick={() => select(d)} aria-pressed={selected?.id === d.id}
            aria-label={`${c.explore} ${(d.place ?? d.title)[locale]} · ${adventureCopy[locale].states[d.state]}`}>
            {!d.accessible ? <LockKeyhole size={14} aria-hidden/> : d.state === "mastered" || d.state === "completed" ? <Check size={14} aria-hidden/> : null}
            <span>{(d.place ?? d.title)[locale]}</span>
          </button>
        </li>;
      })}</ol>
    </div>
    <div className="yo-shared-map-action">
      {selected ? <><p className="yo-shared-status">{adventureCopy[locale].states[selected.state]}</p><h3>{selected.title[locale]}</h3><p>{selected.goal[locale]}</p>
        {onContinue ? <button type="button" className="yo-shared-continue" onClick={() => { if (selected.accessible) onContinue(selected.id); }}>{c.continue}<ArrowRight size={19} aria-hidden/></button>
          : target ? <Link prefetch={false} href={target} className="yo-shared-continue">{c.continue}<ArrowRight size={19} aria-hidden/></Link> : null}
      </> : <p>{c.locked}</p>}
    </div>
  </section>;
}
