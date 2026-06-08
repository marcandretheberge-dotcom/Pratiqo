import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function ok(name: string) {
  console.log(`ok - ${name}`);
}

const requiredDocs = [
  "docs/MOBILE_QA_CHECKLIST.md",
  "docs/app-store/APPLE_APP_STORE_METADATA_DRAFT.md",
  "docs/app-store/GOOGLE_PLAY_METADATA_DRAFT.md",
  "docs/app-store/PRIVACY_LABELS_AND_DATA_SAFETY_DRAFT.md",
  "docs/app-store/SCREENSHOT_AND_ASSET_PLAN.md",
  "docs/app-store/NATIVE_WRAPPER_READINESS_PLAN.md",
  "docs/app-store/assets/README.md",
];

for (const doc of requiredDocs) {
  assert.ok(existsSync(path.join(root, doc)), `${doc} exists`);
}
ok("mobile QA and app-store draft docs exist");

const combinedDocs = requiredDocs.map((doc) => `\n--- ${doc} ---\n${read(doc)}`).join("\n");

assert.match(combinedDocs, /iPhone small/i);
assert.match(combinedDocs, /Android large/i);
assert.match(combinedDocs, /installed PWA/i);
assert.match(combinedDocs, /Service worker bypasses private/i);
assert.match(combinedDocs, /module-5|module 5/i);
ok("mobile QA checklist covers required devices, PWA behavior, and YoPratiqo module 5");

assert.match(combinedDocs, /Apple In-App Purchase|Apple IAP/i);
assert.match(combinedDocs, /Google Play Billing/i);
assert.match(combinedDocs, /YoPratiqo paid module checkout: disabled/i);
assert.match(combinedDocs, /Membre Pro native subscription strategy is pending|Membre Pro subscription purchase: native strategy pending/i);
ok("native payment policy gates are documented");

assert.match(combinedDocs, /https:\/\/www\.pratiqo\.ca/);
assert.doesNotMatch(combinedDocs, /pratiqo\.com/i);
ok("docs use pratiqo.ca and avoid pratiqo.com");

assert.doesNotMatch(combinedDocs, /background checks? (?:are )?(?:completed|verified|performed)/i);
assert.doesNotMatch(combinedDocs, /criminal-background checks? (?:are )?(?:completed|verified|performed)/i);
assert.match(combinedDocs, /do not claim criminal-record verification/i);
ok("docs do not claim completed background checks");

assert.doesNotMatch(combinedDocs, /dance|martial arts/i);
ok("docs do not present unavailable launch categories as live");

assert.match(read("docs/app-store/APPLE_APP_STORE_METADATA_DRAFT.md"), /App name: Pratiqo/);
assert.match(read("docs/app-store/GOOGLE_PLAY_METADATA_DRAFT.md"), /Short Description/);
assert.match(read("docs/app-store/PRIVACY_LABELS_AND_DATA_SAFETY_DRAFT.md"), /Law 25/i);
assert.match(read("docs/app-store/SCREENSHOT_AND_ASSET_PLAN.md"), /Do not submit fake screenshots|Do not use fake/i);
assert.match(read("docs/app-store/NATIVE_WRAPPER_READINESS_PLAN.md"), /does not add Capacitor/i);
ok("store metadata, privacy, screenshot, and native-wrapper plans include launch warnings");

for (const icon of [
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-512-maskable.png",
]) {
  assert.ok(existsSync(path.join(root, icon)), `${icon} exists`);
}
assert.match(read("docs/app-store/assets/README.md"), /public\/icons\/icon-512\.png/);
ok("asset plan references existing PWA icon family");

const status = execSync("git status --porcelain -uall", { cwd: root, encoding: "utf8" });
const changed = status
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.replace(/^[ MADRCU?!]{1,2}\s+/, "").replace(/^"|"$/g, ""));

const ignoredUntracked = new Set([
  "Untitled",
  "docs/LAUNCH_READINESS_ANALYSIS.md",
  "pratiqo-legal-export-20260528-2221.zip",
]);

const allowed = new Set(requiredDocs.concat(["tests/ops/mobileQaAppStoreAssets.test.ts"]));
const restrictedPatterns = [
  /^app\/api\/stripe\//,
  /^app\/api\/.*checkout/i,
  /^lib\/payments\//,
  /^lib\/config\/membrePro\.ts$/,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^app\/yo\//,
  /^components\/yo\//,
  /^lib\/yo\//,
  /^public\/.*\.(?:mp3|wav|m4a)$/i,
  /^scripts\/generate-yopratiqo-audio\.ts$/,
  /openai/i,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /CourseJsonLd|CourseSchema/i,
];

for (const file of changed) {
  if (ignoredUntracked.has(file)) continue;
  assert.ok(allowed.has(file), `unexpected file touched by mobile QA/app-store task: ${file}`);
  for (const pattern of restrictedPatterns) {
    assert.ok(!pattern.test(file), `restricted system touched by mobile QA/app-store task: ${file}`);
  }
}
ok("mobile QA/app-store task is docs-and-test only and avoids restricted systems");

assert.doesNotMatch(combinedDocs, /sk_live_|pk_live_|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY/);
ok("docs do not include obvious secret tokens or env keys");

console.log("[ops:mobile-qa-app-store-assets] tests passed");
