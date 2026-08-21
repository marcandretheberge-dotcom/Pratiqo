/**
 * Precise schedule booking enforcement — create + package-credit rejection
 * (runtime mocks; no Stripe / package balance mutation on invalid slots).
 *
 * Prerequisite: migrations 108 + 112; interactive cell save already works.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPendingPaymentBooking } from "../../lib/bookings/createPendingPaymentBooking";
import type { ParsedCreateBookingRequest } from "../../lib/bookings/parseCreateBookingRequest";
import { evaluatePreciseIntervalSlotFit } from "../../lib/bookings/teacherScheduleEligibility";
import { redeemPackageSessionBooking } from "../../lib/offers/packageRedemptions";
import {
  shouldUsePreciseIntervalsForBooking,
} from "../../lib/schedule/preciseScheduleActivation";
import {
  mapDbRowsToNormalized,
  slotFitsWeeklyIntervals,
} from "../../lib/schedule/weeklyIntervals";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const prevPrecise = process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING;
const prevIntervals = process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
const prevExceptions = process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;
const prevPackage = process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING;

const TEACHER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
/** Monday — dayOfWeek 1 */
const MONDAY = "2099-01-05";

const mondayMorningInterval = {
  day_of_week: 1,
  start_time: "09:00:00",
  end_time: "11:30:00",
  is_active: true,
};

function baseRequest(overrides: Partial<ParsedCreateBookingRequest> = {}): ParsedCreateBookingRequest {
  return {
    teacherId: TEACHER_ID,
    date: MONDAY,
    time: "10h00",
    slotDate: MONDAY,
    timeSlot: "10h00",
    studentLevel: null,
    teachingMode: "online",
    lessonType: "standard",
    price: 50,
    durationMinutes: 60,
    studentAddress: null,
    learnerProfileId: null,
    teacherOfferId: null,
    ...overrides,
  };
}

function makeCreateAdmin(args: {
  scheduleMode: string;
  intervals: Array<typeof mondayMorningInterval>;
  onInsert?: () => void;
  onRpc?: () => void;
}) {
  return {
    from: (table: string) => ({
      select: (_columns: string, _opts?: unknown) => {
        const filter: {
          eq: (c: string, v: unknown) => typeof filter;
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
          then: (
            resolve: (v: {
              data: Array<Record<string, unknown>> | null;
              error: null;
            }) => unknown,
          ) => Promise<unknown>;
        } = {
          eq: () => filter,
          maybeSingle: async () => {
            if (table === "teachers") {
              return {
                data: {
                  id: TEACHER_ID,
                  available_from_date: null,
                  schedule_mode: args.scheduleMode,
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
          then: (resolve) => {
            if (table === "teacher_weekly_availability_intervals") {
              return Promise.resolve(resolve({ data: args.intervals, error: null }));
            }
            if (table === "teacher_schedule_exceptions") {
              return Promise.resolve(resolve({ data: [], error: null }));
            }
            return Promise.resolve(resolve({ data: [], error: null }));
          },
        };
        return filter;
      },
      insert: () => {
        args.onInsert?.();
        return {
          select: () => ({
            single: async () => ({
              data: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
              error: null,
            }),
          }),
        };
      },
    }),
  };
}

test("slot fit: 09:00–11:30 allows 09:00/10:30 and rejects 08:30/11:00 for 60m", () => {
  const intervals = mapDbRowsToNormalized([mondayMorningInterval]);
  assert.equal(slotFitsWeeklyIntervals(1, 9 * 60, 60, intervals), true);
  assert.equal(slotFitsWeeklyIntervals(1, 10 * 60 + 30, 60, intervals), true);
  assert.equal(slotFitsWeeklyIntervals(1, 8 * 60 + 30, 60, intervals), false);
  assert.equal(slotFitsWeeklyIntervals(1, 11 * 60, 60, intervals), false);

  assert.equal(
    evaluatePreciseIntervalSlotFit({
      slotDate: MONDAY,
      timeSlot: "11h00",
      durationMinutes: 60,
      intervals,
    }).allowed,
    false,
  );
  assert.equal(
    evaluatePreciseIntervalSlotFit({
      slotDate: MONDAY,
      timeSlot: "10h30",
      durationMinutes: 60,
      intervals,
    }).allowed,
    true,
  );
});

test("slot spanning two intervals is rejected", () => {
  const intervals = mapDbRowsToNormalized([
    { day_of_week: 1, start_time: "09:00:00", end_time: "11:00:00", is_active: true },
    { day_of_week: 1, start_time: "13:00:00", end_time: "16:00:00", is_active: true },
  ]);
  // 10:30–11:30 would end past first interval and not fit second
  assert.equal(slotFitsWeeklyIntervals(1, 10 * 60 + 30, 60, intervals), false);
});

test("precise booking flag ON: legacy teacher skips interval enforcement", () => {
  assert.equal(
    shouldUsePreciseIntervalsForBooking({
      scheduleMode: "legacy_blocks",
      preciseBookingEnabled: true,
      intervalsServerEnabled: true,
    }),
    false,
  );
});

test("createPendingPaymentBooking rejects outside interval and does not insert", async () => {
  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "true";
  delete process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
  delete process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;

  let inserted = false;
  const admin = makeCreateAdmin({
    scheduleMode: "precise_intervals",
    intervals: [mondayMorningInterval],
    onInsert: () => {
      inserted = true;
    },
  });

  const result = await createPendingPaymentBooking({
    admin: admin as never,
    studentId: STUDENT_ID,
    request: baseRequest({ time: "11h00", timeSlot: "11h00" }),
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "slot_outside_teacher_availability");
    assert.equal(result.status, 409);
  }
  assert.equal(inserted, false);
});

test("createPendingPaymentBooking allows slot fully inside interval", async () => {
  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "true";
  delete process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
  delete process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;

  let inserted = false;
  const admin = makeCreateAdmin({
    scheduleMode: "precise_intervals",
    intervals: [mondayMorningInterval],
    onInsert: () => {
      inserted = true;
    },
  });

  const result = await createPendingPaymentBooking({
    admin: admin as never,
    studentId: STUDENT_ID,
    request: baseRequest({ time: "10h30", timeSlot: "10h30" }),
  });
  assert.equal(result.ok, true);
  assert.equal(inserted, true);
});

test("createPendingPaymentBooking: available_from_date checked before interval errors", async () => {
  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "true";
  delete process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;

  let intervalsQueried = false;
  const admin = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === "teachers") {
              return {
                data: {
                  id: TEACHER_ID,
                  available_from_date: "2099-02-01",
                  schedule_mode: "precise_intervals",
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
          then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
            if (table === "teacher_weekly_availability_intervals") {
              intervalsQueried = true;
            }
            return Promise.resolve(resolve({ data: [], error: null }));
          },
        }),
      }),
      insert: () => {
        throw new Error("should not insert");
      },
    }),
  };

  const result = await createPendingPaymentBooking({
    admin: admin as never,
    studentId: STUDENT_ID,
    request: baseRequest({ slotDate: MONDAY, date: MONDAY, timeSlot: "10:00" }),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "teacher_not_available_yet");
  assert.equal(intervalsQueried, false);
});

test("package redeem rejects outside interval and does not call RPC", async () => {
  process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING = "true";
  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "true";
  delete process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;

  let rpcCalled = false;
  const result = await redeemPackageSessionBooking({
    admin: {
      rpc: async () => {
        rpcCalled = true;
        return { data: null, error: null };
      },
      from: (table: string) => ({
        select: () => {
          const filter: {
            eq: () => typeof filter;
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
            then: (
              resolve: (v: { data: Array<Record<string, unknown>> | null; error: null }) => unknown,
            ) => Promise<unknown>;
          } = {
            eq: () => filter,
            maybeSingle: async () => {
              if (table === "package_entitlements") {
                return {
                  data: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", teacher_id: TEACHER_ID },
                  error: null,
                };
              }
              if (table === "teachers") {
                return {
                  data: {
                    id: TEACHER_ID,
                    available_from_date: null,
                    schedule_mode: "precise_intervals",
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            },
            then: (resolve) => {
              if (table === "teacher_weekly_availability_intervals") {
                return Promise.resolve(resolve({ data: [mondayMorningInterval], error: null }));
              }
              return Promise.resolve(resolve({ data: [], error: null }));
            },
          };
          return filter;
        },
      }),
    },
    entitlementId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    studentId: STUDENT_ID,
    request: {
      clientRequestId: "req-12345678",
      slotDate: MONDAY,
      timeSlot: "11h00",
      teachingMode: "online",
      studentLevel: null,
      studentAddress: null,
      learnerProfileId: null,
      durationMinutes: 60,
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "slot_outside_teacher_availability");
  assert.equal(rpcCalled, false);
});

test("BookingModal + status UI wired for precise booking copy", () => {
  const modal = read("components/BookingModal.tsx");
  assert.match(modal, /slot_outside_teacher_availability/);
  assert.match(modal, /bookingSlotOutsideAvailability/);
  assert.match(modal, /bookingNoSlotsForDayTitle/);

  const status = read("components/teacher/TeacherScheduleStatus.tsx");
  assert.match(status, /schedulePreciseGeneralTitle/);
  assert.match(status, /schedulePreciseReadyTitle/);
  assert.match(status, /schedulePreciseActiveTitle/);
  assert.match(status, /activate-precise/);

  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Horaire général actif/);
  assert.match(fr, /Horaire précis actif/);
  assert.doesNotMatch(fr, /Mode grilles héritées/);
});

test("no Stripe/commission/package balance mutation in enforcement modules", () => {
  for (const file of [
    "lib/bookings/teacherScheduleEligibility.ts",
    "lib/bookings/weeklyIntervalGuard.ts",
    "lib/schedule/preciseScheduleActivation.ts",
    "components/teacher/TeacherScheduleStatus.tsx",
  ]) {
    const src = read(file);
    assert.doesNotMatch(
      src,
      /checkout\.sessions|commission_rate|payout_reversal|package_entitlement_balance/,
    );
  }
});

async function run() {
  let failed = 0;
  try {
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
  } finally {
    if (prevPrecise === undefined) delete process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING;
    else process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = prevPrecise;
    if (prevIntervals === undefined) delete process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
    else process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS = prevIntervals;
    if (prevExceptions === undefined) delete process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;
    else process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS = prevExceptions;
    if (prevPackage === undefined) delete process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING;
    else process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING = prevPackage;
  }
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log(`\n[schedule:precise-booking-enforcement] ${tests.length} assertions passed.`);
}

void run();
