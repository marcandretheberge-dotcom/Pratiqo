import type { AdventureWorld, DestinationState } from "./adventure";
import { destinationState } from "./adventure";
import type { LearningJourney } from "./learningJourney";
import type { YoLocalizedString } from "./types";
import type { IntroCourse, IntroState } from "./shared/types";
import { courseSteps } from "./shared/steps";
import { introPassed } from "./shared/state";
import { spanishRegionalPractice } from "./spanishRegionalPractice";

export type MapDestination = {
  id: string; title: YoLocalizedString; goal: YoLocalizedString; place?: YoLocalizedString;
  accessible: boolean; state: DestinationState; href?: string;
  chapterStart?: boolean; entryStep?: string;
};
export type WorldMapModel = {
  id: string; world: AdventureWorld; title: YoLocalizedString; guideId?: string;
  destinations: MapDestination[];
};
const l = (fr: string, en: string, es: string): YoLocalizedString => ({ fr, en, es });
export const worldTitles: Record<AdventureWorld, YoLocalizedString> = {
  italian: l("La vie en Italie", "Life in Italy", "La vida en Italia"),
  german: l("Rencontres en allemand", "Encounters in German", "Encuentros en alemán"),
  portuguese: l("Rencontres au Brésil", "Encounters in Brazil", "Encuentros en Brasil"),
  japanese: l("Un quartier japonais", "A Japanese neighborhood", "Un barrio japonés"),
  mandarin: l("La vie en mandarin", "Life in Mandarin", "La vida en mandarín"),
  french: l("La vie au Québec", "Life in Quebec", "La vida en Quebec"),
  english: l("Rencontres à Toronto", "Encounters in Toronto", "Encuentros en Toronto"),
  spanish: l("Rencontres hispanophones", "Spanish-speaking encounters", "Encuentros hispanohablantes"),
};

/** No eligibility calculation here: preserve the course engine's actual decisions. */
export function journeyMap(journey: LearningJourney, world: AdventureWorld, id: string): WorldMapModel {
  return { id, world, title: worldTitles[world], guideId: journey.current?.unit.id,
    destinations: journey.steps.map(step => ({
      id: step.unit.id, title: step.unit.title, goal: step.unit.objectives[0] ?? step.unit.subtitle,
      accessible: step.unlocked, state: destinationState(step),
    })) };
}

/** The guided introductions use completion, not independent module mastery. */
export function introMap(course: IntroCourse, state: IntroState, world: AdventureWorld): WorldMapModel {
  const steps = courseSteps(course);
  const done = course.missions.map(m => m.practice.every(e => state.completed.includes(e.id)));
  const destinations = course.missions.map((m, i): MapDestination => {
    const accessible = i <= (state.profile?.entry ?? 0) || i === 0 || done[i - 1];
    const started = steps.some(s => s.mission === i && state.visited.includes(s.id));
    return { id: m.id, title: m.title, goal: m.goal, accessible,
      state: done[i] ? "completed" : !accessible ? "locked" : started ? "progress" : "available" };
  });
  const resumeId = state.resume === "lesson" ? course.missions[steps[state.step].mission].id : undefined;
  const guideId = state.resume === "final" ? "intro-final" : destinations.find(d => d.id === resumeId && d.accessible)?.id
    ?? destinations.find(d => d.accessible && d.state !== "completed")?.id ?? "intro-final";
  destinations.push({ id: "intro-final", title: l("Défi final", "Final challenge", "Reto final"),
    goal: l("Réutilise les mots des trois rencontres sans aide affichée.", "Use the words from the three meetings without displayed help.", "Reutiliza las palabras de los tres encuentros sin ayuda visible."),
    accessible: true, state: introPassed(course,state) ? "mastered" : state.resume === "final" ? "progress" : "available" });
  if (course.slug === "espagnol") destinations.push(...spanishRegionalPractice.map(item => ({
    id: item.id, title: item.region, goal: l("Pratique régionale écrite · observe le contexte.", "Written regional practice · read the context.", "Práctica regional escrita · observa el contexto."),
    accessible: true, state: "available" as const,
  })));
  return { id: `intro:${course.language}`, world, title: course.slug === "espagnol" ? worldTitles.spanish : { fr: course.city, en: course.city, es: course.city }, guideId, destinations };
}

/** Keep the mission as the canonical entry; expose real, reached sections for replay. */
export function introStageMap(course: IntroCourse, state: IntroState, world: AdventureWorld): WorldMapModel {
  const base = introMap(course,state,world), steps = courseSteps(course);
  let guideId = base.guideId;
  const destinations = base.destinations.flatMap((d,i): MapDestination[] => {
    if (i >= course.missions.length) return [{...d, chapterStart: i === course.missions.length + 1}];
    const chapter: MapDestination[] = [{...d,chapterStart:true}];
    for (const [kind,title] of [["scene",l("Dialogue","Dialogue","Diálogo")],["exercise",l("Mise en pratique","Practice","Práctica")]] as const) {
      const at = steps.findIndex(s => s.mission === i && s.kind === kind);
      if (at < 0) continue;
      const step = steps[at], id = step.id;
      const reached = state.visited.includes(id) || state.visited.includes(steps[at-1]?.id) || (state.resume === "lesson" && state.step === at);
      const accessible = d.accessible && reached;
      const complete = kind === "scene" ? state.visited.includes(id) : course.missions[i].practice.every(e=>state.completed.includes(e.id));
      const here = accessible && state.resume === "lesson" && steps[state.step]?.mission === i && state.step >= at;
      if (here) guideId = id;
      chapter.push({id, entryStep:id, title, goal:d.goal, accessible, state:!accessible ? "locked" : complete ? "completed" : here ? "progress" : "available"});
    }
    return chapter;
  });
  return {...base, guideId, destinations};
}

/** Up to four stops per screen; assessed eight-unit courses span 3 + 3 + 2. */
export function mapChapters(model: WorldMapModel): MapDestination[][] {
  const size = !model.destinations.some(d=>d.chapterStart) && model.destinations.length >= 7 && model.destinations.length <= 9 ? 3 : 4;
  const chapters: MapDestination[][] = [];
  for (const d of model.destinations) {
    if (!chapters.length || d.chapterStart || chapters[chapters.length-1].length === size) chapters.push([]);
    chapters[chapters.length-1].push(d);
  }
  return chapters;
}

export function mapStopPosition(index:number, count:number) {
  return index < 0 ? -1 : count < 2 ? 1.5 : index * 3 / (count - 1);
}

// Opening a lesson is not an award; only completed destinations reset the bookmark.
export function mapProgressRevision(model: WorldMapModel): string {
  return model.destinations.filter(d => d.state === "completed" || d.state === "mastered").map(d => `${d.id}:${d.state}`).join("|");
}
export type MapBookmark = { revision: string; destinationId?: string; chapter: number; position: number };
export function parseMapBookmark(raw: string | null, model: WorldMapModel, legacy = false): MapBookmark | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== "object") return null;
    const v = value as Partial<MapBookmark>;
    const chapters = mapChapters(model);
    const oldStops = legacy ? model.destinations.filter(d=>!d.entryStep) : model.destinations;
    if (v.revision !== mapProgressRevision({...model,destinations:oldStops}) || !Number.isInteger(v.chapter) || Number(v.chapter) < 0
      || !Number.isFinite(v.position) || Number(v.position) < 0 || Number(v.position) > 3) return null;
    const idx = oldStops.findIndex(d=>d.id===v.destinationId && d.accessible);
    if (idx < 0) return null;
    if (legacy) {
      if (Math.floor(idx/4) !== v.chapter) return null;
      const chapter = chapters.findIndex(group=>group.some(d=>d.id===v.destinationId)), group = chapters[chapter];
      const unchanged = group.length===4 && group.every((d,i)=>d.id===oldStops[Number(v.chapter)*4+i]?.id);
      return {revision:mapProgressRevision(model),chapter,destinationId:v.destinationId,position:unchanged ? Number(v.position) : mapStopPosition(group.findIndex(d=>d.id===v.destinationId),group.length)};
    }
    if (!chapters[Number(v.chapter)]?.some(d=>d.id===v.destinationId && d.accessible)) return null;
    return v as MapBookmark;
  } catch { return null; }
}
