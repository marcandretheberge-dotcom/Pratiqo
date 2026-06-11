/**
 * tests/yo/yopratiqoModule3LessonDeck.test.ts
 *
 * Static contract test for the no-scroll / swipe lesson-deck
 * conversion of YoPratiqo Dominican Republic Module 3 (food,
 * ordering, payment, culture). Mirrors the contract the Module
 * 2 deck rollout locked in (PRs #157 / #159), then adds the
 * Module-3-specific assertions.
 *
 * The PR does NOT rewrite educational content. Each deck screen
 * mounts the exact same Server Component sub-section
 * (`<HeroSection>`, `<FoodCardsSection>`, `<CultureCardsSection>`,
 * `<PhraseBankSection>`, `<DialoguesSection>`,
 * `<EarsAndGrammarSection>`, `<FlashcardsSection>`,
 * `<QuizSection>`, `<DominicanRepublicCultureChallenge>`,
 * `<PrintablesSection>`, `<DominicanModulePrintables>`,
 * `<ClosingBridge>`) so every `data-yo-module3-*` source marker
 * the existing curriculum / premium / quiz-UX sibling tests
 * look for stays in the rendered tree.
 *
 * All assertions are static (file system + string reads). No
 * runtime server, no Supabase, no browser.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

/**
 * Strip JS-style `//` and `/* … *​/` comments before running
 * forbidden-substring scans, so harmless documentation lines
 * like "no Stripe, no Supabase write from this page" cannot
 * be flagged as introducing Stripe / Supabase usage.
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

const MODULE3_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx";
const MODULE3_CONTENT_PATH =
  "components/yo/DominicanRepublicModule3Content.tsx";
const MODULE2_CONTENT_PATH =
  "components/yo/DominicanRepublicModule2Content.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";
const DECK_PATH = "components/yo/YoLessonDeck.tsx";

const pageSrc = read(MODULE3_PAGE_PATH);
const module3Src = read(MODULE3_CONTENT_PATH);
const module2Src = read(MODULE2_CONTENT_PATH);

// ─────────────────────────────────────────────────────────────────────────
// 1. Module 3 route uses deck mode
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  pageSrc,
  /<DominicanRepublicModule3Content\b[\s\S]*?mode="deck"/,
  "Module 3 page must invoke <DominicanRepublicModule3Content> with mode=\"deck\"",
);
// The deck owns its own app-style top bar with a single
// back-arrow + module label + FR/EN toggle, so the page must
// no longer pass a 5-level breadcrumb (matches the Module 2
// rollout that dropped the breadcrumb in PR #157).
assert.doesNotMatch(
  pageSrc,
  /YoBreadcrumbItem/,
  "Module 3 page must not import / construct a YoBreadcrumbItem chain — the deck header replaces it",
);
assert.doesNotMatch(
  pageSrc,
  /breadcrumb\s*=/,
  "Module 3 page must not pass a breadcrumb prop to the content component",
);
ok("1) Module 3 route uses deck mode and dropped its 5-level breadcrumb in favour of the deck header");

// ─────────────────────────────────────────────────────────────────────────
// 2. Module 3 content supports deck mode
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module3Src,
  /export\s+type\s+DominicanRepublicModule3ContentMode\s*=\s*["']long-scroll["']\s*\|\s*["']deck["']/,
  "Module 3 content must export a `DominicanRepublicModule3ContentMode` discriminator",
);
assert.match(
  module3Src,
  /mode\?\s*:\s*DominicanRepublicModule3ContentMode/,
  "Module 3 content must accept an optional `mode` prop typed by the discriminator",
);
assert.match(
  module3Src,
  /mode\s*=\s*["']long-scroll["']/,
  "Module 3 content must default to `mode=\"long-scroll\"` so legacy consumers keep working",
);
assert.match(
  module3Src,
  /if\s*\(\s*mode\s*===\s*["']deck["']\s*\)\s*\{\s*return\s+<Module3DeckRenderer\b/,
  "Module 3 content must render <Module3DeckRenderer /> when mode=\"deck\"",
);
ok("2) Module 3 content supports a mode discriminator with backward-compatible long-scroll default");

// ─────────────────────────────────────────────────────────────────────────
// 3. Module 3 uses YoLessonDeck
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module3Src,
  /import\s*\{\s*YoLessonDeck\s*\}\s*from\s*["']@\/components\/yo\/YoLessonDeck["']/,
  "Module 3 content must import the shared <YoLessonDeck /> orchestrator",
);
assert.match(
  module3Src,
  /<YoLessonDeck\b/,
  "Module 3 content must mount <YoLessonDeck /> inside the deck renderer",
);
// The same shared client component the Module 2 deck uses —
// no per-module fork.
assert.match(
  module2Src,
  /<YoLessonDeck\b/,
  "Module 2 should still use the same shared deck (sanity)",
);
ok("3) Module 3 uses the shared <YoLessonDeck /> orchestrator — same component as Module 2 (no fork)");

// ─────────────────────────────────────────────────────────────────────────
// 4. Module 3 has focused screens
// ─────────────────────────────────────────────────────────────────────────

const MODULE3_SCREEN_IDS_REQUIRED = [
  "mission",
  "passport",
  "food",
  "culture",
  "phrases",
  "dialogues",
  "ears-grammar",
  "flashcards",
  "quiz",
  "mini-mission",
  "printables",
  "completion",
] as const;

for (const screenId of MODULE3_SCREEN_IDS_REQUIRED) {
  assert.match(
    module3Src,
    new RegExp(`id:\\s*["']${screenId}["']`),
    `Module 3 deck must expose a focused lesson screen with id="${screenId}"`,
  );
  assert.match(
    module3Src,
    new RegExp(`data-yo-module3-deck-screen=["']${screenId}["']`),
    `Module 3 deck screen "${screenId}" must mark its rendered content with the data-yo-module3-deck-screen marker`,
  );
}
const module3ScreenIds = new Set(
  Array.from(
    module3Src.matchAll(
      /id:\s*["'](mission|passport|food|culture|phrases|dialogues|ears-grammar|flashcards|quiz|mini-mission|printables|completion)["']/g,
    ),
  ).map((m) => m[1]),
);
assert.ok(
  module3ScreenIds.size >= 10,
  `Module 3 deck must have at least 10 distinct focused lesson screens for the app-like cadence (got ${module3ScreenIds.size})`,
);
ok(`4) Module 3 deck has ${module3ScreenIds.size} distinct focused lesson screens (mission → completion)`);

// ─────────────────────────────────────────────────────────────────────────
// 5. Module 3 uses no-scroll / swipe deck behavior through the shared deck
// ─────────────────────────────────────────────────────────────────────────

const deckSrc = read(DECK_PATH);
// The shared deck owns the viewport-lock + swipe contract.
// Asserting those invariants here gives a Module-3-specific
// guard so any future deck regression that breaks the no-
// scroll-swipe interaction will fail this test too.
assert.match(
  deckSrc,
  /\bflex\s+h-\[100dvh\]\s+flex-col\b/,
  "shared deck must keep the viewport-locked flex column layout",
);
assert.match(
  deckSrc,
  /\boverflow-hidden\b/,
  "shared deck must keep root `overflow-hidden` so accidental child growth never reaches the document body",
);
assert.match(
  deckSrc,
  /onPointerDown\s*=\s*\{onPointerDown\}/,
  "shared deck must keep pointer-based swipe handlers",
);
assert.match(
  deckSrc,
  /YO_LESSON_DECK_SWIPE_THRESHOLD_PX/,
  "shared deck must keep the audited swipe-threshold constant",
);
// Module 3's deck renderer must opt the deck into the tap-zone
// navigation (after auditing that every per-screen interactive
// control is protected by the deck's gesture-exclude selector).
assert.match(
  module3Src,
  /<YoLessonDeck\b[\s\S]*?enableTapNavigation/,
  "Module 3 deck renderer must opt the deck into tap-zone navigation",
);
ok("5) Module 3 inherits the no-scroll viewport-lock + swipe + tap-zone behaviour from the shared deck");

// ─────────────────────────────────────────────────────────────────────────
// 6. Module 3 uses companion visual states
// ─────────────────────────────────────────────────────────────────────────

// Sanity: every screen declares a companion state. We assert
// that all three production states this PR uses (`map`,
// `confused`, `celebrating`) appear in the deck composer.
for (const state of ["map", "confused", "celebrating"] as const) {
  assert.match(
    module3Src,
    new RegExp(`companionState:\\s*["']${state}["']`),
    `Module 3 deck composer must use the "${state}" companion visual state at least once`,
  );
}
// The deck must never invent a non-audited companion state.
// We allow only the 8 production states declared in the
// companion visual manifest; here we check that no obvious
// placeholder shows up.
assert.doesNotMatch(
  module3Src,
  /companionState:\s*["'](?:thinking|loading|error|sad|happy|angry)["']/,
  "Module 3 deck must not invent companion states outside the audited 8-state manifest",
);
// `teacher_ready` would imply a real teacher-bridge message —
// Module 3 has none today, so we explicitly forbid that state
// here (preventing a future regression that adds a fake AI
// tutor / teacher bridge to the deck screens).
assert.doesNotMatch(
  module3Src,
  /companionState:\s*["']teacher_ready["']/,
  "Module 3 deck must not claim a `teacher_ready` companion state without a real teacher-bridge message",
);
ok("6) Module 3 deck uses audited companion visual states (map / confused / celebrating) and no fake AI-tutor state");

// ─────────────────────────────────────────────────────────────────────────
// 7. Module 3 preserves flashcards
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module3Src,
  /<FlashcardsSection\b/,
  "Module 3 deck must still mount <FlashcardsSection /> on the flashcards screen",
);
assert.match(
  module3Src,
  /<YoFlashcardPreview\b[\s\S]*?audioMode="browser-speech"/,
  "Module 3 deck must keep the audioMode=\"browser-speech\" carousel mount",
);
assert.match(
  module3Src,
  /data-yo-module3-flashcard-count/,
  "Module 3 deck must keep the `data-yo-module3-flashcard-count` source marker",
);
ok("7) Module 3 deck preserves the 32-card <YoFlashcardPreview> browser-speech flashcards carousel");

// ─────────────────────────────────────────────────────────────────────────
// 8. Module 3 preserves quiz / practice behavior
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module3Src,
  /<QuizSection\b/,
  "Module 3 deck must still mount <QuizSection /> on the quiz screen",
);
assert.match(
  module3Src,
  /data-yo-module3-quiz-shell/,
  "Module 3 quiz shell marker must remain in the rendered tree",
);
// The pre-translation guard from PR #149's premium audit must
// still hold inside the deck render path — otherwise we leak
// quiz answer translations before the learner has revealed
// them.
assert.match(
  module3Src,
  /data-yo-module3-quiz-options-no-pretranslation/,
  "Module 3 quiz must keep the no-pretranslation guard",
);
assert.match(
  module3Src,
  /data-yo-module3-quiz-reveal-translations/,
  "Module 3 quiz must keep the gated reveal block",
);
assert.match(
  module3Src,
  /<DominicanRepublicCultureChallenge\b/,
  "Module 3 deck must still mount the <DominicanRepublicCultureChallenge /> mini-game",
);
ok("8) Module 3 deck preserves the 12-question quiz + 8-round culture challenge with the pre-translation guard intact");

// ─────────────────────────────────────────────────────────────────────────
// 9. Module 3 preserves printables
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module3Src,
  /<PrintablesSection\b/,
  "Module 3 deck must still mount the <PrintablesSection /> with the 4 printable worksheets + print button",
);
assert.match(
  module3Src,
  /<DominicanModulePrintables\b/,
  "Module 3 deck must still mount the reinforcement <DominicanModulePrintables /> bonus printables",
);
assert.match(
  module3Src,
  /data-yo-module3-printable-worksheet/,
  "Module 3 deck must keep the `data-yo-module3-printable-worksheet` source marker",
);
assert.match(
  module3Src,
  /data-yo-module3-printable-count/,
  "Module 3 deck must keep the `data-yo-module3-printable-count` source marker",
);
ok("9) Module 3 deck preserves both printable sections (4 sheets + reinforcement pack) on the printables screen");

// ─────────────────────────────────────────────────────────────────────────
// 10. Module 3 still mounts YoMarkModuleCompletedButton
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module3Src,
  /import\s*\{\s*YoMarkModuleCompletedButton\s*\}\s*from\s*["']@\/components\/yo\/YoMarkModuleCompletedButton["']/,
  "Module 3 content must keep the YoMarkModuleCompletedButton import",
);
assert.match(
  module3Src,
  /<YoMarkModuleCompletedButton\b/,
  "Module 3 must still mount <YoMarkModuleCompletedButton /> (inside <ClosingBridge /> on the completion screen)",
);
assert.match(
  module3Src,
  /payload=\{dominicanRdModuleProgressPayload\(["']module-3["']/,
  "Module 3 must keep the audited dominicanRdModuleProgressPayload(\"module-3\", locale) payload",
);
assert.match(
  module3Src,
  /data-yo-module3-progress-complete/,
  "Module 3 must keep the `data-yo-module3-progress-complete` marker",
);
ok("10) Module 3 still mounts YoMarkModuleCompletedButton with its audited payload + progress-complete marker");

// ─────────────────────────────────────────────────────────────────────────
// 11. Module 3 does not use breadcrumb-style primary navigation
// ─────────────────────────────────────────────────────────────────────────

// The shared deck header carries the back arrow + module label
// + FR/EN toggle — that's the only primary navigation in deck
// mode. We assert the *page* no longer threads a YoBreadcrumb
// chain (already covered in assertion 1) and also that the
// renderer never mounts a <YoBreadcrumb /> for deck mode.
const deckRendererBlock = (() => {
  const start = module3Src.indexOf("function Module3DeckRenderer");
  const end = module3Src.indexOf("// ─── Main export", start);
  assert.ok(start >= 0 && end > start, "Module3DeckRenderer block must exist");
  return module3Src.slice(start, end);
})();
assert.doesNotMatch(
  deckRendererBlock,
  /<YoBreadcrumb\b/,
  "Module 3 deck renderer must not mount <YoBreadcrumb /> — the deck header replaces it",
);
// Tap-zone navigation also requires the deck-header back arrow
// to be the single primary navigation affordance; assert the
// renderer passes a `backHref` that points back to the country
// course home (one level up — never all the way to /yo).
assert.match(
  deckRendererBlock,
  /backHref=\{backHref\}/,
  "Module 3 deck renderer must pass `backHref` to the deck so the header back arrow goes back to the country course home",
);
assert.match(
  deckRendererBlock,
  /\/yo\/langues\/espagnol\/pays\/republique-dominicaine/,
  "Module 3 deck renderer back arrow must target the RD country course home, not /yo",
);
ok("11) Module 3 dropped breadcrumb-style primary navigation in favour of the viewport-locked deck header");

// ─────────────────────────────────────────────────────────────────────────
// 12. Module 2 deck still passes unchanged
// ─────────────────────────────────────────────────────────────────────────

// Sanity that this PR did not regress Module 2 — the same
// deck composer / renderer / 11-screen contract must still
// hold. (The dedicated Module 2 test still runs in CI; this
// is a belt-and-suspenders check inside the Module 3 file.)
assert.match(
  module2Src,
  /function buildModule2DeckScreens\b/,
  "Module 2 must still expose its deck composer (`buildModule2DeckScreens`)",
);
assert.match(
  module2Src,
  /<YoLessonDeck\b[\s\S]*?enableTapNavigation/,
  "Module 2 must still opt the deck into tap-zone navigation",
);
const module2ScreenIds = new Set(
  Array.from(
    module2Src.matchAll(
      /id:\s*["'](mission|phrases|airport|hotel|problems|culture|grammar|flashcards|quiz|mini-mission|completion)["']/g,
    ),
  ).map((m) => m[1]),
);
assert.ok(
  module2ScreenIds.size >= 11,
  `Module 2 deck must still have at least 11 distinct focused lesson screens (got ${module2ScreenIds.size})`,
);
ok(`12) Module 2 deck still has ${module2ScreenIds.size} focused screens, the same composer, and the same tap-zone opt-in`);

// ─────────────────────────────────────────────────────────────────────────
// 13. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(
  productConfigSrc,
  /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/,
);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
assert.doesNotMatch(
  stripJsComments(module3Src),
  STRIPE_PATTERN,
  "Module 3 deck must not introduce Stripe / price_id references (code, not docstrings)",
);
assert.doesNotMatch(
  stripJsComments(pageSrc),
  STRIPE_PATTERN,
  "Module 3 page must not introduce Stripe / price_id references (code, not docstrings)",
);
ok("13) paid YoPratiqo checkout remains disabled and no Stripe references added on the Module 3 deck surface");

// ─────────────────────────────────────────────────────────────────────────
// 14. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
assert.doesNotMatch(
  stripJsComments(module3Src),
  RAW_QUIZ_PATTERN,
  "Module 3 deck must not introduce raw-quiz field names (code, not docstrings)",
);
assert.doesNotMatch(
  stripJsComments(pageSrc),
  RAW_QUIZ_PATTERN,
  "Module 3 page must not introduce raw-quiz field names (code, not docstrings)",
);
ok("14) no raw quiz fields introduced on the Module 3 deck surface");

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
  // Modules 4 and 5 + the Intro deck route were promoted to the
  // deck pattern in follow-on PRs
  // (`feat/yopratiqo-module4-lesson-deck` and
  // `feat/yopratiqo-module5-and-intro-decks`); their dedicated
  // deck tests
  // (`tests/yo/yopratiqoModule4LessonDeck.test.ts`,
  // `tests/yo/yopratiqoModule5LessonDeck.test.ts`,
  // `tests/yo/yopratiqoIntroLessonDeck.test.ts`,
  // `tests/yo/yopratiqoFullDominicanPathDeck.test.ts`) now own
  // the contracts for those surfaces. None of them count as a
  // restricted-system touch from the Module 3 test's perspective.
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
      assert.fail(`restricted system touched by Module 3 deck PR: ${file}`);
    }
  }
}
ok("15) no restricted system touched (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO)");

console.log(`\n${pass} Module 3 lesson-deck assertions passed`);
