/**
 * Teacher availability start date — helpers, migration, booking guards, UI wiring.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canBookTeacherOnDate,
  filterAvailableDaysByStartDate,
  formatAvailableFromDisplayDate,
  getAvailableFromBadge,
  isTeacherAvailableNow,
  normalizeAvailableFromDate,
} from "../../lib/teachers/availabilityStartDate";
import { createPendingPaymentBooking } from "../../lib/bookings/createPendingPaymentBooking";
import type { ParsedCreateBookingRequest } from "../../lib/bookings/parseCreateBookingRequest";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const MIGRATION = "supabase/migrations/107_teacher_available_from_date.sql";

test("migration adds nullable available_from_date and projects it publicly", () => {
  assert.equal(existsSync(join(ROOT, MIGRATION)), true);
  const sql = read(MIGRATION);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS available_from_date date NULL/i);
  assert.match(sql, /available_from_date\s+date/);
  assert.match(sql, /list_public_teachers/);
  assert.match(sql, /t\.available_from_date/);
  assert.doesNotMatch(sql, /UPDATE public\.teachers SET available_from_date/i);
  assert.doesNotMatch(sql, /available_from_date date NOT NULL/i);
});

test("normalizeAvailableFromDate handles null, ISO date, and invalid", () => {
  assert.equal(normalizeAvailableFromDate(null), null);
  assert.equal(normalizeAvailableFromDate(""), null);
  assert.equal(normalizeAvailableFromDate("2026-09-01"), "2026-09-01");
  assert.equal(normalizeAvailableFromDate("2026-09-01T12:00:00.000Z"), "2026-09-01");
  assert.equal(normalizeAvailableFromDate("not-a-date"), null);
  assert.equal(normalizeAvailableFromDate("2026-13-40"), null);
});

test("null available_from_date behaves as available now / bookable", () => {
  assert.equal(isTeacherAvailableNow(null, "2026-08-20"), true);
  assert.equal(canBookTeacherOnDate(null, "2026-08-20"), true);
  assert.equal(getAvailableFromBadge(null, "fr", "2026-08-20"), null);
});

test("past/today available_from_date shows no badge and allows booking", () => {
  assert.equal(isTeacherAvailableNow("2026-08-01", "2026-08-20"), true);
  assert.equal(canBookTeacherOnDate("2026-08-01", "2026-08-20"), true);
  assert.equal(getAvailableFromBadge("2026-08-01", "fr", "2026-08-20"), null);
  assert.equal(getAvailableFromBadge("2026-08-20", "fr", "2026-08-20"), null);
});

test("future start: month badge vs day badge and booking gate", () => {
  const month = getAvailableFromBadge("2026-09-01", "fr", "2026-08-20");
  assert.ok(month);
  assert.equal(month!.kind, "month");
  assert.match(month!.monthLabel, /septembre/i);

  const day = getAvailableFromBadge("2026-09-03", "en", "2026-08-20");
  assert.ok(day);
  assert.equal(day!.kind, "day");
  assert.equal(day!.day, 3);
  assert.match(day!.monthLabel, /september/i);

  assert.equal(canBookTeacherOnDate("2026-09-01", "2026-08-31"), false);
  assert.equal(canBookTeacherOnDate("2026-09-01", "2026-09-01"), true);
  assert.equal(canBookTeacherOnDate("2026-09-01", "2026-09-02"), true);
});

test("ES month label for badge", () => {
  const badge = getAvailableFromBadge("2026-09-01", "es", "2026-08-01");
  assert.ok(badge);
  // es-CA may render "septiembre" or "setiembre" depending on ICU data.
  assert.match(badge!.monthLabel, /septiembr|setiembr/i);
});

test("formatAvailableFromDisplayDate localizes", () => {
  assert.match(formatAvailableFromDisplayDate("2026-09-03", "fr"), /septembre/i);
  assert.match(formatAvailableFromDisplayDate("2026-09-03", "en"), /September/i);
});

test("filterAvailableDaysByStartDate removes earlier days", () => {
  const filtered = filterAvailableDaysByStartDate(
    { "2026-08-30": 2, "2026-09-01": 3, "2026-09-02": 1 },
    "2026-09-01",
  );
  assert.deepEqual(filtered, { "2026-09-01": 3, "2026-09-02": 1 });
});

test("createPendingPaymentBooking rejects before available_from_date", async () => {
  const request: ParsedCreateBookingRequest = {
    teacherId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    date: "2099-08-20",
    time: "10:00",
    slotDate: "2099-08-20",
    timeSlot: "10:00",
    studentLevel: null,
    teachingMode: "online",
    lessonType: "regular",
    price: 50,
    durationMinutes: 60,
    studentAddress: null,
    learnerProfileId: null,
    teacherOfferId: null,
  };

  const admin = {
    from: (table: string) => ({
      select: (_columns: string) => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === "teachers") {
              return {
                data: { id: request.teacherId, available_from_date: "2099-09-01" },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: "should not insert" } }),
        }),
      }),
    }),
  };

  const result = await createPendingPaymentBooking({
    admin: admin as never,
    studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    request,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error, "teacher_not_available_yet");
  assert.equal(result.availableFromDate, "2099-09-01");
});

test("createPendingPaymentBooking allows on available_from_date", async () => {
  const request: ParsedCreateBookingRequest = {
    teacherId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    date: "2099-09-01",
    time: "10:00",
    slotDate: "2099-09-01",
    timeSlot: "10:00",
    studentLevel: null,
    teachingMode: "online",
    lessonType: "regular",
    price: 50,
    durationMinutes: 60,
    studentAddress: null,
    learnerProfileId: null,
    teacherOfferId: null,
  };

  let inserted = false;
  const admin = {
    from: (table: string) => ({
      select: (_columns: string, _opts?: unknown) => {
        const filter = {
          eq: (_c: string, _v: string) => filter,
          maybeSingle: async () => {
            if (table === "teachers") {
              return {
                data: { id: request.teacherId, available_from_date: "2099-09-01" },
                error: null,
              };
            }
            return { data: null, error: null };
          },
          then: (resolve: (v: { count: number | null; error: null }) => unknown) =>
            Promise.resolve(resolve({ count: 0, error: null })),
        };
        return filter;
      },
      insert: (row: Record<string, unknown>) => {
        inserted = true;
        assert.equal(row.slot_date, "2099-09-01");
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

  const result = await createPendingPaymentBooking({
    admin: admin as never,
    studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    request,
  });
  assert.equal(result.ok, true);
  assert.equal(inserted, true);
});

test("wiring: select, mapper, UI, BookingModal 409, package redeem guard", () => {
  assert.match(read("lib/supabase/queries.ts"), /available_from_date/);
  assert.match(read("lib/teacherMapper.ts"), /availableFromDate/);
  assert.match(read("types.ts"), /availableFromDate/);
  assert.match(read("app/api/teacher/available-from/route.ts"), /availableFromDate/);
  assert.match(read("app/(app)/teacher/schedule/page.tsx"), /teacher-schedule-available-from/);
  assert.match(read("app/(app)/teacher/verification/page.tsx"), /available_from_date/);
  assert.match(read("components/teachers/TeacherAvailableFromBadge.tsx"), /teacher-available-from-badge/);
  assert.match(read("app/(app)/student/search/page.tsx"), /TeacherAvailableFromBadge/);
  assert.match(read("components/TeacherProfile.tsx"), /teacher-profile-available-from/);
  const modal = read("components/BookingModal.tsx");
  assert.match(modal, /teacher_not_available_yet/);
  assert.match(modal, /bookingTeacherNotAvailableYet/);
  assert.match(modal, /availableFromDate/);
  assert.match(read("lib/bookings/createPendingPaymentBooking.ts"), /teacher_not_available_yet/);
  assert.match(read("lib/offers/packageRedemptions.ts"), /teacher_not_available_yet/);
  assert.match(read("app/api/bookings/route.ts"), /availableFromDate/);
  assert.match(read("lib/admin/teacher360.ts"), /available_from_date/);
  assert.match(read("app/(app)/admin/users/[id]/page.tsx"), /Date de début des cours/);
});

test("search still lists future-start teachers; publish not blocked by available_from", () => {
  const publish = read("lib/teachers/profilePublishEligibility.ts");
  assert.doesNotMatch(publish, /available_from/);
  const searchVis = read("lib/teachers/searchVisibilityDiagnostics.ts");
  assert.doesNotMatch(searchVis, /available_from/);
  assert.match(read("lib/supabase/queries.ts"), /available_from_date/);
});

test("marketplace copy + no Stripe/checkout/commission/package mutation coupling", () => {
  const helper = read("lib/teachers/availabilityStartDate.ts");
  assert.doesNotMatch(helper, /Nos professeurs|Pratiqo assigne|Cours Pratiqo|salaire|employer/i);
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /available_from_date|availableFromDate/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /available_from/);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), /available_from/);
  assert.doesNotMatch(read("lib/offers/packageEntitlements.ts"), /available_from/);
  // Redeem checks date before RPC; does not mutate balance helpers.
  assert.doesNotMatch(read("lib/offers/packageRedemptions.ts"), /reversePackageRedemption.*available_from|available_from.*used_sessions/);
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Cours à partir de/);
  assert.doesNotMatch(fr, /Pratiqo ouvre les cours|Pratiqo assigne/);
});

async function main() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (e) {
      console.error(`not ok - ${name}`);
      console.error(e);
      process.exit(1);
    }
  }
  console.log(`# ${tests.length} passed`);
}

void main();
