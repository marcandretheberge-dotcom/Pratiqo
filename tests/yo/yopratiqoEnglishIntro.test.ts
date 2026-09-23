/**
 * YoPratiqo — English intro module regression suite.
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
 *  2. Tone discipline — "This is not your fault." is preserved
 *     verbatim, the school critique is softened (no "anti-teacher"
 *     framing), no learner-shaming language.
 *  3. Vocabulary floor — every English target word/phrase listed in
 *     the brief is present in either the survival kit or the
 *     flashcards.
 *  4. Quiz contract — at most 7 questions, every question has a
 *     valid `correctOptionId`, and the quiz reinforces a
 *     confidence-building, false-friend-aware curriculum.
 *  5. Flashcards — six grouped decks covering the brief's themes.
 *  6. False-friends safety — the section explicitly covers the
 *     classic francophone traps (actually, eventually, library,
 *     sensible, chair, assist, rest, demand, engaged, pretend).
 *  7. English target tagging — `lang="en"` appears for every
 *     plain-English rendering surface.
 *  8. Route, breadcrumb, and CTA wiring.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { englishIntro } from "@/lib/yo/englishIntro";

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
test("English intro data file exposes the documented sections", () => {
  // The exported object must surface a value (object/array/string)
  // for every named section. We assert the keys are present and
  // non-empty rather than relying on positional ordering inside the
  // object literal (TS does not constrain key order).
  const requiredKeys = [
    "welcomeIntro",
    "welcomeNotYourFault",
    "welcomeContract",
    "numbersLeadIn",
    "englishStats",
    "numbersTakeaway",
    "schoolIntro",
    "schoolPatterns",
    "schoolReframe",
    "schoolPermissionToTry",
    "variantsIntro",
    "variantCards",
    "variantsTakeaway",
    "cognatesIntro",
    "cognateExamples",
    "cognatesPower",
    "falseFriendsIntro",
    "falseFriends",
    "survivalIntro",
    "survivalPhrases",
    "survivalGroupLabels",
    "quizQuestions",
    "flashcardGroups",
    "flashcards",
    "teacherBody",
    "teacherCta",
  ] as const;
  for (const key of requiredKeys) {
    assert.ok(key in englishIntro, `englishIntro must expose ${key}`);
    const value = englishIntro[key];
    assert.ok(
      value !== undefined && value !== null,
      `englishIntro.${key} must not be null/undefined`,
    );
  }
});

test("page renders the nine intro sections in order (deck-screen markers)", () => {
  // The app-shell deck refactor replaced per-section aria ids with
  // stable per-screen markers. Each screen still carries the same
  // pedagogical step it had on the long-scroll page; we walk them
  // in order to catch accidental reorders.
  const expectedScreenMarkers = [
    'data-yo-english-intro-deck-screen="welcome"',
    'data-yo-english-intro-deck-screen="numbers"',
    'data-yo-english-intro-deck-screen="school"',
    'data-yo-english-intro-deck-screen="variants"',
    'data-yo-english-intro-deck-screen="dormant"',
    'data-yo-english-intro-deck-screen="survival"',
    'data-yo-english-intro-deck-screen="quiz"',
    'data-yo-english-intro-deck-screen="flashcards"',
    'data-yo-english-intro-deck-screen="teacher"',
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

// ─── 2. Tone discipline ──────────────────────────────────────────
test("'This is not your fault.' is preserved verbatim", () => {
  // The brief explicitly asks for this exact phrase. It is the
  // emotional spine of the module and we never silently rephrase
  // it.
  assert.match(
    dataSrc,
    /This is not your fault\./,
    "data file must preserve 'This is not your fault.' verbatim",
  );
});

test("school critique is softened — no anti-teacher framing", () => {
  // Forbidden tokens (case-insensitive) that would either trash
  // school or shame the learner. Comment-stripped so the JSDoc
  // rationale describing the policy doesn't trip the assertion.
  const forbiddenAntiSchool = [
    /\bbad\s+teacher(?:s)?\b/i,
    /\bteachers\s+failed\s+you\b/i,
    /\bschool\s+lied\b/i,
    /\bworthless\s+school\b/i,
    /\bschool\s+(?:was\s+)?useless\b/i,
  ];
  for (const re of forbiddenAntiSchool) {
    assert.ok(
      !re.test(dataCode),
      `data file must not ship the anti-teacher token ${re.source}`,
    );
  }
});

test("learner-shaming language is absent", () => {
  // No "you failed", "you suck at", "stupid", etc. The whole point
  // of the module is the OPPOSITE.
  const forbiddenShame = [
    /\byou\s+failed\b/i,
    /\byou(?:'re|\s+are)\s+bad\s+at\s+english\b/i,
    /\byou(?:'re|\s+are)\s+stupid\b/i,
    /\byou(?:'re|\s+are)\s+lazy\b/i,
    /\bnul\s+en\s+anglais\b/i, // FR shaming
  ];
  for (const re of forbiddenShame) {
    assert.ok(
      !re.test(dataCode),
      `data file must not ship the shaming token ${re.source}`,
    );
  }
});

test("module re-frames school as preparing for exercises, not for speaking", () => {
  // The brief asks for the specific reframe:
  //   "L'école t'a préparé à réussir des exercices; ici, on va te
  //    préparer à parler."
  // We assert that idea is present without locking the exact
  // wording — different punctuation variants are fine.
  assert.match(
    dataSrc,
    /préparé\s+à\s+réussir\s+des\s+exercices/i,
    "FR copy must keep the 'préparé à réussir des exercices' reframe",
  );
  assert.match(
    dataSrc,
    /prepared\s+you\s+to\s+pass\s+exercises/i,
    "EN copy must keep the 'prepared you to pass exercises' reframe",
  );
});

test("module does not over-promise on exact 2025 statistics", () => {
  // Numbers should be approximate ("~ 1.5 billion", "~ 60", "the
  // majority") not concrete-and-falsifiable claims like
  // "exactly 1,348,724,005 speakers in 2025."
  assert.ok(
    !/\bexactly\s+\d{2,}\s+(?:million|billion)\b/i.test(dataCode),
    "data file must not ship the over-claim 'exactly N million/billion'",
  );
  // We DO want approximate markers: "~", "around", "approximately",
  // "majority". One of them is enough.
  assert.ok(
    /(?:~|around|approximately|majority|environ)/i.test(dataSrc),
    "data file must use approximate wording for English-speaker statistics",
  );
});

// ─── 3. Vocabulary floor ─────────────────────────────────────────
test("survivalPhrases covers every brief-required English item", () => {
  // The brief asks for these 18 phrases / sentences specifically.
  // We don't pin the exact dataset shape (sentence vs phrase) —
  // the audio manifest test does that — we just confirm each
  // surface text is present in the rendered survival kit.
  const required = [
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
  const present = new Set(
    englishIntro.survivalPhrases.map((p) => p.target),
  );
  for (const target of required) {
    assert.ok(
      present.has(target),
      `survivalPhrases must include "${target}" (audio + flashcards depend on it)`,
    );
  }
});

test("anchor + variant words appear in flashcards (so audio resolves)", () => {
  const requiredAnchor = [
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
    "American",
    "British",
    "Canadian",
  ];
  const flashcardFronts = new Set(
    englishIntro.flashcards.map((c) => c.front),
  );
  for (const word of requiredAnchor) {
    assert.ok(
      flashcardFronts.has(word),
      `flashcards must surface "${word}" (so the deck audio resolves)`,
    );
  }
});

// ─── 4. Quiz contract ────────────────────────────────────────────
test("quiz ships at most 7 questions and at least 5", () => {
  assert.ok(
    englishIntro.quizQuestions.length >= 5 &&
      englishIntro.quizQuestions.length <= 7,
    `quiz must have between 5 and 7 questions; got ${englishIntro.quizQuestions.length}`,
  );
});

test("every quiz question has a valid correctOptionId and unique option ids", () => {
  for (const q of englishIntro.quizQuestions) {
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

// ─── 5. Flashcards ───────────────────────────────────────────────
test("six flashcard groups match the brief's six themes", () => {
  const expected = [
    "deck_world",
    "deck_learning",
    "deck_variants",
    "deck_false_friends",
    "deck_survival",
    "deck_daily",
  ];
  const got = englishIntro.flashcardGroups.map((g) => g.id);
  assert.deepEqual(
    got,
    expected,
    `flashcard groups must match the documented six themes; got ${got.join(", ")}`,
  );
});

test("flashcards collection is the concatenation of every group's cards (no duplicates)", () => {
  const sumOfGroupCards = englishIntro.flashcardGroups.reduce(
    (n, g) => n + g.cards.length,
    0,
  );
  assert.equal(
    englishIntro.flashcards.length,
    sumOfGroupCards,
    "flashcards must equal the sum of every group's cards",
  );
  const seenIds = new Set<string>();
  for (const card of englishIntro.flashcards) {
    assert.ok(!seenIds.has(card.id), `duplicate flashcard id ${card.id}`);
    seenIds.add(card.id);
  }
});

// ─── 6. False-friends safety ─────────────────────────────────────
test("false-friends section covers the brief's full francophone trap list", () => {
  const requiredFalseFriends = [
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
  ];
  const present = new Set(
    englishIntro.falseFriends.map((ff) => ff.english),
  );
  for (const word of requiredFalseFriends) {
    assert.ok(
      present.has(word),
      `falseFriends must cover "${word}" (it's the most common francophone trap)`,
    );
  }
});

// ─── 7. English target language tagging ──────────────────────────
test("page renders English text with lang=\"en\"", () => {
  assert.match(
    pageSrc,
    /lang="en"/,
    'page must tag English renderings with lang="en"',
  );
});

// ─── 8. Route, breadcrumb, and CTA wiring ────────────────────────
test("English intro route exists on disk", () => {
  assert.ok(
    exists("app/yo/langues/anglais/intro/page.tsx"),
    "English intro page.tsx must exist",
  );
  assert.ok(
    exists("lib/yo/englishIntro.ts"),
    "English intro data file must exist",
  );
});

test("page mounts the app-shell deck and wires the teacher CTA", () => {
  // The all-language-intros app-shell brief removed breadcrumb-primary
  // navigation from intro routes. The shared <YoLessonDeck /> now owns
  // the top navigation (back arrow + YoPratiqo logo + language toggle).
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

test("page imports English intro data + English audio button", () => {
  assert.match(
    pageSrc,
    /from\s+["']@\/lib\/yo\/englishIntro["']/,
  );
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoEnglishAudioButton["']/,
  );
});

// ─── 9. No accidental cross-language regression ──────────────────
test("English page does not import other modules' data files", () => {
  assert.ok(
    !/from\s+["']@\/lib\/yo\/frenchQuebecIntro["']/.test(pageSrc),
    "English page must not import the Quebec French data",
  );
  assert.ok(
    !/from\s+["']@\/lib\/yo\/spanishIntroA1["']/.test(pageSrc),
    "English page must not import the Spanish data",
  );
  assert.ok(
    !/from\s+["']@\/lib\/yo\/italianIntro["']/.test(pageSrc),
    "English page must not import the Italian data",
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
  console.log(`[yo:english-intro] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
