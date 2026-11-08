import type { ItalianActivity } from "../italianModuleTypes";
import type { CourseUnit, CourseLesson } from "./courseTypes";
import type { CourseProgress } from "./courseProgress";
import { checkItalianCafe, checkItalianMap, matchesItalianAnswer } from "../italianModuleLogic";

export const GUIDED_VERSION = 1;
export const GUIDED_KEY = "yo.italian.guided.v1.u01";
export const TOUR_KEY = "yo.italian.guided.tour.v1";
export type GuidedStage = "prepare" | "scene" | "words" | "language" | "sounds" | "exercise";
export type GuidedStep = { id: string; lesson: number; stage: GuidedStage; activity?: ItalianActivity };
export type GameDraft = {
  selected: string | null; tiles: number[]; pairs: string[]; left: string | null;
  turn: number; feedback: boolean | null; assisted: boolean; heard: boolean;
  transcript: boolean; complete: boolean; basket?: Record<string, number>; path?: ("up" | "down" | "left" | "right")[];
};
export const emptyGame = (): GameDraft => ({ selected: null, tiles: [], pairs: [], left: null, turn: 0, feedback: null, assisted: false, heard: false, transcript: false, complete: false });
export type GuidedState = {
  version: 1; resetAt: number; step: number; seen: string[];
  view: "map" | "mission" | "challenge-intro" | "challenge" | "result";
  resumeView: "mission" | "challenge" | null; game: GameDraft; quizIndex: number; answers: { correct: boolean; assisted: boolean }[];
  runStartedAt: number; submitted: boolean;
};
export const initialGuided = (resetAt = 0): GuidedState => ({ version: 1, resetAt, step: 0, seen: [], view: "map", resumeView: null, game: emptyGame(), quizIndex: 0, answers: [], runStartedAt: 0, submitted: false });

/** Start with vocabulary, then encounter it in context. A visual warmup already
 * teaches the words, so repeating a long separate word screen adds no value. */
export function guidedSteps(unit: CourseUnit, preparedLessons: readonly string[] = []): GuidedStep[] {
  return unit.lessons.flatMap((lesson, index) => {
    const stages: GuidedStage[] = preparedLessons.includes(lesson.id)
      ? ["prepare", "scene", "language", "sounds"]
      : ["words", "scene", "language", "sounds"];
    return [
      ...stages.map(stage => ({ id: `${lesson.id}:${stage}`, lesson: index, stage })),
      ...lesson.activities.map(activity => ({ id: activity.id, lesson: index, stage: "exercise" as const, activity })),
    ];
  });
}

/** The old v2 draft uses numeric step indexes, not identifiers. Translate these
 * indexes once into the new order without changing scored activities or stamps. */
export function migrateGuidedV2Draft(raw: string | null, unit: CourseUnit, resetAt: number, preparedLessons: readonly string[] = []): GuidedState | null {
  if (!raw || raw.length > 50000) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!object(candidate) || candidate.version !== 1 || candidate.resetAt !== resetAt ||
      (typeof candidate.step !== "number" || !Number.isInteger(candidate.step)) || !Array.isArray(candidate.seen) ||
      !candidate.seen.every(id => typeof id === "string")) return null;
    const previousSteps: GuidedStep[] = unit.lessons.flatMap((lesson, index) => [
      ...(preparedLessons.includes(lesson.id) ? [{ id: `${lesson.id}:prepare`, lesson: index, stage: "prepare" as const }] : []),
      ...(["scene", "words", "language", "sounds"] as const).map(stage => ({ id: `${lesson.id}:${stage}`, lesson: index, stage })),
      ...lesson.activities.map(activity => ({ id: activity.id, lesson: index, stage: "exercise" as const, activity })),
    ]);
    if (!index(candidate.step, previousSteps.length)) return null;
    const newSteps = guidedSteps(unit, preparedLessons);
    const original = previousSteps[candidate.step];
    // A removed, redundant words page proceeds to its language explanation.
    const wantedId = original.stage === "words" && preparedLessons.includes(unit.lessons[original.lesson].id)
      ? `${unit.lessons[original.lesson].id}:language` : original.id;
    const step = newSteps.findIndex(item => item.id === wantedId);
    if (step < 0) return null;
    const allowed = new Set(newSteps.filter(item => !item.activity).map(item => item.id));
    const migrated = { ...candidate, step, seen: [...new Set((candidate.seen as string[]).filter(id => allowed.has(id)))] };
    const parsed = parseGuided(JSON.stringify(migrated), unit, resetAt, preparedLessons);
    // parseGuided returns a fresh state for invalid data. Do not silently accept it.
    return parsed.step === step && parsed.view === candidate.view ? parsed : null;
  } catch { return null; }
}
export function lessonDone(lesson: CourseLesson, progress: CourseProgress) { return lesson.activities.every(a => progress.activities[a.id]?.completed); }
export function nextGuidedStep(steps: GuidedStep[], state: GuidedState, progress: CourseProgress): number {
  return steps.findIndex(step => step.activity ? !progress.activities[step.id]?.completed : !state.seen.includes(step.id));
}
export function guidedPassed(unit: CourseUnit, progress: CourseProgress) {
  return (progress.assessments[unit.quiz.id]?.bestIndependent ?? -1) >= unit.quiz.passPercent;
}
/** Display-only learning points, derived once from unique canonical outcomes. Never money/access. */
export function guidedPoints(unit: CourseUnit, progress: CourseProgress) {
  return unit.lessons.flatMap(l => l.activities).filter(a => progress.activities[a.id]?.completed).length * 10 + (guidedPassed(unit, progress) ? 100 : 0);
}
export function tokenPool(activity: ItalianActivity): string[] {
  if (activity.kind === "order") return [...activity.tokens, ...(activity.distractors ?? [])];
  if (activity.kind === "type") return activity.model.split(/\s+/);
  return [];
}
export function listeningText(activity: ItalianActivity): string | undefined {
  return activity.kind === "listen" ? activity.stimulus : activity.kind === "type" ? activity.listeningText : undefined;
}
export function checkGuided(activity: ItalianActivity, game: GameDraft): boolean {
  switch (activity.kind) {
    case "choice": case "listen": case "culture": return game.selected === activity.correctId;
    case "type": return matchesItalianAnswer(game.tiles.map(i => tokenPool(activity)[i]).join(" "), activity.accepted);
    case "order": return matchesItalianAnswer(game.tiles.map(i => tokenPool(activity)[i]).join(" "), [activity.answer.join(" ")]);
    case "match": return game.pairs.length === activity.pairs.length;
    case "dialogue": return game.selected === activity.turns[game.turn]?.correctId;
    case "cafe": return checkItalianCafe(activity, game.basket ?? {});
    case "map": return checkItalianMap(activity, game.path ?? []);
  }
}
export function expectedGuided(activity: ItalianActivity): string {
  switch (activity.kind) {
    case "type": return activity.model;
    case "order": return activity.answer.join(" ");
    case "choice": case "listen": case "culture": return activity.options.find(o => o.id === activity.correctId)?.it ?? "";
    default: return "";
  }
}
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function index(value: unknown, max: number): value is number { return Number.isInteger(value) && Number(value) >= 0 && Number(value) < max; }
/** UI state is not an entitlement or an assessment result. Invalid drafts never award anything. */
export function parseGuided(raw: string | null, unit: CourseUnit, resetAt: number, preparedLessons: readonly string[] = []): GuidedState {
  const fresh = initialGuided(resetAt), steps = guidedSteps(unit, preparedLessons);
  if (!raw || raw.length > 50000) return fresh;
  try {
    const s: unknown = JSON.parse(raw);
    if (!object(s) || s.version !== 1 || s.resetAt !== resetAt || !index(s.step, steps.length) ||
      !["map", "mission", "challenge-intro", "challenge", "result"].includes(String(s.view)) || !object(s.game) ||
      !index(s.quizIndex, unit.quiz.questions.length) || !Array.isArray(s.answers) || s.answers.length > unit.quiz.questions.length ||
      !s.answers.every(a => object(a) && typeof a.correct === "boolean" && typeof a.assisted === "boolean") ||
      !(s.resumeView === null || s.resumeView === "mission" || s.resumeView === "challenge") || !Array.isArray(s.seen) || !s.seen.every(id => typeof id === "string" && steps.some(step => step.id === id && !step.activity)) ||
      typeof s.runStartedAt !== "number" || !Number.isFinite(s.runStartedAt) || s.runStartedAt < 0 || s.runStartedAt > Date.now() + 300000 || typeof s.submitted !== "boolean") return fresh;
    const g = s.game;
    const activity = (s.view === "challenge" || s.resumeView === "challenge") ? unit.quiz.questions[s.quizIndex] : steps[s.step].activity;
    if (!Array.isArray(g.tiles) || !g.tiles.every(i => index(i, activity ? tokenPool(activity).length : 0)) || new Set(g.tiles).size !== g.tiles.length ||
      !Array.isArray(g.pairs) || !g.pairs.every(id => activity?.kind === "match" && activity.pairs.some(p => p.id === id)) || new Set(g.pairs).size !== g.pairs.length ||
      !(g.selected === null || typeof g.selected === "string") || !(g.left === null || typeof g.left === "string") ||
      !index(g.turn, activity?.kind === "dialogue" ? activity.turns.length : 1) ||
      !(g.feedback === null || typeof g.feedback === "boolean") ||
      ![g.assisted, g.heard, g.transcript, g.complete].every(v => typeof v === "boolean")) return fresh;
    if (g.basket !== undefined && (!object(g.basket) || activity?.kind !== "cafe" || Object.entries(g.basket).some(([id,n]) => !activity.menu.some(item=>item.id===id) || !Number.isInteger(n) || Number(n)<0 || Number(n)>9))) return fresh;
    if (g.path !== undefined && (!Array.isArray(g.path) || activity?.kind !== "map" || g.path.length>12 || !g.path.every(d=>["up","down","left","right"].includes(d)))) return fresh;
    if (s.view === "challenge" && (s.answers.length !== s.quizIndex || s.submitted)) return fresh;
    if (s.view === "result" && (s.answers.length !== unit.quiz.questions.length || !s.submitted)) return fresh;
    return s as unknown as GuidedState;
  } catch { return fresh; }
}
