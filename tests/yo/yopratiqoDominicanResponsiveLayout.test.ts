/**
 * YoPratiqo Dominican Republic responsive layout guard.
 *
 * Keeps the intro page image-led without letting media crops or dense text
 * grids create mobile/tablet overflow. This is intentionally source-level:
 * it does not start a browser, call APIs, or touch payments/legal/data stores.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function runGit(args: string[]): string[] {
  try {
    return execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles(): string[] {
  return Array.from(
    new Set([
      ...runGit(["diff", "--name-only"]),
      ...runGit(["diff", "--cached", "--name-only"]),
      ...runGit(["diff", "--name-only", "origin/main...HEAD"]),
    ]),
  ).sort();
}

test("shared Yo image visual supports contain/cover without forcing all photos to crop", () => {
  const src = read("components/yo/YoImageVisual.tsx");

  assert.match(src, /type YoImageObjectFit = "cover" \| "contain"/);
  assert.match(src, /imageFit\?: YoImageObjectFit/);
  assert.match(src, /imagePosition\?: string/);
  assert.match(src, /object-contain/);
  assert.match(src, /object-cover/);
  assert.match(src, /objectPosition: imagePosition/);
});

test("Dominican map visuals are rendered with contain fit in cards and panels", () => {
  const card = read("components/yo/YoLessonCard.tsx");
  const panel = read("components/yo/YoIntroSectionPanel.tsx");

  assert.match(card, /card\.visualHint === "dominican-map"/);
  assert.match(card, /imageFit=\{shouldContainImage \? "contain" : "cover"\}/);
  assert.match(panel, /section\.visualHint === "dominican-map"/);
  assert.match(panel, /imageFit=\{shouldContainImage \? "contain" : "cover"\}/);
});

test("RD intro shell and culture panorama include overflow and wrapping safeguards", () => {
  const shell = read("components/yo/RepubliqueDominicaineContent.tsx");
  const culture = read("components/yo/YoIntroCultureFrame.tsx");
  const intro = read("components/yo/YoIntroExperience.tsx");
  const hero = read("components/yo/YoVoyageHero.tsx");

  assert.match(shell, /overflow-x-hidden/);
  assert.match(culture, /aria-labelledby="yo-culture-title"[\s\S]*?overflow-hidden/);
  assert.match(culture, /md:grid-cols-2/);
  assert.match(culture, /break-words/);
  assert.match(intro, /overflow-hidden/);
  assert.match(intro, /minmax\(0,1\.4fr\)_minmax\(0,1fr\)/);
  assert.match(hero, /order-first min-w-0/);
});

test("responsive layout patch does not touch restricted systems", () => {
  const forbidden = [
    /^app\/api\//,
    /^content\/legal\//,
    /^app\/\(app\)\/legal\//,
    /^lib\/payments\//,
    /^lib\/stripe/i,
    /^supabase\//,
    /^app\/sitemap\.ts$/,
    /^app\/robots\.ts$/,
    /^lib\/seo\//,
    /^scripts\/generate-yopratiqo-audio/i,
    /^public\/.*\.(mp3|wav|m4a)$/i,
  ];

  for (const file of changedFiles()) {
    const normalized = file.replace(/\\/g, "/");
    assert.ok(
      !forbidden.some((pattern) => pattern.test(normalized)),
      `restricted file changed by RD responsive patch: ${file}`,
    );
  }
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAIL ${name}`);
      console.error((error as Error).message);
    }
  }
  console.log(`\n${tests.length - failed} / ${tests.length} passed`);
  if (failed > 0) process.exitCode = 1;
})();
