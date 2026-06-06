/**
 * YoPratiqo Dominican Republic Module 2 quiz/audio UX regression tests.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicHotelAirport } from "@/lib/yo/dominicanRepublicHotelAirport";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const COMPONENT_FILE = "components/yo/DominicanRepublicModule2Content.tsx";

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
  assert.ok(src.includes("data-yo-module2-phrase-audio-card"));
  assert.ok(src.includes("<YoSpeechButton text={phrase.target}"));
  assert.ok(src.includes("<YoSpeechButton text={line.target}"));
  assert.ok(src.includes("data-yo-module2-hotel-problem-audio"));
  assert.ok(src.includes("<YoSpeechButton text={card.front}"));
});

test("audio implementation stays browser-only and never reads translations", () => {
  const src = read(COMPONENT_FILE);
  const speechCalls = src.match(/<YoSpeechButton text=\{[^}]+\}/g) ?? [];
  assert.ok(speechCalls.length >= 6);
  for (const call of speechCalls) {
    assert.ok(!call.includes("translation"));
    assert.ok(!call.includes("gloss"));
    assert.ok(!call.includes("explanation"));
  }
  assert.ok(!src.includes("<audio"));
  assert.ok(!src.includes(".mp3"));
  assert.ok(!src.includes("OpenAI"));
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
