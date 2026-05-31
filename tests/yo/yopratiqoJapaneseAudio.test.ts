/**
 * YoPratiqo — Japanese audio coverage regression suite.
 *
 * Style: `node:test`-style assertions. Mixes runtime manifest
 * inspection with static-source sniffs of the page so we cover both
 * the data layer (manifest entries, accent profile, paths) and the
 * frontend wiring.
 *
 * What we guard:
 *
 *  1. Every Japanese target item from the product brief resolves to
 *     a manifest entry with `accentProfile: "japanese_standard"`,
 *     `targetLanguage: "ja"`, and a deterministic, ASCII-only
 *     storage path under
 *     `yo/ja/japanese-intro/intro/japanese-standard/...`.
 *  2. The `japanese_standard` accent profile is registered with safe
 *     TTS instructions (no anime intonation, no native-perfect
 *     promise) and a `ja-JP` BCP-47 hint.
 *  3. Spanish (79), Quebec French (20), Italian (32), and English
 *     (46) coverage stays unchanged: Japanese additions are PURELY
 *     ADDITIVE.
 *  4. Frontend integration: the page imports `YoJapaneseAudioButton`,
 *     wires `accentProfile="japanese_standard"`, and the flashcard
 *     deck forwards a Japanese audioContext.
 *  5. Security boundary: nothing on the page or in the wrapper reads
 *     `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, imports the
 *     openai SDK, or calls api.openai.com at runtime.
 *  6. Slug discipline: every Japanese path uses ASCII-only romaji
 *     slugs (no Hiragana / Katakana / Kanji characters in the path).
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
import { japaneseIntroAudio } from "@/lib/yo/audio/japaneseIntroAudio";

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

const PAGE_PATH = "app/yo/langues/japonais/intro/page.tsx";
const DATA_PATH = "lib/yo/japaneseIntro.ts";
const BUTTON_PATH = "components/yo/YoJapaneseAudioButton.tsx";
const SCRIPT_PATH = "scripts/generate-yopratiqo-audio.ts";
const ACCENT_PATH = "lib/yo/audio/accentProfiles.ts";

const pageSrc = read(PAGE_PATH);
const dataSrc = read(DATA_PATH);
const buttonSrc = read(BUTTON_PATH);
const scriptSrc = read(SCRIPT_PATH);

// ─── Required Japanese target surface ─────────────────────────────
//
// Mirror of the product brief — every Japanese word/phrase below
// MUST have a manifest entry under accentProfile="japanese_standard".
// Adding new vocabulary in `japaneseIntroAudio.ts` is fine; this list
// is the floor, not the ceiling.
const REQUIRED_JA_TARGETS: readonly string[] = [
  // Anchor / writing-system / grammar vocabulary
  "世界",
  "言語",
  "話す",
  "国",
  "日本",
  "歴史",
  "言葉",
  "書く",
  "読む",
  "ひらがな",
  "カタカナ",
  "漢字",
  "文字",
  "文法",
  "動詞",
  "名詞",
  // Politeness / greetings
  "ようこそ",
  "おはようございます",
  "こんにちは",
  "こんばんは",
  "おやすみなさい",
  "ありがとうございます",
  "すみません",
  "お願いします",
  "どういたしまして",
  "はい",
  "いいえ",
  "はじめまして",
  "です",
  "よろしくお願いします",
  "さようなら",
  "また明日",
  "じゃあね",
  "失礼します",
  "おめでとう",
  // Showcase sentence (SOV)
  "私は寿司を食べます。",
];

function findJapaneseItem(target: string): YoAudioItem | undefined {
  return YOPRATIQO_AUDIO_MANIFEST.find(
    (item) =>
      item.accentProfile === "japanese_standard" && item.text === target,
  );
}

// ─── 1. Manifest coverage of every required Japanese item ─────────
test("every required Japanese target has a manifest entry", () => {
  for (const target of REQUIRED_JA_TARGETS) {
    const item = findJapaneseItem(target);
    assert.ok(
      item,
      `manifest must include a japanese_standard entry for "${target}"`,
    );
    assert.equal(
      item!.accentProfile,
      "japanese_standard",
      `entry for "${target}" must use accentProfile="japanese_standard"`,
    );
    assert.equal(
      item!.targetLanguage,
      "ja",
      `entry for "${target}" must declare targetLanguage="ja"`,
    );
    assert.equal(
      item!.moduleId,
      "japanese-intro",
      `entry for "${target}" must declare moduleId="japanese-intro"`,
    );
    assert.equal(
      item!.lessonId,
      "intro",
      `entry for "${target}" must declare lessonId="intro"`,
    );
  }
});

test("Japanese audio module ships at least 35 items", () => {
  assert.ok(
    japaneseIntroAudio.length >= 35,
    `expected ≥ 35 japanese_standard items, got ${japaneseIntroAudio.length}`,
  );
});

// ─── 2. Storage path discipline ───────────────────────────────────
test("every Japanese item has a deterministic, accent-aware storage path", () => {
  const expectedPrefix = `${YOPRATIQO_AUDIO_ROOT_PREFIX}/ja/japanese-intro/intro/japanese-standard/`;
  const seenPaths = new Set<string>();
  const seenIds = new Set<string>();
  for (const item of japaneseIntroAudio) {
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
      !seenPaths.has(item.storagePath),
      `duplicate storagePath ${item.storagePath}`,
    );
    seenPaths.add(item.storagePath);
    assert.ok(!seenIds.has(item.id), `duplicate id ${item.id}`);
    seenIds.add(item.id);
  }
});

test("Japanese storage paths use ASCII-only romaji slugs (no kana / kanji bytes)", () => {
  // ASCII-safe regex: lowercase letters, digits, slash, dot, hyphen.
  const asciiSafe = /^[a-z0-9/.\-]+$/;
  for (const item of japaneseIntroAudio) {
    assert.ok(
      asciiSafe.test(item.storagePath),
      `storagePath ${item.storagePath} must be ASCII-safe (romaji slug); raw Japanese characters are not allowed in the path`,
    );
    // Double-belt: the path must not contain any character above
    // U+007F (codepoint > 127), which would catch hiragana, katakana,
    // kanji, full-width punctuation, etc.
    for (let i = 0; i < item.storagePath.length; i++) {
      assert.ok(
        item.storagePath.charCodeAt(i) <= 0x7f,
        `storagePath ${item.storagePath} contains a non-ASCII character — slugs must be romaji-derived`,
      );
    }
  }
});

test("Japanese ids carry the ja-jpi-<type>-<slug> shape", () => {
  for (const item of japaneseIntroAudio) {
    assert.match(
      item.id,
      /^ja-jpi-(?:word|phrase|sentence)-[a-z0-9-]+$/,
      `Japanese item id ${item.id} must follow ja-jpi-<type>-<slug>`,
    );
  }
});

// ─── 3. Accent profile shape ─────────────────────────────────────
test("japanese_standard accent profile is registered with safe, non-overpromising voice direction", () => {
  const profile = getYoAudioAccentProfile("japanese_standard");
  assert.equal(profile.id, "japanese_standard");
  assert.equal(profile.pathSlug, "japanese-standard");
  assert.equal(profile.bcp47Hint, "ja-JP");
  assert.ok(
    profile.ttsInstructions.length > 40,
    "japanese_standard ttsInstructions must be a real instruction string",
  );
  assert.ok(
    !/(?:native\s+speaker|guarantee|perfect\s+accent)/i.test(
      profile.ttsInstructions,
    ),
    "japanese_standard profile must not promise a native or guaranteed accent",
  );
  // The brief explicitly forbids exaggerating anime intonation or
  // regional dialect.
  assert.ok(
    /anime/i.test(profile.ttsInstructions),
    "japanese_standard ttsInstructions must explicitly avoid anime-style intonation",
  );
  assert.ok(
    /(?:dialect|regional)/i.test(profile.ttsInstructions),
    "japanese_standard ttsInstructions must explicitly avoid regional dialect",
  );
  const known = YO_AUDIO_ACCENT_PROFILES.find(
    (p) => p.id === "japanese_standard",
  );
  assert.ok(
    known,
    "japanese_standard must appear in YO_AUDIO_ACCENT_PROFILES",
  );
});

test("accent profile registry does not silently drop earlier profiles", () => {
  const ids = YO_AUDIO_ACCENT_PROFILES.map((p) => p.id);
  for (const required of [
    "latin_american_neutral",
    "dominican_republic",
    "puerto_rico",
    "rioplatense_uruguay",
    "spain_neutral",
    "quebec_french",
    "italian_standard",
    "canadian_english",
    "japanese_standard",
  ]) {
    assert.ok(
      ids.includes(required),
      `accent profile registry must still expose ${required}`,
    );
  }
  // Sanity: the file source must still mention every existing profile.
  const accentSrc = read(ACCENT_PATH);
  for (const required of ["italian_standard", "canadian_english"]) {
    assert.ok(
      accentSrc.includes(required),
      `accent profile source must keep ${required} (Japanese is purely additive)`,
    );
  }
});

// ─── 4. Existing language coverage stays unchanged ───────────────
test("Spanish manifest items count stays at the documented 79 (Japanese is purely additive)", () => {
  const esItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) => i.targetLanguage === "es",
  );
  assert.equal(
    esItems.length,
    79,
    `Spanish item total must remain 79; got ${esItems.length}. Japanese additions must not touch Spanish data.`,
  );
});

test("Quebec French manifest items count stays at the documented 20 (Japanese is purely additive)", () => {
  const frItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) => i.targetLanguage === "fr" && i.accentProfile === "quebec_french",
  );
  assert.equal(
    frItems.length,
    20,
    `Quebec French item total must remain 20; got ${frItems.length}. Japanese additions must not touch Quebec French data.`,
  );
});

test("Italian manifest items count stays at the documented 32 (Japanese is purely additive)", () => {
  const itItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) =>
      i.targetLanguage === "it" && i.accentProfile === "italian_standard",
  );
  assert.equal(
    itItems.length,
    32,
    `Italian item total must remain 32; got ${itItems.length}. Japanese additions must not touch Italian data.`,
  );
});

test("English manifest items count stays at the documented 46 (Japanese is purely additive)", () => {
  const enItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) =>
      i.targetLanguage === "en" && i.accentProfile === "canadian_english",
  );
  assert.equal(
    enItems.length,
    46,
    `English item total must remain 46; got ${enItems.length}. Japanese additions must not touch English data.`,
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
test("Japanese intro page imports YoJapaneseAudioButton (not a raw YoPronunciationButton)", () => {
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoJapaneseAudioButton["']/,
    "page must import the Japanese wrapper",
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

test("page wires the Japanese audio context (moduleId, lessonId, accentProfile) on every audio surface", () => {
  assert.match(
    pageSrc,
    /<YoJapaneseAudioButton[\s\S]*?moduleId="japanese-intro"[\s\S]*?lessonId="intro"[\s\S]*?accentProfile="japanese_standard"/,
    "vocabulary surface must declare moduleId+lessonId+accentProfile",
  );
  assert.match(
    pageSrc,
    /audioContext=\{\s*\{[\s\S]*?moduleId:\s*"japanese-intro"[\s\S]*?accentProfile:\s*"japanese_standard"[\s\S]*?\}\s*\}/,
    "flashcard deck must forward an audioContext with the Japanese triple",
  );
});

test("YoJapaneseAudioButton wraps both YoAudioPlayer and the Web-Speech fallback", () => {
  assert.match(buttonSrc, /<YoAudioPlayer/);
  assert.match(buttonSrc, /<YoPronunciationButton/);
  assert.match(buttonSrc, /findAudioItemForContext/);
  assert.match(buttonSrc, /accentProfile\s*=\s*"japanese_standard"/);
  assert.match(buttonSrc, /speechLang\s*=\s*"ja-JP"/);
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

test("generator handles Japanese items without a hardcoded Spanish-only assumption", () => {
  assert.ok(
    !/targetLanguage\s*===\s*["']es["']/.test(scriptSrc),
    "generator must not hard-code a Spanish-only branch",
  );
});

// ─── 8. Security boundary ────────────────────────────────────────
test("YoJapaneseAudioButton + page never read server-only secrets or import the openai SDK", () => {
  for (const [label, src] of [
    ["YoJapaneseAudioButton", buttonSrc],
    ["japonais/intro page", pageSrc],
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

test("Japanese audio data file exists on disk and is wired in the aggregator", () => {
  assert.ok(exists("lib/yo/audio/japaneseIntroAudio.ts"));
  const aggregator = read("lib/yo/audio/audioManifest.ts");
  assert.match(aggregator, /japaneseIntroAudio/);
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
  console.log(`[yo:japanese-audio] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
