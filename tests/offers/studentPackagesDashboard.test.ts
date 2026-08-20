/**
 * Student “Mes forfaits” dashboard (PR 11) — read-only package visibility.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isStudentPackageDashboardEnabled,
  isStudentPackageDashboardUiEnabled,
  mapStudentPackageDto,
  mapStudentPackageRedemptionDto,
  mapStudentPackageTeacherDto,
  studentPackageProgress,
  studentPackageRedemptionStatusLabelKey,
  studentPackageStatusLabelKey,
  teacherProfileHrefForStudentPackage,
  STUDENT_PACKAGES_READ_ONLY,
} from "../../lib/offers/studentPackages";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const prevServer = process.env.ENABLE_STUDENT_PACKAGE_DASHBOARD;
const prevUi = process.env.NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD;

test("student package dashboard flags default OFF", () => {
  delete process.env.ENABLE_STUDENT_PACKAGE_DASHBOARD;
  delete process.env.NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD;
  assert.equal(isStudentPackageDashboardEnabled(), false);
  assert.equal(isStudentPackageDashboardUiEnabled(), false);
});

test("progress helper clamps used/total/remaining", () => {
  const p = studentPackageProgress({
    usedSessions: 2,
    totalSessions: 5,
    remainingSessions: 3,
  });
  assert.equal(p.percentUsed, 40);
  assert.equal(p.remainingSessions, 3);
});

test("status and redemption label keys", () => {
  assert.equal(studentPackageStatusLabelKey("active"), "studentPackagesStatusActive");
  assert.equal(studentPackageStatusLabelKey("fully_used"), "studentPackagesStatusFullyUsed");
  assert.equal(studentPackageStatusLabelKey("weird"), "studentPackagesStatusUnknown");
  assert.equal(
    studentPackageRedemptionStatusLabelKey("reversed"),
    "studentPackagesRedemptionReversed",
  );
});

test("teacher profile href prefers slug then id", () => {
  assert.equal(
    teacherProfileHrefForStudentPackage({ teacherId: "t1", slug: "marie-piano" }),
    "/professeurs/marie-piano",
  );
  assert.equal(
    teacherProfileHrefForStudentPackage({ teacherId: "t1", slug: null }),
    "/teacher/profile/t1",
  );
});

test("DTO uses entitlement snapshot fields not live teacher_offers", () => {
  const teacher = mapStudentPackageTeacherDto({
    id: "teacher-1",
    name: "Marie",
    public_profile_slug: "marie-piano",
    image_url: "https://example.com/m.jpg",
  });
  assert.ok(teacher);
  const dto = mapStudentPackageDto({
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
      offer_short_description_snapshot: "Cinq séances avec Marie",
      offer_snapshot_version: 1,
    },
    teacher: teacher!,
    redemptions: [],
  });
  assert.ok(dto);
  assert.equal(dto!.package.title, "Forfait piano 5");
  assert.equal(dto!.package.remainingSessions, 3);
  assert.equal(dto!.offerSnapshot.specialite, "Classique");
  assert.equal(dto!.teacher.profileHref, "/professeurs/marie-piano");
  assert.doesNotMatch(JSON.stringify(dto), /private|address|stripe|admin_note/i);
});

test("redemption mapper includes booking schedule when available", () => {
  const row = mapStudentPackageRedemptionDto(
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
});

test("route, page, nav, and API are wired read-only", () => {
  assert.equal(STUDENT_PACKAGES_READ_ONLY, true);
  const api = read("app/api/student/packages/route.ts");
  assert.match(api, /isStudentPackageDashboardEnabled/);
  assert.match(api, /listStudentPackagesForOwner/);
  assert.match(api, /student_package_dashboard_disabled/);
  assert.doesNotMatch(api, /insert|update|rpc\(|redeem|reverse_package/);

  const page = read("app/(app)/student/packages/page.tsx");
  assert.match(page, /StudentPackageDashboard/);

  const dash = read("components/student/StudentPackageDashboard.tsx");
  assert.match(dash, /isStudentPackageDashboardUiEnabled/);
  assert.match(dash, /\/api\/student\/packages/);
  assert.match(dash, /student-packages-empty/);
  assert.doesNotMatch(dash, /redeem|checkout|sessions\.create/);

  const card = read("components/student/StudentPackageCard.tsx");
  assert.match(card, /studentPackagesBookWithTeacher/);
  assert.match(card, /studentPackagesProposedByTeacher/);
  assert.match(card, /studentPackagesSessionReturnedBody/);
  assert.doesNotMatch(card, /Nos forfaits Pratiqo|Acheter un forfait Pratiqo|salaire|employer/);

  const shell = read("components/AppShell.tsx");
  assert.match(shell, /studentPackagesNavEnabled/);
  assert.match(shell, /studentTabPackages/);
  assert.match(shell, /\/student\/packages/);

  assert.doesNotMatch(read("lib/offers/studentPackages.ts"), /FROM public\.teacher_offers|live teacher_offers/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /studentPackages|ENABLE_STUDENT_PACKAGE/);
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /student\/packages|ENABLE_STUDENT_PACKAGE/);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), /ENABLE_STUDENT_PACKAGE_DASHBOARD/);
});

test("marketplace-safe FR copy and no formules", () => {
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /"studentTabPackages": "Mes forfaits"/);
  assert.match(fr, /Forfait proposé par ce professeur/);
  assert.match(fr, /Réserver avec ce professeur/);
  assert.match(fr, /remise dans le forfait/);
  assert.doesNotMatch(fr, /Nos forfaits Pratiqo|Acheter un forfait Pratiqo|Mes formules/);
  assert.doesNotMatch(read("components/student/StudentPackageDashboard.tsx"), /\bformules\b/i);
});

(async () => {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  if (prevServer === undefined) delete process.env.ENABLE_STUDENT_PACKAGE_DASHBOARD;
  else process.env.ENABLE_STUDENT_PACKAGE_DASHBOARD = prevServer;
  if (prevUi === undefined) delete process.env.NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD;
  else process.env.NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD = prevUi;
  console.log(`[offers:student-packages-dashboard] ${tests.length} tests passed`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
