/**
 * Teacher pricing save — blank country defaults to launched market CA.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_LAUNCHED_TEACHER_COUNTRY_CODE,
  isTeacherMarketSupported,
  resolveTeacherMarketCountryCode,
} from "@/lib/config/markets";
import { DRAFT_TEACHER_ROW_INSERT } from "@/lib/teachers/ensureTeacherProfileRow";
import { validateMinimumLessonPriceDollars } from "@/lib/pricing/validateMinimumLessonPrice";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("price 35 meets minimum lesson price", () => {
  assert.equal(validateMinimumLessonPriceDollars(35).ok, true);
});

test("blank country resolves to launched market CA", () => {
  assert.equal(DEFAULT_LAUNCHED_TEACHER_COUNTRY_CODE, "CA");
  assert.deepEqual(resolveTeacherMarketCountryCode(null), {
    countryCode: "CA",
    defaultedFromBlank: true,
  });
  assert.deepEqual(resolveTeacherMarketCountryCode(""), {
    countryCode: "CA",
    defaultedFromBlank: true,
  });
  assert.deepEqual(resolveTeacherMarketCountryCode("  "), {
    countryCode: "CA",
    defaultedFromBlank: true,
  });
  assert.equal(isTeacherMarketSupported(resolveTeacherMarketCountryCode(null).countryCode), true);
});

test("explicit CA is not defaulted; unsupported stays unsupported", () => {
  assert.deepEqual(resolveTeacherMarketCountryCode("CA"), {
    countryCode: "CA",
    defaultedFromBlank: false,
  });
  assert.deepEqual(resolveTeacherMarketCountryCode("fr"), {
    countryCode: "FR",
    defaultedFromBlank: false,
  });
  assert.equal(isTeacherMarketSupported("FR"), false);
  assert.equal(isTeacherMarketSupported("UY"), false);
});

test("pricing route defaults blank country and persists CA on save", () => {
  const route = read("app/api/teacher/pricing/route.ts");
  assert.match(route, /resolveTeacherMarketCountryCode\(teacherCountryCode\)/);
  assert.match(route, /marketCountry\.defaultedFromBlank/);
  assert.match(route, /updates\.country_code\s*=\s*marketCountry\.countryCode/);
  assert.match(route, /isTeacherMarketSupported\(marketCountry\.countryCode\)/);
  assert.match(route, /marketNotSupportedPayload\(marketCountry\.countryCode\)/);
  assert.doesNotMatch(route, /stripe/i);
  assert.doesNotMatch(route, /is_public\s*===?\s*true/);
  assert.doesNotMatch(route, /profileComplete|isTeacherProfileComplete/);
});

test("pricing route returns structured error codes", () => {
  const route = read("app/api/teacher/pricing/route.ts");
  assert.match(route, /marketNotSupportedPayload/);
  assert.match(route, /code:\s*"unauthorized"/);
  assert.match(route, /code:\s*"teacher_not_found"/);
  assert.match(route, /code:\s*"validation_error"/);
  assert.match(route, /code:\s*"server_error"/);
});

test("verification UI maps market_not_supported instead of generic autosave only", () => {
  const page = read("app/(app)/teacher/verification/page.tsx");
  assert.match(page, /teacherPricingMarketNotSupported/);
  assert.match(page, /teacherPricingUnauthorized/);
  assert.match(page, /teacherPricingTeacherNotFound/);
  assert.match(page, /code === "market_not_supported"/);
  assert.match(page, /console\.warn\("\[teacher\/verification\] pricing_save_failed"/);
});

test("draft teacher insert defaults country_code to launched market", () => {
  assert.equal(DRAFT_TEACHER_ROW_INSERT.country_code, "CA");
  const src = read("lib/teachers/ensureTeacherProfileRow.ts");
  assert.match(src, /DEFAULT_LAUNCHED_TEACHER_COUNTRY_CODE/);
  assert.match(src, /resolveDraftCountryCode/);
  assert.doesNotMatch(src, /country_code:\s*null/);
});

test("i18n keys exist for pricing market error in FR/EN/ES", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const dict = JSON.parse(read(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    assert.ok(dict.teacherPricingMarketNotSupported?.length);
    assert.ok(dict.teacherPricingUnauthorized?.length);
    assert.ok(dict.teacherPricingTeacherNotFound?.length);
  }
  const fr = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
  assert.match(fr.teacherPricingMarketNotSupported, /pays/i);
  const en = JSON.parse(read("lib/i18n/locales/en.json")) as Record<string, string>;
  assert.match(en.teacherPricingMarketNotSupported, /country/i);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacherProfile:pricing-save] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
