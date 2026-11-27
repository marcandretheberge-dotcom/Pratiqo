import { rankingAccount, rankingFailure, rankingResponse } from "@/lib/yo/rankings/server";
import { parseRankingQuery, projectRankingSnapshot } from "@/lib/yo/rankings/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const query = parseRankingQuery(req.url);
  if (!query) return rankingResponse({ error: "invalid_request" }, 400);
  const account = await rankingAccount(req, "read");
  if (!account.ok) return account.response;
  const { data, error } = await account.admin.rpc("yo_rankings_read", { p_user_id: account.userId, p_scope: query.scope, p_period: query.period, p_language: query.language });
  const snapshot = projectRankingSnapshot(data);
  if (error || !snapshot) return rankingFailure(error);
  return rankingResponse(snapshot);
}
