import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createCommunityCleanupCron } from "../../lib/cafe/communityCleanupCron";

const SECRET = "test-only-cron-secret-that-is-not-a-real-credential";
const URL = "https://pratiqo.example/api/cron/cafe-community-cleanup";

function request(secret: string | null = SECRET, method = "GET", extraHeaders: Record<string, string> = {}) {
  return new Request(URL, {
    method, headers: { ...(secret === null ? {} : { Authorization: `Bearer ${secret}` }), ...extraHeaders },
  });
}

async function body(response: Response, status: number) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("Pragma"), "no-cache");
  return await response.json() as Record<string, unknown>;
}

test("cleanup cron fails closed for missing config and missing, malformed or incorrect credentials", async () => {
  let cleanupCalls = 0;
  const cleanup = async () => { cleanupCalls += 1; return { pending: false }; };
  for (const secret of [undefined, "", "  "]) {
    const handler = createCommunityCleanupCron({ secret: () => secret, cleanup });
    assert.deepEqual(await body(await handler(request()), 503), { ok: false, code: "cleanup_unavailable" });
  }
  const handler = createCommunityCleanupCron({ secret: () => SECRET, cleanup });
  for (const wrong of [null, "x", "wrong-but-same-length".padEnd(SECRET.length, "x"), "x".repeat(8_193)]) {
    assert.deepEqual(await body(await handler(request(wrong)), 401), { ok: false, code: "unauthorized" });
  }
  await body(await handler(request(null, "GET", { Authorization: SECRET })), 401);
  await body(await handler(request(null, "GET", { "x-cron-secret": SECRET })), 401);
  await body(await handler(new Request(`${URL}?secret=${SECRET}`)), 401);
  assert.equal(cleanupCalls, 0);
});

test("authorized GET and POST drain global closed-call outbox without taking client actor or call identifiers", async () => {
  const seen: unknown[] = [];
  const handler = createCommunityCleanupCron({
    secret: () => SECRET,
    cleanup: async input => { seen.push(input); return { pending: false }; },
  });
  assert.deepEqual(await body(await handler(request()), 200), { ok: true });
  const post = new Request(`${URL}?actorId=forged&callId=forged`, {
    method: "POST", headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ actorId: "forged", callIds: ["forged"] }),
  });
  assert.deepEqual(await body(await handler(post), 200), { ok: true });
  assert.deepEqual(seen, [{ actorId: null }, { actorId: null }]);
});

test("pending cleanup and provider exceptions remain retriable without returning credentials or diagnostics", async () => {
  const pending = createCommunityCleanupCron({ secret: () => SECRET, cleanup: async () => ({ pending: true }) });
  const response = await pending(request());
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.deepEqual(await body(response, 503), { ok: false, code: "cleanup_pending", retryAfter: 60 });

  const error = createCommunityCleanupCron({ secret: () => SECRET, cleanup: async () => { throw new Error(`private provider token ${SECRET}`); } });
  assert.deepEqual(await body(await error(request()), 503), { ok: false, code: "cleanup_unavailable", retryAfter: 60 });
});

test("cron unsupported methods and cross-origin manual writes cannot cause cleanup", async () => {
  let cleanupCalls = 0;
  const handler = createCommunityCleanupCron({ secret: () => SECRET, cleanup: async () => { cleanupCalls += 1; return { pending: false }; } });
  for (const method of ["HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const response = await handler(request(SECRET, method));
    assert.equal(response.headers.get("Allow"), "GET, POST");
    await body(response, 405);
  }
  await body(await handler(request(SECRET, "POST", { Origin: "https://attacker.example" })), 403);
  assert.equal(cleanupCalls, 0);
});

test("release cron runs each minute and close-only handler contains no feature flag dependency", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  assert.deepEqual(config.crons.filter(item => item.path === "/api/cron/cafe-community-cleanup"), [{ path: "/api/cron/cafe-community-cleanup", schedule: "* * * * *" }]);
  const handler = readFileSync("lib/cafe/communityCleanupCron.ts", "utf8");
  assert.match(handler, /timingSafeEqual\(provided, expected\)/);
  assert.doesNotMatch(handler, /isCafeCommunityEnabled|isCafeRoomProviderEnabled|CAFE_V1_ENABLED|CAFE_COMMUNITY_ENABLED/);
  const route = readFileSync("app/api/cron/cafe-community-cleanup/route.ts", "utf8");
  assert.match(route, /maxDuration = 60/);
  assert.match(route, /GET = cafeCommunityCleanupCron/);
  assert.match(route, /POST = cafeCommunityCleanupCron/);
});
