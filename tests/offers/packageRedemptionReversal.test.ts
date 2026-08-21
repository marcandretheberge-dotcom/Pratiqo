/**
 * Package credit reversal on cancellation (PR 10C).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  reversePackageRedemptionForBooking,
  markPackageRedemptionCompletedForBooking,
} from "../../lib/offers/packageRedemptions";
import { copyKeyForOutcome } from "../../lib/bookings/cancellationOutcome";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

test("migration 103 adds reverse and complete RPCs with locks", () => {
  const sql = read("supabase/migrations/103_add_package_redemption_reversal_rpc.sql");
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.reverse_package_redemption_for_booking/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.mark_package_redemption_completed_for_booking/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /status = 'reversed'/);
  assert.match(sql, /GREATEST\(coalesce\(v_ent\.used_sessions, 0\) - 1, 0\)/);
  assert.match(sql, /WHEN v_new_remaining > 0 THEN 'active'/);
  assert.match(sql, /REDEMPTION_NOT_REVERSIBLE/);
  assert.match(sql, /student_cancelled/);
  assert.match(sql, /teacher_rejected/);
  assert.match(sql, /GRANT EXECUTE[\s\S]*TO service_role/);
  assert.match(sql, /Does not touch Stripe, payouts, or monetary refunds/);
  assert.match(sql, /Legal TODO before public package launch/);
});

test("reversePackageRedemptionForBooking maps success and idempotency", async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const result = await reversePackageRedemptionForBooking({
    admin: {
      rpc: async (fn, args) => {
        calls.push({ fn, args });
        return {
          data: {
            ok: true,
            reversed: true,
            idempotent: false,
            booking_id: "11111111-1111-1111-1111-111111111111",
            redemption_id: "22222222-2222-2222-2222-222222222222",
            entitlement_id: "33333333-3333-3333-3333-333333333333",
            session_number: 1,
            redemption_status: "reversed",
            remaining_sessions: 2,
            used_sessions: 0,
            entitlement_status: "active",
            reversal_source: "student_cancelled",
          },
          error: null,
        };
      },
    },
    bookingId: "11111111-1111-1111-1111-111111111111",
    actorUserId: "44444444-4444-4444-4444-444444444444",
    source: "student_cancelled",
    reason: "schedule conflict",
  });

  assert.equal(calls[0]?.fn, "reverse_package_redemption_for_booking");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.reversed, true);
    assert.equal(result.remainingSessions, 2);
    assert.equal(result.usedSessions, 0);
    assert.equal(result.entitlementStatus, "active");
  }

  const idempotent = await reversePackageRedemptionForBooking({
    admin: {
      rpc: async () => ({
        data: {
          ok: true,
          reversed: false,
          idempotent: true,
          booking_id: "11111111-1111-1111-1111-111111111111",
          redemption_id: "22222222-2222-2222-2222-222222222222",
          entitlement_id: "33333333-3333-3333-3333-333333333333",
          session_number: 1,
          redemption_status: "reversed",
          remaining_sessions: 2,
          used_sessions: 0,
          entitlement_status: "active",
          reversal_source: "student_cancelled",
        },
        error: null,
      }),
    },
    bookingId: "11111111-1111-1111-1111-111111111111",
    source: "student_cancelled",
  });
  assert.equal(idempotent.ok, true);
  if (idempotent.ok) {
    assert.equal(idempotent.reversed, false);
    assert.equal(idempotent.idempotent, true);
  }
});

test("reversePackageRedemptionForBooking blocks completed redemptions", async () => {
  const result = await reversePackageRedemptionForBooking({
    admin: {
      rpc: async () => ({
        data: null,
        error: { message: "REDEMPTION_NOT_REVERSIBLE" },
      }),
    },
    bookingId: "11111111-1111-1111-1111-111111111111",
    source: "teacher_cancelled",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "redemption_not_reversible");
});

test("cancel and decline routes restore package credit without Stripe refund", () => {
  const cancel = read("app/api/bookings/[id]/cancel/route.ts");
  const decline = read("app/api/bookings/[id]/decline/route.ts");
  assert.match(cancel, /reversePackageRedemptionForBooking/);
  assert.match(cancel, /package_credit_restored/);
  assert.match(cancel, /isPackageCredit/);
  assert.doesNotMatch(cancel, /intentionally deferred/);
  assert.match(decline, /reversePackageRedemptionForBooking/);
  assert.match(decline, /teacher_rejected/);
  // Package path runs first; Stripe refund only in the else branch.
  assert.match(cancel, /if \(isPackageCredit\) \{/);
  assert.match(cancel, /forfeitPackageRedemptionForBooking/);
  const packageBranch = cancel.indexOf("if (isPackageCredit)");
  const stripeCall = cancel.indexOf("await attemptStripeBookingRefund");
  assert.ok(packageBranch > 0 && stripeCall > packageBranch);
});

test("completion marks redemption completed without balance change helper", () => {
  const complete = read("lib/bookings/completeBooking.ts");
  assert.match(complete, /markPackageRedemptionCompletedForBooking/);
  const sql = read("supabase/migrations/103_add_package_redemption_reversal_rpc.sql");
  assert.match(sql, /No entitlement balance change|no entitlement balance change/i);
});

test("outcome copy key and marketplace-safe FR copy exist", () => {
  assert.equal(
    copyKeyForOutcome("package_credit_restored", false),
    "cancelOutcomePackageCreditRestored",
  );
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /remise dans le forfait/);
  assert.match(fr, /proposé par le professeur/);
  assert.doesNotMatch(fr, /Nos forfaits Pratiqo|Acheter un forfait Pratiqo|salaire du professeur/);
});

test("stripe checkout commission refund files unchanged by reversal wiring", () => {
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /reverse_package_redemption|package_credit_restored/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /reverse_package_redemption|ENABLE_PACKAGE_REDEMPTION/);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), /reverse_package_redemption|package_credit_restored/);
});

test("admin visibility surfaces redemption status fields", () => {
  assert.match(read("components/admin/AdminPaymentSourceSection.tsx"), /packageRedemptionStatus/);
  assert.match(read("lib/admin/bookingPaymentOperations.ts"), /loadPackageRedemptionsByIds/);
  assert.match(read("lib/offers/adminOfferSnapshotDisplay.ts"), /mapAdminPackageCreditFieldsFromBookingRow/);
});

(async () => {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[offers:package-redemption-reversal] ${tests.length} tests passed`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
