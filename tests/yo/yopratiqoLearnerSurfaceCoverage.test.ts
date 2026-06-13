import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const learnerSurfaces = [
  "app/yo/langues/page.tsx",
  "app/yo/langues/espagnol/page.tsx",
  "app/yo/langues/espagnol/intro/page.tsx",
  "app/yo/langues/francais-quebec/intro/page.tsx",
  "app/yo/langues/francais-quebec/module-1/lecon-3/page.tsx",
  "app/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie/page.tsx",
];

for (const surface of learnerSurfaces) {
  assert.ok(existsSync(join(ROOT, surface)), `learner surface exists: ${surface}`);
}

const lesson3 = readFileSync(
  join(ROOT, "app/yo/langues/francais-quebec/module-1/lecon-3/page.tsx"),
  "utf8",
);

assert.match(lesson3, /YoAdaptiveStepShell/);
assert.match(lesson3, /YoStepNavigator/);
assert.match(lesson3, /YoChoiceCard/);
assert.match(lesson3, /YoPairMatchGame/);
assert.match(lesson3, /YoGoodAvoidGame/);
assert.match(lesson3, /YoFixedFlashcardDeck/);
assert.match(lesson3, /YoOneQuestionQuiz/);
assert.match(lesson3, /YoPrintableResourceCard/);
assert.doesNotMatch(lesson3, /checkout|Stripe|supabase|quiz_answers|rawQuiz/i);

console.log("[yo:learner-surface-coverage] assertions passed");
