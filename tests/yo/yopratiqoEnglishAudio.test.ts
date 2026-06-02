/**
 * YoPratiqo — English audio coverage regression suite.
 *
 * Style: `node:test`-style assertions. Mixes runtime manifest
 * inspection with static-source sniffs of the page so we cover both
 * the data layer (manifest entries, accent profile, paths) and the
 * frontend wiring (button used, contextual lookup, no Web Speech
 * default).
 *
 * What we guard:
 *
 *  1. Every English survival/anchor item required by the product
 *     brief resolves to a manifest entry with
 *     `accentProfile: "canadian_english"` and a deterministic
 *     storage path under
 *     `yo/en/english-intro/intro/canadian-english/...`.
 *
 *  2. The `canadian_english` accent profile is registered with
 *     safe, non-overpromising TTS instructions and an `en-CA`
 *     BCP-47 hint.
 *
 *  3. Spanish (79), Quebec French (≥19), and Italian (32) coverage
 *     stays unchanged: English additions are PURELY ADDITIVE and
 *     never touch existing module data.
 *
 *  4. Frontend integration: the page imports `YoEnglishAudioButton`,
 *     wires `accentProfile="canadian_english"`, and the flashcard
 *     deck forwards an English audioContext to YoFlashcardPreview.
 *
 *  5. Security boundary: nothing on the page or in the new wrapper
 *     reads `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, imports
 *     the openai SDK, or calls the OpenAI endpoint at runtime.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  YOPRATIQO_AUDIO_MANIFEST,
  YOPRATIQO_AUDIO_ROOT_PREFIX,
  type YoAudioItem,
} from "@/lib/yo/audio/audioManifest";
import {
  YO_AUDIO_ACCENT_PROFILES,
  getYoAudioAccentProfile,
} from "@/lib/yo/audio/accentProfiles";
import { englishIntroAudio } from "@/lib/yo/audio/englishIntroAudio";

const REPO_ROOT = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}
function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const PAGE_PATH = "app/yo/langues/anglais/intro/page.tsx";
const DATA_PATH = "lib/yo/englishIntro.ts";
const BUTTON_PATH = "components/yo/YoEnglishAudioButton.tsx";
const SCRIPT_PATH = "scripts/generate-yopratiqo-audio.ts";

const pageSrc = read(PAGE_PATH);
const dataSrc = read(DATA_PATH);
const buttonSrc = read(BUTTON_PATH);
const scriptSrc = read(SCRIPT_PATH);

// ─── Required English target surface ──────────────────────────────
//
// Mirror of the product brief — every English word/phrase below MUST
// have a manifest entry under accentProfile="canadian_english".
// Adding new vocabulary in `lib/yo/englishIntro.ts` is fine; this
// list is the floor, not the ceiling.
const REQUIRED_EN_TARGETS: readonly string[] = [
  // Anchor vocabulary (sections 2-5)
  "the world",
  "the language",
  "to speak",
  "the country",
  "million",
  "to learn",
  "to understand",
  "a mistake",
  "confidence",
  "the accent",
  "different",
  "a word",
  "a sentence",
  "vocabulary",
  "to recognize",
  // English variants (section 4)
  "American",
  "British",
  "Canadian",
  // False-friends (section 5)
  "actually",
  "eventually",
  "library",
  "sensible",
  "chair",
  "to assist",
  "rest",
  "to demand",
  "engaged",
  "to pretend",
  // Survival kit (section 6)
  "Sorry, can you repeat that?",
  "Could you speak more slowly, please?",
  "I don't understand.",
  "What does that mean?",
  "How do you say… in English?",
  "Sorry, my English isn't great.",
  "Bear with me, please.",
  "Let me think for a second.",
  "Hi! How are you?",
  "Thank you.",
  "You're welcome.",
  "Excuse me.",
  "Sorry.",
  "Have a nice day!",
  "I'll have a…, please.",
  "How much is it?",
  "Can I pay by card?",
  "Where is the bathroom?",
];

function normaliseLookup(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findEnglishItem(target: string): YoAudioItem | undefined {
  const needle = normaliseLookup(target);
  return YOPRATIQO_AUDIO_MANIFEST.find(
    (item) =>
      item.accentProfile === "canadian_english" &&
      normaliseLookup(item.text) === needle,
  );
}

// ─── 1. Manifest coverage of every required English item ──────────
test("every required English target has a manifest entry", () => {
  for (const target of REQUIRED_EN_TARGETS) {
    const item = findEnglishItem(target);
    assert.ok(
      item,
      `manifest must include a canadian_english entry for "${target}"`,
    );
    assert.equal(
      item!.accentProfile,
      "canadian_english",
      `entry for "${target}" must use accentProfile="canadian_english"`,
    );
    assert.equal(
      item!.targetLanguage,
      "en",
      `entry for "${target}" must declare targetLanguage="en"`,
    );
    assert.equal(
      item!.moduleId,
      "english-intro",
      `entry for "${target}" must declare moduleId="english-intro"`,
    );
    assert.equal(
      item!.lessonId,
      "intro",
      `entry for "${target}" must declare lessonId="intro"`,
    );
  }
});

test("English audio module ships at least 40 items", () => {
  assert.ok(
    englishIntroAudio.length >= 40,
    `expected ≥ 40 canadian_english items, got ${englishIntroAudio.length}`,
  );
});

// ─── 2. Storage path discipline ───────────────────────────────────
test("every English item has a deterministic, accent-aware storage path", () => {
  const expectedPrefix = `${YOPRATIQO_AUDIO_ROOT_PREFIX}/en/english-intro/intro/canadian-english/`;
  const seenPaths = new Set<string>();
  const seenIds = new Set<string>();
  for (const item of englishIntroAudio) {
    assert.ok(
      item.storagePath.startsWith(expectedPrefix),
      `storagePath ${item.storagePath} must start with ${expectedPrefix}`,
    );
    assert.ok(
      item.storagePath.endsWith(".mp3"),
      `storagePath ${item.storagePath} must end in .mp3`,
    );
    assert.equal(
      item.storagePath,
      item.storagePath.toLowerCase(),
      `storagePath ${item.storagePath} must be lowercase`,
    );
    assert.ok(
      !/\s/.test(item.storagePath),
      `storagePath ${item.storagePath} must not contain whitespace`,
    );
    assert.ok(
      /^[a-z0-9/.\-]+$/.test(item.storagePath),
      `storagePath ${item.storagePath} must be ASCII-safe`,
    );
    assert.ok(
      !seenPaths.has(item.storagePath),
      `duplicate storagePath ${item.storagePath}`,
    );
    seenPaths.add(item.storagePath);
    assert.ok(!seenIds.has(item.id), `duplicate id ${item.id}`);
    seenIds.add(item.id);
  }
});

test("English ids carry the en-eni-<type>-<slug> shape", () => {
  for (const item of englishIntroAudio) {
    assert.match(
      item.id,
      /^en-eni-(?:word|phrase|sentence)-[a-z0-9-]+$/,
      `English item id ${item.id} must follow en-eni-<type>-<slug>`,
    );
  }
});

// ─── 3. Accent profile shape ─────────────────────────────────────
test("canadian_english accent profile is registered with a safe, non-overpromising voice direction", () => {
  const profile = getYoAudioAccentProfile("canadian_english");
  assert.equal(profile.id, "canadian_english");
  assert.equal(profile.pathSlug, "canadian-english");
  assert.equal(profile.bcp47Hint, "en-CA");
  assert.ok(
    profile.ttsInstructions.length > 40,
    "canadian_english ttsInstructions must be a real instruction string",
  );
  assert.ok(
    !/native speaker|guarantee|perfect accent/i.test(profile.ttsInstructions),
    "canadian_english profile must not promise a native or guaranteed accent",
  );
  const known = YO_AUDIO_ACCENT_PROFILES.find(
    (p) => p.id === "canadian_english",
  );
  assert.ok(
    known,
    "canadian_english must appear in YO_AUDIO_ACCENT_PROFILES",
  );
});

// ─── 4. Existing language coverage stays unchanged ───────────────
test("Spanish manifest items count stays at the documented 79 (English is purely additive)", () => {
  const esItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) => i.targetLanguage === "es",
  );
  assert.equal(
    esItems.length,
    79,
    `Spanish item total must remain 79; got ${esItems.length}. English additions must not touch Spanish data.`,
  );
});

test("Quebec French manifest items count stays at the documented 95 (English is purely additive)", () => {
  // 20 FR Quebec intro items + 25 FR Quebec premium Module 1 ·
  // Lesson 1 items (14 core phrases + 11 unique dialogue lines) +
  // 50 FR Quebec premium Module 1 · Lesson 2 items (5 oral markers
  // + 24 imperatives + 3 workplace examples + 8 confirmations +
  // 5 reformulations + 5 mini-scenario lines). The English
  // additions must not touch any of them.
  const frItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) => i.targetLanguage === "fr" && i.accentProfile === "quebec_french",
  );
  assert.equal(
    frItems.length,
    95,
    `Quebec French item total must remain 95; got ${frItems.length}. English additions must not touch Quebec French data.`,
  );
});

test("Italian manifest items count stays at the documented 32 (English is purely additive)", () => {
  const itItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) =>
      i.targetLanguage === "it" && i.accentProfile === "italian_standard",
  );
  assert.equal(
    itItems.length,
    32,
    `Italian item total must remain 32; got ${itItems.length}. English additions must not touch Italian data.`,
  );
});

test("Phase 1 legacy Spanish storage paths remain present in the manifest", () => {
  const expectedLegacy = [
    "yo/es/intro-a1/universal-words/word/hola.mp3",
    "yo/es/intro-a1/universal-words/word/gracias.mp3",
    "yo/es/intro-a1/universal-words/word/si.mp3",
    "yo/es/intro-a1/universal-words/word/no.mp3",
  ];
  for (const path of expectedLegacy) {
    assert.ok(
      YOPRATIQO_AUDIO_MANIFEST.some((i) => i.storagePath === path),
      `legacy Spanish path ${path} must remain in the manifest`,
    );
  }
});

// ─── 5. Cross-language uniqueness ────────────────────────────────
test("no duplicate audio ids or storage paths exist across all languages", () => {
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.ok(
      !ids.has(item.id),
      `duplicate audio id across manifest: ${item.id}`,
    );
    ids.add(item.id);
    assert.ok(
      !paths.has(item.storagePath),
      `duplicate storage path across manifest: ${item.storagePath}`,
    );
    paths.add(item.storagePath);
  }
});

// ─── 6. Frontend integration ─────────────────────────────────────
test("English intro page imports YoEnglishAudioButton (not a raw YoPronunciationButton)", () => {
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoEnglishAudioButton["']/,
    "page must import the English wrapper",
  );
  // Comment-stripped check so any JSDoc rationale describing the
  // old approach does not falsely trip the assertion.
  const pageNoComments = pageSrc
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  assert.ok(
    !/<YoPronunciationButton\b/.test(pageNoComments),
    "page must not embed a raw YoPronunciationButton (use the wrapper)",
  );
});

test("page wires the English audio context (moduleId, lessonId, accentProfile) on every audio surface", () => {
  assert.match(
    pageSrc,
    /<YoEnglishAudioButton[\s\S]*?moduleId="english-intro"[\s\S]*?lessonId="intro"[\s\S]*?accentProfile="canadian_english"/,
    "vocabulary surface must declare moduleId+lessonId+accentProfile",
  );
  assert.match(
    pageSrc,
    /audioContext=\{\s*\{[\s\S]*?moduleId:\s*"english-intro"[\s\S]*?accentProfile:\s*"canadian_english"[\s\S]*?\}\s*\}/,
    "flashcard deck must forward an audioContext with the English triple",
  );
});

test("YoEnglishAudioButton wraps both YoAudioPlayer and the Web-Speech fallback", () => {
  assert.match(buttonSrc, /<YoAudioPlayer/);
  assert.match(buttonSrc, /<YoPronunciationButton/);
  assert.match(buttonSrc, /findAudioItemForContext/);
  assert.match(buttonSrc, /accentProfile\s*=\s*"canadian_english"/);
  assert.match(buttonSrc, /speechLang\s*=\s*"en-CA"/);
});

test("data file does not ship per-row audioUrl hooks (manifest is the source of truth)", () => {
  assert.ok(
    !/\baudioUrl:\s*null\b/.test(dataSrc),
    "data file must not carry per-row audioUrl: null hooks (manifest replaces them)",
  );
  assert.ok(
    !/\baudioUrl:\s*["']/.test(dataSrc),
    "data file must not carry per-row audioUrl: '...' string hooks",
  );
});

// ─── 7. Generator coverage ───────────────────────────────────────
test("generator dry-run logs targetLanguage alongside accent profile and instructions tag", () => {
  // The dry-run line must include `lang=<targetLanguage>` so a
  // contributor reading the plan can tell Spanish / French / Italian
  // / English apart at a glance.
  assert.match(
    scriptSrc,
    /would generate \$\{item\.id\}[\s\S]*?lang=\$\{item\.targetLanguage\}[\s\S]*?accent=\$\{item\.accentProfile\}/,
    "dry-run log must include `lang=${item.targetLanguage}`",
  );
  assert.match(
    scriptSrc,
    /generated \$\{item\.id\}[\s\S]*?lang=\$\{item\.targetLanguage\}[\s\S]*?accent=\$\{item\.accentProfile\}/,
    "live success log must include `lang=${item.targetLanguage}`",
  );
});

test("generator handles English items without a hardcoded Spanish-only assumption", () => {
  assert.ok(
    !/targetLanguage\s*===\s*["']es["']/.test(scriptSrc),
    "generator must not hard-code a Spanish-only branch",
  );
});

// ─── 8. Security boundary ────────────────────────────────────────
test("YoEnglishAudioButton + page never read server-only secrets or import the openai SDK", () => {
  for (const [label, src] of [
    ["YoEnglishAudioButton", buttonSrc],
    ["anglais/intro page", pageSrc],
  ] as const) {
    assert.ok(
      !/process\.env\.OPENAI_API_KEY/.test(src),
      `${label} must not read OPENAI_API_KEY at runtime`,
    );
    assert.ok(
      !/process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(src),
      `${label} must not read SUPABASE_SERVICE_ROLE_KEY at runtime`,
    );
    assert.ok(
      !/from\s+["']openai["']/.test(src) &&
        !/require\(['"]openai['"]\)/.test(src),
      `${label} must not import the openai SDK at runtime`,
    );
    assert.ok(
      !/api\.openai\.com/.test(src),
      `${label} must not reference api.openai.com`,
    );
  }
});

test("English audio data file exists on disk and is wired in the aggregator", () => {
  assert.ok(exists("lib/yo/audio/englishIntroAudio.ts"));
  const aggregator = read("lib/yo/audio/audioManifest.ts");
  assert.match(aggregator, /englishIntroAudio/);
});

// ─── Run ──────────────────────────────────────────────────────────
async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[yo:english-audio] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
