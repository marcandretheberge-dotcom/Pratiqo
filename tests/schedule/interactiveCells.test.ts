/**
 * PR 17A-UX — interactive schedule cells + daypart interval validation.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  copyDaypartToAllWeekdays,
  copyDaypartToWeekdays,
  daypartBounds,
  daypartDefaultInterval,
  intervalFitsDaypart,
  intervalsForDaypart,
  replaceDaypartIntervals,
  validateDaypartIntervals,
} from "../../lib/schedule/dayparts";
import { formatCellIntervalLines, formatIntervalRange } from "../../lib/schedule/cellDisplay";
import {
  isTeacherScheduleInteractiveCellsEnabled,
  isTeacherScheduleInteractiveCellsUiEnabled,
  TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG,
  TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG,
} from "../../lib/schedule/interactiveCells";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const uiFlag = process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG];
const serverFlag = process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG];

test("interactive cells UI flag defaults ON (explicit false disables)", () => {
  delete process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG];
  assert.equal(isTeacherScheduleInteractiveCellsUiEnabled(), true);
  process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG] = "false";
  assert.equal(isTeacherScheduleInteractiveCellsUiEnabled(), false);
});

test("interactive cells server persistence defaults ON (explicit false disables)", () => {
  delete process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG];
  delete process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
  assert.equal(isTeacherScheduleInteractiveCellsEnabled(), true);
  process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG] = "false";
  assert.equal(isTeacherScheduleInteractiveCellsEnabled(), false);
});

test("daypart bounds match PERIODS 08-12 / 12-17 / 17-21", () => {
  assert.deepEqual(daypartBounds("matin"), {
    startMin: 8 * 60,
    endMin: 12 * 60,
    startTime: "08:00",
    endTime: "12:00",
  });
  assert.equal(daypartDefaultInterval("matin").startTime, "09:00");
  assert.equal(daypartDefaultInterval("soir").endTime, "20:00");
});

test("intervalFitsDaypart rejects evening hours in morning cell", () => {
  assert.equal(intervalFitsDaypart("09:00", "11:30", "matin"), true);
  assert.equal(intervalFitsDaypart("18:00", "20:00", "matin"), false);
  assert.equal(intervalFitsDaypart("18:00", "20:00", "soir"), true);
});

test("validateDaypartIntervals rejects overlap and outside daypart", () => {
  const overlap = validateDaypartIntervals({
    dayOfWeek: 3,
    daypart: "matin",
    enabled: true,
    intervals: [
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "10:00", endTime: "11:30" },
    ],
  });
  assert.equal(overlap.ok, false);

  const outside = validateDaypartIntervals({
    dayOfWeek: 3,
    daypart: "matin",
    enabled: true,
    intervals: [{ startTime: "18:00", endTime: "20:00" }],
  });
  assert.equal(outside.ok, false);
  if (!outside.ok) assert.equal(outside.error, "outside_daypart");

  const ok = validateDaypartIntervals({
    dayOfWeek: 3,
    daypart: "matin",
    enabled: true,
    intervals: [
      { startTime: "08:00", endTime: "09:30" },
      { startTime: "10:00", endTime: "11:30" },
    ],
  });
  assert.equal(ok.ok, true);
});

test("validateDaypartIntervals allows clear when disabled", () => {
  const cleared = validateDaypartIntervals({
    dayOfWeek: 1,
    daypart: "apresmidi",
    enabled: false,
    intervals: [],
  });
  assert.equal(cleared.ok, true);
  if (cleared.ok) assert.equal(cleared.intervals.length, 0);
});

test("replaceDaypartIntervals keeps other days and dayparts", () => {
  const all = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
    { dayOfWeek: 1, startTime: "13:00", endTime: "16:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
  ];
  const next = replaceDaypartIntervals(all, 1, "matin", [
    { dayOfWeek: 1, startTime: "08:00", endTime: "10:00" },
  ]);
  assert.equal(intervalsForDaypart(next, 1, "matin").length, 1);
  assert.equal(intervalsForDaypart(next, 1, "apresmidi").length, 1);
  assert.equal(intervalsForDaypart(next, 3, "matin").length, 1);
});

test("copyDaypartToAllWeekdays and weekdays helpers", () => {
  const source = [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }];
  const all = copyDaypartToAllWeekdays([], 3, "matin", source);
  assert.equal(intervalsForDaypart(all, 0, "matin").length, 1);
  assert.equal(intervalsForDaypart(all, 6, "matin").length, 1);
  const weekdays = copyDaypartToWeekdays([], "soir", [
    { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
  ]);
  assert.equal(intervalsForDaypart(weekdays, 1, "soir").length, 1);
  assert.equal(intervalsForDaypart(weekdays, 0, "soir").length, 0);
});

test("cell display formatter stacks intervals", () => {
  assert.equal(formatIntervalRange("09:00", "11:30"), "09:00–11:30");
  const lines = formatCellIntervalLines([
    { dayOfWeek: 1, startTime: "10:00", endTime: "11:00" },
    { dayOfWeek: 1, startTime: "08:00", endTime: "09:00" },
  ]);
  assert.deepEqual(lines, ["08:00–09:00", "10:00–11:00"]);
});

test("interactive grid + editor components wire sticky save and modal", () => {
  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  const editor = read("components/teacher/TeacherScheduleCellEditor.tsx");
  const page = read("app/(app)/teacher/schedule/page.tsx");
  assert.match(grid, /TeacherScheduleSaveBar/);
  assert.match(grid, /useUnsavedChangesWarning/);
  assert.match(grid, /\/api\/teacher\/weekly-intervals/);
  assert.match(grid, /TeacherScheduleCellEditor/);
  assert.match(grid, /data-testid="teacher-schedule-interactive-grid"/);
  assert.match(editor, /Escape/);
  assert.match(editor, /aria-modal/);
  assert.match(editor, /scheduleCellApply/);
  assert.match(editor, /scheduleCellCancel/);
  assert.match(page, /isTeacherScheduleInteractiveCellsUiEnabled/);
  assert.match(page, /TeacherScheduleInteractiveGrid/);
  assert.match(page, /schedulePreciseDisabledTitle/);
  assert.doesNotMatch(page, /Mode grilles|héritées/);
});

test("opening editor without Apply does not require page dirty (Apply updates state)", () => {
  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  assert.match(grid, /onApply=\{handleApply\}/);
  assert.match(grid, /onClose=\{\(\) => setEditor\(null\)\}/);
  assert.match(grid, /replaceDaypartIntervals/);
});

test("env example documents interactive cells flags default ON", () => {
  const env = read(".env.example");
  assert.match(env, new RegExp(TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG));
  assert.match(env, new RegExp(TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG));
  assert.match(env, /defaults ON/);
});

test("i18n includes interactive cell copy FR/EN/ES", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const json = read(`lib/i18n/locales/${locale}.json`);
    assert.match(json, /"scheduleCellEnableSlot"/);
    assert.match(json, /"scheduleCellOutsideDaypart"/);
    assert.match(json, /"scheduleCellLockedReadonly"/);
    assert.match(json, /"scheduleCellCopySameWeekday"/);
    assert.match(json, /"schedulePreciseDisabledTitle"/);
  }
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Activer ce créneau/);
  assert.match(fr, /Cette plage doit rester dans la période sélectionnée/);
  assert.match(fr, /Horaire précis désactivé par configuration/);
  assert.doesNotMatch(fr, /Salaire|Employé|Pratiqo vous assigne/);
  assert.doesNotMatch(fr, /Mode grilles héritées/);
});

test("no Stripe/checkout/commission/package mutation in interactive cell files", () => {
  for (const file of [
    "lib/schedule/dayparts.ts",
    "lib/schedule/cellDisplay.ts",
    "lib/schedule/interactiveCells.ts",
    "components/teacher/TeacherScheduleCellEditor.tsx",
    "components/teacher/TeacherScheduleInteractiveGrid.tsx",
  ]) {
    assert.equal(existsSync(join(ROOT, file)), true);
    const src = read(file);
    assert.doesNotMatch(src, /stripe|checkout|commission|payout|refund|packageEntitlement|packageRedemption/i);
  }
});

(async () => {
  let passed = 0;
  try {
    for (const { name, fn } of tests) {
      await fn();
      passed += 1;
      console.log(`✓ ${name}`);
    }
    console.log(`\n[schedule:interactive-cells] ${passed} assertions passed.`);
  } finally {
    if (uiFlag === undefined) delete process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG];
    else process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG] = uiFlag;
    if (serverFlag === undefined) delete process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG];
    else process.env[TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG] = serverFlag;
    delete process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
