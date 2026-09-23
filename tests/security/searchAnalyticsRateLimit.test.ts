import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  handleSearchEventPost,
  parseSearchEventPayload,
  type SearchEventBody,
} from "../../app/api/analytics/search-event/route";
import type { RateLimitResult } from "../../lib/rateLimit";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://www.pratiqo.ca/api/analytics/search-event", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function allowedRateLimit(): Promise<RateLimitResult> {
  return Promise.resolve({ allowed: true, limit: 30, remaining: 29, reset: 1_800_000_000 });
}

function blockedRateLimit(): Promise<RateLimitResult> {
  return Promise.resolve({
    allowed: false,
    limit: 30,
    remaining: 0,
    reset: 1_800_000_000,
    retryAfterSeconds: 30,
  });
}

async function responseJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

test("valid search analytics payload succeeds and inserts sanitized row", async () => {
  const captured: { row?: SearchEventBody & { user_id: string | null } } = {};
  const response = await handleSearchEventPost(
    jsonRequest({
      anonymous_session_id: " anon-123 ",
      source: " landing ",
      category: "Langues",
      subject: "Espagnol",
      format: "online",
      city: "Montréal",
      region: "QC",
      country_code: "CA",
      timezone: "America/Toronto",
      filters: { availability: "soir", nested: { level: "débutant" } },
      result_count: 12.4,
      clicked_teacher_id: "teacher-id",
    }),
    {
      rateLimit: allowedRateLimit,
      getUserId: async () => "user-1",
      insert: (row) => {
        captured.row = row;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), { ok: true });
  const inserted = captured.row;
  assert.equal(inserted?.user_id, "user-1");
  assert.equal(inserted?.source, "landing");
  assert.equal(inserted?.anonymous_session_id, "anon-123");
  assert.equal(inserted?.result_count, 12);
  assert.deepEqual(inserted?.filters, { availability: "soir", nested: { level: "débutant" } });
});

test("invalid JSON and array/object-shape payloads are rejected before insert", async () => {
  let insertCount = 0;
  for (const request of [jsonRequest("{bad json"), jsonRequest([])]) {
    const response = await handleSearchEventPost(request, {
      rateLimit: allowedRateLimit,
      insert: () => {
        insertCount += 1;
      },
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await responseJson(response), { ok: false });
  }
  assert.equal(insertCount, 0);
});

test("oversized string fields and filters are rejected before insert", async () => {
  let inserted = false;
  const response = await handleSearchEventPost(
    jsonRequest({ source: "landing", subject: "x".repeat(101), filters: {} }),
    {
      rateLimit: allowedRateLimit,
      insert: () => {
        inserted = true;
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await responseJson(response), { ok: false });
  assert.equal(inserted, false);
});

test("oversized body is rejected with 413 before insert", async () => {
  let inserted = false;
  const response = await handleSearchEventPost(
    jsonRequest({ source: "landing", filters: { blob: "x".repeat(5_000) } }),
    {
      rateLimit: allowedRateLimit,
      insert: () => {
        inserted = true;
      },
    },
  );

  assert.equal(response.status, 413);
  assert.deepEqual(await responseJson(response), { ok: false });
  assert.equal(inserted, false);
});

test("rate limited request returns 429 and never inserts", async () => {
  let inserted = false;
  const response = await handleSearchEventPost(jsonRequest({ source: "landing", filters: {} }), {
    rateLimit: blockedRateLimit,
    insert: () => {
      inserted = true;
    },
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "30");
  assert.equal(inserted, false);
});

test("insert failures are generic and do not expose internal errors", async () => {
  const response = await handleSearchEventPost(jsonRequest({ source: "landing", filters: {} }), {
    rateLimit: allowedRateLimit,
    insert: () => {
      throw new Error("database exploded with private details");
    },
  });

  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(body, '{"ok":true}');
  assert.doesNotMatch(body, /database|private|exploded/i);
});

test("payload parser enforces required source, type checks, and sane result bounds", () => {
  assert.deepEqual(parseSearchEventPayload({ filters: {} }), { ok: false, status: 400 });
  assert.deepEqual(parseSearchEventPayload({ source: "landing", result_count: "12" }), { ok: false, status: 400 });
  assert.deepEqual(parseSearchEventPayload({ source: "landing", result_count: 20_000 }), { ok: false, status: 400 });
  assert.deepEqual(parseSearchEventPayload({ source: "landing", filters: [] }), { ok: false, status: 400 });
});

test("route source uses project rate-limit guard and safe body caps before service-role insert", () => {
  const src = read("app/api/analytics/search-event/route.ts");
  assert.match(src, /rateLimitByIp/);
  assert.match(src, /rateLimitGuardResponse/);
  assert.match(src, /"search-analytics"/);
  assert.match(src, /limit:\s*30/);
  assert.match(src, /windowSeconds:\s*60/);
  assert.match(src, /MAX_BODY_BYTES\s*=\s*4_096/);
  assert.match(src, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(src, /rateLimited[\s\S]+readSearchEventJson/);
  assert.doesNotMatch(src, /console\.(?:log|error|warn)\([^\n]*(?:request\.text|body|query|subject|city|anonymous_session_id)/i);
});

console.log("[security:searchAnalyticsRateLimit] tests passed");
