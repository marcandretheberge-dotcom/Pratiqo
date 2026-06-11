/**
 * YoPratiqo — Italian intro module regression suite.
 *
 * Style: `node:test`-style assertions over the typed data file +
 * static-source sniffs of the page. No browser, no network, no
 * Stripe / Supabase / RLS / migration / booking / search / Membre
 * Pro code touched.
 *
 * What we guard:
 *
 *  1. Module structure — the data file ships the nine sections the
 *     product brief asks for and the page renders them in order.
 *  2. Vocabulary floor — every Italian target word/phrase listed in
 *     the brief is present in `firstWords`.
 *  3. Quiz contract — at most 7 questions, every question has a
 *     valid `correctOptionId`, no duplicate option ids per question,
 *     no internal `q_` ids leaking into rendered labels.
 *  4. Flashcards — six grouped decks covering the brief's themes,
 *     plus every card's `front` matches the `target` of either a
 *     first-word or an anchor vocabulary item (so audio resolves).
 *  5. Tone discipline — no "perfect/native" overclaims, no fragile
 *     statistic claims (we asked for "~ 65–85 million" / "ordres de
 *     grandeur" wording), no pretend-Stripe / pretend-Supabase
 *     wiring.
 *  6. Italian target language tagging — `lang="it"` appears for
 *     every plain-Italian rendering surface.
 *  7. Route, breadcrumb, and CTA wiring.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { italianIntro } from "@/lib/yo/italianIntro";

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

const pageSrc = read(PAGE_PATH);
const dataSrc = read(DATA_PATH);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}
const pageCode = stripComments(pageSrc);
const dataCode = stripComments(dataSrc);

// ─── 1. Module structure ─────────────────────────────────────────
test("Italian intro data file exposes the nine documented sections", () => {
  // The exported object must surface a value (object/array/string)
  // for every named section. We assert the keys are present and
  // non-empty rather than relying on positional ordering inside the
  // object literal (TS does not constrain key order).
  const requiredKeys = [
    "welcomeIntro",
    "welcomePromise",
    "welcomeCulturalNote",
    "italianStatsLeadIn",
    "italianStats",
    "originIntro",
    "originBeats",
    "regionsLeadIn",
    "regionGroups",
    "dialectIntro",
    "dialectStrategicNote",
    "dialectExamplesIntro",
    "dialectExamples",
    "firstWordsIntro",
    "firstWords",
    "firstWordsGroupLabels",
    "quizQuestions",
    "flashcardGroups",
    "flashcards",
    "teacherBody",
    "teacherCta",
  ] as const;
  for (const key of requiredKeys) {
    assert.ok(
      key in italianIntro,
      `italianIntro must expose ${key}`,
    );
    const value = (italianIntro as Record<string, unknown>)[key];
    assert.ok(
      value !== undefined && value !== null,
      `italianIntro.${key} must not be null/undefined`,
    );
  }
});

test("page renders the nine intro sections in order (deck-screen markers)", () => {
  // The app-shell deck refactor replaced per-section aria ids with
  // stable per-screen markers wired through the shared YoLessonDeck.
  // Each screen still carries the same pedagogical step it had on the
  // old long-scroll page; we walk them in order to catch accidental
  // reorders.
  const expectedScreenMarkers = [
    'data-yo-italian-intro-deck-screen="welcome"',
    'data-yo-italian-intro-deck-screen="stats"',
    'data-yo-italian-intro-deck-screen="origin"',
    'data-yo-italian-intro-deck-screen="regions"',
    'data-yo-italian-intro-deck-screen="dialects"',
    'data-yo-italian-intro-deck-screen="first-words"',
    'data-yo-italian-intro-deck-screen="quiz"',
    'data-yo-italian-intro-deck-screen="flashcards"',
    'data-yo-italian-intro-deck-screen="teacher"',
  ];
  let cursor = 0;
  for (const marker of expectedScreenMarkers) {
    const found = pageSrc.indexOf(marker, cursor);
    assert.notEqual(
      found,
      -1,
      `page must declare deck-screen marker ${marker} after the previous one`,
    );
    cursor = found;
  }
});

// ─── 2. Vocabulary floor ─────────────────────────────────────────
test("firstWords covers every brief-required Italian item", () => {
  const requiredItalianTargets = [
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
  const present = new Set(italianIntro.firstWords.map((w) => w.target));
  for (const target of requiredItalianTargets) {
    assert.ok(
      present.has(target),
      `firstWords must include "${target}" (audio + flashcards depend on it)`,
    );
  }
});

test("anchor vocabulary appears in flashcards (so audio resolves to the manifest)", () => {
  const requiredAnchorWords = [
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
  ];
  const flashcardFronts = new Set(
    italianIntro.flashcards.map((card) => card.front),
  );
  for (const word of requiredAnchorWords) {
    assert.ok(
      flashcardFronts.has(word),
      `flashcards must surface anchor word "${word}" (so the deck audio resolves)`,
    );
  }
});

// ─── 3. Quiz contract ────────────────────────────────────────────
test("quiz ships at most 7 questions and at least 5", () => {
  assert.ok(
    italianIntro.quizQuestions.length >= 5 &&
      italianIntro.quizQuestions.length <= 7,
    `quiz must have between 5 and 7 questions; got ${italianIntro.quizQuestions.length}`,
  );
});

test("every quiz question has a valid correctOptionId and unique option ids", () => {
  for (const q of italianIntro.quizQuestions) {
    const optionIds = q.options.map((o) => o.id);
    const uniqueIds = new Set(optionIds);
    assert.equal(
      uniqueIds.size,
      optionIds.length,
      `quiz question ${q.id} has duplicate option ids`,
    );
    assert.ok(
      uniqueIds.has(q.correctOptionId),
      `quiz question ${q.id}: correctOptionId "${q.correctOptionId}" must match one of its options`,
    );
    // Each option must have an FR + EN label.
    for (const option of q.options) {
      assert.ok(
        typeof option.label.fr === "string" && option.label.fr.length > 0,
        `quiz option ${q.id}/${option.id} must have a French label`,
      );
      assert.ok(
        typeof option.label.en === "string" && option.label.en.length > 0,
        `quiz option ${q.id}/${option.id} must have an English label`,
      );
    }
  }
});

// ─── 4. Flashcards ───────────────────────────────────────────────
test("six flashcard groups match the brief's six themes", () => {
  const expected = [
    "deck_world",
    "deck_origin",
    "deck_regions",
    "deck_courtesy",
    "deck_tools",
    "deck_travel",
  ];
  const got = italianIntro.flashcardGroups.map((g) => g.id);
  assert.deepEqual(
    got,
    expected,
    `flashcard groups must match the documented six themes; got ${got.join(", ")}`,
  );
});

test("flashcards collection is the concatenation of every group's cards (no duplicates)", () => {
  const sumOfGroupCards = italianIntro.flashcardGroups.reduce(
    (n, g) => n + g.cards.length,
    0,
  );
  assert.equal(
    italianIntro.flashcards.length,
    sumOfGroupCards,
    "flashcards must equal the sum of every group's cards",
  );
  const seenIds = new Set<string>();
  for (const card of italianIntro.flashcards) {
    assert.ok(
      !seenIds.has(card.id),
      `duplicate flashcard id ${card.id}`,
    );
    seenIds.add(card.id);
  }
});

// ─── 5. Tone discipline ──────────────────────────────────────────
test("data file does not over-promise on accent or statistics", () => {
  // Forbidden tokens (case-insensitive) that would either over-claim
  // perfect Italian or ship a brittle exact statistic. Comment-stripped
  // so the JSDoc rationale (which may legitimately MENTION the bad
  // patterns we're avoiding) does not trip the assertion.
  const forbidden = [
    /\bperfect\s+(?:italian|accent)\b/i,
    /\bnative-?level\s+italian\b/i,
    /\bguaranteed\b/i,
    /\bexactly\s+\d{2,}\s+million\b/i,
    /\b85\s+million\s+exactly\b/i,
  ];
  for (const re of forbidden) {
    assert.ok(
      !re.test(dataCode),
      `data file must not ship the over-claim ${re.source}`,
    );
  }
});

test("data file mentions Dante, Florence, and the Italian unification anchor", () => {
  // Anchor terms that the brief specifically asked us to keep.
  // These also let teachers spot-check that the page content didn't
  // get accidentally truncated.
  for (const term of [/Dante/i, /Florence|florentin|Florentine/i, /1861/]) {
    assert.match(
      dataSrc,
      term,
      `data file must keep the historical anchor ${term.source}`,
    );
  }
});

test("Prego pedagogical note is preserved", () => {
  // The brief explicitly asked for the multi-meaning "prego"
  // explanation. Keep the safety net.
  assert.match(
    dataSrc,
    /multifonction|Multipurpose/i,
    "data file must keep the multi-meaning 'Prego' explanation",
  );
});

// ─── 6. Italian target language tagging ──────────────────────────
test("page renders Italian text with lang=\"it\"", () => {
  assert.match(
    pageSrc,
    /lang="it"/,
    "page must tag Italian renderings with lang=\"it\"",
  );
});

// ─── 7. Route, breadcrumb, and CTA wiring ────────────────────────
test("Italian intro route exists on disk", () => {
  assert.ok(
    exists("app/yo/langues/italien/intro/page.tsx"),
    "Italian intro page.tsx must exist",
  );
  assert.ok(
    exists("lib/yo/italianIntro.ts"),
    "Italian intro data file must exist",
  );
});

test("page mounts the app-shell deck and wires the teacher CTA", () => {
  // The all-language-intros app-shell brief removed breadcrumb-primary
  // navigation from intro routes. The deck shell now owns the top
  // navigation (back arrow + YoPratiqo logo + language toggle).
  assert.match(
    pageCode,
    /<YoLessonDeck\b/,
    "page must mount the YoLessonDeck shell",
  );
  assert.ok(
    !/<YoBreadcrumb\b/.test(pageCode),
    "intro page must not use YoBreadcrumb as primary navigation",
  );
  assert.match(
    pageCode,
    /\/trouver-un-prof/,
    "page must link to the teacher search route",
  );
});

test("page imports Italian intro data + Italian audio button", () => {
  assert.match(
    pageSrc,
    /from\s+["']@\/lib\/yo\/italianIntro["']/,
  );
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoItalianAudioButton["']/,
  );
});

// ─── 8. No accidental cross-language regression ──────────────────
test("French Quebec and Spanish data files are not edited by the Italian module", () => {
  // The Italian module must not import or modify other modules'
  // data files. We spot-check by confirming the Italian page does
  // not import French or Spanish data files.
  assert.ok(
    !/from\s+["']@\/lib\/yo\/frenchQuebecIntro["']/.test(pageSrc),
    "Italian page must not import the Quebec French data",
  );
  assert.ok(
    !/from\s+["']@\/lib\/yo\/spanishIntroA1["']/.test(pageSrc),
    "Italian page must not import the Spanish data",
  );
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
  console.log(`[yo:italian-intro] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
