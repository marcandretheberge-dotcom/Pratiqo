import type { Answer, Attempt, Exercise, Progress, Result } from "./types";

export const MANDARIN_PATH = "/yo/langues/mandarin/parcours";
export const MANDARIN_PROGRESS_KEY = "yopratiqo:mandarin-foundations:v1";
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
const validKey = (key: string) =>
  /^zh-(?:u0[1-8]|final)-[a-z0-9-]{1,50}$/.test(key);
export function parseProgress(raw: string | null): Progress {
  const result = emptyProgress();
  if (!raw || raw.length > 200_000) return result;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1) return result;
    if (typeof value.unit === "string" && /^(u0[1-8]|bilan)$/.test(value.unit))
      result.unit = value.unit;
    result.pinyin = value.pinyin !== false;
    result.translation = value.translation !== false;
    if (record(value.steps))
      for (const [key, step] of Object.entries(value.steps))
        if (
          /^(u0[1-8]|bilan)$/.test(key) &&
          Number.isInteger(step) &&
          Number(step) >= 0 &&
          Number(step) < 100
        )
          result.steps[key] = Number(step);
    if (record(value.results))
      for (const [key, entry] of Object.entries(value.results).slice(0, 300)) {
        if (!validKey(key) || !record(entry)) continue;
        result.results[key] = {
          passed: entry.passed === true,
          independent: entry.passed === true && entry.independent === true,
          attempts: Math.max(0, Math.min(999, Number(entry.attempts) || 0)),
          review: entry.review !== false,
        };
      }
    if (record(value.drafts))
      for (const [key, entry] of Object.entries(value.drafts).slice(0, 300)) {
        if (!validKey(key) || !record(entry)) continue;
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
        };
      }
    if (record(value.selfAssessment))
      for (const [key, entry] of Object.entries(value.selfAssessment).slice(
        0,
        100,
      ))
        if (validKey(key)) result.selfAssessment[key] = entry === true;
    result.trivia = Math.min(100_000, Math.max(0, Number(value.trivia) || 0));
    return result;
  } catch {
    return result;
  }
}
