import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DRAFT_TEACHER_ROW_INSERT } from "@/lib/teachers/ensureTeacherProfileRow";
import { isTeacherProfileComplete } from "@/lib/teacherOnboarding";
import { isTeacherMarketplaceVisibleRow } from "@/lib/teachers/marketplaceVisibility";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("migration 059 allows null draft price_per_lesson but rejects zero", () => {
  const sql = read("supabase/migrations/059_teacher_minimum_lesson_prices.sql");
  assert.match(sql, /price_per_lesson IS NULL OR price_per_lesson >= 20/);
});

test("draft teacher row insert uses minimum valid price_per_lesson not zero or null", () => {
  assert.equal(DRAFT_TEACHER_ROW_INSERT.price_per_lesson, 20);
  assert.equal(DRAFT_TEACHER_ROW_INSERT.is_public, false);
  const src = read("lib/teachers/ensureTeacherProfileRow.ts");
  assert.doesNotMatch(src, /price_per_lesson:\s*0/);
  assert.doesNotMatch(src, /price_per_lesson:\s*null/);
  assert.match(src, /MIN_LESSON_PRICE_DOLLARS/);
  assert.match(src, /DRAFT_TEACHER_ROW_INSERT/);
});

test("ensure API does not return raw postgres constraint errors to clients", () => {
  const route = read("app/api/teacher/profile/ensure/route.ts");
  assert.match(route, /teacher_profile_ensure_failed/);
  assert.doesNotMatch(route, /error: error/);
  const client = read("lib/teachers/ensureTeacherProfileClient.ts");
  assert.match(client, /teacher_profile_ensure_failed/);
});

test("verification setup page shows friendly ensure error not raw DB message", () => {
  const page = read("app/(app)/teacher/verification/page.tsx");
  assert.match(page, /verificationNoTeacherRowSetup/);
  assert.doesNotMatch(page, /teacherEnsureError \?\?/);
  assert.match(page, /console\.error\("\[teacher\/verification\] fetchEnsureTeacherProfile failed"/);
});

test("draft teacher row with placeholder minimum price stays hidden until public", () => {
  assert.equal(
    isTeacherMarketplaceVisibleRow({
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      is_public: false,
      discipline: null,
      category: null,
      discipline_count: 0,
      deactivated_at: null,
      deleted_at: null,
    }),
    false,
  );
});

test("complete teacher with valid price remains marketplace-eligible when public", () => {
  assert.equal(
    isTeacherProfileComplete({
      name: "Marie",
      category: "music",
      discipline: "piano",
      city: "Montreal",
      region: "QC",
      country_code: "CA",
      timezone: "America/Toronto",
      teaching_mode: "both",
      price_per_lesson: 50,
      availability: [{ day: "monday", slots: ["09h00"] }],
    }),
    true,
  );
  assert.equal(
    isTeacherMarketplaceVisibleRow({
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      is_public: true,
      discipline: "piano",
      category: "music",
      discipline_count: 1,
      deactivated_at: null,
      deleted_at: null,
    }),
    true,
  );
});

test("verification page supports setup=1 entry for new teachers without existing row", () => {
  const page = read("app/(app)/teacher/verification/page.tsx");
  assert.match(page, /fetchEnsureTeacherProfile/);
  assert.match(page, /setupMode/);
  assert.match(page, /data-testid="teacher-profile-management-page"/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teachers:ensureTeacherProfileRow] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
