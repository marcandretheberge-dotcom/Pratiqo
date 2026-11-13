import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
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

test("cleanup scheduler is opt-in, supports the existing deployment plan and preserves close-only runtime auth", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  assert.deepEqual(config.crons.filter(item => item.path === "/api/cron/cafe-community-cleanup"), []);
  assert.ok(config.crons.some(item => item.path === "/api/cron/bookings/complete" && item.schedule === "15 3 * * *"));
  assert.ok(config.crons.some(item => item.path === "/api/cron/learner-demand" && item.schedule === "15 13 * * *"));
  const workflow = readFileSync(".github/workflows/cafe-community-cleanup.yml", "utf8");
  assert.match(workflow, /cron: "2-59\/5 \* \* \* \*"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /if: \$\{\{ vars\.CAFE_COMMUNITY_CLEANUP_ENABLED == 'true' \}\}/);
  assert.match(workflow, /environment: cafe-community-cleanup/);
  assert.match(workflow, /permissions: \{\}/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /CAFE_COMMUNITY_CLEANUP_CRON_SECRET: \$\{\{ secrets\.CAFE_COMMUNITY_CLEANUP_CRON_SECRET \}\}/);
  assert.doesNotMatch(workflow, /uses:|npm |npx |yarn |pnpm |curl /);
  assert.doesNotMatch(workflow, /pull_request|push:/);
  const handler = readFileSync("lib/cafe/communityCleanupCron.ts", "utf8");
  assert.match(handler, /timingSafeEqual\(provided, expected\)/);
  assert.doesNotMatch(handler, /isCafeCommunityEnabled|isCafeRoomProviderEnabled|CAFE_V1_ENABLED|CAFE_COMMUNITY_ENABLED/);
  const route = readFileSync("app/api/cron/cafe-community-cleanup/route.ts", "utf8");
  assert.match(route, /maxDuration = 60/);
  assert.match(route, /GET = cafeCommunityCleanupCron/);
  assert.match(route, /POST = cafeCommunityCleanupCron/);
});

async function runScheduler(options: { origin?: string; secret?: string; status?: number; error?: Error } = {}) {
  const workflow = readFileSync(".github/workflows/cafe-community-cleanup.yml", "utf8");
  const match = /^          node --input-type=module <<'NODE'\n([\s\S]*?)^          NODE$/m.exec(workflow);
  assert.ok(match, "Expected the self-contained Node scheduler script");
  const source = match[1].replace(/^ {10}/gm, "");
  const state = {
    env: { CAFE_COMMUNITY_CLEANUP_ORIGIN: options.origin, CAFE_COMMUNITY_CLEANUP_CRON_SECRET: options.secret },
    exitCode: 0,
  };
  const logs: string[] = [];
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const timeouts: number[] = [];
  let cancellations = 0;
  const status = options.status ?? 200;
  await runInNewContext(`(async () => {\n${source}\n})()`, {
    process: state,
    URL: globalThis.URL,
    console: { log: (line: string) => logs.push(line), error: (line: string) => logs.push(line) },
    AbortSignal: { timeout: (milliseconds: number) => { timeouts.push(milliseconds); return new AbortController().signal; } },
    fetch: async (url: URL, init: RequestInit) => {
      requests.push({ url: String(url), init });
      if (options.error) throw options.error;
      return {
        status, ok: status >= 200 && status < 300,
        body: { cancel: async () => { cancellations += 1; } },
        text: () => { throw new Error("The scheduler must not read or print response bodies"); },
        json: () => { throw new Error("The scheduler must not read or print provider details"); },
      };
    },
  }) as Promise<void>;
  return { state, logs, requests, timeouts, cancellations };
}

test("scheduler sends credentials only to the canonical origin and fixed cleanup path with redirects disabled", async () => {
  for (const origin of ["https://www.pratiqo.ca"]) {
    const result = await runScheduler({ origin, secret: SECRET });
    assert.equal(result.state.exitCode, 0);
    assert.equal(result.requests.length, 1);
    assert.equal(result.requests[0].url, `${origin}/api/cron/cafe-community-cleanup`);
    assert.equal(result.requests[0].init.method, "POST");
    assert.equal(result.requests[0].init.redirect, "error");
    assert.equal(result.requests[0].init.cache, "no-store");
    assert.equal(new Headers(result.requests[0].init.headers).get("Authorization"), `Bearer ${SECRET}`);
    assert.deepEqual(result.timeouts, [45_000]);
    assert.equal(result.cancellations, 1);
    assert.deepEqual(result.logs, ["Cafe cleanup: HTTP 200."]);
  }
});

test("scheduler rejects missing credentials and unapproved origins without making a request", async () => {
  for (const origin of [undefined, "", "https://pratiqo.ca", "http://www.pratiqo.ca", "https://www.pratiqo.ca.attacker.invalid", "https://www.pratiqo.ca@attacker.invalid", "https://www.pratiqo.ca/api/other", "https://www.pratiqo.ca?secret=anything"]) {
    const result = await runScheduler({ origin, secret: SECRET });
    assert.equal(result.state.exitCode, 1);
    assert.deepEqual(result.requests, []);
    assert.deepEqual(result.logs, ["Cafe cleanup: missing or invalid configuration."]);
  }
  const missingSecret = await runScheduler({ origin: "https://www.pratiqo.ca" });
  assert.equal(missingSecret.state.exitCode, 1);
  assert.deepEqual(missingSecret.requests, []);
});

test("scheduler fails visibly on pending cleanup or redirects without exposing error text or response bodies", async () => {
  const pending = await runScheduler({ origin: "https://www.pratiqo.ca", secret: SECRET, status: 503 });
  assert.equal(pending.state.exitCode, 1);
  assert.deepEqual(pending.logs, ["Cafe cleanup: HTTP 503."]);
  const redirect = await runScheduler({ origin: "https://www.pratiqo.ca", secret: SECRET, error: new Error(`Redirect error containing ${SECRET} and private provider data`) });
  assert.equal(redirect.state.exitCode, 1);
  assert.deepEqual(redirect.logs, ["Cafe cleanup: request failed."]);
  assert.equal(JSON.stringify(redirect.logs).includes(SECRET), false);
});
