/**
 * PR 17B — teacher schedule date exceptions.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateSlotsFromDateException,
  isTeacherScheduleExceptionsEnabled,
  normalizeScheduleException,
  slotFitsCustomExceptionHours,
  TEACHER_SCHEDULE_EXCEPTIONS_FLAG,
  TEACHER_SCHEDULE_EXCEPTIONS_UI_FLAG,
  toPublicExceptionSummary,
} from "../../lib/schedule/dateExceptions";
import { applyDateExceptionToBooking } from "../../lib/bookings/dateExceptionGuard";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const prev = process.env[TEACHER_SCHEDULE_EXCEPTIONS_FLAG];

test("migration 110 creates exceptions table with RLS and one active exception per date", () => {
  assert.equal(existsSync(join(ROOT, "supabase/migrations/110_teacher_schedule_exceptions.sql")), true);
  const sql = read("supabase/migrations/110_teacher_schedule_exceptions.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.teacher_schedule_exceptions/i);
  assert.match(sql, /unavailable_full_day/);
  assert.match(sql, /available_custom_hours/);
  assert.match(sql, /teacher_schedule_exceptions_unique_active_date_idx/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /teacher_schedule_exceptions_select_own/);
  assert.match(sql, /never expose to learners/i);
  assert.equal(existsSync(join(ROOT, "supabase/migrations/111_harden_teacher_schedule_exceptions_rls.sql")), true);
});

test("feature flag defaults OFF", () => {
  delete process.env[TEACHER_SCHEDULE_EXCEPTIONS_FLAG];
  assert.equal(isTeacherScheduleExceptionsEnabled(), false);
});

test("full-day exception requires null start/end", () => {
  assert.equal(
    normalizeScheduleException({
      exceptionDate: "2099-09-07",
      exceptionType: "unavailable_full_day",
      startTime: "09:00",
      endTime: "10:00",
    }).ok,
    false,
  );
  assert.equal(
    normalizeScheduleException({
      exceptionDate: "2099-09-07",
      exceptionType: "unavailable_full_day",
    }).ok,
    true,
  );
});

test("custom-hours exception validates times and rejects overnight", () => {
  assert.equal(
    normalizeScheduleException({
      exceptionDate: "2099-09-07",
      exceptionType: "available_custom_hours",
    }).ok,
    false,
  );
  assert.equal(
    normalizeScheduleException({
      exceptionDate: "2099-09-07",
      exceptionType: "available_custom_hours",
      startTime: "18:00",
      endTime: "10:00",
    }).ok,
    false,
  );
  const ok = normalizeScheduleException({
    exceptionDate: "2099-09-07",
    exceptionType: "available_custom_hours",
    startTime: "18:00",
    endTime: "20:00",
  });
  assert.equal(ok.ok, true);
});

test("custom hours slot fitting and slot generation", () => {
  const ok = normalizeScheduleException({
    exceptionDate: "2099-09-07",
    exceptionType: "available_custom_hours",
    startTime: "18:00",
    endTime: "20:00",
  });
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(slotFitsCustomExceptionHours(18 * 60 + 30, 60, ok.value), true);
  assert.equal(slotFitsCustomExceptionHours(10 * 60, 60, ok.value), false);
  assert.equal(slotFitsCustomExceptionHours(19 * 60 + 30, 60, ok.value), false);
  const slots = generateSlotsFromDateException(ok.value, 60, [], [], []);
  assert.ok(slots.includes("18h00"));
  assert.ok(slots.includes("18h30"));
  assert.ok(slots.includes("19h00"));
  assert.equal(slots.includes("19h30"), false);
});

test("public summary omits private note", () => {
  const ok = normalizeScheduleException({
    exceptionDate: "2099-09-07",
    exceptionType: "unavailable_full_day",
    note: "Vacances personnelles",
  });
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  const pub = toPublicExceptionSummary(ok.value);
  assert.equal("note" in pub, false);
});

test("booking guard no-op when flag OFF", async () => {
  delete process.env[TEACHER_SCHEDULE_EXCEPTIONS_FLAG];
  const result = await applyDateExceptionToBooking({
    admin: {
      from: () => {
        throw new Error("should not load exceptions when flag OFF");
      },
    },
    teacherId: "t1",
    slotDate: "2099-09-07",
    timeSlot: "10h00",
    durationMinutes: 60,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.skipWeeklyIntervals, false);
});

test("booking guard blocks full-day and applies custom hours", async () => {
  process.env[TEACHER_SCHEDULE_EXCEPTIONS_FLAG] = "true";

  const fullDayAdmin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    exception_date: "2099-09-07",
                    exception_type: "unavailable_full_day",
                    start_time: null,
                    end_time: null,
                    is_active: true,
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    }),
  };
  const blocked = await applyDateExceptionToBooking({
    admin: fullDayAdmin,
    teacherId: "t1",
    slotDate: "2099-09-07",
    timeSlot: "10h00",
    durationMinutes: 60,
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.error, "teacher_unavailable_on_date");

  const customAdmin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    exception_date: "2099-09-07",
                    exception_type: "available_custom_hours",
                    start_time: "18:00:00",
                    end_time: "20:00:00",
                    is_active: true,
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    }),
  };
  const outside = await applyDateExceptionToBooking({
    admin: customAdmin,
    teacherId: "t1",
    slotDate: "2099-09-07",
    timeSlot: "10h00",
    durationMinutes: 60,
  });
  assert.equal(outside.ok, false);
  if (!outside.ok) assert.equal(outside.error, "slot_outside_teacher_exception_hours");

  const inside = await applyDateExceptionToBooking({
    admin: customAdmin,
    teacherId: "t1",
    slotDate: "2099-09-07",
    timeSlot: "18h30",
    durationMinutes: 60,
  });
  assert.equal(inside.ok, true);
  if (inside.ok) assert.equal(inside.skipWeeklyIntervals, true);
});

test("API UI and booking wiring", () => {
  const api = read("app/api/teacher/schedule-exceptions/route.ts");
  assert.match(api, /isTeacherScheduleExceptionsEnabled/);
  assert.match(api, /normalizeScheduleException/);

  const page = read("app/(app)/teacher/schedule/page.tsx");
  assert.match(page, /TeacherScheduleExceptionsEditor/);
  assert.match(page, /isTeacherScheduleExceptionsUiEnabled/);

  const editor = read("components/teacher/TeacherScheduleExceptionsEditor.tsx");
  assert.match(editor, /scheduleExceptionsTitle/);
  assert.match(editor, /scheduleExceptionsPrivateNotePrivacy/);

  const create = read("lib/bookings/createPendingPaymentBooking.ts");
  assert.match(create, /applyDateExceptionToBooking/);
  assert.match(create, /skipWeeklyIntervals/);

  const redeem = read("lib/offers/packageRedemptions.ts");
  assert.match(redeem, /applyDateExceptionToBooking/);

  const slots = read("app/api/teachers/[id]/slots/route.ts");
  assert.match(slots, /generateSlotsFromDateException/);
  assert.match(slots, /unavailable_full_day/);

  const modal = read("components/BookingModal.tsx");
  assert.match(modal, /teacher_unavailable_on_date/);
  assert.match(modal, /bookingTeacherUnavailableOnDate/);

  const env = read(".env.example");
  assert.match(env, new RegExp(TEACHER_SCHEDULE_EXCEPTIONS_FLAG));
  assert.match(env, new RegExp(TEACHER_SCHEDULE_EXCEPTIONS_UI_FLAG));
});

test("no Stripe/checkout amount mutation surfaces in this feature", () => {
  assert.equal(existsSync(join(ROOT, "app/api/stripe/checkout/route.ts")), true);
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
  if (prev === undefined) delete process.env[TEACHER_SCHEDULE_EXCEPTIONS_FLAG];
  else process.env[TEACHER_SCHEDULE_EXCEPTIONS_FLAG] = prev;
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log(`\n${tests.length} test(s) passed`);
}

void run();
