import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveYoLessonVisualLayout } from "@/lib/yo/lessonDeckVisualContract";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

test("visual layout resolver falls back from split to imageOnly when side content is empty", () => {
  assert.equal(
    resolveYoLessonVisualLayout({ requested: "split", hasSideContent: false }),
    "imageOnly",
  );
  assert.equal(
    resolveYoLessonVisualLayout({ requested: "split", hasSideContent: true }),
    "split",
  );
  assert.equal(
    resolveYoLessonVisualLayout({ requested: "map", hasSideContent: false }),
    "map",
  );
});

test("YoImageVisual exposes the visual-card contract and never marks an empty side panel", () => {
  const src = read("components/yo/YoImageVisual.tsx");

  assert.match(src, /resolveYoLessonVisualLayout/);
  assert.match(src, /data-yo-image-visual-layout=\{resolvedVisualLayout\}/);
  assert.match(src, /data-yo-image-visual-empty-side-panel="false"/);
  assert.doesNotMatch(
    stripComments(src),
    /data-yo-image-visual-empty-side-panel="true"/,
  );
});

test("Dominican intro image cards are image-only or map cards with stable full-width aspect ratios", () => {
  const src = read("components/yo/DominicanRepublicIntroContent.tsx");

  assert.match(src, /data-yo-lesson-image-card-layout=\{visualLayout\}/);
  assert.match(src, /visualLayout = isMap \? "map" : "imageOnly"/);
  assert.match(src, /isMap \? "aspect-\[3\/2\]" : "aspect-\[16\/8\]"/);
  assert.match(src, /visualLayout="imageOnly"/);
  assert.doesNotMatch(
    stripComments(src),
    /grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]|w-1\/2|basis-1\/2/,
  );
});

test("language catalogue uses shrinkable single-column mobile cards and two desktop columns without horizontal scrolling", () => {
  const page = stripComments(read("app/yo/langues/page.tsx"));
  const cards = stripComments(read("components/yo/YoLanguageQuickStart.tsx"));
  assert.match(page, /<YoLanguageQuickStart locale=\{locale\}/);
  assert.match(page, /<YoAppShellScroller/);
  assert.match(cards, /<ul className="grid min-w-0 gap-3 md:grid-cols-2"/);
  assert.match(cards, /<li\b[^>]*className="min-w-0(?:\s|")/);
  assert.match(cards, /min-w-0 flex-1/);
  assert.match(cards, /break-words/);
  assert.doesNotMatch(cards, /overflow-x-auto|min-w-\[(?:[3-9]\d{2}|\d{4})px\]/);
});

test("audio feedback pill is constrained to a content-width lane, not raw viewport right edge", () => {
  const src = stripComments(read("components/yo/YoAudioFeedbackProvider.tsx"));

  assert.match(src, /data-yo-audio-feedback-toggle-lane="content"/);
  assert.match(src, /max-w-\[960px\]/);
  assert.doesNotMatch(src, /right-4\s+z-50\s+inline-flex/);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failed > 0) process.exit(1);
console.log(`[yo:worldclass-learning-shell-visual] ${tests.length} tests passed`);
