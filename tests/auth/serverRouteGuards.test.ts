import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isBlockedSupabaseDemoPath } from "@/middleware";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("/supabase is hard-blocked before auth redirects", () => {
  assert.equal(isBlockedSupabaseDemoPath("/supabase"), true);
  assert.equal(isBlockedSupabaseDemoPath("/supabase/"), true);
  assert.equal(isBlockedSupabaseDemoPath("/supabase/anything"), true);
  assert.equal(isBlockedSupabaseDemoPath("/student"), false);
  assert.equal(isBlockedSupabaseDemoPath("/teacher/profile/abc"), false);
});

test("middleware blocks /supabase before login redirect logic", () => {
  const source = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
  const blockIndex = source.indexOf("isBlockedSupabaseDemoPath(pathname)");
  const loginIndex = source.indexOf("pathname.startsWith(LOGIN_PATH)");
  assert.ok(blockIndex >= 0, "Expected /supabase hard block in middleware");
  assert.ok(loginIndex >= 0, "Expected login redirect guard in middleware");
  assert.ok(blockIndex < loginIndex, "Expected /supabase block before login redirect");
  assert.doesNotMatch(source, /["']\/supabase["'],?\s*\n\s*["']\/student["']/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:serverRouteGuards] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
