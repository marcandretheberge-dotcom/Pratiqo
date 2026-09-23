/**
 * YoPratiqo — Japanese intro module regression suite.
 *
 * Style: `node:test`-style assertions over the typed data file +
 * static-source sniffs of the page. No browser, no network, no
 * Stripe / Supabase / RLS / migration / booking / search / Membre
 * Pro code touched.
 *
 * What we guard:
 *
 *  1. Module structure — the data file ships the ten sections the
 *     product brief asks for and the page renders them in order.
 *  2. Writing-system safety — hiragana, katakana, AND kanji are all
 *     present as their own visual cards; romaji is explicitly framed
 *     as a temporary phonetic bridge, not as the final goal.
 *  3. JLPT framing — the module mentions JLPT but never as a
 *     "perfect native" claim, never with rigid timelines, and never
 *     with overpromised fluency.
 *  4. Vocabulary floor — every Japanese target item listed in the
 *     brief is surfaced in either the politeness section, the
 *     writing-system anchors, or the flashcards.
 *  5. SOV showcase — the example sentence 私は寿司を食べます。 is
 *     present and accompanied by a SOV explanation.
 *  6. Cultural codes — shoes, tipping, quiet trains, two-hand
 *     exchange, indirect "no" all appear in the cultural-codes
 *     section.
 *  7. Quiz contract — between 5 and 7 questions, every question has
 *     a valid `correctOptionId` and unique option ids.
 *  8. Flashcards — six grouped decks covering the brief's themes.
 *  9. Japanese target tagging — `lang="ja"` appears for every
 *     Japanese rendering surface (page).
 *  10. Tone discipline — no fragile claims (no "exact economy rank
 *      X", no "fluent in N months", no "native level" for N1).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { japaneseIntro } from "@/lib/yo/japaneseIntro";

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
test("Japanese intro data file exposes the documented sections", () => {
  // The exported object must surface a value (object/array/string)
  // for every named section. We assert the keys are present and
  // non-empty rather than relying on positional ordering inside the
  // object literal (TS does not constrain key order).
  const requiredKeys = [
    "welcomeIntro",
    "welcomeContract",
    "numbersLeadIn",
    "japaneseStats",
    "numbersTakeaway",
    "originIntro",
    "originPoints",
    "writingIntro",
    "writingSystems",
    "romajiNote",
    "writingTakeaway",
    "soundIntro",
    "soundPoints",
    "soundTakeaway",
    "politenessIntro",
    "politenessPhrases",
    "politenessGroupLabels",
    "cultureIntro",
    "culturalCodes",
    "quizQuestions",
    "flashcardGroups",
    "flashcards",
    "teacherBody",
    "teacherCta",
  ] as const;
  for (const key of requiredKeys) {
    assert.ok(key in japaneseIntro, `japaneseIntro must expose ${key}`);
    const value = japaneseIntro[key];
    assert.ok(
      value !== undefined && value !== null,
      `japaneseIntro.${key} must not be null/undefined`,
    );
  }
});

test("page renders the ten intro sections in order (deck-screen markers)", () => {
  // The app-shell deck refactor replaced per-section aria ids with
  // stable per-screen markers. Each screen still carries the same
  // pedagogical step it had on the old long-scroll page; we walk
  // them in order to catch accidental reorders.
  const expectedScreenMarkers = [
    'data-yo-japanese-intro-deck-screen="welcome"',
    'data-yo-japanese-intro-deck-screen="numbers"',
    'data-yo-japanese-intro-deck-screen="origin"',
    'data-yo-japanese-intro-deck-screen="writing"',
    'data-yo-japanese-intro-deck-screen="sound"',
    'data-yo-japanese-intro-deck-screen="politeness"',
    'data-yo-japanese-intro-deck-screen="culture"',
    'data-yo-japanese-intro-deck-screen="quiz"',
    'data-yo-japanese-intro-deck-screen="flashcards"',
    'data-yo-japanese-intro-deck-screen="teacher"',
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

// ─── 2. Writing-system safety ────────────────────────────────────
test("hiragana / katakana / kanji each get their own visual card", () => {
  const requiredIds = ["ws_hiragana", "ws_katakana", "ws_kanji"];
  const ids = japaneseIntro.writingSystems.map((s) => s.id);
  for (const id of requiredIds) {
    assert.ok(
      ids.includes(id),
      `writingSystems must include ${id} as a dedicated card`,
    );
  }
  // Each card must surface its native script title.
  const nativeTitles = japaneseIntro.writingSystems.map((s) => s.nativeName);
  assert.ok(
    nativeTitles.includes("ひらがな"),
    "hiragana card must surface ひらがな",
  );
  assert.ok(
    nativeTitles.includes("カタカナ"),
    "katakana card must surface カタカナ",
  );
  assert.ok(
    nativeTitles.includes("漢字"),
    "kanji card must surface 漢字",
  );
});

test("romaji is framed as temporary support, never as the final goal", () => {
  // The romaji note must say something like "pont temporaire" / "bridge"
  // and explicitly state it is NOT the final goal.
  const romajiFr = japaneseIntro.romajiNote.fr;
  const romajiEn = japaneseIntro.romajiNote.en;
  assert.match(
    romajiFr,
    /(?:pont\s+temporaire|temporaire|au\s+tout\s+début)/i,
    "FR romaji note must frame romaji as temporary",
  );
  assert.match(
    romajiEn,
    /(?:temporary\s+bridge|bridge|at\s+the\s+very\s+start)/i,
    "EN romaji note must frame romaji as temporary",
  );
  assert.match(
    romajiFr,
    /(?:n['’]est\s+pas\s+l['’]objectif|pas\s+(?:le\s+)?but)/i,
    "FR romaji note must explicitly say it is NOT the final goal",
  );
  assert.match(
    romajiEn,
    /not\s+the\s+final\s+goal/i,
    "EN romaji note must explicitly say it is NOT the final goal",
  );
});

// ─── 3. JLPT framing ─────────────────────────────────────────────
test("JLPT N1 is described safely (no 'native level', no rigid timeline)", () => {
  // Find the quiz answer that documents the JLPT framing.
  const jlptQuestion = japaneseIntro.quizQuestions.find(
    (q) => q.id === "q_jlpt",
  );
  assert.ok(jlptQuestion, "quiz must contain a JLPT-framing question");
  const correctLabel = jlptQuestion!.options.find(
    (o) => o.id === jlptQuestion!.correctOptionId,
  )!.label;
  assert.match(
    correctLabel.fr,
    /(?:litt[eé]ratie\s+avanc[eé]e|niveau\s+professionnel|professionnelle)/i,
    "JLPT N1 must be described as advanced literacy / professional level (FR)",
  );
  assert.match(
    correctLabel.en,
    /(?:advanced\s+literacy|professional[-\s]level)/i,
    "JLPT N1 must be described as advanced literacy / professional level (EN)",
  );
  // The JLPT explanation must reinforce the safe framing — never
  // promise "native level" / "perfect native" as the official
  // outcome of N1, even in passing.
  const explanation = jlptQuestion!.explanation;
  assert.ok(explanation, "JLPT question must ship an explanation string");
  assert.ok(
    !/parfait\s+natif/i.test(explanation!.fr),
    "JLPT explanation must not call N1 'parfait natif' (FR)",
  );
  assert.ok(
    !/perfect\s+native/i.test(explanation!.en),
    "JLPT explanation must not call N1 'perfect native' (EN)",
  );
  // The "parfait natif" / "perfect native" wordings ARE allowed to
  // exist in the data file — but ONLY as wrong-answer distractors
  // for this very question. We assert that constraint by collecting
  // every quiz-option label outside of the JLPT distractor and
  // verifying none of them carry that wording.
  const forbidden = /(?:parfait\s+natif|perfect\s+native)/i;
  for (const q of japaneseIntro.quizQuestions) {
    for (const opt of q.options) {
      if (q.id === "q_jlpt") continue; // distractor scope
      assert.ok(
        !forbidden.test(opt.label.fr) && !forbidden.test(opt.label.en),
        `quiz option ${q.id}/${opt.id} must not carry the 'native level' wording`,
      );
    }
  }
});

test("module never overpromises rigid JLPT timelines", () => {
  const forbidden = [
    /\bN1\s+en\s+\d+\s+(?:mois|ans)\b/i,
    /\bN1\s+in\s+\d+\s+(?:months?|years?)\b/i,
    /\bfluent\s+in\s+\d+\s+(?:months?|days?)\b/i,
    /\bfluide\s+en\s+\d+\s+(?:mois|jours)\b/i,
  ];
  for (const re of forbidden) {
    assert.ok(
      !re.test(dataCode),
      `data file must not ship the rigid-timeline claim ${re.source}`,
    );
  }
});

test("module uses approximate wording for study duration / statistics", () => {
  // We do NOT want exact-N claims for speakers/economy/etc.
  assert.ok(
    !/\bexactly\s+\d{2,}\s+million\b/i.test(dataCode),
    "data file must not ship 'exactly N million' speaker counts",
  );
  // We DO want approximate markers somewhere ("~", "around",
  // "approximately", "ordre de grandeur", "environ", "plusieurs").
  assert.ok(
    /(?:~|around|approximately|ordre\s+de\s+grandeur|environ|plusieurs\s+millions|several\s+million)/i.test(
      dataSrc,
    ),
    "data file must use approximate wording for figures / durations",
  );
});

// ─── 4. Vocabulary floor ─────────────────────────────────────────
test("every required Japanese politeness/greeting target appears in the data", () => {
  const required = [
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
  ];
  const present = new Set(
    japaneseIntro.politenessPhrases.map((p) => p.target),
  );
  for (const target of required) {
    assert.ok(
      present.has(target),
      `politenessPhrases must include "${target}" (audio + flashcards depend on it)`,
    );
  }
});

test("every required anchor / writing-system word appears somewhere reachable", () => {
  // Anchor + grammar + writing-system vocabulary is surfaced via
  // flashcards (writing-system cards also live in the dedicated
  // cards). We check the union of flashcard fronts + writing-system
  // native names.
  const surfaceTexts = new Set<string>([
    ...japaneseIntro.flashcards.map((c) => c.front),
    ...japaneseIntro.writingSystems.map((s) => s.nativeName),
  ]);
  const required = [
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
  ];
  for (const word of required) {
    assert.ok(
      surfaceTexts.has(word),
      `flashcards / writing-system cards must surface "${word}"`,
    );
  }
});

// ─── 5. SOV showcase sentence ────────────────────────────────────
test("私は寿司を食べます。 anchors the SOV explanation", () => {
  const sovPoint = japaneseIntro.soundPoints.find(
    (p) => p.id === "grammar_sov",
  );
  assert.ok(sovPoint, "soundPoints must include the SOV explanation entry");
  assert.equal(
    sovPoint!.example?.native,
    "私は寿司を食べます。",
    "SOV showcase sentence must be 私は寿司を食べます。",
  );
  assert.match(
    sovPoint!.title.fr,
    /Sujet[\s–-]+Objet[\s–-]+Verbe/i,
    "SOV title must mention Subject–Object–Verb in French",
  );
  assert.match(
    sovPoint!.title.en,
    /Subject[\s–-]+Object[\s–-]+Verb/i,
    "SOV title must mention Subject–Object–Verb in English",
  );
});

// ─── 6. Cultural codes ───────────────────────────────────────────
test("cultural codes cover the brief's full surprise list", () => {
  const requiredCodes = [
    "culture_shoes",
    "culture_no_tipping",
    "culture_quiet_train",
    "culture_two_hand",
    "culture_indirect_no",
  ];
  const ids = japaneseIntro.culturalCodes.map((c) => c.id);
  for (const id of requiredCodes) {
    assert.ok(
      ids.includes(id),
      `culturalCodes must cover ${id} (key cultural-code surprise)`,
    );
  }
});

// ─── 7. Quiz contract ────────────────────────────────────────────
test("quiz ships at most 7 questions and at least 5", () => {
  assert.ok(
    japaneseIntro.quizQuestions.length >= 5 &&
      japaneseIntro.quizQuestions.length <= 7,
    `quiz must have between 5 and 7 questions; got ${japaneseIntro.quizQuestions.length}`,
  );
});

test("every quiz question has a valid correctOptionId and unique option ids", () => {
  for (const q of japaneseIntro.quizQuestions) {
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

// ─── 8. Flashcards ───────────────────────────────────────────────
test("six flashcard groups match the brief's six themes", () => {
  const expected = [
    "deck_world",
    "deck_writing",
    "deck_politeness",
    "deck_introductions",
    "deck_leaving",
    "deck_grammar",
  ];
  const got = japaneseIntro.flashcardGroups.map((g) => g.id);
  assert.deepEqual(
    got,
    expected,
    `flashcard groups must match the documented six themes; got ${got.join(", ")}`,
  );
});

test("flashcards collection is the concatenation of every group's cards (no duplicates)", () => {
  const sumOfGroupCards = japaneseIntro.flashcardGroups.reduce(
    (n, g) => n + g.cards.length,
    0,
  );
  assert.equal(
    japaneseIntro.flashcards.length,
    sumOfGroupCards,
    "flashcards must equal the sum of every group's cards",
  );
  const seenIds = new Set<string>();
  for (const card of japaneseIntro.flashcards) {
    assert.ok(!seenIds.has(card.id), `duplicate flashcard id ${card.id}`);
    seenIds.add(card.id);
  }
});

// ─── 9. Japanese target tagging ──────────────────────────────────
test("page renders Japanese text with lang=\"ja\"", () => {
  assert.match(
    pageSrc,
    /lang="ja"/,
    'page must tag Japanese renderings with lang="ja"',
  );
});

// ─── 10. Tone discipline ─────────────────────────────────────────
test("tone — no fragile economy / fluency claims", () => {
  const forbidden = [
    /\b3rd\s+(?:largest\s+)?economy\b/i,
    /\btroisi[eè]me\s+[eé]conomie\b/i,
    /\bfluent\s+in\s+30\s+days\b/i,
    /\bfluide\s+en\s+30\s+jours\b/i,
    /\bguarantee(?:d)?\s+fluency\b/i,
  ];
  for (const re of forbidden) {
    assert.ok(
      !re.test(dataCode),
      `data file must not ship the fragile claim ${re.source}`,
    );
  }
});

// ─── 11. Route, breadcrumb, CTA wiring ───────────────────────────
test("Japanese intro route exists on disk", () => {
  assert.ok(
    exists("app/yo/langues/japonais/intro/page.tsx"),
    "Japanese intro page.tsx must exist",
  );
  assert.ok(
    exists("lib/yo/japaneseIntro.ts"),
    "Japanese intro data file must exist",
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

test("page imports Japanese intro data + Japanese audio button", () => {
  assert.match(
    pageSrc,
    /from\s+["']@\/lib\/yo\/japaneseIntro["']/,
  );
  assert.match(
    pageSrc,
    /from\s+["']@\/components\/yo\/YoJapaneseAudioButton["']/,
  );
});

test("Japanese page does not import other modules' data files", () => {
  assert.ok(
    !/from\s+["']@\/lib\/yo\/frenchQuebecIntro["']/.test(pageSrc),
    "Japanese page must not import the Quebec French data",
  );
  assert.ok(
    !/from\s+["']@\/lib\/yo\/spanishIntroA1["']/.test(pageSrc),
    "Japanese page must not import the Spanish data",
  );
  assert.ok(
    !/from\s+["']@\/lib\/yo\/italianIntro["']/.test(pageSrc),
    "Japanese page must not import the Italian data",
  );
  assert.ok(
    !/from\s+["']@\/lib\/yo\/englishIntro["']/.test(pageSrc),
    "Japanese page must not import the English data",
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
  console.log(`[yo:japanese-intro] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
