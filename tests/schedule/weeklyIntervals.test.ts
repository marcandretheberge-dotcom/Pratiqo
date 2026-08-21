/**
 * PR 17A — precise teacher weekly availability intervals.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateSlotsFromWeeklyIntervals,
  intervalsToCoarseAvailabilityStrings,
  isTeacherScheduleIntervalsEnabled,
  normalizeWeeklyInterval,
  slotFitsWeeklyIntervals,
  TEACHER_SCHEDULE_INTERVALS_FLAG,
  TEACHER_SCHEDULE_INTERVALS_UI_FLAG,
  validateWeeklyIntervalSet,
} from "../../lib/schedule/weeklyIntervals";
import { rejectIfOutsideWeeklyIntervals } from "../../lib/bookings/weeklyIntervalGuard";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const MIGRATION = "supabase/migrations/108_teacher_weekly_availability_intervals.sql";
const prevFlag = process.env[TEACHER_SCHEDULE_INTERVALS_FLAG];

test("migration creates intervals table with Sun=0 day_of_week and RLS", () => {
  assert.equal(existsSync(join(ROOT, MIGRATION)), true);
  const sql = read(MIGRATION);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.teacher_weekly_availability_intervals/i);
  assert.match(sql, /day_of_week smallint NOT NULL/i);
  assert.match(sql, /0\s*=\s*Sunday/i);
  assert.match(sql, /start_time < end_time/i);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /teacher_weekly_intervals_select_own/);
  assert.match(sql, /teacher_weekly_intervals_insert_own/);
  assert.match(sql, /teacher_weekly_intervals_update_own/);
  assert.match(sql, /teacher_weekly_intervals_delete_own/);
  assert.match(sql, /t\.user_id = \(SELECT auth\.uid\(\)\)/);
});

test("feature flag defaults OFF", () => {
  delete process.env[TEACHER_SCHEDULE_INTERVALS_FLAG];
  assert.equal(isTeacherScheduleIntervalsEnabled(), false);
});

test("validation rejects end <= start and overnight", () => {
  assert.equal(normalizeWeeklyInterval({ dayOfWeek: 1, startTime: "11:00", endTime: "10:00" }).ok, false);
  assert.equal(normalizeWeeklyInterval({ dayOfWeek: 1, startTime: "22:00", endTime: "02:00" }).ok, false);
  assert.equal(normalizeWeeklyInterval({ dayOfWeek: 1, startTime: "09:00", endTime: "09:00" }).ok, false);
  assert.equal(normalizeWeeklyInterval({ dayOfWeek: 1, startTime: "09:00", endTime: "11:30" }).ok, true);
});

test("validation rejects overlapping intervals", () => {
  const result = validateWeeklyIntervalSet([
    { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
    { dayOfWeek: 1, startTime: "11:00", endTime: "13:00" },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "overlapping_intervals");
});

test("validation allows multiple non-overlapping intervals per day", () => {
  const result = validateWeeklyIntervalSet([
    { dayOfWeek: 1, startTime: "09:00", endTime: "11:30" },
    { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
    { dayOfWeek: 3, startTime: "13:00", endTime: "16:00" },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.intervals.length, 3);
});

test("slotFitsWeeklyIntervals requires full lesson inside interval", () => {
  const validated = validateWeeklyIntervalSet([{ dayOfWeek: 1, startTime: "09:00", endTime: "11:30" }]);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const intervals = validated.intervals;
  assert.equal(slotFitsWeeklyIntervals(1, 9 * 60, 60, intervals), true);
  assert.equal(slotFitsWeeklyIntervals(1, 10 * 60, 60, intervals), true);
  assert.equal(slotFitsWeeklyIntervals(1, 10 * 60 + 30, 60, intervals), true);
  assert.equal(slotFitsWeeklyIntervals(1, 11 * 60, 60, intervals), false);
  assert.equal(slotFitsWeeklyIntervals(1, 8 * 60, 60, intervals), false);
});

test("generateSlotsFromWeeklyIntervals only yields in-range starts", () => {
  const validated = validateWeeklyIntervalSet([{ dayOfWeek: 1, startTime: "09:00", endTime: "11:30" }]);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const slots = generateSlotsFromWeeklyIntervals(1, validated.intervals, 60, [], [], []);
  assert.ok(slots.includes("9h00"));
  assert.ok(slots.includes("10h00"));
  assert.ok(slots.includes("10h30"));
  assert.equal(slots.includes("11h00"), false);
});

test("coarse availability projection for search back-compat", () => {
  const validated = validateWeeklyIntervalSet([
    { dayOfWeek: 1, startTime: "09:00", endTime: "11:30" },
    { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
  ]);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const coarse = intervalsToCoarseAvailabilityStrings(validated.intervals);
  assert.ok(coarse.includes("Lun Matin"));
  assert.ok(coarse.includes("Lun Soir"));
});

test("booking guard is no-op when flag OFF", async () => {
  delete process.env[TEACHER_SCHEDULE_INTERVALS_FLAG];
  const result = await rejectIfOutsideWeeklyIntervals({
    admin: {
      from: () => {
        throw new Error("should not load intervals when flag OFF");
      },
    },
    teacherId: "t1",
    slotDate: "2099-01-05",
    timeSlot: "11h00",
    durationMinutes: 60,
  });
  assert.equal(result, null);
});

test("booking guard rejects slot ending after interval when flag ON", async () => {
  process.env[TEACHER_SCHEDULE_INTERVALS_FLAG] = "true";
  const admin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () =>
            Promise.resolve({
              data: [
                {
                  day_of_week: 1,
                  start_time: "09:00:00",
                  end_time: "11:30:00",
                  is_active: true,
                },
              ],
              error: null,
            }),
        }),
      }),
    }),
  };
  // 2099-01-05 is Monday (dayOfWeek = 1)
  const allowed = await rejectIfOutsideWeeklyIntervals({
    admin,
    teacherId: "t1",
    slotDate: "2099-01-05",
    timeSlot: "10h30",
    durationMinutes: 60,
  });
  assert.equal(allowed, null);

  const rejected = await rejectIfOutsideWeeklyIntervals({
    admin,
    teacherId: "t1",
    slotDate: "2099-01-05",
    timeSlot: "11h00",
    durationMinutes: 60,
  });
  assert.equal(rejected?.error, "slot_outside_teacher_availability");
});

test("booking guard rejects when flag ON and no intervals configured", async () => {
  process.env[TEACHER_SCHEDULE_INTERVALS_FLAG] = "true";
  const admin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  };
  const rejected = await rejectIfOutsideWeeklyIntervals({
    admin,
    teacherId: "t1",
    slotDate: "2099-01-05",
    timeSlot: "10h00",
    durationMinutes: 60,
  });
  assert.equal(rejected?.error, "slot_outside_teacher_availability");
});

test("API route and schedule UI wire feature flags", () => {
  const api = read("app/api/teacher/weekly-intervals/route.ts");
  assert.match(api, /isTeacherScheduleInteractiveCellsEnabled/);
  assert.match(api, /weekly_intervals_disabled/);
  assert.match(api, /validateWeeklyIntervalSet/);
  assert.match(api, /intervalsToCoarseAvailabilityStrings/);

  const page = read("app/(app)/teacher/schedule/page.tsx");
  assert.match(page, /isTeacherScheduleIntervalsUiEnabled/);
  assert.match(page, /TeacherWeeklyIntervalsEditor/);
  assert.match(page, /TeacherScheduleInteractiveGrid/);

  const editor = read("components/teacher/TeacherWeeklyIntervalsEditor.tsx");
  assert.match(editor, /weeklyIntervalsTitle/);
  assert.match(editor, /weeklyIntervalsOverlap/);
  assert.match(editor, /teacher-weekly-intervals-save/);
});

test("slots route and booking create use interval guards when enabled", () => {
  const slots = read("app/api/teachers/[id]/slots/route.ts");
  const bookable = read("lib/bookings/bookableSlotsForDay.ts");
  assert.match(slots, /generateBookableSlotsForTeacherDay/);
  assert.match(bookable, /generateSlotsFromWeeklyIntervals/);
  assert.match(bookable, /shouldUsePreciseIntervalsForBooking/);
  assert.match(slots, /hasWeeklyIntervals/);

  const create = read("lib/bookings/createPendingPaymentBooking.ts");
  assert.match(create, /rejectIfOutsideWeeklyIntervals/);

  const redeem = read("lib/offers/packageRedemptions.ts");
  assert.match(redeem, /rejectIfOutsideWeeklyIntervals/);
  assert.match(redeem, /slot_outside_teacher_availability/);

  const modal = read("components/BookingModal.tsx");
  assert.match(modal, /slot_outside_teacher_availability/);
  assert.match(modal, /bookingSlotOutsideAvailability/);
  assert.match(modal, /bookingNoPreciseAvailability/);
});

test("env example documents dual flags", () => {
  const env = read(".env.example");
  assert.match(env, new RegExp(TEACHER_SCHEDULE_INTERVALS_FLAG));
  assert.match(env, new RegExp(TEACHER_SCHEDULE_INTERVALS_UI_FLAG));
});

test("no Stripe checkout amount or package balance mutation files changed by this feature scope", () => {
  // Smoke: critical payment files still exist; this suite asserts wiring, not git diff.
  assert.equal(existsSync(join(ROOT, "app/api/stripe/checkout/route.ts")), true);
  assert.equal(existsSync(join(ROOT, "lib/offers/packageEntitlements.ts")), true);
  const create = read("lib/bookings/createPendingPaymentBooking.ts");
  assert.doesNotMatch(create, /commission_rate|payout_amount|refund_amount/);
});

async function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`ok - ${t.name}`);
    } catch (e) {
      failed += 1;
      console.error(`not ok - ${t.name}`);
      console.error(e);
    }
  }
  if (prevFlag === undefined) delete process.env[TEACHER_SCHEDULE_INTERVALS_FLAG];
  else process.env[TEACHER_SCHEDULE_INTERVALS_FLAG] = prevFlag;
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log(`\n${tests.length} test(s) passed`);
}

void run();
