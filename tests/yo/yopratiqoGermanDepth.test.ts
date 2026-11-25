import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  germanCourseUnits, germanLegacyUnits, germanFinal, germanExtendedFinal,
  germanCultureFinal, germanCatalog, germanSources, getGermanUnit,
} from "@/lib/yo/german/courseData";
import { germanDepthSources } from "@/lib/yo/german/depthSources";
import { germanCourseHref, GERMAN_PROGRESS_KEY, matchesGermanAnswer, normalizeGermanAnswer } from "@/lib/yo/german/courseLogic";
import { emptyCourseProgress, parseCourseProgress, recordCourseActivity, recordCourseAssessment, setCourseResume } from "@/lib/yo/italian/course/courseProgress";
import { buildCourseJourney, canEnterCourseAssessment } from "@/lib/yo/courseJourney";
import { unitSpeech } from "@/lib/yo/italian/course/courseSpeech";
import type { ItalianActivity, ItalianOption, LocaleText } from "@/lib/yo/italian/italianModuleTypes";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";

const newer = germanCourseUnits.slice(8);
const lessons = newer.flatMap(unit => unit.lessons);
const practice = lessons.flatMap(lesson => lesson.activities);
const written = [...newer.map(unit => unit.quiz), germanExtendedFinal];
const questions = written.flatMap(assessment => assessment.questions);
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const unique = (values: string[], message: string) => assert.equal(new Set(values).size, values.length, message);
const locales = ["fr", "en", "es"] as const;

function localText(text: LocaleText, name: string) {
  for (const locale of locales) assert.ok(text[locale]?.trim(), name + ":" + locale);
}

test("the extension preserves all eight original units and both original finals exactly", () => {
  // Captured from PR481 base before authoring any new unit, not derived from the extended data.
  assert.equal(hash(germanLegacyUnits), "3e68e137f5c726a6c7e5f7f293cd0219149d3cdeb0b754f5aac6fe33058b4cec");
  assert.equal(hash(germanCourseUnits.slice(0, 8)), hash(germanLegacyUnits));
  assert.equal(hash(germanFinal), "c928045a768482a3a5a108dc23353135aa7ce79991a56673bc53f1cdc67371d0");
  assert.equal(hash(germanCultureFinal), "788edc3a93534f4bd8b68654f598dc62a373b56696ba7c97ba141774949aba74");
  assert.equal(germanFinal.id, "de1-final");
  assert.equal(germanFinal.questions.length, 16);
  assert.deepEqual(germanFinal.unitIds, germanLegacyUnits.map(unit => unit.id));
  assert.equal(germanExtendedFinal.id, "de1-foundations-final");
  assert.equal(germanExtendedFinal.questions.length, 24);
  assert.equal(GERMAN_PROGRESS_KEY, "yopratiqo:german-course:beginner:v1");
  for (const assessment of [germanFinal, germanCultureFinal, germanExtendedFinal])
    assert.equal(germanCatalog.assessments.find(item => item.id === assessment.id)?.questionCount, assessment.questions.length);
});

test("four substantive units add twelve original lessons with goals and three-turn dialogues", () => {
  assert.equal(germanCourseUnits.length, 12);
  assert.equal(germanCourseUnits.flatMap(unit => unit.lessons).length, 36);
  assert.deepEqual(newer.map(unit => unit.id), ["u09", "u10", "u11", "u12"]);
  assert.equal(lessons.length, 12);
  assert.equal(practice.length, 84);
  assert.equal(lessons.flatMap(lesson => lesson.vocabulary).length, 84);
  unique(lessons.map(lesson => lesson.reading.it), "each reading is an original scene");
  unique(lessons.map(lesson => lesson.goal.en), "each lesson has a distinct communication goal");
  for (const unit of newer) {
    assert.equal(unit.lessons.length, 3);
    assert.equal(unit.quiz.questions.length, 6);
    assert.equal(unit.production.rubric.length, 3);
    assert.equal(unit.cultureStop, undefined, "no invented photo/cultural stop is attached");
    localText(unit.production.prompt, unit.id);
    assert.ok(unit.production.model.split(/[.!?]/).filter(item => item.trim()).length >= 4);
    for (const lesson of unit.lessons) {
      assert.equal(lesson.vocabulary.length, 7);
      assert.ok(lesson.reading.it.split(/\s+/).length >= 35, lesson.id + " substantive reading");
      assert.ok(lesson.grammar.body.en.length >= 160, lesson.id + " explained pattern");
      const dialogue = lesson.activities.find(activity => activity.kind === "dialogue");
      assert.ok(dialogue?.kind === "dialogue", lesson.id);
      assert.equal(dialogue.turns.length, 3);
      unique(dialogue.turns.map(turn => turn.line), lesson.id + " three distinct turns");
      for (const kind of ["match", "order", "choice", "listen", "type", "dialogue"])
        assert.ok(lesson.activities.some(activity => activity.kind === kind), lesson.id + ":" + kind);
    }
  }
});

test("all new content is fully localized and serializable with collision-free IDs", () => {
  function visit(value: unknown, path: string) {
    if (Array.isArray(value)) value.forEach((item, index) => visit(item, path + "." + index));
    else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (locales.some(locale => Object.hasOwn(record, locale))) localText(record as LocaleText, path);
      Object.entries(record).forEach(([key, item]) => visit(item, path + "." + key));
    }
  }
  visit({ newer, germanExtendedFinal }, "de");
  const payload = { germanCourseUnits, germanCatalog, germanFinal, germanExtendedFinal, germanCultureFinal };
  const cloned = JSON.parse(JSON.stringify(payload));
  assert.deepEqual(cloned.germanCourseUnits, germanCourseUnits);
  assert.deepEqual(cloned.germanExtendedFinal, germanExtendedFinal);
  assert.deepEqual(cloned.germanFinal, germanFinal);
  assert.equal(cloned.germanCatalog.units.length, 12);
  assert.equal(cloned.germanCatalog.assessments.length, 15);
  unique([
    ...germanCourseUnits.flatMap(unit => unit.lessons.flatMap(lesson => lesson.activities.map(activity => activity.id))),
    ...germanCourseUnits.flatMap(unit => unit.quiz.questions.map(question => question.id)),
    ...[germanFinal, germanExtendedFinal, germanCultureFinal].flatMap(assessment => assessment.questions.map(question => question.id)),
  ], "no activity or assessment question ID is reused");
  assert.equal(getGermanUnit("u12")?.lessons[2].id, "de1-u12-l3");
  assert.equal(getGermanUnit("u13"), undefined);
  assert.equal(getGermanUnit("__proto__"), undefined);
});

function checkOptions(options: ItalianOption[], correctId: string, id: string) {
  unique(options.map(option => option.id), id + " option IDs");
  assert.equal(options.filter(option => option.id === correctId).length, 1, id + " one target");
  for (const locale of locales) unique(options.map(option => option.it ?? option.label![locale]), id + ":" + locale + " visible options");
  for (const option of options) localText(option.feedback, id + ":" + option.id);
}

test("choices have one target and feedback explains the selected versus expected answer", () => {
  const positions = new Set<number>();
  for (const activity of [...practice, ...questions]) {
    if ("options" in activity) {
      checkOptions(activity.options, activity.correctId, activity.id);
      positions.add(activity.options.findIndex(option => option.id === activity.correctId));
      for (const option of activity.options.filter(option => option.id !== activity.correctId)) {
        assert.notDeepEqual(option.feedback, activity.options.find(item => item.id === activity.correctId)!.feedback);
        if (option.it) for (const locale of locales) assert.ok(option.feedback[locale].includes(option.it), activity.id + " selected answer named");
      }
    }
    if (activity.kind === "dialogue") for (const turn of activity.turns) {
      checkOptions(turn.options, turn.correctId, activity.id);
      const target = turn.options.find(option => option.id === turn.correctId)!.it!;
      for (const option of turn.options.filter(option => option.id !== turn.correctId))
        for (const locale of locales) {
          assert.ok(option.feedback[locale].includes(option.it!));
          assert.ok(option.feedback[locale].includes(target));
        }
    }
    if (activity.kind === "type") {
      assert.ok(matchesGermanAnswer(activity.model, activity.accepted), activity.id);
      assert.ok(activity.accepted.every(answer => answer.trim() && answer.length <= 160), activity.id);
    }
  }
  assert.ok(positions.size >= 2);
});

test("recall uses intentions and written checkpoints use new contexts rather than copied lesson IDs", () => {
  for (const activity of [...practice, ...questions]) {
    if (activity.kind === "type" && !activity.listeningText || activity.kind === "order") {
      const answer = normalizeGermanAnswer(activity.kind === "type" ? activity.model : activity.it);
      for (const locale of locales)
        assert.equal(normalizeGermanAnswer(activity.prompt[locale]).includes(answer), false, activity.id + ":" + locale + " must not reveal full target");
    }
  }
  assert.equal(questions.length, 48);
  const lessonPrompts = new Set(germanCourseUnits.flatMap(unit => unit.lessons.flatMap(lesson => lesson.activities.map(activity => JSON.stringify(activity.prompt)))));
  const unitPrompts = new Set(newer.flatMap(unit => unit.quiz.questions.map(question => JSON.stringify(question.prompt))));
  for (const assessment of written) {
    assert.equal(assessment.questions.filter(question => question.kind === "type").length, assessment.questions.length / 2);
    for (const question of assessment.questions) {
      assert.ok(question.kind === "choice" || question.kind === "type", question.id);
      assert.equal("listeningText" in question && Boolean(question.listeningText), false);
      assert.equal(lessonPrompts.has(JSON.stringify(question.prompt)), false, question.id + " new prompt");
      if (assessment.id === germanExtendedFinal.id) assert.equal(unitPrompts.has(JSON.stringify(question.prompt)), false);
    }
  }
  for (const unit of germanCourseUnits)
    assert.equal(germanExtendedFinal.questions.filter(question => question.taughtInUnitId === unit.id).length, 2);
  assert.ok(germanExtendedFinal.description.en.includes("not listening or pronunciation"));
});

const now = Date.UTC(2026, 10, 25);
function passedLegacy(): CourseProgress {
  let state = emptyCourseProgress();
  for (const unit of germanLegacyUnits) state = recordCourseAssessment(state, germanCatalog, unit.quiz.id, 5, 6, false, now);
  return state;
}

test("existing German evidence and resume survive; the old final never becomes a new final result", () => {
  const oldActivity = germanLegacyUnits[7].lessons[1].activities[0].id;
  let state = recordCourseActivity(passedLegacy(), germanCatalog, oldActivity, true, false, now + 1);
  state = recordCourseAssessment(state, germanCatalog, germanFinal.id, 14, 16, false, now + 2);
  state = setCourseResume(state, germanCatalog, "u08", "de1-u08-l2", oldActivity, now + 3);
  const parsed = parseCourseProgress(JSON.stringify(state), germanCatalog, now + 4);
  assert.deepEqual(parsed.activities, state.activities);
  assert.deepEqual(parsed.assessments, state.assessments);
  assert.deepEqual(parsed.resume, state.resume);
  assert.equal(parsed.assessments[germanFinal.id].bestIndependent, 88);
  assert.equal(parsed.assessments[germanExtendedFinal.id], undefined);
  assert.equal(canEnterCourseAssessment(germanCatalog, parsed, germanFinal.id), true);
  assert.equal(canEnterCourseAssessment(germanCatalog, parsed, germanExtendedFinal.id), false);
  assert.equal(buildCourseJourney(germanCatalog, parsed).steps.find(step => step.unit.id === "u09")?.unlocked, true);
  assert.equal(buildCourseJourney(germanCatalog, parsed).steps.find(step => step.unit.id === "u10")?.unlocked, false);
  assert.equal(germanCourseHref("en", "bilan-initial"), "/yo/langues/allemand/parcours/bilan-initial?lang=en");
});

test("new written gates need complete independent results and never invent listening evidence", () => {
  let state = passedLegacy();
  const helped = recordCourseAssessment(state, germanCatalog, newer[0].quiz.id, 6, 6, true, now + 1);
  assert.equal(buildCourseJourney(germanCatalog, helped).steps.find(step => step.unit.id === "u10")?.unlocked, false);
  for (const unit of newer) state = recordCourseAssessment(state, germanCatalog, unit.quiz.id, 5, 6, false, now + 2);
  assert.equal(canEnterCourseAssessment(germanCatalog, state, germanExtendedFinal.id), true);
  assert.deepEqual(state.activities, {}, "written checks never claim that lesson audio was played");
  const invalid = recordCourseAssessment(state, germanCatalog, germanExtendedFinal.id, 14, 16, false, now + 3);
  assert.equal(invalid.assessments[germanExtendedFinal.id], undefined, "sixteen old questions cannot stand for the new twenty-four");
  const below = recordCourseAssessment(state, germanCatalog, germanExtendedFinal.id, 19, 24, false, now + 4);
  assert.equal(below.assessments[germanExtendedFinal.id].bestIndependent, 79);
  const passed = recordCourseAssessment(below, germanCatalog, germanExtendedFinal.id, 20, 24, false, now + 5);
  assert.equal(passed.assessments[germanExtendedFinal.id].bestIndependent, 83);
  assert.deepEqual(passed.activities, {});
});

test("answer checking keeps case meaning, negation, quantities, auxiliaries and deadlines", () => {
  assert.ok(matchesGermanAnswer("  ICH HÄTTE GERN EIN HALBES KILO ÄPFEL! ", ["Ich hätte gern ein halbes Kilo Äpfel."]));
  const pairs = [
    ["Diese Jacke ist zu groß.", "Diese Jacke ist zu klein."],
    ["Meine Tasche ist blau.", "Meine Tasche ist nicht blau."],
    ["Der Schlüssel liegt auf den Tisch.", "Der Schlüssel liegt auf dem Tisch."],
    ["Wir dürfen nicht helfen.", "Wir müssen nicht helfen."],
    ["Ich habe zum Bahnhof gegangen.", "Ich bin zum Bahnhof gegangen."],
    ["Wir haben heute Brot gekauft.", "Wir haben gestern Brot gekauft."],
    ["Ich kann nicht kommen, weil ich muss arbeiten.", "Ich kann nicht kommen, weil ich arbeiten muss."],
    ["Ich kann nur vor drei Uhr.", "Ich kann erst ab drei Uhr."],
    ["Ich muss nach zwölf Uhr zurück sein.", "Ich muss vor zwölf Uhr zurück sein."],
    ["Zwei Kilo Apfel, bitte.", "Zwei Kilo Äpfel, bitte."],
    ["Masse", "Maße"],
  ];
  for (const [wrong, expected] of pairs) assert.equal(matchesGermanAnswer(wrong, [expected]), false, wrong);
  const recall = lessons.find(lesson => lesson.id === "de1-u12-l3")!.activities.find((activity): activity is Extract<ItalianActivity, { kind: "type" }> => activity.kind === "type" && !activity.listeningText)!;
  assert.ok(matchesGermanAnswer("Wir treffen uns um zehn Uhr vor der Bibliothek.", recall.accepted));
  assert.equal(matchesGermanAnswer("Wir treffen uns um zwölf Uhr vor der Bibliothek.", recall.accepted), false);
});

test("new language notes have primary sources, speech stays target-language only and cultural finale stays separate", () => {
  const ids = new Set(germanSources.map(source => source.id));
  for (const unit of newer) for (const id of unit.culture.sourceIds) assert.ok(ids.has(id), id);
  assert.equal(germanDepthSources.length, 8);
  for (const source of germanDepthSources) {
    const url = new URL(source.url);
    assert.ok(["grammis.ids-mannheim.de", "www.goethe.de"].includes(url.hostname));
    localText(source.supports, source.id);
  }
  const speech = new Set(newer.flatMap(unitSpeech));
  for (const lesson of lessons) {
    assert.ok(speech.has(lesson.reading.it));
    for (const phrase of lesson.vocabulary) assert.ok(speech.has(phrase.it));
    for (const locale of locales) assert.equal(speech.has(lesson.grammar.body[locale]), false);
  }
  assert.ok(germanCultureFinal.unitIds.every(id => Number(id.slice(1)) <= 8));
});
