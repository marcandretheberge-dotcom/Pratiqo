import assert from "node:assert/strict";
import { test } from "node:test";
import { getItalianCourseAudioItem } from "@/lib/yo/audio/italianCourseAudio";
import { matchesItalianAnswer, normalizeItalianAnswer } from "@/lib/yo/italian/italianModuleLogic";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { courseAssessments, italianCourseCatalog, italianCourseUnits } from "@/lib/yo/italian/course/courseData";
import { italianFirstMidpoint, italianFirstMission } from "@/lib/yo/italian/course/coursePilot";
import { activitySpeech, assessmentSpeech, distinctSpeech, unitSpeech } from "@/lib/yo/italian/course/courseSpeech";
import { units01to06 } from "@/lib/yo/italian/course/units01to06";
import { units07to12 } from "@/lib/yo/italian/course/units07to12";
import type { CourseQuestion, LocaleText } from "@/lib/yo/italian/course/courseTypes";

const locales = ["fr", "en", "es"] as const;
const firstUnit = italianCourseUnits[0];
const originalUnit = units01to06[0];
const legacyQuestionIds = Array.from({ length: 5 }, (_, i) => `it1-u01-q${i + 1}`);
const midpointQuestionIds = Array.from({ length: 5 }, (_, i) => `it1-u01-midpoint-q${i + 1}`);

function assessedContent(question: CourseQuestion) {
  return question.kind === "type"
    ? { id: question.id, kind: question.kind, model: question.model, accepted: question.accepted }
    : { id: question.id, kind: question.kind, options: question.options.map(({ id, it }) => ({ id, it })), correctId: question.correctId, ...(question.stimulus ? { stimulus: question.stimulus } : {}) };
}

function localized(value: LocaleText, location: string) {
  for (const locale of locales) {
    assert.equal(typeof value[locale], "string", `${location}.${locale}`);
    assert.ok(value[locale].trim(), `${location}.${locale}: nonempty`);
    assert.doesNotMatch(value[locale], /\b(?:TODO|TBD|FIXME|PLACEHOLDER)\b|lorem ipsum/i, location);
  }
}

test("the story wraps the exact existing five-question quiz without changing its answers or scoring", () => {
  const { mission, ...quiz } = firstUnit.quiz;
  assert.strictEqual(mission, italianFirstMission);
  assert.deepEqual(quiz, originalUnit.quiz, "all original quiz content stays intact");
  assert.equal(quiz.id, "it1-u01-quiz");
  assert.equal(quiz.passPercent, 80);
  assert.deepEqual(quiz.unitIds, ["u01"]);
  assert.deepEqual(Object.keys(mission!.scenes), legacyQuestionIds);
  assert.deepEqual(quiz.questions.map(assessedContent), [
    { id: "it1-u01-q1", kind: "choice", options: [{ id: "a", it: "Arrivederci!" }, { id: "b", it: "Buongiorno!" }, { id: "c", it: "Scrivi." }], correctId: "a" },
    { id: "it1-u01-q2", kind: "listen", options: [{ id: "a", it: "Ripeti." }, { id: "b", it: "Leggi." }, { id: "c", it: "Scrivi." }], correctId: "b", stimulus: "Leggi, per favore." },
    { id: "it1-u01-q3", kind: "choice", options: [{ id: "a", it: "Ciao" }, { id: "b", it: "Gelato" }, { id: "c", it: "Chiave" }], correctId: "c" },
    { id: "it1-u01-q4", kind: "type", model: "Scusi, può ripetere?", accepted: ["Scusi, può ripetere?", "Può ripetere, scusi?", "Scusi, può ripetere, per favore?"] },
    { id: "it1-u01-q5", kind: "choice", options: [{ id: "a", it: "Buonanotte!" }, { id: "b", it: "Prego!" }, { id: "c", it: "Buongiorno!" }], correctId: "a" },
  ]);
});

test("the pilot adds one separate optional recap and leaves the nineteen practice activities unchanged", () => {
  assert.strictEqual(firstUnit.midpoint, italianFirstMidpoint);
  assert.equal(italianFirstMidpoint.id, "it1-u01-midpoint");
  assert.equal(italianFirstMidpoint.purpose, "midpoint");
  assert.equal(italianFirstMidpoint.passPercent, 80);
  assert.deepEqual(italianFirstMidpoint.unitIds, ["u01"]);
  assert.deepEqual(italianFirstMidpoint.questions.map(question => question.id), midpointQuestionIds);
  assert.deepEqual(italianFirstMidpoint.questions.map(question => question.kind), ["choice", "choice", "choice", "listen", "type"]);
  assert.ok(italianFirstMidpoint.questions.every(question => question.taughtInUnitId === "u01"));
  assert.equal(italianCourseCatalog.units[0].quizId, "it1-u01-quiz");
  assert.equal(italianCourseCatalog.units[0].midpointId, "it1-u01-midpoint");
  const practiceIds = originalUnit.lessons.flatMap(lesson => lesson.activities.map(activity => activity.id));
  assert.equal(practiceIds.length, 19);
  assert.equal(Math.ceil(practiceIds.length / 2), 10);
  assert.deepEqual(italianCourseCatalog.units[0].activityIds, practiceIds);
  const legacyIds = new Set([...units01to06, ...units07to12].flatMap(unit => [
    unit.quiz.id, ...unit.quiz.questions.map(question => question.id),
    ...unit.lessons.flatMap(lesson => lesson.activities.map(activity => activity.id)),
  ]).concat(courseAssessments.flatMap(assessment => [assessment.id, ...assessment.questions.map(question => question.id)])));
  for (const id of [italianFirstMidpoint.id, ...midpointQuestionIds]) assert.equal(legacyIds.has(id), false, `${id}: separate progress identity`);
  for (const unit of italianCourseUnits.slice(1)) {
    assert.equal(unit.midpoint, undefined, `${unit.id}: no unauthored recap`);
    assert.equal(unit.quiz.mission, undefined, `${unit.id}: no unauthored story`);
  }
});

test("all mission scenes, outcomes and recap guidance have complete learner-language copy", () => {
  for (const field of ["title", "briefing", "success", "retry", "assisted"] as const) localized(italianFirstMission[field], `mission.${field}`);
  for (const [id, scene] of Object.entries(italianFirstMission.scenes)) {
    for (const field of ["title", "character", "setting", "success", "recovery"] as const) localized(scene[field], `${id}.${field}`);
  }
  localized(italianFirstMidpoint.title, "midpoint.title");
  localized(italianFirstMidpoint.description, "midpoint.description");
  for (const question of italianFirstMidpoint.questions) {
    for (const field of ["title", "prompt", "hint", "hint2", "explanation"] as const) localized(question[field], `${question.id}.${field}`);
    if (question.kind !== "type") for (const option of question.options) localized(option.feedback, `${question.id}.${option.id}.feedback`);
  }
});

test("every recap utterance is already taught or practised in lessons one and two", () => {
  const taught = new Set(originalUnit.lessons.slice(0, 2).flatMap(lesson => [
    ...lesson.vocabulary.map(item => item.it),
    ...lesson.grammar.examples.map(item => item.it),
    ...lesson.pronunciation.practice,
    lesson.reading.it,
    ...lesson.activities.flatMap(activitySpeech),
  ]));
  for (const text of assessmentSpeech(italianFirstMidpoint)) assert.ok(taught.has(text), `${text}: exact L1/L2 wording, not a later lesson or a new composition`);
  const listening = italianFirstMidpoint.questions.filter(question => question.kind === "listen");
  assert.equal(listening.length, 1);
  const listeningQuestion = listening[0];
  assert.ok(listeningQuestion.kind === "listen" && listeningQuestion.stimulus);
  const earlierStimuli = originalUnit.lessons.slice(0, 2).flatMap(lesson => lesson.activities.flatMap(activity => activity.kind === "listen" ? [activity.stimulus] : []));
  assert.ok(earlierStimuli.includes(listeningQuestion.stimulus), "the recap reuses an already heard message");
});

test("the recap has an unambiguous answer per choice and accepts its taught written model", () => {
  for (const question of italianFirstMidpoint.questions) {
    if (question.kind === "type") {
      assert.equal(question.model, "Sì, grazie.");
      assert.ok(matchesItalianAnswer(question.model, question.accepted));
      assert.ok(matchesItalianAnswer("  SÌ, GRAZIE!  ", question.accepted), "existing typography tolerance remains in use");
      assert.equal(matchesItalianAnswer("", question.accepted), false);
      assert.equal(matchesItalianAnswer("No, grazie.", question.accepted), false, "declining is not accepting");
    } else {
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options.map(option => normalizeItalianAnswer(option.it!))).size, 3);
      assert.equal(question.options.filter(option => option.id === question.correctId).length, 1);
    }
  }
});

test("the pilot introduces no new audio text and every recap utterance has an existing exact path", () => {
  const before = distinctSpeech([...units01to06, ...units07to12].flatMap(unitSpeech).concat(courseAssessments.flatMap(assessmentSpeech)));
  const after = distinctSpeech(italianCourseUnits.flatMap(unitSpeech).concat(courseAssessments.flatMap(assessmentSpeech)));
  assert.deepEqual(new Set(after), new Set(before), "story text and recap must not create new recording dependencies");
  const recapSpeech = distinctSpeech(assessmentSpeech(italianFirstMidpoint));
  const paths = courseAudioPaths(recapSpeech);
  assert.equal(Object.keys(paths).length, recapSpeech.length);
  for (const text of recapSpeech) {
    const recording = getItalianCourseAudioItem(text);
    assert.ok(recording, `missing exact recording: ${text}`);
    assert.equal(recording.text, text);
    assert.equal(recording.targetLanguage, "it");
    assert.equal(paths[text], recording.storagePath);
  }
});

test("pre-answer story scenes never disclose the correct Italian phrase", () => {
  for (const question of firstUnit.quiz.questions) {
    const scene = italianFirstMission.scenes[question.id];
    const correct = question.kind === "type" ? question.model : question.options.find(option => option.id === question.correctId)!.it!;
    for (const locale of locales) {
      const context = normalizeItalianAnswer([scene.title[locale], scene.character[locale], scene.setting[locale]].join(" "));
      assert.equal(context.includes(normalizeItalianAnswer(correct)), false, `${question.id}.${locale}: correct phrase hidden before answer`);
    }
  }
});

test("listening and spelling scenes provide no translated answer or object clue", () => {
  const listening = italianFirstMission.scenes["it1-u01-q2"];
  const spelling = italianFirstMission.scenes["it1-u01-q3"];
  const recapListening = italianFirstMidpoint.questions.find(question => question.kind === "listen")!;
  for (const locale of locales) {
    const listeningContext = [listening.title[locale], listening.character[locale], listening.setting[locale]].join(" ");
    assert.doesNotMatch(listeningContext, /leggi|\b(?:lire|lis|read|reading|leer|lee|book|paper|livre|papier|libro|papel)\b/i, `${locale}: instruction must be heard`);
    const spellingContext = [spelling.title[locale], spelling.character[locale], spelling.setting[locale]].join(" ");
    assert.doesNotMatch(spellingContext, /chiave|\b(?:key|clé|clef|llave)\b/i, `${locale}: word must be selected from its letters`);
    assert.doesNotMatch(`${recapListening.title[locale]} ${recapListening.prompt[locale]}`, /chiave|\b(?:key|clé|clef|llave)\b/i, `${locale}: recap message must be heard`);
  }
});
