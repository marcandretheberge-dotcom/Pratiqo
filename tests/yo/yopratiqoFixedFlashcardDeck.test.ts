import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const primitiveSrc = readFileSync(join(ROOT, "components/yo/YoInteractiveLessonPrimitives.tsx"), "utf8");
const lessonSrc = readFileSync(join(ROOT, "app/yo/langues/francais-quebec/module-1/lecon-3/page.tsx"), "utf8");

assert.match(primitiveSrc, /export function YoFixedFlashcardDeck/);
assert.match(primitiveSrc, /const \[index, setIndex\]/);
assert.match(primitiveSrc, /const \[flipped, setFlipped\]/);
assert.match(primitiveSrc, /\{index \+ 1\}\/\{cards\.length\}/);
assert.match(primitiveSrc, /setFlipped\(\(value\) => !value\)/);
assert.doesNotMatch(primitiveSrc, /setInterval|setTimeout|isAutoplay|Play|Pause|carousel/i);
assert.doesNotMatch(primitiveSrc, /grid-cols-3|overflow-y-auto|overflow-x-auto/);

for (const required of [
  "Excuse-moi, j’aurais une petite question.",
  "Aurais-tu deux minutes?",
  "Vite de même…",
  "T’es-tu disponible?",
  "Parfait, merci!",
]) {
  assert.ok(lessonSrc.includes(required), `missing flashcard: ${required}`);
}

assert.match(lessonSrc, /<YoFixedFlashcardDeck/);

console.log("[yo:fixed-flashcard-deck] assertions passed");
