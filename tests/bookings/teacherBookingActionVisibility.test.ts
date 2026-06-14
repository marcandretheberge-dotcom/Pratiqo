import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canTeacherAcceptBooking,
  canTeacherRejectBooking,
  normalizeBookingActionStatus,
} from "@/lib/bookingTeacherActions";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
const DASHBOARD_SRC = readFileSync(join(ROOT, "components", "Dashboard.tsx"), "utf8");
const REQUEST_CARD_SRC = readFileSync(
  join(ROOT, "components", "dashboard", "teacher", "TeacherRequestCard.tsx"),
  "utf8",
);
const SCHEDULE_CARD_SRC = readFileSync(
  join(ROOT, "components", "dashboard", "teacher", "TeacherScheduleCard.tsx"),
  "utf8",
);

test("teacher decision helper only allows genuine manual request statuses", () => {
  for (const status of ["pending", "pending_teacher", "manual_request", " Pending "]) {
    assert.equal(canTeacherAcceptBooking({ status }), true, `${status} should allow teacher decision`);
    assert.equal(canTeacherRejectBooking({ status }), true, `${status} should allow teacher rejection`);
  }

  for (const status of [
    "pending_payment",
    "confirmed",
    "paid",
    "completed",
    "cancelled",
    "cancelled_conflict",
    "declined",
    "refunded",
    null,
    undefined,
  ]) {
    assert.equal(canTeacherAcceptBooking({ status }), false, `${status} must not allow teacher decision`);
    assert.equal(canTeacherRejectBooking({ status }), false, `${status} must not allow teacher rejection`);
  }
});

test("status normalization is deterministic and case-insensitive", () => {
  assert.equal(normalizeBookingActionStatus(" Pending_Teacher "), "pending_teacher");
  assert.equal(normalizeBookingActionStatus(null), "");
  assert.equal(normalizeBookingActionStatus(undefined), "");
});

test("teacher pending requests list uses the canonical decision predicate", () => {
  assert.match(
    DASHBOARD_SRC,
    /import\s+\{\s*canTeacherRejectBooking\s*\}\s+from\s+["']@\/lib\/bookingTeacherActions["']/,
  );
  assert.match(
    DASHBOARD_SRC,
    /const\s+pendingList\s*=\s*teacherBookings\.filter\(\(b\)\s*=>\s*\{\s*if\s*\(\s*!canTeacherRejectBooking\(b\)\s*\)\s*return\s+false;/s,
    "pendingList must not hand-roll status checks that can include confirmed or pending_payment bookings",
  );
});

test("teacher request card has a local backstop before rendering decline", () => {
  assert.match(REQUEST_CARD_SRC, /canTeacherRejectBooking\(booking\)/);
  assert.match(REQUEST_CARD_SRC, /const\s+canDecline\s*=\s*canTeacherRejectBooking\(booking\)/);
  assert.match(
    REQUEST_CARD_SRC,
    /\{canDecline\s*\?\s*\([\s\S]*t\("declineButton"\)[\s\S]*\)\s*:\s*null\}/,
    "decline button must be rendered only when canDecline is true",
  );
});

test("confirmed schedule keeps cancellation flow and does not receive decline actions", () => {
  assert.match(SCHEDULE_CARD_SRC, /onRequestCancelClass/);
  assert.match(SCHEDULE_CARD_SRC, /t\("cancelThisClass"\)/);
  assert.doesNotMatch(
    SCHEDULE_CARD_SRC,
    /declineButton|onDecline/,
    "confirmed schedule card must not render teacher decline/refuse actions",
  );
  assert.match(
    DASHBOARD_SRC,
    /titleKey="upcomingConfirmedClasses"[\s\S]*onRequestCancelClass=\{\(bookingId\)\s*=>\s*setCancelBooking\(\{\s*id:\s*bookingId,\s*side:\s*"teacher"\s*\}\)\}/,
    "confirmed teacher bookings must continue to use the structured cancellation flow",
  );
});

test("payment and cancellation business logic files are not imported by the visibility helper", () => {
  const HELPER_SRC = readFileSync(join(ROOT, "lib", "bookingTeacherActions.ts"), "utf8");
  assert.doesNotMatch(HELPER_SRC, /stripe|payment|refund|commission|membrePro/i);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[bookings:teacherActionVisibility] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
