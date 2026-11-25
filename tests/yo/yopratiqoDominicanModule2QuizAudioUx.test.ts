/**
 * YoPratiqo Dominican Republic Module 2 quiz/audio UX regression tests.
 *
 * Module 2 audio contract
 * -----------------------
 * Individual phrases, hotel problems, quiz reveals and mini-mission
 * steps keep browser speech. The flashcard carousel receives the
 * serializable audioMode="browser-speech" discriminator and creates
 * its own YoSpeechButton client-side.
 *
 * Airport and hotel conversations now mount YoArrivalListeningLesson,
 * which plays reviewed local recordings from its line manifest when
 * audioReady is enabled. Pending scenes remain readable without a
 * media request; they do not substitute browser speech. Interactive
 * cancellation, reveal and pending-state behavior is covered by the
 * rendered yopratiqoArrivalListeningLesson.test.ts suite.
 *
 * Neither surface generates recordings at request time or imports an
 * audio-generation SDK/secret. Spoken content must use Spanish targets,
 * never translations, glosses or explanations.
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
 * so substring scans for SDK imports and media references measure real
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
const ARRIVAL_LESSON_FILE = "components/yo/YoArrivalListeningLesson.tsx";
const ARRIVAL_DATA_FILE = "lib/yo/dominicanArrivalListening.ts";

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

test("phrase and flashcard speech remains alongside the recorded arrival lessons", () => {
  const src = read(COMPONENT_FILE);

  // Phrase and hotel-problem speech remains in the parent module.
  assert.ok(src.includes("data-yo-module2-phrase-audio-card"));
  assert.ok(src.includes("<YoSpeechButton text={phrase.target}"));
  assert.ok(src.includes("data-yo-module2-hotel-problem-audio"));

  const dialogueArea = sliceBetween(src, "function DialogueSection", "function GrammarSection");
  assert.match(dialogueArea, /<YoArrivalListeningLesson\s+sceneId=\{sectionId\}\s+locale=\{locale\}\s*\/>/);
  assert.ok(!dialogueArea.includes("<YoSpeechButton"), "arrival recordings must not silently fall back to browser speech");

  // Flashcard audio is wired via the serializable
  // `audioMode="browser-speech"` discriminator on
  // `<YoFlashcardPreview />`. We assert the discriminator at the
  // module-file mount point AND that the carousel itself
  // instantiates `<YoSpeechButton />` for that mode (see
  // YoFlashcardPreview's browser-speech branch).
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

test("browser speech uses Spanish targets and arrival playback uses manifest recordings", () => {
  const moduleSrc = read(COMPONENT_FILE);
  const flashcardPreviewSrc = read(FLASHCARD_PREVIEW_FILE);
  const arrivalSrc = stripJsComments(read(ARRIVAL_LESSON_FILE));

  // The module file keeps four direct speech mounts (phrase,
  // hotel-problem phrase, quiz-reveal answer, mini-mission step).
  // The flashcard carousel's speech mount lives in
  // YoFlashcardPreview.tsx via the audioMode="browser-speech"
  // pattern. We validate both files together so the count
  // stays meaningful as the codebase keeps refactoring carousel
  // internals.
  const moduleSpeechCalls = moduleSrc.match(/<YoSpeechButton text=\{[^}]+\}/g) ?? [];
  const flashcardSpeechCalls =
    flashcardPreviewSrc.match(/<YoSpeechButton[\s\S]{0,200}text=\{[^}]+\}/g) ?? [];
  const totalSpeechCalls = moduleSpeechCalls.length + flashcardSpeechCalls.length;

  assert.ok(
    moduleSpeechCalls.length >= 4,
    `Module 2 must retain its 4 direct <YoSpeechButton /> surfaces (got ${moduleSpeechCalls.length})`,
  );
  assert.ok(
    flashcardSpeechCalls.length >= 1,
    `YoFlashcardPreview must mount at least one <YoSpeechButton /> for browser-speech mode (got ${flashcardSpeechCalls.length})`,
  );
  assert.ok(
    totalSpeechCalls >= 5,
    `combined phrase and flashcard speech surface must have at least 5 mounts (got ${totalSpeechCalls})`,
  );

  // No speech call may read translation / gloss / explanation —
  // those would either leak the answer before reveal or
  // pre-translate the Spanish target.
  for (const call of [...moduleSpeechCalls, ...flashcardSpeechCalls]) {
    assert.ok(!call.includes("translation"), `forbidden field in speech call: ${call}`);
    assert.ok(!call.includes("gloss"), `forbidden field in speech call: ${call}`);
    assert.ok(!call.includes("explanation"), `forbidden field in speech call: ${call}`);
  }

  // The shared parent/carousel still delegate their media controls.
  for (const [label, src] of [
    [COMPONENT_FILE, moduleSrc],
    [FLASHCARD_PREVIEW_FILE, flashcardPreviewSrc],
  ] as const) {
    const code = stripJsComments(src);
    assert.ok(!code.includes("<audio"), `${label} must not mount a raw <audio> element`);
    assert.ok(!code.includes(".mp3"), `${label} must not reference any .mp3 path`);
  }

  assert.match(arrivalSrc, /audio\.src\s*=\s*spokenLine\.audioSrc\s*;/);
  assert.match(arrivalSrc, /if\s*\(!scene\.audioReady\)\s*return\s*;/);
  assert.ok(arrivalSrc.indexOf("if (!scene.audioReady) return;") < arrivalSrc.indexOf("new window.Audio()"), "pending scenes must return before creating a media element");
  assert.doesNotMatch(arrivalSrc, /YoSpeechButton|speechSynthesis|SpeechSynthesisUtterance/, "arrival lessons must use their recorded-media path without a speech fallback");

  for (const file of [COMPONENT_FILE, FLASHCARD_PREVIEW_FILE, ARRIVAL_LESSON_FILE, ARRIVAL_DATA_FILE]) {
    assert.doesNotMatch(
      stripJsComments(read(file)),
      /\b(?:openai|heygen|elevenlabs|picovoice)\b|(?:OPENAI|HEYGEN|ELEVENLABS|PICOVOICE)_(?:API_KEY|ACCESS_KEY)|process\.env|generate-yopratiqo-audio/i,
      `${file} must not import an audio-generation SDK, access its secrets, or invoke a generation script`,
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
      "airport dialogue (recorded arrival lesson)",
      /<DialogueSection[\s\S]*?eyebrowLabel=\{LABEL_DIALOGUE_AIRPORT_EYEBROW\}/,
    ],
    [
      "hotel dialogue (recorded arrival lesson)",
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
