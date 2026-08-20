/**
 * Package session redemption booking (PR 10B).
 * Atomic redeem via RPC; no Stripe checkout; same teacher only.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isPackageRedemptionBookingEnabled,
  parsePackageRedemptionRequest,
  redeemPackageSessionBooking,
} from "../../lib/offers/packageRedemptions";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const prevFlag = process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING;

test("package redemption flag defaults OFF", () => {
  delete process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING;
  assert.equal(isPackageRedemptionBookingEnabled(), false);
});

test("migration creates package_redemptions with RLS and booking link columns", () => {
  const sql = read("supabase/migrations/102_create_package_redemptions.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.package_redemptions/);
  assert.match(sql, /ALTER TABLE IF EXISTS public\.package_redemptions ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /package_redemptions_select_student/);
  assert.match(sql, /package_redemptions_select_teacher/);
  assert.match(sql, /package_redemptions_no_client_insert/);
  assert.match(sql, /WITH CHECK \(false\)/);
  assert.match(sql, /UNIQUE \(booking_id\)/);
  assert.match(sql, /UNIQUE \(package_entitlement_id, session_number\)/);
  assert.match(sql, /UNIQUE \(student_id, client_request_id\)/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS package_entitlement_id/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS package_redemption_id/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS booking_payment_source/);
  assert.match(sql, /redeem_package_session_booking/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /booking_payment_source.*package_credit|package_credit/);
  assert.match(sql, /status.*confirmed|'confirmed'/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.redeem_package_session_booking/);
  assert.doesNotMatch(sql, /Mes formules|\bformules\b/);
  assert.match(
    sql,
    /Package credit reversal on cancellation is intentionally deferred|intentionally deferred/,
  );
});

test("parsePackageRedemptionRequest rejects balance and amount fields", () => {
  const bad = parsePackageRedemptionRequest({
    client_request_id: "req-12345678",
    slot_date: "2026-09-01",
    time_slot: "10:00",
    teaching_mode: "online",
    remaining_sessions: 3,
  });
  assert.equal(bad.ok, false);

  const ok = parsePackageRedemptionRequest({
    client_request_id: "req-12345678",
    slot_date: "2026-09-01",
    time_slot: "10:00",
    teaching_mode: "online",
  });
  assert.equal(ok.ok, true);
});

test("redeemPackageSessionBooking rejects when flag OFF", async () => {
  delete process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING;
  const result = await redeemPackageSessionBooking({
    admin: { rpc: async () => ({ data: null, error: null }) },
    entitlementId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    request: {
      clientRequestId: "req-12345678",
      slotDate: "2099-09-01",
      timeSlot: "10:00",
      teachingMode: "online",
      studentLevel: null,
      studentAddress: null,
      learnerProfileId: null,
      durationMinutes: 60,
    },
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error, "package_redemption_disabled");
});

test("redeemPackageSessionBooking maps RPC success and idempotency", async () => {
  process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING = "true";
  const result = await redeemPackageSessionBooking({
    admin: {
      rpc: async () => ({
        data: {
          ok: true,
          idempotent: true,
          booking_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          redemption_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          entitlement_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          session_number: 2,
          remaining_sessions: 3,
          used_sessions: 2,
          entitlement_status: "active",
        },
        error: null,
      }),
    },
    entitlementId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    request: {
      clientRequestId: "req-12345678",
      slotDate: "2099-09-01",
      timeSlot: "10:00",
      teachingMode: "online",
      studentLevel: null,
      studentAddress: null,
      learnerProfileId: null,
      durationMinutes: 60,
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.idempotent, true);
  assert.equal(result.remainingSessions, 3);
  assert.equal(result.sessionNumber, 2);
});

test("redeem routes and BookingModal are wired without Stripe for package credit", () => {
  const redeem = read("app/api/package-entitlements/[entitlementId]/redeem/route.ts");
  const list = read("app/api/package-entitlements/route.ts");
  const modal = read("components/BookingModal.tsx");
  assert.match(redeem, /package_redemption_disabled/);
  assert.match(redeem, /redeemPackageSessionBooking/);
  assert.match(redeem, /same independent teacher|independent teacher/);
  assert.doesNotMatch(redeem, /stripe\.checkout|sessions\.create/);
  assert.match(list, /listActivePackageEntitlementsForTeacher/);
  assert.match(modal, /booking-package-credit-panel/);
  assert.match(modal, /\/api\/package-entitlements\/\$\{selectedPackageEntitlement\.id\}\/redeem/);
  assert.match(modal, /isPackageRedemptionBookingUiEnabled/);
  assert.match(modal, /Utiliser une séance|bookingPackageUseSession/);
  assert.doesNotMatch(modal, /Nos forfaits Pratiqo|Acheter un forfait Pratiqo|salaire|employer/);
});

test("atomic RPC decrements balance and does not read live teacher_offers", () => {
  const sql = read("supabase/migrations/102_create_package_redemptions.sql");
  assert.match(sql, /used_sessions = v_new_used/);
  assert.match(sql, /remaining_sessions = v_new_remaining/);
  assert.match(sql, /fully_used/);
  assert.doesNotMatch(sql, /FROM public\.teacher_offers|JOIN public\.teacher_offers/);
  assert.match(sql, /v_ent\.offer_title_snapshot/);
  assert.match(sql, /v_ent\.teacher_id/);
});

test("admin visibility includes package_credit source", () => {
  assert.match(
    read("lib/offers/adminOfferSnapshotDisplay.ts"),
    /package_credit/,
  );
  assert.match(
    read("components/admin/AdminPaymentSourceSection.tsx"),
    /adminPaymentSourcePackageCreditBody/,
  );
  assert.match(
    read("lib/admin/bookingPaymentOperations.ts"),
    /booking_payment_source/,
  );
});

test("cancellation reversal is deferred; Stripe checkout unchanged", () => {
  assert.match(
    read("app/api/bookings/[id]/cancel/route.ts"),
    /Package credit reversal on cancellation is intentionally deferred/,
  );
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /package_redemptions|redeem_package/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /package_redemptions|ENABLE_PACKAGE_REDEMPTION/);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), /package_redemptions|ENABLE_PACKAGE_REDEMPTION/);
});

(async () => {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  if (prevFlag === undefined) delete process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING;
  else process.env.ENABLE_PACKAGE_REDEMPTION_BOOKING = prevFlag;
  console.log(`[offers:package-redemptions] ${tests.length} tests passed`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
