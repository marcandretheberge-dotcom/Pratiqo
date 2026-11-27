import type { CourseProgress } from "../italian/course/courseProgress";
import type { CourseUnit } from "../italian/course/courseTypes";

export const REWARD_NAMESPACE = "yo.preview.italian-rewards.v1";
export const PREVIEW_PROGRESS_KEY = `${REWARD_NAMESPACE}.progress`;
export const REWARD_KEY = `${REWARD_NAMESPACE}.ledger`;
export const REWARD_TIME_ZONE = "America/Toronto";
export type Reward = { id: string; xp: number; at: number; kind: "practice" | "independent" | "lesson" | "mastery"; listening?: boolean };
export type RewardLedger = { version: 1; events: Reward[] };
export const emptyRewards = (): RewardLedger => ({ version: 1, events: [] });

/** Practice XP never participates in grading, entitlement or map unlock decisions. */
export function reconcileRewards(previous: RewardLedger, progress: CourseProgress, units: CourseUnit[]): RewardLedger {
  const events = [...previous.events], ids = new Set(events.map(e => e.id));
  const add = (event: Reward) => { if (!ids.has(event.id)) { ids.add(event.id); events.push(event); } };
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      for (const activity of lesson.activities) {
        const result = progress.activities[activity.id];
        if (!result?.completed) continue;
        add({ id: `practice:${activity.id}`, xp: 5, at: result.lastAt, kind: "practice", listening: activity.kind === "listen" });
        if (result.independent) add({ id: `independent:${activity.id}`, xp: 5, at: result.lastAt, kind: "independent" });
      }
      if (lesson.activities.length && lesson.activities.every(a => progress.activities[a.id]?.completed)) {
        add({ id: `lesson:${lesson.id}`, xp: 20, at: Math.max(...lesson.activities.map(a => progress.activities[a.id].lastAt)), kind: "lesson" });
      }
    }
    const assessment = progress.assessments[unit.quiz.id];
    if (assessment?.bestIndependent !== null && assessment?.bestIndependent !== undefined && assessment.bestIndependent >= unit.quiz.passPercent) {
      add({ id: `mastery:${unit.quiz.id}`, xp: 50, at: assessment.last.completedAt, kind: "mastery" });
    }
  }
  return { version: 1, events };
}

export function parseRewards(raw: string | null, units: CourseUnit[], now = Date.now()): RewardLedger {
  if (!raw) return emptyRewards();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("events" in value) || !Array.isArray(value.events)) return emptyRewards();
    const definitions = new Map<string, { kind: Reward["kind"]; xp: number; listening?: boolean }>();
    for (const u of units) {
      for (const l of u.lessons) {
        definitions.set(`lesson:${l.id}`, { kind: "lesson", xp: 20 });
        for (const a of l.activities) {
          definitions.set(`practice:${a.id}`, { kind: "practice", xp: 5, listening: a.kind === "listen" });
          definitions.set(`independent:${a.id}`, { kind: "independent", xp: 5 });
        }
      }
      definitions.set(`mastery:${u.quiz.id}`, { kind: "mastery", xp: 50 });
    }
    const accepted = new Map<string, Reward>();
    for (const e of value.events) {
      if (!e || typeof e.id !== "string" || !Number.isSafeInteger(e.at) || e.at <= 0 || e.at > now + 60000) continue;
      const definition = definitions.get(e.id);
      if (definition && !accepted.has(e.id)) accepted.set(e.id, { id: e.id, at: e.at, ...definition });
    }
    return { version: 1, events: [...accepted.values()] };
  } catch { return emptyRewards(); }
}

/** Calendar keys use the preview's declared timezone, never the server process TZ. */
export function rewardDay(at: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: REWARD_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}
export function rewardWeek(at: number) {
  const day = new Date(`${rewardDay(at)}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}
export function rewardSummary(ledger: RewardLedger, now: number) {
  const today = ledger.events.filter(e => rewardDay(e.at) === rewardDay(now));
  return {
    total: ledger.events.reduce((sum, e) => sum + e.xp, 0),
    today: today.reduce((sum, e) => sum + e.xp, 0),
    weekly: ledger.events.filter(e => rewardWeek(e.at) === rewardWeek(now)).reduce((sum, e) => sum + e.xp, 0),
    goals: [
      { id: "practice", count: today.filter(e => e.kind === "practice").length, target: 5 },
      { id: "listen", count: today.filter(e => e.kind === "practice" && e.listening).length, target: 2 },
      { id: "lesson", count: today.filter(e => e.kind === "lesson").length, target: 1 },
    ],
    mastered: ledger.events.filter(e => e.kind === "mastery").length,
  };
}

/** Retired preview adapter: rankings now come exclusively from the account-backed route. */
export function demoRanking(_xp: number): never[] { return []; }
