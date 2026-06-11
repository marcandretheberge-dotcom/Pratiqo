/**
 * YoPratiqo Dominican Republic Module 3 quiz / audio UX regression tests.
 *
 * Browser-speech audio contract
 * -----------------------------
 * Module 3 ships **two** flavours of inline audio, both rooted in the
 * browser SpeechSynthesis API. No MP3 is ever loaded, no OpenAI script
 * is ever invoked at request time, and no audio file is bundled.
 *
 *   1. Direct `<YoSpeechButton text={...} />` mounts inside the module
 *      file itself, used wherever the parent is a Server Component
 *      that renders a single phrase / card / dialogue line / ear card
 *      / quiz answer. Module 3 currently has six such mounts (food
 *      `order phrase`, culture `card.phrase`, phrase-bank
 *      `phrase.target`, dialogue `line.target`, ears
 *      `card.practicePhrase`, quiz reveal `correct.target`).
 *
 *   2. Indirect mounts via `<YoFlashcardPreview audioMode="browser-speech">`,
 *      which is required for the flashcard carousel because it is a
 *      Client Component (it owns the carousel state). React Server
 *      Components forbid passing function props across an RSC
 *      boundary, so the carousel takes a serializable `audioMode`
 *      discriminator and instantiates `<YoSpeechButton />` itself
 *      when the value is `"browser-speech"`. This pattern is
 *      defended end-to-end by `tests/yo/yopratiqoDominicanModulesLoading.test.ts`
 *      and is shared by Modules 2 / 3 / 4 / 5.
 *
 * The combined audio surface MUST therefore include both kinds of
 * mounts AND must never read translation / explanation / cultural-note
 * fields in a speech-button call (those would either leak the answer
 * before the learner reveals it or pre-translate the Spanish target —
 * both forbidden).
 *
 * Static tests only. No browser, network, audio generation, Stripe,
 * or Supabase.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicFoodCulture } from "@/lib/yo/dominicanRepublicFoodCulture";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

/**
 * Strip JS/TS block comments + line comments + JSX `{/* ... *​/}` blocks
 * so substring scans like "no OpenAI / no .mp3 / no <audio>" measure
 * real code instead of tripping on docstrings that document the
 * absence of those dependencies. Imports / identifiers / JSX still
 * survive.
 */
function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments + JSDoc
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "") // JSX `{/* ... */}` blocks
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1"); // line comments (skip URLs)
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const CONTENT_FILE = "components/yo/DominicanRepublicModule3Content.tsx";
const INTERACTIVE_FILE = "components/yo/DominicanRepublicModule3Interactive.tsx";
const FLASHCARD_PREVIEW_FILE = "components/yo/YoFlashcardPreview.tsx";

function sliceBetween(src: string, startToken: string, endToken: string): string {
  const start = src.indexOf(startToken);
  const end = src.indexOf(endToken, start + startToken.length);
  assert.notEqual(start, -1, `Missing start token: ${startToken}`);
  assert.notEqual(end, -1, `Missing end token: ${endToken}`);
  return src.slice(start, end);
}

test("Module 3 keeps at least 12 quiz questions", () => {
  assert.ok(dominicanRepublicFoodCulture.quizQuestions.length >= 12);
});

test("main quiz choices render Spanish only before reveal", () => {
  const src = read(CONTENT_FILE);
  const choiceArea = sliceBetween(
    src,
    "data-yo-module3-quiz-options-no-pretranslation",
    "data-yo-module3-quiz-reveal-translations",
  );

  assert.ok(choiceArea.includes("data-yo-module3-quiz-choice-label"));
  assert.ok(choiceArea.includes("{option.target}"));
  assert.ok(!choiceArea.includes("option.translation"));
  assert.ok(!choiceArea.includes("q.explanation"));
});

test("main quiz reveal shows answer translation and explanation after reveal", () => {
  const src = read(CONTENT_FILE);
  const revealArea = src.slice(src.indexOf("data-yo-module3-quiz-reveal-translations"));

  assert.ok(revealArea.includes("{correct.target}"));
  assert.ok(revealArea.includes("t(correct.translation, locale)"));
  assert.ok(revealArea.includes("t(q.explanation, locale)"));
  assert.ok(revealArea.includes("<YoSpeechButton text={correct.target}"));
});

test("final game choices render Spanish only before selection feedback", () => {
  const src = read(INTERACTIVE_FILE);
  const choiceArea = sliceBetween(
    src,
    "currentRound.options.map",
    "selected && correctOption",
  );

  assert.ok(choiceArea.includes("data-yo-module3-game-choice-label"));
  assert.ok(choiceArea.includes("{option.target}"));
  assert.ok(!choiceArea.includes("option.translation"));
  assert.ok(!choiceArea.includes("currentRound.feedback"));
});

test("final game feedback shows useful answer translation after selection", () => {
  const src = read(INTERACTIVE_FILE);
  const feedbackArea = src.slice(src.indexOf("data-yo-module3-game-feedback"));

  assert.ok(feedbackArea.includes("{correctOption.target}"));
  assert.ok(feedbackArea.includes("t(correctOption.translation, locale)"));
  assert.ok(feedbackArea.includes("t(currentRound.feedback, locale)"));
  assert.ok(feedbackArea.includes("<YoSpeechButton text={correctOption.target}"));
});

test("audio buttons exist for Module 3 phrase, food, dialogue, ears, and flashcard surfaces", () => {
  const src = read(CONTENT_FILE);

  // Direct module-file mounts (Server Component parents).
  assert.ok(src.includes("<YoSpeechButton text={food.orderPhrase}"));
  assert.ok(src.includes("<YoSpeechButton text={card.phrase}"));
  assert.ok(src.includes("<YoSpeechButton text={phrase.target}"));
  assert.ok(src.includes("<YoSpeechButton text={line.target}"));
  assert.ok(src.includes("<YoSpeechButton text={card.practicePhrase}"));

  // Flashcard audio is wired via the serializable
  // `audioMode="browser-speech"` discriminator on
  // `<YoFlashcardPreview />`. We assert the discriminator at the
  // module-file mount point AND that the carousel itself
  // instantiates `<YoSpeechButton text={card.front}>` when the
  // value is `"browser-speech"` (see YoFlashcardPreview line
  // ~517–524).
  assert.ok(
    src.includes('audioMode="browser-speech"'),
    'Module 3 must wire flashcard audio via audioMode="browser-speech"',
  );

  const flashcardPreviewSrc = read(FLASHCARD_PREVIEW_FILE);
  assert.match(
    flashcardPreviewSrc,
    /audioMode\s*===\s*["']browser-speech["']/,
    'YoFlashcardPreview must branch on audioMode === "browser-speech"',
  );
  assert.match(
    flashcardPreviewSrc,
    /<YoSpeechButton[\s\S]{0,80}text=\{card\.front\}/,
    "YoFlashcardPreview must mount <YoSpeechButton text={card.front} /> in browser-speech mode",
  );
});

test("all quiz and final-game options still carry translations in data for reveal states", () => {
  for (const question of dominicanRepublicFoodCulture.quizQuestions) {
    assert.ok(question.type.fr && question.type.en && question.type.es);
    assert.ok(question.options.every((option) => option.target && option.translation.fr));
    assert.ok(question.explanation.fr && question.explanation.en && question.explanation.es);
  }

  for (const round of dominicanRepublicFoodCulture.finalGame.rounds) {
    assert.ok(round.options.every((option) => option.target && option.translation.fr));
    assert.ok(round.feedback.fr && round.feedback.en && round.feedback.es);
  }
});

test("audio implementation stays browser-only and never reads translations", () => {
  const moduleSrc = read(CONTENT_FILE);
  const interactiveSrc = read(INTERACTIVE_FILE);
  const flashcardPreviewSrc = read(FLASHCARD_PREVIEW_FILE);

  // The module file currently mounts six direct
  // `<YoSpeechButton text={...} />` calls (food.orderPhrase,
  // card.phrase, phrase.target, line.target, card.practicePhrase,
  // correct.target). The interactive file adds one more for the
  // culture-challenge `correctOption.target`. The remaining audio
  // surface — the flashcard carousel — lives in
  // `YoFlashcardPreview.tsx` via the `audioMode="browser-speech"`
  // pattern. We validate all three files together so the count
  // stays meaningful as the codebase keeps refactoring carousel
  // internals.
  const moduleSpeechCalls = moduleSrc.match(/<YoSpeechButton text=\{[^}]+\}/g) ?? [];
  const interactiveSpeechCalls =
    interactiveSrc.match(/<YoSpeechButton text=\{[^}]+\}/g) ?? [];
  const flashcardSpeechCalls =
    flashcardPreviewSrc.match(/<YoSpeechButton[\s\S]{0,200}text=\{[^}]+\}/g) ?? [];
  const totalSpeechCalls =
    moduleSpeechCalls.length +
    interactiveSpeechCalls.length +
    flashcardSpeechCalls.length;

  assert.ok(
    moduleSpeechCalls.length >= 6,
    `Module 3 module file must mount at least 6 direct <YoSpeechButton /> calls (got ${moduleSpeechCalls.length})`,
  );
  assert.ok(
    interactiveSpeechCalls.length >= 1,
    `Module 3 interactive file must mount at least 1 <YoSpeechButton /> (culture-challenge feedback) (got ${interactiveSpeechCalls.length})`,
  );
  assert.ok(
    flashcardSpeechCalls.length >= 1,
    `YoFlashcardPreview must mount at least one <YoSpeechButton /> for browser-speech mode (got ${flashcardSpeechCalls.length})`,
  );
  assert.ok(
    totalSpeechCalls >= 8,
    `combined Module 3 audio surface must have at least 8 <YoSpeechButton /> mounts (got ${totalSpeechCalls})`,
  );

  // No speech call may read translation / explanation / cultural-
  // note fields — those would either leak the answer before reveal
  // or pre-translate the Spanish target.
  for (const call of [
    ...moduleSpeechCalls,
    ...interactiveSpeechCalls,
    ...flashcardSpeechCalls,
  ]) {
    assert.ok(!call.includes("translation"), `forbidden field in speech call: ${call}`);
    assert.ok(!call.includes("explanation"), `forbidden field in speech call: ${call}`);
    assert.ok(!call.includes("culturalNote"), `forbidden field in speech call: ${call}`);
  }

  // All three files must remain MP3-free, raw-`<audio>`-free, and
  // never reference the OpenAI SDK at request time. We scan
  // comment-stripped source so docstrings that document the
  // absence of those dependencies (e.g. "no OpenAI dependency")
  // do not produce false positives. The audio generation script
  // remains server-only and is not imported here — see the
  // launch-critical FR Quebec lesson 2 audio suite for the
  // corresponding production guard.
  for (const [label, src] of [
    [CONTENT_FILE, moduleSrc],
    [INTERACTIVE_FILE, interactiveSrc],
    [FLASHCARD_PREVIEW_FILE, flashcardPreviewSrc],
  ] as const) {
    const code = stripJsComments(src);
    assert.ok(!code.includes("<audio"), `${label} must not mount a raw <audio> element`);
    assert.ok(!code.includes("YoAudioPlayer"), `${label} must not mount YoAudioPlayer`);
    assert.ok(!code.includes("storagePath"), `${label} must not reference storagePath metadata`);
    assert.ok(!code.includes("audioUrl"), `${label} must not reference audioUrl metadata`);
    assert.ok(!code.includes(".mp3"), `${label} must not reference any .mp3 path`);
    assert.doesNotMatch(
      code,
      /\bopenai\b|OPENAI_API_KEY|new\s+OpenAI\b/i,
      `${label} must not import from openai / read OPENAI_API_KEY / instantiate the SDK`,
    );
  }
});

test("lesson deck still surfaces every audio affordance", () => {
  // The Module 3 lesson deck (PR #160) reuses the same Server
  // Component section sub-components — `HeroSection`,
  // `PassportSection`, `FoodCardsSection`, `CultureCardsSection`,
  // `PhraseBankSection`, `DialoguesSection`, `EarsAndGrammarSection`,
  // `FlashcardsSection`, `QuizSection`,
  // `DominicanRepublicCultureChallenge`, `PrintablesSection`,
  // `DominicanModulePrintables`, `ClosingBridge` — when
  // `mode="deck"` is set on `<DominicanRepublicModule3Content />`.
  // This test defends the deck composition against accidental
  // removal of any audio-bearing screen.
  const src = read(CONTENT_FILE);

  assert.match(
    src,
    /function buildModule3DeckScreens\b/,
    "deck composer `buildModule3DeckScreens` must exist",
  );

  // Each audio-bearing screen must be mounted by the deck composer.
  const auditedDeckScreensWithAudio: Array<[string, RegExp]> = [
    [
      "food (11 food cards · YoSpeechButton per order phrase)",
      /<FoodCardsSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "culture (15 culture cards · YoSpeechButton per card phrase)",
      /<CultureCardsSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "phrases (35 phrases · YoSpeechButton per row)",
      /<PhraseBankSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "dialogues (3 scenes · line-by-line YoSpeechButton)",
      /<DialoguesSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "ears-grammar (5 ear cards · per-card YoSpeechButton)",
      /<EarsAndGrammarSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      'flashcards (carousel via audioMode="browser-speech")',
      /<FlashcardsSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "quiz (12 questions · reveal YoSpeechButton)",
      /<QuizSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "mini-mission (culture challenge · feedback YoSpeechButton)",
      /<DominicanRepublicCultureChallenge\b/,
    ],
  ];

  for (const [label, re] of auditedDeckScreensWithAudio) {
    assert.match(src, re, `lesson deck must still mount ${label}`);
  }

  // The completion screen mounts the audited save-progress
  // button — the deck must not have replaced it with a fake save.
  assert.match(
    src,
    /<YoMarkModuleCompletedButton\b/,
    "lesson deck must still mount <YoMarkModuleCompletedButton />",
  );
  assert.match(
    src,
    /payload=\{dominicanRdModuleProgressPayload\(["']module-3["']/,
    "the completion button must still use the audited dominicanRdModuleProgressPayload helper",
  );
});

test("Module 3 quiz UX never exposes raw quiz answer payloads", () => {
  // Defends the same invariant `safeDisclosures.test.ts` and the
  // Module 3 lesson-deck test enforce — applied directly to the
  // module + interactive files so a future regression that adds
  // e.g. an `answerLog` array to track wrong picks gets caught
  // here too. The culture-challenge interactive client component
  // does keep an in-memory `answers` record of picks-per-round,
  // but it never persists it, never sends it to the server, and
  // never serializes it — so we whitelist that single identifier
  // by name.
  const moduleSrc = read(CONTENT_FILE);
  const interactiveSrc = read(INTERACTIVE_FILE);

  // Full strict pattern — applied to the Server Component module
  // file (no UI state, so even local-variable names like
  // `selectedOption` would be evidence of payload leakage).
  const RAW_QUIZ_PATTERN_STRICT =
    /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
  // Relaxed pattern for the interactive Client Component — any
  // quiz UI legitimately needs a local "which option did the
  // user just click" variable to render feedback / "your
  // choice" labels. `selectedOption` / `pickedOption` are
  // therefore allowed as **local** variable names, BUT the
  // truly forbidden persistence / logging / payload patterns
  // (`rawQuiz`, `quizAnswers`, `answerLog`, `incorrectAnswers`,
  // `keystrokeHistory`, `audioAttempts`) still apply.
  const RAW_QUIZ_PATTERN_PERSISTENCE_ONLY =
    /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;

  assert.doesNotMatch(
    moduleSrc,
    RAW_QUIZ_PATTERN_STRICT,
    "Module 3 content must not introduce raw-quiz field names (answers must stay learner-private)",
  );
  assert.doesNotMatch(
    interactiveSrc,
    RAW_QUIZ_PATTERN_PERSISTENCE_ONLY,
    "Module 3 interactive must not introduce raw-quiz persistence / logging field names beyond its in-memory `answers` state",
  );

  // The quiz options area must keep using the gated-reveal
  // pattern — no client-side state that records which option
  // the learner picked on the main quiz.
  assert.match(
    moduleSrc,
    /data-yo-module3-quiz-options-no-pretranslation/,
    "quiz options area must keep its audited no-pretranslation marker",
  );
  assert.match(
    moduleSrc,
    /data-yo-module3-quiz-reveal-translations/,
    "quiz reveal area must keep its audited reveal-translations marker",
  );
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoPratiqo Dominican Module 3 quiz UX\n`);

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  fail  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed - ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
