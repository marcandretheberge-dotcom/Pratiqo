import type { YoLocale } from "../types";
import type { CourseProgress } from "./course/courseProgress";
import type { CoursePhrase, CourseUnit } from "./course/courseTypes";
import { scrambleItalianItems } from "./italianModuleLogic";

type Localized = Record<YoLocale, string>;
export type ItalianTriviaMode = "meaning" | "listening" | "expression";
export type ItalianTriviaOption = { id: string; label: Localized };
export type ItalianTriviaQuestion = {
  id: string;
  sourceLessonId: string;
  mode: ItalianTriviaMode;
  prompt: Localized;
  options: readonly ItalianTriviaOption[];
  correctOptionId: string;
  audioText?: string;
  explanation: Localized;
};
export const ITALIAN_TRIVIA_COUNT = 5;
export const ITALIAN_TRIVIA_PASS = 4;

/** Trivia is voluntary retrieval practice. It cannot record course mastery or
 * replace a city's assessed final. Only the first half of its lessons is used. */
export function canPlayItalianTrivia(unit: CourseUnit, progress: CourseProgress): boolean {
  const passed = (progress.assessments[unit.quiz.id]?.bestIndependent ?? -1) >= unit.quiz.passPercent;
  const half = Math.max(1, Math.ceil(unit.lessons.length / 2));
  return passed || unit.lessons.slice(0, half).every(lesson =>
    lesson.activities.length > 0 && lesson.activities.every(activity => progress.activities[activity.id]?.completed));
}

type Candidate = { phrase: CoursePhrase; lessonId: string };
const norm = (value: string): string => value.normalize("NFC").toLocaleLowerCase("it-IT").replace(/\s+/g, " ").trim();

/** Authors supply the curriculum, never a generic culture-trivia generator.
 * Each question uses a different taught expression and unique distractors.
 * We intentionally DO NOT reuse the assessed final's question bank. */
export function buildItalianTrivia(unit: CourseUnit): ItalianTriviaQuestion[] {
  const half = Math.max(1, Math.ceil(unit.lessons.length / 2));
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const lesson of unit.lessons.slice(0, half)) {
    for (const phrase of lesson.vocabulary) {
      const key = norm(phrase.it);
      if (!key || phrase.it.length > 115 || /\n/.test(phrase.it) || seen.has(key) ||
          !["fr", "en", "es"].every(locale => phrase.meaning[locale as YoLocale]?.trim())) continue;
      seen.add(key);
      candidates.push({ phrase, lessonId: lesson.id });
    }
  }
  const shuffled = scrambleItalianItems(candidates, `trivia-targets:${unit.id}`);
  const modes: ItalianTriviaMode[] = ["meaning", "listening", "expression", "meaning", "listening"];
  const items: ItalianTriviaQuestion[] = [];
  for (const candidate of shuffled) {
    if (items.length >= ITALIAN_TRIVIA_COUNT) break;
    const mode = modes[items.length];
    const expressionChoices = mode === "expression";
    const value = (item: Candidate): Localized => expressionChoices
      ? { fr: item.phrase.it, en: item.phrase.it, es: item.phrase.it }
      : item.phrase.meaning;
    const options: Candidate[] = [candidate];
    for (const alternative of scrambleItalianItems(candidates.filter(item => item !== candidate), `trivia-options:${unit.id}:${candidate.phrase.it}`)) {
      const label = value(alternative);
      if (options.every(item => (["fr", "en", "es"] as const).every(locale => norm(value(item)[locale]) !== norm(label[locale])))) {
        options.push(alternative);
        if (options.length >= 4) break;
      }
    }
    if (options.length !== 4) continue;
    const index = items.length;
    const expression = candidate.phrase.it;
    const meaning = candidate.phrase.meaning;
    const prompt: Localized = mode === "listening" ? {
      fr: "Écoute l'expression italienne. Que signifie-t-elle ?",
      en: "Listen to the Italian expression. What does it mean?",
      es: "Escucha la expresión italiana. ¿Qué significa?",
    } : mode === "expression" ? {
      fr: `Tu veux dire « ${meaning.fr} ». Quelle expression italienne choisis-tu ?`,
      en: `You want to say “${meaning.en}”. Which Italian expression fits?`,
      es: `Quieres decir «${meaning.es}». ¿Qué expresión italiana eliges?`,
    } : {
      fr: `Que signifie « ${expression} » ?`,
      en: `What does “${expression}” mean?`,
      es: `¿Qué significa «${expression}»?`,
    };
    const shuffledOptions = scrambleItalianItems(options, `trivia-position:${unit.id}:${index}`);
    const answerIndex = shuffledOptions.indexOf(candidate);
    items.push({
      id: `${unit.id}:trivia:${index + 1}`,
      sourceLessonId: candidate.lessonId,
      mode, prompt,
      options: shuffledOptions.map((item, i) => ({ id: String(i), label: value(item) })),
      correctOptionId: String(answerIndex),
      ...(mode === "listening" ? { audioText: expression } : {}),
      explanation: {
        fr: `« ${expression} » : ${meaning.fr}`,
        en: `“${expression}”: ${meaning.en}`,
        es: `«${expression}»: ${meaning.es}`,
      },
    });
  }
  return items;
}

/** Cosmetic best-score souvenir only, never access, Passes, credits or mastery. */
export type ItalianTriviaSouvenir = { version: 1; unitId: string; resetAt: number; bestCorrect: number };
export function triviaSouvenirKey(unitId: string): string { return `yo.italian.trivia.souvenir.v1.${unitId}`; }
export function readTriviaSouvenir(raw: string | null, unitId: string, resetAt: number): ItalianTriviaSouvenir | null {
  if (!raw || raw.length > 300) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return null;
    const record = candidate as Record<string, unknown>;
    if (record.version !== 1 || record.unitId !== unitId || record.resetAt !== resetAt ||
      typeof record.bestCorrect !== "number" || !Number.isInteger(record.bestCorrect) ||
      record.bestCorrect < 0 || record.bestCorrect > ITALIAN_TRIVIA_COUNT) return null;
    return { version: 1, unitId, resetAt, bestCorrect: record.bestCorrect };
  } catch { return null; }
}
export function triviaSouvenirAfterRound(
  previous: ItalianTriviaSouvenir | null, unitId: string, resetAt: number,
  answers: readonly { correct: boolean; assisted: boolean }[],
): ItalianTriviaSouvenir | null {
  if (answers.length !== ITALIAN_TRIVIA_COUNT || answers.some(item => typeof item.correct !== "boolean" || typeof item.assisted !== "boolean")) return previous;
  const correctIndependent = answers.some(item => item.assisted) ? 0 : answers.filter(item => item.correct).length;
  return { version: 1, unitId, resetAt, bestCorrect: Math.max(previous?.resetAt === resetAt && previous.unitId === unitId ? previous.bestCorrect : 0, correctIndependent) };
}
