import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { emptyCourseProgress, recordCourseActivity, recordCourseAssessment } from "@/lib/yo/italian/course/courseProgress";
import { personalizedItalianCatalog, personalizedItalianUnits } from "@/lib/yo/personalized/courseData";
import {
  buildItalianTrivia, canPlayItalianTrivia, ITALIAN_TRIVIA_COUNT, ITALIAN_TRIVIA_PASS,
  readTriviaSouvenir, triviaSouvenirAfterRound, triviaSouvenirKey,
} from "@/lib/yo/italian/trivia";
import { canUseItalianFlute, projectItalianWorlds } from "@/lib/yo/italian/worlds";

const localeList = ["fr", "en", "es"] as const;
const validModes = ["meaning", "listening", "expression"] as const;
assert.equal(personalizedItalianUnits.length, 12);
for (const unit of personalizedItalianUnits) {
  const questions = buildItalianTrivia(unit);
  assert.equal(questions.length, ITALIAN_TRIVIA_COUNT, `${unit.id}: five genuine questions`);
  assert.deepEqual(questions, buildItalianTrivia(unit), `${unit.id}: deterministic drafts`);
  assert.equal(new Set(questions.map(q => q.id)).size, ITALIAN_TRIVIA_COUNT);
  assert.ok(questions.some(q => q.mode === "listening"), `${unit.id}: listening matters`);
  assert.ok(questions.some(q => q.mode === "expression"), `${unit.id}: productive recall matters`);
  const taughtLessons = new Set(unit.lessons.slice(0, Math.ceil(unit.lessons.length / 2)).map(l => l.id));
  for (const q of questions) {
    assert.ok(validModes.includes(q.mode));
    assert.ok(taughtLessons.has(q.sourceLessonId), `${q.id}: no untaught vocabulary`);
    assert.equal(q.options.length, 4, `${q.id}: meaningful choice bank`);
    assert.ok(q.options.some(option => option.id === q.correctOptionId));
    for (const locale of localeList) {
      assert.ok(q.prompt[locale].length > 5);
      assert.equal(new Set(q.options.map(option => option.label[locale])).size, 4,
        `${q.id}: no repeated or ambiguous ${locale} choices`);
      assert.ok(q.explanation[locale]);
    }
    assert.equal(Boolean(q.audioText), q.mode === "listening");
    assert.ok(!unit.quiz.questions.some(final => final.id === q.id), `${q.id}: no final assessment reuse`);
  }
  assert.equal(canPlayItalianTrivia(unit, emptyCourseProgress()), false, `${unit.id}: locked before teaching`);
  let practice = emptyCourseProgress();
  const half = Math.max(1, Math.ceil(unit.lessons.length / 2));
  for (const lesson of unit.lessons.slice(0, half)) {
    for (const activity of lesson.activities) {
      practice = recordCourseActivity(practice, personalizedItalianCatalog, activity.id, true, false);
    }
  }
  assert.equal(canPlayItalianTrivia(unit, practice), true, `${unit.id}: checkpoint after half the missions`);
}
const first = personalizedItalianUnits[0];
const assessed = recordCourseAssessment(emptyCourseProgress(), personalizedItalianCatalog, first.quiz.id, 4, 5, false);
assert.equal(canPlayItalianTrivia(first, assessed), true, "returning learner may replay trivia after mastery");
const assisted = recordCourseAssessment(emptyCourseProgress(), personalizedItalianCatalog, first.quiz.id, 5, 5, true);
assert.equal(canPlayItalianTrivia(first, assisted), false, "assisted final alone does not validate a checkpoint");

const key = triviaSouvenirKey(first.id);
assert.equal(key, "yo.italian.trivia.souvenir.v1.u01");
const perfect = Array.from({ length: ITALIAN_TRIVIA_COUNT }, () => ({ correct: true, assisted: false }));
const medal = triviaSouvenirAfterRound(null, first.id, 0, perfect)!;
assert.equal(medal.bestCorrect, ITALIAN_TRIVIA_COUNT);
assert.equal(readTriviaSouvenir(JSON.stringify(medal), first.id, 0)?.bestCorrect, 5);
assert.equal(readTriviaSouvenir(JSON.stringify(medal), first.id, 1), null, "reset revokes old souvenir");
assert.equal(readTriviaSouvenir(JSON.stringify({ ...medal, bestCorrect: 999 }), first.id, 0), null);
assert.equal(readTriviaSouvenir(JSON.stringify({ ...medal, unitId: "u03" }), first.id, 0), null);
assert.equal(readTriviaSouvenir("{bad", first.id, 0), null);
assert.equal(triviaSouvenirAfterRound(null, first.id, 0, perfect.slice(0, 4)), null, "no partial-round rewards");
const helpedRound = perfect.map((item, i) => i === 2 ? { ...item, assisted: true } : item);
assert.equal(triviaSouvenirAfterRound(null, first.id, 0, helpedRound)?.bestCorrect, 0,
  "a revealed listening answer cannot earn a medal");
const fourCorrect = perfect.map((item, i) => i === 4 ? { ...item, correct: false } : item);
assert.equal(triviaSouvenirAfterRound(null, first.id, 0, fourCorrect)?.bestCorrect, ITALIAN_TRIVIA_PASS);
assert.equal(triviaSouvenirAfterRound(medal, first.id, 0, fourCorrect)?.bestCorrect, 5, "replay does not downgrade");
assert.equal(triviaSouvenirAfterRound(medal, first.id, 20, fourCorrect)?.bestCorrect, 4,
  "old reset cannot transfer a medal");

let worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, emptyCourseProgress()));
assert.equal(canUseItalianFlute(worlds, 0), false);
assert.equal(canUseItalianFlute(worlds, 1), false);
assert.equal(canUseItalianFlute(worlds, 2), false);
assert.equal(canUseItalianFlute(worlds, -1), false);
let progress = emptyCourseProgress();
for (const unit of personalizedItalianCatalog.units.slice(0, 3)) {
  const exam = personalizedItalianCatalog.assessments.find(a => a.id === unit.quizId)!;
  progress = recordCourseAssessment(progress, personalizedItalianCatalog, exam.id,
    Math.ceil(exam.questionCount * exam.passPercent / 100), exam.questionCount, false);
}
worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
assert.equal(canUseItalianFlute(worlds, 0), false, "3/4 cities cannot award teleport");
const fourth = personalizedItalianCatalog.units[3];
const fourthExam = personalizedItalianCatalog.assessments.find(a => a.id === fourth.quizId)!;
progress = recordCourseAssessment(progress, personalizedItalianCatalog, fourth.quizId,
  Math.ceil(fourthExam.questionCount * fourthExam.passPercent / 100), fourthExam.questionCount, false);
worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
assert.equal(canUseItalianFlute(worlds, 0), true, "earned pass AND open next city permit visual portal");
assert.equal(canUseItalianFlute(worlds, 1), false, "flute never skips an uncleared world");
const falsified = structuredClone(worlds);
falsified[1].open = false;
assert.equal(canUseItalianFlute(falsified, 0), false, "flute cannot open a locked world");
const unpassed = structuredClone(worlds);
unpassed[0].passEarned = false;
assert.equal(canUseItalianFlute(unpassed, 0), false, "flute cannot mint a Pass");

const source = readFileSync("components/yo/italian/guided/ItalianTriviaCheckpoint.tsx", "utf8");
assert.doesNotMatch(source, /recordCourseAssessment|recordCourseActivity|\.rpc\(|fetch\(|stripe|credits\s*[+-]=/i,
  "trivia must not write canonical mastery, credits or payments");
assert.match(source, /data-yoppo-trivia=/);
const guided = readFileSync("components/yo/italian/guided/GuidedItalianCourse.tsx", "utf8");
assert.match(guided, /ItalianTriviaCheckpoint unit=\{unit\}/);
assert.match(guided, /i === Math\.ceil\(unit\.lessons\.length \/ 2\) - 1/);
console.log("Yoppo Trivia: 12 playable unit banks, nonduplicate question choices, 4/5 medals, gated flute and read-only progress: PASS");
