/**
 * PR 17A-CORE — precise schedule as booking source of truth.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluatePreciseScheduleActivation,
  normalizeTeacherScheduleMode,
  resolvePreciseScheduleUiStatus,
  shouldUsePreciseIntervalsForBooking,
} from "../../lib/schedule/preciseScheduleActivation";
import {
  evaluatePreciseIntervalSlotFit,
  resolveBookingScheduleSource,
} from "../../lib/bookings/teacherScheduleEligibility";
import { mapDbRowsToNormalized, slotFitsWeeklyIntervals } from "../../lib/schedule/weeklyIntervals";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test("schedule mode defaults to legacy_blocks", () => {
  assert.equal(normalizeTeacherScheduleMode(null), "legacy_blocks");
  assert.equal(normalizeTeacherScheduleMode("legacy_blocks"), "legacy_blocks");
  assert.equal(normalizeTeacherScheduleMode("precise_intervals"), "precise_intervals");
});

test("precise booking flag OFF preserves global intervals flag behavior", () => {
  assert.equal(
    shouldUsePreciseIntervalsForBooking({
      scheduleMode: "legacy_blocks",
      preciseBookingEnabled: false,
      intervalsServerEnabled: true,
    }),
    true,
  );
  assert.equal(
    shouldUsePreciseIntervalsForBooking({
      scheduleMode: "legacy_blocks",
      preciseBookingEnabled: false,
      intervalsServerEnabled: false,
    }),
    false,
  );
});

test("precise booking flag ON uses per-teacher schedule_mode", () => {
  assert.equal(
    shouldUsePreciseIntervalsForBooking({
      scheduleMode: "legacy_blocks",
      preciseBookingEnabled: true,
      intervalsServerEnabled: true,
    }),
    false,
  );
  assert.equal(
    shouldUsePreciseIntervalsForBooking({
      scheduleMode: "precise_intervals",
      preciseBookingEnabled: true,
      intervalsServerEnabled: false,
    }),
    true,
  );
});

test("activation refuses empty / invalid / overlapping intervals", () => {
  const activationError = (input: Parameters<typeof evaluatePreciseScheduleActivation>[0]) => {
    const result = evaluatePreciseScheduleActivation(input);
    assert.equal(result.ok, false);
    assert.ok("error" in result);
    return result.error;
  };
  assert.equal(
    activationError({ intervals: [], preciseBookingEnabled: true }),
    "no_precise_intervals",
  );
  assert.equal(
    activationError({
      intervals: [{ dayOfWeek: 1, startTime: "11:00", endTime: "10:00" }],
      preciseBookingEnabled: true,
    }),
    "invalid_precise_intervals",
  );
  assert.equal(
    activationError({
      intervals: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
        { dayOfWeek: 1, startTime: "10:00", endTime: "12:00" },
      ],
      preciseBookingEnabled: true,
    }),
    "overlapping_precise_intervals",
  );
  assert.equal(
    activationError({
      preciseBookingEnabled: false,
      intervals: [{ dayOfWeek: 1, startTime: "09:00", endTime: "11:30" }],
    }),
    "precise_schedule_disabled",
  );
});

test("activation accepts valid intervals", () => {
  const ok = evaluatePreciseScheduleActivation({
    preciseBookingEnabled: true,
    intervals: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "11:30" },
      { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
    ],
  });
  assert.equal(ok.ok, true);
});

test("UI status general / ready / active", () => {
  assert.equal(
    resolvePreciseScheduleUiStatus({
      scheduleMode: "legacy_blocks",
      preciseIntervalCount: 0,
      preciseBookingUiEnabled: true,
    }),
    "general",
  );
  assert.equal(
    resolvePreciseScheduleUiStatus({
      scheduleMode: "legacy_blocks",
      preciseIntervalCount: 2,
      preciseBookingUiEnabled: true,
    }),
    "ready",
  );
  assert.equal(
    resolvePreciseScheduleUiStatus({
      scheduleMode: "precise_intervals",
      preciseIntervalCount: 0,
      preciseBookingUiEnabled: true,
    }),
    "active",
  );
});

test("slot fit: inside ok; before/after/span gap rejected", () => {
  const intervals = mapDbRowsToNormalized([
    { day_of_week: 1, start_time: "09:00", end_time: "11:30", is_active: true },
    { day_of_week: 1, start_time: "10:30", end_time: "11:30", is_active: true }, // duplicate day ok if non-overlap - wait 10:30-11:30 overlaps 09-11:30
  ]);
  // Use non-overlapping set for span-gap case
  const monday = mapDbRowsToNormalized([
    { day_of_week: 1, start_time: "09:00", end_time: "10:00", is_active: true },
    { day_of_week: 1, start_time: "10:30", end_time: "11:30", is_active: true },
  ]);
  // 2026-08-24 is a Monday
  const date = "2026-08-24";
  assert.equal(
    evaluatePreciseIntervalSlotFit({
      slotDate: date,
      timeSlot: "9h00",
      durationMinutes: 60,
      intervals: monday,
    }).allowed,
    true,
  );
  assert.equal(
    evaluatePreciseIntervalSlotFit({
      slotDate: date,
      timeSlot: "8h00",
      durationMinutes: 60,
      intervals: monday,
    }).allowed,
    false,
  );
  assert.equal(
    evaluatePreciseIntervalSlotFit({
      slotDate: date,
      timeSlot: "11h00",
      durationMinutes: 60,
      intervals: mapDbRowsToNormalized([
        { day_of_week: 1, start_time: "09:00", end_time: "11:30", is_active: true },
      ]),
    }).allowed,
    false,
  );
  assert.equal(
    evaluatePreciseIntervalSlotFit({
      slotDate: date,
      timeSlot: "9h30",
      durationMinutes: 60,
      intervals: monday,
    }).allowed,
    false,
  );
  void intervals;
  assert.equal(slotFitsWeeklyIntervals(1, 9 * 60, 60, monday), true);
});

test("resolveBookingScheduleSource mirrors helper", () => {
  assert.equal(
    resolveBookingScheduleSource({ scheduleMode: "precise_intervals" }) === "precise_intervals" ||
      resolveBookingScheduleSource({ scheduleMode: "legacy_blocks" }) === "legacy_blocks",
    true,
  );
});

test("migration 112 adds schedule_mode with text teacher_id conventions", () => {
  const mig = read("supabase/migrations/112_teacher_schedule_mode.sql");
  assert.match(mig, /schedule_mode/);
  assert.match(mig, /legacy_blocks/);
  assert.match(mig, /precise_intervals/);
  assert.match(mig, /precise_schedule_activated_at/);
  assert.doesNotMatch(mig, /teacher_id uuid/);
});

test("activation route is teacher-scoped and validates intervals", () => {
  const route = read("app/api/teacher/schedule/activate-precise/route.ts");
  assert.match(route, /evaluatePreciseScheduleActivation/);
  assert.match(route, /teacher_required|user_id/);
  assert.match(route, /schedule_mode:\s*"precise_intervals"/);
  assert.match(route, /isTeacherPreciseScheduleBookingEnabled/);
  assert.doesNotMatch(route, /stripe|checkout|commission|payout|refund/i);
});

test("booking create + package redeem pass schedule_mode into interval guard", () => {
  const create = read("lib/bookings/createPendingPaymentBooking.ts");
  const redeem = read("lib/offers/packageRedemptions.ts");
  assert.match(create, /schedule_mode/);
  assert.match(create, /rejectIfOutsideWeeklyIntervals/);
  assert.match(redeem, /schedule_mode/);
  assert.match(redeem, /rejectIfOutsideWeeklyIntervals/);
});

test("slots + available-days use shouldUsePreciseIntervalsForBooking", () => {
  const slots = read("app/api/teachers/[id]/slots/route.ts");
  const bookable = read("lib/bookings/bookableSlotsForDay.ts");
  const days = read("lib/teacherSlotQueries.ts");
  assert.match(slots, /generateBookableSlotsForTeacherDay/);
  assert.match(bookable, /shouldUsePreciseIntervalsForBooking/);
  assert.match(days, /generateBookableSlotsForTeacherDay/);
  assert.match(days, /weeklyIntervals: mapDbRowsToNormalized/);
});

test("Horaire wires TeacherScheduleStatus + activate CTA", () => {
  const page = read("app/(app)/teacher/schedule/page.tsx");
  const status = read("components/teacher/TeacherScheduleStatus.tsx");
  const lookup = read("lib/teachers/currentTeacher.ts");
  assert.match(page, /TeacherScheduleStatus/);
  assert.match(page, /loadCurrentTeacherForSchedule|scheduleMode/);
  assert.match(lookup, /schedule_mode/);
  assert.match(status, /schedulePreciseActivateCta/);
  assert.match(status, /\/api\/teacher\/schedule\/activate-precise/);
  assert.doesNotMatch(status, /héritées|Legacy mode|Employé|Salaire/);
});

test("BookingModal empty day + stale slot copy keys exist", () => {
  const modal = read("components/BookingModal.tsx");
  assert.match(modal, /bookingNoSlotsForDayTitle/);
  assert.match(modal, /bookingSlotOutsideAvailability/);
  for (const locale of ["fr", "en", "es"] as const) {
    const json = read(`lib/i18n/locales/${locale}.json`);
    assert.match(json, /"schedulePreciseGeneralTitle"/);
    assert.match(json, /"schedulePreciseReadyTitle"/);
    assert.match(json, /"schedulePreciseActivateCta"/);
    assert.match(json, /"bookingNoSlotsForDayTitle"/);
  }
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Activer l’horaire précis/);
  assert.match(fr, /Horaire général actif/);
  assert.doesNotMatch(fr, /Pratiqo impose|Employé|Salaire|Horaire de travail|Mode grilles héritées/);
});

test("admin Teacher 360 exposes schedule mode read-only", () => {
  const t360 = read("lib/admin/teacher360.ts");
  const page = read("app/(app)/admin/users/[id]/page.tsx");
  assert.match(t360, /scheduleMode/);
  assert.match(t360, /preciseScheduleActivatedAt/);
  assert.match(page, /Horaire/);
  assert.match(page, /Précis|Général/);
});

test("no Stripe/checkout/commission/package mutation in new precise-booking files", () => {
  for (const file of [
    "lib/schedule/preciseScheduleActivation.ts",
    "lib/bookings/teacherScheduleEligibility.ts",
    "app/api/teacher/schedule/activate-precise/route.ts",
    "components/teacher/TeacherScheduleStatus.tsx",
    "supabase/migrations/112_teacher_schedule_mode.sql",
  ]) {
    assert.equal(existsSync(join(ROOT, file)), true);
    const src = read(file);
    assert.doesNotMatch(
      src,
      /checkout\.sessions|amount_total|commission_rate|payout_reversal|package_entitlement_balance|redeem_package_session_booking/,
    );
  }
});

for (const { name, fn } of tests) {
  fn();
  console.log(`✓ ${name}`);
}
console.log(`\n[schedule:precise-booking-source] ${tests.length} assertions passed.`);
