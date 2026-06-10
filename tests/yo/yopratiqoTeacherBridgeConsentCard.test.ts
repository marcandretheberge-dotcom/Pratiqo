import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  assertSafeTeacherBridgeSummary,
  buildDominicanA1FoundationDemoSummary,
} from "@/lib/yopratiqo/teacherBridgeSummary";

/**
 * Visible bridge consent-card tests.
 *
 * These assertions guarantee that the YoPratiqo → Pratiqo teacher bridge
 * consent surface stays:
 *
 *   • locale-aware (FR / EN / ES) with no French-only hardcoding,
 *   • privacy-honest (raw quiz answers are never exposed),
 *   • opt-in (the checkbox is unchecked by default),
 *   • non-misleading (no real share is created in this PR — the card is
 *     mounted on `/yo` in coming-soon mode only),
 *   • free of the launch-critical restricted systems (Stripe, payments,
 *     tax, Supabase RLS / migrations, legal pages, Membre Pro commission,
 *     audio generation, sitemap/Course schema, and React Native).
 *
 * The 12 numbered assertions below mirror PART I of the launch brief.
 */

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

// ─────────────────────────────────────────────────────────────────────────
// Files under test
// ─────────────────────────────────────────────────────────────────────────

const consentCardPath = "components/yo/YoTeacherBridgeConsentCard.tsx";
const consentSectionPath = "components/yo/YoTeacherBridgeConsentSection.tsx";
const insightCardPath = "components/yo/TeacherLearningInsightCard.tsx";
const copyPath = "lib/yopratiqo/teacherBridgeCopy.ts";
const summaryPath = "lib/yopratiqo/teacherBridgeSummary.ts";
const yoHubPath = "app/yo/page.tsx";
const assetPlanPath = "docs/COMPANION_BRIDGE_ASSET_PLAN.md";
const productConfigPath = "lib/yo/yopratiqoProductConfig.ts";

for (const file of [consentCardPath, consentSectionPath, insightCardPath, copyPath, summaryPath, yoHubPath, assetPlanPath, productConfigPath]) {
  assert.ok(existsSync(path.join(root, file)), `expected file is missing: ${file}`);
}

const consentCard = read(consentCardPath);
const consentSection = read(consentSectionPath);
const insightCard = read(insightCardPath);
const copy = read(copyPath);
const summary = read(summaryPath);
const yoHub = read(yoHubPath);
const assetPlan = read(assetPlanPath);
const productConfig = read(productConfigPath);

// ─────────────────────────────────────────────────────────────────────────
// 1. student consent card component exists
// ─────────────────────────────────────────────────────────────────────────

assert.match(consentCard, /export function YoTeacherBridgeConsentCard\b/);
assert.match(consentCard, /YoTeacherBridgeConsentCardProps/);
assert.match(consentCard, /data-testid="yo-teacher-bridge-consent-card"/);
ok("1) student consent card component exists and exports YoTeacherBridgeConsentCard");

// ─────────────────────────────────────────────────────────────────────────
// 2. consent checkbox is not checked by default
// ─────────────────────────────────────────────────────────────────────────

// The component is fully controlled — `checked` is required, never given a
// truthy default. The mounting section MUST initialize the state to false.
assert.match(consentCard, /checked:\s*boolean/);
assert.doesNotMatch(
  consentCard,
  /checked\s*=\s*true/,
  "consent card must never default checked to true",
);
assert.match(
  consentSection,
  /useState\(\s*false\s*\)/,
  "the consent-card mount must initialize the controlled checked state to false",
);
ok("2) consent checkbox is not checked by default");

// ─────────────────────────────────────────────────────────────────────────
// 3. consent copy exists in FR / EN / ES (verbatim launch-brief strings)
// ─────────────────────────────────────────────────────────────────────────

const REQUIRED_FR_STRINGS = [
  "Apporter mes progrès YoPratiqo à ce cours",
  "Je consens à partager un résumé de mes progrès YoPratiqo avec ce professeur afin qu'il puisse personnaliser mon cours.",
  "Le professeur reçoit seulement un résumé utile. Les réponses brutes aux quiz ne sont pas partagées.",
  "Résumé YoPratiqo partagé par l'élève",
  "Pistes utiles pour le cours",
  "Compagnon d'apprentissage",
];
const REQUIRED_EN_STRINGS = [
  "Bring my YoPratiqo progress to this lesson",
  "I agree to share a summary of my YoPratiqo progress with this teacher so they can personalize my lesson.",
  "The teacher receives only a useful summary. Raw quiz answers are not shared.",
  "YoPratiqo summary shared by the student",
  "Useful lesson focus",
  "Learning companion",
];
const REQUIRED_ES_STRINGS = [
  "Llevar mi progreso de YoPratiqo a esta clase",
  "Acepto compartir un resumen de mi progreso de YoPratiqo con este profesor para que pueda personalizar mi clase.",
  "El profesor recibe solo un resumen útil. Las respuestas brutas de los cuestionarios no se comparten.",
  "Resumen de YoPratiqo compartido por el estudiante",
  "Enfoques útiles para la clase",
  "Compañero de aprendizaje",
];

for (const s of REQUIRED_FR_STRINGS) {
  assert.ok(copy.includes(s), `missing FR copy: ${s}`);
}
for (const s of REQUIRED_EN_STRINGS) {
  assert.ok(copy.includes(s), `missing EN copy: ${s}`);
}
for (const s of REQUIRED_ES_STRINGS) {
  assert.ok(copy.includes(s), `missing ES copy: ${s}`);
}
ok("3) consent + insight copy exists in FR / EN / ES verbatim");

// ─────────────────────────────────────────────────────────────────────────
// 4. privacy copy says raw quiz answers are not shared
// ─────────────────────────────────────────────────────────────────────────

assert.match(copy, /Les réponses brutes aux quiz ne sont pas partagées/);
assert.match(copy, /Raw quiz answers are not shared/);
assert.match(copy, /Las respuestas brutas de los cuestionarios no se comparten/);
ok("4) privacy copy explicitly says raw quiz answers are not shared (FR/EN/ES)");

// ─────────────────────────────────────────────────────────────────────────
// 5. teacher insight card component exists
// ─────────────────────────────────────────────────────────────────────────

assert.match(insightCard, /export function TeacherLearningInsightCard\b/);
assert.match(insightCard, /sharedByStudentConsent/);
ok("5) teacher insight card component exists and consumes sharedByStudentConsent");

// ─────────────────────────────────────────────────────────────────────────
// 6. teacher insight card has locked/empty state when consent is missing
// ─────────────────────────────────────────────────────────────────────────

// The locked branch must short-circuit BEFORE the data grid renders so
// the teacher can never accidentally see progress data when consent is
// missing. We assert both the early-return marker and the locked test id.
assert.match(insightCard, /if\s*\(\s*!hasConsent\s*\)/);
assert.match(insightCard, /data-testid="teacher-learning-insight-card-locked"/);
const lockedReturnIdx = insightCard.indexOf('data-testid="teacher-learning-insight-card-locked"');
const unlockedReturnIdx = insightCard.indexOf('data-testid="teacher-learning-insight-card-unlocked"');
assert.ok(lockedReturnIdx > 0, "locked branch must render an article with data-testid teacher-learning-insight-card-locked");
assert.ok(unlockedReturnIdx > 0, "unlocked branch must remain available with its own test id");
assert.ok(
  lockedReturnIdx < unlockedReturnIdx,
  "locked early-return must appear BEFORE the unlocked render so consent gates the data grid",
);
ok("6) teacher insight card renders an explicit locked state when consent is missing");

// ─────────────────────────────────────────────────────────────────────────
// 7. teacher insight card does not render raw quiz answers
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN = /rawQuiz|quizAnswers|quiz_answers|selectedOption|pickedOption|picked|correctOptionId|answerLog|incorrectAnswers|keystrokeHistory|audioAttempts/i;
assert.doesNotMatch(insightCard, RAW_QUIZ_PATTERN, "insight card source must not reference raw quiz fields");
assert.doesNotMatch(consentCard, RAW_QUIZ_PATTERN, "consent card source must not reference raw quiz fields");
assert.doesNotMatch(consentSection, RAW_QUIZ_PATTERN, "consent section source must not reference raw quiz fields");
assert.doesNotMatch(copy, RAW_QUIZ_PATTERN, "bridge copy source must not reference raw quiz fields");
ok("7) teacher insight card and consent surfaces do not reference raw quiz answer fields");

// ─────────────────────────────────────────────────────────────────────────
// 8. summary builder only returns safe summary fields
// ─────────────────────────────────────────────────────────────────────────

// Source-scan the summary file: the builder must use the
// YoPratiqoProgressSummary type and export the runtime guard.
//
// Note: the summary file legitimately lists forbidden keys as string
// literals inside `FORBIDDEN_TEACHER_BRIDGE_FIELDS` (the deny-list the
// runtime guard checks against). We therefore do NOT run RAW_QUIZ_PATTERN
// against this file — the runtime check below is the real privacy gate.
assert.match(summary, /export function buildDemoTeacherBridgeSummary\b/);
assert.match(summary, /YoPratiqoProgressSummary/);
assert.match(summary, /export function assertSafeTeacherBridgeSummary\b/);
assert.match(summary, /FORBIDDEN_TEACHER_BRIDGE_FIELDS/, "summary file must export a deny-list constant for transparency");

// Runtime sanity check: importing the builder synchronously (top-level
// import) and asserting that the returned object only contains the
// documented top-level keys. This proves at runtime what the source-scan
// above proves statically.
const builtSummary = buildDominicanA1FoundationDemoSummary();
const ALLOWED_SUMMARY_KEYS = new Set([
  "product",
  "discipline",
  "courseTitle",
  "completedModules",
  "currentLevel",
  "strengths",
  "difficultyTags",
  "suggestedTeacherFocus",
  "lastActivityDate",
  "companion",
  "consentState",
]);
for (const key of Object.keys(builtSummary)) {
  assert.ok(ALLOWED_SUMMARY_KEYS.has(key), `unexpected key in safe summary: ${key}`);
}
assertSafeTeacherBridgeSummary(builtSummary);
assert.throws(() => {
  assertSafeTeacherBridgeSummary({ ...builtSummary, rawQuiz: ["forbidden"] });
}, /forbidden raw-data key/);
ok("8) summary builder returns only safe summary fields and the runtime guard rejects forbidden keys");

// ─────────────────────────────────────────────────────────────────────────
// 9. companion bridge asset plan exists and says not to crop from poster
// ─────────────────────────────────────────────────────────────────────────

assert.match(assetPlan, /companion/i);
assert.match(
  assetPlan,
  /do not crop the production companion asset from a poster/i,
  "asset plan must explicitly forbid cropping the companion from a poster",
);
assert.match(assetPlan, /transparent PNG/i, "asset plan must require transparent PNG exports");
assert.match(assetPlan, /alt text/i, "asset plan must require alt text");
ok("9) companion bridge asset plan exists and explicitly says not to crop from poster");

// ─────────────────────────────────────────────────────────────────────────
// 10. no paid YoPratiqo checkout enabled
// ─────────────────────────────────────────────────────────────────────────

assert.match(productConfig, /premiumModulesEnabled:\s*false/);
assert.match(productConfig, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
// The visible-bridge PR must not introduce any Stripe / checkout reference
// in the new component or copy files.
const STRIPE_PATTERN = /\bstripe\b|\bcheckout\b|\bprice_id\b|STRIPE_/i;
for (const [name, src] of [
  ["consent card", consentCard],
  ["consent section", consentSection],
  ["consent copy", copy],
  ["summary builder", summary],
  ["insight card", insightCard],
] as const) {
  assert.doesNotMatch(src, STRIPE_PATTERN, `${name} must not reference Stripe/checkout/price_id`);
}
ok("10) paid YoPratiqo checkout remains disabled and no Stripe/checkout reference was introduced");

// ─────────────────────────────────────────────────────────────────────────
// 11. no Stripe/payment/tax/Supabase RLS/legal/Membre Pro commission/audio/SEO files touched
// ─────────────────────────────────────────────────────────────────────────

const restrictedPathPatterns = [
  /^app\/api\/stripe\//,
  /^app\/api\/.*checkout/i,
  /^app\/api\/.*payment/i,
  /^lib\/payments\//,
  /^lib\/pricing\//,
  /^lib\/config\/membrePro\.ts$/,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^public\/.*\.mp3$/i,
  /^scripts\/(generate-yopratiqo-audio|.*openai)/i,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /CourseJsonLd|CourseSchema|yopratiqoSeo/i,
];

const status = execSync("git status --porcelain -uall", { cwd: root, encoding: "utf8" });
const changedFiles = status
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.replace(/^[ MADRCU?!]{1,2}\s+/, "").replace(/^"|"$/g, ""));

const ignoredUntracked = new Set([
  "Untitled",
  "docs/LAUNCH_READINESS_ANALYSIS.md",
  "pratiqo-legal-export-20260528-2221.zip",
]);

for (const file of changedFiles) {
  if (ignoredUntracked.has(file)) continue;
  for (const pattern of restrictedPathPatterns) {
    assert.ok(!pattern.test(file), `restricted system touched by visible bridge consent card PR: ${file}`);
  }
}
ok("11) no restricted systems (Stripe / payments / tax / RLS / migrations / legal / commission / audio / SEO) touched");

// ─────────────────────────────────────────────────────────────────────────
// 12. no React Native app code added
// ─────────────────────────────────────────────────────────────────────────

const reactNativePathPatterns = [
  /^apps\/mobile\//,
  /^apps\/native\//,
  /^mobile\//,
  /\bApp\.native\.tsx$/,
  /^ios\//,
  /^android\//,
];
for (const file of changedFiles) {
  if (ignoredUntracked.has(file)) continue;
  for (const pattern of reactNativePathPatterns) {
    assert.ok(!pattern.test(file), `unexpected React Native path touched: ${file}`);
  }
}

// Source-scan for React Native imports that would betray a real RN app.
const RN_IMPORT_PATTERN = /from\s+["']react-native["']|from\s+["']expo["']/;
for (const [name, src] of [
  ["consent card", consentCard],
  ["consent section", consentSection],
  ["consent copy", copy],
  ["summary builder", summary],
  ["insight card", insightCard],
] as const) {
  assert.doesNotMatch(src, RN_IMPORT_PATTERN, `${name} must not import from react-native/expo`);
}
ok("12) no React Native app code or imports were added by this PR");

console.log("[yo:teacher-bridge-consent-card] tests passed");
