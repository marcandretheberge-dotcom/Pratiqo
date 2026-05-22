import assert from "node:assert/strict";
import { convertCurrencyAmount } from "@/lib/currency/convert";
import { formatDisplayPrice } from "@/lib/currency/format";
import { normalizeCurrency } from "@/lib/currency/rates";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("CAD to CAD returns unchanged and not approximate", () => {
  const converted = convertCurrencyAmount(45, "CAD", "CAD");
  assert.deepEqual(converted, {
    amount: 45,
    sourceCurrency: "CAD",
    displayCurrency: "CAD",
    approximate: false,
    asOf: "2026-05-21",
  });
});

test("CAD to MXN returns an approximate converted amount", () => {
  const converted = convertCurrencyAmount(45, "CAD", "MXN");
  assert.equal(converted?.approximate, true);
  assert.equal(Math.round(converted?.amount ?? 0), 610);
});

test("CAD to UYU returns an approximate converted amount", () => {
  const converted = convertCurrencyAmount(45, "CAD", "UYU");
  assert.equal(converted?.approximate, true);
  assert.equal(Math.round(converted?.amount ?? 0), 1314);
});

test("invalid currency falls back safely to CAD", () => {
  assert.equal(normalizeCurrency("BAD", "CAD"), "CAD");
  const display = formatDisplayPrice({
    amount: 45,
    sourceCurrency: "CAD",
    displayCurrency: "BAD",
    locale: "en",
  });
  assert.equal(display.primary, "CAD 45");
  assert.equal(display.approximate, false);
});

test("converted formatting never labels a 45 CAD source as 45 MXN", () => {
  const display = formatDisplayPrice({
    amount: 45,
    sourceCurrency: "CAD",
    displayCurrency: "MXN",
    locale: "en",
  });

  assert.equal(display.approximate, true);
  assert.equal(display.original, "CAD 45");
  assert.notEqual(display.primary, "MXN 45");
  assert.match(display.primary, /MXN 610/);
});

test("original price remains available when converted", () => {
  const display = formatDisplayPrice({
    amount: 45,
    sourceCurrency: "CAD",
    displayCurrency: "USD",
    locale: "en",
  });

  assert.equal(display.approximate, true);
  assert.equal(display.original, "CAD 45");
  assert.match(display.primary, /USD 32\.85/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[currency:conversion] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
