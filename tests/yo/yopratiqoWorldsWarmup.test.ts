import assert from "node:assert/strict";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { emptyCourseProgress, recordCourseAssessment } from "@/lib/yo/italian/course/courseProgress";
import { guidedSteps, initialGuided } from "@/lib/yo/italian/course/guidedItalian";
import { guidedMissionOrder, nextGuidedMissionStep, followingGuidedMissionStep, restoreGuidedMissionDraft } from "@/lib/yo/italian/course/guidedMissionOrder";
import { recallQueue } from "@/lib/yo/learning/vocabularyPractice";
import { ITALIAN_WORLDS, italianWorldForUnit, projectItalianWorlds } from "@/lib/yo/italian/worlds";
import { deriveItalianCityAchievement } from "@/lib/yo/italian/achievement";
import { recordCourseActivity } from "@/lib/yo/italian/course/courseProgress";
import { firstMeetingUnit, firstMeetingVisuals } from "@/lib/yo/personalized/firstMeeting";
import { personalizedItalianCatalog, personalizedItalianUnits } from "@/lib/yo/personalized/courseData";
import { freshVocabulary, parseVocabulary } from "@/components/yo/personalized/VisualVocabulary";

const allCities = ITALIAN_WORLDS.flatMap(world => world.cities);
assert.equal(ITALIAN_WORLDS.length, 3);
assert.equal(allCities.length, personalizedItalianCatalog.units.length);
assert.equal(new Set(allCities.map(city => city.unitId)).size, allCities.length);
assert.deepEqual(allCities.map(city => city.unitId), personalizedItalianCatalog.units.map(unit => unit.id));
assert.equal(italianWorldForUnit("u01")?.cities[0].name, "Bologna");
assert.equal(italianWorldForUnit("u08")?.cities[3].name, "Venezia");
assert.equal(italianWorldForUnit("does-not-exist"), undefined);

let worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, emptyCourseProgress()));
assert.deepEqual(worlds.map(world => world.passEarned), [false, false, false]);
assert.equal(worlds[0].citiesWithProgress[0].unlocked, true);
assert.equal(worlds[0].citiesWithProgress[1].unlocked, false);
assert.equal(worlds[1].open, false);

let progress = emptyCourseProgress();
for (const unit of personalizedItalianCatalog.units.slice(0, 4)) {
  const exam = personalizedItalianCatalog.assessments.find(item => item.id === unit.quizId)!;
  progress = recordCourseAssessment(progress, personalizedItalianCatalog, exam.id,
    Math.ceil(exam.questionCount * exam.passPercent / 100), exam.questionCount, false);
}
worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
assert.equal(worlds[0].passEarned, true, "Pass requires independently passed city assessments");
assert.equal(worlds[1].citiesWithProgress[0].unlocked, true, "next world opens using the existing journey");
assert.equal(worlds[1].passEarned, false);
const helped = recordCourseAssessment(emptyCourseProgress(), personalizedItalianCatalog,
  personalizedItalianCatalog.units[0].quizId, 5, 5, true);
assert.equal(projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, helped))[0].passEarned, false,
  "assisted answers cannot mint a world Pass");

for (const count of [1, 2, 3, 5, 6, 8, 20]) {
  const queue = recallQueue(count, "italian-test");
  assert.equal(queue.length, count);
  assert.equal(new Set(queue).size, count, "no repeated identical warmup target");
  assert.deepEqual(queue, recallQueue(count, "italian-test"), "stable ordering for persisted drafts");
  assert.equal(recallQueue(count, "italian-test", 3).length, Math.min(3, count));
}
assert.equal(freshVocabulary(6).queue.length, 3, "short three-question introduction");
const firstWords = Object.values(firstMeetingVisuals)[0];
const legacy = { ...freshVocabulary(6), queue: [0, 1, 2, 0, 3, 4, 5, 1], at: 3, study: false };
const updated = parseVocabulary(JSON.stringify(legacy), firstWords)!;
assert.equal(new Set(updated.queue).size, updated.queue.length, "legacy repeats removed when restoring a draft");
assert.equal(updated.queue[updated.at], 3, "resume at the next unseen target");

const prepared = Object.keys(firstMeetingVisuals);
const originalSteps = guidedSteps(firstMeetingUnit, prepared);
const preparedOrder = guidedMissionOrder(originalSteps);
assert.deepEqual(preparedOrder.map(i => originalSteps[i]).filter(step => step.lesson === 0).slice(0, 4).map(step => step.stage),
  ["prepare", "scene", "language", "sounds"], "no duplicate word lecture after vocabulary preparation");
const regularSteps = guidedSteps(personalizedItalianUnits[1]);
const regularOrder = guidedMissionOrder(regularSteps);
assert.deepEqual(regularOrder.map(i => regularSteps[i]).filter(step => step.lesson === 0).slice(0, 4).map(step => step.stage),
  ["words", "scene", "language", "sounds"], "other modules show vocabulary before the scene");
assert.equal(new Set(preparedOrder).size, preparedOrder.length);
assert.equal(new Set(regularOrder).size, regularOrder.length);
const oldDraft = { ...initialGuided(), step: 2, view: "map" as const, resumeView: "mission" as const,
  seen: [`${firstMeetingUnit.lessons[0].id}:prepare`, `${firstMeetingUnit.lessons[0].id}:scene`] };
const restored = restoreGuidedMissionDraft(oldDraft, originalSteps, preparedOrder);
assert.equal(originalSteps[restored.step].stage, "language", "old redundant word-page resumes at its explanation");
assert.deepEqual(restored.seen, oldDraft.seen, "draft evidence and progress are preserved");
const first = nextGuidedMissionStep(originalSteps, preparedOrder, initialGuided(), emptyCourseProgress());
assert.equal(originalSteps[first].stage, "prepare");
assert.equal(followingGuidedMissionStep(preparedOrder, first), preparedOrder[1]);

for (const unit of personalizedItalianUnits) {
  const ids = unit.quiz.questions.map(question => question.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate assessed question ID in ${unit.id}`);
}

const printableUnit = personalizedItalianCatalog.units[0];
const emptyReport = deriveItalianCityAchievement(printableUnit, personalizedItalianCatalog, emptyCourseProgress());
assert.equal(emptyReport.mastered, false, "a PDF cannot invent a earned stamp");
assert.equal(emptyReport.best, null);
assert.equal(emptyReport.practiced, 0);
const independentlyPassed = recordCourseAssessment(emptyCourseProgress(), personalizedItalianCatalog,
  printableUnit.quizId, 4, 5, false);
assert.equal(deriveItalianCityAchievement(printableUnit, personalizedItalianCatalog, independentlyPassed).mastered, true);
const assistedReport = recordCourseAssessment(emptyCourseProgress(), personalizedItalianCatalog,
  printableUnit.quizId, 5, 5, true);
assert.equal(deriveItalianCityAchievement(printableUnit, personalizedItalianCatalog, assistedReport).mastered, false);
const practised = recordCourseActivity(emptyCourseProgress(), personalizedItalianCatalog,
  printableUnit.activityIds[0], true, false);
assert.equal(deriveItalianCityAchievement(printableUnit, personalizedItalianCatalog, practised).practiced, 1);
assert.equal(deriveItalianCityAchievement(printableUnit, personalizedItalianCatalog, practised).mastered, false);

console.log("YoPratiqo worlds, warmups, achievement report, passes and draft migration: OK");
