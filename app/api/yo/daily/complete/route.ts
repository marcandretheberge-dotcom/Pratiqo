import { DAILY_REWARD, dailyChallenge } from "@/lib/yo/daily/challenges";
import { parseDailyClaim } from "@/lib/yo/daily/contract";
import { dailyAccount, dailyResponse, readDaily } from "@/lib/yo/daily/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await dailyAccount(req);
  if (!session.ok) return session.response;
  const claim = parseDailyClaim(await req.json().catch(() => null));
  if (!claim) return dailyResponse({ error: "Invalid daily answer" }, 400);
  const data = await readDaily(session);
  if (!data) return dailyResponse({ error: "Daily activity unavailable" }, 503);
  const expired = () => dailyResponse({ error: "Daily challenge changed" }, 409);
  if (claim.day !== data.today) return expired();
  const { challenge, answer, explanation, artifactId } = dailyChallenge(data.today, claim.kind);
  if (challenge.id !== claim.itemId) return expired();
  if (claim.choice !== answer) return dailyResponse({ correct: false });

  const { data: result, error } = await session.admin.rpc("yo_daily_award", {
    ...session.account, p_day: data.today, p_kind: claim.kind, p_item_id: challenge.id, p_artifact_id: artifactId,
  });
  if (error || (result !== "awarded" && result !== "duplicate" && result !== "expired"))
    return dailyResponse({ error: "Daily reward unavailable" }, 503);
  if (result === "expired") return expired();
  return dailyResponse({ correct: true, alreadyCompleted: result === "duplicate",
    xpAwarded: result === "awarded" ? DAILY_REWARD[claim.kind] : 0, explanation });
}
