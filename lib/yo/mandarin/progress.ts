import type { Answer, Attempt, Exercise, Progress, ProgressStamp, ProgressSync, Result } from "./types";

export const MANDARIN_PATH = "/yo/langues/mandarin/parcours";
export const MANDARIN_PROGRESS_KEY = "yopratiqo:mandarin-foundations:v1";
export const MANDARIN_PROGRESS_LIMIT = 200_000;
export const emptyProgress = (): Progress => ({
  version: 1,
  unit: "u01",
  steps: {},
  drafts: {},
  results: {},
  selfAssessment: {},
  trivia: 0,
  pinyin: true,
  translation: true,
});
export const initialAttempt = (exercise: Exercise): Attempt => ({
  answer: exercise.kind === "build" ? [] : exercise.kind === "match" ? {} : "",
  checked: false,
  correct: false,
  assisted: false,
  heard: false,
  hint: false,
});
export function visibleMandarinHelp(exercise: Exercise, pinyin: boolean, translation = false) {
  return Boolean((pinyin && (exercise.kind === "match" || ("choices" in exercise && exercise.choices.some(choice => choice.phrase)) || exercise.stimulus)) || (translation && exercise.stimulus));
}
export function restartMandarinAttempt(exercise: Exercise, previous: Attempt, withoutHelp = false): Attempt {
  return { ...initialAttempt(exercise), generation: Math.min(1_000_000, (previous.generation ?? 0) + 1), assisted: !withoutHelp };
}
const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .trim()
    .replace(/[。！？.!?]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("zh");
export function checkAnswer(exercise: Exercise, answer: Answer): boolean {
  if (exercise.kind === "build")
    return (
      Array.isArray(answer) &&
      JSON.stringify(answer) === JSON.stringify(exercise.answer)
    );
  if (exercise.kind === "match")
    return (
      typeof answer === "object" &&
      !Array.isArray(answer) &&
      exercise.pairs.every((_, i) => answer[String(i)] === String(i))
    );
  if (exercise.kind === "write")
    return (
      typeof answer === "string" &&
      exercise.accepted.some((value) => normalize(value) === normalize(answer))
    );
  return typeof answer === "string" && answer === exercise.answer;
}
export function evaluate(
  exercise: Exercise,
  attempt: Attempt,
  previous?: Result,
): Result | null {
  if (
    attempt.checked ||
    ((exercise.kind === "listen" || exercise.kind === "tone") && !attempt.heard)
  )
    return null;
  const passed = checkAnswer(exercise, attempt.answer);
  return {
    passed: Boolean(previous?.passed || passed),
    independent: Boolean(
      previous?.independent || (passed && !attempt.assisted),
    ),
    attempts: Math.min(999, (previous?.attempts ?? 0) + 1),
    review: !passed || attempt.assisted,
  };
}
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
export const validMandarinUnit = (key: string) => /^(?:u0[1-9]|u1[0-2]|bilan|bilan-fondations)$/.test(key);
export const validMandarinKey = (key: string) =>
  /^zh-(?:u0[1-9]|u1[0-2]|final|foundations-final)-[a-z0-9-]{1,64}$/.test(key);
export const validMandarinActor = (key: string) => /^m-[a-f0-9]{16}$/.test(key);
const validClock = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) < 1e15;
function readSync(value: unknown): ProgressSync | undefined {
  if (!record(value) || !validClock(value.clock)) return;
  const sync: ProgressSync = { clock: value.clock, marks: {}, attempts: {} };
  if (record(value.marks)) for (const [key, stamp] of Object.entries(value.marks).slice(0, 1200)) {
    const validField = ["unit", "trivia", "pinyin", "translation"].includes(key) ||
      (key.startsWith("s:") ? validMandarinUnit(key.slice(2)) : /^[dra]:/.test(key) && validMandarinKey(key.slice(2)));
    if (validField && Array.isArray(stamp) && stamp.length === 2 && validClock(stamp[0]) && typeof stamp[1] === "string" && validMandarinActor(stamp[1])) {
      sync.marks[key] = stamp as ProgressStamp;
      sync.clock = Math.max(sync.clock, stamp[0]);
    }
  }
  if (record(value.attempts)) for (const [key, entry] of Object.entries(value.attempts).slice(0, 300)) {
    if (!validMandarinKey(key) || !record(entry) || !Number.isInteger(entry.base) || Number(entry.base) < 0 || Number(entry.base) > 999 || !record(entry.actors)) continue;
    const actors: Record<string, number> = {};
    for (const [actor, count] of Object.entries(entry.actors).slice(0, 999)) {
      if (validMandarinActor(actor) && Number.isInteger(count) && Number(count) > 0 && Number(count) <= 999) actors[actor] = Number(count);
    }
    sync.attempts[key] = { base: Number(entry.base), actors };
  }
  return sync;
}
export function parseProgress(raw: string | null): Progress {
  const result = emptyProgress();
  if (!raw || raw.length > MANDARIN_PROGRESS_LIMIT) return result;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1) return result;
    if (typeof value.unit === "string" && validMandarinUnit(value.unit))
      result.unit = value.unit;
    result.pinyin = value.pinyin !== false;
    result.translation = value.translation !== false;
    if (record(value.steps))
      for (const [key, step] of Object.entries(value.steps))
        if (
          validMandarinUnit(key) &&
          Number.isInteger(step) &&
          Number(step) >= 0 &&
          Number(step) < 100
        )
          result.steps[key] = Number(step);
    if (record(value.results))
      for (const [key, entry] of Object.entries(value.results).slice(0, 300)) {
        if (!validMandarinKey(key) || !record(entry)) continue;
        result.results[key] = {
          passed: entry.passed === true,
          independent: entry.passed === true && entry.independent === true,
          attempts: Math.max(0, Math.min(999, Math.floor(Number(entry.attempts) || 0))),
          review: entry.review !== false,
        };
      }
    if (record(value.drafts))
      for (const [key, entry] of Object.entries(value.drafts).slice(0, 300)) {
        if (!validMandarinKey(key) || !record(entry)) continue;
        let answer: Answer = "";
        if (typeof entry.answer === "string")
          answer = entry.answer.slice(0, 500);
        else if (Array.isArray(entry.answer))
          answer = entry.answer
            .filter(
              (part): part is string =>
                typeof part === "string" && part.length < 100,
            )
            .slice(0, 30);
        else if (record(entry.answer))
          answer = Object.fromEntries(
            Object.entries(entry.answer).filter(
              (pair): pair is [string, string] =>
                /^\d{1,2}$/.test(pair[0]) &&
                typeof pair[1] === "string" &&
                /^\d{1,2}$/.test(pair[1]),
            ),
          );
        // A refreshed listening attempt must play real audio again before evaluation.
        result.drafts[key] = {
          answer,
          checked: entry.checked === true,
          correct: entry.correct === true,
          assisted: entry.assisted === true,
          heard: false,
          hint: entry.hint === true,
          ...(Number.isInteger(entry.generation) && Number(entry.generation) > 0 && Number(entry.generation) <= 1_000_000 ? { generation: Number(entry.generation) } : {}),
        };
      }
    if (record(value.selfAssessment))
      for (const [key, entry] of Object.entries(value.selfAssessment).slice(
        0,
        100,
      ))
        if (validMandarinKey(key)) result.selfAssessment[key] = entry === true;
    result.trivia = Math.min(100_000, Math.max(0, Math.floor(Number(value.trivia) || 0)));
    if (validClock(value.resetAt) && value.resetAt > 0) {
      result.resetAt = value.resetAt;
      result.resetBy = typeof value.resetBy === "string" && validMandarinActor(value.resetBy) ? value.resetBy : "";
    }
    const sync = readSync(value.sync);
    if (sync) result.sync = sync;
    return result;
  } catch {
    return result;
  }
}
