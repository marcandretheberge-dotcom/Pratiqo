/**
 * PR 16C — Teacher dashboard focus & action polish (layout/UX only).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test("dashboard no longer mounts large duplicated visibility / SEO / completeness blocks", () => {
  const dash = read("components/Dashboard.tsx");
  assert.doesNotMatch(dash, /TeacherProfileVisibilityCard/);
  assert.doesNotMatch(dash, /TeacherSeoReadinessCard/);
  assert.doesNotMatch(dash, /TeacherProfileCompletenessCard/);
  assert.match(dash, /TeacherProfileStatusCard/);
  assert.match(dash, /TeacherDashboardActionCenter/);
  assert.match(dash, /teacher-dash-shortcuts/);
});

test("action center appears before pending requests and schedule", () => {
  const dash = read("components/Dashboard.tsx");
  const actionIdx = dash.indexOf("<TeacherDashboardActionCenter");
  const pendingIdx = dash.indexOf('id="teacher-dash-pending"');
  const scheduleIdx = dash.indexOf('id="teacher-dash-schedule"');
  const assignmentIdx = dash.indexOf('<AssignmentHub mode="teacher"');
  assert.ok(actionIdx > 0 && pendingIdx > actionIdx);
  assert.ok(scheduleIdx > pendingIdx);
  assert.ok(assignmentIdx > scheduleIdx);
});

test("Gestion du profil keeps full visibility checklist and SEO card", () => {
  const verification = read("app/(app)/teacher/verification/page.tsx");
  assert.match(verification, /TeacherProfileVisibilityCard/);
  assert.match(verification, /TeacherSeoReadinessCard/);
  assert.match(verification, /teacher-profile-visibility-card|TeacherProfileVisibilityCard/);
});

test("dashboard layout uses min-w-0 / overflow-x-clip to avoid page-level horizontal scroll", () => {
  const dash = read("components/Dashboard.tsx");
  assert.match(dash, /min-w-0 max-w-\[1280px\]/);
  assert.match(dash, /overflow-x-clip/);
  assert.doesNotMatch(dash, /overflow-hidden bg-\[#F3FAF6\]/);
  assert.match(dash, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(0,280px\)\]/);
});

test("top nav scrolls within itself and prioritizes daily routes", () => {
  const nav = read("components/TeacherTopNav.tsx");
  assert.match(nav, /overflow-x-auto/);
  assert.match(nav, /data-testid="teacher-top-nav-tabs"/);
  const primary = nav.match(/const PRIMARY_NAV[\s\S]*?= \[[\s\S]*?\];/);
  assert.ok(primary);
  assert.match(primary![0], /\/dashboard/);
  assert.match(primary![0], /\/teacher\/schedule/);
  assert.match(primary![0], /\/teacher\/progress/);
  assert.match(primary![0], /\/messages/);
  assert.match(primary![0], /\/teacher\/offers/);
  assert.match(primary![0], /\/teacher\/revenue/);
  const secondary = nav.match(/function buildSecondaryNav[\s\S]*?return items;\n}/);
  assert.ok(secondary);
  assert.match(secondary![0], /\/teacher\/verification/);
  assert.match(secondary![0], /\/teacher\/history/);
  assert.doesNotMatch(secondary![0], /href: "\/teacher\/offers"/);
});

test("metric cards, pending requests, upcoming lessons, and homework still render", () => {
  const dash = read("components/Dashboard.tsx");
  assert.match(dash, /TeacherDashboardStats/);
  assert.match(dash, /pendingRequests/);
  assert.match(dash, /TeacherRequestCard/);
  assert.match(dash, /TeacherScheduleCard/);
  assert.match(dash, /AssignmentHub mode="teacher"/);
  assert.match(dash, /teacherDashRevenueThisMonth/);
});

test("no booking / Stripe / package mutation surfaces changed by this polish", () => {
  const dash = read("components/Dashboard.tsx");
  assert.doesNotMatch(dash, /stripe\.|@stripe\/|createCheckout|application_fee/);
  assert.doesNotMatch(dash, /reversePackageRedemption|forfeitPackageRedemption|redeemPackageSession/);
  assert.match(dash, /postCancelBooking/);
  const action = read("components/dashboard/teacher/TeacherDashboardActionCenter.tsx");
  const status = read("components/dashboard/teacher/TeacherProfileStatusCard.tsx");
  assert.doesNotMatch(action + status, /stripe|commission|payout|refund/i);
});

test("marketplace-safe FR action copy", () => {
  const fr = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
  assert.equal(fr.teacherDashActionCenterTitle, "À faire aujourd’hui");
  assert.match(fr.teacherDashManageProfileCta, /Gérer mon profil/);
  assert.doesNotMatch(fr.teacherDashActionCenterTitle, /Nos professeurs|Salaire|Employé|Forfait Pratiqo/i);
  assert.doesNotMatch(fr.teacherDashScheduleEmpty, /Pratiqo vous assigne/i);
});

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`not ok - ${name}`);
    console.error(e);
    process.exit(1);
  }
}
console.log(`# ${tests.length} passed`);
