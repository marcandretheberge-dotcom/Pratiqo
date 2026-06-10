import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

const bridgeTypesPath = "lib/yopratiqo/teacherBridge.ts";
const insightCardPath = "components/yo/TeacherLearningInsightCard.tsx";
const teaserPath = "components/yo/YoTeacherBridgeTeaser.tsx";
const yoHubPath = "app/yo/page.tsx";
const assetPlanPath = "docs/COMPANION_BRIDGE_ASSET_PLAN.md";
const architecturePath = "docs/YOPRATIQO_TEACHER_BRIDGE_ARCHITECTURE.md";

assert.ok(existsSync(path.join(root, bridgeTypesPath)), "bridge types file exists");
const bridgeTypes = read(bridgeTypesPath);
for (const typeName of [
  "LearningSkillTag",
  "LearningDifficultyTag",
  "YoPratiqoProgressSummary",
  "CompanionBridgeSummary",
  "TeacherLearningInsight",
  "LearningShareConsentState",
]) {
  assert.match(bridgeTypes, new RegExp(`export type ${typeName}\\b`), `${typeName} must be exported`);
}
assert.match(bridgeTypes, /product:\s*"YoPratiqo"/);
assert.match(bridgeTypes, /completedModules:\s*string\[\]/);
assert.match(bridgeTypes, /currentLevel:\s*string/);
assert.match(bridgeTypes, /strengths:\s*LearningSkillTag\[\]/);
assert.match(bridgeTypes, /difficultyTags:\s*LearningDifficultyTag\[\]/);
assert.match(bridgeTypes, /suggestedTeacherFocus:\s*string\[\]/);
assert.match(bridgeTypes, /lastActivityDate:\s*string \| null/);
assert.match(bridgeTypes, /companion:\s*CompanionBridgeSummary \| null/);
assert.match(bridgeTypes, /consentState:\s*LearningShareConsentState/);
ok("bridge types exist with the required summary fields");

assert.ok(existsSync(path.join(root, insightCardPath)), "teacher insight component exists");
const insightCard = read(insightCardPath);
assert.match(insightCard, /export function TeacherLearningInsightCard/);
assert.match(insightCard, /sharedByStudentConsent/);
assert.match(insightCard, /isTeacherBridgeConsentGranted/);
assert.match(insightCard, /completedModules/);
assert.match(insightCard, /strengths/);
assert.match(insightCard, /difficultyTags/);
assert.match(insightCard, /suggestedTeacherFocus/);
assert.match(insightCard, /companionName/);
assert.doesNotMatch(
  insightCard,
  /rawQuiz|quizAnswers|quiz_answers|selectedOption|pickedOption|picked|correctOptionId|answerLog/i,
  "teacher insight component must not render raw quiz-answer fields",
);
ok("teacher insight component renders safe summary only");

for (const expected of [
  "Partager mes progrès YoPratiqo avec ce professeur afin qu'il puisse personnaliser mon cours.",
  "Share my YoPratiqo progress with this teacher so they can personalize my lesson.",
  "Compartir mi progreso de YoPratiqo con este profesor para que pueda personalizar mi clase.",
]) {
  assert.ok(bridgeTypes.includes(expected), `missing consent copy: ${expected}`);
}
assert.match(bridgeTypes, /\|\s*"not_requested"/);
assert.match(bridgeTypes, /status === "granted"/);
ok("consent copy and consent state are defined in FR / EN / ES");

assert.ok(existsSync(path.join(root, teaserPath)), "student bridge teaser component exists");
const teaser = read(teaserPath);
const yoHub = read(yoHubPath);
assert.match(teaser, /YO_TEACHER_BRIDGE_COMING_SOON_COPY/);
assert.ok(bridgeTypes.includes("Nothing is shared automatically."));
assert.ok(bridgeTypes.includes("Rien n'est partagé automatiquement."));
assert.ok(bridgeTypes.includes("Nada se comparte automáticamente."));
assert.match(teaser, /getTeacherBridgeConsentCopy/);
assert.match(teaser, /href="\/trouver-un-prof"/);
assert.match(yoHub, /YoTeacherBridgeTeaser/);
ok("student-facing bridge teaser is mounted without pretending persistence exists");

assert.ok(existsSync(path.join(root, assetPlanPath)), "companion asset plan exists");
const assetPlan = read(assetPlanPath);
for (const required of [
  /current YoPratiqo advertisement is the official style reference/i,
  /do not crop the production companion asset from a poster/i,
  /idle/i,
  /map/i,
  /confused/i,
  /celebrating/i,
  /teacher-ready/i,
  /level-up/i,
  /inactive/i,
  /badge-unlocked/i,
  /transparent PNG/i,
  /Rive or Lottie/i,
  /React Native compatibility/i,
  /No text baked into companion images/i,
  /alt text/i,
]) {
  assert.match(assetPlan, required);
}
ok("companion asset plan covers source, states, exports, accessibility, and React Native");

assert.ok(existsSync(path.join(root, architecturePath)), "bridge architecture doc exists");
const architecture = read(architecturePath);
for (const required of [
  /event-ledger architecture/i,
  /shared API contract/i,
  /Consent-Based Sharing/i,
  /companion profile as portable|portable companion asset ids/i,
  /React Native/i,
  /same APIs and event schema/i,
  /Raw learning events are private/i,
  /Teachers receive a summarized insight only after explicit learner consent/i,
  /Teachers should not see:[\s\S]*raw quiz answers/i,
  /does not enable paid checkout/i,
]) {
  assert.match(architecture, required);
}
ok("architecture doc defines consent, summary-only sharing, and future native app contract");

const productConfig = read("lib/yo/yopratiqoProductConfig.ts");
assert.match(productConfig, /premiumModulesEnabled:\s*false/);
assert.match(productConfig, /futurePremiumEnabled:\s*false/);
assert.match(productConfig, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
assert.doesNotMatch(yoHub + teaser + insightCard + bridgeTypes, /stripe|checkout|price_id|STRIPE/i);
ok("paid YoPratiqo checkout remains disabled and untouched");

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

const allowed = new Set([
  bridgeTypesPath,
  insightCardPath,
  teaserPath,
  yoHubPath,
  assetPlanPath,
  architecturePath,
  // Follow-up architecture foundation: typed event ledger, final challenge
  // contracts, deterministic companion growth, and docs only. No runtime
  // sharing, persistence, checkout, audio generation, or teacher dashboard
  // workflow is enabled by these files.
  "lib/yopratiqo/learningEvents.ts",
  "lib/yopratiqo/moduleChallenge.ts",
  "lib/companion/companionGrowth.ts",
  "docs/PRATIQO_CREDITS_ARCHITECTURE.md",
  "docs/TEACHER_LEARNING_SUMMARY_EFFECTIVENESS.md",
  "tests/legal/safeDisclosures.test.ts",
  "tests/yo/yopratiqoLearningEventLedger.test.ts",
  "tests/yo/yopratiqoTeacherBridgeFoundation.test.ts",
  // Visible bridge consent card PR. Adds the student-facing consent UI,
  // teacher-facing locked/empty insight state, and a deterministic safe
  // summary builder. No runtime persistence, no checkout, no Stripe, no
  // RLS, no audio generation. The card is mounted on the YoPratiqo hub
  // in coming-soon mode only.
  "lib/yopratiqo/teacherBridgeCopy.ts",
  "lib/yopratiqo/teacherBridgeSummary.ts",
  "components/yo/YoTeacherBridgeConsentCard.tsx",
  "components/yo/YoTeacherBridgeConsentSection.tsx",
  "tests/yo/yopratiqoTeacherBridgeConsentCard.test.ts",
]);

const restrictedPatterns = [
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
  /^scripts\/.*(openai|generate-yopratiqo-audio)/i,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /CourseJsonLd|CourseSchema|yopratiqoSeo/i,
];

for (const file of changed) {
  if (ignoredUntracked.has(file)) continue;
  assert.ok(allowed.has(file), `unexpected file touched by teacher bridge foundation: ${file}`);
  for (const pattern of restrictedPatterns) {
    assert.ok(!pattern.test(file), `restricted system touched by teacher bridge foundation: ${file}`);
  }
}
ok("teacher bridge foundation touches no restricted systems");

console.log("[yo:teacher-bridge-foundation] tests passed");
