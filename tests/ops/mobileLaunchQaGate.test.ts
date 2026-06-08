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

const reportPath = "docs/QA_MOBILE_LAUNCH_RESULTS.md";
assert.ok(existsSync(path.join(root, reportPath)), "QA result report exists");
const report = read(reportPath);

assert.match(report, /Simulated viewport QA/i);
assert.match(report, /Real-device QA still required/i);
assert.doesNotMatch(report, /real iPhone\/Android device testing was completed/i);
ok("report distinguishes simulated/local QA from real-device QA");

for (const route of [
  "/",
  "/student/search",
  "/upgrade",
  "/legal/annulation",
  "/legal/membre-pro",
  "/legal/yo-remboursement",
  "/legal/code-de-conduite",
  "/yo/langues/espagnol/pays/republique-dominicaine",
  "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
  "/offline",
  "/manifest.json",
  "/sw.js",
]) {
  assert.match(report, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
ok("report includes tested routes");

for (const viewport of [
  "iPhone SE",
  "iPhone 12/13/14",
  "Large Android",
  "iPad/tablet",
  "Desktop responsive",
]) {
  assert.match(report, new RegExp(viewport, "i"));
}
ok("report includes tested viewport profiles");

assert.match(report, /## Pass\/Fail Table/);
assert.match(report, /## Launch Blockers/);
assert.match(report, /PASS WITH FOLLOW-UP/);
ok("report includes pass/fail table, launch blockers, and final recommendation");

assert.ok(existsSync(path.join(root, "public/manifest.json")), "PWA manifest exists");
assert.ok(existsSync(path.join(root, "public/icons/icon-192.png")), "192 icon exists");
assert.ok(existsSync(path.join(root, "public/icons/icon-512.png")), "512 icon exists");
assert.ok(existsSync(path.join(root, "public/icons/icon-512-maskable.png")), "maskable icon exists");
assert.ok(existsSync(path.join(root, "app/offline/page.tsx")), "offline route exists");
ok("PWA manifest, icons, and offline route still exist");

const yoConfig = read("lib/yo/yopratiqoProductConfig.ts");
assert.match(yoConfig, /futurePremiumEnabled:\s*false/);
assert.match(yoConfig, /premiumModulesEnabled:\s*false/);
assert.match(yoConfig, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
ok("paid YoPratiqo checkout remains disabled");

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
  ".codex-dev-3211.err.log",
  ".codex-dev-3211.out.log",
]);

const allowed = new Set([
  reportPath,
  "tests/ops/mobileLaunchQaGate.test.ts",
]);

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
  assert.ok(allowed.has(file), `unexpected file touched by mobile launch QA gate: ${file}`);
  for (const pattern of restrictedPatterns) {
    assert.ok(!pattern.test(file), `restricted system touched by mobile launch QA gate: ${file}`);
  }
}
ok("QA branch avoids restricted systems");

console.log("[ops:mobile-launch-qa-gate] tests passed");
