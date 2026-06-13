import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

const lesson = read("app/yo/langues/francais-quebec/module-1/lecon-3/page.tsx");
const primitives = read("components/yo/YoInteractiveLessonPrimitives.tsx");

assert.match(lesson, /overflow-x-hidden/);
assert.match(lesson, /min-w-0/);
assert.match(primitives, /overflow-x-hidden/);
assert.match(primitives, /min-w-0/);

for (const [label, source] of [
  ["lesson", lesson],
  ["interactive primitives", primitives],
] as const) {
  assert.doesNotMatch(source, /overflow-x-auto|snap-x|snap-mandatory|whitespace-nowrap/, `${label} must not introduce native horizontal scrolling`);
  assert.doesNotMatch(source, /grid-cols-3|<table/i, `${label} must avoid cramped mobile tables or 3-column card grids`);
}

assert.match(primitives, /data-yo-fixed-flashcard-deck/);
assert.match(primitives, /data-yo-one-question-quiz/);

console.log("[yo:mobile-no-horizontal-overflow-contract] assertions passed");
