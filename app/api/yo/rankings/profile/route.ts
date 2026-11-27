import { rankingAccount, rankingFailure, rankingResponse } from "@/lib/yo/rankings/server";
import { parseRankingProfile, readRankingBody } from "@/lib/yo/rankings/validation";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const account = await rankingAccount(req, "profile");
  if (!account.ok) return account.response;
  const payload = parseRankingProfile(await readRankingBody(req));
  if (!payload) return rankingResponse({ error: "invalid_request" }, 400);
  const { error } = await account.admin.rpc("yo_rankings_set_profile", { p_user_id: account.userId, p_name: payload.displayName, p_participating: payload.participating });
  return error ? rankingFailure(error) : rankingResponse({ ok: true });
}
