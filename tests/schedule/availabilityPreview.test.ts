/**
 * Teacher availability booking preview — shared slot source + flags + wiring.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AVAILABILITY_PREVIEW_DAY_OPTIONS,
  AVAILABILITY_PREVIEW_DURATION_OPTIONS,
  isTeacherAvailabilityPreviewEnabled,
  isTeacherAvailabilityPreviewUiEnabled,
  parseAvailabilityPreviewQuery,
  TEACHER_AVAILABILITY_PREVIEW_FLAG,
  TEACHER_AVAILABILITY_PREVIEW_UI_FLAG,
} from "../../lib/bookings/availabilityPreview";
import {
  addLocalISODays,
  generateBookableSlotsForTeacherDay,
  mapDbRowsToNormalized,
} from "../../lib/bookings/bookableSlotsForDay";
import { generateSlotsFromWeeklyIntervals } from "../../lib/schedule/weeklyIntervals";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const prevServer = process.env.ENABLE_TEACHER_AVAILABILITY_PREVIEW;
const prevUi = process.env.NEXT_PUBLIC_ENABLE_TEACHER_AVAILABILITY_PREVIEW;
const prevPrecise = process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING;
const prevIntervals = process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
const prevExceptions = process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;

test("preview flags default OFF", () => {
  delete process.env.ENABLE_TEACHER_AVAILABILITY_PREVIEW;
  delete process.env.NEXT_PUBLIC_ENABLE_TEACHER_AVAILABILITY_PREVIEW;
  assert.equal(isTeacherAvailabilityPreviewEnabled(), false);
  assert.equal(isTeacherAvailabilityPreviewUiEnabled(), false);
  assert.equal(TEACHER_AVAILABILITY_PREVIEW_FLAG, "ENABLE_TEACHER_AVAILABILITY_PREVIEW");
  assert.equal(TEACHER_AVAILABILITY_PREVIEW_UI_FLAG, "NEXT_PUBLIC_ENABLE_TEACHER_AVAILABILITY_PREVIEW");
});

test("parseAvailabilityPreviewQuery defaults and validates", () => {
  const ok = parseAvailabilityPreviewQuery({
    startDate: null,
    days: null,
    durationMinutes: null,
    teacherDefaultDuration: 60,
    today: "2099-01-05",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.startDate, "2099-01-05");
    assert.equal(ok.days, 14);
    assert.equal(ok.durationMinutes, 60);
  }

  const badDays = parseAvailabilityPreviewQuery({
    startDate: "2099-01-05",
    days: "21",
    durationMinutes: "60",
    teacherDefaultDuration: 60,
    today: "2099-01-05",
  });
  assert.equal(badDays.ok, false);

  const past = parseAvailabilityPreviewQuery({
    startDate: "2099-01-01",
    days: "14",
    durationMinutes: "60",
    teacherDefaultDuration: 60,
    today: "2099-01-05",
  });
  assert.equal(past.ok, false);
});

test("preview duration/range options match product controls", () => {
  assert.deepEqual([...AVAILABILITY_PREVIEW_DURATION_OPTIONS], [30, 45, 60, 90, 120]);
  assert.deepEqual([...AVAILABILITY_PREVIEW_DAY_OPTIONS], [7, 14, 30]);
});

test("precise intervals: fit slots only; reject end-outside and gap spans", () => {
  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "true";
  delete process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
  delete process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;

  const intervals = mapDbRowsToNormalized([
    { day_of_week: 1, start_time: "09:00:00", end_time: "11:00:00", is_active: true },
  ]);
  // Monday 2099-01-05
  const day = generateBookableSlotsForTeacherDay({
    date: "2099-01-05",
    durationMinutes: 60,
    teacher: { schedule_mode: "precise_intervals", available_from_date: null },
    weeklyIntervals: intervals,
    exceptions: [],
    bookedSlots: [],
    bookedIntervals: [],
    blockedDayRows: [],
    now: new Date("2099-01-01T12:00:00"),
    preciseBookingEnabled: true,
  });

  assert.equal(day.source, "precise_intervals");
  assert.ok(day.slots.includes("9h00"));
  assert.ok(day.slots.includes("9h15") || day.slots.includes("10h00"));
  assert.ok(!day.slots.includes("10h30")); // ends 11:30 outside
  assert.ok(!day.slots.includes("11h00"));

  const gapIntervals = mapDbRowsToNormalized([
    { day_of_week: 1, start_time: "09:00:00", end_time: "10:00:00", is_active: true },
    { day_of_week: 1, start_time: "10:30:00", end_time: "11:30:00", is_active: true },
  ]);
  const fromHelper = generateSlotsFromWeeklyIntervals(1, gapIntervals, 60, [], [], []);
  assert.ok(!fromHelper.includes("9h30"));
});

test("available_from_date blocks before interval reasons", () => {
  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "true";
  const day = generateBookableSlotsForTeacherDay({
    date: "2099-01-05",
    durationMinutes: 60,
    teacher: {
      schedule_mode: "precise_intervals",
      available_from_date: "2099-02-01",
    },
    weeklyIntervals: mapDbRowsToNormalized([
      { day_of_week: 1, start_time: "09:00:00", end_time: "11:00:00", is_active: true },
    ]),
    exceptions: [],
    bookedSlots: [],
    bookedIntervals: [],
    blockedDayRows: [],
    now: new Date("2099-01-01T12:00:00"),
    preciseBookingEnabled: true,
  });
  assert.deepEqual(day.blockedReasons, ["before_available_from"]);
  assert.equal(day.slots.length, 0);
});

test("legacy mode with precise booking ON surfaces precise_not_active when empty", () => {
  const day = generateBookableSlotsForTeacherDay({
    date: "2099-01-05",
    durationMinutes: 60,
    teacher: {
      schedule_mode: "legacy_blocks",
      availability: [],
      available_from_date: null,
    },
    weeklyIntervals: [],
    exceptions: [],
    bookedSlots: [],
    bookedIntervals: [],
    blockedDayRows: [],
    now: new Date("2099-01-01T12:00:00"),
    preciseBookingEnabled: true,
  });
  assert.equal(day.source, "legacy_blocks");
  assert.ok(day.blockedReasons.includes("precise_not_active"));
});

test("addLocalISODays stays on calendar dates", () => {
  assert.equal(addLocalISODays("2099-01-05", 1), "2099-01-06");
  assert.equal(addLocalISODays("2099-01-31", 1), "2099-02-01");
});

test("slots API and preview share generateBookableSlotsForTeacherDay", () => {
  const slots = read("app/api/teachers/[id]/slots/route.ts");
  const preview = read("lib/bookings/availabilityPreview.ts");
  const route = read("app/api/teacher/schedule/availability-preview/route.ts");
  assert.match(slots, /generateBookableSlotsForTeacherDay/);
  assert.match(preview, /generateBookableSlotsForTeacherDay/);
  assert.match(route, /computeTeacherAvailabilityPreview/);
  assert.match(route, /isTeacherAvailabilityPreviewEnabled/);
  assert.match(route, /teacher_required/);
  assert.doesNotMatch(route, /\.insert\(|checkout\.sessions|redeem_package/);
  assert.doesNotMatch(preview, /\.insert\(|checkout\.sessions|commission|refund/);
});

test("Horaire mounts preview behind UI flag; dirty save message wired", () => {
  const page = read("app/(app)/teacher/schedule/page.tsx");
  const ui = read("components/teacher/TeacherAvailabilityPreview.tsx");
  assert.match(page, /TeacherAvailabilityPreview/);
  assert.match(page, /scheduleDirty=\{pageDirty\}/);
  assert.match(ui, /isTeacherAvailabilityPreviewUiEnabled/);
  assert.match(ui, /availabilityPreviewDirtyMessage/);
  assert.match(ui, /availabilityPreviewPaymentWarning/);
  assert.doesNotMatch(ui, /feature_disabled|slot_outside_teacher_availability/);
});

test("i18n FR/EN/ES preview keys; no legacy/debug copy", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const json = read(`lib/i18n/locales/${locale}.json`);
    assert.match(json, /"availabilityPreviewTitle"/);
    assert.match(json, /"availabilityPreviewReasonBeforeStart"/);
    assert.match(json, /"availabilityPreviewPaymentWarning"/);
  }
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Aperçu des réservations/);
  assert.match(fr, /Enregistrez vos modifications pour mettre à jour l’aperçu/);
  assert.doesNotMatch(fr, /Mode grilles héritées|Debug|Backend|Raw availability/);
});

test("env example documents preview flags", () => {
  const env = read(".env.example");
  assert.match(env, /ENABLE_TEACHER_AVAILABILITY_PREVIEW/);
  assert.match(env, /NEXT_PUBLIC_ENABLE_TEACHER_AVAILABILITY_PREVIEW/);
});

test("no Stripe/checkout/commission/package mutation in preview files", () => {
  for (const file of [
    "lib/bookings/availabilityPreview.ts",
    "lib/bookings/bookableSlotsForDay.ts",
    "app/api/teacher/schedule/availability-preview/route.ts",
    "components/teacher/TeacherAvailabilityPreview.tsx",
  ]) {
    const src = read(file);
    assert.doesNotMatch(
      src,
      /checkout\.sessions|commission_rate|payout_reversal|redeem_package_session_booking|package_entitlement_balance/,
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
    if (prevServer === undefined) delete process.env.ENABLE_TEACHER_AVAILABILITY_PREVIEW;
    else process.env.ENABLE_TEACHER_AVAILABILITY_PREVIEW = prevServer;
    if (prevUi === undefined) delete process.env.NEXT_PUBLIC_ENABLE_TEACHER_AVAILABILITY_PREVIEW;
    else process.env.NEXT_PUBLIC_ENABLE_TEACHER_AVAILABILITY_PREVIEW = prevUi;
    if (prevPrecise === undefined) delete process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING;
    else process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = prevPrecise;
    if (prevIntervals === undefined) delete process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS;
    else process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS = prevIntervals;
    if (prevExceptions === undefined) delete process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS;
    else process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS = prevExceptions;
  }
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log(`\n[schedule:availability-preview] ${tests.length} assertions passed.`);
}

void run();
