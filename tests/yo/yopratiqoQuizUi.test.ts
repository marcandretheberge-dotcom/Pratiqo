/**
 * YoPratiqo — quiz UI regression suite.
 *
 * Style: `node:test`-style static-source assertions, no browser, no
 * live network. Same harness as the other Yo tests; slots into
 * `npm run test:launch-critical`.
 *
 * What we guard:
 *
 *  1. Internal option ids (e.g. `q_dejeuner_a`) NEVER render inside
 *     the option button. The bug we fixed was
 *     `{option.id.toUpperCase()}` printing "Q_DEJEUNER_A" inside the
 *     small letter badge, which then overflowed and overlapped the
 *     answer text. The component must derive the letter from the
 *     option's INDEX (A / B / C / D), not from the data-layer id.
 *
 *  2. The data-layer option id is still used as a logical key
 *     (`option.id === question.correctOptionId`) — that pathway must
 *     stay so scoring keeps working.
 *
 *  3. The option *label* (`option.label`) is rendered via `t()` so
 *     learner-facing strings remain bilingual.
 *
 *  4. Spot-checks against real quiz data: the "déjeuner" question in
 *     the Quebec French intro shows the expected human labels and
 *     uses `q_dejeuner_*` as logical option ids — verifying the
 *     data layer still uses descriptive ids without leaking them
 *     into the UI.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const QUIZ_PATH = "components/yo/YoQuizPreview.tsx";
const FR_DATA_PATH = "lib/yo/frenchQuebecIntro.ts";
const ES_DATA_PATH = "lib/yo/spanishIntroA1.ts";

assert.ok(
  existsSync(join(REPO_ROOT, QUIZ_PATH)),
  `${QUIZ_PATH} must exist`,
);

const quizSrc = read(QUIZ_PATH);
const frDataSrc = read(FR_DATA_PATH);
const esDataSrc = read(ES_DATA_PATH);

/**
 * Strip JS comments — used so structural assertions only run against
 * shipped JSX, not against historical / explanatory JSDoc.
 */
function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const quizSrcCode = stripJsComments(quizSrc);

// ─── 1. Bug fix — internal option ids must never render ────────────
test("YoQuizPreview no longer renders option.id inside the option badge", () => {
  // The fix replaces the `option.id.toUpperCase()` text node with
  // an index-based letter (A / B / C / D / …). The literal pattern
  // must be gone from the component code — JSDoc may still reference
  // it as the documented bug, hence the comment-stripped check.
  assert.ok(
    !/\boption\.id\.toUpperCase\s*\(\s*\)/.test(quizSrcCode),
    "YoQuizPreview must not render option.id.toUpperCase() (that produced the Q_DEJEUNER_A overflow bug)",
  );
});

test("YoQuizPreview derives the option letter from the option's index", () => {
  // Cheap structural sniff: the new code path uses
  // `String.fromCharCode("A".charCodeAt(0) + optionIndex)` to render
  // A / B / C / D / …. Any of these markers proves the component
  // computes the letter from index, not from data.
  const indexMarkers = [
    /String\.fromCharCode\s*\(/,
    /optionIndex/,
    /\.map\s*\(\s*\(option,\s*optionIndex\)/,
  ];
  for (const re of indexMarkers) {
    assert.match(
      quizSrcCode,
      re,
      `quiz must compute its badge letter from the option's index (${re.source})`,
    );
  }
});

// ─── 2. Logical id pathway stays intact ────────────────────────────
test("YoQuizPreview still uses option.id for picking and scoring", () => {
  // The data layer's `option.id` is the logical key. The component
  // must keep the comparison-by-id for the picker / correct-answer
  // detection, even though we no longer render that id.
  assert.match(quizSrcCode, /option\.id\s*===\s*question\.correctOptionId/);
  assert.match(quizSrcCode, /pickedOptionId\s*===\s*option\.id/);
});

// ─── 3. Labels render via the localizer ────────────────────────────
test("YoQuizPreview renders option.label via the bilingual t() helper", () => {
  assert.match(quizSrcCode, /\{\s*t\s*\(\s*option\.label\s*,\s*locale\s*\)\s*\}/);
});

// ─── 4. Spot-check the real Quebec French "déjeuner" question ──────
test("Quebec French 'déjeuner' quiz question exposes human labels (not ids) for learners", () => {
  // The data file uses `q_dejeuner_*` as logical ids — we confirm
  // they exist as ids, AND we confirm the human-facing labels are
  // present in their bilingual form. The two together prove the
  // separation: ids stay logical, labels stay bilingual.
  assert.match(
    frDataSrc,
    /id:\s*"q_dejeuner_a"[\s\S]*?lstr\(\s*"le repas du matin",\s*"the morning meal"\s*\)/,
  );
  assert.match(
    frDataSrc,
    /id:\s*"q_dejeuner_b"[\s\S]*?lstr\(\s*"le repas du midi",\s*"the midday meal"\s*\)/,
  );
  assert.match(
    frDataSrc,
    /id:\s*"q_dejeuner_c"[\s\S]*?lstr\(\s*"le repas du soir",\s*"the evening meal"\s*\)/,
  );
});

test("Spanish quiz data still compiles in the same shape", () => {
  // We don't enforce specific question ids here, but at least one
  // YoQuizQuestion must be declared with the canonical fields so
  // the shared component keeps rendering the Spanish intro quiz.
  assert.match(esDataSrc, /correctOptionId:/);
  assert.match(esDataSrc, /options:\s*\[/);
});

// ─── Run ──────────────────────────────────────────────────────────
async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[yo:quiz-ui] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
