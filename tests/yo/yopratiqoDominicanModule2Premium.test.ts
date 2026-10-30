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
    "git ls-files --others --exclude-standard",
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
const ARRIVAL_LESSON_FILE = "components/yo/YoArrivalListeningLesson.tsx";
const PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";
const ARRIVAL_AUDIO_ROOT = "public/audio/yo/es/do/module-2/arrival-v1";
// This is an exact allowance for the planned recordings, not permission to
// enable pending audio or add other generated assets to the branch.
const ALLOWED_ARRIVAL_AUDIO_FILES = new Set([
  ...Array.from({ length: 5 }, (_, index) => `${ARRIVAL_AUDIO_ROOT}/airport-${String(index + 1).padStart(2, "0")}.mp3`),
  ...Array.from({ length: 8 }, (_, index) => `${ARRIVAL_AUDIO_ROOT}/hotel-${String(index + 1).padStart(2, "0")}.mp3`),
  `${ARRIVAL_AUDIO_ROOT}/hotel-repeat.mp3`,
]);

function assertAllowedChange(file: string): void {
  if (ALLOWED_ARRIVAL_AUDIO_FILES.has(file)) return;
  const forbiddenPrefixes = [
    "app/api/",
    "app/(auth)/",
    "app/auth/",
    "lib/auth/",
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
  for (const prefix of forbiddenPrefixes) {
    assert.ok(!file.startsWith(prefix), `Restricted file touched: ${file}`);
  }
  assert.doesNotMatch(file, /\.mp3$/i, `Unapproved MP3 changed: ${file}`);
}

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

test("browser speech and arrival recordings are wired without runtime generation", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(src.includes("YoSpeechButton"));
  assert.ok(src.includes("data-yo-browser-audio-note"));
  assert.ok(src.includes("data-yo-module2-phrase-audio-card"));
  assert.ok(src.includes("data-yo-module2-final-reveal-audio"));
  assert.ok(src.includes("<YoArrivalListeningLesson sceneId={sectionId} locale={locale}"));
  assert.ok(!src.includes("<audio"));
  assert.ok(!src.includes(".mp3"));
  assert.ok(!src.includes("openai"));
  assert.ok(!src.includes("OPENAI_API_KEY"));
  const arrivalSrc = read(ARRIVAL_LESSON_FILE);
  assert.ok(arrivalSrc.includes("new window.Audio()"));
  assert.ok(arrivalSrc.includes("if (!scene.audioReady) return;"));
  assert.doesNotMatch(arrivalSrc, /\b(?:openai|heygen|elevenlabs|picovoice)\b|process\.env|generate-yopratiqo-audio/i);
});

test("printable worksheet surface is present and print-friendly", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(src.includes("PrintableWorksheetsSection"));
  assert.ok(src.includes("print:break-inside-avoid"));
  assert.ok(src.includes("worksheet"));
  assert.ok(src.includes("itinerary"));
});

test("audio allowance covers exactly 14 planned clips and preserves restricted systems", () => {
  assert.equal(ALLOWED_ARRIVAL_AUDIO_FILES.size, 14);
  for (const file of ALLOWED_ARRIVAL_AUDIO_FILES) assert.doesNotThrow(() => assertAllowedChange(file));
  for (const file of [
    `${ARRIVAL_AUDIO_ROOT}/airport-00.mp3`,
    `${ARRIVAL_AUDIO_ROOT}/airport-06.mp3`,
    `${ARRIVAL_AUDIO_ROOT}/hotel-09.mp3`,
    `${ARRIVAL_AUDIO_ROOT}/hotel-repeat-2.mp3`,
    `${ARRIVAL_AUDIO_ROOT}/hotel-01.wav`,
    "public/audio/yo/es/do/module-2/arrival-v2/hotel-01.mp3",
    "public/audio/unrelated.mp3",
    "assets/unrelated.mp3",
    "app/api/audio/route.ts",
    "app/(auth)/signin/page.tsx",
    "app/auth/callback/route.ts",
    "lib/auth/session.ts",
    "lib/payments/checkout.ts",
  ]) {
    assert.throws(() => assertAllowedChange(file), assert.AssertionError, `Scope guard must reject ${file}`);
  }
});

test("restricted systems and unapproved audio are not touched by this branch", () => {
  for (const file of changedFiles()) assertAllowedChange(file);
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
