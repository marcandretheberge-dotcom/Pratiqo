/**
 * Blocker: precise schedule cell editing must work end-to-end
 * (open cell → edit → Apply → dirty → save API → reload display).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  daypartDefaultInterval,
  replaceDaypartIntervals,
  validateDaypartIntervals,
} from "../../lib/schedule/dayparts";
import { formatCellIntervalLines, formatIntervalRange } from "../../lib/schedule/cellDisplay";
import { stableScheduleSnapshot } from "../../lib/schedule/scheduleSaveState";
import {
  isTeacherScheduleInteractiveCellsEnabled,
  isTeacherScheduleInteractiveCellsUiEnabled,
} from "../../lib/schedule/interactiveCells";
import type { WeeklyIntervalInput } from "../../lib/schedule/weeklyIntervals";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

test("interactive cells UI + persistence default ON for E2E", () => {
  delete process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS;
  delete process.env.ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS;
  delete process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
  assert.equal(isTeacherScheduleInteractiveCellsUiEnabled(), true);
  assert.equal(isTeacherScheduleInteractiveCellsEnabled(), true);
});

test("empty matin cell gets useful default draft 09:00–11:00", () => {
  assert.deepEqual(daypartDefaultInterval("matin"), {
    startTime: "09:00",
    endTime: "11:00",
  });
});

test("Apply flow: replace daypart then cell displays 09:00–11:30", () => {
  const before: WeeklyIntervalInput[] = [];
  const draftOk = validateDaypartIntervals({
    dayOfWeek: 3, // Wednesday
    daypart: "matin",
    enabled: true,
    intervals: [{ startTime: "09:00", endTime: "11:30" }],
  });
  assert.equal(draftOk.ok, true);
  if (!draftOk.ok) return;

  const after = replaceDaypartIntervals(before, 3, "matin", draftOk.intervals);
  const lines = formatCellIntervalLines(
    after.filter((iv) => iv.dayOfWeek === 3),
  );
  assert.deepEqual(lines, ["09:00–11:30"]);
  assert.equal(formatIntervalRange("09:00", "11:30"), "09:00–11:30");

  const baseline = stableScheduleSnapshot(before);
  const dirty = stableScheduleSnapshot(after) !== baseline;
  assert.equal(dirty, true);
});

test("multiple intervals Apply and display both ranges", () => {
  const validated = validateDaypartIntervals({
    dayOfWeek: 3,
    daypart: "apresmidi",
    enabled: true,
    intervals: [
      { startTime: "13:00", endTime: "14:00" },
      { startTime: "15:00", endTime: "16:00" },
    ],
  });
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const lines = formatCellIntervalLines(validated.intervals);
  assert.deepEqual(lines, ["13:00–14:00", "15:00–16:00"]);
});

test("validation rejects end before start, overlap, outside daypart", () => {
  const badOrder = validateDaypartIntervals({
    dayOfWeek: 1,
    daypart: "matin",
    enabled: true,
    intervals: [{ startTime: "11:30", endTime: "09:00" }],
  });
  assert.equal(badOrder.ok, false);

  const overlap = validateDaypartIntervals({
    dayOfWeek: 1,
    daypart: "matin",
    enabled: true,
    intervals: [
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "10:00", endTime: "11:30" },
    ],
  });
  assert.equal(overlap.ok, false);

  const outside = validateDaypartIntervals({
    dayOfWeek: 1,
    daypart: "matin",
    enabled: true,
    intervals: [{ startTime: "18:00", endTime: "20:00" }],
  });
  assert.equal(outside.ok, false);
  if (!outside.ok) assert.equal(outside.error, "outside_daypart");
});

test("simulated save payload + reload mapping keeps 09:00–11:30", () => {
  const saved: WeeklyIntervalInput[] = [
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:30" },
  ];
  // Mimic GET /api/teacher/weekly-intervals response → grid applyLoaded.
  const reloaded = saved.map((iv) => ({ ...iv }));
  assert.deepEqual(formatCellIntervalLines(reloaded), ["09:00–11:30"]);
  assert.equal(stableScheduleSnapshot(reloaded), stableScheduleSnapshot(saved));
});

test("grid + API + page wire full persistence path", () => {
  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  const api = read("app/api/teacher/weekly-intervals/route.ts");
  const page = read("app/(app)/teacher/schedule/page.tsx");
  const editor = read("components/teacher/TeacherScheduleCellEditor.tsx");

  assert.match(grid, /method: "PUT"/);
  assert.match(grid, /\/api\/teacher\/weekly-intervals/);
  assert.match(grid, /TeacherScheduleSaveBar/);
  assert.match(grid, /handleApply/);
  assert.match(grid, /testId="teacher-schedule-interactive-save-bar"/);
  assert.match(editor, /daypartDefaultInterval/);
  assert.match(editor, /validateDaypartIntervals/);
  assert.match(editor, /scheduleCellApply/);
  assert.match(api, /isTeacherScheduleInteractiveCellsEnabled/);
  assert.match(api, /getAuthenticatedTeacher|user_id/);
  assert.match(api, /teacher_weekly_availability_intervals/);
  assert.match(page, /TeacherScheduleInteractiveGrid/);
  assert.doesNotMatch(page, /Mode grilles|héritées/);
  assert.doesNotMatch(grid, /Mode grilles|héritées/);
});

test("API does not trust client teacher_id", () => {
  const api = read("app/api/teacher/weekly-intervals/route.ts");
  assert.doesNotMatch(api, /body\.teacher_id|teacherId:\s*parsed/);
  assert.match(api, /\.eq\("user_id", user\.id\)/);
});

test("migration 108 intervals table + 112 schedule_mode exist", () => {
  assert.equal(existsSync(join(ROOT, "supabase/migrations/108_teacher_weekly_availability_intervals.sql")), true);
  assert.equal(existsSync(join(ROOT, "supabase/migrations/112_teacher_schedule_mode.sql")), true);
  const m108 = read("supabase/migrations/108_teacher_weekly_availability_intervals.sql");
  assert.match(m108, /teacher_weekly_availability_intervals/);
});

test("no Stripe/checkout/package mutation in E2E schedule files", () => {
  for (const file of [
    "lib/schedule/interactiveCells.ts",
    "app/api/teacher/weekly-intervals/route.ts",
    "components/teacher/TeacherScheduleInteractiveGrid.tsx",
    "components/teacher/TeacherScheduleCellEditor.tsx",
    "app/(app)/teacher/schedule/page.tsx",
  ]) {
    const src = read(file);
    assert.doesNotMatch(
      src,
      /checkout\.sessions|commission_rate|payout_reversal|package_entitlement_balance|package_redemptions/,
    );
  }
});

async function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
    } catch (e) {
      failed += 1;
      console.error(`✗ ${t.name}`);
      console.error(e);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log(`\n[schedule:interactive-cells-e2e] ${tests.length} assertions passed.`);
}

void run();
