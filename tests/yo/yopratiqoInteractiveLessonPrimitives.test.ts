import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PRIMITIVES = "components/yo/YoInteractiveLessonPrimitives.tsx";
const src = readFileSync(join(ROOT, PRIMITIVES), "utf8");

assert.ok(existsSync(join(ROOT, PRIMITIVES)), "interactive primitives file exists");
assert.match(src, /export function YoChoiceCard/);
assert.match(src, /export function YoPairMatchGame/);
assert.match(src, /export function YoGoodAvoidGame/);
assert.match(src, /export function YoOneQuestionQuiz/);
assert.match(src, /export function YoFixedFlashcardDeck/);
assert.match(src, /export function YoMiniScenarioCard/);
assert.match(src, /export function YoPrintableResourceCard/);
assert.match(src, /max-w-full/);
assert.match(src, /overflow-x-hidden/);
assert.match(src, /data-yo-one-question-quiz/);
assert.doesNotMatch(src, /overflow-x-auto|snap-x|grid-cols-3/);
assert.doesNotMatch(src, /fetch\(|supabase|Stripe|checkout|payment|quiz_answers/i);

console.log("[yo:interactive-primitives] assertions passed");
