/**
 * PR 16B — Policy-aware package-credit cancellation enforcement.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluatePackageCancellationPolicy,
  packageCancelPolicyUiHintFromEvaluation,
} from "../../lib/offers/cancellationPolicyEvaluation";
import {
  forfeitPackageRedemptionForBooking,
  reversePackageRedemptionForBooking,
} from "../../lib/offers/packageRedemptions";
import { copyKeyForOutcome } from "../../lib/bookings/cancellationOutcome";
import {
  isOfferPolicyEnforcementEnabled,
  OFFER_POLICY_ENFORCEMENT_FLAG,
} from "../../lib/offers/offerPolicyEnforcement";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const MIGRATION = "supabase/migrations/106_package_redemption_policy_forfeit.sql";

test("migration 106 adds policy audit columns and forfeit RPC", () => {
  assert.equal(existsSync(join(ROOT, MIGRATION)), true);
  const sql = read(MIGRATION);
  assert.match(sql, /policy_evaluation_result/);
  assert.match(sql, /policy_evaluated_at/);
  assert.match(sql, /credit_return_reason/);
  assert.match(sql, /manual_review_required/);
  assert.match(sql, /forfeit_package_redemption_for_booking/);
  assert.match(sql, /status = 'cancelled'/);
  assert.match(sql, /Does NOT touch Stripe/);
  assert.match(sql, /GRANT EXECUTE[\s\S]*TO service_role/);
  assert.doesNotMatch(
    sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n"),
    /createRefund|application_fee|stripe\.refunds/i,
  );
});

test("evaluator uses snapshot preference and notice hours (not live offers)", () => {
  const start = new Date("2026-08-20T18:00:00");
  const within = evaluatePackageCancellationPolicy({
    bookingStartAt: start,
    cancellationRequestedAt: new Date("2026-08-19T17:00:00"),
    policyCodeSnapshot: "standard",
    bookingPaymentSource: "package_credit",
    redemptionStatus: "reserved",
    bookingStatus: "confirmed",
  });
  assert.equal(within.eligibleForAutomaticCreditReturn, true);
  assert.equal(within.reason, "within_notice_window");
  assert.equal(within.noticeHours, 24);
  assert.equal(within.policyCode, "standard");

  const outside = evaluatePackageCancellationPolicy({
    bookingStartAt: start,
    cancellationRequestedAt: new Date("2026-08-20T10:00:00"),
    policyCodeSnapshot: "standard",
    bookingPaymentSource: "package_credit",
    redemptionStatus: "reserved",
    bookingStatus: "confirmed",
  });
  assert.equal(outside.eligibleForAutomaticCreditReturn, false);
  assert.equal(outside.reason, "outside_notice_window");

  const manual = evaluatePackageCancellationPolicy({
    bookingStartAt: start,
    cancellationRequestedAt: new Date("2026-08-01T10:00:00"),
    policyCodeSnapshot: "manual_review",
    bookingPaymentSource: "package_credit",
    redemptionStatus: "reserved",
    bookingStatus: "confirmed",
  });
  assert.equal(manual.eligibleForAutomaticCreditReturn, false);
  assert.equal(manual.requiresManualReview, true);
  assert.equal(manual.reason, "manual_policy");

  const completed = evaluatePackageCancellationPolicy({
    bookingStartAt: start,
    cancellationRequestedAt: new Date("2026-08-01T10:00:00"),
    policyCodeSnapshot: "standard",
    bookingPaymentSource: "package_credit",
    redemptionStatus: "completed",
    bookingStatus: "completed",
  });
  assert.equal(completed.eligibleForAutomaticCreditReturn, false);
  assert.equal(completed.reason, "already_completed");

  const missing = evaluatePackageCancellationPolicy({
    bookingStartAt: start,
    cancellationRequestedAt: new Date("2026-08-01T10:00:00"),
    policyCodeSnapshot: null,
    bookingPaymentSource: "package_credit",
    redemptionStatus: "reserved",
    bookingStatus: "confirmed",
  });
  assert.equal(missing.eligibleForAutomaticCreditReturn, true);
  assert.equal(missing.reason, "missing_policy_snapshot");

  const notPackage = evaluatePackageCancellationPolicy({
    bookingStartAt: start,
    cancellationRequestedAt: new Date("2026-08-01T10:00:00"),
    policyCodeSnapshot: "standard",
    bookingPaymentSource: "stripe",
    redemptionStatus: null,
    bookingStatus: "confirmed",
  });
  assert.equal(notPackage.reason, "not_package_credit");
  assert.equal(packageCancelPolicyUiHintFromEvaluation(manual), "manual");
  assert.equal(packageCancelPolicyUiHintFromEvaluation(within), "eligible");
  assert.equal(packageCancelPolicyUiHintFromEvaluation(outside), "outside_window");
});

test("evaluator module does not import teacher_offers live reads", () => {
  const src = read("lib/offers/cancellationPolicyEvaluation.ts");
  assert.doesNotMatch(src, /from\(["'].*teacher_offers/);
  assert.doesNotMatch(src, /\.from\(["']teacher_offers["']\)/);
});

test("feature flag defaults OFF", () => {
  const prev = process.env.ENABLE_OFFER_POLICY_ENFORCEMENT;
  delete process.env.ENABLE_OFFER_POLICY_ENFORCEMENT;
  assert.equal(isOfferPolicyEnforcementEnabled(), false);
  assert.equal(OFFER_POLICY_ENFORCEMENT_FLAG, "ENABLE_OFFER_POLICY_ENFORCEMENT");
  process.env.ENABLE_OFFER_POLICY_ENFORCEMENT = "true";
  assert.equal(isOfferPolicyEnforcementEnabled(), true);
  if (prev === undefined) delete process.env.ENABLE_OFFER_POLICY_ENFORCEMENT;
  else process.env.ENABLE_OFFER_POLICY_ENFORCEMENT = prev;
});

test("cancel route gates package restore with policy when flag ON", () => {
  const src = read("app/api/bookings/[id]/cancel/route.ts");
  assert.match(src, /isOfferPolicyEnforcementEnabled/);
  assert.match(src, /evaluatePackageCancellationPolicy/);
  assert.match(src, /forfeitPackageRedemptionForBooking/);
  assert.match(src, /reversePackageRedemptionForBooking/);
  assert.match(src, /teacher_offer_cancellation_preference_snapshot/);
  assert.match(src, /package_credit_not_restored|package_credit_manual_review/);
  assert.doesNotMatch(src, /from\(["']teacher_offers["']\)/);
  assert.doesNotMatch(src, /stripe\.refunds\.create|createRefund/);
});

test("paid Stripe path still uses attemptStripeBookingRefund unchanged for non-package", () => {
  const src = read("app/api/bookings/[id]/cancel/route.ts");
  assert.match(src, /attemptStripeBookingRefund/);
  assert.match(src, /else if \(decision\.kind === "open_manual_review"\)/);
});

test("decline still restores package credit (teacher reject)", () => {
  const src = read("app/api/bookings/[id]/decline/route.ts");
  assert.match(src, /reversePackageRedemptionForBooking/);
  assert.doesNotMatch(src, /forfeitPackageRedemptionForBooking/);
  assert.doesNotMatch(src, /isOfferPolicyEnforcementEnabled/);
});

test("outcome copy keys cover restore / not restored / manual", () => {
  assert.equal(copyKeyForOutcome("package_credit_restored", false), "cancelOutcomePackageCreditRestored");
  assert.equal(
    copyKeyForOutcome("package_credit_not_restored", false),
    "cancelOutcomePackageCreditNotRestored",
  );
  assert.equal(
    copyKeyForOutcome("package_credit_manual_review", false),
    "cancelOutcomePackageCreditManualReview",
  );
  for (const locale of ["fr", "en", "es"] as const) {
    const dict = JSON.parse(read(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    assert.ok(dict.cancelOutcomePackageCreditNotRestoredTitle);
    assert.ok(dict.cancelOutcomePackageCreditManualReviewBody);
    assert.ok(dict.cancelPackagePolicyEligibleHint);
    assert.doesNotMatch(dict.cancelOutcomePackageCreditNotRestoredBody, /Politique Pratiqo/i);
    assert.doesNotMatch(dict.cancelOutcomePackageCreditNotRestoredBody, /Garantie de remboursement Pratiqo/i);
    assert.match(dict.cancelPackagePolicyEligibleHint, /professeur|teacher|profesor/i);
  }
});

test("forfeitPackageRedemptionForBooking maps success without balance mutation claims", async () => {
  const result = await forfeitPackageRedemptionForBooking({
    admin: {
      rpc: async (fn, args) => {
        assert.equal(fn, "forfeit_package_redemption_for_booking");
        assert.equal(args.p_manual_review_required, true);
        return {
          data: {
            ok: true,
            forfeited: true,
            idempotent: false,
            booking_id: "11111111-1111-1111-1111-111111111111",
            redemption_id: "22222222-2222-2222-2222-222222222222",
            entitlement_id: "33333333-3333-3333-3333-333333333333",
            session_number: 1,
            redemption_status: "cancelled",
            remaining_sessions: 1,
            used_sessions: 1,
            entitlement_status: "active",
            manual_review_required: true,
          },
          error: null,
        };
      },
    },
    bookingId: "11111111-1111-1111-1111-111111111111",
    source: "student_cancelled",
    policyEvaluationResult: "manual_policy",
    creditReturnReason: "manual_policy",
    manualReviewRequired: true,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.forfeited, true);
    assert.equal(result.remainingSessions, 1);
    assert.equal(result.usedSessions, 1);
    assert.equal(result.redemptionStatus, "cancelled");
  }
});

test("reverse helper still used for eligible restores (atomic RPC)", async () => {
  const result = await reversePackageRedemptionForBooking({
    admin: {
      rpc: async (fn) => {
        assert.equal(fn, "reverse_package_redemption_for_booking");
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
    source: "student_cancelled",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.reversed, true);
    assert.equal(result.remainingSessions, 2);
    assert.equal(result.usedSessions, 0);
  }
});

test("forbidden file surfaces unchanged for checkout/commission/refund", () => {
  const resolve = read("lib/pricing/resolveBookingCheckoutPrice.ts");
  assert.doesNotMatch(resolve, /forfeitPackageRedemption|ENABLE_OFFER_POLICY_ENFORCEMENT/);
  const refunds = read("lib/payments/refunds.ts");
  assert.doesNotMatch(refunds, /forfeitPackageRedemption|evaluatePackageCancellationPolicy/);
  // Static: cancel route still does not invent new Stripe refund creation for packages.
  const cancel = read("app/api/bookings/[id]/cancel/route.ts");
  assert.doesNotMatch(cancel, /stripe\.refunds\.create/);
});

test("UI cancel dialog supports package policy hint; no employer wording", () => {
  const dialog = read("components/ConfirmCancelBookingDialog.tsx");
  assert.match(dialog, /packagePolicyHint/);
  assert.match(dialog, /cancelPackagePolicyEligibleHint/);
  const fr = read("lib/i18n/locales/fr.json");
  assert.doesNotMatch(fr, /Politique Pratiqo imposée/i);
  assert.doesNotMatch(fr, /Garantie de remboursement Pratiqo/i);
  assert.doesNotMatch(fr, /Nos forfaits Pratiqo/i);
  assert.match(fr, /conditions proposées par le professeur/);
});

test("admin payment source shows policy evaluation fields", () => {
  const src = read("components/admin/AdminPaymentSourceSection.tsx");
  assert.match(src, /packageRedemptionPolicyEvaluationResult/);
  assert.match(src, /cancellationPreferenceSnapshot/);
  assert.match(src, /adminPaymentSourcePackageManualReviewRequired/);
});

test("no public catalog / Mes formules introduced", () => {
  const dialog = read("components/ConfirmCancelBookingDialog.tsx");
  assert.doesNotMatch(dialog, /Mes formules|\bformules\b/i);
  const evalSrc = read("lib/offers/cancellationPolicyEvaluation.ts");
  assert.doesNotMatch(evalSrc, /Mes formules|\bformules\b/i);
});

async function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`ok - ${t.name}`);
    } catch (e) {
      failed += 1;
      console.error(`not ok - ${t.name}`);
      console.error(e);
    }
  }
  if (failed > 0) {
    console.error(`# ${failed}/${tests.length} failed`);
    process.exit(1);
  }
  console.log(`# ${tests.length} passed`);
}

void run();
