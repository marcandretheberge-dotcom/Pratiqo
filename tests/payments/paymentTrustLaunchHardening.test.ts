import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isTeacherPayoutReadyForCheckout,
  teacherPayoutReadinessFailureReasons,
} from "@/lib/payments/connect";

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const checkoutSrc = read("app/api/stripe/checkout/route.ts");
const webhookSrc = read("app/api/stripe/webhook/route.ts");
const bookingModalSrc = read("components/BookingModal.tsx");
const verifiedBadgeSrc = read("components/VerifiedBadge.tsx");
const exploreSrc = read("components/Explore.tsx");
const fr = read("lib/i18n/locales/fr.json");
const en = read("lib/i18n/locales/en.json");
const es = read("lib/i18n/locales/es.json");
const packageJson = read("package.json");

test("teacher payout readiness blocks missing Stripe account", () => {
  assert.equal(
    isTeacherPayoutReadyForCheckout({
      stripe_account_id: null,
      stripe_connect_onboarding_complete: true,
      stripe_connect_charges_enabled: true,
      stripe_connect_payouts_enabled: true,
      stripe_connect_requirements_due: [],
      stripe_connect_disabled_reason: null,
    }),
    false,
  );
  assert.deepEqual(
    teacherPayoutReadinessFailureReasons({
      stripe_account_id: null,
      stripe_connect_onboarding_complete: true,
      stripe_connect_charges_enabled: true,
      stripe_connect_payouts_enabled: true,
      stripe_connect_requirements_due: [],
      stripe_connect_disabled_reason: null,
    }),
    ["missing_stripe_account"],
  );
});

test("teacher payout readiness blocks disabled payouts, charges, and due requirements", () => {
  const reasons = teacherPayoutReadinessFailureReasons({
    stripe_account_id: "acct_123",
    stripe_connect_onboarding_complete: false,
    stripe_connect_charges_enabled: false,
    stripe_connect_payouts_enabled: false,
    stripe_connect_requirements_due: ["external_account"],
    stripe_connect_disabled_reason: "requirements.past_due",
  });
  assert.deepEqual(reasons, [
    "onboarding_incomplete",
    "charges_disabled",
    "payouts_disabled",
    "requirements_due",
    "disabled_reason",
  ]);
});

test("teacher payout readiness allows fully ready Connect accounts", () => {
  assert.equal(
    isTeacherPayoutReadyForCheckout({
      stripe_account_id: "acct_ready",
      stripe_connect_onboarding_complete: true,
      stripe_connect_charges_enabled: true,
      stripe_connect_payouts_enabled: true,
      stripe_connect_requirements_due: [],
      stripe_connect_disabled_reason: null,
    }),
    true,
  );
});

test("checkout route blocks payout-not-ready teachers before Stripe session or ledger creation", () => {
  assert.match(checkoutSrc, /stripe_account_id/);
  assert.match(checkoutSrc, /stripe_connect_payouts_enabled/);
  assert.match(checkoutSrc, /isTeacherPayoutReadyForCheckout\(typed\)/);
  assert.match(checkoutSrc, /teacher_payout_not_ready/);

  const gateIndex = checkoutSrc.indexOf("isTeacherPayoutReadyForCheckout(typed)");
  const stripeSessionIndex = checkoutSrc.indexOf("stripe.checkout.sessions.create");
  const ledgerIndex = checkoutSrc.indexOf("await upsertUnpaidBookingPayment");

  assert.ok(gateIndex > 0, "payout readiness gate must exist");
  assert.ok(stripeSessionIndex > gateIndex, "Stripe Checkout Session must be created only after payout readiness");
  assert.ok(ledgerIndex > gateIndex, "payment ledger must be written only after payout readiness");
});

test("payout-not-ready error is safe and localized in FR EN ES", () => {
  assert.match(fr, /Ce professeur ne peut pas encore recevoir de paiements/);
  assert.match(en, /This teacher cannot receive payments yet/);
  assert.match(es, /Este profesor a.n no puede recibir pagos/);
  assert.doesNotMatch(fr + en + es, /stripe_account_id|charges_enabled|payouts_enabled|requirements_due/i);
});

test("production test-mode Stripe webhooks are rejected before mutation handlers", () => {
  const verifyIndex = webhookSrc.indexOf("stripe.webhooks.constructEvent");
  const rejectIndex = webhookSrc.indexOf("rejected test-mode event on production endpoint");
  const firstMutationHandlerIndex = webhookSrc.indexOf("if (event.type === \"payment_intent.succeeded\")");

  assert.match(webhookSrc, /function isProductionWebhookRuntime/);
  assert.match(webhookSrc, /isProductionWebhookRuntime\(\)\s*&&\s*event\.livemode\s*===\s*false/);
  assert.match(webhookSrc, /status:\s*400/);
  assert.ok(rejectIndex > verifyIndex, "livemode rejection must happen after signature verification");
  assert.ok(firstMutationHandlerIndex > rejectIndex, "livemode rejection must happen before any mutation handler");
});

test("non-production webhook compatibility remains explicit through environment helper", () => {
  assert.match(webhookSrc, /process\.env\.VERCEL_ENV/);
  assert.match(webhookSrc, /return vercelEnv === "production"/);
  assert.match(webhookSrc, /return process\.env\.NODE_ENV === "production"/);
});

test("booking confirm step displays honest first-lesson guarantee before payment", () => {
  const guaranteeIndex = bookingModalSrc.indexOf("booking-first-lesson-guarantee");
  const paymentNoteIndex = bookingModalSrc.indexOf("bookingPaymentNote", guaranteeIndex);
  const payButtonIndex = bookingModalSrc.indexOf("bookingPay", guaranteeIndex);

  assert.ok(guaranteeIndex > 0, "booking modal must render the guarantee before checkout");
  assert.ok(paymentNoteIndex > guaranteeIndex, "guarantee copy must appear before Stripe payment note");
  assert.ok(payButtonIndex > guaranteeIndex, "guarantee copy must appear before pay CTA");
  assert.match(bookingModalSrc, /LEGAL_ROUTES\.annulation/);
  assert.match(fr, /Nous examinerons la situation et pourrons aider selon notre politique/);
  assert.match(en, /We will review the situation and may help according to our policy/);
  assert.match(es, /Revisaremos la situaci.n y podremos ayudar seg.n nuestra pol.tica/);
});

test("guarantee copy avoids automatic or unconditional refund promises", () => {
  const frMessages = JSON.parse(fr) as Record<string, string>;
  const enMessages = JSON.parse(en) as Record<string, string>;
  const esMessages = JSON.parse(es) as Record<string, string>;
  const combined = [
    frMessages.bookingFirstLessonGuaranteeTitle,
    frMessages.bookingFirstLessonGuaranteeBody,
    enMessages.bookingFirstLessonGuaranteeTitle,
    enMessages.bookingFirstLessonGuaranteeBody,
    esMessages.bookingFirstLessonGuaranteeTitle,
    esMessages.bookingFirstLessonGuaranteeBody,
    bookingModalSrc,
  ].join("\n");
  assert.doesNotMatch(combined, /automatic refund|instant refund|unconditional refund/i);
  assert.doesNotMatch(combined, /remboursement automatique|remboursement instantan/i);
  assert.doesNotMatch(combined, /reembolso autom.tico|reembolso instant.neo/i);
});

test("trust copy no longer uses broad profile-verified labels without precision", () => {
  assert.match(verifiedBadgeSrc, /Identite verifiee/);
  assert.match(exploreSrc, /<VerifiedBadge verified=\{Boolean\(teacher\.identityVerified\)\}/);
  assert.match(fr, /"trustProfileVerified": "Identit. et .l.ments v.rifi.s"/);
  assert.match(en, /"trustProfileVerified": "Identity and items verified"/);
  assert.match(es, /"trustProfileVerified": "Identidad y elementos verificados"/);
  assert.doesNotMatch(fr, /"trustProfileVerified": "Profil v.rifi."/);
  assert.doesNotMatch(en, /"trustProfileVerified": "Profile verified"/);
  assert.doesNotMatch(es, /"trustProfileVerified": "Perfil verificado"/);
});

test("payment trust hardening suite is wired into test:payments", () => {
  assert.match(packageJson, /tests\/payments\/paymentTrustLaunchHardening\.test\.ts/);
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[payments:paymentTrustLaunchHardening] ${passed} tests passed`);
}
