/**
 * YoPratiqo Dominican Republic Module 2 premium UI/source tests.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

function changedFiles(): string[] {
  const commands = [
    "git diff --name-only main...HEAD",
    "git diff --name-only",
    "git diff --name-only --cached",
  ];
  return Array.from(
    new Set(
      commands
        .flatMap((command) =>
          execSync(command, { cwd: REPO_ROOT, encoding: "utf8" })
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
        )
        .sort(),
    ),
  );
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const COMPONENT_FILE = "components/yo/DominicanRepublicModule2Content.tsx";
const PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";

test("Module 2 route and component still exist", () => {
  assert.ok(exists(PAGE_FILE));
  assert.ok(exists(COMPONENT_FILE));
});

test("premium arrival design markers are present", () => {
  const src = read(COMPONENT_FILE);
  for (const token of [
    "data-yo-module2-premium-hero",
    "data-yo-module2-boarding-pass-visual",
    "Boarding pass visual",
    "arrival stamp",
    "Key card",
    "data-yo-module2-itinerary-map",
    "data-yo-module2-hotel-problem-audio",
    "data-yo-module2-printable-worksheets",
  ]) {
    assert.ok(src.includes(token), `Missing premium marker: ${token}`);
  }
  assert.ok(!src.includes("bg-gradient-to-br from-[#0F6E56] via-[#0d5f49] to-[#0a4d3a]"));
});

test("browser speech audio is wired without MP3 or OpenAI", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(src.includes("YoSpeechButton"));
  assert.ok(src.includes("data-yo-browser-audio-note"));
  assert.ok(src.includes("data-yo-module2-phrase-audio-card"));
  assert.ok(src.includes("data-yo-module2-final-reveal-audio"));
  assert.ok(!src.includes("<audio"));
  assert.ok(!src.includes(".mp3"));
  assert.ok(!src.includes("openai"));
  assert.ok(!src.includes("OPENAI_API_KEY"));
});

test("printable worksheet surface is present and print-friendly", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(src.includes("PrintableWorksheetsSection"));
  assert.ok(src.includes("print:break-inside-avoid"));
  assert.ok(src.includes("worksheet"));
  assert.ok(src.includes("itinerary"));
});

test("restricted systems are not touched by this branch", () => {
  const forbiddenPrefixes = [
    "app/api/",
    "supabase/",
    "content/legal/",
    "app/(app)/legal/",
    "app/(app)/booking/",
    "app/(app)/upgrade/",
    "lib/payments/",
    "lib/config/membrePro",
    "lib/commissions/",
    "lib/seo/",
    "scripts/",
    "public/audio/",
  ];

  for (const file of changedFiles()) {
    for (const prefix of forbiddenPrefixes) {
      assert.ok(!file.startsWith(prefix), `Restricted file touched: ${file}`);
    }
    assert.ok(!file.endsWith(".mp3"), `MP3 changed: ${file}`);
  }
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoPratiqo Dominican Module 2 premium UI\n`);

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  fail  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed - ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
