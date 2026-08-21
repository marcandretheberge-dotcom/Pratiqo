/**
 * Teacher package visibility (PR 12) — read-only forfaits purchased with the teacher.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isTeacherPackageVisibilityEnabled,
  isTeacherPackageVisibilityUiEnabled,
  mapTeacherPackageDto,
  mapTeacherPackageRedemptionDto,
  mapTeacherPackageStudentDto,
  pickNextTeacherPackageBooking,
  teacherBookingHrefForPackageSession,
  teacherPackageProgress,
  teacherPackageRedemptionStatusLabelKey,
  teacherPackageStatusLabelKey,
  TEACHER_PACKAGES_READ_ONLY,
} from "../../lib/offers/teacherPackages";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const prevServer = process.env.ENABLE_TEACHER_PACKAGE_VISIBILITY;
const prevUi = process.env.NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY;

test("teacher package visibility flags default OFF", () => {
  delete process.env.ENABLE_TEACHER_PACKAGE_VISIBILITY;
  delete process.env.NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY;
  assert.equal(isTeacherPackageVisibilityEnabled(), false);
  assert.equal(isTeacherPackageVisibilityUiEnabled(), false);
});

test("progress helper clamps used/total/remaining", () => {
  const p = teacherPackageProgress({
    usedSessions: 2,
    totalSessions: 5,
    remainingSessions: 3,
  });
  assert.equal(p.percentUsed, 40);
  assert.equal(p.remainingSessions, 3);
  assert.equal(p.usedSessions, 2);
  assert.equal(p.totalSessions, 5);
});

test("status and redemption label keys", () => {
  assert.equal(teacherPackageStatusLabelKey("active"), "teacherPackagesStatusActive");
  assert.equal(teacherPackageStatusLabelKey("fully_used"), "teacherPackagesStatusFullyUsed");
  assert.equal(teacherPackageStatusLabelKey("cancelled"), "teacherPackagesStatusCancelled");
  assert.equal(teacherPackageStatusLabelKey("refunded"), "teacherPackagesStatusRefunded");
  assert.equal(teacherPackageStatusLabelKey("weird"), "teacherPackagesStatusUnknown");
  assert.equal(
    teacherPackageRedemptionStatusLabelKey("reversed"),
    "teacherPackagesRedemptionReversed",
  );
  assert.equal(
    teacherPackageRedemptionStatusLabelKey("reserved"),
    "teacherPackagesRedemptionReserved",
  );
});

test("booking href is read-only teacher dashboard routes only", () => {
  assert.equal(
    teacherBookingHrefForPackageSession({
      bookingStatus: "confirmed",
      bookingStartAt: "2026-08-24T18:00",
    }),
    "/dashboard",
  );
  assert.equal(
    teacherBookingHrefForPackageSession({
      bookingStatus: "completed",
      bookingStartAt: "2026-08-10T10:00",
    }),
    "/teacher/history",
  );
});

test("DTO uses entitlement snapshot fields not live teacher_offers", () => {
  const student = mapTeacherPackageStudentDto({
    id: "student-1",
    name: "Alex",
    photo_url: "https://example.com/a.jpg",
  });
  assert.ok(student);
  const dto = mapTeacherPackageDto({
    entitlement: {
      id: "11111111-1111-1111-1111-111111111111",
      offer_title_snapshot: "Forfait piano 5",
      offer_price_cents_snapshot: 25000,
      offer_currency_snapshot: "CAD",
      offer_duration_minutes_snapshot: 60,
      total_sessions: 5,
      used_sessions: 2,
      remaining_sessions: 3,
      status: "active",
      activated_at: "2026-08-12T12:00:00Z",
      teacher_offer_id: "offer-1",
      offer_discipline_id_snapshot: "music-piano",
      offer_specialite_snapshot: "Classique",
      offer_short_description_snapshot: "Cinq séances avec Alex",
      offer_snapshot_version: 1,
    },
    student: student!,
    redemptions: [],
  });
  assert.ok(dto);
  assert.equal(dto!.package.title, "Forfait piano 5");
  assert.equal(dto!.package.remainingSessions, 3);
  assert.equal(dto!.package.usedSessions, 2);
  assert.equal(dto!.package.totalSessions, 5);
  assert.equal(dto!.student.name, "Alex");
  assert.equal(dto!.offerSnapshot.specialite, "Classique");
  assert.equal(dto!.nextBooking, null);
  assert.doesNotMatch(JSON.stringify(dto), /private|address|stripe|admin_note|email/i);
});

test("completed cancelled refunded and unknown statuses map safely", () => {
  const student = mapTeacherPackageStudentDto({ id: "s1", name: "Sam" })!;
  for (const status of ["fully_used", "cancelled", "refunded", "mystery"]) {
    const dto = mapTeacherPackageDto({
      entitlement: {
        id: "11111111-1111-1111-1111-111111111112",
        offer_title_snapshot: "Forfait",
        offer_price_cents_snapshot: 10000,
        offer_currency_snapshot: "CAD",
        total_sessions: 3,
        used_sessions: 3,
        remaining_sessions: 0,
        status,
      },
      student,
      redemptions: [],
    });
    assert.ok(dto);
    assert.equal(dto!.package.status, status);
    assert.ok(teacherPackageStatusLabelKey(status));
  }
});

test("redemption mapper and reversed copy path", () => {
  const row = mapTeacherPackageRedemptionDto(
    {
      id: "22222222-2222-2222-2222-222222222222",
      booking_id: "33333333-3333-3333-3333-333333333333",
      session_number: 1,
      status: "reversed",
      redeemed_at: "2026-08-13T12:00:00Z",
      reversed_at: "2026-08-14T12:00:00Z",
    },
    { status: "cancelled", slot_date: "2026-08-20", time_slot: "10:00" },
  );
  assert.ok(row);
  assert.equal(row!.status, "reversed");
  assert.equal(row!.bookingStartAt, "2026-08-20T10:00");
  assert.equal(row!.bookingHref, "/teacher/history");
});

test("pickNextTeacherPackageBooking selects earliest future reserved session", () => {
  const future = "2099-08-24T18:00";
  const later = "2099-09-01T10:00";
  const next = pickNextTeacherPackageBooking(
    [
      {
        id: "r1",
        bookingId: "b1",
        sessionNumber: 1,
        status: "completed",
        redeemedAt: null,
        completedAt: null,
        cancelledAt: null,
        reversedAt: null,
        bookingStartAt: "2020-01-01T10:00",
        bookingStatus: "completed",
        bookingHref: "/teacher/history",
      },
      {
        id: "r2",
        bookingId: "b2",
        sessionNumber: 2,
        status: "reserved",
        redeemedAt: null,
        completedAt: null,
        cancelledAt: null,
        reversedAt: null,
        bookingStartAt: later,
        bookingStatus: "confirmed",
        bookingHref: "/dashboard",
      },
      {
        id: "r3",
        bookingId: "b3",
        sessionNumber: 3,
        status: "reserved",
        redeemedAt: null,
        completedAt: null,
        cancelledAt: null,
        reversedAt: null,
        bookingStartAt: future,
        bookingStatus: "confirmed",
        bookingHref: "/dashboard",
      },
    ],
    Date.parse("2026-08-20T12:00:00Z"),
  );
  assert.ok(next);
  assert.equal(next!.bookingId, "b3");
  assert.equal(next!.startAt, future);
});

test("route, page, nav, and API are wired read-only", () => {
  assert.equal(TEACHER_PACKAGES_READ_ONLY, true);
  const api = read("app/api/teacher/packages/route.ts");
  assert.match(api, /isTeacherPackageVisibilityEnabled/);
  assert.match(api, /requireOwnedTeacher/);
  assert.match(api, /listTeacherPackagesForOwner/);
  assert.match(api, /teacher_package_visibility_disabled/);
  assert.doesNotMatch(api, /insert|update|rpc\(|redeem|reverse_package/);

  const page = read("app/(app)/teacher/packages/page.tsx");
  assert.match(page, /TeacherPackageDashboard/);

  const dash = read("components/teacher/TeacherPackageDashboard.tsx");
  assert.match(dash, /isTeacherPackageVisibilityUiEnabled/);
  assert.match(dash, /\/api\/teacher\/packages/);
  assert.match(dash, /teacher-packages-empty/);
  assert.match(dash, /teacherPackagesEmptyTitle/);
  assert.doesNotMatch(dash, /redeem|checkout|sessions\.create|remaining_sessions\s*=/);

  const card = read("components/teacher/TeacherPackageCard.tsx");
  assert.match(card, /teacherPackagesPurchasedWithYou/);
  assert.match(card, /teacherPackagesViewOffers/);
  assert.match(card, /teacherPackagesSessionReturnedBody/);
  assert.match(card, /teacherPackagesHistoryTitle/);
  assert.doesNotMatch(
    card,
    /Nos forfaits Pratiqo|Acheter un forfait Pratiqo|salaire|employer|Modifier les crédits|Rembourser/i,
  );

  const nav = read("components/teacher/teacherNavConfig.ts");
  assert.match(nav, /isTeacherPackageVisibilityUiEnabled/);
  assert.match(nav, /\/teacher\/packages/);
  assert.match(nav, /teacherPackagesNav/);

  assert.doesNotMatch(read("lib/offers/teacherPackages.ts"), /from\("teacher_offers"\)|FROM public\.teacher_offers/);
  assert.match(read("lib/offers/teacherPackages.ts"), /offer_title_snapshot/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /teacherPackages|ENABLE_TEACHER_PACKAGE/);
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /teacher\/packages|ENABLE_TEACHER_PACKAGE/);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), /ENABLE_TEACHER_PACKAGE_VISIBILITY/);
  assert.doesNotMatch(read("lib/offers/packageEntitlements.ts"), /teacherPackages|ENABLE_TEACHER_PACKAGE_VISIBILITY/);
  assert.doesNotMatch(read("lib/offers/packageRedemptions.ts"), /ENABLE_TEACHER_PACKAGE_VISIBILITY/);
});

test("marketplace-safe FR copy and no formules", () => {
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /"teacherPackagesNav": "Forfaits"/);
  assert.match(fr, /"teacherPackagesHeading": "Forfaits achetés avec vous"/);
  assert.match(fr, /Forfait acheté avec vous/);
  assert.match(fr, /Séances du forfait/);
  assert.match(fr, /Séance remise dans le forfait/);
  assert.match(fr, /proposés par vous/);
  assert.doesNotMatch(fr, /Nos forfaits Pratiqo|Acheter un forfait Pratiqo|Mes formules|Pratiqo vous assigne/);
  assert.doesNotMatch(read("components/teacher/TeacherPackageDashboard.tsx"), /\bformules\b/i);
  assert.doesNotMatch(read("components/teacher/TeacherPackageCard.tsx"), /\bformules\b/i);
});

test("list query scopes by teacher_id ownership", () => {
  const lib = read("lib/offers/teacherPackages.ts");
  assert.match(lib, /\.eq\("teacher_id", args\.teacherId\)/);
  assert.match(lib, /mapTeacherPackageDto/);
  assert.doesNotMatch(lib, /\.update\(|\.insert\(|\.delete\(/);
});

(async () => {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  if (prevServer === undefined) delete process.env.ENABLE_TEACHER_PACKAGE_VISIBILITY;
  else process.env.ENABLE_TEACHER_PACKAGE_VISIBILITY = prevServer;
  if (prevUi === undefined) delete process.env.NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY;
  else process.env.NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY = prevUi;
  console.log(`[offers:teacher-packages-visibility] ${tests.length} tests passed`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
