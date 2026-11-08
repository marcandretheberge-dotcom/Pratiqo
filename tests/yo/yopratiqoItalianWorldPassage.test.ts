import assert from "node:assert/strict";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { emptyCourseProgress, recordCourseAssessment } from "@/lib/yo/italian/course/courseProgress";
import { ITALIAN_WORLDS, projectItalianWorlds } from "@/lib/yo/italian/worlds";
import {
  buildItalianWorldPassages, evaluateItalianWorldPassage,
  ITALIAN_PASSAGE_QUESTION_COUNT, ITALIAN_PASSAGE_MIN_CORRECT,
  profileAfterItalianWorldPassage,
} from "@/lib/yo/italian/worldPassage";
import { personalizedItalianCatalog, personalizedItalianUnits } from "@/lib/yo/personalized/courseData";
import { parseProfile, type LearningProfile } from "@/lib/yo/personalized/profile";

const passageChecks = buildItalianWorldPassages(personalizedItalianUnits);
assert.equal(passageChecks.length, ITALIAN_WORLDS.length - 1, "a knowledge check for each reachable world boundary");
assert.deepEqual(passageChecks.map(item => item.targetUnitId), ["u05", "u09"]);
assert.equal(ITALIAN_PASSAGE_QUESTION_COUNT, 5);
assert.equal(ITALIAN_PASSAGE_MIN_CORRECT, 4);
for (const [index, passage] of passageChecks.entries()) {
  const sourceCities = ITALIAN_WORLDS[index].cities.map(city => city.unitId);
  const questions = passage.questions;
  assert.equal(questions.length, 5);
  assert.equal(new Set(questions.map(item => item.id)).size, 5, "same question never presented twice");
  assert.ok(questions.every(question => ["choice", "type", "listen"].includes(question.kind)),
    "only interactive and language-focused tasks");
  const coverage = new Set(
    questions.map(q => personalizedItalianUnits.find(unit => unit.quiz.questions.some(candidate => candidate.id === q.id))?.id),
  );
  assert.deepEqual([...coverage].sort(), [...sourceCities].sort(), "each of four prerequisite cities is checked");
  assert.ok(questions.every(q => q.options.length >= 2 || q.kind === "type"));
  assert.ok(questions.every(q => sourceCities.some(id =>
    personalizedItalianUnits.find(unit => unit.id === id)?.quiz.questions.some(candidate => candidate.id === q.id))));
}

const passage = passageChecks[0];
const result = (right: number, assistedIndex = -1) => passage.questions.map((q,i) => ({
  questionId: q.id, correct: i < right, assisted: i === assistedIndex,
}));
assert.deepEqual(evaluateItalianWorldPassage(passage, result(4)), { complete: true, correct: 4, assisted: false, passed: true });
assert.equal(evaluateItalianWorldPassage(passage, result(5)).passed, true);
assert.equal(evaluateItalianWorldPassage(passage, result(3)).passed, false);
assert.equal(evaluateItalianWorldPassage(passage, result(5, 2)).passed, false, "help disqualifies an independent warp");
assert.equal(evaluateItalianWorldPassage(passage, result(5).slice(0,4)).complete, false);
assert.equal(evaluateItalianWorldPassage(passage, [{...result(5)[0], questionId:"forged"},...result(5).slice(1)]).passed, false);
assert.equal(evaluateItalianWorldPassage(passage, [result(5)[0], result(5)[0],...result(5).slice(2)]).passed, false);

const profile: LearningProfile = {
  version: 1, language: "it", experience: "rusty", goal: "travel", weeklyMinutes: 60,
  startUnitId: "u01", placement: "beginner", reviewUnitIds: ["u01"], updatedAt: 10,
};
const ids = personalizedItalianCatalog.units.map(unit => unit.id);
const after = profileAfterItalianWorldPassage(profile, passage, ids, 200);
assert.ok(after);
assert.equal(after.startUnitId, "u05");
assert.equal(after.placement, "check");
assert.deepEqual(after.reviewUnitIds, profile.reviewUnitIds);
assert.equal(parseProfile(JSON.stringify(after), "it", ids)?.startUnitId, "u05");
assert.equal(profile.startUnitId, "u01", "no mutation of the previous learner preferences");
assert.equal(profileAfterItalianWorldPassage(profile, passageChecks[1], ids, 200)?.startUnitId, "u09",
  "direct future-world requests need a UI prerequisite gate");
assert.equal(profileAfterItalianWorldPassage({...profile, startUnitId:"u09"}, passage, ids, 200), null,
  "cannot use a flute to regress a learner's entry point");
assert.equal(profileAfterItalianWorldPassage({...profile, language:"es"}, passage, ids, 200), null);
assert.equal(profileAfterItalianWorldPassage(profile, {...passage, targetUnitId:"u12"}, ids, 200), null);

const originalProgress = emptyCourseProgress();
const before = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, originalProgress));
assert.deepEqual(before.map(world=>world.passEarned), [false,false,false]);
assert.equal(before[1].citiesWithProgress[0].unlocked, false);
assert.equal(before[2].citiesWithProgress[0].unlocked, false);
assert.equal(JSON.stringify(originalProgress),JSON.stringify(emptyCourseProgress()),"placement cannot mutate course scores");
// A genuinely passed previous world still earns its existing Pass without a flute check.
let completed = emptyCourseProgress();
for (const u of personalizedItalianCatalog.units.slice(0,4)) {
 const q=personalizedItalianCatalog.assessments.find(a=>a.id===u.quizId)!;
 completed=recordCourseAssessment(completed,personalizedItalianCatalog,q.id,
   Math.ceil(q.questionCount*q.passPercent/100),q.questionCount,false);
}
assert.equal(projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog,completed))[0].passEarned,true);

console.log("Italian secret passage: bank coverage, first-answer gate, local placement and score isolation OK");
