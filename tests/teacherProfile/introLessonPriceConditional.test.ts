import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateTeacherLessonOffers } from "@/lib/pricing/lessonOffer";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const verificationSrc = read("app/(app)/teacher/verification/page.tsx");
const accountSrc = read("components/teacher/TeacherAccountView.tsx");
const pricingRouteSrc = read("app/api/teacher/pricing/route.ts");

test("teacher can save the normal hourly rate when intro class is not offered and intro price is empty", () => {
  const result = validateTeacherLessonOffers({
    price_per_lesson: 35,
    intro_session_enabled: false,
    intro_session_price_cents: null,
  });
  assert.equal(result.ok, true);
});

test("intro price is required when intro class is offered", () => {
  const result = validateTeacherLessonOffers({
    price_per_lesson: 35,
    intro_session_enabled: true,
    intro_session_price_cents: null,
  });
  assert.equal(result.ok, false);
});

test("intro price must be positive and meet the lesson minimum when offered", () => {
  assert.equal(
    validateTeacherLessonOffers({
      price_per_lesson: 35,
      intro_session_enabled: true,
      intro_session_price_cents: 0,
    }).ok,
    false,
  );
  assert.equal(
    validateTeacherLessonOffers({
      price_per_lesson: 35,
      intro_session_enabled: true,
      intro_session_price_cents: 1500,
    }).ok,
    false,
  );
  assert.equal(
    validateTeacherLessonOffers({
      price_per_lesson: 35,
      intro_session_enabled: true,
      intro_session_price_cents: 2000,
    }).ok,
    true,
  );
});

test("intro price error clears when teacher unchecks the intro class option", () => {
  for (const src of [verificationSrc, accountSrc]) {
    assert.match(src, /if \(!checked\) \{/);
    assert.match(src, /setMessage\(null\)/);
  }
  assert.match(verificationSrc, /setEditIntroPrice\(""\)/);
  assert.match(accountSrc, /setIntroCustomPrice\(""\)/);
});

test("clients do not send an invalid empty intro price when intro class is off", () => {
  assert.match(verificationSrc, /let introPriceCents: number \| null = null/);
  assert.match(accountSrc, /let introPriceCents: number \| null = null/);
  assert.match(verificationSrc, /if \(draft\.introEnabled\) \{/);
  assert.match(accountSrc, /if \(introEnabled\) \{/);
});

test("intro price UI does not suggest auto pricing when explicit price is required", () => {
  assert.doesNotMatch(verificationSrc, /placeholder="\(auto\)"/);
  assert.doesNotMatch(accountSrc, /placeholder="\(auto\)"/);
  assert.match(verificationSrc, /introSessionPriceRequiredHint/);
});

test("pricing API clears stale intro price when intro class is disabled", () => {
  assert.match(pricingRouteSrc, /parsed\.data\.intro_session_enabled === false/);
  assert.match(pricingRouteSrc, /intro_session_price_cents:\s*null/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacher-profile:intro-lesson-price-conditional] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
