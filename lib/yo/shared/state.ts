import type { IntroCourse, IntroState, Draft, Answer } from "./types";
import { courseSteps } from "./steps";
export const introKey = (language: string) => `yo.shared-intro.v1.${language}`;
export const emptyDraft = (): Draft => ({ selected: null, tiles: [], checked: false, correct: false, assisted: false, heard: false, transcript: false });
export const freshIntro = (c: IntroCourse): IntroState => ({ version: 1, language: c.language, profile: null, view: "map", resume: null, step: 0, finalIndex: 0, draft: emptyDraft(), completed: [], visited: [], answers: [], best: 0 });
const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
/** Browser-local practice evidence only. No access, payment, certificate or credit decisions. */
export function parseIntro(raw: string | null, c: IntroCourse): IntroState {
  const fresh = freshIntro(c), steps = courseSteps(c), ids = steps.map(s => s.id);
  if (!raw || raw.length > 30000) return fresh;
  try {
    const s: unknown = JSON.parse(raw);
    if (!obj(s) || s.version !== 1 || s.language !== c.language || !["map", "lesson", "final", "result"].includes(String(s.view)) ||
      !(s.resume === null || s.resume === "lesson" || s.resume === "final") || !integer(s.step, 0, steps.length - 1) || !integer(s.finalIndex, 0, c.final.length - 1) || !integer(s.best, 0, c.final.length) || !obj(s.draft)) return fresh;
    if (!["completed", "visited"].every(k => Array.isArray(s[k]) && (s[k] as unknown[]).length <= ids.length && (s[k] as unknown[]).every(id => typeof id === "string" && ids.includes(id)))) return fresh;
    const p = s.profile;
    if (p !== null && (!obj(p) || !["new", "some", "confident"].includes(String(p.experience)) || !["travel", "family", "work", "conversation", "thorough"].includes(String(p.goal)) || (!integer(p.minutes, 0, 1200) || p.minutes > 0 && p.minutes < 15) || !integer(p.entry, 0, c.missions.length - 1))) return fresh;
    const d = s.draft;
    if (!["checked", "correct", "assisted", "heard", "transcript"].every(k => typeof d[k] === "boolean") || !(d.selected === null || typeof d.selected === "string" && d.selected.length < 80) ||
      !Array.isArray(d.tiles) || d.tiles.length > 20 || !d.tiles.every(v => integer(v, 0, 19)) || new Set(d.tiles).size !== d.tiles.length) return fresh;
    if (!Array.isArray(s.answers) || s.answers.length > c.final.length || !s.answers.every(a => obj(a) && typeof a.correct === "boolean" && typeof a.assisted === "boolean")) return fresh;
    const inFinal = s.view === "final" || s.resume === "final";
    if (inFinal && s.answers.length !== s.finalIndex || s.view === "result" && s.answers.length !== c.final.length) return fresh;
    const step = steps[s.step], mission = c.missions[step.mission];
    const exercise = inFinal ? c.final[s.finalIndex] : step.kind === "exercise" ? mission.practice[step.index] : undefined;
    const visual = !inFinal && step.kind === "visual" ? mission.visuals[step.index % mission.visuals.length] : undefined;
    const parts = exercise?.kind === "order" ? c.phrases.find(p => p.id === exercise.answer)?.parts ?? [] : [];
    if (d.tiles.some(n => Number(n) >= parts.length)) return fresh;
    if (d.selected !== null && !(visual?.pictures.some(p => p.id === d.selected) || exercise?.options.includes(String(d.selected)))) return fresh;
    return { ...s, completed: [...new Set(s.completed as string[])], visited: [...new Set(s.visited as string[])] } as unknown as IntroState;
  } catch { return fresh; }
}
export function independentScore(answers: readonly Answer[]) { return answers.filter(a => a.correct && !a.assisted).length; }
export function introPassed(c: IntroCourse, s: IntroState) { return s.best >= Math.ceil(c.final.length * .8); }
export function introPoints(c: IntroCourse, s: IntroState) {
  const ids = new Set(c.missions.flatMap(m => m.practice.map(e => e.id)));
  return new Set(s.completed.filter(id => ids.has(id))).size * 10 + (introPassed(c, s) ? 100 : 0);
}
/** A diagnostic only selects a first mission; skipped work earns nothing. */
export function suggestedMission(answers: readonly Answer[]): number {
  for (let i = 0; i < 3; i++) if (answers.slice(i * 2, i * 2 + 2).length < 2 || independentScore(answers.slice(i * 2, i * 2 + 2)) < 2) return i;
  return 2;
}
