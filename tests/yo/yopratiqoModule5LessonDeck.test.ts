/**
 * tests/yo/yopratiqoModule5LessonDeck.test.ts
 *
 * Static contract test for the Dominican Republic Module 5
 * (A2 capstone) lesson deck.
 *
 * Locks in the
 * `feat/yopratiqo-module5-and-intro-decks` redesign:
 *
 *   • The Module 5 route mounts <DominicanRepublicModule5Content
 *     mode="deck" /> and drops its 5-level breadcrumb in favour of
 *     the deck header.
 *   • The Module 5 composer ships a `mode` discriminator with a
 *     backward-compatible `"long-scroll"` default so any other
 *     surface (tests, embeds) keeps working.
 *   • The deck uses the shared <YoLessonDeck /> orchestrator (no
 *     fork) and has 12 focused final-mission screens (mission →
 *     completion).
 *   • The deck inherits the audited no-scroll / swipe / tap-zone
 *     behaviour from the shared deck.
 *   • The deck uses audited companion visual states including
 *     `badge_unlocked` (the final RD series capstone is the badge
 *     moment) and `teacher_ready` (the audited
 *     `dominicanRdModuleProgressPayload("module-5", ...)` payload
 *     already ships `companion_stage: "teacher-ready"` AND the
 *     Series Completion section has a real
 *     `/trouver-un-prof?q=espagnol` teacher-bridge CTA — both are
 *     real teacher-bridge signals, not faked AI tutor behaviour).
 *   • All audited educational content is preserved: hero, mission
 *     map, skill dashboard, phrase bank, fast-speech, dialogues,
 *     readings, writing tasks, roleplays, grammar, flashcards,
 *     quiz, capstone game, printables, self-assessment, series
 *     completion.
 *   • YoMarkModuleCompletedButton stays mounted with the audited
 *     `dominicanRdModuleProgressPayload("module-5", locale)` payload.
 *   • Modules 2, 3, and 4 decks still pass unchanged.
 *   • Paid YoPratiqo checkout remains disabled.
 *   • No raw quiz fields, no restricted-system path touched.
 *
 * All assertions are static (file system + string reads).
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

/**
 * Strip JS/TS block + line comments so contract regexes never
 * falsely match an example sentence inside a doc-comment.
 * Mirrors the helper used by the Module 3 / 4 / Intro deck tests.
 */
function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

let pass = 0;
const ok = (label: string) => {
  pass += 1;
  console.log(`  ok  ${label}`);
};

// ─────────────────────────────────────────────────────────────────────────
// Paths under contract
// ─────────────────────────────────────────────────────────────────────────

const MODULE5_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx";
const MODULE5_CONTENT_PATH =
  "components/yo/DominicanRepublicModule5Content.tsx";
const MODULE4_CONTENT_PATH =
  "components/yo/DominicanRepublicModule4Content.tsx";
const MODULE3_CONTENT_PATH =
  "components/yo/DominicanRepublicModule3Content.tsx";
const MODULE2_CONTENT_PATH =
  "components/yo/DominicanRepublicModule2Content.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";
const DECK_PATH = "components/yo/YoLessonDeck.tsx";

const pageSrc = read(MODULE5_PAGE_PATH);
const module5Src = read(MODULE5_CONTENT_PATH);
const module5Code = stripJsComments(module5Src);
const module4Src = read(MODULE4_CONTENT_PATH);
const module3Src = read(MODULE3_CONTENT_PATH);
const module2Src = read(MODULE2_CONTENT_PATH);
const deckSrc = read(DECK_PATH);

// ─────────────────────────────────────────────────────────────────────────
// 1. Module 5 route uses deck mode + dropped its 5-level breadcrumb
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  pageSrc,
  /<DominicanRepublicModule5Content[\s\S]*?\bmode=["']deck["']/,
  "Module 5 route must mount <DominicanRepublicModule5Content mode=\"deck\" />",
);
assert.doesNotMatch(
  pageSrc,
  /<YoBreadcrumb\b/,
  "Module 5 route must NOT render <YoBreadcrumb /> (deck header replaces it)",
);
assert.doesNotMatch(
  pageSrc,
  /from\s+["']@\/components\/yo\/YoBreadcrumb["']/,
  "Module 5 route must NOT import YoBreadcrumb anymore",
);
assert.doesNotMatch(
  pageSrc,
  /YoBreadcrumbItem/,
  "Module 5 route must NOT instantiate any YoBreadcrumbItem array (no 5-level chain)",
);
ok("1) Module 5 route uses deck mode and dropped its 5-level breadcrumb in favour of the deck header");

// ─────────────────────────────────────────────────────────────────────────
// 2. Module 5 content supports a `mode` discriminator
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module5Src,
  /export\s+type\s+DominicanRepublicModule5Mode\s*=\s*["']long-scroll["']\s*\|\s*["']deck["']/,
  "Module 5 content must export the DominicanRepublicModule5Mode type union",
);
assert.match(
  module5Src,
  /mode\?\s*:\s*DominicanRepublicModule5Mode/,
  "Module 5 content must accept the optional `mode` prop",
);
assert.match(
  module5Src,
  /mode\s*=\s*["']long-scroll["']/,
  "Module 5 content must default `mode` to \"long-scroll\" for backward compatibility",
);
assert.match(
  module5Src,
  /if\s*\(\s*mode\s*===\s*["']deck["']\s*\)\s*\{\s*return\s+<Module5DeckRenderer\b/,
  "Module 5 content must branch into <Module5DeckRenderer /> when mode === \"deck\"",
);
ok("2) Module 5 content supports a mode discriminator with backward-compatible long-scroll default");

// ─────────────────────────────────────────────────────────────────────────
// 3. Module 5 uses the shared <YoLessonDeck /> orchestrator
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module5Src,
  /import\s*\{\s*YoLessonDeck\s*\}\s*from\s*["']@\/components\/yo\/YoLessonDeck["']/,
  "Module 5 content must import YoLessonDeck",
);
assert.match(
  module5Src,
  /<YoLessonDeck\b/,
  "Module 5 content must mount <YoLessonDeck />",
);
// Same component as Modules 2 / 3 / 4 — no fork.
for (const [moduleLabel, src] of [
  ["Module 2", module2Src],
  ["Module 3", module3Src],
  ["Module 4", module4Src],
] as const) {
  assert.ok(
    src.includes('from "@/components/yo/YoLessonDeck"'),
    `${moduleLabel} content must still import from the shared @/components/yo/YoLessonDeck (no fork)`,
  );
}
ok("3) Module 5 uses the shared <YoLessonDeck /> orchestrator — same component as Modules 2, 3, and 4 (no fork)");

// ─────────────────────────────────────────────────────────────────────────
// 4. Module 5 deck has 12 distinct focused final-mission screens
// ─────────────────────────────────────────────────────────────────────────

const MODULE5_SCREEN_IDS = [
  "mission",
  "skills",
  "phrases",
  "fast-speech",
  "dialogues",
  "readings",
  "writing-oral",
  "grammar",
  "flashcards",
  "quiz",
  "final-mission",
  "completion",
] as const;
for (const screenId of MODULE5_SCREEN_IDS) {
  assert.match(
    module5Src,
    new RegExp(`id:\\s*["']${screenId}["']`),
    `Module 5 deck must declare the focused "${screenId}" screen`,
  );
  assert.match(
    module5Src,
    new RegExp(`data-yo-module5-deck-screen=["']${screenId}["']`),
    `Module 5 deck must render the focused "${screenId}" screen with the stable data-yo-module5-deck-screen marker`,
  );
}
// Sanity: the composer should ship exactly 12 deck-screen `id:`
// declarations (one per audited slot above).
const screenIdMatches = Array.from(
  module5Src.matchAll(
    /id:\s*["'](mission|skills|phrases|fast-speech|dialogues|readings|writing-oral|grammar|flashcards|quiz|final-mission|completion)["']/g,
  ),
);
assert.strictEqual(
  screenIdMatches.length,
  MODULE5_SCREEN_IDS.length,
  `Module 5 deck must declare exactly ${MODULE5_SCREEN_IDS.length} screen ids, saw ${screenIdMatches.length}`,
);
ok(`4) Module 5 deck has ${MODULE5_SCREEN_IDS.length} distinct focused final-mission screens (mission → completion)`);

// ─────────────────────────────────────────────────────────────────────────
// 5. Module 5 inherits the no-scroll / swipe / tap-zone behaviour
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckSrc,
  /h-\[100dvh\]/,
  "Shared deck must lock the viewport with h-[100dvh]",
);
assert.match(
  deckSrc,
  /onPointerDown=\{/,
  "Shared deck must implement swipe navigation via onPointerDown",
);
assert.match(
  module5Src,
  /<YoLessonDeck\b[\s\S]*?enableTapNavigation/,
  "Module 5 deck must opt into tap-zone navigation",
);
ok("5) Module 5 inherits the no-scroll viewport-lock + swipe + tap-zone behaviour from the shared deck");

// ─────────────────────────────────────────────────────────────────────────
// 6. Module 5 uses audited companion visual states (including the
//    badge_unlocked / celebrating climax)
// ─────────────────────────────────────────────────────────────────────────

for (const state of [
  "map",
  "confused",
  "teacher_ready",
  "badge_unlocked",
] as const) {
  assert.match(
    module5Src,
    new RegExp(`companionState:\\s*["']${state}["']`),
    `Module 5 deck composer must use the audited companion visual state "${state}" at least once`,
  );
}
// At least one of celebrating / badge_unlocked must appear on the
// completion screen so the brief's "celebrating or badge_unlocked"
// climax contract is met.
assert.ok(
  /companionState:\s*["'](?:celebrating|badge_unlocked)["']/.test(module5Src),
  "Module 5 deck must include `celebrating` or `badge_unlocked` as the climax companion state",
);
// No fake AI tutor / personalised feedback / fake teacher report.
assert.doesNotMatch(
  module5Code,
  /\b(?:aiTutor|ai_tutor|aiCoach|ai_coach|aiFeedback|ai_feedback|personalizedFeedback|personalized_feedback|teacherReport|teacher_report)\b/i,
  "Module 5 deck must not introduce a fake AI tutor / personalised feedback / teacher-report surface",
);
ok("6) Module 5 deck uses audited companion visual states including celebrating or badge_unlocked");

// ─────────────────────────────────────────────────────────────────────────
// 7. Module 5 preserves flashcards (browser-speech carousel)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module5Src,
  /<FlashcardsSection\b/,
  "Module 5 deck must render the FlashcardsSection on the flashcards screen",
);
assert.match(
  module5Src,
  /<YoFlashcardPreview\b[\s\S]*?audioMode=["']browser-speech["']/,
  "Module 5 deck flashcards must use the audited browser-speech audio mode",
);
assert.match(
  module5Src,
  /module5FlashcardsToYo/,
  "Module 5 deck must reuse the audited Module 5 flashcard adapter",
);
ok("7) Module 5 deck preserves the <YoFlashcardPreview> browser-speech flashcards carousel");

// ─────────────────────────────────────────────────────────────────────────
// 8. Module 5 preserves quiz + final-mission capstone behaviour
//    (Spanish-only choices, reveal-only translations)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module5Src,
  /<DominicanRepublicModule5Quiz\b/,
  "Module 5 deck must mount the audited DominicanRepublicModule5Quiz",
);
assert.match(
  module5Src,
  /Spanish-only choices|opciones solo en español|choix en espagnol uniquement/,
  "Module 5 deck quiz must keep the audited Spanish-only choices subtitle",
);
assert.match(
  module5Src,
  /questions=\{data\.quizQuestions\}/,
  "Module 5 deck quiz must keep its audited `questions={data.quizQuestions}` wiring",
);
assert.match(
  module5Src,
  /<DominicanRepublicCapstoneGame\b/,
  "Module 5 deck must mount the audited DominicanRepublicCapstoneGame (final mission)",
);
assert.match(
  module5Src,
  /<SelfAssessmentSection\b/,
  "Module 5 deck must mount the SelfAssessmentSection alongside the final mission",
);
ok("8) Module 5 deck preserves the quiz + final-mission capstone + self-assessment behaviour");

// ─────────────────────────────────────────────────────────────────────────
// 9. Module 5 preserves printables (7 sheets + print button)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module5Src,
  /<PrintablesSection\b/,
  "Module 5 deck must mount the PrintablesSection on the completion screen",
);
assert.match(
  module5Src,
  /data-yo-module5-printable-worksheet/,
  "Module 5 deck must keep the audited data-yo-module5-printable-worksheet marker on each sheet",
);
assert.match(
  module5Src,
  /data-yo-module5-printable-count/,
  "Module 5 deck must keep the audited data-yo-module5-printable-count marker",
);
assert.match(
  module5Src,
  /<DominicanRepublicModule5PrintButton\b/,
  "Module 5 deck must keep the audited DominicanRepublicModule5PrintButton on the printables surface",
);
ok("9) Module 5 deck preserves the printables section + print button");

// ─────────────────────────────────────────────────────────────────────────
// 10. Module 5 still mounts YoMarkModuleCompletedButton
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module5Src,
  /import\s*\{\s*YoMarkModuleCompletedButton\s*\}\s*from\s*["']@\/components\/yo\/YoMarkModuleCompletedButton["']/,
  "Module 5 content must import YoMarkModuleCompletedButton",
);
assert.match(
  module5Src,
  /<YoMarkModuleCompletedButton\b/,
  "Module 5 content must mount <YoMarkModuleCompletedButton />",
);
assert.match(
  module5Src,
  /data-yo-module5-progress-complete/,
  "Module 5 content must keep the audited data-yo-module5-progress-complete marker",
);
ok("10) Module 5 still mounts YoMarkModuleCompletedButton with the audited progress-complete marker");

// ─────────────────────────────────────────────────────────────────────────
// 11. Module 5 uses dominicanRdModuleProgressPayload("module-5", locale)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module5Src,
  /import\s*\{\s*dominicanRdModuleProgressPayload\s*\}\s*from\s*["']@\/lib\/yo\/dominicanRepublicProgressPayloads["']/,
  "Module 5 content must import dominicanRdModuleProgressPayload",
);
assert.match(
  module5Src,
  /payload=\{dominicanRdModuleProgressPayload\(["']module-5["']/,
  "Module 5 content must keep the audited dominicanRdModuleProgressPayload(\"module-5\", locale) payload wiring",
);
ok("11) Module 5 uses the audited dominicanRdModuleProgressPayload(\"module-5\", locale) payload");

// ─────────────────────────────────────────────────────────────────────────
// 12. Module 5 dropped breadcrumb-style primary navigation
// ─────────────────────────────────────────────────────────────────────────

// The deck renderer block specifically must not embed a 5-level
// breadcrumb (the long-scroll fallback is still allowed to ship
// `<YoBreadcrumb />` when the consumer passes one — that path is
// audited and not on the public route).
const deckRendererBlock = (() => {
  const start = module5Src.indexOf("function Module5DeckRenderer");
  const end = module5Src.indexOf("// ─── Main content component", start);
  assert.ok(start >= 0 && end > start, "Module5DeckRenderer block must exist");
  return module5Src.slice(start, end);
})();
assert.doesNotMatch(
  deckRendererBlock,
  /<YoBreadcrumb\b/,
  "Module5DeckRenderer must NOT render <YoBreadcrumb />",
);
assert.doesNotMatch(
  deckRendererBlock,
  /YoBreadcrumbItem/,
  "Module5DeckRenderer must NOT compose a YoBreadcrumbItem chain",
);
ok("12) Module 5 deck renderer dropped breadcrumb-style primary navigation in favour of the deck header");

// ─────────────────────────────────────────────────────────────────────────
// 13. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
assert.doesNotMatch(
  module5Code,
  STRIPE_PATTERN,
  "Module 5 content must not introduce any Stripe / price_id references in code",
);
assert.doesNotMatch(
  stripJsComments(pageSrc),
  STRIPE_PATTERN,
  "Module 5 route must not introduce any Stripe / price_id references in code",
);
ok("13) paid YoPratiqo checkout remains disabled and no Stripe references added on the Module 5 deck surface");

// ─────────────────────────────────────────────────────────────────────────
// 14. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

// `correctOptionId` / `correct_option_id` are intentionally
// EXCLUDED: they are the audited reveal-only quiz schema field
// used by Modules 2 / 3 / 4 / 5 to look up the correct option
// for the post-pick translation/explanation reveal. They are
// NOT a "raw quiz answer log" persisted to the server — that
// surface stays off-limits and the rest of this pattern guards
// it.
const RAW_QUIZ_PATTERN =
  /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["Module 5 route", stripJsComments(pageSrc)],
  ["Module 5 content", module5Code],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("14) no raw quiz fields introduced on the Module 5 deck surface");

// ─────────────────────────────────────────────────────────────────────────
// 15. No restricted system touched
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
const status = execSync("git status --porcelain -uall", {
  cwd: root,
  encoding: "utf8",
});
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
      assert.fail(`restricted system touched by Module 5 deck PR: ${file}`);
    }
  }
}
ok("15) no restricted system touched (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO)");

console.log(`\n${pass} Module 5 lesson-deck assertions passed`);
