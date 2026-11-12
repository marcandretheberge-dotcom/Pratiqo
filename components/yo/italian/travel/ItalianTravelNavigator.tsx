"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, LockKeyhole, MapPin, Bike, Footprints, Plane } from "lucide-react";
import type { ItalianNavigatorContext } from "../guided/GuidedItalianCourse";
import type { CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import { projectItalianWorlds, ITALIAN_WORLDS } from "@/lib/yo/italian/worlds";
import { CITY_COORDINATES, GEOGRAPHIC_ROADS, WORLD_BOUNDS, project, parseTravelMemory, scooterEarned, type TravelMemory } from "@/lib/yo/italian/travel/journey";
import outline from "@/lib/yo/italian/travel/italy-outline.json";
import { MapTraveler } from "../../journey/map/MapTraveler";
import { roadPath, roadPoint } from "../../journey/map/roadGeometry";
import { FeedbackSettings, useLearningFeedback } from "../../feedback/LearningFeedback";
import { TravelArrival } from "./TravelArrival";
import { FlorenceDiscovery } from "./FlorenceDiscovery";
import { MapScooter } from "./MapScooter";
import { travelStyles } from "./styles";

export function ItalianTravelNavigator({ journey, progress, active, openCurrentMission, openTrivia, locale, unit, florence, storageKey, openUnit }: ItalianNavigatorContext & {
  locale: YoLocale; unit: CourseUnit; florence: CourseUnit; storageKey: string; openUnit: (id: string) => void;
}) {
  const worlds = projectItalianWorlds(journey), feedback = useLearningFeedback();
  const guide = journey.steps.find(s => s.unlocked && !s.passed)?.unit.id ?? "u12";
  const [memory, setMemory] = useState<TravelMemory>(() => parseTravelMemory(null));
  const latest = useRef(memory), [ready, setReady] = useState(false), [stored, setStored] = useState(true);
  const [discovery, setDiscovery] = useState(false);
  const guideBefore = useRef(guide);
  const initialJourney = useRef({ guide, steps: journey.steps });
  const persist = useCallback(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(latest.current)); setStored(true); } catch { setStored(false); }
  }, [storageKey]);
  const commit = useCallback((patch: Partial<TravelMemory>) => {
    latest.current = { ...latest.current, ...patch }; setMemory(latest.current); persist();
  }, [persist]);
  useEffect(() => {
    let value = parseTravelMemory(null);
    try { value = parseTravelMemory(localStorage.getItem(storageKey)); } catch { /* Memory-only mode is reported by persist. */ }
    if (!initialJourney.current.steps.some(s => s.unit.id === value.selected && s.unlocked)) value.selected = initialJourney.current.guide;
    latest.current = value;
    const frame = requestAnimationFrame(() => { setMemory(value); setReady(true); });
    window.addEventListener("pagehide", persist);
    return () => { cancelAnimationFrame(frame); persist(); window.removeEventListener("pagehide", persist); };
    // Hydrate once per cosmetic store; earned progress is handled separately below.
  }, [storageKey, persist]);
  useEffect(() => {
    if (guide === guideBefore.current) return;
    guideBefore.current = guide;
    const frame = requestAnimationFrame(() => commit({ selected: guide }));
    return () => cancelAnimationFrame(frame);
  }, [guide, commit]);
  const worldIndex = Math.max(0, ITALIAN_WORLDS.findIndex(w => w.cities.some(c => c.unitId === memory.selected)));
  const world = worlds[worldIndex], road = GEOGRAPHIC_ROADS[worldIndex], bounds = WORLD_BOUNDS[worldIndex];
  const index = Math.max(0, world.cities.findIndex(c => c.unitId === memory.selected));
  const city = world.citiesWithProgress[index];
  const earned = scooterEarned(florence, progress), equipped = earned && memory.equipped;
  const positionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (positionTimer.current) clearTimeout(positionTimer.current); }, []);
  function positionChanged(position: number) {
    latest.current = { ...latest.current, positions: { ...latest.current.positions, [world.id]: position } };
    if (positionTimer.current) clearTimeout(positionTimer.current);
    positionTimer.current = setTimeout(persist, 120);
  }
  const arrive = useCallback(() => commit({ arrived: true }), [commit]);
  function enterMission() {
    if (!city.unlocked) return;
    if (city.unitId === "u06" && !memory.discovered) { setDiscovery(true); return; }
    if (city.unitId === unit.id) openCurrentMission(); else openUnit(city.unitId);
  }
  if (!ready) return <p role="status">{t("Ton voyage se prépare…", "Preparing your journey…", "Preparando tu viaje…")[locale]}</p>;
  return <section className="italian-travel" data-travel-review>
    <style>{travelStyles}</style>
    <header className="travel-heading"><div><p className="travel-eyebrow">IL TUO VIAGGIO</p><h1>{t("L’Italie, pas à pas", "Italy, one step at a time", "Italia, paso a paso")[locale]}</h1></div><button type="button" className="travel-icon" title={t("Revoir l’arrivée", "Replay arrival", "Repetir la llegada")[locale]} onClick={() => commit({ arrived: false })}><Plane size={21}/></button></header>
    {!stored && <p role="status">{t("La reprise est limitée à cette session : le stockage est indisponible.", "Resume is limited to this session: storage is unavailable.", "La reanudación se limita a esta sesión: el almacenamiento no está disponible.")[locale]}</p>}
    <nav className="travel-chapters" aria-label={t("Régions du voyage", "Journey regions", "Regiones del viaje")[locale]}>
      {worlds.map((w, i) => <button type="button" key={w.id} aria-pressed={i === worldIndex} disabled={!w.open} onClick={() => { const destination = w.citiesWithProgress.find(c => c.unlocked && !c.mastered) ?? w.citiesWithProgress[0]; commit({ selected: destination.unitId }); }}><span>0{i + 1}</span>{w.title[locale]}{!w.open && <LockKeyhole size={14}/>}</button>)}
    </nav>
    <div className="travel-layout">
      <div className="travel-map" data-geographic-map={world.id}>
        <svg viewBox="0 0 480 600" aria-hidden className="travel-geography">
          <defs><pattern id="sea-lines" width="40" height="38" patternUnits="userSpaceOnUse"><path d="M4 18 Q10 13 16 18 T28 18" fill="none" stroke="#88b9bc" strokeWidth=".8" opacity=".5"/></pattern><pattern id="land-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="4" cy="8" r=".9" fill="#88a87d" opacity=".35"/></pattern></defs>
          <rect width="480" height="600" fill="#dceeee"/><rect width="480" height="600" fill="url(#sea-lines)"/>
          {outline.coordinates.map((polygon, i) => <path key={i} d={polygon.map(ring => ring.map((p, j) => (j ? "L" : "M") + project([p[0], p[1]], bounds).join(" ")).join(" ") + "Z").join(" ")} fill="#edf1d7" stroke="#7b9c80" strokeWidth="2"/>)}
          {outline.coordinates.map((polygon, i) => <path key={i} d={polygon.map(ring => ring.map((p, j) => (j ? "L" : "M") + project([p[0], p[1]], bounds).join(" ")).join(" ") + "Z").join(" ")} fill="url(#land-dots)"/>)}
          <path d={roadPath(road)} fill="none" stroke="#fffdf5" strokeWidth="10" strokeLinecap="round"/>
          <path data-travel-road d={roadPath(road)} fill="none" stroke="#b38455" strokeWidth="3" strokeDasharray="4 7" strokeLinecap="round"/>
          {world.citiesWithProgress.map((c, i) => { const [x, y] = roadPoint(i, road); return <g key={c.unitId}><circle cx={x} cy={y} r={memory.selected === c.unitId ? 12 : 8} fill={c.unlocked ? "#25796c" : "#a2aaa2"} stroke="white" strokeWidth="3"/></g>; })}
          <text x="24" y="565" fill="#46757b" fontSize="12" fontStyle="italic">ITALIA</text><path d="M445 55 L445 25 M438 34 L445 25 L452 34" fill="none" stroke="#4b7069" strokeWidth="2"/><text x="440" y="19" fontSize="11" fill="#4b7069">N</text>
        </svg>
        {world.citiesWithProgress.map((c, i) => { const [x,y] = project(CITY_COORDINATES[c.unitId], bounds); return <button type="button" key={c.unitId} className="travel-city" data-city={c.unitId} data-side={x < 160 || i % 2 ? "right" : "left"} aria-pressed={memory.selected === c.unitId} aria-disabled={!c.unlocked} style={{ left: x / 480 * 100 + "%", top: y / 600 * 100 + "%" }}
          onClick={() => { if (!c.unlocked || memory.selected === c.unitId) return; feedback.step(); commit({ selected: c.unitId }); }}><span>{c.name}</span>{!c.unlocked ? <LockKeyhole size={13}/> : <span className="travel-city-number">{i + worldIndex * 4 + 1}</span>}</button>; })}
        <MapTraveler key={world.id} index={index} locale={locale} road={road} initialPosition={memory.positions[world.id] ?? index} onPosition={positionChanged} active={active && memory.arrived && !discovery} pose={equipped ? "riding" : "walking"} accessory={equipped ? <MapScooter/> : undefined}/>
        <span className="travel-map-credit">Natural Earth · WGS84</span>
      </div>
      <div className="travel-destination" aria-live="polite">
        <p className="travel-eyebrow"><MapPin size={14}/>{city.name} · {t("Étape", "Stage", "Etapa")[locale]} {city.step?.unit.number}</p>
        <h2>{city.step?.unit.title[locale]}</h2><p>{city.step?.unit.objectives[0]?.[locale]}</p>
        <button data-travel-continue type="button" className="travel-primary" disabled={!city.unlocked} onClick={enterMission}>{t("Continuer à", "Continue in", "Continuar en")[locale]} {city.name}<ArrowRight size={19}/></button>
        {city.unitId === "u06" && <button type="button" className="travel-text-button" onClick={() => setDiscovery(true)}>{t("Découvrir Florence", "Discover Florence", "Descubrir Florencia")[locale]}</button>}
        <div className="travel-equipment"><div className="travel-equipment-icon">{equipped ? <Bike/> : <Footprints/>}</div><div><h3>{earned ? t("Ton scooter est prêt", "Your scooter is ready", "Tu scooter está listo")[locale] : t("Un scooter à gagner", "A scooter to earn", "Un scooter por ganar")[locale]}</h3>
          <p>{earned ? t("Un souvenir de ton checkpoint à Florence.", "A keepsake from your Florence checkpoint.", "Un recuerdo de tu checkpoint en Florencia.")[locale] : t("Termine les activités des deux premières leçons de Florence.", "Complete the activities in Florence’s first two lessons.", "Completa las actividades de las dos primeras lecciones de Florencia.")[locale]}</p>
          {earned && <button type="button" role="switch" aria-checked={equipped} onClick={() => { commit({ equipped: !equipped }); feedback.sample("step"); }}>{equipped ? t("Descendre du scooter", "Get off the scooter", "Bajar del scooter")[locale] : t("Équiper le scooter", "Equip scooter", "Equipar el scooter")[locale]}</button>}
        </div></div>
        {city.unitId === "u06" && unit.id === "u06" && earned && <button className="travel-text-button" type="button" onClick={openTrivia}>{t("Pause : jouer avec les expressions apprises", "Break: play with the expressions you learned", "Pausa: juega con las expresiones aprendidas")[locale]}</button>}
        <details className="travel-details"><summary>{t("Carnet de voyage", "Travel notebook", "Diario de viaje")[locale]}</summary><p>{t("Les trajets suivent les modules, pas les routes. Le scooter et le trivia ne débloquent aucune ville.", "Paths follow the modules, not roads. The scooter and trivia do not unlock cities.", "Los caminos siguen los módulos, no las carreteras. El scooter y el trivia no desbloquean ciudades.")[locale]}</p><FeedbackSettings locale={locale}/></details>
      </div>
    </div>
    {!memory.arrived && active && <TravelArrival locale={locale} onArrive={arrive}/>}
    {discovery && <FlorenceDiscovery locale={locale} unit={florence} onClose={() => setDiscovery(false)} onCultureComplete={() => commit({ cultureComplete: true })} onContinue={() => { commit({ discovered: true }); setDiscovery(false); if (unit.id === "u06") openCurrentMission(); else openUnit("u06"); }}/>}
  </section>;
}
