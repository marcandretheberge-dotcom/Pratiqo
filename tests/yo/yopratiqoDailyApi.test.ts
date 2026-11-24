import assert from "node:assert/strict";
import { GET } from "../../app/api/yo/today/route";
import { POST } from "../../app/api/yo/daily/complete/route";
import { PUT } from "../../app/api/yo/daily/goal/route";
import { dailyChallenge } from "@/lib/yo/daily/challenges";

const day = "2026-11-24";
const owner = "00000000-0000-4000-8000-000000000019";
const fixtureOrigin = "https://daily.example.test";

async function main() {
  Object.assign(process.env, {
    YO_SRS_SERVER_ENABLED: "true", YO_DAILY_SERVER_ENABLED: "true",
    NEXT_PUBLIC_SUPABASE_URL: fixtureOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test",
    SUPABASE_SERVICE_ROLE_KEY: "service-test",
  });
  let awardCalls = 0;
  let result = "awarded";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    function json(data: unknown, status?: number) { return Response.json(data, { status }); }
    assert.equal(url.origin, fixtureOrigin);
    if (url.pathname === "/auth/v1/user") {
      assert.equal(request.headers.get("authorization"), "Bearer learner-test");
      return json({ id: owner, aud: "authenticated" });
    }
    assert.equal(request.headers.get("authorization"), "Bearer service-test");
    if (url.pathname === "/rest/v1/profiles") {
      assert.equal(url.searchParams.get("id"), `eq.${owner}`);
      return json({ timezone: "America/Toronto" });
    }
    const payload = await request.json();
    assert.equal(payload.p_user_id, owner);
    assert.equal(payload.p_timezone, "America/Toronto");
    if (url.pathname === "/rest/v1/rpc/yo_daily_read") {
      return json({ today: day, exercises: 3, xpToday: 15, goal: null, completed: {}, earned: [] });
    }
    if (url.pathname === "/rest/v1/rpc/yo_daily_set_goal") {
      assert.deepEqual(payload, { p_user_id: owner, p_timezone: "America/Toronto", p_goal: 5 });
      return new Response(null, { status: 204 });
    }
    assert.equal(url.pathname, "/rest/v1/rpc/yo_daily_award");
    assert.equal(payload.p_artifact_id, "artifact-it-u01");
    assert.equal(payload.p_day, day);
    assert.equal(payload.p_item_id, "daily-mission-it-u01");
    awardCalls++;
    if (result === "simulated outage") return json({ code: "42883", message: "test" }, 400);
    return json(result);
  };
  try {
    const request = (method: string, body?: object) => new Request("http://localhost/api/yo/test", {
      method, headers: { Authorization: "Bearer learner-test", "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const summary = await GET(request("GET"));
    assert.equal(summary.status, 200);
    assert.equal(summary.headers.get("Cache-Control"), "private, no-store");
    const data = await summary.json();
    assert.equal(data.exercises, 3);
    assert.equal(data.goal, null);
    assert.ok(!Object.hasOwn(data, "streak"));
    assert.ok(!Object.hasOwn(data.daily.mission, "answer") && !Object.hasOwn(data.daily.trivia, "explanation"));
    const { challenge, answer } = dailyChallenge(day, "mission");
    const claim = { day, kind: "mission", itemId: challenge.id, choice: answer };
    assert.equal((await POST(request("POST", { ...claim, day: "2026-11-23" }))).status, 409);
    assert.equal((await POST(request("POST", { ...claim, itemId: "daily-mission-it-u02" }))).status, 409);
    assert.deepEqual(await (await POST(request("POST", { ...claim, choice: (answer + 1) % 3 }))).json(), { correct: false });
    assert.equal(awardCalls, 0);
    assert.equal((await (await POST(request("POST", claim))).json()).xpAwarded, 30);
    result = "duplicate";
    assert.equal((await (await POST(request("POST", claim))).json()).xpAwarded, 0);
    result = "simulated outage";
    assert.equal((await POST(request("POST", claim))).status, 503);
    result = "expired";
    assert.equal((await POST(request("POST", claim))).status, 409);
    assert.equal((await PUT(request("PUT", { goal: 5 }))).status, 200);
    assert.equal((await PUT(request("PUT", { goal: 5, userId: "other-account" }))).status, 400);
    console.log("Today authenticated request flow: origin, account scope, wrong answer, reward, replay, expiry and outage passed");
  } finally {
    globalThis.fetch = originalFetch;
  }
}
void main();
