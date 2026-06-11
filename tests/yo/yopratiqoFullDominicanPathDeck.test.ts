/**
 * tests/yo/yopratiqoFullDominicanPathDeck.test.ts
 *
 * End-to-end static contract test for the complete Dominican
 * Republic YoPratiqo app-like learning path. Locks in the
 * `feat/yopratiqo-module5-and-intro-decks` rollout:
 *
 *   Course Home  →  Intro deck  →  Module 2 deck  →
 *     Module 3 deck  →  Module 4 deck  →  Module 5 deck
 *
 * Assertions:
 *
 *   1.  Course Home roadmap references Intro + Modules 2 / 3 / 4 / 5
 *       routes (real route paths, real page.tsx files on disk).
 *   2.  Intro deck final-screen CTA links to Module 2.
 *   3.  Module 2 deck exists and still uses the shared
 *       <YoLessonDeck />.
 *   4.  Module 3 deck exists and still uses the shared deck.
 *   5.  Module 4 deck exists and still uses the shared deck.
 *   6.  Module 5 deck exists and uses the shared deck.
 *   7.  All five route surfaces (intro + 4 modules) mount the
 *       shared <YoLessonDeck /> orchestrator (no fork).
 *   8.  No module route ships a 5-level breadcrumb as primary nav
 *       (the deck header replaces it).
 *   9.  Paid YoPratiqo checkout remains disabled.
 *   10. No raw quiz payloads introduced across the full path.
 *
 * All assertions are static (file system + string reads).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

/**
 * Strip JS/TS block + line comments so contract regexes never
 * falsely match an example sentence inside a doc-comment.
 * Mirrors the helper used by the other deck tests.
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

const COUNTRY_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";
const HERO_PATH = "components/yo/YoCourseHero.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

const ROUTE_PATHS = {
  intro: "app/yo/langues/espagnol/pays/republique-dominicaine/intro/page.tsx",
  module2: "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx",
  module3: "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx",
  module4: "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx",
  module5: "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx",
} as const;

const CONTENT_PATHS = {
  intro: "components/yo/DominicanRepublicIntroContent.tsx",
  module2: "components/yo/DominicanRepublicModule2Content.tsx",
  module3: "components/yo/DominicanRepublicModule3Content.tsx",
  module4: "components/yo/DominicanRepublicModule4Content.tsx",
  module5: "components/yo/DominicanRepublicModule5Content.tsx",
} as const;

const PUBLIC_ROUTES = {
  intro: "/yo/langues/espagnol/pays/republique-dominicaine/intro",
  module2: "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
  module3: "/yo/langues/espagnol/pays/republique-dominicaine/module-3",
  module4: "/yo/langues/espagnol/pays/republique-dominicaine/module-4",
  module5: "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
} as const;

const countrySrc = read(COUNTRY_PAGE_PATH);
const heroSrc = read(HERO_PATH);

// ─────────────────────────────────────────────────────────────────────────
// 1. Course Home roadmap links Intro + Modules 2 / 3 / 4 / 5 + every
//    referenced page actually exists on disk
// ─────────────────────────────────────────────────────────────────────────

for (const [key, route] of Object.entries(PUBLIC_ROUTES) as ReadonlyArray<
  [keyof typeof PUBLIC_ROUTES, string]
>) {
  assert.ok(
    countrySrc.includes(route),
    `Course Home page must reference the ${key} route ${route} in the roadmap`,
  );
  assert.ok(
    existsSync(path.join(root, ROUTE_PATHS[key])),
    `${key} page must exist at ${ROUTE_PATHS[key]} (no fake routes)`,
  );
}
ok("1) Course Home roadmap links Intro + Modules 2 / 3 / 4 / 5 and every referenced page actually exists");

// ─────────────────────────────────────────────────────────────────────────
// 2. Intro deck final-screen CTA links to Module 2
// ─────────────────────────────────────────────────────────────────────────

const introContentSrc = read(CONTENT_PATHS.intro);
assert.ok(
  introContentSrc.includes(PUBLIC_ROUTES.module2),
  "Intro deck final CTA must link to the real Module 2 route",
);
assert.match(
  introContentSrc,
  /data-yo-intro-deck-next-module=["']module-2["']/,
  "Intro deck final CTA must carry the stable data-yo-intro-deck-next-module=\"module-2\" marker",
);
ok("2) Intro deck final CTA links to Module 2");

// ─────────────────────────────────────────────────────────────────────────
// 3-6. Each module deck exists and uses the shared <YoLessonDeck />
// ─────────────────────────────────────────────────────────────────────────

function assertDeckMounted(key: keyof typeof CONTENT_PATHS, label: string) {
  const src = read(CONTENT_PATHS[key]);
  assert.match(
    src,
    /import\s*\{\s*YoLessonDeck\s*\}\s*from\s*["']@\/components\/yo\/YoLessonDeck["']/,
    `${label} composer must import YoLessonDeck from the shared module`,
  );
  assert.match(
    src,
    /<YoLessonDeck\b/,
    `${label} composer must mount <YoLessonDeck />`,
  );
}

assertDeckMounted("module2", "Module 2");
ok("3) Module 2 deck exists and still uses the shared <YoLessonDeck />");

assertDeckMounted("module3", "Module 3");
ok("4) Module 3 deck exists and still uses the shared <YoLessonDeck />");

assertDeckMounted("module4", "Module 4");
ok("5) Module 4 deck exists and still uses the shared <YoLessonDeck />");

assertDeckMounted("module5", "Module 5");
ok("6) Module 5 deck exists and uses the shared <YoLessonDeck />");

// ─────────────────────────────────────────────────────────────────────────
// 7. All five route surfaces (intro + 4 modules) reach the shared
//    deck (intro mounts the composer directly, modules opt in via
//    mode="deck" — both shapes resolve to <YoLessonDeck />)
// ─────────────────────────────────────────────────────────────────────────

const introRouteSrc = read(ROUTE_PATHS.intro);
assert.match(
  introRouteSrc,
  /<DominicanRepublicIntroContent\b/,
  "Intro route must mount <DominicanRepublicIntroContent /> (which renders the shared deck)",
);
for (const key of ["module2", "module3", "module4", "module5"] as const) {
  const routeSrc = read(ROUTE_PATHS[key]);
  assert.match(
    routeSrc,
    new RegExp(
      `<DominicanRepublic(?:Module2|Module3|Module4|Module5)Content[\\s\\S]*?\\bmode=["']deck["']`,
    ),
    `${key} route must mount its content with mode="deck" (so the shared <YoLessonDeck /> takes over)`,
  );
}
ok("7) All five surfaces (intro + Modules 2 / 3 / 4 / 5) reach the shared <YoLessonDeck />");

// ─────────────────────────────────────────────────────────────────────────
// 8. No module route ships a 5-level breadcrumb as primary nav
//    (the deck header is the only primary nav)
// ─────────────────────────────────────────────────────────────────────────

const ALL_ROUTE_KEYS = [
  "intro",
  "module2",
  "module3",
  "module4",
  "module5",
] as const;
for (const key of ALL_ROUTE_KEYS) {
  const routeSrc = read(ROUTE_PATHS[key]);
  assert.doesNotMatch(
    routeSrc,
    /<YoBreadcrumb\b/,
    `${key} route must NOT render <YoBreadcrumb /> as primary nav`,
  );
  assert.doesNotMatch(
    routeSrc,
    /from\s+["']@\/components\/yo\/YoBreadcrumb["']/,
    `${key} route must NOT import YoBreadcrumb (the deck header replaces it)`,
  );
}
ok("8) No deck route ships a 5-level breadcrumb as primary nav");

// ─────────────────────────────────────────────────────────────────────────
// 9. Paid YoPratiqo checkout remains disabled across the full path
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const key of ALL_ROUTE_KEYS) {
  const routeSrc = stripJsComments(read(ROUTE_PATHS[key]));
  const contentSrc = stripJsComments(read(CONTENT_PATHS[key]));
  assert.doesNotMatch(
    routeSrc,
    STRIPE_PATTERN,
    `${key} route must not introduce Stripe / price_id references in code`,
  );
  assert.doesNotMatch(
    contentSrc,
    STRIPE_PATTERN,
    `${key} composer must not introduce Stripe / price_id references in code`,
  );
}
// Course Home + Hero must also stay clean of Stripe references in
// code (doc-comments allowed via stripJsComments).
assert.doesNotMatch(
  stripJsComments(countrySrc),
  STRIPE_PATTERN,
  "Course Home page must not introduce Stripe / price_id references in code",
);
assert.doesNotMatch(
  stripJsComments(heroSrc),
  STRIPE_PATTERN,
  "YoCourseHero must not introduce Stripe / price_id references in code",
);
ok("9) paid YoPratiqo checkout remains disabled across the full Course Home → Intro → Modules 2-5 path");

// ─────────────────────────────────────────────────────────────────────────
// 10. No raw quiz payloads introduced anywhere across the full path
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
for (const key of ALL_ROUTE_KEYS) {
  const routeSrc = stripJsComments(read(ROUTE_PATHS[key]));
  const contentSrc = stripJsComments(read(CONTENT_PATHS[key]));
  assert.doesNotMatch(
    routeSrc,
    RAW_QUIZ_PATTERN,
    `${key} route must not introduce raw-quiz field names`,
  );
  assert.doesNotMatch(
    contentSrc,
    RAW_QUIZ_PATTERN,
    `${key} composer must not introduce raw-quiz field names`,
  );
}
assert.doesNotMatch(
  stripJsComments(countrySrc),
  RAW_QUIZ_PATTERN,
  "Course Home page must not introduce raw-quiz field names",
);
assert.doesNotMatch(
  stripJsComments(heroSrc),
  RAW_QUIZ_PATTERN,
  "YoCourseHero must not introduce raw-quiz field names",
);
ok("10) no raw quiz payloads introduced anywhere across the full path");

console.log(`\n${pass} full Dominican path deck assertions passed`);
