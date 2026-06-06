/**
 * YoPratiqo Dominican Republic Module 4 premium guard.
 *
 * Asserts that:
 *   - The premium UI markers (hero, passport, place cards, dialogues,
 *     ears, grammar, readings, quiz, final game, printables, browser
 *     audio note) are rendered exactly once in the content component.
 *   - YoSpeechButton (browser SpeechSynthesis) wires audio to phrases,
 *     dialogues, places, grammar examples, readings, flashcards,
 *     quiz reveal, and final-game reveal — and we never import any
 *     MP3 / WAV / M4A asset path nor an OpenAI script.
 *   - The Module 4 sources do NOT touch any restricted system
 *     (Stripe / payments / Supabase / RLS / migrations / legal pages /
 *     teacher marketplace / Membre Pro / commission / sitemap / Course
 *     schema / OpenAI / generated audio scripts).
 *   - Past-tense bridge note is mounted via its data attribute and
 *     the explorer-challenge final game is a distinct component that
 *     reuses the Spanish-only-pre-reveal pattern.
 *   - Modules 2 and 3 keep their existing premium markers (no
 *     regression triggered by Module 4).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const DATA_FILE = "lib/yo/dominicanRepublicExplore.ts";
const CONTENT_FILE = "components/yo/DominicanRepublicModule4Content.tsx";
const INTERACTIVE_FILE = "components/yo/DominicanRepublicModule4Interactive.tsx";
const PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx";
const MODULE_2_CONTENT = "components/yo/DominicanRepublicModule2Content.tsx";
const MODULE_3_CONTENT = "components/yo/DominicanRepublicModule3Content.tsx";

const moduleSources = [DATA_FILE, CONTENT_FILE, INTERACTIVE_FILE, PAGE_FILE];

// ─── Premium markers ────────────────────────────────────────────────────

test("hero is mounted with the Module 4 marker", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("data-yo-module4-premium-hero"));
  assert.ok(src.includes("data-yo-module4-passport-visual"));
});

test("exploration passport map is mounted with mission-stop markers", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("data-yo-module4-exploration-passport"));
  assert.ok(src.includes("data-yo-module4-mission-stop"));
});

test("place cards section carries the place count marker", () => {
  const src = read(CONTENT_FILE);
  assert.match(src, /data-yo-module4-place-cards-count=\{data\.placeCards\.length\}/);
  assert.ok(src.includes("data-yo-module4-place-card"));
});

test("phrase bank, dialogues, ears, grammar, readings, quiz, game and printables markers all present", () => {
  const src = read(CONTENT_FILE);
  for (const marker of [
    "data-yo-module4-phrase-count",
    "data-yo-module4-dialogues",
    "data-yo-module4-dialogue",
    "data-yo-module4-ears",
    "data-yo-module4-ear",
    "data-yo-module4-grammar-count",
    "data-yo-module4-grammar-card",
    "data-yo-module4-readings-count",
    "data-yo-module4-reading",
    "data-yo-module4-printable-count",
    "data-yo-module4-printable-worksheet",
    "data-yo-module4-printable-kind",
    "data-yo-module4-past-tense-bridge-note",
  ]) {
    assert.ok(src.includes(marker), `content component missing ${marker}`);
  }
});

test("interactive component mounts quiz + reading reveal + final game markers", () => {
  const src = read(INTERACTIVE_FILE);
  for (const marker of [
    "data-yo-module4-quiz",
    "data-yo-module4-quiz-choice-label",
    "data-yo-module4-quiz-feedback",
    "data-yo-module4-reading-questions",
    "data-yo-module4-final-game",
    "data-yo-module4-game-choice-label",
    "data-yo-module4-game-feedback",
  ]) {
    assert.ok(src.includes(marker), `interactive component missing ${marker}`);
  }
});

test("browser audio note is rendered exactly once", () => {
  const src = read(CONTENT_FILE);
  const matches = src.match(/data-yo-browser-audio-note/g) ?? [];
  assert.equal(matches.length, 1);
  assert.ok(src.includes('data-yo-audio-state="browser-speech"'));
});

// ─── Audio wiring ───────────────────────────────────────────────────────

test("YoSpeechButton wires audio to phrases, dialogues, places, grammar, readings", () => {
  const src = read(CONTENT_FILE);
  // YoSpeechButton imported and called multiple times.
  const occurrences = src.match(/<YoSpeechButton/g) ?? [];
  // 7 distinct call sites today: place cards, phrase bank, dialogue lines,
  // Dominican ears, grammar examples, readings, and flashcards (via the
  // audioRenderer prop). Keep the bar at >= 7 so the guard catches a
  // regression that drops one of the audio surfaces.
  assert.ok(
    occurrences.length >= 7,
    `YoSpeechButton expected at >= 7 audio sites, found ${occurrences.length}`,
  );
  // Flashcards must inject a YoSpeechButton via audioRenderer.
  assert.match(
    src,
    /audioRenderer=\{\(card\)\s*=>\s*\(\s*<YoSpeechButton/,
  );
});

test("interactive component wires speech buttons to quiz + final-game reveals", () => {
  const src = read(INTERACTIVE_FILE);
  const occurrences = src.match(/<YoSpeechButton/g) ?? [];
  assert.ok(
    occurrences.length >= 2,
    `interactive component expected speech audio in quiz + game, found ${occurrences.length}`,
  );
});

// ─── No restricted systems touched ──────────────────────────────────────

const BANNED_TOKENS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bstripe\b/i, label: "Stripe" },
  { pattern: /\bcheckout(?:Session|_session)?\b/i, label: "checkout" },
  { pattern: /createPaymentIntent/i, label: "payments" },
  { pattern: /\bsupabase\b/i, label: "Supabase" },
  { pattern: /service_role/i, label: "service_role" },
  { pattern: /\b(rls|row level security|row-level security)\b/i, label: "RLS" },
  { pattern: /supabase\/migrations/i, label: "migrations" },
  { pattern: /membrePro|membre[_-]?pro/i, label: "Membre Pro" },
  { pattern: /commissionTier|commission_(rate|amount|cents)/i, label: "commission logic" },
  { pattern: /openai|chat\.completions|tts-1|gpt-4/i, label: "OpenAI" },
  { pattern: /\.(mp3|wav|m4a)['")\s]/i, label: "audio asset" },
  { pattern: /sitemap\.xml|generateSitemaps?/i, label: "sitemap" },
  { pattern: /CourseSchema|@type"\s*:\s*"Course"/i, label: "Course schema" },
  { pattern: /content\/legal\//i, label: "legal pages" },
];

test("Module 4 sources do not touch restricted systems", () => {
  for (const file of moduleSources) {
    const src = read(file);
    // Strip /* ... */ and // ... comments so we only match real code.
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    for (const { pattern, label } of BANNED_TOKENS) {
      assert.ok(
        !pattern.test(codeOnly),
        `${file} touches restricted system: ${label}`,
      );
    }
  }
});

// ─── Modules 2 and 3 still ship their own premium markers ──────────────

test("Module 2 keeps its premium hero / mission / phrase markers", () => {
  const src = read(MODULE_2_CONTENT);
  for (const marker of [
    "data-yo-module2-premium-hero",
    "data-yo-module2-printable-worksheets",
  ]) {
    assert.ok(src.includes(marker), `Module 2 lost marker ${marker}`);
  }
});

test("Module 3 keeps its premium hero / passport / printable markers", () => {
  const src = read(MODULE_3_CONTENT);
  for (const marker of [
    "data-yo-module3-premium-hero",
    "data-yo-module3-culture-passport",
    "data-yo-module3-printable-worksheet",
  ]) {
    assert.ok(src.includes(marker), `Module 3 lost marker ${marker}`);
  }
});

// ─── Past-tense bridge note + level decision ───────────────────────────

test("past-tense bridge note is mounted with its dedicated data attribute", () => {
  const src = read(CONTENT_FILE);
  const matches = src.match(/data-yo-module4-past-tense-bridge-note/g) ?? [];
  assert.equal(matches.length, 1, "bridge note must render exactly once");
});

test("module label communicates A1+ → A2 bridge level", () => {
  const src = read(DATA_FILE);
  assert.match(src, /A1\+\s*→\s*A2/);
});

test("page route does not opt the module into the public sitemap", () => {
  const src = read(PAGE_FILE);
  assert.match(src, /robots:\s*\{\s*index:\s*false/);
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(
    `\nRunning ${tests.length} tests - YoPratiqo Dominican Module 4 (premium guard)\n`,
  );
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  \u2713  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  \u2717  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }
  console.log(`\n${passed} passed \u00b7 ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
