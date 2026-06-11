/**
 * tests/yo/yopratiqoLessonDeckNoScrollSwipe.test.ts
 *
 * Static contract test for the no-scroll / swipe / opt-in tap
 * upgrade to the YoPratiqo lesson deck. Defends:
 *
 *   • the viewport-locked layout (`h-[100dvh]` flex column,
 *     no primary document scroll inside module lessons);
 *   • the active screen card's `overflow-y-auto overscroll-contain`
 *     fallback for the rare tall-content screen, so internal
 *     scroll never leaks up to the document;
 *   • the swipe gesture handlers (pointer-based, with a 56 px
 *     threshold and a horizontal-vs-vertical dominance check
 *     so vertical scrolls never trigger Back / Next);
 *   • the interactive-element guard
 *     (`button, a[href], input, textarea, select, summary,
 *     details, [role="button"], [data-no-deck-swipe],
 *     [data-no-deck-tap]`) so audio buttons, the
 *     `<details>` quiz reveals, the flashcard carousel, the
 *     mark-completed button, etc. are never accidentally
 *     hijacked;
 *   • the opt-in tap-zone navigation (left 30 % = Back,
 *     right 30 % = Next), defaulted to off for safety, opted
 *     in only by Module 2;
 *   • preservation of ArrowLeft / ArrowRight keyboard
 *     navigation;
 *   • preservation of every contract the prior PRs locked in
 *     (Module 2 still mounts `<YoMarkModuleCompletedButton>`,
 *     browser-speech audio affordances stay intact, paid
 *     YoPratiqo checkout disabled, no raw quiz fields, no
 *     restricted-system path touched).
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

let pass = 0;
const ok = (label: string) => {
  pass += 1;
  console.log(`  ok  ${label}`);
};

// ─────────────────────────────────────────────────────────────────────────
// Paths under contract
// ─────────────────────────────────────────────────────────────────────────

const DECK_PATH = "components/yo/YoLessonDeck.tsx";
const HEADER_PATH = "components/yo/YoLessonDeckHeader.tsx";
const NAV_PATH = "components/yo/YoLessonDeckNav.tsx";
const SCREEN_PATH = "components/yo/YoLessonDeckScreen.tsx";
const VISUAL_CONTRACT_PATH = "lib/yo/lessonDeckVisualContract.ts";
const MODULE2_CONTENT_PATH = "components/yo/DominicanRepublicModule2Content.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

const deckSrc = read(DECK_PATH);
const headerSrc = read(HEADER_PATH);
const navSrc = read(NAV_PATH);
const screenSrc = read(SCREEN_PATH);
const visualContractSrc = read(VISUAL_CONTRACT_PATH);
const module2Src = read(MODULE2_CONTENT_PATH);

// The deck's chrome visual classes (root, header, stage, nav,
// per-screen card, companion bubble) were extracted into
// `lib/yo/lessonDeckVisualContract.ts` in the
// `feat/yopratiqo-deck-visual-consistency-pass` PR so every
// deck route inherits the same tokens. Visual-class assertions
// therefore match against the union of the shell file + the
// shared contract — behaviour assertions (useCallback,
// onPointerDown, ArrowLeft, etc.) still target the deck shell
// directly. The contract file itself is asserted to declare
// the canonical class strings (see "1)" and "2)" below).
const deckShellSrc = `${deckSrc}\n${visualContractSrc}`;

// ─────────────────────────────────────────────────────────────────────────
// 1. Deck supports no-primary-scroll app viewport behavior
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckShellSrc,
  /\bflex\s+h-\[100dvh\]\s+flex-col\b/,
  "deck root must be a viewport-locked flex column (flex h-[100dvh] flex-col) — declared in the shared visual contract and consumed by YoLessonDeck",
);
assert.match(
  deckShellSrc,
  /\boverflow-hidden\b/,
  "deck root must clip overflow so accidental child growth never reaches the document body",
);
// The deck shell must import the canonical visual contract,
// otherwise the contract above would be declared but never
// applied.
assert.match(
  deckSrc,
  /from\s+["']@\/lib\/yo\/lessonDeckVisualContract["']/,
  "YoLessonDeck must import its visual classes from the shared lessonDeckVisualContract",
);
assert.match(
  deckSrc,
  /DECK_ROOT_CLASSES\b/,
  "YoLessonDeck must consume the shared DECK_ROOT_CLASSES token",
);
// The header + nav must be shrink-0 flex items so they always
// fit inside the dvh column without competing for the stage's
// flex-1 space. The `shrink-0` declarations live in
// `DECK_HEADER_CLASSES` / `DECK_NAV_CLASSES` inside the shared
// visual contract; the header / nav files import + apply them.
assert.match(
  `${headerSrc}\n${visualContractSrc}`,
  /\bshrink-0\b/,
  "deck header must be a shrink-0 flex item",
);
assert.match(
  `${navSrc}\n${visualContractSrc}`,
  /\bshrink-0\b/,
  "deck nav must be a shrink-0 flex item",
);
ok("1) deck root locks the viewport (h-[100dvh] flex column, overflow-hidden, shrink-0 chrome)");

// ─────────────────────────────────────────────────────────────────────────
// 2. Deck uses 100dvh or equivalent safe viewport sizing
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckShellSrc,
  /h-\[100dvh\]/,
  "deck must use h-[100dvh] (dynamic viewport height — falls back gracefully on browsers that do not support dvh)",
);
// The safe-area-inset-bottom padding lives in `DECK_NAV_CLASSES`
// in the shared contract; the nav file imports it. Asserting on
// the union of `navSrc + visualContractSrc` so both the
// canonical declaration and the consumption are protected.
assert.match(
  `${navSrc}\n${visualContractSrc}`,
  /env\(safe-area-inset-bottom\)/,
  "deck nav must respect the iOS bottom safe-area so the home indicator does not eat the Next button",
);
ok("2) deck uses h-[100dvh] + iOS safe-area-inset-bottom padding on the nav");

// ─────────────────────────────────────────────────────────────────────────
// 3. Active screen area uses overflow-hidden / min-h-0 pattern
// ─────────────────────────────────────────────────────────────────────────

// The stage container is `flex-1 min-h-0` inside the dvh
// column. `min-h-0` is the standard Tailwind trick that lets a
// flex child shrink below its natural content height when the
// viewport is small — without it, the flex-1 stage would grow
// the parent and re-introduce page scroll.
assert.match(
  deckShellSrc,
  /\bflex-1\b[\s\S]{0,200}\bmin-h-0\b|\bmin-h-0\b[\s\S]{0,200}\bflex-1\b/,
  "deck stage must be `flex-1 min-h-0` so it fills remaining space without breaking the dvh lock",
);
ok("3) deck stage uses the flex-1 + min-h-0 viewport pattern");

// ─────────────────────────────────────────────────────────────────────────
// 4. Internal scroll is limited to screen/card fallback, not the document
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckShellSrc,
  /\boverflow-y-auto\s+overscroll-contain\b/,
  "deck must allow `overflow-y-auto overscroll-contain` on the active screen card as a fallback — never on the document body",
);
// The fallback only fires on the *active* screen host (only
// one is visible at a time) — non-active screens stay
// `display: none` so the page never adds up the heights of
// every screen.
assert.match(
  deckSrc,
  /isActive\s*\?\s*["']block["']\s*:\s*["']hidden["']/,
  "non-active screens must be `display: hidden` so their internal scroll never adds up to a document-level scroll",
);
ok("4) internal scroll is scoped to the active screen card (overflow-y-auto overscroll-contain) — never the document");

// ─────────────────────────────────────────────────────────────────────────
// 5. Swipe navigation handlers exist
// ─────────────────────────────────────────────────────────────────────────

assert.match(deckSrc, /onPointerDown\s*=\s*\{onPointerDown\}/);
assert.match(deckSrc, /onPointerUp\s*=\s*\{onPointerUp\}/);
assert.match(deckSrc, /onPointerCancel\s*=\s*\{onPointerCancel\}/);
assert.match(
  deckSrc,
  /const\s+onPointerDown\s*=\s*useCallback\b/,
  "deck must define onPointerDown as a memoized handler",
);
assert.match(
  deckSrc,
  /const\s+onPointerUp\s*=\s*useCallback\b/,
  "deck must define onPointerUp as a memoized handler",
);
ok("5) swipe navigation handlers exist (onPointerDown / onPointerUp / onPointerCancel on the stage)");

// ─────────────────────────────────────────────────────────────────────────
// 6. Swipe threshold exists
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckSrc,
  /export\s+const\s+YO_LESSON_DECK_SWIPE_THRESHOLD_PX\s*=\s*(\d+)/,
  "deck must export a named swipe-threshold constant",
);
const thresholdMatch = deckSrc.match(
  /export\s+const\s+YO_LESSON_DECK_SWIPE_THRESHOLD_PX\s*=\s*(\d+)/,
);
const threshold = thresholdMatch ? Number(thresholdMatch[1]) : 0;
assert.ok(
  threshold >= 48 && threshold <= 96,
  `swipe threshold must fall within the audited 48–96 px range (got ${threshold})`,
);
assert.match(
  deckSrc,
  /adx\s*>=\s*YO_LESSON_DECK_SWIPE_THRESHOLD_PX/,
  "deck must compare horizontal delta against the swipe-threshold constant",
);
ok(`6) swipe threshold exists and is sane (${threshold} px, in the 48–96 px range)`);

// ─────────────────────────────────────────────────────────────────────────
// 7. Vertical gestures are ignored
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckSrc,
  /export\s+const\s+YO_LESSON_DECK_HORIZONTAL_DOMINANCE_RATIO\b/,
  "deck must export a horizontal-dominance-ratio constant",
);
assert.match(
  deckSrc,
  /adx\s*>=\s*ady\s*\*\s*YO_LESSON_DECK_HORIZONTAL_DOMINANCE_RATIO/,
  "deck must require horizontal delta to dominate over vertical delta before triggering Back / Next",
);
// Explicit early-return when the gesture is vertical-dominant
// — this keeps the fallback per-card scroll usable without the
// deck ever stealing the gesture.
assert.match(
  deckSrc,
  /if\s*\(\s*ady\s*>\s*adx\s*\)\s*return\s*;/,
  "deck must explicitly bail when the drag is vertical-dominant",
);
ok("7) vertical-dominant gestures are ignored (horizontal dominance ratio + explicit vertical bail)");

// ─────────────────────────────────────────────────────────────────────────
// 8. Interactive elements are excluded from swipe / tap navigation
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckSrc,
  /const\s+YO_LESSON_DECK_GESTURE_EXCLUDE_SELECTOR\s*=/,
  "deck must declare a single named gesture-exclude selector",
);
const excludeSelector = (() => {
  const m = deckSrc.match(
    /YO_LESSON_DECK_GESTURE_EXCLUDE_SELECTOR\s*=\s*(['"`])([\s\S]*?)\1/,
  );
  return m ? m[2] : "";
})();
for (const required of [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "summary",
  "details",
  '[role="button"]',
  "[data-no-deck-swipe]",
  "[data-no-deck-tap]",
] as const) {
  assert.ok(
    excludeSelector.includes(required),
    `gesture-exclude selector must include \`${required}\` so it is never hijacked`,
  );
}
// The chrome (header + nav + progress strip) must carry the
// escape-hatch data attributes so a swipe started on the
// chrome never triggers navigation.
assert.match(headerSrc, /data-no-deck-swipe="true"/);
assert.match(headerSrc, /data-no-deck-tap="true"/);
assert.match(navSrc, /data-no-deck-swipe="true"/);
assert.match(navSrc, /data-no-deck-tap="true"/);
assert.match(deckSrc, /data-no-deck-swipe="true"/);
assert.match(deckSrc, /data-no-deck-tap="true"/);
// Both pointerdown and pointerup re-check the interactive
// guard — pointerup matters because the user can lift their
// finger on a button at the end of a drag.
const isInsideInteractiveCalls = (
  deckSrc.match(/isInsideInteractive\(\s*event\.target\s*\)/g) ?? []
).length;
assert.ok(
  isInsideInteractiveCalls >= 2,
  `deck must check isInsideInteractive() on both pointerdown and pointerup (got ${isInsideInteractiveCalls})`,
);
ok("8) interactive elements are excluded from swipe + tap navigation (closest-selector guard on both pointerdown and pointerup)");

// ─────────────────────────────────────────────────────────────────────────
// 9. Tap-zone navigation exists and is explicitly opt-in
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckSrc,
  /enableTapNavigation\s*\?\s*:\s*boolean/,
  "deck must expose an `enableTapNavigation?: boolean` prop",
);
assert.match(
  deckSrc,
  /enableTapNavigation\s*=\s*false/,
  "tap-zone navigation must default to OFF so consumers opt in deliberately",
);
assert.match(
  deckSrc,
  /if\s*\(\s*!enableTapNavigation\s*\)\s*return\s*;/,
  "deck must short-circuit the tap-zone code path when `enableTapNavigation` is off",
);
// 30 % left / 30 % right tap zones with a 40 % dead-center
// region so a centered tap on a card never produces a surprise
// navigation.
assert.match(
  deckSrc,
  /xPct\s*<\s*0\.3/,
  "deck must treat the left 30% of the stage as a Back tap zone",
);
assert.match(
  deckSrc,
  /xPct\s*>\s*0\.7/,
  "deck must treat the right 30% of the stage as a Next tap zone",
);
// Tap-zone must be gated by a tap-max-move check so a drag is
// never misclassified as a tap.
assert.match(
  deckSrc,
  /YO_LESSON_DECK_TAP_MAX_MOVE_PX\b/,
  "deck must use the audited tap-max-move constant before classifying a gesture as a tap",
);
ok("9) tap-zone navigation exists, defaults to opt-in, and uses 30/40/30 left/dead/right zones with a tap-max-move guard");

// ─────────────────────────────────────────────────────────────────────────
// 10. ArrowLeft / ArrowRight keyboard navigation still exists
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckSrc,
  /event\.key\s*===\s*["']ArrowLeft["']/,
  "deck must keep ArrowLeft = goPrev keyboard navigation",
);
assert.match(
  deckSrc,
  /event\.key\s*===\s*["']ArrowRight["']/,
  "deck must keep ArrowRight = goNext keyboard navigation",
);
assert.match(
  deckSrc,
  /window\.addEventListener\(\s*["']keydown["']/,
  "deck must register a window-level keydown listener for keyboard navigation",
);
// The keyboard handler must skip when the user is typing in a
// form field so it never hijacks input.
assert.match(
  deckSrc,
  /tag\s*===\s*["']input["']/,
  "deck keyboard handler must skip when the active element is an <input>",
);
ok("10) ArrowLeft / ArrowRight keyboard navigation preserved + form-input typing safeguard intact");

// ─────────────────────────────────────────────────────────────────────────
// 11. Module 2 uses the no-scroll / swipe-enabled deck mode
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module2Src,
  /<YoLessonDeck\b[\s\S]*?enableTapNavigation/,
  "Module 2 must opt the lesson deck into tap-zone navigation (after verifying every per-screen interactive control is protected)",
);
assert.match(
  module2Src,
  /function buildModule2DeckScreens\b/,
  "Module 2 must still expose its deck composer (`buildModule2DeckScreens`)",
);
// 11-screen layout — see the screen-id assertion in
// `yopratiqoModuleLessonDeck.test.ts` for the explicit list.
const moduleScreenIds = new Set(
  Array.from(
    module2Src.matchAll(
      /id:\s*["'](mission|phrases|airport|hotel|problems|culture|grammar|flashcards|quiz|mini-mission|completion)["']/g,
    ),
  ).map((m) => m[1]),
);
assert.ok(
  moduleScreenIds.size >= 10,
  `Module 2 must have at least 10 distinct focused lesson screens for the app-like cadence (got ${moduleScreenIds.size})`,
);
ok(`11) Module 2 uses the no-scroll / swipe-enabled deck with ${moduleScreenIds.size} focused screens and tap navigation opted in`);

// ─────────────────────────────────────────────────────────────────────────
// 12. Module 2 still mounts YoMarkModuleCompletedButton
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module2Src,
  /import\s*\{\s*YoMarkModuleCompletedButton\s*\}\s*from\s*["']@\/components\/yo\/YoMarkModuleCompletedButton["']/,
);
assert.match(module2Src, /<YoMarkModuleCompletedButton\b/);
assert.match(
  module2Src,
  /payload=\{dominicanRdModuleProgressPayload\(["']module-2["']/,
);
assert.match(module2Src, /data-yo-module2-progress-complete/);
ok("12) Module 2 still mounts YoMarkModuleCompletedButton with its audited payload + progress-complete marker");

// ─────────────────────────────────────────────────────────────────────────
// 13. Module 2 still preserves browser-speech audio affordances
// ─────────────────────────────────────────────────────────────────────────

assert.match(module2Src, /<YoSpeechButton text=\{phrase\.target\}/);
assert.match(module2Src, /<YoSpeechButton text=\{line\.target\}/);
assert.match(module2Src, /<YoSpeechButton text=\{correct\.target\}/);
assert.match(module2Src, /<YoSpeechButton text=\{step\.targetPhrase\}/);
assert.match(
  module2Src,
  /audioMode="browser-speech"/,
  "flashcards must keep their browser-speech carousel mount",
);
assert.match(module2Src, /data-yo-module2-phrase-audio-card/);
assert.match(module2Src, /data-yo-module2-hotel-problem-audio/);
assert.match(module2Src, /data-yo-module2-final-reveal-audio/);
ok("13) Module 2 still ships every browser-speech audio affordance (direct YoSpeechButton mounts + audioMode=\"browser-speech\" carousel)");

// ─────────────────────────────────────────────────────────────────────────
// 14. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(
  productConfigSrc,
  /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/,
);
/**
 * Strip JS / TS comments so doctring privacy disclaimers like
 * "no Stripe / OpenAI / Supabase / etc." (which are
 * intentional reassurances, NOT actual imports) do not trip
 * the literal-string guards below.
 */
const stripJsComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [label, src] of [
  ["YoLessonDeck", deckSrc],
  ["YoLessonDeckHeader", headerSrc],
  ["YoLessonDeckNav", navSrc],
  ["YoLessonDeckScreen", screenSrc],
  ["lessonDeckVisualContract", visualContractSrc],
] as const) {
  assert.doesNotMatch(
    stripJsComments(src),
    STRIPE_PATTERN,
    `${label} must not introduce Stripe / price_id references (in code, not docstrings)`,
  );
}
ok("14) paid YoPratiqo checkout remains disabled and no Stripe references added on the deck surface");

// ─────────────────────────────────────────────────────────────────────────
// 15. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["YoLessonDeck", deckSrc],
  ["YoLessonDeckHeader", headerSrc],
  ["YoLessonDeckNav", navSrc],
  ["YoLessonDeckScreen", screenSrc],
  ["lessonDeckVisualContract", visualContractSrc],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("15) no raw quiz fields introduced on the deck surface");

// ─────────────────────────────────────────────────────────────────────────
// 16. No restricted system touched
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
  // Modules 3, 4, 5, the Intro deck route, and the Intro composer
  // were originally listed here as out-of-scope. They were each
  // promoted to the no-scroll swipe deck pattern in dedicated
  // follow-on PRs
  // (`feat/yopratiqo-module3-lesson-deck`,
  // `feat/yopratiqo-module4-lesson-deck`,
  // `feat/yopratiqo-module5-and-intro-decks`); their dedicated
  // deck tests
  // (`tests/yo/yopratiqoModule3LessonDeck.test.ts`,
  // `tests/yo/yopratiqoModule4LessonDeck.test.ts`,
  // `tests/yo/yopratiqoModule5LessonDeck.test.ts`,
  // `tests/yo/yopratiqoIntroLessonDeck.test.ts`,
  // `tests/yo/yopratiqoFullDominicanPathDeck.test.ts`) now own
  // those contracts. None of them count as a restricted-system
  // touch from this shared-deck behaviour test's perspective.
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
      assert.fail(
        `restricted system touched by no-scroll-swipe deck PR: ${file}`,
      );
    }
  }
}
ok("16) no restricted system touched (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO)");

console.log(`\n${pass} no-scroll-swipe deck assertions passed`);
