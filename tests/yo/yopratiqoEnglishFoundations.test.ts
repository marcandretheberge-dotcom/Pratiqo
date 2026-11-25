import assert from "node:assert/strict";
import { test } from "node:test";
import { englishCatalog, englishCourseUnits, englishFinal, englishSources, getEnglishUnit } from "@/lib/yo/english/courseData";
import { ENGLISH_PROGRESS_KEY, englishCourseHref, matchesEnglishAnswer, normalizeEnglishAnswer } from "@/lib/yo/english/courseLogic";
import { buildCourseJourney, canEnterCourseAssessment } from "@/lib/yo/courseJourney";
import { emptyCourseProgress, getDueActivityIds, ITALIAN_COURSE_PROGRESS_KEY, parseCourseProgress, recordCourseActivity, recordCourseAssessment, serializeCourseProgress, setCourseResume } from "@/lib/yo/italian/course/courseProgress";
import { distinctSpeech, unitSpeech } from "@/lib/yo/italian/course/courseSpeech";
import type { ItalianActivity, LocaleText } from "@/lib/yo/italian/italianModuleTypes";

const locales = ["fr", "en", "es"] as const;
const lessons = englishCourseUnits.flatMap(unit => unit.lessons);
const practice = lessons.flatMap(lesson => lesson.activities);
const assessments = [...englishCourseUnits.map(unit => unit.quiz), englishFinal];
const questions = assessments.flatMap(assessment => assessment.questions);
const unique = (values: readonly string[], context: string) => assert.equal(new Set(values).size, values.length, context);
const localized = (value: LocaleText, context: string) => {
  for (const locale of locales) assert.ok(value[locale]?.trim(), `${context} / ${locale}`);
};
const getPractice = (id: string) => {
  const activity = practice.find(item => item.id === id);
  assert.ok(activity, id);
  return activity;
};

test("English has twelve substantive units, thirty-six distinct lessons and an original dialogue in each", () => {
  assert.equal(englishCourseUnits.length, 12);
  assert.equal(lessons.length, 36);
  assert.equal(practice.length, 252);
  assert.equal(new Set(lessons.flatMap(lesson => lesson.vocabulary.map(phrase => phrase.it))).size, 252);
  unique([...lessons.map(lesson => lesson.id), ...practice.map(item => item.id), ...questions.map(item => item.id), ...assessments.map(item => item.id)], "stable content IDs");
  for (const [index, unit] of englishCourseUnits.entries()) {
    assert.equal(unit.id, `u${String(index + 1).padStart(2, "0")}`);
    assert.equal(unit.number, index + 1);
    assert.equal(unit.lessons.length, 3);
    assert.equal(unit.quiz.questions.length, 6);
    assert.equal(unit.quiz.questions.filter(item => item.kind === "type").length, 3);
    assert.equal(unit.objectives.length, 3);
    assert.equal(unit.production.rubric.length, 3);
    assert.ok(unit.production.model.length > 60);
    assert.deepEqual(unit.lessons.map(lesson => lesson.id), [1, 2, 3].map(n => `enf-${unit.id}-l${n}`));
    for (const lesson of unit.lessons) {
      assert.equal(lesson.vocabulary.length, 7);
      assert.ok(lesson.reading.it.split(/\s+/).length >= 20, lesson.id);
      assert.ok(lesson.grammar.body.en.length >= 120, lesson.id);
      assert.ok(lesson.goal.en.length >= 35, lesson.id);
      assert.ok(lesson.activities.some(item => item.id === lesson.readingActivityId && item.kind === "choice"));
      for (const kind of ["match", "order", "choice", "listen", "type", "dialogue"]) assert.ok(lesson.activities.some(item => item.kind === kind), `${lesson.id}/${kind}`);
      const dialogue = lesson.activities.find(item => item.kind === "dialogue");
      assert.ok(dialogue?.kind === "dialogue");
      assert.equal(dialogue.turns.length, 3);
      unique(dialogue.turns.map(turn => turn.line), lesson.id);
    }
  }
});

test("every user-facing content field is populated in FR, EN and ES and serializes across the route boundary", () => {
  const root = { englishCourseUnits, englishCatalog, englishFinal, englishSources };
  const walk = (value: unknown, label: string) => {
    if (!value || typeof value !== "object") return;
    if ("fr" in value || "en" in value || "es" in value) localized(value as LocaleText, label);
    for (const [key, child] of Object.entries(value)) walk(child, `${label}.${key}`);
  };
  walk(root, "English");
  assert.deepEqual(JSON.parse(JSON.stringify(root)), root);
  assert.equal(getEnglishUnit("u12"), englishCourseUnits[11]);
  assert.equal(getEnglishUnit("u13"), undefined);
  assert.equal(getEnglishUnit("__proto__"), undefined);
});

test("authored choices and dialogues have one target, distinct options and relevant localized explanations", () => {
  const positions = new Set<number>();
  const check = (activity: ItalianActivity) => {
    localized(activity.prompt, activity.id);
    localized(activity.explanation, activity.id);
    if ("options" in activity) {
      unique(activity.options.map(option => option.id), activity.id);
      assert.equal(activity.options.filter(option => option.id === activity.correctId).length, 1, activity.id);
      for (const locale of locales) unique(activity.options.map(option => option.it ?? option.label![locale]), `${activity.id}/${locale}`);
      for (const option of activity.options) localized(option.feedback, `${activity.id}/${option.id}`);
      positions.add(activity.options.findIndex(option => option.id === activity.correctId));
    }
    if (activity.kind === "dialogue") for (const turn of activity.turns) {
      localized(turn.prompt, activity.id);
      assert.equal(turn.options.filter(option => option.id === turn.correctId).length, 1, activity.id);
      unique(turn.options.map(option => option.id), activity.id);
      unique(turn.options.map(option => option.it!), activity.id);
      for (const option of turn.options) localized(option.feedback, `${activity.id}/${option.id}`);
    }
    if (activity.kind === "type") {
      assert.ok(activity.model.length <= 160, activity.id);
      assert.ok(matchesEnglishAnswer(activity.model, activity.accepted), activity.id);
      for (const accepted of activity.accepted) assert.ok(accepted.trim(), activity.id);
      unique(activity.accepted.map(normalizeEnglishAnswer), `${activity.id} accepted variants`);
    }
  };
  for (const activity of [...practice, ...questions]) check(activity);
  assert.equal(positions.size, 3);
});

test("same-language English UI uses paraphrases and intentions instead of exposing recall answers", () => {
  for (const activity of [...practice, ...questions]) {
    if (activity.kind === "match") {
      for (const pair of activity.pairs) assert.notEqual(normalizeEnglishAnswer(pair.it), normalizeEnglishAnswer(pair.meaning.en), `${activity.id}: ${pair.it}`);
      unique(activity.pairs.map(pair => normalizeEnglishAnswer(pair.meaning.en)), activity.id);
    }
    if (activity.kind === "type" && !activity.listeningText) for (const locale of locales) {
      assert.equal(normalizeEnglishAnswer(activity.prompt[locale]).includes(normalizeEnglishAnswer(activity.model)), false, `${activity.id}/${locale}`);
    }
    if (activity.kind === "order") for (const locale of locales) {
      assert.equal(normalizeEnglishAnswer(activity.prompt[locale]).includes(normalizeEnglishAnswer(activity.it)), false, `${activity.id}/${locale}`);
    }
  }
});

test("all 96 checkpoint questions are independently authored written tasks, with a final pair for each unit", () => {
  assert.equal(questions.length, 96);
  assert.equal(englishFinal.questions.length, 24);
  assert.deepEqual(englishFinal.unitIds, englishCourseUnits.map(unit => unit.id));
  const signatures = (items: ItalianActivity[]) => items.map(item => `${item.kind}:${item.prompt.en}`);
  unique(signatures([...practice, ...questions].filter(item => item.kind !== "match" && item.kind !== "listen" && !item.id.endsWith("-dictation") && item.kind !== "dialogue")), "assessment prompts must not be renamed lesson clones");
  for (const question of questions) {
    assert.ok(question.kind === "choice" || question.kind === "type", question.id);
    if (question.kind === "type") assert.equal(question.listeningText, undefined, question.id);
    assert.ok(englishCourseUnits.some(unit => unit.id === question.taughtInUnitId), question.id);
  }
  for (const unit of englishCourseUnits) assert.equal(englishFinal.questions.filter(question => question.taughtInUnitId === unit.id).length, 2);
  assert.match(englishFinal.description.en, /not an official level, listening or pronunciation assessment/);
  assert.match(englishCourseUnits[11].culture.body.en, /not the 12 CLB levels/);
});

test("written assessment gates can be completed without fabricating any listening completion or assisted score", () => {
  const now = Date.UTC(2026, 10, 25);
  let state = emptyCourseProgress();
  const first = englishCourseUnits[0].quiz;
  assert.equal(canEnterCourseAssessment(englishCatalog, state, first.id), true);
  assert.equal(canEnterCourseAssessment(englishCatalog, state, englishFinal.id), false);
  state = recordCourseAssessment(state, englishCatalog, first.id, 6, 6, true, now);
  assert.equal(buildCourseJourney(englishCatalog, state).steps[1].unlocked, false);
  assert.equal(state.assessments[first.id].bestIndependent, null);
  state = recordCourseAssessment(state, englishCatalog, first.id, 4, 6, false, now + 1);
  assert.equal(buildCourseJourney(englishCatalog, state).steps[1].unlocked, false);
  for (const [index, unit] of englishCourseUnits.entries()) {
    assert.equal(canEnterCourseAssessment(englishCatalog, state, unit.quiz.id), true, unit.id);
    state = recordCourseAssessment(state, englishCatalog, unit.quiz.id, 5, 6, false, now + index + 2);
  }
  assert.equal(buildCourseJourney(englishCatalog, state).passedCount, 12);
  assert.equal(canEnterCourseAssessment(englishCatalog, state, englishFinal.id), true);
  assert.deepEqual(state.activities, {});
  const ignored = recordCourseAssessment(state, englishCatalog, englishFinal.id, 19, 19, false, now + 40);
  assert.equal(ignored, state, "partial totals must not pass the final");
  state = recordCourseAssessment(state, englishCatalog, englishFinal.id, 19, 24, false, now + 41);
  assert.equal(state.assessments[englishFinal.id].bestIndependent, 79);
  state = recordCourseAssessment(state, englishCatalog, englishFinal.id, 20, 24, false, now + 42);
  assert.equal(state.assessments[englishFinal.id].bestIndependent, 83);
  assert.deepEqual(state.activities, {}, "written achievement must not fabricate listening results");
});

test("English answer checking keeps negation and ownership while accepting authored variants", () => {
  assert.equal(matchesEnglishAnswer("  I’M FROM OTTAWA!  ", ["I'm from Ottawa."]), true);
  assert.equal(matchesEnglishAnswer("I can help.", ["I can't help."]), false);
  assert.equal(matchesEnglishAnswer("I don't like music.", ["I like music."]), false);
  assert.equal(matchesEnglishAnswer("Its her bag.", ["It's her bag."]), false);
  assert.equal(matchesEnglishAnswer("...", ["..."]), false);
  const practiceQuestion = getPractice("enf-u06-l3-write");
  assert.ok(practiceQuestion.kind === "type");
  assert.equal(matchesEnglishAnswer("How often do you practice?", practiceQuestion.accepted), true);
  assert.equal(matchesEnglishAnswer("How long do you practise?", practiceQuestion.accepted), false);
  for (const [id, variant] of [["enf-u05-l2-write", "Is there wifi?"], ["enf-u12-l2-write", "Can we meet at the cafe instead?"], ["enf-u07-l3-write", "Sorry, I cannot."]] as const) {
    const question = getPractice(id);
    assert.ok(question.kind === "type");
    assert.equal(matchesEnglishAnswer(variant, question.accepted), true, id);
  }
});

test("English progress and resume remain local to their catalog and missed practice enters actual review", () => {
  assert.equal(ENGLISH_PROGRESS_KEY, "yopratiqo:english-foundations:v1");
  assert.notEqual(ENGLISH_PROGRESS_KEY, ITALIAN_COURSE_PROGRESS_KEY);
  const now = Date.UTC(2026, 10, 25), activity = getPractice("enf-u01-l1-write");
  let state = recordCourseActivity(emptyCourseProgress(), englishCatalog, activity.id, false, false, now);
  assert.deepEqual(getDueActivityIds(state, englishCatalog, now + 1), [activity.id]);
  state = recordCourseActivity(state, englishCatalog, activity.id, true, true, now + 2);
  assert.equal(state.activities[activity.id].independent, false);
  state = setCourseResume(state, englishCatalog, "u01", "enf-u01-l1", activity.id, now + 3);
  const restored = parseCourseProgress(serializeCourseProgress(state), englishCatalog, now + 4);
  assert.equal(restored.resume?.activityId, activity.id);
  assert.equal(restored.activities[activity.id].attempts, 2);
  assert.equal(recordCourseActivity(restored, englishCatalog, "de1-u01-l1-write", true, false, now + 5), restored);
  assert.deepEqual(getDueActivityIds(restored, englishCatalog, now + 4), []);
  assert.deepEqual(getDueActivityIds(restored, englishCatalog, now + 2 * 86400000), [activity.id]);
});

test("speech collection uses only authored target material and sources are specific primary references", () => {
  const spoken = new Set(distinctSpeech(englishCourseUnits.flatMap(unitSpeech)));
  for (const lesson of lessons) {
    assert.ok(spoken.has(lesson.reading.it), lesson.id);
    assert.equal(spoken.has(lesson.grammar.body.en), false, lesson.id);
    assert.equal(spoken.has(lesson.reading.meaning.fr), false, lesson.id);
    for (const phrase of lesson.vocabulary) assert.ok(spoken.has(phrase.it), phrase.it);
    const dialogue = lesson.activities.find(item => item.kind === "dialogue");
    assert.ok(dialogue?.kind === "dialogue");
    for (const turn of dialogue.turns) assert.ok(spoken.has(turn.line), turn.line);
  }
  unique(englishSources.map(source => source.id), "source IDs");
  for (const source of englishSources) assert.ok(["www.canada.ca", "our-languages.canada.ca", "learnenglish.britishcouncil.org"].includes(new URL(source.url).hostname));
  for (const unit of englishCourseUnits) for (const id of unit.culture.sourceIds) assert.ok(englishSources.some(source => source.id === id));
  for (const locale of locales) assert.equal(englishCourseHref(locale, "u12"), `/yo/langues/anglais/parcours/u12?lang=${locale}`);
  assert.equal(englishCourseHref("xx"), "/yo/langues/anglais/parcours?lang=fr");
});
