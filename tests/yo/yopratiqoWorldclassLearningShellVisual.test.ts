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

test("language catalogue uses auto-fit cards with a comfortable minimum width and no horizontal scroller", () => {
  const src = read("app/yo/langues/page.tsx");
  const code = stripComments(src);

  assert.match(code, /data-yo-langues-grid-min-card-width="280px"/);
  assert.match(code, /repeat\(auto-fit,minmax\(min\(100%,280px\),1fr\)\)/);
  assert.match(code, /centerMaxWidth:\s*"none"/);
  assert.doesNotMatch(
    code,
    /data-yo-langues-tiles-variant="desktop"[\s\S]{0,260}overflow-x-auto/,
  );
  assert.doesNotMatch(
    code,
    /data-yo-langues-tiles-variant="desktop"[\s\S]{0,260}sm:grid-cols-2\s+xl:grid-cols-3/,
  );
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
