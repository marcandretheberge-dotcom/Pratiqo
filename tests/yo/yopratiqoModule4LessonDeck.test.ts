/**
 * tests/yo/yopratiqoModule4LessonDeck.test.ts
 *
 * Static contract test for the no-scroll / swipe lesson-deck
 * conversion of YoPratiqo Dominican Republic Module 4 (getting
 * around, directions, exploring, local navigation, past-tense
 * bridge). Mirrors the contracts the Module 2 and Module 3 deck
 * rollouts locked in (PRs #157 / #159 / #160), then adds the
 * Module-4-specific assertions.
 *
 * The PR does NOT rewrite educational content. Each deck screen
 * mounts the exact same Server Component sub-section
 * (`<HeroSection>`, `<AudioNoticeSection>`, `<PassportSection>`,
 * `<PlaceCardsSection>`, `<PhraseBankSection>`, `<DialoguesSection>`,
 * `<EarsSection>`, `<GrammarSection>`, `<ReadingsSection>`,
 * `<FlashcardsSection>`, `<DominicanRepublicModule4Quiz>`,
 * `<DominicanRepublicExplorerChallenge>`, `<PrintablesSection>`,
 * `<ClosingBridge>`) so every `data-yo-module4-*` source marker
 * the existing Module-4 curriculum / premium / printables sibling
 * tests look for stays in the rendered tree.
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
 * Strip JS-style `//` and block comments before running
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Paths under contract
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MODULE4_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx";
const MODULE4_CONTENT_PATH =
  "components/yo/DominicanRepublicModule4Content.tsx";
const MODULE3_CONTENT_PATH =
  "components/yo/DominicanRepublicModule3Content.tsx";
const MODULE2_CONTENT_PATH =
  "components/yo/DominicanRepublicModule2Content.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";
const DECK_PATH = "components/yo/YoLessonDeck.tsx";

const pageSrc = read(MODULE4_PAGE_PATH);
const module4Src = read(MODULE4_CONTENT_PATH);
const module3Src = read(MODULE3_CONTENT_PATH);
const module2Src = read(MODULE2_CONTENT_PATH);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. Module 4 route uses deck mode
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

assert.match(
  pageSrc,
  /<DominicanRepublicModule4Content\b[\s\S]*?mode="deck"/,
  "Module 4 page must invoke <DominicanRepublicModule4Content> with mode=\"deck\"",
);
// The deck owns its own app-style top bar with a single
// back-arrow + module label + FR/EN toggle, so the page must
// no longer pass a 5-level breadcrumb (matches the Module 2
// and Module 3 rollouts that dropped the breadcrumb).
assert.doesNotMatch(
  pageSrc,
  /YoBreadcrumbItem/,
  "Module 4 page must not import / construct a YoBreadcrumbItem chain â€” the deck header replaces it",
);
assert.doesNotMatch(
  pageSrc,
  /breadcrumb\s*=/,
  "Module 4 page must not pass a breadcrumb prop to the content component",
);
ok("1) Module 4 route uses deck mode and dropped its 5-level breadcrumb in favour of the deck header");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2. Module 4 content supports deck mode
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

assert.match(
  module4Src,
  /export\s+type\s+DominicanRepublicModule4Mode\s*=\s*["']long-scroll["']\s*\|\s*["']deck["']/,
  "Module 4 content must export a `DominicanRepublicModule4Mode` discriminator",
);
assert.match(
  module4Src,
  /mode\?\s*:\s*DominicanRepublicModule4Mode/,
  "Module 4 content must accept an optional `mode` prop typed by the discriminator",
);
assert.match(
  module4Src,
  /mode\s*=\s*["']long-scroll["']/,
  "Module 4 content must default to `mode=\"long-scroll\"` so legacy consumers keep working",
);
assert.match(
  module4Src,
  /if\s*\(\s*mode\s*===\s*["']deck["']\s*\)\s*\{\s*return\s+<Module4DeckRenderer\b/,
  "Module 4 content must render <Module4DeckRenderer /> when mode=\"deck\"",
);
ok("2) Module 4 content supports a mode discriminator with backward-compatible long-scroll default");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 3. Module 4 uses YoLessonDeck
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

assert.match(
  module4Src,
  /import\s*\{\s*YoLessonDeck\s*\}\s*from\s*["']@\/components\/yo\/YoLessonDeck["']/,
  "Module 4 content must import the shared <YoLessonDeck /> orchestrator",
);
assert.match(
  module4Src,
  /<YoLessonDeck\b/,
  "Module 4 content must mount <YoLessonDeck /> inside the deck renderer",
);
// The same shared client component the Module 2 and 3 decks use
// â€” no per-module fork.
assert.match(
  module2Src,
  /<YoLessonDeck\b/,
  "Module 2 should still use the same shared deck (sanity)",
);
assert.match(
  module3Src,
  /<YoLessonDeck\b/,
  "Module 3 should still use the same shared deck (sanity)",
);
ok("3) Module 4 uses the shared <YoLessonDeck /> orchestrator â€” same component as Modules 2 and 3 (no fork)");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4. Module 4 has focused screens
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MODULE4_SCREEN_IDS_REQUIRED = [
  "mission",
  "passport",
  "places",
  "phrases",
  "dialogues",
  "ears-grammar",
  "readings",
  "flashcards",
  "quiz",
  "mini-mission",
  "printables",
  "completion",
] as const;

for (const screenId of MODULE4_SCREEN_IDS_REQUIRED) {
  assert.match(
    module4Src,
    new RegExp(`id:\\s*["']${screenId}["']`),
    `Module 4 deck must expose a focused lesson screen with id="${screenId}"`,
  );
  assert.match(
    module4Src,
    new RegExp(`data-yo-module4-deck-screen=["']${screenId}["']`),
    `Module 4 deck screen "${screenId}" must mark its rendered content with the data-yo-module4-deck-screen marker`,
  );
}
const module4ScreenIds = new Set(
  Array.from(
    module4Src.matchAll(
      /id:\s*["'](mission|passport|places|phrases|dialogues|ears-grammar|readings|flashcards|quiz|mini-mission|printables|completion)["']/g,
    ),
  ).map((m) => m[1]),
);
assert.ok(
  module4ScreenIds.size >= 10,
  `Module 4 deck must have at least 10 distinct focused lesson screens for the app-like cadence (got ${module4ScreenIds.size})`,
);
ok(`4) Module 4 deck has ${module4ScreenIds.size} distinct focused lesson screens (mission â†’ completion)`);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5. Module 4 inherits no-scroll / swipe deck behavior from the shared deck
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const deckSrc = read(DECK_PATH);
// Visual classes (root, header, stage, nav, screen card) were
// extracted into `lib/yo/lessonDeckVisualContract.ts` in the
// `feat/yopratiqo-deck-visual-consistency-pass` PR so every
// deck route inherits the same tokens. Visual-class assertions
// match against the union of the shell file + the shared
// contract; behaviour assertions (onPointerDown, etc.) still
// target the deck shell directly.
const visualContractSrc = read("lib/yo/lessonDeckVisualContract.ts");
const deckShellSrc = `${deckSrc}\n${visualContractSrc}`;
// The shared deck owns the viewport-lock + swipe contract.
// Asserting those invariants here gives a Module-4-specific
// guard so any future deck regression that breaks the no-
// scroll-swipe interaction will fail this test too.
assert.match(
  deckShellSrc,
  /\bflex\s+h-\[100dvh\]\s+flex-col\b/,
  "shared deck must keep the viewport-locked flex column layout (declared in the shared visual contract)",
);
assert.match(
  deckShellSrc,
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
// Module 4's deck renderer must opt the deck into the tap-zone
// navigation (after auditing that every per-screen interactive
// control is protected by the deck's gesture-exclude selector).
assert.match(
  module4Src,
  /<YoLessonDeck\b[\s\S]*?enableTapNavigation/,
  "Module 4 deck renderer must opt the deck into tap-zone navigation",
);
ok("5) Module 4 inherits the no-scroll viewport-lock + swipe + tap-zone behaviour from the shared deck");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6. Module 4 uses companion visual states
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Sanity: every screen declares a companion state. We assert
// that all three production states this PR uses (`map`,
// `confused`, `celebrating`) appear in the deck composer.
for (const state of ["map", "confused", "celebrating"] as const) {
  assert.match(
    module4Src,
    new RegExp(`companionState:\\s*["']${state}["']`),
    `Module 4 deck composer must use the "${state}" companion visual state at least once`,
  );
}
// The deck must never invent a non-audited companion state.
// We allow only the 8 production states declared in the
// companion visual manifest; here we check that no obvious
// placeholder shows up.
assert.doesNotMatch(
  module4Src,
  /companionState:\s*["'](?:thinking|loading|error|sad|happy|angry)["']/,
  "Module 4 deck must not invent companion states outside the audited 8-state manifest",
);
// `teacher_ready` would imply a real teacher-bridge message â€”
// Module 4 has none today (the teacher CTA inside <ClosingBridge>
// is a static link, not a live AI tutor), so we explicitly forbid
// that state here (preventing a future regression that adds a
// fake AI tutor / teacher bridge to the deck screens).
assert.doesNotMatch(
  module4Src,
  /companionState:\s*["']teacher_ready["']/,
  "Module 4 deck must not claim a `teacher_ready` companion state without a real teacher-bridge message",
);
ok("6) Module 4 deck uses audited companion visual states (map / confused / celebrating) and no fake AI-tutor state");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 7. Module 4 preserves flashcards
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

assert.match(
  module4Src,
  /<FlashcardsSection\b/,
  "Module 4 deck must still mount <FlashcardsSection /> on the flashcards screen",
);
assert.match(
  module4Src,
  /<YoFlashcardPreview\b[\s\S]*?audioMode="browser-speech"/,
  "Module 4 deck must keep the audioMode=\"browser-speech\" carousel mount",
);
assert.match(
  module4Src,
  /module4FlashcardsToYo/,
  "Module 4 deck must keep the module4FlashcardsToYo adapter import so the flashcard data still flows from `dominicanRepublicExplore.flashcards`",
);
ok("7) Module 4 deck preserves the <YoFlashcardPreview> browser-speech flashcards carousel");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8. Module 4 preserves quiz / practice behavior
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

assert.match(
  module4Src,
  /<DominicanRepublicModule4Quiz\b/,
  "Module 4 deck must still mount <DominicanRepublicModule4Quiz /> on the quiz screen",
);
// The pre-translation guard from the Module 4 premium audit
// must still hold â€” `questions={data.quizQuestions}` is the
// only place quiz questions reach the renderer, and the
// reveal-only contract is owned by the interactive component
// itself. We just assert the data wiring is intact.
assert.match(
  module4Src,
  /questions=\{data\.quizQuestions\}/,
  "Module 4 quiz must keep the `data.quizQuestions` wiring (no extra raw fields injected)",
);
assert.match(
  module4Src,
  /<DominicanRepublicExplorerChallenge\b/,
  "Module 4 deck must still mount the <DominicanRepublicExplorerChallenge /> mini-game",
);
ok("8) Module 4 deck preserves the practice quiz + explorer-challenge mini-game on focused screens");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 9. Module 4 exposes printables as a printable resource
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

assert.match(
  module4Src,
  /<PrintablesSection\b/,
  "Module 4 deck must still mount the <PrintablesSection /> resource card",
);
assert.match(
  module4Src,
  /data-yo-module4-printable-resource-card/,
  "Module 4 deck must expose the registered printable resource card",
);
assert.doesNotMatch(
  module4Src,
  /data-yo-module4-printable-worksheet/,
  "Module 4 must not keep long printable worksheet dumps in the main module",
);
assert.doesNotMatch(
  module4Src,
  /<DominicanRepublicModule4PrintButton\b/,
  "Module 4 print action now lives in the print route shell",
);
ok("9) Module 4 deck exposes one printable resource card");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 10. Module 4 still mounts YoMarkModuleCompletedButton
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

assert.match(
  module4Src,
  /import\s*\{\s*YoMarkModuleCompletedButton\s*\}\s*from\s*["']@\/components\/yo\/YoMarkModuleCompletedButton["']/,
  "Module 4 content must keep the YoMarkModuleCompletedButton import",
);
assert.match(
  module4Src,
  /<YoMarkModuleCompletedButton\b/,
  "Module 4 must still mount <YoMarkModuleCompletedButton /> (inside <ClosingBridge /> on the completion screen)",
);
assert.match(
  module4Src,
  /payload=\{dominicanRdModuleProgressPayload\(["']module-4["']/,
  "Module 4 must keep the audited dominicanRdModuleProgressPayload(\"module-4\", locale) payload",
);
assert.match(
  module4Src,
  /data-yo-module4-progress-complete/,
  "Module 4 must keep the `data-yo-module4-progress-complete` marker",
);
ok("10) Module 4 still mounts YoMarkModuleCompletedButton with its audited payload + progress-complete marker");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 11. Module 4 does not use breadcrumb-style primary navigation
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// The shared deck header carries the back arrow + module label
// + FR/EN toggle â€” that's the only primary navigation in deck
// mode. We assert the *page* no longer threads a YoBreadcrumb
// chain (already covered in assertion 1) and also that the
// renderer never mounts a <YoBreadcrumb /> for deck mode.
const deckRendererBlock = (() => {
  const start = module4Src.indexOf("function Module4DeckRenderer");
  const end = module4Src.indexOf("export function", start);
  assert.ok(start >= 0 && end > start, "Module4DeckRenderer block must exist");
  return module4Src.slice(start, end);
})();
assert.doesNotMatch(
  deckRendererBlock,
  /<YoBreadcrumb\b/,
  "Module 4 deck renderer must not mount <YoBreadcrumb /> â€” the deck header replaces it",
);
// Tap-zone navigation also requires the deck-header back arrow
// to be the single primary navigation affordance; assert the
// renderer passes a `backHref` that points back to the country
// course home (one level up â€” never all the way to /yo).
assert.match(
  deckRendererBlock,
  /backHref=\{backHref\}/,
  "Module 4 deck renderer must pass `backHref` to the deck so the header back arrow goes back to the country course home",
);
assert.match(
  deckRendererBlock,
  /\/yo\/langues\/espagnol\/pays\/republique-dominicaine/,
  "Module 4 deck renderer back arrow must target the RD country course home, not /yo",
);
ok("11) Module 4 dropped breadcrumb-style primary navigation in favour of the viewport-locked deck header");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 12. Modules 2 and 3 decks still pass unchanged
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Sanity that this PR did not regress Module 2 or Module 3 â€”
// the same deck composers / renderers / screen contracts must
// still hold. (Their dedicated tests still run in CI; this is
// a belt-and-suspenders check inside the Module 4 file.)
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
assert.match(
  module3Src,
  /function buildModule3DeckScreens\b/,
  "Module 3 must still expose its deck composer (`buildModule3DeckScreens`)",
);
assert.match(
  module3Src,
  /<YoLessonDeck\b[\s\S]*?enableTapNavigation/,
  "Module 3 must still opt the deck into tap-zone navigation",
);
const module3ScreenIds = new Set(
  Array.from(
    module3Src.matchAll(
      /id:\s*["'](mission|passport|food|culture|phrases|dialogues|ears-grammar|flashcards|quiz|mini-mission|printables|completion)["']/g,
    ),
  ).map((m) => m[1]),
);
assert.ok(
  module3ScreenIds.size >= 12,
  `Module 3 deck must still have at least 12 distinct focused lesson screens (got ${module3ScreenIds.size})`,
);
ok(`12) Modules 2 (${module2ScreenIds.size} screens) and 3 (${module3ScreenIds.size} screens) still pass unchanged`);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 13. Paid YoPratiqo checkout remains disabled
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(
  productConfigSrc,
  /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/,
);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
assert.doesNotMatch(
  stripJsComments(module4Src),
  STRIPE_PATTERN,
  "Module 4 deck must not introduce Stripe / price_id references (code, not docstrings)",
);
assert.doesNotMatch(
  stripJsComments(pageSrc),
  STRIPE_PATTERN,
  "Module 4 page must not introduce Stripe / price_id references (code, not docstrings)",
);
ok("13) paid YoPratiqo checkout remains disabled and no Stripe references added on the Module 4 deck surface");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 14. No raw quiz fields introduced
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RAW_QUIZ_PATTERN =
  /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
assert.doesNotMatch(
  stripJsComments(module4Src),
  RAW_QUIZ_PATTERN,
  "Module 4 deck must not introduce raw-quiz field names (code, not docstrings)",
);
assert.doesNotMatch(
  stripJsComments(pageSrc),
  RAW_QUIZ_PATTERN,
  "Module 4 page must not introduce raw-quiz field names (code, not docstrings)",
);
ok("14) no raw quiz fields introduced on the Module 4 deck surface");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 15. No restricted system touched
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // Module 5 + Intro deck were promoted to the deck pattern in a
  // follow-on PR (`feat/yopratiqo-module5-and-intro-decks`); their
  // dedicated deck tests
  // (`tests/yo/yopratiqoModule5LessonDeck.test.ts`,
  // `tests/yo/yopratiqoIntroLessonDeck.test.ts`,
  // `tests/yo/yopratiqoFullDominicanPathDeck.test.ts`) now own
  // those contracts. None of them count as a restricted-system
  // touch from the Module 4 test's perspective.
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
      assert.fail(`restricted system touched by Module 4 deck PR: ${file}`);
    }
  }
}
ok("15) no restricted system touched (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO)");

console.log(`\n${pass} Module 4 lesson-deck assertions passed`);
