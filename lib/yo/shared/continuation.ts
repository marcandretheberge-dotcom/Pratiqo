import type { YoLocale } from "../types";
import { L, type IntroCourse, type IntroProfile, type IntroState, type Text } from "./types";
import { courseSteps } from "./steps";

type Destination = { path: string; title: Text; description: Text };
const destinations: Record<string, Omit<Destination, "path">> = {
  anglais: {
    title: L("L’anglais dans les situations du quotidien", "English for everyday situations", "Inglés para situaciones cotidianas"),
    description: L("Poursuis dans 12 unités : rencontres, déplacements, travail et projets, avec 36 leçons et des bilans écrits.", "Continue through 12 units: meeting people, getting around, work and plans, with 36 lessons and written checkpoints.", "Continúa con 12 unidades: encuentros, desplazamientos, trabajo y planes, con 36 lecciones y evaluaciones escritas."),
  },
  "francais-quebec": {
    title: L("Le français du Québec au quotidien", "Everyday Quebec French", "Francés de Quebec para el día a día"),
    description: L("Poursuis dans 12 unités de vie quotidienne au Québec, avec 36 leçons, des échanges guidés et des bilans écrits.", "Continue through 12 units of everyday life in Québec, with 36 lessons, guided exchanges and written checkpoints.", "Continúa con 12 unidades de vida cotidiana en Quebec, con 36 lecciones, intercambios guiados y evaluaciones escritas."),
  },
  espagnol: {
    title: L("L’espagnol dans de nouvelles situations", "Spanish in new situations", "Español en situaciones nuevas"),
    description: L("Continue avec 12 unités d’espagnol d’Amérique latine : 36 leçons, des dialogues et des bilans écrits.", "Continue with 12 Latin American Spanish units: 36 lessons, dialogues and written checkpoints.", "Continúa con 12 unidades de español de América Latina: 36 lecciones, diálogos y evaluaciones escritas."),
  },
  allemand: {
    title: L("Le parcours de fondations en allemand", "The German foundation course", "El curso de fundamentos de alemán"),
    description: L("Retrouve les huit unités, leurs dialogues, leurs exercices et tes acquis enregistrés.", "Open the eight units, their dialogues, exercises and your saved achievements.", "Abre las ocho unidades, sus diálogos, ejercicios y tus logros guardados."),
  },
  "portugais-bresil": {
    title: L("Le parcours de portugais du Brésil", "The Brazilian Portuguese course", "El curso de portugués de Brasil"),
    description: L("Retrouve les huit unités pour faire connaissance, commander et te déplacer.", "Open the eight units for meeting people, ordering and getting around.", "Abre las ocho unidades para conocer gente, pedir y desplazarte."),
  },
  japonais: {
    title: L("Les fondations du japonais", "Japanese foundations", "Fundamentos de japonés"),
    description: L("Continue avec les dialogues, les kana, les kanji et les exercices des huit modules.", "Continue with dialogues, kana, kanji and exercises across the eight modules.", "Continúa con diálogos, kana, kanji y ejercicios en los ocho módulos."),
  },
  mandarin: {
    title: L("Les fondations du mandarin", "Mandarin foundations", "Fundamentos de mandarín"),
    description: L("Continue avec les dialogues, les tons, les caractères et les exercices des huit unités.", "Continue with dialogues, tones, characters and exercises across the eight units.", "Continúa con diálogos, tonos, caracteres y ejercicios en las ocho unidades."),
  },
};

/** Existing pages own their access checks and progress; an intro never grants either. */
export function introContinuation(course: IntroCourse, _goal: IntroProfile["goal"], locale: YoLocale): Destination & { href: string } {
  let destination: Destination = { path: course.legacyPath, ...destinations[course.slug] };
  if (!destination.title) destination = { path: course.legacyPath, title: course.name, description: course.missions[0].goal };
  if (["anglais", "francais-quebec", "espagnol"].includes(course.slug)) {
    destination = { ...destination, path: `/yo/langues/${course.slug}/parcours` };
  }
  return { ...destination, href: `${destination.path}?lang=${locale}` };
}

export const introGoalFocus: Record<IntroProfile["goal"], Text> = {
  travel: L("Pour voyager : entraîne-toi à suivre une rencontre.", "For travel: practise following an encounter.", "Para viajar: practica cómo seguir un encuentro."),
  family: L("Pour les proches : reprends les salutations et les nouvelles.", "For family and friends: revisit greetings and asking how someone is.", "Para familiares y amistades: repasa saludos y cómo preguntar qué tal están."),
  work: L("Pour le travail ou les études : entraîne-toi à répondre à une question.", "For work or study: practise answering a question.", "Para el trabajo o los estudios: practica cómo responder a una pregunta."),
  conversation: L("Pour parler au quotidien : réécoute une rencontre, puis réponds.", "For everyday conversation: listen to an encounter, then answer.", "Para conversar cada día: vuelve a escuchar un encuentro y responde."),
  thorough: L("Pour approfondir : reprends une explication et ses exemples.", "For deeper learning: revisit an explanation and its examples.", "Para profundizar: repasa una explicación y sus ejemplos."),
};

/** This is a proposed weekly rhythm, never an estimate of how long a lesson takes. */
export function introWeeklyPlan(minutes: number): { sessions: number; minutes: number } | null {
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1200) return null;
  const sessions = Math.min(7, Math.max(1, Math.ceil(minutes / 30)));
  return { sessions, minutes: Math.round(minutes / sessions) };
}

/** Offer only reached material, and never replace an unfinished lesson or final draft. */
export function introGoalReview(course: IntroCourse, state: IntroState): { step: number; title: Text; goal: Text } | null {
  if (!state.profile || state.resume !== null) return null;
  const preferred = state.profile.goal === "thorough" ? "concept" : state.profile.goal === "work" ? "exercise" : "scene";
  const candidates = courseSteps(course).map((step, index) => ({ step, index }))
    .filter(({ step }) => step.kind === preferred && state.visited.includes(step.id));
  const target = state.profile.goal === "family" ? candidates[0] : candidates.at(-1);
  if (!target) return null;
  const mission = course.missions[target.step.mission];
  return {
    step: target.index,
    title: preferred === "concept" ? mission.concepts[target.step.index].title
      : preferred === "exercise" ? mission.practice[target.step.index].prompt : mission.title,
    goal: introGoalFocus[state.profile.goal],
  };
}
