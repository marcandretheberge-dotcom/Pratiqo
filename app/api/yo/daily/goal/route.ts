import { parseDailyGoal } from "@/lib/yo/daily/contract";
import { dailyAccount, dailyResponse } from "@/lib/yo/daily/server";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const session = await dailyAccount(req);
  if (!session.ok) return session.response;
  const input = parseDailyGoal(await req.json().catch(() => null));
  if (!input) return dailyResponse({ error: "Invalid daily goal" }, 400);
  const { error } = await session.admin.rpc("yo_daily_set_goal", { ...session.account, p_goal: input.goal });
  return error ? dailyResponse({ error: "Daily activity unavailable" }, 503) : dailyResponse(input);
}
