import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../../app/api/yo/review/exercise/route";
import { japaneseCourseUnits, japaneseFinalAssessment, japaneseExtendedFinalAssessment } from "../../lib/yo/japaneseCourse";
import { mandarinUnits, mandarinFinal, mandarinExtendedFinal } from "../../lib/yo/mandarin/course";
import { japaneseJourneyUnits, japaneseFinalIds, japaneseLegacyFinalIds, mandarinJourneyUnits, mandarinFinalIds, mandarinLegacyFinalIds } from "../../lib/yo/foundationJourneyCatalogs";
import { japaneseJourney, mandarinJourney, canEnterFoundationStep } from "../../lib/yo/foundationJourney";
import { emptyJapaneseProgress, recordJapaneseResult } from "../../lib/yo/japaneseCourseProgress";
import { emptyProgress } from "../../lib/yo/mandarin/progress";

const get = (language: string, id: string) => GET(new Request(`https://example.test/api/yo/review/exercise?${new URLSearchParams({ language, item: id })}`));

test("Japanese review preserves new written recall and the actual roleplay line", async () => {
  const unit = japaneseCourseUnits[8];
  const recall = unit.activities.find(item => item.kind === "reading" && item.responseMode === "recall")!;
  assert.ok(recall);
  const response = await get("ja", `course:${unit.id}:practice:${recall.id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { language: "ja", activity: recall });
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const turn = unit.roleplay.turns[0];
  const data = await (await get("ja", `course:${unit.id}:roleplay:${turn.id}`)).json();
  assert.deepEqual(data.activity.stimulus, turn.line);
  assert.deepEqual(data.activity.choices, turn.choices);
  assert.equal(data.activity.answerId, turn.answerId);
  assert.deepEqual(Object.keys(data).sort(), ["activity", "language"]);
});

test("Mandarin review retains the exact new reading passage and answer contract", async () => {
  const unit = mandarinUnits.slice(8).find(item => item.exercises.some(exercise => exercise.stimulus))!;
  const exercise = unit.exercises.find(item => item.stimulus)!;
  const response = await get("zh", `course:${unit.id}:practice:${exercise.id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { language: "zh", exercise });
  assert.match(response.headers.get("cache-control")!, /max-age=300/);
});

test("neither legacy nor new final questions can be fetched as optional course practice", async () => {
  for (const [unitId, activity] of [["jp-foundation-final", japaneseFinalAssessment[0]], ["jp-foundations-extended-final", japaneseExtendedFinalAssessment[0]]] as const) {
    assert.equal((await get("ja", `course:${unitId}:practice:${activity.id}`)).status, 404);
  }
  for (const unit of [mandarinFinal, mandarinExtendedFinal]) {
    assert.equal((await get("zh", `course:${unit.id}:practice:${unit.exercises[0].id}`)).status, 404);
  }
  for (const [language, id, status] of [["ja", "../../secret", 400], ["ja", `course:${"a".repeat(481)}`, 400], ["zh-CN", "course:u01:practice:unknown", 400], ["zh", "course:u01:practice:unknown", 404]] as const) {
    assert.equal((await get(language, id)).status, status);
  }
});

test("the eight-unit legacy gate and twelve-unit current gate retain separate final IDs", () => {
  assert.equal(japaneseJourneyUnits.length, 12);
  assert.equal(mandarinJourneyUnits.length, 12);
  for (const [current, legacy] of [[japaneseFinalIds, japaneseLegacyFinalIds], [mandarinFinalIds, mandarinLegacyFinalIds]]) {
    assert.equal(current.length, 24); assert.equal(legacy.length, 8);
    assert.equal(current.some(id => legacy.includes(id)), false);
  }
  let ja = emptyJapaneseProgress();
  for (const unit of japaneseJourneyUnits.slice(0, 8)) for (const id of unit.activityIds) ja = recordJapaneseResult(ja, id, true, false);
  const zh = emptyProgress();
  for (const unit of mandarinJourneyUnits.slice(0, 8)) for (const id of unit.activityIds) zh.results[id] = { passed: true, independent: true, attempts: 1, review: false };
  for (const [legacy, current] of [
    [japaneseJourney(japaneseJourneyUnits.slice(0, 8), ja), japaneseJourney(japaneseJourneyUnits, ja)],
    [mandarinJourney(mandarinJourneyUnits.slice(0, 8), zh), mandarinJourney(mandarinJourneyUnits, zh)],
  ]) {
    assert.equal(canEnterFoundationStep(legacy, "bilan", false), true);
    assert.equal(canEnterFoundationStep(current, "bilan-fondations", false), false);
    assert.equal(current.steps[8].unlocked, true);
    assert.equal(current.steps[9].unlocked, false);
  }
});
