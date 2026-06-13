import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const proCheckoutSrc = read("app/api/stripe/pro/checkout/route.ts");
const stripeWebhookSrc = read("app/api/stripe/webhook/route.ts");
const groupCheckoutSrc = read("app/api/group-sessions/checkout/route.ts");
const envExampleSrc = read(".env.example");

test("Membre Pro checkout rejects missing consent body before Stripe config is read", () => {
  assert.match(proCheckoutSrc, /renewalAccepted\s*!==\s*true/);
  assert.match(proCheckoutSrc, /legalAccepted\s*!==\s*true/);

  const consentGateIndex = proCheckoutSrc.indexOf("renewalAccepted !== true");
  const priceIdIndex = proCheckoutSrc.indexOf("STRIPE_PRO_MONTHLY_PRICE_ID");
  const stripeSessionIndex = proCheckoutSrc.indexOf("stripe.checkout.sessions.create");

  assert.ok(consentGateIndex >= 0, "renewal consent gate must exist");
  assert.ok(priceIdIndex > consentGateIndex, "price id lookup must happen after consent gate");
  assert.ok(stripeSessionIndex > consentGateIndex, "Stripe checkout must happen after consent gate");
});

test("Membre Pro checkout exposes stable consent error codes", () => {
  assert.match(proCheckoutSrc, /renewal_consent_required/);
  assert.match(proCheckoutSrc, /legal_acceptance_required/);
  assert.match(proCheckoutSrc, /RENEWAL_CONSENT_REQUIRED_ERROR_CODE/);
  assert.match(proCheckoutSrc, /LEGAL_ACCEPTANCE_REQUIRED_ERROR_CODE/);
});

test("Membre Pro checkout rejects renewalAccepted missing or false", () => {
  assert.match(proCheckoutSrc, /if\s*\(\s*renewalAccepted\s*!==\s*true\s*\)/);
  assert.doesNotMatch(
    proCheckoutSrc,
    /renewalAccepted\s*===\s*false/,
    "server must reject missing renewalAccepted too, not only explicit false",
  );
});

test("Membre Pro checkout rejects legalAccepted missing or false", () => {
  assert.match(proCheckoutSrc, /if\s*\(\s*legalAccepted\s*!==\s*true\s*\)/);
  assert.doesNotMatch(
    proCheckoutSrc,
    /legalAccepted\s*===\s*false/,
    "server must reject missing legalAccepted too, not only explicit false",
  );
});

test("Membre Pro checkout proceeds only after both consent flags are true", () => {
  const renewalGateIndex = proCheckoutSrc.indexOf("renewalAccepted !== true");
  const legalGateIndex = proCheckoutSrc.indexOf("legalAccepted !== true");
  const authIndex = proCheckoutSrc.indexOf("getAuthenticatedUser(req)");
  const sessionIndex = proCheckoutSrc.indexOf("stripe.checkout.sessions.create");

  assert.ok(renewalGateIndex >= 0);
  assert.ok(legalGateIndex > renewalGateIndex);
  assert.ok(authIndex > legalGateIndex, "auth and downstream work must happen after both gates");
  assert.ok(sessionIndex > legalGateIndex, "Stripe session creation must happen after both gates");
});

test("Stripe webhook logs event livemode after signature verification", () => {
  const verifyIndex = stripeWebhookSrc.indexOf("stripe.webhooks.constructEvent");
  const livemodeIndex = stripeWebhookSrc.indexOf("livemode: event.livemode");
  const handlerIndex = stripeWebhookSrc.indexOf("if (event.type === \"payment_intent.succeeded\")");

  assert.ok(verifyIndex >= 0);
  assert.ok(livemodeIndex > verifyIndex, "livemode must only be logged after signature verification");
  assert.ok(handlerIndex > livemodeIndex, "livemode logging must happen before webhook mutation handlers");
  assert.match(stripeWebhookSrc, /eventId:\s*event\.id/);
  assert.match(stripeWebhookSrc, /type:\s*event\.type/);
  assert.match(stripeWebhookSrc, /NODE_ENV\s*===\s*"production"[\s\S]+event\.livemode\s*===\s*false/);
});

test("Group-session checkout is disabled by default before Stripe or auth work", () => {
  assert.match(groupCheckoutSrc, /GROUP_SESSIONS_CHECKOUT_ENABLED/);
  assert.match(groupCheckoutSrc, /group_sessions_checkout_disabled/);

  const gateIndex = groupCheckoutSrc.indexOf("isGroupSessionsCheckoutEnabled()");
  const secretIndex = groupCheckoutSrc.indexOf("STRIPE_SECRET_KEY");
  const authIndex = groupCheckoutSrc.indexOf("authorization");
  const sessionIndex = groupCheckoutSrc.indexOf("stripe.checkout.sessions.create");

  assert.ok(gateIndex >= 0);
  assert.ok(secretIndex > gateIndex, "Stripe secret lookup must happen after launch gate");
  assert.ok(authIndex > gateIndex, "auth work must happen after launch gate");
  assert.ok(sessionIndex > gateIndex, "Stripe session creation must happen after launch gate");
});

test("Group-session checkout does not create Stripe sessions when disabled", () => {
  assert.match(groupCheckoutSrc, /if\s*\(\s*!isGroupSessionsCheckoutEnabled\(\)\s*\)/);
  assert.match(groupCheckoutSrc, /status:\s*403/);
  assert.match(envExampleSrc, /GROUP_SESSIONS_CHECKOUT_ENABLED=false/);
});

test("Stripe product and price ids remain env-driven, not hard-coded", () => {
  for (const [label, src] of [
    ["pro checkout", proCheckoutSrc],
    ["group checkout", groupCheckoutSrc],
    ["webhook", stripeWebhookSrc],
  ] as const) {
    assert.doesNotMatch(src, /\bprice_[A-Za-z0-9]{8,}/, `${label} must not hard-code Stripe price ids`);
    assert.doesNotMatch(src, /\bprod_[A-Za-z0-9]{8,}/, `${label} must not hard-code Stripe product ids`);
  }
  assert.match(proCheckoutSrc, /process\.env\.STRIPE_PRO_MONTHLY_PRICE_ID/);
  assert.match(proCheckoutSrc, /line_items:\s*\[\{\s*price:\s*priceId,\s*quantity:\s*1\s*\}\]/);
});

test("patch stays outside restricted systems", () => {
  const diffNameOnly = execFileSync("git", ["diff", "--name-only"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const allowed = new Set([
    ".env.example",
    "app/(app)/upgrade/page.tsx",
    "app/api/group-sessions/checkout/route.ts",
    "app/api/stripe/pro/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "components/teacher/TeacherAccountView.tsx",
    "lib/config/membrePro.ts",
    "lib/email.ts",
    "lib/email/messages/notifications.ts",
    "lib/email/templates/billing.ts",
    "lib/i18n/locales/en.json",
    "lib/i18n/locales/es.json",
    "lib/i18n/locales/fr.json",
    "tests/legal/founderDecisionsAlignment.test.ts",
    "tests/legal/safeDisclosures.test.ts",
    "tests/payments/membreProSubscriptionManagement.test.ts",
    "tests/payments/stripeProductionReadinessBlockers.test.ts",
    "tests/email/notifications.test.ts",
    "tests/teacherLaunch/teacherLaunchCenter.test.ts",
    "tests/yo/yopratiqoDominicanResponsiveLayout.test.ts",
    "tests/yo/yopratiqoAudioPronunciationOverrides.test.ts",
    // feat/membre-pro-public-checkout-link — public-link scaffold
    // (constant + gated component + contract test). The gate
    // stays closed (`isMembreProPublicCheckoutLinkEnabled()`
    // returns false) so production behaviour is unchanged. The
    // canonical authenticated /upgrade → /api/stripe/pro/checkout
    // flow is verified-untouched by the scaffold contract test.
    "lib/config/membreProPublicCheckoutLink.ts",
    "components/membrePro/MembreProPublicUpgradeCTA.tsx",
    "tests/membrePro/membreProPublicCheckoutLinkScaffold.test.ts",
  ]);

  for (const file of diffNameOnly) {
    assert.ok(allowed.has(file), `unexpected file touched by blocker patch: ${file}`);
  }
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
  console.log(`[payments:stripeProductionReadinessBlockers] ${passed} tests passed`);
}
