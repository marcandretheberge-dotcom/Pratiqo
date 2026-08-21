/**
 * PR 17A-UX-POLISH — weekly title, copy menu, time pills, realtime validation.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  copyDaypartToWeekdays,
  formatWeeklyScheduleCellTitle,
  suggestNextDaypartInterval,
  validateDaypartIntervals,
} from "../../lib/schedule/dayparts";
import { applyScheduleCellCopy } from "../../lib/schedule/copyScheduleIntervals";
import {
  formatCellIntervalDisplay,
  formatCellIntervalLines,
  formatIntervalRange,
} from "../../lib/schedule/cellDisplay";
import { stableScheduleSnapshot } from "../../lib/schedule/scheduleSaveState";
import type { WeeklyIntervalInput } from "../../lib/schedule/weeklyIntervals";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

test("weekly modal title uses recurring wording without a calendar date", () => {
  const title = formatWeeklyScheduleCellTitle("Dimanche", "matin", "hebdomadaire");
  assert.equal(title, "Dimanche matin — hebdomadaire");
  assert.doesNotMatch(title, /\d{1,2}\s/);
  assert.doesNotMatch(title, /août|August|agosto/i);

  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  assert.match(grid, /formatWeeklyScheduleCellTitle/);
  assert.match(grid, /scheduleCellWeeklyScope/);
  assert.doesNotMatch(grid, /toLocaleDateString\(dateLocale, \{ day: "numeric", month: "long" \}\)/);
});

test("copy targets: same weekday, Mon–Fri, every day (local draft only)", () => {
  const source: WeeklyIntervalInput[] = [
    { dayOfWeek: 0, startTime: "09:00", endTime: "11:00" }, // Sunday matin
  ];
  const same = applyScheduleCellCopy({
    all: [],
    sourceDayOfWeek: 0,
    daypart: "matin",
    cellIntervals: source,
    target: "same_weekday",
  });
  assert.equal(same.length, 1);
  assert.equal(same[0]!.dayOfWeek, 0);

  const weekdays = applyScheduleCellCopy({
    all: [],
    sourceDayOfWeek: 0,
    daypart: "matin",
    cellIntervals: source,
    target: "weekdays",
  });
  assert.deepEqual(
    weekdays.map((iv) => iv.dayOfWeek).sort(),
    [1, 2, 3, 4, 5],
  );

  const every = applyScheduleCellCopy({
    all: [],
    sourceDayOfWeek: 0,
    daypart: "matin",
    cellIntervals: source,
    target: "every_day",
  });
  assert.equal(every.length, 7);

  // copyDaypartToWeekdays still available as primitive
  const viaHelper = copyDaypartToWeekdays([], "matin", source);
  assert.equal(viaHelper.length, 5);

  const editor = read("components/teacher/TeacherScheduleCellEditor.tsx");
  assert.match(editor, /scheduleCellCopyTo/);
  assert.match(editor, /teacher-schedule-cell-copy-menu/);
  assert.match(editor, /teacher-schedule-cell-copy-weekdays/);
  assert.match(editor, /teacher-schedule-cell-copy-every-day/);
  assert.doesNotMatch(editor, /fetch\(|method:\s*"PUT"/);
});

test("configured cells render exact time pills (with overflow summary)", () => {
  assert.equal(formatIntervalRange("09:00", "11:00"), "09:00–11:00");
  const two = formatCellIntervalDisplay([
    { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
    { dayOfWeek: 1, startTime: "14:00", endTime: "16:00" },
  ]);
  // 2 fits in max 2
  assert.deepEqual(two.visible, ["09:00–11:00", "14:00–16:00"]);
  assert.equal(two.overflow, 0);

  const three = formatCellIntervalDisplay([
    { dayOfWeek: 1, startTime: "09:00", endTime: "10:00" },
    { dayOfWeek: 1, startTime: "10:15", endTime: "11:00" },
    { dayOfWeek: 1, startTime: "11:15", endTime: "12:00" },
  ]);
  assert.equal(three.visible.length, 1);
  assert.equal(three.overflow, 2);
  assert.deepEqual(formatCellIntervalLines(three.lines.map((line, i) => {
    const [startTime, endTime] = line.split("–");
    return { dayOfWeek: 1, startTime: startTime!, endTime: endTime! };
  })), three.lines);

  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  assert.match(grid, /teacher-schedule-cell-time-pill/);
  assert.match(grid, /formatCellIntervalDisplay/);
});

test("realtime validation disables Apply when invalid; overlap/order/daypart", () => {
  const overlap = validateDaypartIntervals({
    dayOfWeek: 0,
    daypart: "matin",
    enabled: true,
    intervals: [
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "10:00", endTime: "12:00" },
    ],
  });
  assert.equal(overlap.ok, false);

  const order = validateDaypartIntervals({
    dayOfWeek: 0,
    daypart: "matin",
    enabled: true,
    intervals: [{ startTime: "11:00", endTime: "09:00" }],
  });
  assert.equal(order.ok, false);

  const outside = validateDaypartIntervals({
    dayOfWeek: 0,
    daypart: "matin",
    enabled: true,
    intervals: [{ startTime: "18:00", endTime: "20:00" }],
  });
  assert.equal(outside.ok, false);

  const ok = validateDaypartIntervals({
    dayOfWeek: 0,
    daypart: "matin",
    enabled: true,
    intervals: [
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "11:30", endTime: "12:00" },
    ],
  });
  assert.equal(ok.ok, true);

  const editor = read("components/teacher/TeacherScheduleCellEditor.tsx");
  assert.match(editor, /liveValidation/);
  assert.match(editor, /disabled=\{!canApply\}/);
  assert.match(editor, /teacher-schedule-cell-editor-error/);
});

test("suggestNextDaypartInterval avoids overlap after 09:00–11:00", () => {
  const next = suggestNextDaypartInterval("matin", [{ startTime: "09:00", endTime: "11:00" }]);
  assert.ok(next);
  assert.equal(next!.startTime, "11:30");
  assert.ok(next!.endTime > next!.startTime);
});

test("Apply marks dirty locally; copy does not call save API in editor", () => {
  const before: WeeklyIntervalInput[] = [];
  const after = applyScheduleCellCopy({
    all: before,
    sourceDayOfWeek: 3,
    daypart: "matin",
    cellIntervals: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }],
    target: "weekdays",
  });
  assert.notEqual(stableScheduleSnapshot(before), stableScheduleSnapshot(after));

  const editor = read("components/teacher/TeacherScheduleCellEditor.tsx");
  assert.doesNotMatch(editor, /\/api\/teacher\/weekly-intervals/);
  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  assert.match(grid, /onCopy=\{handleCopy\}/);
  assert.match(grid, /applyScheduleCellCopy/);
});

test("i18n polish keys FR/EN/ES without héritées/legacy titles", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const json = read(`lib/i18n/locales/${locale}.json`);
    assert.match(json, /"scheduleCellWeeklyScope"/);
    assert.match(json, /"scheduleCellCopyTo"/);
    assert.match(json, /"scheduleCellCopyWeekdays"/);
    assert.match(json, /"scheduleCellCopyEveryDay"/);
    assert.match(json, /"scheduleCellTimesRequired"/);
    assert.match(json, /"scheduleCellOverflowOne"/);
  }
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /hebdomadaire/);
  assert.match(fr, /Copier vers/);
  assert.match(fr, /Du lundi au vendredi/);
  assert.match(fr, /Choisis une heure de début et de fin/);
  assert.doesNotMatch(fr, /Mode grilles héritées/);
});

test("exception editor still uses exact dates (not weekly title helper)", () => {
  const ex = read("components/teacher/TeacherScheduleExceptionsEditor.tsx");
  assert.match(ex, /formatExceptionDate|toLocaleDateString/);
  assert.doesNotMatch(ex, /formatWeeklyScheduleCellTitle|scheduleCellWeeklyScope/);
});

test("no Stripe/checkout/package mutation in polish files", () => {
  for (const file of [
    "lib/schedule/copyScheduleIntervals.ts",
    "lib/schedule/dayparts.ts",
    "lib/schedule/cellDisplay.ts",
    "components/teacher/TeacherScheduleCellEditor.tsx",
    "components/teacher/TeacherScheduleInteractiveGrid.tsx",
  ]) {
    assert.equal(existsSync(join(ROOT, file)), true);
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
  console.log(`\n[schedule:cell-editor-polish] ${tests.length} assertions passed.`);
}

void run();
