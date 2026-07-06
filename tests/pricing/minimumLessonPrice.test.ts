import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MIN_LESSON_PRICE_CENTS } from "@/lib/pricing/constants";
import {
  maxCreditsApplicableDollars,
  isLessonSessionBookable,
  payableAmountCents,
} from "@/lib/pricing/credits";
import {
  resolveIntroSessionPriceCents,
  validateEnabledIntroSessionOffer,
  validateTeacherLessonOffers,
} from "@/lib/pricing/lessonOffer";
import {
  validateMinimumLessonPrice,
  validateMinimumLessonPriceDollars,
} from "@/lib/pricing/validateMinimumLessonPrice";
import { minimumLessonPriceErrorMessage } from "@/lib/pricing/messages";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("server validator rejects price below 2000 cents", () => {
  assert.equal(validateMinimumLessonPrice(1999).ok, false);
  assert.equal(validateMinimumLessonPriceDollars(19.99).ok, false);
});

test("server validator accepts 2000 cents", () => {
  assert.equal(validateMinimumLessonPrice(2000).ok, true);
  assert.equal(validateMinimumLessonPriceDollars(20).ok, true);
  assert.equal(MIN_LESSON_PRICE_CENTS, 2000);
});

test("explicit intro price below 2000 cents is rejected", () => {
  const result = validateEnabledIntroSessionOffer({
    intro_session_enabled: true,
    price_per_lesson: 40,
    intro_session_price_cents: 1500,
  });
  assert.equal(result.ok, false);
});

test("missing explicit intro price is rejected when intro session is enabled", () => {
  const derived = resolveIntroSessionPriceCents({
    price_per_lesson: 20,
    intro_session_price_cents: null,
    intro_session_duration_minutes: 45,
    intro_session_discount_percent: 50,
  });
  assert.ok(derived < 2000);
  const result = validateEnabledIntroSessionOffer({
    intro_session_enabled: true,
    price_per_lesson: 20,
    intro_session_price_cents: null,
    intro_session_duration_minutes: 45,
    intro_session_discount_percent: 50,
  });
  assert.equal(result.ok, false);
});

test("missing intro price is accepted when intro session is disabled", () => {
  const result = validateEnabledIntroSessionOffer({
    intro_session_enabled: false,
    price_per_lesson: 20,
    intro_session_price_cents: null,
  });
  assert.equal(result.ok, true);
});

test("explicit intro price of 2000 cents is accepted", () => {
  const result = validateEnabledIntroSessionOffer({
    intro_session_enabled: true,
    price_per_lesson: 20,
    intro_session_price_cents: 2000,
  });
  assert.equal(result.ok, true);
});

test("credits are capped so payable never drops below 2000 cents", () => {
  const base = 25;
  const maxCredits = maxCreditsApplicableDollars(base, 100);
  assert.equal(maxCredits, 5);
  const payable = payableAmountCents(base, maxCredits);
  assert.equal(payable, 2000);
  assert.equal(validateMinimumLessonPrice(payable).ok, true);
});

test("legacy below-minimum session is not bookable and checkout final amount fails", () => {
  assert.equal(isLessonSessionBookable(15), false);
  assert.equal(maxCreditsApplicableDollars(15, 10), 0);
  const finalCents = payableAmountCents(15, 0);
  assert.equal(validateMinimumLessonPrice(finalCents).ok, false);
});

test("checkout-style final amount below minimum is rejected", () => {
  const grossCents = 2500;
  const creditCents = 600;
  const finalCents = grossCents - creditCents;
  assert.equal(finalCents, 1900);
  assert.equal(validateMinimumLessonPrice(finalCents).ok, false);
});

test("standard offer at 20/h passes session minimum", () => {
  const result = validateTeacherLessonOffers({ price_per_lesson: 20 });
  assert.equal(result.ok, true);
});

test("localized minimum price messages are present", () => {
  assert.match(minimumLessonPriceErrorMessage("fr"), /20 \$|20 \$/);
  assert.match(minimumLessonPriceErrorMessage("en"), /\$20/);
  assert.match(minimumLessonPriceErrorMessage("es"), /20 \$/);
  assert.doesNotMatch(minimumLessonPriceErrorMessage("en"), /TPS|TVQ|GST|QST/);
});

test("migration 059 defines NOT VALID minimum price constraints", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/059_teacher_minimum_lesson_prices.sql"),
    "utf8",
  );
  assert.match(sql, /teachers_price_per_lesson_minimum_chk/);
  assert.match(sql, /price_per_lesson IS NULL OR price_per_lesson >= 20/);
  assert.match(sql, /intro_session_price_cents IS NULL OR intro_session_price_cents >= 2000/);
  assert.match(sql, /NOT VALID/);
});

test("pricingCreditsMinPayable i18n keys exist in fr, en, es", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const json = JSON.parse(readFileSync(join(process.cwd(), `lib/i18n/locales/${locale}.json`), "utf8")) as Record<
      string,
      string
    >;
    assert.ok(json.pricingCreditsMinPayable?.includes("20"));
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[pricing:minimumLessonPrice] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
