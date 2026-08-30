/**
 * Schedule save sanitization — stale/hidden invalid intervals must not block save.
 * Root cause: cell Apply leaked NormalizedWeeklyInterval (startMin/endMin) into state;
 * PUT Zod `.strict()` rejected as invalid_payload while the grid only showed valid ranges.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  sanitizeWeeklyIntervalsForSave,
  validateWeeklyIntervalSet,
  type WeeklyIntervalInput,
} from "@/lib/schedule/weeklyIntervals";
import {
  intervalsForDaypart,
  replaceDaypartIntervals,
  validateDaypartIntervals,
} from "@/lib/schedule/dayparts";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

/** Mirrors API putBodySchema strictness (no startMin/endMin). */
const intervalSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().min(4).max(8),
    endTime: z.string().min(4).max(8),
  })
  .strict();
const putBodySchema = z.object({ intervals: z.array(intervalSchema).max(84) }).strict();

test("valid Wednesday matin + apresmidi passes validation and API schema", () => {
  const intervals: WeeklyIntervalInput[] = [
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
    { dayOfWeek: 3, startTime: "13:00", endTime: "17:00" },
  ];
  const sanitized = sanitizeWeeklyIntervalsForSave(intervals);
  assert.equal(sanitized.droppedInvalidCount, 0);
  assert.equal(sanitized.normalizedIntervals.length, 2);
  const validated = validateWeeklyIntervalSet(sanitized.normalizedIntervals);
  assert.equal(validated.ok, true);
  const parsed = putBodySchema.safeParse({ intervals: sanitized.normalizedIntervals });
  assert.equal(parsed.success, true);
});

test("NormalizedWeeklyInterval extras (startMin/endMin) are stripped so Zod strict passes", () => {
  // Reproduce production poison: validateDaypartIntervals previously returned set.intervals
  // which include startMin/endMin — PUT .strict() then returned invalid_payload.
  const withExtras = [
    {
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "11:00",
      startMin: 540,
      endMin: 660,
    },
    {
      dayOfWeek: 3,
      startTime: "13:00",
      endTime: "17:00",
      startMin: 780,
      endMin: 1020,
    },
  ];
  assert.equal(putBodySchema.safeParse({ intervals: withExtras }).success, false);

  const sanitized = sanitizeWeeklyIntervalsForSave(withExtras);
  assert.equal(sanitized.normalizedIntervals.length, 2);
  assert.equal(putBodySchema.safeParse({ intervals: sanitized.normalizedIntervals }).success, true);
  for (const iv of sanitized.normalizedIntervals) {
    assert.deepEqual(Object.keys(iv).sort(), ["dayOfWeek", "endTime", "startTime"]);
  }
});

test("hidden invalid/stale interval is dropped and does not poison save", () => {
  const state = [
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
    { dayOfWeek: 3, startTime: "13:00", endTime: "17:00" },
    { dayOfWeek: 3, startTime: "9h00", endTime: "10h00" }, // invalid time format, hidden by intervalsForDaypart
    { dayOfWeek: 99, startTime: "09:00", endTime: "11:00" }, // invalid day
  ];
  assert.equal(intervalsForDaypart(state, 3, "matin").length, 1);
  assert.equal(intervalsForDaypart(state, 3, "apresmidi").length, 1);

  const sanitized = sanitizeWeeklyIntervalsForSave(state);
  assert.equal(sanitized.droppedInvalidCount, 2);
  assert.equal(sanitized.normalizedIntervals.length, 2);
  assert.equal(validateWeeklyIntervalSet(sanitized.normalizedIntervals).ok, true);
  assert.equal(putBodySchema.safeParse({ intervals: sanitized.normalizedIntervals }).success, true);
});

test("exact duplicate is removed before save", () => {
  const state = [
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
  ];
  const sanitized = sanitizeWeeklyIntervalsForSave(state);
  assert.equal(sanitized.droppedDuplicateCount, 1);
  assert.equal(sanitized.normalizedIntervals.length, 1);
  assert.equal(validateWeeklyIntervalSet(sanitized.normalizedIntervals).ok, true);
});

test("real overlapping intervals are NOT silently dropped", () => {
  const state = [
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
    { dayOfWeek: 3, startTime: "10:00", endTime: "12:00" },
  ];
  const sanitized = sanitizeWeeklyIntervalsForSave(state);
  assert.equal(sanitized.droppedInvalidCount, 0);
  assert.equal(sanitized.normalizedIntervals.length, 2);
  const validated = validateWeeklyIntervalSet(sanitized.normalizedIntervals);
  assert.equal(validated.ok, false);
  if (!validated.ok) {
    assert.equal(validated.error, "overlapping_intervals");
    assert.equal(typeof validated.index, "number");
  }
});

test("validateDaypartIntervals returns API-safe fields only", () => {
  const result = validateDaypartIntervals({
    dayOfWeek: 3,
    daypart: "matin",
    enabled: true,
    intervals: [{ startTime: "09:00", endTime: "11:00" }],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.intervals, [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }]);
  assert.equal(putBodySchema.safeParse({ intervals: result.intervals }).success, true);
});

test("replaceDaypartIntervals drops invalid intervals instead of preserving them", () => {
  const all = [
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
    { dayOfWeek: 3, startTime: "bad", endTime: "time" },
    { dayOfWeek: 1, startTime: "xx", endTime: "yy" },
  ];
  const next = replaceDaypartIntervals(all, 3, "matin", [
    { dayOfWeek: 3, startTime: "08:00", endTime: "10:00" },
  ]);
  assert.equal(next.length, 1);
  assert.deepEqual(next[0], { dayOfWeek: 3, startTime: "08:00", endTime: "10:00" });
  assert.equal(intervalsForDaypart(next, 3, "matin").length, 1);
});

test("interactive grid save wires sanitizeWeeklyIntervalsForSave", () => {
  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  assert.match(grid, /sanitizeWeeklyIntervalsForSave/);
  assert.match(grid, /droppedInvalidIndexes/);
  assert.match(grid, /sanitizedIntervalCount/);
  assert.match(grid, /detail/);
  assert.match(grid, /json\.index/);
});

test("API validation failure includes detail and index when available", () => {
  const route = read("app/api/teacher/weekly-intervals/route.ts");
  assert.match(route, /detail:\s*validated\.error/);
  assert.match(route, /index:\s*validated\.index/);
  assert.match(route, /unrecognized_keys/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacherSchedule:saveSanitization] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
