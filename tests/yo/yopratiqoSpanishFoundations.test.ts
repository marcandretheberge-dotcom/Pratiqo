import assert from "node:assert/strict";
import { test } from "node:test";
import { spanishCourseUnits as units, spanishCatalog as catalog, spanishFinal, spanishSources, getSpanishUnit } from "@/lib/yo/spanish/courseData";
import { matchesSpanishAnswer, normalizeSpanishAnswer, spanishCourseHref, SPANISH_PROGRESS_KEY } from "@/lib/yo/spanish/courseLogic";
import { emptyCourseProgress, recordCourseActivity, recordCourseAssessment, parseCourseProgress, setCourseResume, ITALIAN_COURSE_PROGRESS_KEY } from "@/lib/yo/italian/course/courseProgress";
import type { ItalianOption, LocaleText } from "@/lib/yo/italian/italianModuleTypes";

const locales = ["fr", "en", "es"] as const;
const lessons = units.flatMap((unit) => unit.lessons);
const practice = lessons.flatMap((lesson) => lesson.activities);
const assessments = [...units.map((unit) => unit.quiz), spanishFinal];
const questions = assessments.flatMap((assessment) => assessment.questions);
const unique = (values: string[], context: string) => assert.equal(new Set(values).size, values.length, context);
function localized(text: LocaleText, context: string) {
  for (const locale of locales) assert.ok(text[locale]?.trim().length > 2, `${context}/${locale}`);
}
function options(items: ItalianOption[], correctId: string, context: string) {
  unique(items.map((item) => item.id), context);
  assert.equal(items.filter((item) => item.id === correctId).length, 1, context);
  for (const locale of locales) unique(items.map((item) => item.it ?? item.label![locale]), `${context}/${locale}`);
  for (const item of items) localized(item.feedback, `${context}/feedback`);
}

test("Spanish provides a continuous 12-unit course with substantive goals, authored scenes and seven phrases per lesson", () => {
  assert.deepEqual(units.map((unit) => unit.id), Array.from({ length: 12 }, (_, i) => `u${String(i + 1).padStart(2, "0")}`));
  assert.equal(lessons.length, 36);
  assert.equal(lessons.reduce((count, lesson) => count + lesson.vocabulary.length, 0), 252);
  unique(lessons.map((lesson) => lesson.id), "lesson ids");
  unique(lessons.map((lesson) => lesson.reading.it), "36 original scenes");
  unique(lessons.map((lesson) => lesson.grammar.body.es), "36 distinct language patterns");
  unique([...practice, ...questions].map((activity) => activity.id), "no shared practice/assessment ids");
  for (const unit of units) {
    assert.equal(unit.lessons.length, 3);
    assert.equal(unit.objectives.length, 3);
    assert.equal(getSpanishUnit(unit.id), unit);
    localized(unit.production.prompt, unit.id);
    assert.ok(unit.production.model.split(/[.!?]/).filter(Boolean).length >= 3, unit.id);
    for (const lesson of unit.lessons) {
      assert.match(lesson.id, new RegExp(`^esf-${unit.id}-l0[123]$`));
      localized(lesson.goal, lesson.id);
      assert.notDeepEqual(lesson.goal, lesson.title, `goal must be an action, not title: ${lesson.id}`);
      localized(lesson.grammar.body, lesson.id);
      localized(lesson.pronunciation.body, lesson.id);
      localized(lesson.reading.meaning, lesson.id);
      assert.ok(lesson.reading.it.length > 70 && lesson.reading.it.split(/[.!?]/).filter((part) => part.trim()).length >= 2, `a scene must supply more than one fact: ${lesson.id}`);
      assert.equal(lesson.vocabulary.length, 7);
      for (const kind of ["match", "order", "choice", "listen", "type", "dialogue"]) assert.ok(lesson.activities.some((activity) => activity.kind === kind), `${lesson.id}/${kind}`);
      assert.ok(lesson.activities.some((activity) => activity.id === lesson.readingActivityId));
    }
  }
  assert.equal(getSpanishUnit("__proto__"), undefined);
  assert.equal(getSpanishUnit("u13"), undefined);
});

test("all three interfaces use real feedback and the Spanish interface does not reveal written recall answers", () => {
  for (const lesson of lessons) {
    for (const word of lesson.vocabulary) {
      localized(word.meaning, lesson.id);
      assert.notEqual(normalizeSpanishAnswer(word.meaning.es), normalizeSpanishAnswer(word.it), `Spanish matching needs a paraphrase: ${word.it}`);
    }
    for (const activity of lesson.activities) {
      localized(activity.title, activity.id);
      localized(activity.prompt, activity.id);
      localized(activity.explanation, activity.id);
      if ("options" in activity) options(activity.options, activity.correctId, activity.id);
      if (activity.kind === "order") {
        assert.equal(activity.answer.join(" "), activity.it);
        assert.equal(normalizeSpanishAnswer(activity.prompt.es).includes(normalizeSpanishAnswer(activity.it)), false, activity.id);
      }
      if (activity.kind === "type") {
        assert.ok(matchesSpanishAnswer(activity.model, activity.accepted), activity.id);
        if (!activity.listeningText) for (const locale of locales) {
          assert.equal(normalizeSpanishAnswer(activity.prompt[locale]).includes(normalizeSpanishAnswer(activity.model)), false, `${activity.id}/${locale}`);
        }
      }
    }
  }
});

test("each lesson contains two original checked dialogue turns with valid localized explanations", () => {
  const lines: string[] = [];
  const positions = new Set<number>();
  for (const lesson of lessons) {
    const dialogue = lesson.activities.find((activity) => activity.kind === "dialogue");
    assert.equal(dialogue?.kind, "dialogue");
    if (dialogue?.kind !== "dialogue") throw new Error(lesson.id);
    assert.equal(dialogue.turns.length, 2, lesson.id);
    for (const turn of dialogue.turns) {
      assert.ok(turn.speaker && turn.line.trim().length > 2, lesson.id);
      localized(turn.prompt, lesson.id);
      options(turn.options, turn.correctId, lesson.id);
      lines.push(turn.line);
      positions.add(turn.options.findIndex((option) => option.id === turn.correctId));
    }
  }
  assert.equal(lines.length, 72);
  assert.ok(new Set(lines).size >= 68, "dialogue scenes must not be padded with a repeated script");
  assert.equal(positions.size, 3, "correct dialogue replies do not always occupy the same slot");
});

test("all unit and cumulative gates are new written tasks that can be completed without a recording", () => {
  assert.equal(questions.length, 96);
  assert.equal(spanishFinal.id, "esf-final");
  assert.equal(spanishFinal.questions.length, 24);
  assert.deepEqual(spanishFinal.unitIds, units.map((unit) => unit.id));
  const practicePrompts = new Set(practice.map((activity) => activity.prompt.es));
  const checkpointPrompts = new Set(units.flatMap((unit) => unit.quiz.questions.map((question) => question.prompt.es)));
  const previousModels = new Set([...practice, ...units.flatMap((unit) => unit.quiz.questions)].flatMap((activity) => activity.kind === "type" ? [normalizeSpanishAnswer(activity.model)] : []));
  for (const unit of units) {
    assert.equal(unit.quiz.questions.length, 6, unit.id);
    assert.equal(unit.quiz.questions.filter((question) => question.kind === "type").length, 3, unit.id);
    assert.equal(spanishFinal.questions.filter((question) => question.taughtInUnitId === unit.id).length, 2, unit.id);
  }
  for (const assessment of assessments) {
    assert.equal(assessment.passPercent, 80);
    for (const question of assessment.questions) {
      assert.ok(question.kind === "choice" || question.kind === "type", question.id);
      assert.equal("listeningText" in question, false, question.id);
      assert.equal("stimulus" in question, false, question.id);
      assert.ok(getSpanishUnit(question.taughtInUnitId!), question.id);
      assert.equal(practicePrompts.has(question.prompt.es), false, `not a copied practice prompt: ${question.id}`);
      localized(question.prompt, question.id);
      localized(question.explanation, question.id);
      if (question.kind === "type") {
        assert.ok(matchesSpanishAnswer(question.model, question.accepted), question.id);
        assert.equal(normalizeSpanishAnswer(question.prompt.es).includes(normalizeSpanishAnswer(question.model)), false, question.id);
      } else options(question.options, question.correctId, question.id);
    }
  }
  for (const question of spanishFinal.questions) {
    assert.equal(checkpointPrompts.has(question.prompt.es), false, `final must introduce another context: ${question.id}`);
    if (question.kind === "type") assert.equal(previousModels.has(normalizeSpanishAnswer(question.model)), false, `final written target must transfer a new detail: ${question.id}`);
  }
});

test("Spanish answer checking preserves meaning, accents, ñ, negation and explicitly accepted alternatives", () => {
  assert.ok(matchesSpanishAnswer("  ¿DÓNDE está LA biblioteca?  ", ["¿Dónde está la biblioteca?"]));
  assert.ok(matchesSpanishAnswer("man\u0303ana", ["mañana"]));
  assert.ok(matchesSpanishAnswer("cafe\u0301", ["café"]));
  for (const [wrong, right] of [["si", "sí"], ["tu", "tú"], ["esta", "está"], ["ano", "año"], ["visite", "visité"], ["gusto", "gustó"], ["Quiero azúcar", "No quiero azúcar"], ["Voy a llegar cinco minutos tarde", "Voy a llegar diez minutos tarde"]]) {
    assert.equal(matchesSpanishAnswer(wrong, [right]), false, `${wrong} / ${right}`);
  }
  const recall = questions.find((question) => question.id === "esf-u03-q04");
  assert.equal(recall?.kind, "type");
  if (recall?.kind === "type") {
    assert.ok(matchesSpanishAnswer("Después del banco, gira a la derecha.", recall.accepted));
    assert.equal(matchesSpanishAnswer("Después del banco, gira a la izquierda.", recall.accepted), false);
  }
  assert.equal(matchesSpanishAnswer("", [""]), false);
});

test("new Spanish IDs integrate with existing bounded progress without accepting foreign course evidence or partial finals", () => {
  assert.equal(SPANISH_PROGRESS_KEY, "yopratiqo:spanish-foundations:v1");
  assert.notEqual(SPANISH_PROGRESS_KEY, ITALIAN_COURSE_PROGRESS_KEY);
  assert.equal(spanishCourseHref("en", "u12"), "/yo/langues/espagnol/parcours/u12?lang=en");
  assert.equal(spanishCourseHref("unknown"), "/yo/langues/espagnol/parcours?lang=fr");
  const stamp = 1800000000000;
  const fresh = emptyCourseProgress(stamp);
  assert.equal(recordCourseActivity(fresh, catalog, "ptbr1-u01-l1-write", true, false, stamp + 1), fresh);
  assert.equal(recordCourseAssessment(fresh, catalog, "esf-final", 1, 1, false, stamp + 2), fresh);
  const assisted = recordCourseAssessment(fresh, catalog, "esf-u01-quiz", 6, 6, true, stamp + 3);
  assert.equal(assisted.assessments["esf-u01-quiz"].bestIndependent, null);
  const passed = recordCourseAssessment(assisted, catalog, "esf-u01-quiz", 5, 6, false, stamp + 4);
  assert.equal(passed.assessments["esf-u01-quiz"].bestIndependent, 83);
  const lastLesson = units[11].lessons[2];
  const resumed = setCourseResume(passed, catalog, "u12", lastLesson.id, lastLesson.activities[4].id, stamp + 5);
  const restored = parseCourseProgress(JSON.stringify(resumed), catalog, stamp + 10);
  assert.deepEqual(restored.resume, resumed.resume);
  assert.deepEqual(restored.assessments, resumed.assessments);
  assert.equal(Object.keys(restored.activities).length, 0, "a quiz does not fabricate practice completions");
  assert.equal(catalog.assessments.length, 13);
});

test("regional encounters have primary references and production remains distinct from certification", () => {
  unique(spanishSources.map((source) => source.id), "source ids");
  const ids = new Set(spanishSources.map((source) => source.id));
  for (const source of spanishSources) {
    assert.match(source.url, /^https:\/\/(?:www\.rae\.es|dle\.rae\.es|cervantes\.org)\//);
    localized(source.supports, source.id);
  }
  for (const unit of units) {
    localized(unit.culture.body, unit.id);
    for (const id of unit.culture.sourceIds) assert.ok(ids.has(id), `${unit.id}/${id}`);
  }
  assert.match(units[0].culture.body.es, /vos/);
  assert.match(units[6].culture.body.es, /tenés/);
  assert.match(units[7].culture.body.es, /boleto.*billete.*pasaje/);
  assert.match(spanishFinal.description.es, /no certifica un nivel/);
  assert.match(units[11].culture.body.es, /no certifica un nivel del MCER/);
});
