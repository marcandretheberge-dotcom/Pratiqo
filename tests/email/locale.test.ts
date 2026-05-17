import assert from "node:assert/strict";
import {
  EMAIL_FALLBACK_LOCALE,
  inferEmailLocaleFromRegion,
  resolveEmailLocale,
} from "@/lib/email/locale";
import { getBookingEmailCopy } from "@/lib/email/messages/booking";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("profile locale es wins over region", () => {
  assert.equal(
    resolveEmailLocale({ profileLocale: "es", countryCode: "CA", region: "ON" }),
    "es",
  );
});

test("Uruguay infers es", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "UY" }), "es");
  assert.equal(resolveEmailLocale({ countryCode: "UY" }), "es");
});

test("Ontario infers en", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "ON" }), "en");
  assert.equal(resolveEmailLocale({ countryCode: "CA", region: "Ontario" }), "en");
});

test("Québec infers fr", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "QC" }), "fr");
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "Québec" }), "fr");
  assert.equal(resolveEmailLocale({ countryCode: "CA", region: "Quebec" }), "fr");
});

test("unknown region falls back to fr", () => {
  assert.equal(resolveEmailLocale({}), EMAIL_FALLBACK_LOCALE);
  assert.equal(resolveEmailLocale({ countryCode: "FR" }), EMAIL_FALLBACK_LOCALE);
});

test("booking subject lines differ by locale", () => {
  const fr = getBookingEmailCopy("fr");
  const en = getBookingEmailCopy("en");
  const es = getBookingEmailCopy("es");

  assert.match(fr.confirmedStudent.subject("Marie"), /Cours réservé/);
  assert.match(en.confirmedStudent.subject("Marie"), /Lesson booked/);
  assert.match(es.confirmedStudent.subject("Marie"), /Clase reservada/);

  assert.match(fr.postClassReview.community, /communauté Pratiqo/);
  assert.doesNotMatch(fr.postClassReview.community, /\$1|1 \$/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[email:locale] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
