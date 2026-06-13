import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const lesson = readFileSync(join(ROOT, "app/yo/langues/francais-quebec/module-1/lecon-3/page.tsx"), "utf8");
const navigator = readFileSync(join(ROOT, "components/yo/YoStepNavigator.tsx"), "utf8");

assert.match(lesson, /YoAdaptiveStepShell/);
assert.match(lesson, /YoStepNavigator/);
assert.match(lesson, /steps=\{steps\}/);
assert.match(navigator, /Back/);
assert.match(navigator, /Next/);
assert.match(navigator, /aria-current=\{isActive \? "step" : undefined\}/);
assert.match(navigator, /data-yo-step-navigator-step/);
assert.doesNotMatch(lesson, /YoScreenPager|overflow-x-auto|snap-x/);

console.log("[yo:controlled-pager-contract] assertions passed");
