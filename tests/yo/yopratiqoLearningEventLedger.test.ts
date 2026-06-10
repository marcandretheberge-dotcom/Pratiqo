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

const learningEventsPath = "lib/yopratiqo/learningEvents.ts";
const challengePath = "lib/yopratiqo/moduleChallenge.ts";
const companionGrowthPath = "lib/companion/companionGrowth.ts";
const creditsDocPath = "docs/PRATIQO_CREDITS_ARCHITECTURE.md";
const teacherSummaryDocPath = "docs/TEACHER_LEARNING_SUMMARY_EFFECTIVENESS.md";
const testPath = "tests/yo/yopratiqoLearningEventLedger.test.ts";

for (const file of [
  learningEventsPath,
  challengePath,
  companionGrowthPath,
  creditsDocPath,
  teacherSummaryDocPath,
]) {
  assert.ok(existsSync(path.join(root, file)), `${file} exists`);
}

const learningEvents = read(learningEventsPath);
for (const eventType of [
  "yo_module_started",
  "yo_lesson_completed",
  "yo_flashcard_reviewed",
  "yo_quiz_completed",
  "yo_final_challenge_completed",
  "yo_printable_opened",
  "yo_audio_practiced",
  "marketplace_lesson_booked",
  "marketplace_lesson_completed",
  "teacher_feedback_received",
  "homework_completed",
  "companion_xp_awarded",
  "companion_level_up",
  "companion_badge_unlocked",
  "pratiqo_credit_earned",
  "pratiqo_credit_spent",
]) {
  assert.ok(learningEvents.includes(`"${eventType}"`), `missing event type ${eventType}`);
}
for (const required of [
  /userId:\s*string/,
  /sourceProduct:\s*LearningEventSourceProduct/,
  /subjectArea\?:\s*string \| null/,
  /discipline\?:\s*string \| null/,
  /courseId\?:\s*string \| null/,
  /moduleId\?:\s*string \| null/,
  /bookingId\?:\s*string \| null/,
  /skillTags:\s*LearningSkillTag\[\]/,
  /difficultyTags:\s*LearningDifficultyTag\[\]/,
  /scoreSummary\?:\s*LearningScoreSummary \| null/,
  /metadata\?:\s*SafeLearningEventMetadata/,
  /createdAt:\s*string/,
]) {
  assert.match(learningEvents, required);
}
assert.doesNotMatch(learningEvents, /rawQuiz|quizAnswers|selectedOption|pickedOption|correctOptionId|answerLog/i);
ok("learning event ledger types exist with safe summary fields only");

const challenge = read(challengePath);
for (const typeName of [
  "ModuleChallenge",
  "ModuleChallengeSection",
  "ModuleChallengeResult",
  "SkillScore",
  "TeacherReadyRecommendation",
]) {
  assert.match(challenge, new RegExp(`export type ${typeName}\\b`), `${typeName} must be exported`);
}
for (const challengeKind of [
  "verb_forms",
  "singular_plural",
  "grammar_pattern",
  "reading_comprehension",
  "listening_comprehension",
  "scenario_response",
  "writing_prompt",
  "kana_script_recognition",
  "particles",
  "polite_form",
  "short_reading",
  "pinyin_tone_awareness",
  "character_recognition",
  "measure_words",
  "word_order",
  "hangul_recognition",
  "polite_endings",
  "pronunciation_awareness",
]) {
  assert.ok(challenge.includes(`"${challengeKind}"`), `missing challenge kind ${challengeKind}`);
}
assert.match(challenge, /romance_or_english/);
assert.match(challenge, /japanese/);
assert.match(challenge, /chinese/);
assert.match(challenge, /korean/);
assert.match(challenge, /shareWithTeacherOnlyAfterConsent:\s*true/);
assert.doesNotMatch(challenge, /SpanishOnly|spanishOnly|dominicanOnly/i);
ok("module challenge architecture supports multiple language families");

const companionGrowth = read(companionGrowthPath);
for (const exportedType of [
  "CompanionGrowthEvent",
  "CompanionXPSource",
  "CompanionDisciplineTrack",
  "CompanionSubjectTrack",
  "CompanionBadge",
  "CompanionGrowthSummary",
]) {
  assert.match(companionGrowth, new RegExp(`export type ${exportedType}\\b`), `${exportedType} must be exported`);
}
for (const xpSource of [
  "yo_module_progress",
  "yo_final_challenge",
  "marketplace_lesson_completed",
  "teacher_feedback",
  "homework_completed",
  "streak",
  "skill_improvement",
]) {
  assert.ok(companionGrowth.includes(`"${xpSource}"`), `missing XP source ${xpSource}`);
}
assert.match(companionGrowth, /COMPANION_XP_SOURCE_WEIGHTS/);
assert.doesNotMatch(companionGrowth, /openai|summaryPrompt|aiSummary|createChatCompletion|responses\.create/i);
ok("companion growth model combines YoPratiqo, marketplace, feedback, homework, streaks, and skills deterministically");

const creditsDoc = read(creditsDocPath);
for (const required of [
  /design-only/i,
  /does not launch paid credits/i,
  /ledger, not a simple mutable balance/i,
  /Paid credits and promotional credits must be distinguishable/i,
  /not cash/i,
  /not withdrawable/i,
  /marketplace lesson discount/i,
  /YoPratiqo module unlock/i,
  /refund credit/i,
  /promotional onboarding credit/i,
  /accounting/i,
  /tax/i,
  /expiry/i,
  /refund/i,
  /consumer protection/i,
  /app store native purchase policy/i,
  /Legal\/accounting review is required before launch/i,
]) {
  assert.match(creditsDoc, required);
}
ok("credits architecture doc is design-only and review-gated");

const teacherSummaryDoc = read(teacherSummaryDocPath);
for (const required of [
  /actionable summaries, not raw data/i,
  /completed modules/i,
  /final challenge result/i,
  /strengths/i,
  /needs practice/i,
  /suggested lesson plan/i,
  /suggested homework/i,
  /Private/i,
  /Summary only/i,
  /Detailed report/i,
  /summary only after consent/i,
  /Spanish Module 5/i,
  /Future Japanese/i,
  /Future Korean/i,
  /Future Chinese/i,
  /Teacher sharing requires learner consent/i,
  /React Native/i,
]) {
  assert.match(teacherSummaryDoc, required);
}
assert.match(teacherSummaryDoc, /should not include raw quiz answers by default/i);
ok("teacher summary effectiveness doc is consent-first and teacher-actionable");

const productConfig = read("lib/yo/yopratiqoProductConfig.ts");
assert.match(productConfig, /premiumModulesEnabled:\s*false/);
assert.match(productConfig, /futurePremiumEnabled:\s*false/);
assert.match(productConfig, /checkoutEnabled:\s*false/);
assert.match(productConfig, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
ok("paid YoPratiqo checkout remains disabled");

const newTypeSource = [
  learningEvents,
  challenge,
  companionGrowth,
].join("\n");
const newSource = [
  newTypeSource,
  creditsDoc,
  teacherSummaryDoc,
].join("\n");
assert.doesNotMatch(newTypeSource, /from\s+["']@\/lib\/payments|from\s+["']@\/lib\/credits|from\s+["']@\/lib\/supabase|stripe|STRIPE|checkout|tax_behavior|credit_balance|profiles\.update/i);
assert.doesNotMatch(newTypeSource, /app\/api|migration|create table|alter table|policy|rls/i);
assert.doesNotMatch(newSource, /create table|alter table|profiles\.update|credit_balance/i);
ok("new foundation files add no real credit balance, payment, tax, Supabase, or migration implementation");

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
  learningEventsPath,
  challengePath,
  companionGrowthPath,
  creditsDocPath,
  teacherSummaryDocPath,
  "tests/yo/yopratiqoTeacherBridgeFoundation.test.ts",
  testPath,
  // Visible bridge consent card PR — UI foundation extension of the
  // same learning-event/teacher-bridge architecture. No runtime
  // persistence, no checkout, no Stripe, no RLS, no audio generation.
  // The mount is on the YoPratiqo hub in coming-soon mode only.
  "lib/yopratiqo/teacherBridgeCopy.ts",
  "lib/yopratiqo/teacherBridgeSummary.ts",
  "components/yo/YoTeacherBridgeConsentCard.tsx",
  "components/yo/YoTeacherBridgeConsentSection.tsx",
  "components/yo/TeacherLearningInsightCard.tsx",
  "app/yo/page.tsx",
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
  /^public\/.*\.(?:mp3|wav|m4a)$/i,
  /^scripts\/.*(?:openai|generate-yopratiqo-audio)/i,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /CourseJsonLd|CourseSchema|yopratiqoSeo/i,
];

for (const file of changed) {
  if (ignoredUntracked.has(file)) continue;
  assert.ok(allowed.has(file), `unexpected file touched by learning-event foundation: ${file}`);
  for (const pattern of restrictedPatterns) {
    assert.ok(!pattern.test(file), `restricted system touched by learning-event foundation: ${file}`);
  }
}
ok("learning-event foundation touches no restricted systems");

console.log("[yo:learning-event-ledger] tests passed");
