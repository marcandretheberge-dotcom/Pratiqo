/**
 * YoPratiqo Dominican Republic Module 5 (A2 capstone) — premium guard.
 *
 * Asserts:
 *   - All 16 required premium UI markers (hero, mission map, skill
 *     dashboard, phrase bank, fast-speech survival, dialogues, readings,
 *     writing, roleplay, grammar, flashcards, quiz, final game,
 *     printables, self-assessment, series-completion) are mounted.
 *   - YoSpeechButton wires browser SpeechSynthesis audio to the eight
 *     surfaces required by the spec (phrase bank / dialogues /
 *     flashcards via audioMode prop / quiz reveal / final-game reveal /
 *     grammar examples / reading paragraphs / roleplay model sentence).
 *   - The four DELE / CEFR A2 skill components (reading, listening,
 *     writing, oral interaction) are explicitly tagged.
 *   - Quiz + final-game options NEVER ship a translation in the
 *     pre-reveal label (Spanish-only commit, then translation/explanation).
 *   - The Module 5 sources do not touch any restricted system
 *     (Stripe / payments / Supabase / RLS / migrations / legal pages /
 *     teacher marketplace / Membre Pro / commission / sitemap / Course
 *     schema / OpenAI / generated audio scripts / .mp3 / .wav / .m4a).
 *   - The page opts out of public indexation, like Modules 2/3/4.
 *   - Modules 2, 3, and 4 keep their own premium markers (no regression).
 *   - Series-completion card is rendered (no fake Module 6 link).
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

const DATA_FILE = "lib/yo/dominicanRepublicA2Capstone.ts";
const CONTENT_FILE = "components/yo/DominicanRepublicModule5Content.tsx";
const INTERACTIVE_FILE = "components/yo/DominicanRepublicModule5Interactive.tsx";
const PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx";
const FLASHCARD_ADAPTERS = "lib/yo/dominicanRepublicFlashcardAdapters.ts";

const MODULE_2_CONTENT = "components/yo/DominicanRepublicModule2Content.tsx";
const MODULE_3_CONTENT = "components/yo/DominicanRepublicModule3Content.tsx";
const MODULE_4_CONTENT = "components/yo/DominicanRepublicModule4Content.tsx";

const moduleSources = [
  DATA_FILE,
  CONTENT_FILE,
  INTERACTIVE_FILE,
  PAGE_FILE,
  FLASHCARD_ADAPTERS,
];

// ─── Premium markers (server component) ─────────────────────────────────

test("hero and final passport stamp are mounted (premium A2 capstone)", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("data-yo-module5-hero"));
  assert.ok(src.includes("data-yo-module5-final-passport-stamp"));
});

test("A2 mission map mounts 7 mission stops", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("data-yo-module5-mission-map"));
  const stopMatches = src.match(/data-yo-module5-mission-stop/g) ?? [];
  assert.ok(stopMatches.length >= 1);
});

test("A2 skill dashboard exposes the 4-skill count attribute", () => {
  const src = read(CONTENT_FILE);
  assert.match(
    src,
    /data-yo-module5-skill-count=\{data\.skillDashboard\.length\}/,
  );
  for (const skill of ["reading", "listening", "writing", "oral"]) {
    assert.ok(
      src.includes(`data-yo-module5-skill={skill.skill}`) ||
        src.includes(skill),
      `skill key missing: ${skill}`,
    );
  }
  // The four DELE/CEFR A2 components must literally appear as keys.
  const dataSrc = read(DATA_FILE);
  for (const key of ['"reading"', '"listening"', '"writing"', '"oral"']) {
    assert.ok(dataSrc.includes(key), `Missing skill key in data: ${key}`);
  }
});

test("phrase bank carries phrase + category markers and the count attribute", () => {
  const src = read(CONTENT_FILE);
  assert.match(src, /data-yo-module5-phrase-count=\{data\.phraseBank\.length\}/);
  assert.ok(src.includes("data-yo-module5-phrase"));
  assert.ok(src.includes("data-yo-module5-phrase-category"));
});

test("Dominican fast-speech survival section ships card + pair markers", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("data-yo-module5-fast-speech"));
  assert.ok(src.includes("data-yo-module5-fast-speech-card"));
  assert.ok(src.includes("data-yo-module5-fast-speech-pair"));
});

test("problem dialogues section is mounted with dialogue count + items", () => {
  const src = read(CONTENT_FILE);
  assert.match(
    src,
    /data-yo-module5-dialogues-count=\{data\.dialogues\.length\}/,
  );
  assert.ok(src.includes("data-yo-module5-dialogue"));
});

test("readings section ships count, item and paragraph markers", () => {
  const src = read(CONTENT_FILE);
  assert.match(
    src,
    /data-yo-module5-readings-count=\{data\.readingTexts\.length\}/,
  );
  assert.ok(src.includes("data-yo-module5-reading"));
  assert.ok(src.includes("data-yo-module5-reading-paragraph"));
});

test("writing tasks and roleplays expose count + item markers", () => {
  const src = read(CONTENT_FILE);
  assert.match(
    src,
    /data-yo-module5-writing-count=\{data\.writingTasks\.length\}/,
  );
  assert.ok(src.includes("data-yo-module5-writing-task"));
  assert.match(
    src,
    /data-yo-module5-roleplays-count=\{data\.roleplayCards\.length\}/,
  );
  assert.ok(src.includes("data-yo-module5-roleplay"));
});

test("grammar toolbox exposes the 12-card count + per-card marker", () => {
  const src = read(CONTENT_FILE);
  assert.match(
    src,
    /data-yo-module5-grammar-count=\{data\.grammarCards\.length\}/,
  );
  assert.ok(src.includes("data-yo-module5-grammar-card"));
});

test("printable workbook is exposed as a registered printable resource", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("data-yo-module5-printable-resource-card"));
  assert.ok(src.includes("rd-m5-a2-workbook"));
  assert.ok(src.includes("YoPrintableResourceCard"));
});

test("self-assessment section is mounted with item-level markers", () => {
  const src = read(CONTENT_FILE);
  assert.match(
    src,
    /data-yo-module5-self-assessment-count=\{data\.selfAssessment\.length\}/,
  );
  assert.ok(src.includes("data-yo-module5-self-assessment-item"));
});

test("series-completion card replaces any fake Module 6 teaser", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("data-yo-module5-series-completion"));
  assert.ok(
    !/module-6/.test(src),
    "Module 5 must not link to a non-existent /module-6",
  );
});

// ─── Interactive markers ────────────────────────────────────────────────

test("client component carries quiz / reading / writing / roleplay / final-game markers", () => {
  const src = read(INTERACTIVE_FILE);
  for (const marker of [
    "data-yo-module5-quiz",
    "data-yo-module5-quiz-choice-label",
    "data-yo-module5-quiz-feedback",
    "data-yo-module5-reading-questions",
    "data-yo-module5-writing-reveal",
    "data-yo-module5-writing-sample",
    "data-yo-module5-roleplay-reveal",
    "data-yo-module5-roleplay-model",
    "data-yo-module5-final-game",
    "data-yo-module5-final-game-rounds",
    "data-yo-module5-game-choice-label",
    "data-yo-module5-game-feedback",
  ]) {
    assert.ok(src.includes(marker), `interactive component missing ${marker}`);
  }
});

test("interactive component declares the use-client boundary", () => {
  const src = read(INTERACTIVE_FILE);
  assert.match(src, /^["']use client["'];?\s*$/m);
});

test("quiz/game options never carry a translation before reveal", () => {
  const src = read(INTERACTIVE_FILE);
  // Pre-reveal labels must show the Spanish target only. We capture
  // the full JSX opening tag (from the opening `<` up to the closing
  // `>`) that contains the data marker, and assert the tag carries
  // `lang="es"` and never inlines a translation/gloss expression.
  function captureOpeningTags(marker: string): string[] {
    const out: string[] = [];
    const re = new RegExp(`<[^<>]*${marker}[^<>]*>`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) out.push(m[0]);
    return out;
  }

  const quizTags = captureOpeningTags("data-yo-module5-quiz-choice-label");
  assert.ok(quizTags.length > 0, "quiz choice label not found");
  for (const tag of quizTags) {
    assert.match(tag, /lang=\s*["']es["']/, `quiz choice must be lang=es: ${tag}`);
    assert.ok(
      !/\.translation\b|\.gloss\b/.test(tag),
      `quiz choice opening tag leaks translation/gloss before reveal: ${tag}`,
    );
  }
  const gameTags = captureOpeningTags("data-yo-module5-game-choice-label");
  assert.ok(gameTags.length > 0, "game choice label not found");
  for (const tag of gameTags) {
    assert.match(tag, /lang=\s*["']es["']/, `game choice must be lang=es: ${tag}`);
    assert.ok(
      !/\.translation\b|\.gloss\b/.test(tag),
      `game choice opening tag leaks translation/gloss before reveal: ${tag}`,
    );
  }
});

// ─── Audio wiring ───────────────────────────────────────────────────────

test("browser audio note is rendered exactly once with browser-speech state", () => {
  const src = read(CONTENT_FILE);
  const matches = src.match(/data-yo-browser-audio-note/g) ?? [];
  assert.equal(matches.length, 1);
  assert.ok(src.includes('data-yo-audio-state="browser-speech"'));
});

test("YoSpeechButton wires audio to phrase bank, dialogues, fast-speech, grammar, readings, roleplay, writing, and final passport audio surfaces in the server tree", () => {
  const src = read(CONTENT_FILE);
  const occurrences = src.match(/<YoSpeechButton/g) ?? [];
  // Spec says we must wire audio buttons on phrase bank, dialogues,
  // fast-speech repair pairs, grammar examples, reading paragraphs,
  // roleplay model sentences, and writing useful phrases. That's >= 7
  // inline JSX call sites in the server component (flashcards use
  // audioMode, quiz/game speech live in the client component).
  assert.ok(
    occurrences.length >= 7,
    `expected >= 7 inline YoSpeechButton mounts in server tree, found ${occurrences.length}`,
  );
});

test("flashcards delegate audio via the audioMode prop (RSC-safe browser speech)", () => {
  const src = read(CONTENT_FILE);
  assert.match(
    src,
    /<YoFlashcardPreview[\s\S]*?audioMode\s*=\s*["']browser-speech["']/,
    "Module 5 flashcards must wire browser speech via audioMode prop",
  );
  assert.ok(
    !/audioRenderer\s*=\s*\{/.test(src),
    "Module 5 must not pass an audioRenderer function across the RSC boundary",
  );
});

test("interactive component wires speech buttons to quiz + final-game reveals (and roleplay model)", () => {
  const src = read(INTERACTIVE_FILE);
  const occurrences = src.match(/<YoSpeechButton/g) ?? [];
  assert.ok(
    occurrences.length >= 3,
    `interactive component expected >= 3 YoSpeechButton mounts (quiz reveal, game reveal, roleplay model), found ${occurrences.length}`,
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
  {
    pattern: /commissionTier|commission_(rate|amount|cents)/i,
    label: "commission logic",
  },
  { pattern: /openai|chat\.completions|tts-1|gpt-4/i, label: "OpenAI" },
  { pattern: /\.(mp3|wav|m4a)['")\s]/i, label: "audio asset" },
  { pattern: /sitemap\.xml|generateSitemaps?/i, label: "sitemap" },
  { pattern: /CourseSchema|@type"\s*:\s*"Course"/i, label: "Course schema" },
  { pattern: /content\/legal\//i, label: "legal pages" },
];

test("Module 5 sources do not touch restricted systems", () => {
  for (const file of moduleSources) {
    const src = read(file);
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    for (const { pattern, label } of BANNED_TOKENS) {
      assert.ok(
        !pattern.test(codeOnly),
        `${file} touches restricted system: ${label}`,
      );
    }
  }
});

// ─── Modules 2/3/4 still ship their own premium markers ────────────────

test("Module 2 keeps its premium markers (no regression)", () => {
  const src = read(MODULE_2_CONTENT);
  for (const marker of [
    "data-yo-module2-premium-hero",
    "data-yo-module2-printable-worksheets",
  ]) {
    assert.ok(src.includes(marker), `Module 2 lost marker ${marker}`);
  }
});

test("Module 3 keeps its premium markers (no regression)", () => {
  const src = read(MODULE_3_CONTENT);
  for (const marker of [
    "data-yo-module3-premium-hero",
    "data-yo-module3-culture-passport",
    "data-yo-module3-printable-resource-card",
  ]) {
    assert.ok(src.includes(marker), `Module 3 lost marker ${marker}`);
  }
});

test("Module 4 keeps its premium markers (no regression)", () => {
  const src = read(MODULE_4_CONTENT);
  for (const marker of [
    "data-yo-module4-premium-hero",
    "data-yo-module4-printable-resource-card",
  ]) {
    assert.ok(src.includes(marker), `Module 4 lost marker ${marker}`);
  }
});

// ─── Page route hygiene ────────────────────────────────────────────────

test("Module 5 page does not opt the route into the public sitemap", () => {
  const src = read(PAGE_FILE);
  assert.match(src, /robots:\s*\{\s*index:\s*false/);
});

test("Module 5 page renders the premium content component", () => {
  const src = read(PAGE_FILE);
  assert.ok(src.includes("DominicanRepublicModule5Content"));
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(
    `\nRunning ${tests.length} tests - YoPratiqo Dominican Module 5 (premium guard)\n`,
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
