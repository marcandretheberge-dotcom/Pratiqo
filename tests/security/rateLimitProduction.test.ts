/**
 * Production rate-limit hardening regression suite.
 *
 * Guards against fail-open behavior when Upstash Redis is missing or errors
 * in production — a launch P0 blocker.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  isRateLimitDevFriendly,
  isRateLimitInfrastructureRequired,
  rateLimitByIp,
  rateLimitGuardResponse,
} from "../../lib/rateLimit";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const rateLimitSrc = read("lib/rateLimit.ts");

function setTestNodeEnv(value: NodeJS.ProcessEnv["NODE_ENV"]): void {
  if (value === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Object.defineProperty(process.env, "NODE_ENV", { value, configurable: true, enumerable: true, writable: true });
}

test("rateLimit.ts documents production fail-closed behavior", () => {
  assert.match(rateLimitSrc, /fail closed/i);
  assert.match(rateLimitSrc, /infrastructureUnavailable/);
  assert.match(rateLimitSrc, /rateLimitGuardResponse/);
  assert.match(rateLimitSrc, /rateLimitUnavailableResponse/);
});

test("protected API routes use rateLimitGuardResponse (not raw rateLimitResponse only)", () => {
  const routes = [
    "app/api/waitlist/route.ts",
    "app/api/teacher/credentials/route.ts",
    "app/api/student/onboarding-consent/route.ts",
    "app/api/support/cases/first-lesson-guarantee/route.ts",
    "app/api/messages/send/route.ts",
    "app/api/ai/description/route.ts",
    "app/api/companion/route.ts",
    "app/api/reviews/route.ts",
  ];
  for (const route of routes) {
    const src = read(route);
    assert.match(src, /rateLimitGuardResponse/, `${route} must use rateLimitGuardResponse`);
    assert.doesNotMatch(src, /rateLimitResponse\(/, `${route} must not call rateLimitResponse directly`);
  }
});

test("production + missing Redis env does not fail open", async () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedVercelEnv = process.env.VERCEL_ENV;
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    setTestNodeEnv("production");
    process.env.VERCEL_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    assert.equal(isRateLimitInfrastructureRequired(), true);
    assert.equal(isRateLimitDevFriendly(), false);

    const req = new Request("https://pratiqo.ca/api/waitlist", { method: "POST" });
    const rl = await rateLimitByIp(req, "waitlist-test-missing", { limit: 5, windowSeconds: 60 });
    assert.equal(rl.allowed, false);
    assert.equal(rl.infrastructureUnavailable, true);

    const blocked = rateLimitGuardResponse(rl);
    assert.ok(blocked);
    assert.equal(blocked.status, 503);
    const body = (await blocked.json()) as { error?: string };
    assert.match(body.error ?? "", /temporarily unavailable/i);
    const serialized = JSON.stringify(body);
    assert.doesNotMatch(serialized, /UPSTASH/i);
    assert.doesNotMatch(serialized, /REDIS/i);
    assert.doesNotMatch(serialized, /token/i);
  } finally {
    setTestNodeEnv(savedNodeEnv);
    if (savedVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = savedVercelEnv;
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});

test("production + Redis backend error does not fail open", async () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedVercelEnv = process.env.VERCEL_ENV;
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const savedFetch = globalThis.fetch;
  try {
    setTestNodeEnv("production");
    process.env.VERCEL_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    globalThis.fetch = async () => new Response("upstream error", { status: 502 });

    const req = new Request("https://pratiqo.ca/api/reviews", { method: "POST" });
    const rl = await rateLimitByIp(req, "review-test-error", { limit: 10, windowSeconds: 60 });
    assert.equal(rl.allowed, false);
    assert.equal(rl.infrastructureUnavailable, true);

    const blocked = rateLimitGuardResponse(rl);
    assert.ok(blocked);
    assert.equal(blocked.status, 503);
  } finally {
    globalThis.fetch = savedFetch;
    setTestNodeEnv(savedNodeEnv);
    if (savedVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = savedVercelEnv;
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});

test("non-production remains developer-friendly when Redis is missing", async () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedVercelEnv = process.env.VERCEL_ENV;
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    setTestNodeEnv("development");
    delete process.env.VERCEL_ENV;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    assert.equal(isRateLimitDevFriendly(), true);

    const req = new Request("https://localhost:3000/api/waitlist", { method: "POST" });
    const rl = await rateLimitByIp(req, "waitlist-test-dev", { limit: 5, windowSeconds: 60 });
    assert.equal(rl.allowed, true);
    assert.notEqual(rl.infrastructureUnavailable, true);
  } finally {
    setTestNodeEnv(savedNodeEnv);
    if (savedVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = savedVercelEnv;
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[security:rateLimitProduction] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
