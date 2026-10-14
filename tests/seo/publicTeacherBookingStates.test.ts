import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseCreateBookingRequest } from "../../lib/bookings/parseCreateBookingRequest";
import { bookingLessonStartDate, isBookingAtLeast24hAhead } from "../../lib/bookingCancellation";
import { hasListingBookingPrerequisites } from "../../lib/teachers/listingBookability";

const route = readFileSync("app/api/bookings/route.ts", "utf8");
const modal = readFileSync("components/BookingModal.tsx", "utf8");

test("incomplete payments block payable listing readiness, not the existing deferred request branch", () => {
  assert.equal(hasListingBookingPrerequisites({ id: "fixture", price_per_lesson: 45 }), false);
  assert.match(route, /paymentBlockers.length > 0 \|\| payoutBlockers.length > 0/);
  assert.match(route, /from\("teacher_booking_requests"\)/);
  assert.match(route, /deferred: true/);
  assert.match(route, /status: 202/);
});

test("a no-slot lesson request is not implemented: messaging is not a booking request", () => {
  assert.equal(parseCreateBookingRequest({ teacher_id: "10000000-0000-4000-8000-000000000001" }).ok, false);
  assert.match(modal, /if \(!selectedDate \|\| !selectedSlot\)/);
  assert.match(modal, /bookingSelectDateTimeError/);
  assert.match(modal, /createRes.status === 202 && createPayload.deferred === true/);
});

test("Toronto midnight and minimum notice are explicit; current helper is host-zone dependent", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/Toronto";
    const slot = { slot_date: "2026-10-14", time_slot: "0h00" };
    assert.equal(bookingLessonStartDate(slot)?.toISOString(), "2026-10-14T04:00:00.000Z");
    assert.equal(isBookingAtLeast24hAhead(slot, new Date("2026-10-13T04:00:00Z")), true);
    assert.equal(isBookingAtLeast24hAhead(slot, new Date("2026-10-13T04:00:01Z")), false);
    process.env.TZ = "UTC";
    assert.equal(bookingLessonStartDate(slot)?.toISOString(), "2026-10-14T00:00:00.000Z");
    // Characterizes the existing mismatch, not a claim that UTC is the correct policy.
    assert.equal(isBookingAtLeast24hAhead(slot, new Date("2026-10-13T04:00:00Z")), false);
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test("audit is SELECT-only and cannot trigger HTTP slots hold expiry", () => {
  const script = readFileSync("scripts/audit_public_teacher_booking_states.ts", "utf8");
  assert.doesNotMatch(script, /\bfetch\(|\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.match(script, /fetchIndexableDiscoveryTeachers\(\)/);
});
