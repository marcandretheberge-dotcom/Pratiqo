import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  japaneseCourseUnits, japaneseLegacyCourseUnits, japaneseFinalAssessment,
  japaneseExtendedFinalAssessment, japaneseExtendedFinalBlueprint, japaneseCourseSources,
} from "../../lib/yo/japaneseCourse";
import {
  JAPANESE_PROGRESS_KEY, checkJapaneseAnswer, emptyJapaneseProgress,
  japanesePublicUnitSlug, japaneseUnitPracticeIds, mergeJapaneseProgress,
  normalizeJapaneseAnswer, parseJapaneseProgress, recordJapaneseResult,
  type JapaneseAnswer,
} from "../../lib/yo/japaneseCourseProgress";
import { resolveJapaneseCourseUnit } from "../../lib/yo/japaneseCourseRouting";
import type { JapaneseActivity, JapaneseLocalized, JapanesePhrase } from "../../lib/yo/japaneseCourseTypes";
import { getJapaneseKana } from "../../lib/yo/japaneseKana";
import { getJapaneseKanji } from "../../lib/yo/japaneseKanji";
import { japaneseJourney, canEnterFoundationStep } from "../../lib/yo/foundationJourney";

const extension = japaneseCourseUnits.slice(8);
const practices = extension.flatMap(unit => unit.activities);
const assessment = [...practices, ...japaneseExtendedFinalAssessment];
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clean = (value: string) => value.normalize("NFKC").replace(/[\s。、，．！？!?]/gu, "");
const locales = ["fr", "en", "es"] as const;
function localized(value: JapaneseLocalized) {
  for (const locale of locales) {
    assert.ok(value[locale].trim());
    assert.doesNotMatch(value[locale], /\b(?:TODO|TBD)\b|[Ll]orem ipsum|coming soon|\p{Cf}/u);
  }
}
function phrase(value: JapanesePhrase) {
  assert.match(value.ja, /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
  assert.ok(value.kana && value.romaji);
  assert.doesNotMatch(value.kana, /\p{Script=Han}/u);
  localized(value.meaning);
}
function answerFor(activity: JapaneseActivity): JapaneseAnswer {
  if (activity.kind === "reading") return activity.answer;
  if (activity.kind === "build") return activity.answerOrder;
  if (activity.kind === "match") return Object.fromEntries(activity.pairs.map(pair => [pair.id, pair.id]));
  return activity.answerId;
}

test("the extension preserves all eight original units and the original eight-question final byte for byte", () => {
  assert.equal(hash(japaneseLegacyCourseUnits), "2fbd99596e283203d2c290f2b79861ede15a69b8d80c5c029e1d280ef11a26b1");
  assert.equal(hash(japaneseFinalAssessment), "92ae5c597f4e48ba4e345648585bb9332963b7d48651856a584f8809d667c4a1");
  assert.deepEqual(japaneseCourseUnits.slice(0, 8), japaneseLegacyCourseUnits);
  assert.equal(JAPANESE_PROGRESS_KEY, "yopratiqo:japanese-foundations:v1");
  assert.equal(japaneseCourseUnits.length, 12);
  assert.equal(japaneseFinalAssessment.length, 8);
  assert.equal(japaneseExtendedFinalAssessment.length, 24);
});

test("four original modules add meaningful practice, three-point language support and separate free writing", () => {
  extension.forEach((unit, index) => {
    assert.equal(unit.number, index + 9);
    assert.equal(unit.slug, `module-${index + 9}`);
    assert.equal(unit.id, `jp-foundation-${String(index + 9).padStart(2, "0")}`);
    [unit.title, unit.subtitle, unit.setting, ...unit.goals, ...unit.canDos, unit.roleplay.title,
      unit.roleplay.context, unit.culture.title, unit.culture.note, unit.culture.reflection,
      unit.writing.prompt, ...unit.writing.checklist].forEach(localized);
    assert.equal(unit.vocabulary.length, 8);
    assert.ok(unit.dialogue.length >= 6);
    assert.equal(unit.grammar.length, 3);
    assert.equal(unit.activities.length, 8);
    assert.equal(unit.roleplay.turns.length, 3);
    assert.equal(japaneseUnitPracticeIds(unit).length, 11);
    assert.equal(unit.activities.filter(item => item.kind === "reading" && item.responseMode === "recall").length, 2);
    assert.equal(unit.activities.filter(item => item.kind === "build").length, 2);
    assert.equal(unit.activities.filter(item => item.kind === "listening").length, 0, "no mandatory listening without verified recordings");
    [...unit.vocabulary, ...unit.dialogue, ...unit.grammar.map(point => point.example), unit.writing.model].forEach(phrase);
    unit.dialogue.forEach(line => localized(line.speaker));
    unit.grammar.forEach(point => { localized(point.title); localized(point.explanation); });
    unit.kana.forEach(character => assert.ok(getJapaneseKana(character), `${unit.id}: known kana ${character}`));
    unit.kanji.forEach(character => assert.ok(getJapaneseKanji(character), `${unit.id}: use an actual licensed stroke card`));
  });
  assert.equal(new Set(extension.map(unit => unit.title.en)).size, 4);
});

test("all authored checks accept their actual model, reject wrong choices and give contextual distinct feedback", () => {
  const ids = new Set<string>();
  for (const item of [...japaneseCourseUnits.flatMap(unit => unit.activities), ...japaneseFinalAssessment, ...japaneseExtendedFinalAssessment]) {
    assert.equal(ids.has(item.id), false, item.id); ids.add(item.id);
  }
  for (const activity of assessment) {
    [activity.title, activity.prompt, activity.hint, activity.explanation].forEach(localized);
    assert.equal(checkJapaneseAnswer(activity, answerFor(activity)), true, activity.id);
    assert.equal(checkJapaneseAnswer(activity, ""), false, activity.id);
    if ("choices" in activity) {
      assert.equal(activity.choices.length, 3);
      for (const locale of locales) {
        assert.equal(new Set(activity.choices.map(option => clean(option.ja ?? option.label![locale]))).size, 3, activity.id);
        assert.equal(new Set(activity.choices.map(option => option.feedback[locale])).size, 3, activity.id);
      }
      activity.choices.forEach(option => {
        localized(option.feedback); if (option.label) localized(option.label);
        if (option.ja) { assert.ok(option.kana && option.romaji); assert.doesNotMatch(option.kana, /\p{Script=Han}/u); }
        if (option.id !== activity.answerId) assert.equal(checkJapaneseAnswer(activity, option.id), false, option.id);
      });
      if (activity.stimulus) phrase(activity.stimulus);
    }
    if (activity.kind === "build") {
      assert.equal(new Set(activity.tokens.map(token => token.text)).size, activity.tokens.length, activity.id);
      assert.notDeepEqual(activity.tokens.map(token => token.id), activity.answerOrder, activity.id);
      assert.equal(activity.answerOrder.map(id => activity.tokens.find(token => token.id === id)!.text).join(""), activity.phrase.ja);
      assert.equal(checkJapaneseAnswer(activity, [...activity.answerOrder].reverse()), false, activity.id);
    }
  }
  for (const unit of extension) for (const turn of unit.roleplay.turns) {
    phrase(turn.line); localized(turn.goal); localized(turn.hint); localized(turn.speaker);
    assert.equal(turn.choices.filter(choice => choice.id === turn.answerId).length, 1);
    for (const locale of locales) assert.equal(new Set(turn.choices.map(choice => choice.feedback[locale])).size, 3);
  }
});

test("written recall exposes no answer in the stimulus or interface prompt and preserves Japanese contrasts", () => {
  for (const item of assessment) {
    if (item.kind !== "reading" || item.responseMode !== "recall") continue;
    assert.equal(item.stimulus, "", item.id);
    assert.equal(item.acceptsRomaji, false);
    assert.equal(new Set(item.accepted).size, item.accepted.length);
    for (const accepted of item.accepted) assert.equal(checkJapaneseAnswer(item, accepted), true, `${item.id}: ${accepted}`);
    for (const locale of locales) assert.equal(clean(item.prompt[locale]).includes(clean(item.answer)), false, `${item.id}: ${locale} answer leak`);
    assert.equal(checkJapaneseAnswer(item, clean(item.answer)), true, `${item.id}: optional punctuation`);
    assert.equal(checkJapaneseAnswer(item, "。！？"), false, item.id);
  }
  const examples = [
    ["jp-9-recall-negative", "高いです。"],
    ["jp-9-recall-quantity", "一つください。"],
    ["jp-10-recall-enter", "はいてもいいですか。"],
    ["jp-11-recall-bus", "バスに行きます。"],
    ["jp-12-recall-wait", "出口で待ってください。"],
    ["jp-depth-final-14", "ゆくりお願いします。"],
    ["jp-depth-final-16", "きのう、駅に行きました。"],
    ["jp-depth-final-24", "友だちに会って、駅に行きます。"],
  ];
  for (const [id, wrong] of examples) {
    const item = assessment.find(item => item.id === id); assert.ok(item);
    assert.equal(checkJapaneseAnswer(item, wrong), false, id);
  }
  assert.notEqual(normalizeJapaneseAnswer("おばさん"), normalizeJapaneseAnswer("おばあさん"));
  const legacyReading = japaneseLegacyCourseUnits[1].activities.find(item => item.id === "jp-2-reading")!;
  assert.equal(checkJapaneseAnswer(legacyReading, "よじ"), true);
  assert.equal(checkJapaneseAnswer(legacyReading, "よんじ"), false);
  assert.equal(checkJapaneseAnswer(legacyReading, "よじ。"), false, "historic reading semantics stay exact");
});

test("the new cumulative review covers every module with independent IDs and novel paired tasks", () => {
  assert.equal(japaneseExtendedFinalBlueprint.length, 12);
  assert.deepEqual(japaneseExtendedFinalBlueprint.map(row => row.unitId), japaneseCourseUnits.map(unit => unit.id));
  assert.deepEqual(japaneseExtendedFinalBlueprint.flatMap(row => row.activityIds), japaneseExtendedFinalAssessment.map(item => item.id));
  const oldIds = new Set([...japaneseFinalAssessment, ...japaneseCourseUnits.flatMap(unit => unit.activities)].map(item => item.id));
  const practicePrompts = new Set(japaneseCourseUnits.flatMap(unit => unit.activities.map(item => item.prompt.en)));
  for (const item of japaneseExtendedFinalAssessment) {
    assert.equal(oldIds.has(item.id), false);
    assert.equal(practicePrompts.has(item.prompt.en), false, item.id);
    assert.notEqual(item.kind, "listening");
  }
  for (const row of japaneseExtendedFinalBlueprint) {
    const tasks = row.activityIds.map(id => japaneseExtendedFinalAssessment.find(item => item.id === id)!);
    assert.equal(tasks[0].kind, "choice"); assert.equal(tasks[1].kind, "reading");
  }
});

test("culture references resolve to exact primary pages and content invents no recordings or certification", () => {
  const sources = new Map(japaneseCourseSources.map(source => [source.id, source]));
  for (const unit of extension) {
    assert.ok(unit.culture.sourceIds.length);
    for (const id of unit.culture.sourceIds) {
      const source = sources.get(id); assert.ok(source, id);
      assert.match(source.url, /^https:\/\/(?:www\.japan\.travel|www\.irodori\.jpf\.go\.jp)\//u);
      localized(source.purpose);
    }
    assert.doesNotMatch(JSON.stringify(unit), /\.mp3|nativeAccent|JLPT\s+(?:certified|N[1-5])/iu);
  }
  const current = resolveJapaneseCourseUnit("bilan")!;
  for (const locale of locales) assert.match(current.setting[locale], /(?:ne certifie|does not certify|No certifica)/u);
});

test("old bookmarks and results survive parsing and coexist with new module and final progress", () => {
  const old = { ...emptyJapaneseProgress(), lastUnit: "bilan", lastSteps: { bilan: "jp-final-07", "module-8": "jp-8-reading" }, practicedKanji: ["行", "来"] };
  const achieved = recordJapaneseResult(old, "jp-final-07", true, false);
  assert.deepEqual(parseJapaneseProgress(JSON.stringify(achieved)), achieved);
  for (const unit of ["module-9", "module-10", "module-11", "module-12", "bilan-fondations"]) {
    const next = recordJapaneseResult({ ...achieved, lastUnit: unit, lastSteps: { ...achieved.lastSteps, [unit]: "jp-depth-final-24" } }, "jp-depth-final-24", true, false);
    const restored = parseJapaneseProgress(JSON.stringify(next));
    assert.equal(restored.lastUnit, unit);
    assert.equal(restored.lastSteps.bilan, "jp-final-07");
    assert.deepEqual(restored.results["jp-final-07"], achieved.results["jp-final-07"]);
    assert.equal(restored.results["jp-depth-final-24"].independent, true);
  }
  assert.equal(parseJapaneseProgress(JSON.stringify({ ...achieved, lastUnit: "module-13" })).lastUnit, "module-1");
  const concurrent = recordJapaneseResult(emptyJapaneseProgress(), "jp-9-recall-negative", false, false);
  const merged = mergeJapaneseProgress(achieved, concurrent);
  assert.equal(merged.results["jp-final-07"].independent, true);
  assert.equal(merged.results["jp-9-recall-negative"].needsReview, true);
  assert.equal(merged.lastSteps.bilan, "jp-final-07");
  assert.deepEqual(mergeJapaneseProgress(merged, merged), merged, "reconciliation does not inflate attempts");
});

test("old and new public finals map to distinct stored identities and the new gate requires twelve modules", () => {
  const old = resolveJapaneseCourseUnit("bilan-initial")!, current = resolveJapaneseCourseUnit("bilan")!;
  assert.equal(old.id, "jp-foundation-final"); assert.equal(old.slug, "bilan");
  assert.equal(current.id, "jp-foundations-extended-final"); assert.equal(current.slug, "bilan-fondations");
  assert.deepEqual(old.activities, japaneseFinalAssessment);
  assert.deepEqual(current.activities, japaneseExtendedFinalAssessment);
  assert.equal(japanesePublicUnitSlug(old.slug), "bilan-initial");
  assert.equal(japanesePublicUnitSlug(current.slug), "bilan");
  assert.equal(resolveJapaneseCourseUnit("bilan-fondations"), undefined, "internal key is not a second public route");
  assert.equal(resolveJapaneseCourseUnit("module-13"), undefined);
  const units = japaneseCourseUnits.map(unit => ({ id: unit.slug, number: unit.number, title: unit.title, subtitle: unit.subtitle, objectives: unit.goals, activityIds: japaneseUnitPracticeIds(unit) }));
  let progress = emptyJapaneseProgress();
  for (const unit of japaneseLegacyCourseUnits) for (const id of japaneseUnitPracticeIds(unit)) progress = recordJapaneseResult(progress, id, true, false);
  for (const item of japaneseFinalAssessment) progress = recordJapaneseResult(progress, item.id, true, false);
  assert.equal(canEnterFoundationStep(japaneseJourney(units.slice(0, 8), progress), "bilan", false), true);
  assert.equal(canEnterFoundationStep(japaneseJourney(units, progress), "bilan", false), false);
  assert.equal(japaneseJourney(units, progress).steps[8].unlocked, true);
  assert.equal(japaneseJourney(units, progress).steps[9].unlocked, false);
  for (const unit of extension) for (const id of japaneseUnitPracticeIds(unit)) progress = recordJapaneseResult(progress, id, true, true);
  assert.equal(canEnterFoundationStep(japaneseJourney(units, progress), "bilan", false), false, "helped successes do not open the final");
  for (const unit of extension) for (const id of japaneseUnitPracticeIds(unit)) progress = recordJapaneseResult(progress, id, true, false);
  assert.equal(canEnterFoundationStep(japaneseJourney(units, progress), "bilan", false), true);
  assert.equal(japaneseExtendedFinalAssessment.some(item => progress.results[item.id]?.passed), false, "old results do not fabricate new final evidence");
});
