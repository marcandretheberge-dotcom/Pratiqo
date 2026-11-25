import type { YoLocale } from "@/lib/yo/types";

export type DailyKind = "mission" | "trivia";
type Localized = Record<YoLocale, string>;
export type DailyChallenge = { id: string; title?: Localized; prompt: Localized; choices: (Localized | string)[] };
export type DailySummary = {
  today: string; exercises: number; xpToday: number; goal: number | null;
  earned: { id: string; title: Localized }[];
  catalogueSize: number;
  daily: Record<DailyKind, DailyChallenge & { completed: boolean; explanation?: Localized }>;
};
export type DailyAnswer = { correct: false } | { correct: true; alreadyCompleted: boolean; xpAwarded: number; explanation: Localized };

type Claim = { day: string; kind: DailyKind; itemId: string; choice: number };

function isExactObject(input: unknown, keys: string[]): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    && Object.keys(input).length === keys.length && keys.every(key => Object.hasOwn(input, key));
}

export function parseDailyClaim(input: unknown): Claim | null {
  if (!isExactObject(input, ["day", "kind", "itemId", "choice"])) return null;
  const { day, kind, itemId, choice } = input;
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)
    || (kind !== "mission" && kind !== "trivia") || typeof itemId !== "string"
    || !/^[a-z0-9-]{1,96}$/.test(itemId) || typeof choice !== "number"
    || !Number.isInteger(choice) || choice < 0 || choice > 9) return null;
  return { day, kind, itemId, choice };
}

export function parseDailyGoal(input: unknown): { goal: number | null } | null {
  if (!isExactObject(input, ["goal"])) return null;
  const { goal } = input;
  return goal === null || (typeof goal === "number" && Number.isInteger(goal) && goal >= 1 && goal <= 50)
    ? { goal } : null;
}
