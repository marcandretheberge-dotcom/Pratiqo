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

// Opening/resuming a lesson can change the canonical guide without earning anything.
// Only newly completed destinations reset the cosmetic bookmark to that guide.
export function mapProgressRevision(model: WorldMapModel): string {
  return model.destinations.filter(d => d.state === "completed" || d.state === "mastered").map(d => `${d.id}:${d.state}`).join("|");
}
export type MapBookmark = { revision: string; destinationId?: string; chapter: number; position: number };
export function parseMapBookmark(raw: string | null, model: WorldMapModel): MapBookmark | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== "object") return null;
    const v = value as Partial<MapBookmark>;
    if (v.revision !== mapProgressRevision(model) || !Number.isInteger(v.chapter) || Number(v.chapter) < 0
      || Number(v.chapter) >= Math.ceil(model.destinations.length / 4)
      || !Number.isFinite(v.position) || Number(v.position) < 0 || Number(v.position) > 3
      || !model.destinations.slice(Number(v.chapter) * 4, Number(v.chapter) * 4 + 4).some(d => d.id === v.destinationId && d.accessible)) return null;
    return v as MapBookmark;
  } catch { return null; }
}
