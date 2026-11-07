import assert from "node:assert/strict";
import { test } from "node:test";
import { italianCourseCatalog as catalog } from "../../lib/yo/italian/course/courseData";
import { buildCourseJourney, canEnterCourseAssessment } from "../../lib/yo/courseJourney";
import { adventureMilestones } from "../../lib/yo/adventure";
import { emptyCourseProgress, recordCourseActivity, recordCourseAssessment, parseCourseProgress, serializeCourseProgress, mergeCourseProgress, resetCourseProgress } from "../../lib/yo/italian/course/courseProgress";

const unit = catalog.units[0];
const midpointId = unit.midpointId!;
const now = Date.now();
function practice(count: number) {
  return unit.activityIds.slice(0, count).reduce((progress, id, index) =>
    recordCourseActivity(progress, catalog, id, true, false, now + index), emptyCourseProgress());
}

test("the real midpoint opens at ten independent activities, without inflating the nineteen activity denominator", () => {
  assert.equal(unit.activityIds.length, 19);
  assert.equal(catalog.assessments.find(item => item.id === midpointId)?.questionCount, 5);
  for (const count of [0, 9, 10, 19]) {
    assert.equal(canEnterCourseAssessment(catalog, practice(count), midpointId), count >= 10);
    assert.equal(buildCourseJourney(catalog, practice(count)).steps[0].independent, count);
  }
  const assisted = recordCourseActivity(practice(9), catalog, unit.activityIds[9], true, true, now + 20);
  assert.equal(canEnterCourseAssessment(catalog, assisted, midpointId), false);
});

test("midpoint scores require a complete run and independent 80 percent; they never open the next unit", () => {
  const eligible = practice(10);
  for (const [correct, total, assisted, passed] of [[4, 5, false, true], [3, 5, false, false], [5, 5, true, false], [4, 4, false, false]] as const) {
    const result = recordCourseAssessment(eligible, catalog, midpointId, correct, total, assisted, now + 30);
    const journey = buildCourseJourney(catalog, result);
    assert.equal(journey.steps[0].midpointPassed, passed);
    assert.equal(journey.steps[0].passed, false);
    assert.equal(journey.steps[1].unlocked, false);
    assert.equal(journey.steps[0].independent, 10);
    assert.equal(Boolean(result.assessments[midpointId]), total === 5);
  }
});

test("halfway encouragement and successful recap are distinct evidence", () => {
  const eligible = practice(10);
  const initial = adventureMilestones(buildCourseJourney(catalog, eligible));
  assert.ok(initial.some(item => item.id === `${unit.id}:checkpoint`));
  assert.equal(initial.some(item => item.id === `${unit.id}:recap`), false);
  const passed = recordCourseAssessment(eligible, catalog, midpointId, 4, 5, false, now + 30);
  const earned = adventureMilestones(buildCourseJourney(catalog, passed));
  assert.equal(earned.filter(item => item.id === `${unit.id}:recap`).length, 1);
});

test("old unit mastery remains valid and permits optional recap review without reconstructing practice history", () => {
  const legacy = recordCourseAssessment(emptyCourseProgress(), catalog, unit.quizId, 4, 5, false, now);
  const restored = parseCourseProgress(serializeCourseProgress(legacy), catalog);
  const journey = buildCourseJourney(catalog, restored);
  assert.equal(journey.steps[0].passed, true);
  assert.equal(journey.steps[0].midpointPassed, false);
  assert.equal(journey.steps[1].unlocked, true);
  assert.equal(canEnterCourseAssessment(catalog, restored, midpointId), true);
  assert.equal(restored.assessments[midpointId], undefined);
  assert.equal(restored.version, 1);
});

test("a failed or assisted retry cannot remove a successful recap, and merge/reload preserve it", () => {
  const passed = recordCourseAssessment(practice(10), catalog, midpointId, 4, 5, false, now + 30);
  const retry = recordCourseAssessment(passed, catalog, midpointId, 1, 5, true, now + 40);
  const restored = parseCourseProgress(serializeCourseProgress(mergeCourseProgress(retry, passed)), catalog);
  assert.equal(restored.assessments[midpointId].bestIndependent, 80);
  assert.equal(restored.assessments[midpointId].last.correct, 1);
  assert.equal(restored.assessments[midpointId].attempts, 2);
  assert.equal(buildCourseJourney(catalog, restored).steps[0].midpointPassed, true);
  assert.equal(buildCourseJourney(catalog, resetCourseProgress(restored, now + 50)).steps[0].midpointPassed, false);
});

test("other unit assessments and cumulative checkpoints retain their original gates", () => {
  const progress = practice(19);
  assert.equal(canEnterCourseAssessment(catalog, progress, unit.quizId), true);
  assert.equal(canEnterCourseAssessment(catalog, progress, catalog.units[1].quizId), false);
  for (const assessment of catalog.assessments.filter(item => item.unitIds.length > 1)) {
    assert.equal(canEnterCourseAssessment(catalog, progress, assessment.id), false);
  }
  for (const other of buildCourseJourney(catalog, progress).steps.slice(1)) {
    assert.equal(other.midpointPassed, undefined);
  }
});
