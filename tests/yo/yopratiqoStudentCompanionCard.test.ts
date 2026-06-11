/**
 * tests/yo/yopratiqoStudentCompanionCard.test.ts
 *
 * Defends the student-dashboard YoPratiqo companion card PR.
 *
 * Assertions
 * ----------
 *   1.  YoStudentCompanionCard exists and is exported.
 *   2.  The new card is a separate component from the legacy companion
 *       (CompanionCard / CompanionArtwork / CompanionEvolutionCarousel),
 *       and does not import the legacy companion family enum.
 *   3.  The legacy companion family enum (forest | phoenix | dragon |
 *       star) is still present in `lib/companions.ts` — i.e. the PR
 *       did not remove the legacy companion system.
 *   4.  The new card uses the travel-companion visual system via
 *       CompanionAvatar, not the legacy CompanionArtwork.
 *   5.  State helper maps "no snapshots" to `idle`.
 *   6.  State helper maps "started, none completed" to `map`.
 *   7.  State helper maps a fresh completion to `celebrating` and a
 *       stale completion to `teacher_ready`.
 *   8.  State helper maps a completed module-5 capstone to
 *       `badge_unlocked`.
 *   9.  Privacy copy exists in FR / EN / ES verbatim from the brief.
 *  10.  Copy explicitly says raw quiz answers are not shared (FR/EN/ES).
 *  11.  No raw quiz fields are introduced in any new surface.
 *  12.  Paid YoPratiqo checkout remains disabled (no Stripe / checkout
 *       reference added to the new files).
 *  13.  No restricted system (RLS / migrations / Stripe / payment / tax
 *       / legal / Membre Pro / audio / SEO) is touched by this PR.
 *
 *  In addition, the helper test invokes
 *  `deriveStudentCompanionState` directly at runtime so the state
 *  mappings are checked end-to-end, not just by source scan.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CAPSTONE_MODULE_ID,
  deriveStudentCompanionState,
  type StudentCompanionSnapshotInput,
} from "../../lib/yopratiqo/studentCompanionState";

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

const cardPath = "components/yo/YoStudentCompanionCard.tsx";
const helperPath = "lib/yopratiqo/studentCompanionState.ts";
const legacyFamiliesPath = "lib/companions.ts";
const legacyCompanionCardPath = "components/companion/CompanionCard.tsx";
const progressPagePath = "app/(app)/student/progress/page.tsx";
const productConfigPath = "lib/yo/yopratiqoProductConfig.ts";

const cardSrc = read(cardPath);
const helperSrc = read(helperPath);
const legacyFamiliesSrc = read(legacyFamiliesPath);
const legacyCompanionCardSrc = read(legacyCompanionCardPath);
const progressPageSrc = read(progressPagePath);
const productConfigSrc = read(productConfigPath);

// ─────────────────────────────────────────────────────────────────────────
// 1. YoStudentCompanionCard exists
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  cardSrc,
  /export\s+function\s+YoStudentCompanionCard\b/,
  "YoStudentCompanionCard must be exported",
);
assert.match(
  cardSrc,
  /data-testid="yo-student-companion-card"/,
  "card must expose a stable data-testid",
);
ok("1) YoStudentCompanionCard exists and is exported");

// ─────────────────────────────────────────────────────────────────────────
// 2. Card is separate from the legacy companion
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(
  cardSrc,
  /from\s+["']@\/components\/companion\/CompanionCard["']/,
  "new YoPratiqo card must not import the legacy CompanionCard",
);
assert.doesNotMatch(
  cardSrc,
  /from\s+["']@\/components\/companion\/CompanionArtwork["']/,
  "new YoPratiqo card must not import the legacy CompanionArtwork",
);
assert.doesNotMatch(
  cardSrc,
  /from\s+["']@\/components\/companion\/CompanionEvolutionCarousel["']/,
  "new YoPratiqo card must not import the legacy CompanionEvolutionCarousel",
);
assert.doesNotMatch(
  cardSrc,
  /from\s+["']@\/lib\/companions["']/,
  "new YoPratiqo card must not import the legacy companion family enum",
);
ok("2) new YoPratiqo card is separate from the legacy companion components");

// ─────────────────────────────────────────────────────────────────────────
// 3. Legacy companion families are still present
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  legacyFamiliesSrc,
  /CompanionType\s*=\s*"phoenix"\s*\|\s*"forest"\s*\|\s*"dragon"\s*\|\s*"star"/,
  "legacy CompanionType enum (forest | phoenix | dragon | star) must remain intact",
);
assert.match(
  legacyCompanionCardSrc,
  /export\s+function\s+CompanionCard\b/,
  "legacy CompanionCard component must still be exported",
);
assert.match(
  progressPageSrc,
  /<CompanionCard\b/,
  "legacy CompanionCard must still be mounted on the student progress page",
);
ok("3) legacy companion families and CompanionCard are preserved");

// ─────────────────────────────────────────────────────────────────────────
// 4. New card uses CompanionAvatar / travel visual system
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  cardSrc,
  /import\s*\{\s*CompanionAvatar\s*\}\s*from\s*["']@\/components\/companion\/CompanionAvatar["']/,
  "new card must use CompanionAvatar",
);
assert.match(
  cardSrc,
  /<CompanionAvatar[\s\S]*?visualId="travel"/,
  "new card must request the travel-companion visualId",
);
assert.match(
  progressPageSrc,
  /<YoStudentCompanionCard\b/,
  "new card must be mounted on the student progress page",
);
ok("4) new card uses CompanionAvatar and is mounted on the progress page");

// ─────────────────────────────────────────────────────────────────────────
// 5-8. Runtime state-mapping assertions on deriveStudentCompanionState
// ─────────────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date("2026-06-10T12:00:00.000Z");
function mkRow(
  partial: Partial<StudentCompanionSnapshotInput>,
): StudentCompanionSnapshotInput {
  return {
    course_id: "yopratiqo:es:republique-dominicaine",
    module_id: "module-2",
    module_title: "Module 2",
    discipline: "Languages",
    level_label: "A1",
    progress_state: "started",
    last_activity_at: FIXED_NOW.toISOString(),
    completed_at: null,
    ...partial,
  };
}

// 5. No snapshots → idle
const noProgress = deriveStudentCompanionState([], { now: FIXED_NOW });
assert.equal(noProgress.state, "idle", "empty input must map to idle");
assert.equal(noProgress.completedModulesCount, 0);
assert.equal(noProgress.hasAnyProgress, false);
assert.equal(noProgress.primaryCtaHref, "/yo");
ok("5) helper maps no snapshots to idle and exposes a safe CTA");

// 6. Started but none completed → map
const onlyStarted = deriveStudentCompanionState(
  [mkRow({ progress_state: "started" })],
  { now: FIXED_NOW },
);
assert.equal(onlyStarted.state, "map", "started-only input must map to map");
assert.equal(onlyStarted.completedModulesCount, 0);
assert.equal(onlyStarted.hasShareableProgress, false);
ok("6) helper maps started-only progress to map");

// 7a. Fresh completion → celebrating
const freshCompletion = deriveStudentCompanionState(
  [
    mkRow({
      module_id: "module-2",
      progress_state: "completed",
      completed_at: new Date(FIXED_NOW.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      last_activity_at: new Date(FIXED_NOW.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    }),
  ],
  { now: FIXED_NOW },
);
assert.equal(
  freshCompletion.state,
  "celebrating",
  "a completion within RECENT_DAYS must map to celebrating",
);
assert.equal(freshCompletion.completedModulesCount, 1);
assert.equal(freshCompletion.hasShareableProgress, true);

// 7b. Stale completion (>RECENT_DAYS, <INACTIVITY_DAYS) → teacher_ready
const staleCompletion = deriveStudentCompanionState(
  [
    mkRow({
      module_id: "module-3",
      progress_state: "completed",
      completed_at: new Date(FIXED_NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      last_activity_at: new Date(FIXED_NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ],
  { now: FIXED_NOW },
);
assert.equal(
  staleCompletion.state,
  "teacher_ready",
  "a completion older than RECENT_DAYS must map to teacher_ready",
);
assert.equal(staleCompletion.completedModulesCount, 1);
ok("7) helper maps recent completions to celebrating and older completions to teacher_ready");

// 8. Capstone module-5 completed → badge_unlocked
const capstoneCompleted = deriveStudentCompanionState(
  [
    mkRow({
      module_id: CAPSTONE_MODULE_ID,
      module_title: "Module 5 — Capstone A2",
      level_label: "A2",
      progress_state: "completed",
      completed_at: new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      last_activity_at: new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ],
  { now: FIXED_NOW },
);
assert.equal(
  capstoneCompleted.state,
  "badge_unlocked",
  "completing module-5 must map to badge_unlocked, overriding celebrating/teacher_ready",
);
assert.equal(capstoneCompleted.completedModulesCount, 1);
assert.equal(capstoneCompleted.currentLevelLabel, "A2");
ok("8) helper maps module-5 completion to badge_unlocked");

// Extra: inactivity threshold honored
const stale = deriveStudentCompanionState(
  [
    mkRow({
      module_id: "module-2",
      progress_state: "completed",
      completed_at: new Date(FIXED_NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      last_activity_at: new Date(FIXED_NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ],
  { now: FIXED_NOW },
);
assert.equal(
  stale.state,
  "inactive",
  "snapshot older than INACTIVITY_DAYS must map to inactive",
);

// ─────────────────────────────────────────────────────────────────────────
// 9 & 10. Privacy copy exists in FR / EN / ES and mentions raw quiz answers
// ─────────────────────────────────────────────────────────────────────────

const FR_PRIVACY =
  "Les professeurs reçoivent seulement un résumé utile lorsque tu choisis de le partager pendant la réservation. Les réponses brutes aux quiz ne sont pas partagées.";
const EN_PRIVACY =
  "Teachers receive only a useful summary when you choose to share it during booking. Raw quiz answers are not shared.";
const ES_PRIVACY =
  "Los profesores reciben solo un resumen útil cuando eliges compartirlo durante la reserva. Las respuestas brutas de los cuestionarios no se comparten.";
assert.ok(cardSrc.includes(FR_PRIVACY), "FR privacy copy must match the brief verbatim");
assert.ok(cardSrc.includes(EN_PRIVACY), "EN privacy copy must match the brief verbatim");
assert.ok(cardSrc.includes(ES_PRIVACY), "ES privacy copy must match the brief verbatim");

// Empty-state copy now names the YoPratiqo companion explicitly as
// "Yoppo" — the official student-facing mascot label — while keeping
// the canonical "Yoppo, ton compagnon YoPratiqo" phrasing.
const FR_EMPTY =
  "Commence un module YoPratiqo pour faire voyager Yoppo, ton compagnon YoPratiqo.";
const EN_EMPTY =
  "Start a YoPratiqo module to wake up Yoppo, your YoPratiqo companion.";
const ES_EMPTY =
  "Comienza un módulo de YoPratiqo para despertar a Yoppo, tu compañero YoPratiqo.";
assert.ok(cardSrc.includes(FR_EMPTY), "FR empty-state copy must match the brief verbatim");
assert.ok(cardSrc.includes(EN_EMPTY), "EN empty-state copy must match the brief verbatim");
assert.ok(cardSrc.includes(ES_EMPTY), "ES empty-state copy must match the brief verbatim");
ok("9) FR / EN / ES privacy + empty-state copy is present verbatim");

assert.match(cardSrc, /raw quiz answers are not shared/i, "EN copy must explicitly disclaim raw quiz answers");
assert.match(cardSrc, /réponses brutes aux quiz/i, "FR copy must explicitly disclaim raw quiz answers");
assert.match(cardSrc, /respuestas brutas de los cuestionarios/i, "ES copy must explicitly disclaim raw quiz answers");
ok("10) privacy copy says raw quiz answers are not shared in FR / EN / ES");

// ─────────────────────────────────────────────────────────────────────────
// 11. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|correctOptionId|correct_option_id|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [name, src] of [
  ["card", cardSrc],
  ["helper", helperSrc],
] as const) {
  assert.doesNotMatch(src, RAW_QUIZ_PATTERN, `${name} must not introduce raw quiz fields`);
}
ok("11) no raw quiz fields introduced in the new card or helper");

// ─────────────────────────────────────────────────────────────────────────
// 12. Paid YoPratiqo checkout stays disabled
// ─────────────────────────────────────────────────────────────────────────

assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);

const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [name, src] of [
  ["card", cardSrc],
  ["helper", helperSrc],
] as const) {
  assert.doesNotMatch(
    src,
    STRIPE_PATTERN,
    `${name} must not introduce Stripe/checkout/price_id references`,
  );
}
ok("12) paid YoPratiqo checkout remains disabled and no Stripe references added");

// ─────────────────────────────────────────────────────────────────────────
// 13. No restricted system touched
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
      assert.fail(
        `restricted system touched by student-companion-card PR: ${file}`,
      );
    }
  }
}
ok("13) no restricted system (Stripe / payments / tax / legal / RLS / migrations / Membre Pro / audio / SEO) touched");

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────

console.log(`\n${pass} student-companion-card assertions passed`);
