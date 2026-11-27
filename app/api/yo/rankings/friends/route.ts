import { rankingAccount, rankingFailure, rankingResponse } from "@/lib/yo/rankings/server";
import { parseRankingFriend, readRankingBody } from "@/lib/yo/rankings/validation";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const account = await rankingAccount(req, "friends");
  if (!account.ok) return account.response;
  const payload = parseRankingFriend(await readRankingBody(req));
  if (!payload) return rankingResponse({ error: "invalid_request" }, 400);
  const { error } = await account.admin.rpc("yo_rankings_friend_action", { p_user_id: account.userId, p_action: payload.action,
    p_code: payload.action === "request" ? payload.code : null, p_id: payload.action === "request" ? null : payload.id });
  return error ? rankingFailure(error) : rankingResponse({ ok: true });
}
