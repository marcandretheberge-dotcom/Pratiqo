import { rankingAccount, rankingFailure, rankingResponse } from "@/lib/yo/rankings/server";
import { parseRankingAttempt, projectRankingAward, readRankingBody } from "@/lib/yo/rankings/validation";
import { gradeRankingAttemptForAward } from "@/lib/yo/rankings/grade.server";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const account = await rankingAccount(req, "attempt");
  if (!account.ok) return account.response;
  const attempt = parseRankingAttempt(await readRankingBody(req));
  if (!attempt) return rankingResponse({ error: "invalid_request" }, 400);
  let verified: Awaited<ReturnType<typeof gradeRankingAttemptForAward>>;
  try { verified = await gradeRankingAttemptForAward(attempt); }
  catch { return rankingFailure(null); }
  // Raw answers are checked transiently and never written or logged.
  // Equivalent authored interest positions share one durable award identity;
  // course/review records continue to use the exact attempted content identity.
  const result = verified
    ? await account.admin.rpc("yo_rankings_award", { p_user_id: account.userId, p_language: attempt.language, p_item_id: verified.rewardItemId })
    : await account.admin.rpc("yo_rankings_xp", { p_user_id: account.userId });
  const award = projectRankingAward(result.data);
  if (result.error || !award) return rankingFailure(result.error);
  return rankingResponse(award);
}
