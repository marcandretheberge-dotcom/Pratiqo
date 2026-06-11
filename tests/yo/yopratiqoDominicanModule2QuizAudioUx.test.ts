/**
 * YoPratiqo Dominican Republic Module 2 quiz/audio UX regression tests.
 *
 * Browser-speech audio contract
 * -----------------------------
 * Module 2 ships **two** flavours of inline audio, both rooted in the
 * browser SpeechSynthesis API. No MP3 is ever loaded, no OpenAI script
 * is ever invoked at request time, and no audio file is bundled.
 *
 *   1. Direct `<YoSpeechButton text={...} />` mounts inside the
 *      module file itself, used wherever the parent is a Server
 *      Component that renders a single phrase / dialogue line /
 *      problem card / quiz answer / mini-mission step.
 *
 *   2. Indirect mounts via `<YoFlashcardPreview audioMode="browser-speech">`,
 *      which is required for the flashcard carousel because it is a
 *      Client Component (it owns the carousel state). React Server
 *      Components forbid passing function props across an RSC
 *      boundary, so the carousel takes a serializable
 *      `audioMode` discriminator and instantiates `<YoSpeechButton />`
 *      itself when the value is `"browser-speech"`. This pattern is
 *      defended end-to-end by `tests/yo/yopratiqoDominicanModulesLoading.test.ts`
 *      and is shared by Modules 3 / 4 / 5.
 *
 * The combined audio surface MUST therefore include both kinds of
 * mounts AND must never read translation / gloss / explanation fields
 * (those would either leak the answer before the learner reveals it or
 * pre-translate the Spanish target — both forbidden).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicHotelAirport } from "@/lib/yo/dominicanRepublicHotelAirport";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

/**
 * Strip JS/TS block comments + line comments + JSX `{/* ... *\/}` blocks
 * so substring scans like "no OpenAI / no .mp3 / no <audio>" measure real
 * code instead of tripping on docstrings that document the absence of
 * those dependencies. Imports / identifiers / JSX still survive.
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

const COMPONENT_FILE = "components/yo/DominicanRepublicModule2Content.tsx";
const FLASHCARD_PREVIEW_FILE = "components/yo/YoFlashcardPreview.tsx";

function sliceBetween(src: string, startToken: string, endToken: string): string {
  const start = src.indexOf(startToken);
  const end = src.indexOf(endToken, start + startToken.length);
  assert.notEqual(start, -1, `Missing start token: ${startToken}`);
  assert.notEqual(end, -1, `Missing end token: ${endToken}`);
  return src.slice(start, end);
}

test("Module 2 keeps the documented practice question count", () => {
  assert.equal(dominicanRepublicHotelAirport.practiceQuestions.length, 5);
});

test("practice quiz choices render Spanish only before reveal", () => {
  const src = read(COMPONENT_FILE);
  const choiceArea = sliceBetween(
    src,
    "data-yo-module2-quiz-options-no-pretranslation",
    "data-yo-module2-quiz-reveal-translations",
  );

  assert.ok(choiceArea.includes("data-yo-module2-quiz-choice-label"));
  assert.ok(choiceArea.includes("{opt.target}"));
  assert.ok(!choiceArea.includes("opt.glossFr"));
  assert.ok(!choiceArea.includes("opt.glossEn"));
  assert.ok(!choiceArea.includes("explanationFr"));
  assert.ok(!choiceArea.includes("explanationEn"));
});

test("practice quiz reveal shows answer translation, explanation, and audio", () => {
  const src = read(COMPONENT_FILE);
  const revealArea = src.slice(src.indexOf("data-yo-module2-quiz-reveal-translations"));

  assert.ok(revealArea.includes("{correct.target}"));
  assert.ok(revealArea.includes("correct.glossFr"));
  assert.ok(revealArea.includes("correct.glossEn"));
  assert.ok(revealArea.includes("q.explanationFr"));
  assert.ok(revealArea.includes("q.explanationEn"));
  assert.ok(revealArea.includes("<YoSpeechButton text={correct.target}"));
});

test("final mini-mission reveals Spanish phrase audio only after opening details", () => {
  const src = read(COMPONENT_FILE);
  const missionArea = src.slice(src.indexOf("function MiniMissionSection"));

  assert.ok(missionArea.includes("data-yo-module2-final-reveal-audio"));
  assert.ok(missionArea.includes("<YoSpeechButton text={step.targetPhrase}"));
  assert.ok(missionArea.includes("{step.targetPhrase}"));
});

test("audio buttons exist for phrases, dialogues, hotel problems, and flashcards", () => {
  const src = read(COMPONENT_FILE);

  // Phrase / dialogue / hotel-problem audio mounts that live in
  // the module file directly (Server Component parents).
  assert.ok(src.includes("data-yo-module2-phrase-audio-card"));
  assert.ok(src.includes("<YoSpeechButton text={phrase.target}"));
  assert.ok(src.includes("<YoSpeechButton text={line.target}"));
  assert.ok(src.includes("data-yo-module2-hotel-problem-audio"));

  // Flashcard audio is wired via the serializable
  // `audioMode="browser-speech"` discriminator on
  // `<YoFlashcardPreview />`. We assert the discriminator at the
  // module-file mount point AND that the carousel itself
  // instantiates `<YoSpeechButton />` for that mode (see
  // YoFlashcardPreview line ~517–524).
  assert.ok(
    src.includes('audioMode="browser-speech"'),
    "Module 2 must wire flashcard audio via audioMode=\"browser-speech\"",
  );

  const flashcardPreviewSrc = read(FLASHCARD_PREVIEW_FILE);
  assert.match(
    flashcardPreviewSrc,
    /audioMode\s*===\s*["']browser-speech["']/,
    "YoFlashcardPreview must branch on audioMode === \"browser-speech\"",
  );
  assert.match(
    flashcardPreviewSrc,
    /<YoSpeechButton[\s\S]{0,80}text=\{card\.front\}/,
    "YoFlashcardPreview must mount <YoSpeechButton text={card.front} /> in browser-speech mode",
  );
});

test("audio implementation stays browser-only and never reads translations", () => {
  const moduleSrc = read(COMPONENT_FILE);
  const flashcardPreviewSrc = read(FLASHCARD_PREVIEW_FILE);

  // The module file currently mounts five direct
  // `<YoSpeechButton text={...} />` calls (phrase, dialogue line,
  // hotel-problem phrase, quiz-reveal answer, mini-mission step).
  // The sixth audio surface — the flashcard carousel — lives in
  // YoFlashcardPreview.tsx via the audioMode="browser-speech"
  // pattern. We validate both files together so the count
  // stays meaningful as the codebase keeps refactoring carousel
  // internals.
  const moduleSpeechCalls = moduleSrc.match(/<YoSpeechButton text=\{[^}]+\}/g) ?? [];
  const flashcardSpeechCalls =
    flashcardPreviewSrc.match(/<YoSpeechButton[\s\S]{0,200}text=\{[^}]+\}/g) ?? [];
  const totalSpeechCalls = moduleSpeechCalls.length + flashcardSpeechCalls.length;

  assert.ok(
    moduleSpeechCalls.length >= 5,
    `Module 2 must mount at least 5 direct <YoSpeechButton /> calls (got ${moduleSpeechCalls.length})`,
  );
  assert.ok(
    flashcardSpeechCalls.length >= 1,
    `YoFlashcardPreview must mount at least one <YoSpeechButton /> for browser-speech mode (got ${flashcardSpeechCalls.length})`,
  );
  assert.ok(
    totalSpeechCalls >= 6,
    `combined Module 2 audio surface must have at least 6 <YoSpeechButton /> mounts (got ${totalSpeechCalls})`,
  );

  // No speech call may read translation / gloss / explanation —
  // those would either leak the answer before reveal or
  // pre-translate the Spanish target.
  for (const call of [...moduleSpeechCalls, ...flashcardSpeechCalls]) {
    assert.ok(!call.includes("translation"), `forbidden field in speech call: ${call}`);
    assert.ok(!call.includes("gloss"), `forbidden field in speech call: ${call}`);
    assert.ok(!call.includes("explanation"), `forbidden field in speech call: ${call}`);
  }

  // Both files must remain MP3-free, raw-`<audio>`-free, and
  // never reference the OpenAI SDK at request time. We scan
  // comment-stripped source so docstrings that document the
  // absence of those dependencies (e.g. "no OpenAI dependency")
  // do not produce false positives. The audio generation script
  // remains server-only and is not imported here — see the
  // launch-critical FR Quebec lesson 2 audio suite for the
  // corresponding production guard.
  for (const [label, src] of [
    [COMPONENT_FILE, moduleSrc],
    [FLASHCARD_PREVIEW_FILE, flashcardPreviewSrc],
  ] as const) {
    const code = stripJsComments(src);
    assert.ok(!code.includes("<audio"), `${label} must not mount a raw <audio> element`);
    assert.ok(!code.includes(".mp3"), `${label} must not reference any .mp3 path`);
    assert.doesNotMatch(
      code,
      /\bopenai\b|OPENAI_API_KEY|new\s+OpenAI\b/i,
      `${label} must not import from openai / read OPENAI_API_KEY / instantiate the SDK`,
    );
  }
});

test("lesson deck still surfaces every audio affordance", () => {
  // The lesson deck (PR #157) reuses the same Server Component
  // section sub-components — `CorePhrasesSection`,
  // `DialogueSection`, `HotelProblemCardsSection`,
  // `PracticeSection`, `MiniMissionSection`, `FlashcardsSection`
  // — when `mode="deck"` is set on `<DominicanRepublicModule2Content />`.
  // This test defends the deck composition against accidental
  // removal of any audio screen.
  const src = read(COMPONENT_FILE);

  assert.match(
    src,
    /function buildModule2DeckScreens\b/,
    "deck composer `buildModule2DeckScreens` must exist",
  );

  // Each audio-bearing screen must be mounted by the deck composer.
  const auditedDeckScreensWithAudio: Array<[string, RegExp]> = [
    [
      "phrases (15 survival phrases · YoSpeechButton per row)",
      /<CorePhrasesSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "airport dialogue (line-by-line YoSpeechButton)",
      /<DialogueSection[\s\S]*?eyebrowLabel=\{LABEL_DIALOGUE_AIRPORT_EYEBROW\}/,
    ],
    [
      "hotel dialogue (line-by-line YoSpeechButton)",
      /<DialogueSection[\s\S]*?eyebrowLabel=\{LABEL_DIALOGUE_HOTEL_EYEBROW\}/,
    ],
    [
      "hotel problems (per-card YoSpeechButton)",
      /<HotelProblemCardsSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "flashcards (carousel via audioMode=\"browser-speech\")",
      /<FlashcardsSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "practice (quiz reveal YoSpeechButton)",
      /<PracticeSection\s+locale=\{locale\}\s*\/>/,
    ],
    [
      "mini-mission (per-step reveal YoSpeechButton)",
      /<MiniMissionSection\s+locale=\{locale\}\s*\/>/,
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
    /payload=\{dominicanRdModuleProgressPayload\(["']module-2["']/,
    "the completion button must still use the audited dominicanRdModuleProgressPayload helper",
  );
});

test("Module 2 quiz UX never exposes raw quiz answer payloads", () => {
  // Defends the same invariant `safeDisclosures.test.ts` and
  // the lesson-deck test enforce — applied directly to the
  // module file so a future regression that adds e.g. an
  // `answerLog` array to track wrong picks gets caught here too.
  const src = read(COMPONENT_FILE);

  const RAW_QUIZ_PATTERN =
    /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;

  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    "Module 2 must not introduce raw-quiz field names (answers must stay learner-private)",
  );

  // The quiz options area must keep using the `<details>` /
  // `<summary>` reveal pattern — no client-side state that
  // would record which option the learner picked.
  assert.match(
    src,
    /data-yo-module2-quiz-options-no-pretranslation/,
    "quiz options area must keep its audited no-pretranslation marker",
  );
  assert.match(
    src,
    /data-yo-module2-quiz-reveal-translations/,
    "quiz reveal area must keep its audited reveal-translations marker",
  );
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoPratiqo Dominican Module 2 quiz/audio UX\n`);

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
