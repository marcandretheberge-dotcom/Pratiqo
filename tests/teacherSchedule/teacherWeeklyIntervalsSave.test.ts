/**
 * Weekly intervals save — structured non-PII error codes + UI mapping.
 * Schedule persistence root cause is NOT assumed fixed in this PR.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const STRUCTURED_CODES = [
  "weekly_intervals_disabled",
  "unauthorized",
  "teacher_not_found",
  "invalid_payload",
  "validation_error",
  "intervals_conflict",
  "db_delete_failed",
  "db_insert_failed",
  "availability_sync_failed",
  "server_error",
] as const;

test("weekly-intervals PUT returns structured error codes", () => {
  const route = read("app/api/teacher/weekly-intervals/route.ts");
  for (const code of STRUCTURED_CODES) {
    assert.match(route, new RegExp(`"${code}"`));
  }
  assert.match(route, /jsonError\("unauthorized"/);
  assert.match(route, /jsonError\("teacher_not_found"/);
  assert.match(route, /jsonError\("db_delete_failed"/);
  assert.match(route, /jsonError\("db_insert_failed"/);
  assert.match(route, /jsonError\("availability_sync_failed"/);
  assert.match(route, /mapValidationCode/);
  assert.match(route, /console\.warn\("\[teacher\/weekly-intervals\]"/);
});

test("weekly-intervals still writes intervals table and coarse availability on success", () => {
  const route = read("app/api/teacher/weekly-intervals/route.ts");
  assert.match(route, /teacher_weekly_availability_intervals/);
  assert.match(route, /\.delete\(\)/);
  assert.match(route, /\.insert\(rows\)/);
  assert.match(route, /availability:\s*coarse/);
  assert.match(route, /intervalsToCoarseAvailabilityStrings/);
});

test("interactive grid maps known schedule save error codes", () => {
  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  assert.match(grid, /weeklyIntervalsUnauthorized/);
  assert.match(grid, /weeklyIntervalsTeacherNotFound/);
  assert.match(grid, /weeklyIntervalsDbInsertFailed/);
  assert.match(grid, /weeklyIntervalsAvailabilitySyncFailed/);
  assert.match(grid, /console\.warn\("\[teacher\/schedule\] weekly_intervals_save"/);
  assert.match(grid, /map\[code\] \?\? "weeklyIntervalsSaveError"/);
});

test("weekly intervals editor maps structured DB/auth codes", () => {
  const editor = read("components/teacher/TeacherWeeklyIntervalsEditor.tsx");
  assert.match(editor, /db_insert_failed:\s*"weeklyIntervalsDbInsertFailed"/);
  assert.match(editor, /unauthorized:\s*"weeklyIntervalsUnauthorized"/);
});

test("i18n keys for schedule structured errors exist in FR/EN/ES", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const dict = JSON.parse(read(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    assert.ok(dict.weeklyIntervalsUnauthorized?.length);
    assert.ok(dict.weeklyIntervalsDbInsertFailed?.length);
    assert.ok(dict.weeklyIntervalsAvailabilitySyncFailed?.length);
    assert.ok(dict.weeklyIntervalsSaveError?.length);
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacherSchedule:weekly-intervals-save] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
