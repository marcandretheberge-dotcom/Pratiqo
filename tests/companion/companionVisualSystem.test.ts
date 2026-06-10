/**
 * tests/companion/companionVisualSystem.test.ts
 *
 * Defends the YoPratiqo companion visual system PR.
 *
 * What this test guarantees
 * -------------------------
 *   1.  The visual manifest exists with the eight required states.
 *   2.  Required states (idle, map, confused, celebrating, teacher_ready,
 *       level_up, inactive, badge_unlocked) are all present.
 *   3.  `CompanionAvatar` exists and exposes the documented props.
 *   4.  `CompanionAvatar` ships a non-image fallback when no production
 *       asset is registered, so production never renders a broken image.
 *   5.  `CompanionBridgeCard` exists and is mounted in at least one
 *       bridge surface.
 *   6.  Bridge copy exists in FR / EN / ES with the exact wording from
 *       the brief.
 *   7.  The asset plan tells designers NOT to crop the companion from
 *       the poster.
 *   8.  The asset plan requires transparent PNG exports.
 *   9.  The asset plan mentions Rive / Lottie and React Native
 *       compatibility.
 *  10.  Paid YoPratiqo checkout remains disabled and no Stripe /
 *       payment signal was introduced in any new file.
 *  11.  No restricted system (Stripe / payments / tax / legal / RLS /
 *       migrations / Membre Pro / audio / SEO) is touched by this PR.
 *  12.  No raw quiz fields are introduced anywhere in the new surfaces.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

let pass = 0;
const ok = (label: string) => {
  pass += 1;
  console.log(`  ok  ${label}`);
};

// ─────────────────────────────────────────────────────────────────────────
// Sources under test
// ─────────────────────────────────────────────────────────────────────────

const manifestPath = "lib/companion/companionVisuals.ts";
const avatarPath = "components/companion/CompanionAvatar.tsx";
const bridgeCardPath = "components/companion/CompanionBridgeCard.tsx";
const assetPlanPath = "docs/COMPANION_BRIDGE_ASSET_PLAN.md";
const bookingWrapperPath = "components/yo/YoBookingTeacherBridgeConsent.tsx";
const teacherInsightPath = "components/yo/TeacherLearningInsightCard.tsx";
const productConfigPath = "lib/yo/yopratiqoProductConfig.ts";

const manifestSrc = read(manifestPath);
const avatarSrc = read(avatarPath);
const bridgeCardSrc = read(bridgeCardPath);
const assetPlan = read(assetPlanPath);
const bookingWrapper = read(bookingWrapperPath);
const teacherInsight = read(teacherInsightPath);
const productConfig = read(productConfigPath);

// ─────────────────────────────────────────────────────────────────────────
// 1. companion visual manifest exists
// ─────────────────────────────────────────────────────────────────────────

assert.match(manifestSrc, /export\s+type\s+CompanionVisualId\b/);
assert.match(manifestSrc, /export\s+type\s+CompanionVisualState\b/);
assert.match(manifestSrc, /export\s+type\s+CompanionVisualAsset\b/);
assert.match(manifestSrc, /export\s+type\s+CompanionVisualManifest\b/);
assert.match(
  manifestSrc,
  /export\s+const\s+COMPANION_VISUAL_MANIFESTS\s*:/,
  "manifest must export COMPANION_VISUAL_MANIFESTS",
);
assert.match(
  manifestSrc,
  /export\s+function\s+getCompanionVisualAsset\b/,
  "manifest must export getCompanionVisualAsset()",
);
assert.match(
  manifestSrc,
  /export\s+function\s+hasProductionCompanionAsset\b/,
  "manifest must export hasProductionCompanionAsset()",
);
ok("1) companion visual manifest exists with the required exports");

// ─────────────────────────────────────────────────────────────────────────
// 2. required states exist
// ─────────────────────────────────────────────────────────────────────────

const REQUIRED_STATES = [
  "idle",
  "map",
  "confused",
  "celebrating",
  "teacher_ready",
  "level_up",
  "inactive",
  "badge_unlocked",
] as const;

for (const state of REQUIRED_STATES) {
  assert.match(
    manifestSrc,
    new RegExp(`"${state}"`),
    `manifest must declare the "${state}" state`,
  );
}
assert.match(
  manifestSrc,
  /COMPANION_VISUAL_STATES[\s\S]*?\[[\s\S]*?"badge_unlocked"[\s\S]*?\]/,
  "COMPANION_VISUAL_STATES must include badge_unlocked",
);
ok("2) all eight required companion states are declared in the manifest");

// ─────────────────────────────────────────────────────────────────────────
// 3. CompanionAvatar exists
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  avatarSrc,
  /export\s+function\s+CompanionAvatar\b/,
  "CompanionAvatar must be exported",
);
assert.match(avatarSrc, /state:\s*CompanionVisualState/);
assert.match(avatarSrc, /size\?:\s*AvatarSize/);
assert.match(avatarSrc, /label\?:\s*string/);
assert.match(avatarSrc, /className\?:\s*string/);
ok("3) CompanionAvatar component exists and exposes the documented props");

// ─────────────────────────────────────────────────────────────────────────
// 4. CompanionAvatar has fallback behavior
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  avatarSrc,
  /hasProductionAsset\s*\?\s*"true"\s*:\s*"false"/,
  "avatar must annotate whether a production asset is available",
);
assert.match(
  avatarSrc,
  /data-testid="companion-avatar-fallback"/,
  "avatar must render a fallback element (data-testid companion-avatar-fallback) when src is null",
);
assert.match(
  avatarSrc,
  /asset\.fallbackEmoji/,
  "avatar fallback must render the manifest fallback emoji",
);
assert.match(
  avatarSrc,
  /hasProductionAsset\s*&&\s*asset\.src\s*\?/,
  "avatar must only render Next/Image when a real src exists",
);
ok("4) CompanionAvatar renders a safe fallback when no production asset exists");

// ─────────────────────────────────────────────────────────────────────────
// 5. CompanionBridgeCard exists
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  bridgeCardSrc,
  /export\s+function\s+CompanionBridgeCard\b/,
  "CompanionBridgeCard must be exported",
);
assert.match(
  bridgeCardSrc,
  /data-testid="companion-bridge-card"/,
  "CompanionBridgeCard must expose a stable data-testid",
);

// At least one bridge surface mounts it.
const mountedInBooking = /import\s*\{\s*CompanionBridgeCard\s*\}\s*from\s*["']@\/components\/companion\/CompanionBridgeCard["']/.test(
  bookingWrapper,
)
  && /<CompanionBridgeCard\b/.test(bookingWrapper);
const mountedInTeacher = /import\s*\{\s*CompanionBridgeCard\s*\}\s*from\s*["']@\/components\/companion\/CompanionBridgeCard["']/.test(
  teacherInsight,
)
  && /<CompanionBridgeCard\b/.test(teacherInsight);
assert.ok(
  mountedInBooking || mountedInTeacher,
  "CompanionBridgeCard must be mounted in YoBookingTeacherBridgeConsent or TeacherLearningInsightCard",
);
ok("5) CompanionBridgeCard exists and is mounted in at least one bridge surface");

// ─────────────────────────────────────────────────────────────────────────
// 6. bridge copy exists in FR / EN / ES
// ─────────────────────────────────────────────────────────────────────────

const BRIDGE_COPY_FR =
  "Ton compagnon apprend avec toi. Il aide à résumer tes progrès pour préparer un meilleur cours, seulement si tu consens au partage.";
const BRIDGE_COPY_EN =
  "Your companion learns with you. It helps summarize your progress for a better lesson, only when you agree to share it.";
const BRIDGE_COPY_ES =
  "Tu compañero aprende contigo. Ayuda a resumir tu progreso para preparar una mejor clase, solo si aceptas compartirlo.";
assert.ok(bridgeCardSrc.includes(BRIDGE_COPY_FR), "FR bridge copy must match the brief verbatim");
assert.ok(bridgeCardSrc.includes(BRIDGE_COPY_EN), "EN bridge copy must match the brief verbatim");
assert.ok(bridgeCardSrc.includes(BRIDGE_COPY_ES), "ES bridge copy must match the brief verbatim");
ok("6) FR / EN / ES bridge copy matches the brief verbatim");

// ─────────────────────────────────────────────────────────────────────────
// 7. asset plan says not to crop from poster
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  assetPlan,
  /do not crop the production companion asset from a poster/i,
  "asset plan must explicitly forbid cropping the companion from a poster",
);
ok("7) asset plan explicitly says not to crop the companion from the poster");

// ─────────────────────────────────────────────────────────────────────────
// 8. asset plan requires transparent PNG
// ─────────────────────────────────────────────────────────────────────────

assert.match(assetPlan, /transparent PNG/i, "asset plan must require transparent PNG exports");
assert.match(assetPlan, /1024/, "asset plan must require a 1024 source canvas");
assert.match(
  assetPlan,
  /one character per image/i,
  "asset plan must require one character per image",
);
ok("8) asset plan requires transparent PNG, 1024 canvas, and one character per image");

// ─────────────────────────────────────────────────────────────────────────
// 9. asset plan mentions Rive/Lottie and React Native compatibility
// ─────────────────────────────────────────────────────────────────────────

assert.match(assetPlan, /Rive/i, "asset plan must mention Rive as the future animation path");
assert.match(assetPlan, /Lottie/i, "asset plan must mention Lottie as the future animation path");
assert.match(
  assetPlan,
  /React Native/i,
  "asset plan must mention React Native compatibility",
);
ok("9) asset plan mentions Rive/Lottie and React Native compatibility");

// ─────────────────────────────────────────────────────────────────────────
// 10. no paid YoPratiqo checkout enabled
// ─────────────────────────────────────────────────────────────────────────

assert.match(productConfig, /premiumModulesEnabled:\s*false/);
assert.match(productConfig, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);

const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [name, src] of [
  ["companion manifest", manifestSrc],
  ["companion avatar", avatarSrc],
  ["companion bridge card", bridgeCardSrc],
] as const) {
  assert.doesNotMatch(
    src,
    STRIPE_PATTERN,
    `${name} must not introduce Stripe/checkout/price_id references`,
  );
}
ok("10) paid YoPratiqo checkout remains disabled and no Stripe reference was introduced");

// ─────────────────────────────────────────────────────────────────────────
// 11. no restricted system touched
// ─────────────────────────────────────────────────────────────────────────

const restrictedPathPatterns: RegExp[] = [
  /^app\/api\/stripe\//,
  /^app\/api\/.*checkout/i,
  /^app\/api\/.*payment/i,
  /^lib\/payments\//,
  /^lib\/pricing\//,
  /^lib\/config\/membrePro\.ts$/,
  /^lib\/commissions\//,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^public\/.*\.(?:mp3|wav|m4a)$/i,
  /^public\/audio\//,
  /^scripts\/(?:generate-yopratiqo-audio|.*openai)/i,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /^lib\/seo\//,
];

const status = execSync("git status --porcelain -uall", { cwd: root, encoding: "utf8" });
const changedFiles = status
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) =>
    line
      .replace(/^[ MADRCU?!]{1,2}\s+/, "")
      .replace(/^"|"$/g, "")
      .replace(/\\/g, "/"),
  );

const ignoredUntracked = new Set([
  "Untitled",
  "docs/LAUNCH_READINESS_ANALYSIS.md",
  "pratiqo-legal-export-20260528-2221.zip",
]);

for (const file of changedFiles) {
  if (ignoredUntracked.has(file)) continue;
  for (const re of restrictedPathPatterns) {
    if (re.test(file)) {
      assert.fail(`restricted system touched by companion visual PR: ${file}`);
    }
  }
}
ok("11) no restricted system (Stripe / payments / tax / legal / RLS / migrations / Membre Pro / audio / SEO) is touched");

// ─────────────────────────────────────────────────────────────────────────
// 12. no raw quiz fields are introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN = /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|correctOptionId|correct_option_id|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [name, src] of [
  ["companion manifest", manifestSrc],
  ["companion avatar", avatarSrc],
  ["companion bridge card", bridgeCardSrc],
  ["asset plan", assetPlan],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${name} must not introduce raw quiz fields`,
  );
}
ok("12) no raw quiz fields introduced anywhere in the new surfaces");

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────

console.log(`\n${pass} companion visual system assertions passed`);
