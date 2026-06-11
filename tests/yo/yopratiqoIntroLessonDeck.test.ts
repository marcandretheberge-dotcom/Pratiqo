/**
 * tests/yo/yopratiqoIntroLessonDeck.test.ts
 *
 * Static contract test for the Dominican Republic YoPratiqo
 * Intro deck (the free A1 entry into the learning path).
 *
 * Locks in the
 * `feat/yopratiqo-module5-and-intro-decks` redesign:
 *
 *   • The Intro lives at its own route
 *     `/yo/langues/espagnol/pays/republique-dominicaine/intro`
 *     (not an in-page `#yo-intro-experience` scroll anchor).
 *   • The Intro composer mounts the shared <YoLessonDeck />.
 *   • The Intro deck has 8 focused screens that wrap the audited
 *     intro educational surfaces (learning frame, lesson cards,
 *     culture panorama, dictionary, flashcards, quiz).
 *   • The Intro inherits no-scroll / swipe / tap-zone deck
 *     behaviour from the shared deck (asserted indirectly via
 *     the shared deck file).
 *   • The Intro uses the eight audited companion visual states
 *     (map / confused / celebrating) and never invents an AI-
 *     tutor state.
 *   • The Intro preserves existing intro / dictionary / flashcard
 *     / quiz content.
 *   • The Intro final-screen CTA points at the real Module 2
 *     route — NOT a fake paid unlock, NOT a fake progress
 *     payload (the audited
 *     `dominicanRdModuleProgressPayload(...)` helper does not
 *     yet cover an `intro` / `module-1` row, so the Intro deck
 *     intentionally ships no mark-completed button — the brief is
 *     explicit on this point).
 *   • The Course Home primary CTA + roadmap step 01 point at the
 *     real Intro deck route, not the legacy in-page anchor.
 *   • No 5-level breadcrumb trail on the Intro route.
 *   • No raw quiz fields introduced, paid YoPratiqo checkout
 *     remains disabled, no restricted-system path touched.
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

let pass = 0;
const ok = (label: string) => {
  pass += 1;
  console.log(`  ok  ${label}`);
};

/**
 * Strip JS/TS comments (block + line) so a "no fake AI tutor" /
 * "no Stripe" regex never matches a documentation-comment
 * example. Mirrors the helper used by the Module 3 / 4 deck
 * tests so the contract style is consistent across the deck
 * test suite.
 */
function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// ─────────────────────────────────────────────────────────────────────────
// Paths under contract
// ─────────────────────────────────────────────────────────────────────────

const INTRO_ROUTE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/intro/page.tsx";
const INTRO_CONTENT_PATH = "components/yo/DominicanRepublicIntroContent.tsx";
const COUNTRY_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";
const HERO_PATH = "components/yo/YoCourseHero.tsx";
const DECK_PATH = "components/yo/YoLessonDeck.tsx";
const PROGRESS_PAYLOADS_PATH = "lib/yo/dominicanRepublicProgressPayloads.ts";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

const introRouteSrc = read(INTRO_ROUTE_PATH);
const introContentSrc = read(INTRO_CONTENT_PATH);
const introContentCode = stripJsComments(introContentSrc);
const countrySrc = read(COUNTRY_PAGE_PATH);
const heroSrc = read(HERO_PATH);
const deckSrc = read(DECK_PATH);
// Visual classes (root, header, stage, nav, screen card) were
// extracted into `lib/yo/lessonDeckVisualContract.ts` in the
// `feat/yopratiqo-deck-visual-consistency-pass` PR. Visual-class
// assertions match against the union of the shell file + the
// shared contract; behaviour assertions stay on `deckSrc`.
const visualContractSrc = read("lib/yo/lessonDeckVisualContract.ts");
const deckShellSrc = `${deckSrc}\n${visualContractSrc}`;

// ─────────────────────────────────────────────────────────────────────────
// 1. Intro route exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, INTRO_ROUTE_PATH)),
  "Intro deck page must exist at app/yo/langues/espagnol/pays/republique-dominicaine/intro/page.tsx",
);
assert.match(
  introRouteSrc,
  /export\s+default\s+async\s+function\s+\w*Intro\w*Page/,
  "Intro route must export a default async page component",
);
assert.match(
  introRouteSrc,
  /import\s*\{\s*DominicanRepublicIntroContent\s*\}\s*from\s*["']@\/components\/yo\/DominicanRepublicIntroContent["']/,
  "Intro route must import the DominicanRepublicIntroContent composer",
);
assert.match(
  introRouteSrc,
  /<DominicanRepublicIntroContent\s+locale=\{locale\}/,
  "Intro route must mount <DominicanRepublicIntroContent locale={locale} />",
);
ok("1) Intro route exists at /yo/langues/espagnol/pays/republique-dominicaine/intro");

// ─────────────────────────────────────────────────────────────────────────
// 2. Intro route uses the shared <YoLessonDeck /> orchestrator
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  introContentSrc,
  /import\s*\{\s*YoLessonDeck\s*\}\s*from\s*["']@\/components\/yo\/YoLessonDeck["']/,
  "Intro composer must import YoLessonDeck",
);
assert.match(
  introContentCode,
  /<YoLessonDeck\b/,
  "Intro composer must mount <YoLessonDeck />",
);
ok("2) Intro composer uses the shared <YoLessonDeck /> orchestrator");

// ─────────────────────────────────────────────────────────────────────────
// 3. Intro has focused screens (the per-screen markers prove
//    they were actually composed, not a single long-scroll page)
// ─────────────────────────────────────────────────────────────────────────

const INTRO_SCREEN_IDS = [
  "welcome",
  "how-it-works",
  "phrases",
  "culture",
  "dictionary",
  "flashcards",
  "quiz",
  "ready",
] as const;
for (const id of INTRO_SCREEN_IDS) {
  assert.ok(
    introContentSrc.includes(`data-yo-intro-deck-screen="${id}"`),
    `Intro deck must render the focused "${id}" screen via the data-yo-intro-deck-screen marker`,
  );
}
ok(`3) Intro deck has ${INTRO_SCREEN_IDS.length} focused lesson screens (welcome → ready)`);

// ─────────────────────────────────────────────────────────────────────────
// 4. Intro inherits the no-scroll / swipe / tap-zone behaviour
//    from the shared YoLessonDeck
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckShellSrc,
  /h-\[100dvh\]/,
  "Shared deck must lock the viewport with h-[100dvh] (declared in the shared visual contract)",
);
assert.match(
  deckSrc,
  /onPointerDown=\{/,
  "Shared deck must implement swipe navigation via onPointerDown",
);
assert.match(
  introContentSrc,
  /enableTapNavigation/,
  "Intro deck must opt into tap-zone navigation (enableTapNavigation prop)",
);
ok("4) Intro deck inherits no-scroll / swipe / tap-zone behaviour from the shared deck");

// ─────────────────────────────────────────────────────────────────────────
// 5. Intro uses audited companion visual states (map / confused /
//    celebrating) and never invents an AI-tutor state
// ─────────────────────────────────────────────────────────────────────────

for (const state of ["map", "confused", "celebrating"] as const) {
  assert.ok(
    introContentCode.includes(`companionState: "${state}"`),
    `Intro deck must use the audited companion visual state "${state}"`,
  );
}
// AI-tutor / fake personalised feedback / fake teacher report
// shapes have specific tells. None of them may show up on the
// Intro surface.
assert.doesNotMatch(
  introContentCode,
  /\b(?:aiTutor|ai_tutor|aiCoach|ai_coach|aiFeedback|ai_feedback|personalizedFeedback|personalized_feedback)\b/i,
  "Intro deck must not introduce a fake AI tutor / personalised feedback surface",
);
ok("5) Intro deck uses audited companion visual states (map / confused / celebrating) and no fake AI-tutor state");

// ─────────────────────────────────────────────────────────────────────────
// 6. Intro preserves existing intro / dictionary / flashcard / quiz
//    educational content
// ─────────────────────────────────────────────────────────────────────────

// Both YoIntroLearningFrame and YoCulturePanorama live in the
// same file (`YoIntroCultureFrame`). The order they are
// destructured in is not part of the contract — only that both
// names appear inside a single import statement from that file.
const introCultureFrameImport = introContentSrc.match(
  /import\s*\{([^}]+)\}\s*from\s*["']@\/components\/yo\/YoIntroCultureFrame["']/,
);
assert.ok(
  introCultureFrameImport,
  "Intro composer must import from @/components/yo/YoIntroCultureFrame",
);
assert.match(
  introCultureFrameImport![1],
  /\bYoIntroLearningFrame\b/,
  "Intro composer must reuse YoIntroLearningFrame (existing intro learning frame)",
);
assert.match(
  introCultureFrameImport![1],
  /\bYoCulturePanorama\b/,
  "Intro composer must reuse YoCulturePanorama (existing culture panorama)",
);
assert.match(
  introContentSrc,
  /import\s*\{\s*YoLessonCard\s*\}\s*from\s*["']@\/components\/yo\/YoLessonCard["']/,
  "Intro composer must reuse YoLessonCard (existing lesson cards)",
);
assert.match(
  introContentSrc,
  /import\s*\{\s*YoDominicanDictionary\s*\}\s*from\s*["']@\/components\/yo\/YoDominicanDictionary["']/,
  "Intro composer must reuse YoDominicanDictionary (existing pocket dictionary)",
);
assert.match(
  introContentSrc,
  /import\s*\{\s*YoFlashcardPreview\s*\}\s*from\s*["']@\/components\/yo\/YoFlashcardPreview["']/,
  "Intro composer must reuse YoFlashcardPreview (existing flashcard carousel)",
);
assert.match(
  introContentSrc,
  /import\s*\{\s*YoQuizPreview\s*\}\s*from\s*["']@\/components\/yo\/YoQuizPreview["']/,
  "Intro composer must reuse YoQuizPreview (existing quiz preview)",
);
// And they must actually be mounted somewhere in the composer.
for (const componentTag of [
  "<YoIntroLearningFrame",
  "<YoCulturePanorama",
  "<YoLessonCard",
  "<YoDominicanDictionary",
  "<YoFlashcardPreview",
  "<YoQuizPreview",
] as const) {
  assert.ok(
    introContentCode.includes(componentTag),
    `Intro composer must mount ${componentTag} … />`,
  );
}
// And the intro data file must be the source of truth (so the
// preserved content stays in sync with the long-scroll surface
// still mounted on the Course Home).
assert.match(
  introContentSrc,
  /import\s*\{\s*dominicanRepublicA1\s*\}\s*from\s*["']@\/lib\/yo\/dominicanRepublicA1["']/,
  "Intro composer must source its content from lib/yo/dominicanRepublicA1.ts (no duplicated educational content)",
);
ok("6) Intro deck preserves existing intro / dictionary / flashcard / quiz educational content");

// ─────────────────────────────────────────────────────────────────────────
// 7. Intro final CTA points to Module 2 (and the Module 2 page
//    actually exists)
// ─────────────────────────────────────────────────────────────────────────

const MODULE_2_PATH = "/yo/langues/espagnol/pays/republique-dominicaine/module-2";
assert.ok(
  introContentSrc.includes(MODULE_2_PATH),
  "Intro deck must link the final-screen CTA to the real Module 2 route",
);
assert.match(
  introContentSrc,
  /data-yo-intro-deck-next-module=["']module-2["']/,
  "Intro deck final-screen CTA must carry the stable data-yo-intro-deck-next-module=\"module-2\" marker",
);
assert.ok(
  existsSync(
    path.join(root, "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx"),
  ),
  "Module 2 page must exist (no fake routes)",
);
ok("7) Intro deck final CTA points to the real Module 2 route");

// ─────────────────────────────────────────────────────────────────────────
// 8. Course Home primary CTA points to the real Intro route,
//    NOT the legacy `#yo-intro-experience` anchor
// ─────────────────────────────────────────────────────────────────────────

const INTRO_DECK_PATH =
  "/yo/langues/espagnol/pays/republique-dominicaine/intro";
assert.ok(
  heroSrc.includes(INTRO_DECK_PATH),
  "YoCourseHero primary CTA must reach the real Intro deck route",
);
assert.doesNotMatch(
  heroSrc,
  /href=\{?\s*["']#yo-intro-experience["']/,
  "YoCourseHero primary CTA must NOT use the legacy `#yo-intro-experience` in-page anchor",
);
ok("8) Course Home primary CTA points to /intro (not #yo-intro-experience)");

// ─────────────────────────────────────────────────────────────────────────
// 9. Roadmap step 01 (intro) points to the Intro deck route
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  countrySrc,
  /id:\s*["']intro["'][^}]*href:\s*["']\/yo\/langues\/espagnol\/pays\/republique-dominicaine\/intro["']/s,
  "Course Home roadmap step 01 (intro) must link to the real Intro deck route",
);
assert.doesNotMatch(
  countrySrc,
  /id:\s*["']intro["'][^}]*href:\s*["']#yo-intro-experience["']/s,
  "Course Home roadmap step 01 must NOT link to the legacy `#yo-intro-experience` anchor anymore",
);
ok("9) Roadmap step 01 (Intro) points to the real Intro deck route");

// ─────────────────────────────────────────────────────────────────────────
// 10. No 5-level breadcrumb-style primary navigation on the Intro
//     route (the YoLessonDeck header owns the back-to-Course-Home
//     affordance)
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(
  introRouteSrc,
  /from\s+["']@\/components\/yo\/YoBreadcrumb["']/,
  "Intro route must NOT import YoBreadcrumb (no breadcrumb-style primary nav)",
);
assert.doesNotMatch(
  introRouteSrc,
  /<YoBreadcrumb\b/,
  "Intro route must NOT render <YoBreadcrumb />",
);
assert.doesNotMatch(
  introContentSrc,
  /<YoBreadcrumb\b/,
  "Intro composer must NOT render <YoBreadcrumb /> (deck header replaces it)",
);
ok("10) Intro route + composer drop breadcrumb-style primary navigation");

// ─────────────────────────────────────────────────────────────────────────
// 11. No fake paid unlock + no fake Intro progress payload
//
// The audited `dominicanRdModuleProgressPayload(...)` helper does
// not currently cover an `intro` / `module-1` row. The brief is
// explicit: if not safe, the final screen directs to Module 2
// WITHOUT adding persistence. So the Intro deck must NOT call
// the payload helper and must NOT mount a mark-completed button.
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(
  introContentCode,
  /<YoMarkModuleCompletedButton\b/,
  "Intro deck must NOT mount <YoMarkModuleCompletedButton /> (no audited Intro progress payload yet)",
);
assert.doesNotMatch(
  introContentCode,
  /dominicanRdModuleProgressPayload\(/,
  "Intro composer must NOT call dominicanRdModuleProgressPayload(...) (no audited Intro progress payload yet)",
);
// And the audited helper itself must NOT have been quietly
// extended to cover an `intro` / `module-1` row in this PR.
const payloadsSrc = read(PROGRESS_PAYLOADS_PATH);
assert.doesNotMatch(
  payloadsSrc,
  /"(?:intro|module-1)"\s*:/,
  "dominicanRdModuleProgressPayload MODULE_META map must NOT contain an `intro` / `module-1` row in this PR",
);
// No paid-unlock surface on the Intro composer. Doc-comments
// inside the composer reference the words "Stripe" / "price_id"
// to spell out exactly what is NOT being added, so we check the
// comment-stripped source — the contract is "no real code path
// uses Stripe", not "the file never mentions Stripe in a doc
// comment".
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
assert.doesNotMatch(
  introContentCode,
  STRIPE_PATTERN,
  "Intro composer must not introduce any Stripe / price_id references in code (no fake paid unlock)",
);
assert.doesNotMatch(
  stripJsComments(introRouteSrc),
  STRIPE_PATTERN,
  "Intro route must not introduce any Stripe / price_id references in code",
);
ok("11) Intro deck does NOT fake a paid unlock and does NOT fake a progress payload");

// ─────────────────────────────────────────────────────────────────────────
// 12. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

// `correctOptionId` / `correct_option_id` are intentionally
// EXCLUDED: the audited reveal-only quiz schema used by
// `<YoQuizPreview />` (which the Intro deck mounts) reads that
// field locally to look up the correct option for the post-pick
// translation/explanation reveal. It is NOT a "raw quiz answer
// log" persisted to the server — that surface stays off-limits
// and the rest of this pattern guards it.
const RAW_QUIZ_PATTERN =
  /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["Intro route", stripJsComments(introRouteSrc)],
  ["Intro composer", introContentCode],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("12) no raw quiz fields introduced on the Intro deck surface");

// ─────────────────────────────────────────────────────────────────────────
// 13. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
ok("13) paid YoPratiqo checkout remains disabled");

// ─────────────────────────────────────────────────────────────────────────
// 14. No restricted system touched (Stripe / payments / tax / RLS
//     / migrations / legal / Membre Pro / audio / SEO)
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
      assert.fail(`restricted system touched by Intro deck PR: ${file}`);
    }
  }
}
ok("14) no restricted system touched (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO)");

console.log(`\n${pass} Intro lesson-deck assertions passed`);
