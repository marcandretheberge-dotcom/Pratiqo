/**
 * YoPratiqo — Quebec French pre-arrival intro regression suite.
 *
 * Style: `node:test`-style static-source assertions. No browser,
 * no live network, no Stripe / Supabase / RLS / migration / booking /
 * search / Membre Pro / legal code touched. Mirrors the existing
 * `tests/yo/yopratiqoLanguageSelection.test.ts` and
 * `tests/yo/yopratiqoSpanishAudioCoverage.test.ts` patterns so this
 * file slots cleanly into `npm run test:launch-critical`.
 *
 * What we guard:
 *
 *  1. Files exist — the data file + the page route are both shipped.
 *  2. Module shape — the data file declares the nine sections the
 *     intro UI needs (welcome, qcVsFr, survival, quebec, levels,
 *     kit, quiz, flashcards, plus the disclaimer).
 *  3. Content coverage — every required Quebec-French vocabulary
 *     item the brief calls out is present. 5–7 quiz questions.
 *     ≥ 12 flashcards grouped into ≥ 6 categories.
 *  4. Tone — banned phrases ("second-class citizen", vitamin-D
 *     pseudo-advice, etc.) never ship. Bill 96 is not turned into
 *     fear language. An "official sources" disclaimer is shipped.
 *  5. Audio integration — every survival word resolves through the
 *     pre-generated audio manifest (`accentProfile: "quebec_french"`).
 *     The page wires `<YoFrenchAudioButton>` with the
 *     `francais-quebec-intro` / `pre-arrival-intro` context so the
 *     manifest lookup hits, with on-device Web-Speech (`fr-CA`) as
 *     a graceful fallback when an item is missing.
 *  6. Out-of-scope guards — the intro never imports Stripe,
 *     Supabase, payment math, RLS migrations, booking or search
 *     code. Audio integration stays read-only (no OpenAI calls
 *     from the page).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

const DATA_PATH = "lib/yo/frenchQuebecIntro.ts";
const PAGE_PATH = "app/yo/langues/francais-quebec/intro/page.tsx";
const HUB_PATH = "app/yo/langues/page.tsx";

const dataSrc = read(DATA_PATH);
const pageSrc = read(PAGE_PATH);
const hubSrc = read(HUB_PATH);

/**
 * Strip JS comments — used so tone / forbidden-token assertions only
 * run against shipped UI copy, not against historical or explanatory
 * notes (the comments may legitimately reference what we explicitly
 * moved away from).
 */
function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const dataCopy = stripJsComments(dataSrc);
const pageCopy = stripJsComments(pageSrc);

// ─── 1. Files exist ────────────────────────────────────────────────
test("data file and page route both exist on disk", () => {
  assert.ok(exists(DATA_PATH), `${DATA_PATH} must exist`);
  assert.ok(exists(PAGE_PATH), `${PAGE_PATH} must exist`);
});

test("language hub links to the new Quebec French intro", () => {
  assert.match(hubSrc, /\/yo\/langues\/francais-quebec\/intro/);
});

// ─── 2. Module shape ───────────────────────────────────────────────
test("data file exports the named module data object", () => {
  assert.match(
    dataSrc,
    /export\s+const\s+frenchQuebecIntro\s*:\s*FrenchQuebecIntroData/,
  );
});

test("module declares every section the intro UI needs", () => {
  const requiredKeys = [
    "welcomeIntro",
    "welcomePromise",
    "officialLanguageNote",
    "qcVsFrIntro",
    "qcVsFrTable",
    "survivalWords",
    "quebecQuickStats",
    "quebecFacts",
    "languageScales",
    "languageLevelsLeadIn",
    "officialSourcesDisclaimer",
    "survivalKit",
    "quizQuestions",
    "flashcardGroups",
    "flashcards",
  ];
  for (const key of requiredKeys) {
    const re = new RegExp(`\\b${key}\\b\\s*[:,}]`);
    assert.match(
      dataSrc,
      re,
      `module data must declare ${key}`,
    );
  }
});

test("page imports the data file and reuses YoQuizPreview + YoFlashcardPreview", () => {
  assert.match(
    pageSrc,
    /from\s+["']@\/lib\/yo\/frenchQuebecIntro["']/,
  );
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoQuizPreview["']/,
  );
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoFlashcardPreview["']/,
  );
});

test("page renders the nine documented sections (deck-screen markers)", () => {
  // The app-shell deck refactor replaced per-section aria ids with
  // stable per-screen markers. Each screen still carries the same
  // pedagogical step it had on the legacy long-scroll page.
  const sectionAnchors = [
    'data-yo-fr-qc-intro-deck-screen="welcome"',
    'data-yo-fr-qc-intro-deck-screen="comparison"',
    'data-yo-fr-qc-intro-deck-screen="survival"',
    'data-yo-fr-qc-intro-deck-screen="quebec"',
    'data-yo-fr-qc-intro-deck-screen="levels"',
    'data-yo-fr-qc-intro-deck-screen="kit"',
    'data-yo-fr-qc-intro-deck-screen="quiz"',
    'data-yo-fr-qc-intro-deck-screen="flashcards"',
    'data-yo-fr-qc-intro-deck-screen="teacher"',
  ];
  for (const anchor of sectionAnchors) {
    assert.ok(
      pageSrc.includes(anchor),
      `page must render the ${anchor} section`,
    );
  }
});

// ─── 3. Content coverage ───────────────────────────────────────────
test("required Quebec French vocabulary items all appear in the data", () => {
  // Every required term from the product brief, in its real Quebec
  // surface form. We assert the literal `target:` field so a
  // contributor can't quietly rename them away.
  const required = [
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
  for (const term of required) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`target:\\s*["']${escaped}["']`);
    assert.match(
      dataSrc,
      re,
      `vocabulary item "${term}" must appear in survivalWords`,
    );
  }
});

test("quiz holds 5 to 7 questions, no more, no less", () => {
  // Outer YoQuizQuestion blocks each carry exactly one `prompt:`
  // field; option blocks carry `label:` instead. Counting `prompt:`
  // is a robust proxy for the question count without false positives
  // from option ids like "q_xxx_a".
  const matches = [...dataSrc.matchAll(/\bprompt:\s*lstr\(/g)];
  assert.ok(
    matches.length >= 5 && matches.length <= 7,
    `quizQuestions must have 5–7 items, got ${matches.length}`,
  );
});

test("flashcard deck has at least 12 cards across at least 6 grouped decks", () => {
  // Required group ids (mirror the product brief). We count by
  // matching the literal `id: "deck_..."` declaration, which is
  // unambiguous because no other entity uses that prefix.
  const requiredGroups = [
    "deck_quebec_identity",
    "deck_meals",
    "deck_daily",
    "deck_winter",
    "deck_bureaucracy",
    "deck_greetings",
  ];
  for (const id of requiredGroups) {
    assert.ok(
      dataSrc.includes(`id: "${id}"`),
      `flashcard group ${id} must be declared`,
    );
  }
  const deckMatches = [...dataSrc.matchAll(/\bid:\s*"deck_[a-z_]+"/g)];
  assert.ok(
    deckMatches.length >= 6,
    `flashcardGroups must have ≥ 6 grouped decks, got ${deckMatches.length}`,
  );
  // YoFlashcard items each carry exactly one `front:` field; nothing
  // else in the data file uses that key. Cheap, exact card count.
  const cardMatches = [...dataSrc.matchAll(/\bfront:\s*"/g)];
  assert.ok(
    cardMatches.length >= 12,
    `flashcards must total ≥ 12, got ${cardMatches.length}`,
  );
});

test("language-levels section names CEFR, CLB/NCLC and the Échelle québécoise", () => {
  // The page (or the data) must mention all three scales explicitly.
  // Static-source sniff so we don't have to render the page.
  assert.match(dataSrc, /CECR|CEFR/);
  assert.match(dataSrc, /CLB|NCLC/);
  assert.match(dataSrc, /Échelle\s+québécoise|Echelle\s+qu[eé]b[eé]coise/i);
});

// ─── 4. Tone ───────────────────────────────────────────────────────
test("intro never ships banned fear / pseudo-advice phrases", () => {
  // Every banned phrase from the tone-correction brief, applied to
  // both the data file copy AND the page copy.
  const forbidden = [
    /second[-\s]class\s+citizen/i,
    /citoyen[ne]?\s+de\s+seconde\s+zone/i,
    /vitamin\s*D\s+supplement/i,
    /suppl[eé]ment\s+de\s+vitamine\s*D/i,
    // No fear-coded "you must" wording around law 96.
    /loi\s*96.{0,80}\b(forc[eé]e?|interdit|punition|sanction|menace)\b/i,
    /bill\s*96.{0,80}\b(forced|forbidden|punish|sanction|threat)\b/i,
    // No "guaranteed" immigration-law promises.
    /guaranteed\s+(immigration|residency|permit|visa)/i,
    /immigration\s+(garantie|assur[eé]e)/i,
  ];
  for (const re of forbidden) {
    assert.ok(
      !re.test(dataCopy),
      `data file ships a banned tone phrase matching ${re.source}`,
    );
    assert.ok(
      !re.test(pageCopy),
      `page ships a banned tone phrase matching ${re.source}`,
    );
  }
});

test("French language policy keeps Bill 96 factual and welcoming", () => {
  // The official language note should describe the practical reality
  // ("French is the official and common language") without
  // weaponising it. We just check a positive marker is present.
  assert.match(
    dataSrc,
    /official\s+and\s+common\s+language/i,
    "EN copy must explain French as the official and common language",
  );
  assert.match(
    dataSrc,
    /langue\s+officielle\s+et\s+commune/i,
    "FR copy must explain French as the official and common language",
  );
});

test("immigration disclaimer points learners to official sources", () => {
  // We require a clear "verify with official sources" disclaimer
  // shipped in both languages. Any of these tokens count.
  const disclaimerEN =
    /verify\s+with\s+official\s+sources|requirements\s+vary\s+by\s+program\s+and\s+can\s+change/i;
  const disclaimerFR =
    /v[eé]rifie[rz]?\s+(toujours\s+)?les\s+sources\s+officielles|peuvent\s+changer/i;
  assert.match(
    dataSrc,
    disclaimerEN,
    "data must ship an EN 'verify official sources' disclaimer",
  );
  assert.match(
    dataSrc,
    disclaimerFR,
    "data must ship a FR 'sources officielles' disclaimer",
  );
  // And at least one named official source surface (Canada.ca,
  // Québec.ca, IRCC, MIFI). We accept any of them.
  assert.match(
    dataSrc,
    /Canada\.ca|Qu[eé]bec\.ca|IRCC|MIFI|Minist[eè]re\s+de\s+l['']Immigration/i,
    "disclaimer must name at least one official information source",
  );
});

// ─── 5. Audio integration ─────────────────────────────────────────
test("each survival word has a real `target:` row (manifest now owns audio)", () => {
  // We no longer ship per-row `audioUrl: null` placeholders — the
  // pre-generated audio manifest is the single source of truth.
  // What MUST stay true is that the data file declares ≥ 19 target
  // rows so the page renders all the documented survival vocabulary.
  const targetCount = (dataSrc.match(/\btarget:\s*"/g) ?? []).length;
  assert.ok(
    targetCount >= 19,
    `expected ≥ 19 vocabulary targets (one per survival word), got ${targetCount}`,
  );
  assert.ok(
    !/\baudioUrl:\s*null\b/.test(dataSrc),
    "data file must no longer ship per-row audioUrl: null placeholders (manifest replaces them)",
  );
});

test("page wires the pre-generated audio manifest via YoFrenchAudioButton", () => {
  // The page renders the new wrapper, which prefers a manifest MP3
  // and falls back to Web Speech only when an item is missing.
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoFrenchAudioButton["']/,
    "page must import the YoFrenchAudioButton wrapper",
  );
  assert.match(
    pageSrc,
    /<YoFrenchAudioButton[\s\S]*?accentProfile="quebec_french"/,
    "page must pass accentProfile=\"quebec_french\" to the wrapper",
  );
  // Web-Speech fallback must still declare `fr-CA` so the on-device
  // voice resolves correctly when a manifest item is missing.
  assert.match(
    pageSrc,
    /speechLang\s*=\s*["']fr-CA["']/,
    "page must pass speechLang=\"fr-CA\" to the audio button",
  );
  // Flashcard deck must forward the Quebec French context, including
  // fr-CA, so card pronunciation never defaults to es-ES.
  assert.match(
    pageSrc,
    /speechLang:\s*["']fr-CA["']/,
    "flashcard audioContext must declare speechLang: \"fr-CA\"",
  );
});

// ─── 6. Out-of-scope guards ───────────────────────────────────────
test("intro page never imports payment / supabase / RLS code", () => {
  const forbiddenImports = [
    /from\s+["']stripe["']/,
    /from\s+["']@\/lib\/stripe/,
    /from\s+["']@\/lib\/supabase/,
    /from\s+["']@supabase\//,
    /service[_-]?role/i,
  ];
  for (const re of forbiddenImports) {
    assert.ok(
      !re.test(pageSrc),
      `intro page must not import ${re.source}`,
    );
    assert.ok(
      !re.test(dataSrc),
      `data file must not import ${re.source}`,
    );
  }
});

test("intro never calls OpenAI or any TTS API at runtime", () => {
  // Audio is on-device Web Speech only. No server route, no fetch.
  const forbidden = [
    /from\s+["']openai["']/i,
    /\brequire\s*\(\s*["']openai["']\s*\)/i,
    /\/v1\/audio\/speech\b/i,
    /api\.openai\.com/i,
  ];
  for (const re of forbidden) {
    assert.ok(
      !re.test(pageSrc),
      `intro page must not reference ${re.source}`,
    );
    assert.ok(
      !re.test(dataSrc),
      `data file must not reference ${re.source}`,
    );
  }
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
  console.log(`[yo:fr-quebec-intro] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
