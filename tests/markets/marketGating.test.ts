import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MEMBRE_PRO_COMMISSION_MODEL,
  MEMBRE_PRO_PLAN,
} from "@/lib/config/membrePro";
import {
  PRATIQO_MARKETS,
  getMarketByCountryCode,
  isMembreProMarketSupported,
  isPayoutMarketSupported,
  isTeacherMarketSupported,
} from "@/lib/config/markets";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const onboardingPage = read("app/(app)/onboarding/teacher/page.tsx");
const onboardingCompleteRoute = read("app/api/teacher/onboarding/complete/route.ts");
const pricingRoute = read("app/api/teacher/pricing/route.ts");
const proCheckoutRoute = read("app/api/stripe/pro/checkout/route.ts");
const connectRoute = read("app/api/stripe/connect/route.ts");
const visibilityRoute = read("app/api/teacher/profile/visibility/route.ts");
const locationRoute = read("app/api/teacher/location/verify/route.ts");
const marketWaitlistCard = read("components/MarketWaitlistCard.tsx");
const accountView = read("components/teacher/TeacherAccountView.tsx");
const upgradePage = read("app/(app)/upgrade/page.tsx");
const fr = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
const en = JSON.parse(read("lib/i18n/locales/en.json")) as Record<string, string>;
const es = JSON.parse(read("lib/i18n/locales/es.json")) as Record<string, string>;

test("Canada is the only launched teacher monetization market", () => {
  assert.equal(PRATIQO_MARKETS.CA.marketCode, "CA");
  assert.equal(PRATIQO_MARKETS.CA.countryCode, "CA");
  assert.equal(PRATIQO_MARKETS.CA.status, "launched");
  assert.equal(PRATIQO_MARKETS.CA.isTeacherOnboardingEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.isStudentBookingEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.isMembreProEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.isPayoutEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.currency, "CAD");
});

test("Uruguay exists only as inactive waitlist market", () => {
  assert.equal(PRATIQO_MARKETS.UY.marketCode, "UY");
  assert.equal(PRATIQO_MARKETS.UY.status, "waitlist");
  assert.equal(PRATIQO_MARKETS.UY.isTeacherOnboardingEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.isStudentBookingEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.isMembreProEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.isPayoutEnabled, false);
  assert.deepEqual(PRATIQO_MARKETS.UY.commissionModel, {
    status: "inactive_placeholder",
    note:
      "Uruguay is configured for future market planning only. No Uruguay commission or Pro pricing is active.",
  });
});

test("unknown countries are unsupported by default", () => {
  assert.equal(getMarketByCountryCode("FR"), null);
  assert.equal(isTeacherMarketSupported("FR"), false);
  assert.equal(isMembreProMarketSupported("US"), false);
  assert.equal(isPayoutMarketSupported("UY"), false);
});

test("Canada commission and Membre Pro price remain unchanged", () => {
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.startPercent, 10);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.bestPercent, 7);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent, 5);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.bestPercent, 3.5);
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCad, 29);
  assert.strictEqual(PRATIQO_MARKETS.CA.commissionModel, MEMBRE_PRO_COMMISSION_MODEL);
});

test("teacher onboarding is blocked outside Canada before completion", () => {
  assert.match(onboardingPage, /isTeacherMarketSupported\(publicCountry\)/);
  assert.match(onboardingPage, /marketTeacherUnavailableMessage/);
  assert.match(onboardingCompleteRoute, /isTeacherMarketSupported\(teacherCountryCode\)/);
  assert.match(onboardingCompleteRoute, /marketNotSupportedPayload\(teacherCountryCode\)/);
});

test("monetized teacher offers are blocked outside Canada", () => {
  assert.match(pricingRoute, /isTeacherMarketSupported\(teacherCountryCode\)/);
  assert.match(pricingRoute, /marketNotSupportedPayload\(teacherCountryCode\)/);
  assert.match(locationRoute, /isTeacherMarketSupported\(countryCode\)/);
});

test("public teacher publishing is blocked outside Canada", () => {
  assert.match(visibilityRoute, /body\.is_public && !isTeacherMarketSupported\(teacherCountryCode\)/);
  assert.match(accountView, /\/api\/teacher\/profile\/visibility/);
  assert.match(accountView, /marketTeacherUnavailableMessage/);
});

test("Membre Pro checkout is blocked before creating a Stripe subscription", () => {
  const gateIndex = proCheckoutRoute.indexOf("isMembreProMarketSupported(teacherCountryCode)");
  const stripeIndex = proCheckoutRoute.indexOf("stripe.checkout.sessions.create");
  assert.ok(gateIndex > -1 && stripeIndex > -1 && gateIndex < stripeIndex);
  assert.match(upgradePage, /isMembreProMarketSupported\(teacherCountryCode\)/);
  assert.match(accountView, /marketMembreProUnavailableMessage/);
});

test("Stripe Connect payout onboarding is blocked before account creation", () => {
  const gateIndex = connectRoute.indexOf("isPayoutMarketSupported(teacherCountryCode)");
  const accountCreateIndex = connectRoute.indexOf("stripe.accounts.create");
  const accountLinkIndex = connectRoute.indexOf("stripe.accountLinks.create");
  assert.ok(gateIndex > -1 && accountCreateIndex > -1 && gateIndex < accountCreateIndex);
  assert.ok(gateIndex > -1 && accountLinkIndex > -1 && gateIndex < accountLinkIndex);
  assert.match(accountView, /marketPayoutUnavailableMessage/);
});

test("unsupported-market messages exist in FR/EN/ES", () => {
  for (const [locale, dict] of [
    ["fr", fr],
    ["en", en],
    ["es", es],
  ] as const) {
    for (const key of [
      "marketTeacherUnavailableMessage",
      "marketMembreProUnavailableMessage",
      "marketPayoutUnavailableMessage",
    ]) {
      assert.ok(dict[key]?.length > 40, `${locale}.${key} must exist`);
    }
  }
  assert.match(fr.marketTeacherUnavailableMessage, /Canada/);
  assert.match(en.marketTeacherUnavailableMessage, /Canada/);
  assert.match(es.marketTeacherUnavailableMessage, /Canad[aá]/i);
});

test("unsupported markets reuse the existing waitlist endpoint", () => {
  assert.match(marketWaitlistCard, /fetch\("\/api\/waitlist"/);
  assert.match(marketWaitlistCard, /market_access_\$\{role\}_\$\{safeCountry\}/);
  assert.match(onboardingPage, /<MarketWaitlistCard/);
  assert.match(accountView, /<MarketWaitlistCard/);
  assert.match(upgradePage, /<MarketWaitlistCard/);
});

test("no active UI copy presents Uruguay as launched", () => {
  assert.doesNotMatch(onboardingPage, /Uruguay|UYU/);
  assert.doesNotMatch(upgradePage, /Uruguay|UYU/);
  assert.doesNotMatch(accountView, /Uruguay|UYU/);
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[markets:gating] ${tests.length} tests passed`);
}

void run();
