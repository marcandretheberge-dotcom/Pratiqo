import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTeacherListingBookability, getTeacherListingCapabilities, hasListingBookingPrerequisites } from "@/lib/teachers/listingBookability";
import { applyTeacherListingMetadata } from "@/lib/teacherListingMetadata";
import type { Teacher } from "@/types";

const teacher = {
  id: "teacher", price_per_lesson: 45,
  stripe_account_id: "acct_test", stripe_connect_onboarding_complete: true,
  stripe_connect_charges_enabled: true, stripe_connect_payouts_enabled: true,
  stripe_connect_requirements_due: [], stripe_connect_disabled_reason: null,
  availability: ["Lun Matin"], schedule_mode: "legacy_blocks", default_lesson_duration_minutes: 60,
};
const now = new Date("2026-10-05T16:00:00Z");
type Row = Record<string, unknown>;
function db(tables: Record<string, Row[]>, fail?: string, truncate?: string) {
  const reads: string[] = [];
  const client = { from(table: string) {
    reads.push(table);
    const query = {
      select() { return query; }, in() { return query; }, eq() { return query; },
      gte() { return query; }, lte() { return query; }, gt() { return query; }, lt() { return query; },
      then(resolve: (value: unknown) => unknown) {
        const data = tables[table] ?? [];
        return Promise.resolve(resolve({ data, error: fail === table ? { message: "test" } : null, count: data.length + Number(truncate === table) }));
      },
    };
    return query;
  } } as unknown as SupabaseClient;
  return { client, reads };
}

async function run() {
  process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS = "false";
  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "false";
  process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS = "false";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  assert.equal(hasListingBookingPrerequisites(teacher), true);
  for (const patch of [
    { stripe_account_id: null }, { stripe_connect_onboarding_complete: false },
    { stripe_connect_charges_enabled: false }, { stripe_connect_payouts_enabled: false },
    { stripe_connect_requirements_due: ["due"] }, { stripe_connect_disabled_reason: "restricted" },
    { price_per_lesson: 0 }, { price_per_lesson: "invalid" },
  ]) assert.equal(hasListingBookingPrerequisites({ ...teacher, ...patch }), false);

  const check = async (row: Row, tables: Record<string, Row[]> = {}, fail?: string, truncate?: string) => {
    const mock = db({ teachers: [row], ...tables }, fail, truncate);
    const result = await getTeacherListingBookability(mock.client, ["teacher"], now);
    assert.ok(mock.reads.length <= 7, "queries are batched, not per teacher/day");
    return result.teacher;
  };
  assert.equal(await check(teacher), true);
  const availabilityDb = db({ teachers: [teacher] });
  assert.equal((await getTeacherListingBookability(availabilityDb.client, ["teacher"], now, "weekday_evening")).teacher, false);
  assert.equal((await getTeacherListingBookability(availabilityDb.client, ["teacher"], now, "weekday_day")).teacher, true);
  assert.equal(await check({ ...teacher, availability: ["Dim Matin"], available_from_date: "2026-11-01" }), true, "last day of 28-day window is included");
  assert.equal(await check({ ...teacher, availability: ["Lun Matin"], available_from_date: "2026-11-02" }), false, "next day is outside the window");
  assert.equal(await check({ ...teacher, availability: [] }), false);
  assert.equal(await check({ ...teacher, available_from_date: "2027-01-01" }), false);
  assert.equal(await check({ ...teacher, stripe_connect_payouts_enabled: false }), false);
  const dates = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"];
  assert.equal(await check(teacher, { blocked_slots: dates.map((blocked_date) => ({ teacher_id: "teacher", blocked_date, period: "all" })) }), false);
  assert.equal(await check(teacher, { bookings: dates.flatMap((slot_date) => ["8h00", "9h00", "10h00", "11h00"].map((time_slot) => ({ teacher_id: "teacher", slot_date, time_slot, duration_minutes: 60 }))) }), false);
  assert.equal(await check(teacher, {}, "bookings"), null);
  assert.equal(await check(teacher, {}, undefined, "bookings"), null);
  const empty = db({});
  assert.deepEqual(await getTeacherListingBookability(empty.client, [], now), {});
  assert.equal(empty.reads.length, 0);

  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  assert.equal(await check(teacher, { planned_package_session_holds: dates.map((date) => ({
    teacher_id: "teacher", starts_at: `${date}T12:00:00Z`, ends_at: `${date}T16:00:00Z`,
  })) }), false);
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS = "true";
  assert.equal(await check(teacher, { teacher_schedule_exceptions: dates.map((exception_date) => ({
    teacher_id: "teacher", exception_date, exception_type: "unavailable_full_day", is_active: true,
  })) }), false);
  process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS = "false";

  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "true";
  assert.equal(await check({ ...teacher, schedule_mode: "precise_intervals" }), false);
  assert.equal(await check({ ...teacher, availability: [], schedule_mode: "precise_intervals" }, {
    teacher_weekly_availability_intervals: [{ teacher_id: "teacher", day_of_week: 1, start_time: "09:00", end_time: "12:00", is_active: true }],
  }), true);
  assert.equal(await check({ ...teacher, teaching_mode: "home", home_lesson_min_duration: 120, schedule_mode: "precise_intervals" }, {
    teacher_weekly_availability_intervals: [{ teacher_id: "teacher", day_of_week: 1, start_time: "09:00", end_time: "10:00", is_active: true }],
  }), false);

  const mapped = applyTeacherListingMetadata([{ id: "teacher", imageUrl: "" } as Teacher], { bookingReadiness: { teacher: true } });
  assert.equal(mapped[0].bookingReady, true);
  assert.equal(applyTeacherListingMetadata(mapped, {}).length, 1);
  assert.equal(applyTeacherListingMetadata(mapped, {})[0].bookingReady, null);
  for (const file of ["components/marketing/LandingTeacherListingCard.tsx", "app/(app)/student/search/page.tsx", "components/SearchMapView.tsx", "components/Explore.tsx"]) {
    assert.ok(readFileSync(file, "utf8").includes("<TeacherBookingReadiness teacher={teacher}"), file);
  }
  assert.ok(!readFileSync("components/Explore.tsx", "utf8").includes("compareExploreTeachers"));
  const api = readFileSync("app/api/teachers/plans/route.ts", "utf8");
  assert.match(api, /from\(TEACHERS_PUBLIC_TABLE\)[\s\S]*?\.select\("id, user_id, discipline, category"\)/);
  assert.match(api, /discipline: row\.discipline/);
  assert.match(api, /getTeacherListingCapabilities\(admin, eligibleTeacherIds\)/);
  assert.match(api, /state\.action === "book"/);
  process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING = "false";
  for (const [patch, action] of [
    [{}, "book"],
    [{ stripe_connect_payouts_enabled: false }, "request"],
    [{ availability: [] }, "contact"],
    [{ availability: [], user_id: null }, "waitlist"],
  ] as const) {
    const mock = db({ teachers: [{ ...teacher, user_id: "owner", ...patch }] });
    const state = await getTeacherListingCapabilities(mock.client, ["teacher"], now);
    assert.equal(state.teacher?.action, action);
    assert.deepEqual(Object.keys(state.teacher!).sort(), ["action", "hasSlot"]);
  }
  console.log("teacherListingBookability: prerequisites, calendar, errors, metadata and listing UI passed");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
