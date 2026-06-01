/**
 * YoPratiqo — Italian audio coverage regression suite.
 *
 * Style: `node:test`-style assertions. Mixes runtime manifest
 * inspection with static-source sniffs of the page so we cover both
 * the data layer (manifest entries, accent profile, paths) and the
 * frontend wiring (button used, contextual lookup, no Web Speech
 * default).
 *
 * What we guard:
 *
 *  1. Every Italian survival/anchor item required by the product
 *     brief resolves to a manifest entry with
 *     `accentProfile: "italian_standard"` and a deterministic
 *     storage path under
 *     `yo/it/italian-intro/intro/italian-standard/...`.
 *
 *  2. The `italian_standard` accent profile is registered with
 *     safe, non-overpromising TTS instructions and an `it-IT`
 *     BCP-47 hint.
 *
 *  3. Spanish (79) and Quebec French (≥19) coverage stays unchanged:
 *     Italian additions are PURELY ADDITIVE and never touch
 *     existing module data.
 *
 *  4. Frontend integration: the page imports `YoItalianAudioButton`,
 *     wires `accentProfile="italian_standard"`, and the flashcard
 *     deck forwards an Italian audioContext to YoFlashcardPreview.
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
import { italianIntroAudio } from "@/lib/yo/audio/italianIntroAudio";

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

const PAGE_PATH = "app/yo/langues/italien/intro/page.tsx";
const DATA_PATH = "lib/yo/italianIntro.ts";
const BUTTON_PATH = "components/yo/YoItalianAudioButton.tsx";
const SCRIPT_PATH = "scripts/generate-yopratiqo-audio.ts";

const pageSrc = read(PAGE_PATH);
const dataSrc = read(DATA_PATH);
const buttonSrc = read(BUTTON_PATH);
const scriptSrc = read(SCRIPT_PATH);

// ─── Required Italian target surface ──────────────────────────────
//
// Mirror of the product brief — every Italian word/phrase below MUST
// have a manifest entry under accentProfile="italian_standard".
// Adding new vocabulary in `lib/yo/italianIntro.ts` is fine; this
// list is the floor, not the ceiling.
const REQUIRED_IT_TARGETS: readonly string[] = [
  // Anchor vocabulary (sections 1–5)
  "il mondo",
  "la lingua",
  "parlare",
  "il paese",
  "milioni",
  "la storia",
  "il latino",
  "la parola",
  "il dialetto",
  "la regione",
  "la città",
  "il nord",
  "il centro",
  "il sud",
  "diverso",
  "uguale",
  "l’accento",
  // First survival expressions (section 6)
  "Ciao",
  "Buongiorno",
  "Buonasera",
  "Buonanotte",
  "Grazie",
  "Prego",
  "Per favore",
  "Scusi",
  "Scusa",
  "Dove?",
  "Quanto costa?",
  "Vorrei",
  "Non capisco",
  "Parla francese?",
  "Parla inglese?",
];

function normaliseLookup(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findItalianItem(target: string): YoAudioItem | undefined {
  const needle = normaliseLookup(target);
  return YOPRATIQO_AUDIO_MANIFEST.find(
    (item) =>
      item.accentProfile === "italian_standard" &&
      normaliseLookup(item.text) === needle,
  );
}

// ─── 1. Manifest coverage of every required Italian item ──────────
test("every required Italian target has a manifest entry", () => {
  for (const target of REQUIRED_IT_TARGETS) {
    const item = findItalianItem(target);
    assert.ok(
      item,
      `manifest must include an italian_standard entry for "${target}"`,
    );
    assert.equal(
      item!.accentProfile,
      "italian_standard",
      `entry for "${target}" must use accentProfile="italian_standard"`,
    );
    assert.equal(
      item!.targetLanguage,
      "it",
      `entry for "${target}" must declare targetLanguage="it"`,
    );
    assert.equal(
      item!.moduleId,
      "italian-intro",
      `entry for "${target}" must declare moduleId="italian-intro"`,
    );
    assert.equal(
      item!.lessonId,
      "intro",
      `entry for "${target}" must declare lessonId="intro"`,
    );
  }
});

test("Italian audio module ships at least 30 items", () => {
  assert.ok(
    italianIntroAudio.length >= 30,
    `expected ≥ 30 italian_standard items, got ${italianIntroAudio.length}`,
  );
});

// ─── 2. Storage path discipline ───────────────────────────────────
test("every Italian item has a deterministic, accent-aware storage path", () => {
  const expectedPrefix = `${YOPRATIQO_AUDIO_ROOT_PREFIX}/it/italian-intro/intro/italian-standard/`;
  const seenPaths = new Set<string>();
  const seenIds = new Set<string>();
  for (const item of italianIntroAudio) {
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

test("Italian ids carry the it-iti-<type>-<slug> shape", () => {
  for (const item of italianIntroAudio) {
    assert.match(
      item.id,
      /^it-iti-(?:word|phrase|sentence)-[a-z0-9-]+$/,
      `Italian item id ${item.id} must follow it-iti-<type>-<slug>`,
    );
  }
});

// ─── 3. Accent profile shape ─────────────────────────────────────
test("italian_standard accent profile is registered with a safe, non-overpromising voice direction", () => {
  const profile = getYoAudioAccentProfile("italian_standard");
  assert.equal(profile.id, "italian_standard");
  assert.equal(profile.pathSlug, "italian-standard");
  assert.equal(profile.bcp47Hint, "it-IT");
  assert.ok(
    profile.ttsInstructions.length > 40,
    "italian_standard ttsInstructions must be a real instruction string",
  );
  assert.ok(
    !/native speaker|guarantee|perfect accent/i.test(profile.ttsInstructions),
    "italian_standard profile must not promise a native or guaranteed accent",
  );
  const known = YO_AUDIO_ACCENT_PROFILES.find(
    (p) => p.id === "italian_standard",
  );
  assert.ok(
    known,
    "italian_standard must appear in YO_AUDIO_ACCENT_PROFILES",
  );
});

// ─── 4. Existing language coverage stays unchanged ───────────────
test("Spanish manifest items count stays at the documented 79 (Italian is purely additive)", () => {
  const esItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) => i.targetLanguage === "es",
  );
  assert.equal(
    esItems.length,
    79,
    `Spanish item total must remain 79; got ${esItems.length}. Italian additions must not touch Spanish data.`,
  );
});

test("Quebec French manifest items count stays at the documented 45 (Italian is purely additive)", () => {
  // 20 FR Quebec intro items + 25 FR Quebec premium Module 1 ·
  // Lesson 1 items (14 core phrases + 11 unique dialogue lines).
  // The Italian additions must not touch any of them.
  const frItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) => i.targetLanguage === "fr" && i.accentProfile === "quebec_french",
  );
  assert.equal(
    frItems.length,
    45,
    `Quebec French item total must remain 45; got ${frItems.length}. Italian additions must not touch Quebec French data.`,
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
test("Italian intro page imports YoItalianAudioButton (not a raw YoPronunciationButton)", () => {
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoItalianAudioButton["']/,
    "page must import the Italian wrapper",
  );
  // Comment-stripped check so the JSDoc rationale describing the old
  // approach does not falsely trip the assertion.
  const pageNoComments = pageSrc
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  assert.ok(
    !/<YoPronunciationButton\b/.test(pageNoComments),
    "page must not embed a raw YoPronunciationButton (use the wrapper)",
  );
});

test("page wires the Italian audio context (moduleId, lessonId, accentProfile) on every audio surface", () => {
  assert.match(
    pageSrc,
    /<YoItalianAudioButton[\s\S]*?moduleId="italian-intro"[\s\S]*?lessonId="intro"[\s\S]*?accentProfile="italian_standard"/,
    "vocabulary surface must declare moduleId+lessonId+accentProfile",
  );
  assert.match(
    pageSrc,
    /audioContext=\{\s*\{[\s\S]*?moduleId:\s*"italian-intro"[\s\S]*?accentProfile:\s*"italian_standard"[\s\S]*?\}\s*\}/,
    "flashcard deck must forward an audioContext with the Italian triple",
  );
});

test("YoItalianAudioButton wraps both YoAudioPlayer and the Web-Speech fallback", () => {
  assert.match(buttonSrc, /<YoAudioPlayer/);
  assert.match(buttonSrc, /<YoPronunciationButton/);
  assert.match(buttonSrc, /findAudioItemForContext/);
  assert.match(buttonSrc, /accentProfile\s*=\s*"italian_standard"/);
  assert.match(buttonSrc, /speechLang\s*=\s*"it-IT"/);
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
  // contributor reading the plan can tell Spanish from French from
  // Italian at a glance.
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

test("generator handles Italian items without a hardcoded Spanish-only assumption", () => {
  // The script must not branch on `targetLanguage === "es"` to do
  // anything language-specific. The accent profile + manifest
  // contract is the single source of truth.
  assert.ok(
    !/targetLanguage\s*===\s*["']es["']/.test(scriptSrc),
    "generator must not hard-code a Spanish-only branch",
  );
});

// ─── 8. Security boundary ────────────────────────────────────────
test("YoItalianAudioButton + page never read server-only secrets or import the openai SDK", () => {
  for (const [label, src] of [
    ["YoItalianAudioButton", buttonSrc],
    ["italien/intro page", pageSrc],
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

test("Italian audio data file exists on disk and is wired in the aggregator", () => {
  assert.ok(exists("lib/yo/audio/italianIntroAudio.ts"));
  const aggregator = read("lib/yo/audio/audioManifest.ts");
  assert.match(aggregator, /italianIntroAudio/);
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
  console.log(`[yo:italian-audio] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
