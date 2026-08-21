/**
 * Teacher dashboard sidebar navigation shell (layout/UX only).
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

const CONFIG = "components/teacher/teacherNavConfig.ts";
const SIDEBAR = "components/teacher/TeacherSidebarNav.tsx";
const TOP_NAV = "components/TeacherTopNav.tsx";
const SHELL = "components/AppShell.tsx";
const DASH = "components/Dashboard.tsx";

test("desktop teacher shell mounts sidebar and no horizontal tab strip", () => {
  const shell = read(SHELL);
  const top = read(TOP_NAV);
  const sidebar = read(SIDEBAR);
  assert.match(shell, /TeacherSidebarNav/);
  assert.match(shell, /data-testid="teacher-app-shell"/);
  assert.match(shell, /data-testid="teacher-main-shell"/);
  assert.match(shell, /h-\[100dvh\]/);
  assert.match(shell, /overflow-hidden/);
  assert.match(sidebar, /data-testid="teacher-sidebar-nav"/);
  assert.match(sidebar, /hidden[\s\S]*md:flex/);
  assert.match(sidebar, /h-full/);
  assert.match(sidebar, /data-testid="teacher-sidebar-logo"/);
  assert.match(top, /data-testid="teacher-top-header"/);
  assert.match(top, /sticky top-0/);
  assert.doesNotMatch(top, /data-testid="teacher-top-nav-tabs"/);
  assert.doesNotMatch(top, /overflow-x-auto/);
  assert.doesNotMatch(top, /MoreHorizontal|navMore/);
  // Topbar lives inside main column — not a full-width sibling above sidebar.
  const teacherReturn = shell.slice(shell.indexOf("if (isTeacher)"));
  assert.match(teacherReturn, /TeacherSidebarNav[\s\S]*TeacherTopNav/);
  assert.doesNotMatch(teacherReturn.slice(0, teacherReturn.indexOf("TeacherSidebarNav")), /TeacherTopNav/);
});

test("sidebar includes all required teacher routes in product order", () => {
  const config = read(CONFIG);
  const main = config.match(/const MAIN_NAV[\s\S]*?= \[[\s\S]*?\];/)?.[0] ?? "";
  assert.match(main, /\/dashboard/);
  assert.match(main, /\/teacher\/schedule/);
  assert.match(main, /\/teacher\/progress/);
  assert.match(main, /\/messages/);
  assert.match(main, /\/teacher\/offers/);
  assert.match(main, /\/teacher\/revenue/);
  assert.match(config, /\/teacher\/history/);
  assert.match(config, /\/resolution/);
  assert.match(config, /\/loyalty/);
  assert.match(config, /\/teacher\/verification/);
  assert.match(config, /teacherOffersNav/);
  assert.match(config, /teacherProfileManagementNav/);
});

test("active route uses aria-current and nested matching helper", () => {
  const config = read(CONFIG);
  const sidebar = read(SIDEBAR);
  const top = read(TOP_NAV);
  assert.match(config, /export function isTeacherNavActive/);
  assert.match(config, /pathname\.startsWith\("\/teacher\/group-sessions"\)/);
  assert.match(config, /pathname\.startsWith\("\/teacher\/verification"\)/);
  assert.match(sidebar, /aria-current=\{active \? "page"/);
  assert.match(top, /aria-current=\{active \? "page"/);
});

test("mobile drawer exposes all teacher routes; no permanent mobile sidebar", () => {
  const top = read(TOP_NAV);
  const sidebar = read(SIDEBAR);
  const config = read(CONFIG);
  assert.match(top, /data-testid="teacher-mobile-nav-trigger"/);
  assert.match(top, /data-testid="teacher-mobile-nav-drawer"/);
  assert.match(top, /md:hidden/);
  assert.match(top, /buildTeacherMobileDrawerNav/);
  assert.match(config, /TEACHER_DRAWER_EXTRA_NAV/);
  assert.match(config, /\/teacher\/my-profile/);
  assert.match(config, /\/teacher\/settings/);
  assert.match(sidebar, /hidden[\s\S]*w-\[260px\]/);
});

test("app shell content uses min-w-0 and does not misuse w-screen", () => {
  const shell = read(SHELL);
  assert.match(shell, /TeacherSidebarNav/);
  assert.match(shell, /min-w-0/);
  assert.match(shell, /overflow-x-clip/);
  assert.match(shell, /max-w-\[1280px\]/);
  assert.doesNotMatch(shell, /w-screen/);
  assert.doesNotMatch(read(TOP_NAV), /w-screen/);
  assert.doesNotMatch(read(SIDEBAR), /w-screen/);
  // Avoid page-level overflow-x-hidden as the only overflow fix on the teacher shell.
  const teacherBlock = shell.slice(shell.indexOf('data-testid="teacher-app-shell"'));
  assert.doesNotMatch(teacherBlock.slice(0, 400), /overflow-x-hidden/);
});

test("dashboard content and compact profile status still render; no large visibility duplicate", () => {
  const dash = read(DASH);
  assert.match(dash, /TeacherDashboardActionCenter/);
  assert.match(dash, /TeacherProfileStatusCard/);
  assert.match(dash, /TeacherDashboardStats/);
  assert.match(dash, /TeacherRequestCard/);
  assert.match(dash, /TeacherScheduleCard/);
  assert.match(dash, /AssignmentHub mode="teacher"/);
  assert.doesNotMatch(dash, /TeacherProfileVisibilityCard/);
  assert.doesNotMatch(dash, /TeacherSeoReadinessCard/);
});

test("packages flag still wires into teacher nav config", () => {
  const config = read(CONFIG);
  assert.match(config, /isTeacherPackageVisibilityUiEnabled/);
  assert.match(config, /\/teacher\/packages/);
  assert.match(config, /teacherPackagesNav/);
});

test("no booking / Stripe / commission / package mutation logic in this nav PR surface", () => {
  for (const rel of [CONFIG, SIDEBAR, TOP_NAV, SHELL]) {
    const src = read(rel);
    assert.doesNotMatch(src, /createCheckout|application_fee|stripe\.|@stripe\//);
    assert.doesNotMatch(src, /reversePackageRedemption|forfeitPackageRedemption|redeemPackageSession/);
    assert.doesNotMatch(src, /computeCommission|createPayout|refundPaymentIntent/);
  }
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /TeacherSidebarNav|teacherNavConfig/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /TeacherSidebarNav|teacherNavConfig/);
  assert.doesNotMatch(read("lib/offers/packageRedemptions.ts"), /TeacherSidebarNav|teacherNavConfig/);
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
