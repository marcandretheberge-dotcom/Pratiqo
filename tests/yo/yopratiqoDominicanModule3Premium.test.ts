/**
 * YoPratiqo Dominican Republic Module 3 premium UI/source tests.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicFoodCulture } from "@/lib/yo/dominicanRepublicFoodCulture";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function changedFiles(): string[] {
  const commands = [
    "git diff --name-only main...HEAD",
    "git diff --name-only",
    "git diff --name-only --cached",
  ];
  return Array.from(
    new Set(
      commands
        .flatMap((command) =>
          execSync(command, { cwd: REPO_ROOT, encoding: "utf8" })
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
        )
        .sort(),
    ),
  );
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const COMPONENT_FILE = "components/yo/DominicanRepublicModule3Content.tsx";
const INTERACTIVE_FILE = "components/yo/DominicanRepublicModule3Interactive.tsx";
const PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx";
const DATA_FILE = "lib/yo/dominicanRepublicFoodCulture.ts";

test("premium visual concepts are present in source", () => {
  const src = read(COMPONENT_FILE);
  for (const token of [
    "data-yo-module3-premium-hero",
    "Culture passport visual",
    "data-yo-module3-passport-visual",
    "data-yo-module3-culture-passport",
    "data-yo-module3-menu-card",
    "data-yo-module3-culture-stamp-card",
    "data-yo-module3-quiz-shell",
    "data-yo-module3-quiz-options-no-pretranslation",
    "data-yo-module3-quiz-reveal-translations",
    "data-yo-module3-printable-worksheet",
    "data-yo-module3-food-cards-count",
    "data-yo-module3-culture-cards-count",
    "data-yo-module3-phrase-count",
    "data-yo-module3-ears-section",
    "data-yo-module3-grammar-count",
    "data-yo-module3-flashcard-count",
    "data-yo-module3-quiz-count",
    "data-yo-module3-printable-count",
  ]) {
    assert.ok(src.includes(token), `Missing premium source token: ${token}`);
  }
  assert.ok(!src.includes("bg-gradient-to-br from-[#0F6E56] via-[#0d604d] to-[#082f2a]"));
});

test("quiz answer choices do not reveal translations before answer reveal", () => {
  const src = read(COMPONENT_FILE);
  const choiceStart = src.indexOf("data-yo-module3-quiz-options-no-pretranslation");
  const revealStart = src.indexOf("data-yo-module3-quiz-reveal-translations");
  assert.notEqual(choiceStart, -1);
  assert.notEqual(revealStart, -1);
  const choiceBlock = src.slice(choiceStart, revealStart);

  assert.ok(choiceBlock.includes("{option.target}"));
  assert.ok(!choiceBlock.includes("option.translation"));
  assert.ok(src.slice(revealStart).includes("t(correct.translation, locale)"));
  assert.ok(src.slice(revealStart).includes("t(q.explanation, locale)"));
});

test("final game choices stay untranslated until feedback is shown", () => {
  const interactive = read(INTERACTIVE_FILE);
  const choiceStart = interactive.indexOf("currentRound.options.map");
  const feedbackStart = interactive.indexOf("data-yo-module3-game-feedback");
  assert.notEqual(choiceStart, -1);
  assert.notEqual(feedbackStart, -1);
  const choiceBlock = interactive.slice(choiceStart, feedbackStart);

  assert.ok(choiceBlock.includes("data-yo-module3-game-choice-label"));
  assert.ok(choiceBlock.includes("{option.target}"));
  assert.ok(!choiceBlock.includes("option.translation"));
  assert.ok(interactive.slice(feedbackStart).includes("t(correctOption.translation, locale)"));
  assert.ok(interactive.slice(feedbackStart).includes("t(currentRound.feedback, locale)"));
});

test("browser speech audio is wired without MP3 or fake playback", () => {
  const src = read(COMPONENT_FILE);
  const interactive = read(INTERACTIVE_FILE);
  assert.ok(src.includes('data-yo-audio-state="browser-speech"'));
  assert.ok(src.includes("data-yo-browser-audio-note"));
  assert.ok(src.includes("YoSpeechButton"));
  assert.ok(interactive.includes("YoSpeechButton"));
  assert.ok(!src.includes("<audio"));
  assert.ok(!interactive.includes("<audio"));
  assert.ok(!src.includes("YoAudioPlayer"));
  assert.ok(!interactive.includes("YoAudioPlayer"));
  assert.ok(!src.includes(".mp3"));
  assert.ok(!interactive.includes(".mp3"));
});

test("print button exists and uses window.print in isolated client helper", () => {
  const component = read(COMPONENT_FILE);
  const interactive = read(INTERACTIVE_FILE);
  assert.ok(component.includes("DominicanRepublicModule3PrintButton"));
  assert.ok(interactive.startsWith('"use client";'));
  assert.ok(interactive.includes("window.print()"));
  assert.equal(dominicanRepublicFoodCulture.printButtonLabel.fr, "Imprimer les fiches");
  assert.equal(dominicanRepublicFoodCulture.printButtonLabel.en, "Print practice sheets");
  assert.equal(dominicanRepublicFoodCulture.printButtonLabel.es, "Imprimir hojas de práctica");
});

test("final culture challenge uses 8 rounds with progress and score", () => {
  const interactive = read(INTERACTIVE_FILE);
  assert.ok(interactive.includes("DominicanRepublicCultureChallenge"));
  assert.ok(interactive.includes("Score"));
  assert.ok(interactive.includes("roundIndex"));
  assert.ok(interactive.includes("setAnswers"));
  assert.equal(dominicanRepublicFoodCulture.finalGame.rounds.length, 8);
  assert.equal(dominicanRepublicFoodCulture.finalGame.title.fr, "Défi culture dominicaine");
  assert.equal(dominicanRepublicFoodCulture.finalGame.title.en, "Dominican culture challenge");
  assert.equal(dominicanRepublicFoodCulture.finalGame.title.es, "Reto de cultura dominicana");
});

test("printable sheets include all four requested practice assets", () => {
  const titles = dominicanRepublicFoodCulture.printableSheets.map((sheet) => sheet.title.en);
  for (const title of [
    "Menu survival sheet",
    "Dominican food vocabulary sheet",
    "Restaurant roleplay sheet",
    "Culture passport checklist",
  ]) {
    assert.ok(titles.includes(title), `Missing printable sheet: ${title}`);
  }
});

test("route metadata remains noindex and canonical is the Module 3 route", () => {
  const src = read(PAGE_FILE);
  assert.match(src, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.ok(src.includes("/yo/langues/espagnol/pays/republique-dominicaine/module-3"));
  assert.ok(!src.includes("pratiqo.com"));
});

test("ES UI strings are complete for major module labels", () => {
  const data = dominicanRepublicFoodCulture;
  assert.ok(data.productLabel.es);
  assert.ok(data.audioComingSoonLabel.es);
  assert.ok(data.printButtonLabel.es);
  assert.ok(data.missionStops.every((stop) => stop.title.es && stop.description.es));
  assert.ok(data.foodCards.every((card) => card.explanation.es && card.culturalNote.es));
  assert.ok(data.cultureCards.every((card) => card.category.es && card.description.es));
  assert.ok(data.quizQuestions.every((question) => question.prompt.es && question.type.es));
});

test("no PDFs, MP3s, image assets, or audio generation files were added", () => {
  const changed = changedFiles();
  for (const file of changed) {
    assert.ok(!file.endsWith(".mp3"), `MP3 file changed: ${file}`);
    assert.ok(!file.endsWith(".pdf"), `PDF file changed: ${file}`);
    assert.ok(!file.includes("scripts/generate-yopratiqo-audio"), `Audio generator touched: ${file}`);
    assert.ok(!file.includes("public/audio"), `Audio storage path touched: ${file}`);
    assert.ok(!file.includes("public/images"), `Image asset path touched: ${file}`);
  }
});

test("restricted systems are not touched by this branch", () => {
  const changed = changedFiles();
  const forbiddenPrefixes = [
    "app/api/",
    "supabase/",
    "content/legal/",
    "app/(app)/legal/",
    "app/(app)/booking/",
    "app/(app)/upgrade/",
    "lib/payments/",
    "lib/config/membrePro",
    "lib/commissions/",
    "lib/seo/",
    "scripts/",
    "public/audio/",
  ];
  for (const file of changed) {
    for (const prefix of forbiddenPrefixes) {
      assert.ok(!file.startsWith(prefix), `Restricted file touched: ${file}`);
    }
  }
});

test("module source keeps visible Spanish phrases as text, not generated audio metadata", () => {
  const dataSrc = read(DATA_FILE);
  assert.ok(!dataSrc.includes("storagePath"));
  assert.ok(!dataSrc.includes("audioUrl"));
  assert.ok(!dataSrc.includes("spokenText"));
  assert.ok(!dataSrc.includes("pronunciationHint"));
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoPratiqo Dominican Module 3 premium UI\n`);

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed · ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
