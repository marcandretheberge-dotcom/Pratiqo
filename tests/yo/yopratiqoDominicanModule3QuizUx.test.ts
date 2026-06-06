/**
 * YoPratiqo Dominican Republic Module 3 quiz UX regression tests.
 *
 * Static tests only. The goal is to ensure assessment choices do not reveal
 * translations before the learner has committed or opened feedback.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicFoodCulture } from "@/lib/yo/dominicanRepublicFoodCulture";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const CONTENT_FILE = "components/yo/DominicanRepublicModule3Content.tsx";
const INTERACTIVE_FILE = "components/yo/DominicanRepublicModule3Interactive.tsx";

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
  assert.ok(src.includes("<YoSpeechButton text={food.orderPhrase}"));
  assert.ok(src.includes("<YoSpeechButton text={card.phrase}"));
  assert.ok(src.includes("<YoSpeechButton text={phrase.target}"));
  assert.ok(src.includes("<YoSpeechButton text={line.target}"));
  assert.ok(src.includes("<YoSpeechButton text={card.practicePhrase}"));
  assert.ok(src.includes("<YoSpeechButton text={card.front}"));
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

test("no fake audio or generated MP3 metadata was introduced", () => {
  const content = read(CONTENT_FILE);
  const interactive = read(INTERACTIVE_FILE);
  const combined = `${content}\n${interactive}`;

  assert.ok(!combined.includes("<audio"));
  assert.ok(!combined.includes("YoAudioPlayer"));
  assert.ok(!combined.includes("storagePath"));
  assert.ok(!combined.includes("audioUrl"));
  assert.ok(!combined.includes("openai"));
  assert.ok(!combined.includes(".mp3"));
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
