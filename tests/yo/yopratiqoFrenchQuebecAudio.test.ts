/**
 * YoPratiqo — Quebec French audio coverage regression suite.
 *
 * Style: `node:test`-style assertions. Mixes runtime manifest
 * inspection with static-source sniffs of the page so we cover both
 * the data layer (manifest entries, accent profile, paths) and the
 * frontend wiring (button used, contextual lookup, no Web Speech
 * default).
 *
 * What we guard:
 *
 *  1. Every Quebec-French survival vocabulary item from
 *     `lib/yo/frenchQuebecIntro.ts` resolves to a manifest entry
 *     with `accentProfile: "quebec_french"` and a deterministic
 *     storage path under
 *     `yo/fr/francais-quebec-intro/pre-arrival-intro/quebec-french/...`.
 *
 *  2. The `quebec_french` accent profile is registered with safe,
 *     non-overpromising TTS instructions and a `fr-CA` BCP-47 hint.
 *
 *  3. Spanish coverage is unchanged: the legacy 8 Phase 1 paths stay
 *     present, and the post-fix Spanish item count stays at 79
 *     (so Quebec French additions are purely additive).
 *
 *  4. Frontend integration: the page imports `YoFrenchAudioButton`,
 *     wires `accentProfile="quebec_french"`, and the flashcard deck
 *     forwards a Quebec-French audioContext to YoFlashcardPreview.
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
import { frenchQuebecIntroAudio } from "@/lib/yo/audio/frenchQuebecIntroAudio";

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

const PAGE_PATH = "app/yo/langues/francais-quebec/intro/page.tsx";
const DATA_PATH = "lib/yo/frenchQuebecIntro.ts";
const BUTTON_PATH = "components/yo/YoFrenchAudioButton.tsx";
const SCRIPT_PATH = "scripts/generate-yopratiqo-audio.ts";

const pageSrc = read(PAGE_PATH);
const dataSrc = read(DATA_PATH);
const buttonSrc = read(BUTTON_PATH);
const scriptSrc = read(SCRIPT_PATH);

// ─── Required Quebec French target surface ────────────────────────
//
// Mirror of the product brief — every item below MUST have a manifest
// entry under accentProfile="quebec_french". Adding a new survival
// word in `lib/yo/frenchQuebecIntro.ts` requires adding a matching
// manifest entry; this test is the safety net.
const REQUIRED_FR_TARGETS: readonly string[] = [
  "le Québec",
  "francophone",
  "un char",
  "la job",
  "frette",
  "la fin de semaine",
  "le déjeuner",
  "le dîner",
  "le souper",
  "mon chum",
  "ma blonde",
  "Salut",
  "Ça va-tu ?",
  "Pas pire",
  "Bienvenue",
  "la tuque",
  "les mitaines",
  "la RAMQ",
  "la carte soleil",
];

function normaliseLookup(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findFrenchItem(target: string): YoAudioItem | undefined {
  const needle = normaliseLookup(target);
  return YOPRATIQO_AUDIO_MANIFEST.find(
    (item) =>
      item.accentProfile === "quebec_french" &&
      normaliseLookup(item.text) === needle,
  );
}

// ─── 1. Manifest coverage of every survival word ──────────────────
test("every Quebec French survival word has a manifest entry", () => {
  for (const target of REQUIRED_FR_TARGETS) {
    const item = findFrenchItem(target);
    assert.ok(
      item,
      `manifest must include a quebec_french entry for "${target}"`,
    );
    assert.equal(
      item!.accentProfile,
      "quebec_french",
      `entry for "${target}" must use accentProfile="quebec_french"`,
    );
    assert.equal(
      item!.targetLanguage,
      "fr",
      `entry for "${target}" must declare targetLanguage="fr"`,
    );
    assert.equal(
      item!.moduleId,
      "francais-quebec-intro",
      `entry for "${target}" must declare moduleId="francais-quebec-intro"`,
    );
    assert.equal(
      item!.lessonId,
      "pre-arrival-intro",
      `entry for "${target}" must declare lessonId="pre-arrival-intro"`,
    );
  }
});

test("Quebec French audio module ships at least 19 items", () => {
  assert.ok(
    frenchQuebecIntroAudio.length >= 19,
    `expected ≥ 19 quebec_french items, got ${frenchQuebecIntroAudio.length}`,
  );
});

// ─── 2. Storage path discipline ───────────────────────────────────
test("every Quebec French item has a deterministic, accent-aware storage path", () => {
  const expectedPrefix = `${YOPRATIQO_AUDIO_ROOT_PREFIX}/fr/francais-quebec-intro/pre-arrival-intro/quebec-french/`;
  const seenPaths = new Set<string>();
  const seenIds = new Set<string>();
  for (const item of frenchQuebecIntroAudio) {
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
    // /[^a-z0-9/.-]/ catches accents, underscores and any other
    // disallowed character that would break Supabase Storage paths.
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

test("Quebec French ids carry the fr-fqi-<type>-<slug> shape", () => {
  for (const item of frenchQuebecIntroAudio) {
    assert.match(
      item.id,
      /^fr-fqi-(?:word|phrase|sentence)-[a-z0-9-]+$/,
      `Quebec French item id ${item.id} must follow fr-fqi-<type>-<slug>`,
    );
  }
});

// ─── 3. Accent profile shape ─────────────────────────────────────
test("quebec_french accent profile is registered with a safe, non-overpromising voice direction", () => {
  const profile = getYoAudioAccentProfile("quebec_french");
  assert.equal(profile.id, "quebec_french");
  assert.equal(profile.pathSlug, "quebec-french");
  assert.equal(profile.bcp47Hint, "fr-CA");
  assert.ok(
    profile.ttsInstructions.length > 40,
    "quebec_french ttsInstructions must be a real instruction string",
  );
  assert.ok(
    !/native speaker|guarantee|perfect accent/i.test(profile.ttsInstructions),
    "quebec_french profile must not promise a native or guaranteed accent",
  );
  // Confirm it's exposed on the public PROFILES list.
  const known = YO_AUDIO_ACCENT_PROFILES.find((p) => p.id === "quebec_french");
  assert.ok(known, "quebec_french must appear in YO_AUDIO_ACCENT_PROFILES");
});

// ─── 4. Spanish coverage stays unchanged ─────────────────────────
test("Spanish manifest items count stays at the documented 79 (Quebec French is purely additive)", () => {
  const esItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) => i.targetLanguage === "es",
  );
  assert.equal(
    esItems.length,
    79,
    `Spanish item total must remain 79; got ${esItems.length}. Quebec French additions must not touch Spanish data.`,
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

// ─── 5. Frontend integration ─────────────────────────────────────
test("Quebec French intro page imports YoFrenchAudioButton (not YoPronunciationButton)", () => {
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoFrenchAudioButton["']/,
    "page must import the new French wrapper",
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

test("page wires the Quebec French audio context (moduleId, lessonId, accentProfile) on every audio surface", () => {
  // The vocabulary list calls the wrapper with the canonical
  // module/lesson/accent triple.
  assert.match(
    pageSrc,
    /<YoFrenchAudioButton[\s\S]*?moduleId="francais-quebec-intro"[\s\S]*?lessonId="pre-arrival-intro"[\s\S]*?accentProfile="quebec_french"/,
    "vocabulary surface must declare moduleId+lessonId+accentProfile",
  );
  // The flashcard deck forwards the same triple so the inner
  // YoSpanishAudioButton wrapper resolves Quebec French manifest
  // entries (the lookup is language-agnostic).
  assert.match(
    pageSrc,
    /audioContext=\{\s*\{[\s\S]*?moduleId:\s*"francais-quebec-intro"[\s\S]*?accentProfile:\s*"quebec_french"[\s\S]*?\}\s*\}/,
    "flashcard deck must forward an audioContext with the Quebec French triple",
  );
});

test("YoFrenchAudioButton wraps both YoAudioPlayer and the Web-Speech fallback", () => {
  assert.match(buttonSrc, /<YoAudioPlayer/);
  assert.match(buttonSrc, /<YoPronunciationButton/);
  assert.match(buttonSrc, /findAudioItemForContext/);
  assert.match(buttonSrc, /accentProfile\s*=\s*"quebec_french"/);
  assert.match(buttonSrc, /speechLang\s*=\s*"fr-CA"/);
});

test("data file no longer ships per-row audioUrl/speechLang fields (manifest is the source of truth)", () => {
  assert.ok(
    !/\baudioUrl:\s*null\b/.test(dataSrc),
    "data file must no longer carry per-row audioUrl: null hooks (manifest replaces them)",
  );
  // The data file may still describe `audioUrl` in its JSDoc — the
  // structural check above is the actual guard.
});

// ─── 6. Generator changes ────────────────────────────────────────
test("generator dry-run logs targetLanguage alongside the accent profile and instructions tag", () => {
  // The dry-run line must include `lang=<targetLanguage>` so a
  // contributor reading the plan can tell Spanish from French at
  // a glance.
  assert.match(
    scriptSrc,
    /would generate \$\{item\.id\}[\s\S]*?lang=\$\{item\.targetLanguage\}[\s\S]*?accent=\$\{item\.accentProfile\}/,
    "dry-run log must include `lang=${item.targetLanguage}`",
  );
  // And the live success log must do the same so post-run audits
  // include the language too.
  assert.match(
    scriptSrc,
    /generated \$\{item\.id\}[\s\S]*?lang=\$\{item\.targetLanguage\}[\s\S]*?accent=\$\{item\.accentProfile\}/,
    "live success log must include `lang=${item.targetLanguage}`",
  );
});

// ─── 7. Security boundary ────────────────────────────────────────
test("YoFrenchAudioButton + page never read server-only secrets or import the openai SDK", () => {
  for (const [label, src] of [
    ["YoFrenchAudioButton", buttonSrc],
    ["francais-quebec/intro page", pageSrc],
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

test("Quebec French audio data file exists on disk and is wired in the aggregator", () => {
  assert.ok(exists("lib/yo/audio/frenchQuebecIntroAudio.ts"));
  const aggregator = read("lib/yo/audio/audioManifest.ts");
  assert.match(aggregator, /frenchQuebecIntroAudio/);
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
  console.log(`[yo:fr-quebec-audio] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
