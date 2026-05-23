import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const LOCALES = ["fr", "en", "es"] as const;
const ROOT = process.cwd();

/**
 * `JSON.parse` is destructive for duplicate-key detection: when a JSON object
 * has two entries with the same key, the parser silently keeps the last one.
 * That is exactly how `bookingSuccessViewReceipt` / `bookingSuccessReceiptHint`
 * sat duplicated in `fr.json` for weeks without our i18n parity check noticing.
 *
 * The dictionaries are formatted as a single flat object with 2-space
 * indentation (no nested objects, no arrays in the value position). Under
 * that contract, every top-level key sits on its own line, indented by
 * exactly two spaces. We exploit that to find every key by scanning the
 * raw text — independent of `JSON.parse`.
 */
function extractTopLevelKeysFromRawJson(raw: string): string[] {
  const keys: string[] = [];
  // Match lines like: `  "someKey":` at the start of a line (CRLF tolerant).
  const re = /^ {2}"((?:[^"\\]|\\.)+)"\s*:/gm;
  for (const match of raw.matchAll(re)) {
    keys.push(match[1]);
  }
  return keys;
}

function findDuplicates(keys: string[]): string[] {
  const seen = new Map<string, number>();
  for (const key of keys) {
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dupes: string[] = [];
  for (const [key, count] of seen) {
    if (count > 1) dupes.push(`${key} (×${count})`);
  }
  return dupes.sort();
}

test("each locale JSON file has no duplicate top-level keys", () => {
  for (const locale of LOCALES) {
    const path = resolve(ROOT, `lib/i18n/locales/${locale}.json`);
    const raw = readFileSync(path, "utf8");
    const keys = extractTopLevelKeysFromRawJson(raw);
    assert.ok(
      keys.length > 100,
      `${locale}.json key extraction returned only ${keys.length} keys; check formatting assumption`,
    );

    const duplicates = findDuplicates(keys);
    assert.deepEqual(
      duplicates,
      [],
      `${locale}.json contains duplicate top-level keys: ${duplicates.join(", ")}`,
    );
  }
});

test("dictionary key counts match between raw scan and JSON.parse", () => {
  // Sanity check: when there are no duplicates, the raw scan should match
  // the number of keys `JSON.parse` returns. If this ever diverges, either
  // the scan picked up a false-positive line (e.g. a value that looks like
  // a key) or there's a duplicate that JSON.parse silently collapsed.
  for (const locale of LOCALES) {
    const path = resolve(ROOT, `lib/i18n/locales/${locale}.json`);
    const raw = readFileSync(path, "utf8");
    const scanned = extractTopLevelKeysFromRawJson(raw);
    const parsed = Object.keys(JSON.parse(raw) as Record<string, unknown>);
    assert.equal(
      scanned.length,
      parsed.length,
      `${locale}.json: raw scan found ${scanned.length} keys but JSON.parse found ${parsed.length} — possible silent duplicate or nesting violation`,
    );
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[i18n:uniqueKeys] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
