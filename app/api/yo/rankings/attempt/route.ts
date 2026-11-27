import { rankingAccount, rankingFailure, rankingResponse } from "@/lib/yo/rankings/server";
import { parseRankingAttempt, projectRankingAward, readRankingBody } from "@/lib/yo/rankings/validation";
import { gradeRankingAttempt } from "@/lib/yo/rankings/grade.server";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const account = await rankingAccount(req, "attempt");
  if (!account.ok) return account.response;
  const attempt = parseRankingAttempt(await readRankingBody(req));
  if (!attempt) return rankingResponse({ error: "invalid_request" }, 400);
  let correct: boolean;
  try { correct = await gradeRankingAttempt(attempt); }
  catch { return rankingResponse({ error: "invalid_request" }, 400); }
  // Raw answers are checked transiently and never written or logged.
  const result = correct
    ? await account.admin.rpc("yo_rankings_award", { p_user_id: account.userId, p_language: attempt.language, p_item_id: attempt.itemId })
    : await account.admin.rpc("yo_rankings_xp", { p_user_id: account.userId });
  const award = projectRankingAward(result.data);
  if (result.error || !award) return rankingFailure(result.error);
  return rankingResponse(award);
}
