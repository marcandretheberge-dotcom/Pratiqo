import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { getMandarinUnit, mandarinUnits, mandarinLegacyUnits, mandarinFinal, mandarinExtendedFinal } from "@/lib/yo/mandarin/course";
import { checkAnswer, emptyProgress, evaluate, initialAttempt, parseProgress, visibleMandarinHelp } from "@/lib/yo/mandarin/progress";
import { isMandarinAssessment, mandarinRouteId, MANDARIN_DEPTH_SOURCES } from "@/lib/yo/mandarin/depthAuthoring";
import { canEnterFoundationStep, mandarinJourney } from "@/lib/yo/foundationJourney";
import { mandarinJourneyUnits, mandarinFinalIds, mandarinLegacyFinalIds, mandarinCourseReviewIds } from "@/lib/yo/foundationJourneyCatalogs";
import type { Exercise, Phrase } from "@/lib/yo/mandarin/types";
import images from "@/lib/yo/mandarin/imageAssets.json";
import recordings from "@/lib/yo/mandarin/audioPaths.json";

const depth = mandarinUnits.slice(8);
const activities = [...depth.flatMap(unit => unit.exercises), ...mandarinExtendedFinal.exercises];
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const phrase = (value: Phrase) => {
  assert.match(value.hanzi, /[\u3400-\u9fff]/);
  assert.ok(value.pinyin.trim());
  for (const locale of ["fr", "en", "es"] as const) assert.ok(value.meaning[locale].trim());
};
function answer(exercise: Exercise) {
  if (exercise.kind === "write") return exercise.model.hanzi;
  if (exercise.kind === "match") return Object.fromEntries(exercise.pairs.map((_, index) => [index, String(index)]));
  return exercise.answer;
}

test("the eight legacy units and original final preserve their exact data, IDs and old results", () => {
  assert.equal(hash(mandarinLegacyUnits), "44416f25c15fd9050724fb02d59d05078403d4328aef99aa4b4ec900533c5bc9");
  assert.equal(hash(mandarinUnits.slice(0, 8)), hash(mandarinLegacyUnits));
  assert.equal(hash(mandarinFinal), "e4198e15db4aa9af1f71d696d9c5e9bf9adf6227c63fcbca7a5637843691aff1");
  const before = emptyProgress();
  before.unit = "bilan"; before.steps.bilan = 4;
  for (const exercise of mandarinFinal.exercises) before.results[exercise.id] = { passed: true, independent: true, attempts: 2, review: false };
  assert.deepEqual(parseProgress(JSON.stringify(before)), before);
  assert.equal(mandarinFinalIds.some(id => before.results[id]), false);
});

test("four substantial units add scenarios, reading, sound guidance, original vocabulary and checked recall", () => {
  assert.equal(mandarinUnits.length, 12);
  assert.deepEqual(depth.map(unit => unit.id), ["u09", "u10", "u11", "u12"]);
  assert.equal(new Set(depth.flatMap(unit => unit.vocabulary.map(item => item.hanzi))).size, 40);
  for (const unit of depth) {
    assert.equal(unit.vocabulary.length, 10); unit.vocabulary.forEach(phrase);
    assert.equal(unit.dialogue.length, 6); unit.dialogue.forEach(phrase);
    assert.equal(unit.grammar.length, 3); unit.grammar.forEach(item => phrase(item.example));
    assert.ok(unit.reading); phrase(unit.reading);
    assert.ok(unit.reading.hanzi.length > 50, "the reading presents an actual connected situation");
    assert.equal(unit.exercises.length, 14);
    assert.equal(unit.exercises.filter(item => item.kind === "write").length, 5);
    assert.equal(unit.exercises.filter(item => item.kind === "roleplay").length, 3);
    assert.equal(unit.exercises.filter(item => item.stimulus).length, 2);
    for (const locale of ["fr", "en", "es"] as const) {
      assert.ok(unit.pronunciation[locale].length > 80);
      assert.ok(unit.setting[locale].length > 40);
      assert.ok(unit.goals.every(goal => goal[locale].length > 10));
      assert.ok(unit.grammar.every(item => item.text[locale].length > 90));
    }
    assert.deepEqual(JSON.parse(JSON.stringify(unit)), unit, "server props contain only serializable authored values");
  }
});

test("new checks have consistent models, plausible distinct choices and no audio-only progression requirement", () => {
  const ids = [...mandarinUnits.flatMap(unit => unit.exercises), ...mandarinFinal.exercises, ...mandarinExtendedFinal.exercises].map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const exercise of activities) {
    phrase(exercise.model);
    assert.ok(checkAnswer(exercise, answer(exercise)), `${exercise.id}: correct response actually passes`);
    assert.equal(checkAnswer(exercise, "unrelated answer"), false);
    for (const locale of ["fr", "en", "es"] as const) {
      assert.ok(exercise.prompt[locale].trim());
      assert.ok(exercise.explanation[locale].length > 20);
    }
    assert.notEqual(exercise.kind, "listen"); assert.notEqual(exercise.kind, "tone");
    assert.equal("audio" in exercise, false, "new written checks do not claim unproduced listening evidence");
    if (exercise.kind === "write") {
      assert.equal("choices" in exercise, false);
      assert.equal(exercise.prompt.en.includes(exercise.model.hanzi), false, `${exercise.id} does not print the full target answer`);
      for (const accepted of exercise.accepted) assert.ok(checkAnswer(exercise, accepted), `${exercise.id}: authored variant accepted`);
    }
    if (exercise.kind === "build") {
      const bare = (text: string) => text.replace(/[\s，,。.!?！？]/g, "");
      assert.equal(bare(exercise.answer.join("")), bare(exercise.model.hanzi));
      assert.deepEqual([...exercise.tokens].sort(), [...exercise.answer].sort());
    }
    if ("choices" in exercise) {
      assert.equal(exercise.choices.length, 3);
      assert.equal(exercise.choices.filter(item => item.id === exercise.answer).length, 1);
      assert.equal(new Set(exercise.choices.map(item => item.phrase?.hanzi ?? item.label?.en)).size, 3);
      for (const choice of exercise.choices) if (choice.id !== exercise.answer) assert.equal(checkAnswer(exercise, choice.id), false);
    }
  }
});

test("the new cumulative final has one original reading and one written transfer per unit", () => {
  assert.equal(mandarinExtendedFinal.id, "bilan-fondations");
  assert.equal(mandarinExtendedFinal.exercises.length, 24);
  assert.equal(mandarinFinal.exercises.length, 8);
  const lessonWriteModels = new Set(mandarinUnits.flatMap(unit => unit.exercises.filter(item => item.kind === "write").map(item => item.model.hanzi)));
  for (let number = 1; number <= 12; number++) {
    const prefix = `zh-foundations-final-u${String(number).padStart(2, "0")}`;
    const reading = mandarinExtendedFinal.exercises.find(item => item.id === `${prefix}-read`);
    const recall = mandarinExtendedFinal.exercises.find(item => item.id === `${prefix}-write`);
    assert.ok(reading?.stimulus); phrase(reading.stimulus);
    assert.equal(recall?.kind, "write");
    assert.ok(recall && !lessonWriteModels.has(recall.model.hanzi), `${prefix}: final transfer is not a repeated lesson answer`);
  }
  assert.equal(new Set(mandarinExtendedFinal.exercises.filter(item => item.stimulus).map(item => item.stimulus!.hanzi)).size, 12);
});

test("new recall tolerates optional commas but preserves negation, quantities and tone distinctions", () => {
  const final = (suffix: string) => mandarinExtendedFinal.exercises.find(item => item.id === `zh-foundations-final-${suffix}`)!;
  assert.equal(checkAnswer(final("u01-write"), "你好我叫小文"), true);
  assert.equal(checkAnswer(final("u08-write"), "我们先吃饭再去公园"), true);
  assert.equal(checkAnswer(final("u12-write"), "如果明天不下雨我们就去公园"), true);
  assert.equal(checkAnswer(final("u12-write"), "如果明天下雨我们就去公园"), false, "the opposite condition must fail");
  assert.equal(checkAnswer(final("u10-write"), "这本书比那本书贵。"), true);
  assert.equal(checkAnswer(final("u10-write"), "这本书比那本书便宜。"), false);
  assert.equal(checkAnswer(final("u02-write"), "我要四个苹果。"), false);
  const ime = depth[0].exercises.find(item => item.id === "zh-u09-ime")!;
  assert.ok(ime && ime.kind === "write");
  assert.equal(checkAnswer(ime, ime.model.pinyin), false, "IME practice checks the authored Chinese character result");
  const pinyin = final("u02-write").model.pinyin;
  assert.equal(checkAnswer(final("u02-write"), pinyin.normalize("NFD").replace(/\p{M}/gu, "")), false, "toneless transcription cannot silently count as the authored pinyin");
  assert.equal(checkAnswer(depth[1].exercises.find(item => item.id === "zh-u10-recall-2")!, "那本书比这本书便宜。"), true);
});

test("revealing source help affects new evidence while old independent results remain intact", () => {
  const read = depth[0].exercises.find(item => item.stimulus)!;
  const write = depth[0].exercises.find(item => item.kind === "write")!;
  assert.equal(visibleMandarinHelp(read, false, true), true);
  assert.equal(visibleMandarinHelp(read, true, false), true);
  assert.equal(visibleMandarinHelp(read, false, false), false);
  assert.equal(visibleMandarinHelp(write, true, true), false, "instruction language and hidden model are not revealing help");
  const attempt = { ...initialAttempt(read), answer: answer(read), assisted: true };
  assert.equal(evaluate(read, attempt)?.independent, false);
  assert.equal(evaluate(read, attempt, { passed: true, independent: true, attempts: 2, review: false })?.independent, true);
});

test("old and new final links, eligibility and review catalogs stay isolated", () => {
  assert.equal(getMandarinUnit("bilan-initial"), mandarinFinal);
  assert.equal(getMandarinUnit("bilan"), mandarinExtendedFinal);
  assert.equal(getMandarinUnit("bilan-fondations"), mandarinExtendedFinal);
  assert.equal(mandarinRouteId(mandarinFinal.id), "bilan-initial");
  assert.equal(mandarinRouteId(mandarinExtendedFinal.id), "bilan");
  assert.ok(isMandarinAssessment(mandarinFinal.id) && isMandarinAssessment(mandarinExtendedFinal.id));
  const progress = emptyProgress();
  for (const unit of mandarinLegacyUnits) for (const exercise of unit.exercises) progress.results[exercise.id] = { passed: true, independent: true, attempts: 1, review: false };
  assert.equal(canEnterFoundationStep(mandarinJourney(mandarinJourneyUnits.slice(0, 8), progress), "bilan", false), true);
  assert.equal(canEnterFoundationStep(mandarinJourney(mandarinJourneyUnits, progress), "bilan-fondations", false), false);
  assert.equal(mandarinFinalIds.length, 24); assert.equal(mandarinLegacyFinalIds.length, 8);
  assert.ok(!mandarinCourseReviewIds.some(id => /final|bilan/.test(id)));
  assert.ok(depth.every(unit => unit.exercises.every(item => mandarinCourseReviewIds.includes(`course:${unit.id}:practice:${item.id}`))));
  const route = readFileSync("app/yo/langues/mandarin/parcours/[unit]/page.tsx", "utf8");
  assert.match(route, /legacyFinal \? mandarinJourneyUnits\.slice\(0, 8\)/);
  assert.match(route, /legacyFinal \? mandarinLegacyFinalIds : mandarinFinalIds/);
});

test("new scenes reuse real assets and primary cultural sources; no unrecorded path is invented", () => {
  const sourceHosts = new Set(["www.ctcfl.ox.ac.uk", "ocw.mit.edu", "ich.unesco.org", "www.library.sh.cn"]);
  for (const source of Object.values(MANDARIN_DEPTH_SOURCES)) assert.ok(sourceHosts.has(new URL(source).hostname));
  for (const unit of depth) {
    assert.ok(sourceHosts.has(new URL(unit.culture.source).hostname));
    const photo = images[unit.scene as keyof typeof images];
    assert.ok(photo && existsSync(`public${photo.src}`));
    assert.ok(existsSync(`public/yo/mandarin-strokes/${unit.character.codePointAt(0)!.toString(16)}.json`));
    for (const item of [...unit.vocabulary, ...unit.dialogue, ...unit.grammar.map(x => x.example)]) {
      const path = (recordings as Record<string, string>)[item.hanzi];
      if (path) assert.ok(existsSync(`public${path}`), `${item.hanzi}: mapped audio really exists`);
    }
  }
});
