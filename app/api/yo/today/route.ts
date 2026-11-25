import { artifacts, dailyChallenge } from "@/lib/yo/daily/challenges";
import type { DailyKind, DailySummary } from "@/lib/yo/daily/contract";
import { dailyAccount, dailyResponse, readDaily } from "@/lib/yo/daily/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await dailyAccount(req);
  if (!session.ok) return session.response;
  const data = await readDaily(session);
  if (!data) return dailyResponse({ error: "Daily activity unavailable" }, 503);
  const getToday = (kind: DailyKind) => {
    const { challenge, explanation } = dailyChallenge(data.today, kind);
    const completed = data.completed[kind] === challenge.id;
    return { ...challenge, completed, ...(completed ? { explanation } : {}) };
  };
  const summary: DailySummary = {
    today: data.today, exercises: data.exercises, xpToday: data.xpToday, goal: data.goal,
    earned: artifacts.filter(artifact => data.earned.includes(artifact.id)),
    catalogueSize: artifacts.length,
    daily: { mission: getToday("mission"), trivia: getToday("trivia") },
  };
  return dailyResponse(summary);
}
