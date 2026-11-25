import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { test } from "node:test";
import * as React from "react";
import PortugueseUnitPage, { generateMetadata } from "@/app/yo/langues/portugais-bresil/parcours/[unitId]/page";
import {
  portugueseLegacyUnits, portugueseCourseUnits, portugueseFinal,
  portugueseExtendedFinal, portugueseCultureFinal, portugueseCatalog, portugueseSources, getPortugueseUnit,
} from "@/lib/yo/portuguese/courseData";
import { portugueseAudioPaths, portugueseUnitSpeech } from "@/lib/yo/portuguese/courseAudio.server";
import { portuguesePublishedAudio } from "@/lib/yo/portuguese/courseAudioPublished";
import { matchesPortugueseAnswer, normalizePortugueseAnswer, PORTUGUESE_PROGRESS_KEY, portugueseCourseHref } from "@/lib/yo/portuguese/courseLogic";
import {
  emptyCourseProgress, markCourseProduction, parseCourseProgress, recordCourseActivity,
  recordCourseAssessment, serializeCourseProgress, setCourseResume,
} from "@/lib/yo/italian/course/courseProgress";
import { buildCourseJourney, canEnterCourseAssessment } from "@/lib/yo/courseJourney";
import type { CourseAssessment, CourseCatalog, CourseQuestion, CourseUnit, LocaleText } from "@/lib/yo/italian/course/courseTypes";
import type { ItalianActivity } from "@/lib/yo/italian/italianModuleTypes";

Object.defineProperty(globalThis, "React", { value: React, configurable: true });
const depth = portugueseCourseUnits.slice(8), lessons = depth.flatMap(unit => unit.lessons);
const practice = lessons.flatMap(lesson => lesson.activities);
const questions = [...depth.flatMap(unit => unit.quiz.questions), ...portugueseExtendedFinal.questions];
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const unique = (values: string[], label: string) => assert.equal(new Set(values).size, values.length, label);
function localized(value: LocaleText, label: string) {
  for (const locale of ["fr", "en", "es"] as const) assert.ok(value[locale]?.trim(), label + ":" + locale);
}

test("the eight historical units, 16-question final and eight cultural questions remain byte-equivalent data", () => {
  assert.equal(portugueseLegacyUnits.length, 8);
  assert.equal(fingerprint(portugueseLegacyUnits), "f1549169496ca024718679d9aed22e5a92464bfa6d79298bc6290018f3543368");
  assert.equal(fingerprint(portugueseFinal), "b6dcdcd3383f38c4759fb9fcae15aba99d02b7e2f07acf47956eec8afbea2155");
  assert.equal(fingerprint(portugueseCultureFinal), "7bc3c1851e48a106a2cdb4ba81d9024372b57e165e869931e331631669c53493");
  assert.deepEqual(portugueseCourseUnits.slice(0, 8), portugueseLegacyUnits);
  assert.equal(PORTUGUESE_PROGRESS_KEY, "yopratiqo:portuguese-br-course:beginner:v1");
  assert.equal(portugueseFinal.id, "ptbr1-final");
  assert.equal(portugueseFinal.questions.length, 16);
  assert.equal(portugueseExtendedFinal.id, "ptbr1-foundations-final");
  assert.equal(portugueseCultureFinal.questions.length, 8);
  assert.equal(portugueseCatalog.assessments.find(item => item.id === portugueseFinal.id)?.questionCount, 16);
  assert.equal(portugueseCatalog.assessments.find(item => item.id === portugueseExtendedFinal.id)?.questionCount, 24);
});

test("four added units contain twelve substantive lessons with original goals, scenes and seven expressions each", () => {
  assert.equal(portugueseCourseUnits.length, 12);
  assert.equal(portugueseCourseUnits.flatMap(unit => unit.lessons).length, 36);
  assert.deepEqual(depth.map(unit => unit.id), ["u09", "u10", "u11", "u12"]);
  assert.equal(lessons.length, 12);
  assert.equal(practice.length, 84);
  const words = lessons.flatMap(lesson => lesson.vocabulary.map(word => normalizePortugueseAnswer(word.it)));
  unique(words, "84 distinct vocabulary expressions");
  assert.equal(words.length, 84);
  unique(lessons.map(lesson => lesson.reading.it), "all twelve scenes differ");
  unique(lessons.map(lesson => lesson.goal.en), "all twelve communicative goals differ");
  unique(lessons.map(lesson => lesson.grammar.body.en), "all twelve pattern explanations differ");
  for (const unit of depth) {
    assert.equal(unit.lessons.length, 3);
    assert.equal(unit.cultureStop, undefined, "new units do not invent historical cultural photos");
    assert.equal(unit.production.rubric.length, 3);
    localized(unit.production.prompt, unit.id);
    assert.ok(unit.production.model.length > 100);
    for (const lesson of unit.lessons) {
      assert.match(lesson.id, new RegExp("^ptbr1-" + unit.id + "-l[123]$"));
      assert.equal(lesson.vocabulary.length, 7);
      localized(lesson.goal, lesson.id);
      localized(lesson.grammar.body, lesson.id);
      localized(lesson.pronunciation.body, lesson.id);
      localized(lesson.reading.meaning, lesson.id);
      assert.ok(lesson.reading.it.split(/\s+/).length >= 25, lesson.id + " has a connected scene");
      assert.ok(lesson.activities.some(item => item.kind === "choice" && item.id === lesson.readingActivityId));
      for (const kind of ["match", "order", "choice", "listen", "type", "dialogue"]) assert.ok(lesson.activities.some(item => item.kind === kind), lesson.id + ":" + kind);
    }
  }
});

test("every added dialogue has three checked turns, distinct options and actionable localized feedback", () => {
  const dialogues = practice.filter(item => item.kind === "dialogue");
  assert.equal(dialogues.length, 12);
  const lines: string[] = [];
  for (const dialogue of dialogues) {
    assert.equal(dialogue.turns.length, 3, dialogue.id);
    for (const turn of dialogue.turns) {
      lines.push(turn.line);
      assert.ok(turn.speaker && turn.line);
      localized(turn.prompt, dialogue.id);
      unique(turn.options.map(option => option.id), dialogue.id + " option IDs");
      unique(turn.options.map(option => option.it!), dialogue.id + " option meanings");
      const correct = turn.options.find(option => option.id === turn.correctId);
      assert.ok(correct?.it);
      for (const option of turn.options) for (const locale of ["fr", "en", "es"] as const) {
        assert.ok(option.feedback[locale].includes(option.it!), "feedback identifies the learner's chosen reply");
        assert.ok(option.feedback[locale].includes(correct.it), "feedback identifies the intended reply");
      }
    }
  }
  unique(lines, "the 36 dialogue turns are authored independently");
  unique([...portugueseCourseUnits.flatMap(unit => unit.lessons.flatMap(lesson => lesson.activities.map(item => item.id))),
    ...portugueseCourseUnits.flatMap(unit => unit.quiz.questions.map(question => question.id)),
    ...portugueseFinal.questions.map(question => question.id), ...portugueseExtendedFinal.questions.map(question => question.id),
    ...portugueseCultureFinal.questions.map(question => question.id)], "all practice and assessment IDs remain distinct");
});

test("24 unit questions and 24 cumulative questions are new written transfers without audio gates or answer leaks", () => {
  assert.equal(depth.flatMap(unit => unit.quiz.questions).length, 24);
  assert.equal(portugueseExtendedFinal.questions.length, 24);
  assert.deepEqual(portugueseExtendedFinal.unitIds, portugueseCourseUnits.map(unit => unit.id));
  const historicalPractice = portugueseCourseUnits.flatMap(unit => unit.lessons.flatMap(lesson => lesson.activities));
  const practiceModels = new Set(historicalPractice.flatMap(item => item.kind === "type" ? [normalizePortugueseAnswer(item.model)] : []));
  const withoutIds = (item: ItalianActivity | CourseQuestion) => {
    const { id: _id, ...body } = item;
    void _id;
    const value = { ...body } as Record<string, unknown>;
    delete value.taughtInUnitId;
    return JSON.stringify(value);
  };
  const practiceBodies = new Set(historicalPractice.map(withoutIds));
  unique(questions.map(question => question.prompt.en), "questions do not recycle the same prompt");
  unique(questions.map(withoutIds), "questions are not copies with new identifiers");
  for (const unit of depth) {
    assert.equal(unit.quiz.questions.length, 6);
    assert.equal(unit.quiz.questions.filter(question => question.kind === "type").length, 3);
    assert.deepEqual(unit.quiz.unitIds, [unit.id]);
  }
  for (const unit of portugueseCourseUnits) assert.equal(portugueseExtendedFinal.questions.filter(question => question.taughtInUnitId === unit.id).length, 2);
  for (const question of questions) {
    assert.ok(!practiceBodies.has(withoutIds(question)), question.id + " is not relabelled practice");
    assert.ok(question.kind === "choice" || question.kind === "type");
    assert.equal("listeningText" in question && Boolean(question.listeningText), false);
    assert.equal("photo" in question && Boolean(question.photo), false);
    localized(question.prompt, question.id); localized(question.explanation, question.id);
    if (question.kind === "type") {
      assert.ok(matchesPortugueseAnswer(question.model, question.accepted));
      assert.ok(!practiceModels.has(normalizePortugueseAnswer(question.model)), question.id + " recombines the learned wording");
      for (const locale of ["fr", "en", "es"] as const) assert.equal(normalizePortugueseAnswer(question.prompt[locale]).includes(normalizePortugueseAnswer(question.model)), false, question.id + " must not show its answer");
    } else {
      unique(question.options.map(option => option.it ?? option.label!.en), question.id);
      assert.equal(question.options.filter(option => option.id === question.correctId).length, 1);
      for (const option of question.options) localized(option.feedback, question.id);
    }
  }
  for (const lesson of lessons) for (const activity of lesson.activities) {
    const target = activity.kind === "order" ? activity.it : activity.kind === "type" && !activity.listeningText ? activity.model : null;
    if (target) for (const locale of ["fr", "en", "es"] as const) assert.equal(normalizePortugueseAnswer(activity.prompt[locale]).includes(normalizePortugueseAnswer(target)), false, activity.id + " prompt should require recall");
  }
});

test("the unchanged matcher preserves Brazilian Portuguese meaning, accents, agreement and negation", () => {
  assert.ok(matchesPortugueseAnswer("  NO\u0301S PREPARAMOS OS CONVITES! ", ["Nós preparamos os convites."]));
  assert.ok(matchesPortugueseAnswer("A GENTE PREPARA O JANTAR.", ["A gente prepara o jantar."]));
  for (const [wrong, right] of [
    ["avó", "avô"], ["pais", "país"], ["por", "pôr"], ["esta", "está"], ["e", "é"],
    ["Não funciona.", "Funciona."], ["A gente preparamos.", "A gente prepara."], ["Nós prepara.", "Nós preparamos."],
    ["Volto antes das cinco.", "Volto depois das cinco."], ["Fui ao mercado.", "Vou ao mercado."],
  ]) assert.equal(matchesPortugueseAnswer(wrong, [right]), false, wrong + " must not match " + right);
  for (const question of questions) if (question.kind === "type") for (const value of question.accepted) assert.ok(matchesPortugueseAnswer(value, question.accepted));
});

test("old progress and assessments survive expansion; prior results cannot validate the new 24-question final", () => {
  const now = 1800000000000;
  const legacyCatalog: CourseCatalog = { units: portugueseCatalog.units.slice(0, 8),
    assessments: portugueseCatalog.assessments.filter(item => item.id === portugueseFinal.id || item.id === portugueseCultureFinal.id || portugueseLegacyUnits.some(unit => unit.quiz.id === item.id)) };
  const last = portugueseLegacyUnits[7], lesson = last.lessons[2], activity = lesson.activities[0];
  let old = recordCourseActivity(emptyCourseProgress(), legacyCatalog, activity.id, true, false, now);
  old = markCourseProduction(old, legacyCatalog, last.production.id, true, now + 1);
  old = setCourseResume(old, legacyCatalog, last.id, lesson.id, activity.id, now + 2);
  for (const unit of portugueseLegacyUnits) old = recordCourseAssessment(old, legacyCatalog, unit.quiz.id, 6, 6, false, now + 3);
  old = recordCourseAssessment(old, legacyCatalog, portugueseFinal.id, 14, 16, false, now + 4);
  const before = serializeCourseProgress(old);
  let restored = parseCourseProgress(before, portugueseCatalog, now + 20);
  assert.equal(serializeCourseProgress(restored), before, "the expanded catalog preserves all historical evidence");
  assert.equal(canEnterCourseAssessment(portugueseCatalog, restored, portugueseFinal.id), true);
  assert.equal(canEnterCourseAssessment(portugueseCatalog, restored, portugueseExtendedFinal.id), false);
  const journey = buildCourseJourney(portugueseCatalog, restored);
  assert.equal(journey.steps[7].unlocked, true);
  assert.equal(journey.steps[8].unlocked, true);
  assert.equal(journey.steps[9].unlocked, false);
  assert.equal(restored.assessments[portugueseExtendedFinal.id], undefined);
  for (const unit of depth) restored = recordCourseAssessment(restored, portugueseCatalog, unit.quiz.id, 6, 6, false, now + 30);
  assert.equal(canEnterCourseAssessment(portugueseCatalog, restored, portugueseExtendedFinal.id), true);
  const wrongTotal = recordCourseAssessment(restored, portugueseCatalog, portugueseExtendedFinal.id, 16, 16, false, now + 40);
  assert.equal(wrongTotal.assessments[portugueseExtendedFinal.id], undefined, "a legacy total cannot be interpreted as the extended final");
  const assisted = recordCourseAssessment(restored, portugueseCatalog, portugueseExtendedFinal.id, 24, 24, true, now + 41);
  assert.equal(assisted.assessments[portugueseExtendedFinal.id].bestIndependent, null);
  assert.deepEqual(assisted.assessments[portugueseFinal.id], old.assessments[portugueseFinal.id]);
  const completed = recordCourseAssessment(assisted, portugueseCatalog, portugueseExtendedFinal.id, 22, 24, false, now + 42);
  assert.equal(completed.assessments[portugueseExtendedFinal.id].bestIndependent, 92);
  const resumed = setCourseResume(completed, portugueseCatalog, "u12", depth[3].lessons[2].id, depth[3].lessons[2].activities[0].id, now + 43);
  assert.equal(parseCourseProgress(serializeCourseProgress(resumed), portugueseCatalog, now + 50).resume?.unitId, "u12");
});

test("the real route selects each final independently and keeps direct lesson links and localized metadata", async () => {
  for (const [unitId, expected] of [["final", portugueseExtendedFinal], ["bilan-initial", portugueseFinal], ["culture", portugueseCultureFinal]] as const) {
    for (const lang of ["fr", "en", "es"] as const) {
      const props = { params: Promise.resolve({ unitId }), searchParams: Promise.resolve({ lang }) };
      const page = await PortugueseUnitPage(props) as React.ReactElement<{ assessment: CourseAssessment; catalog: CourseCatalog }>;
      assert.equal(page.props.assessment, expected);
      assert.equal(page.props.catalog, portugueseCatalog);
      const metadata = await generateMetadata(props);
      assert.equal(metadata.title, expected.title[lang] + " · Português do Brasil | YoPratiqo");
      assert.deepEqual(metadata.robots, { index: false, follow: false });
    }
  }
  const unit = depth[3], lesson = unit.lessons[1], activity = lesson.activities[4];
  const page = await PortugueseUnitPage({ params: Promise.resolve({ unitId: unit.id }), searchParams: Promise.resolve({ lang: "en", lesson: lesson.id, activity: activity.id }) }) as React.ReactElement<{ unit: CourseUnit; initialLessonId: string; initialActivityId: string; sources: unknown }>;
  assert.equal(page.props.unit, unit);
  assert.equal(page.props.initialLessonId, lesson.id);
  assert.equal(page.props.initialActivityId, activity.id);
  assert.equal(page.props.sources, portugueseSources);
  assert.equal(portugueseCourseHref("en", "bilan-initial"), "/yo/langues/portugais-bresil/parcours/bilan-initial?lang=en");
  assert.equal(getPortugueseUnit("u13"), undefined);
  await assert.rejects(PortugueseUnitPage({ params: Promise.resolve({ unitId: "u13" }), searchParams: Promise.resolve({}) }), /NEXT_HTTP_ERROR_FALLBACK;404/);
});

test("extension audio contains only exact published assets and the new culture notes cite primary sources", () => {
  const sourceIds = new Set(portugueseSources.map(source => source.id));
  unique(portugueseSources.map(source => source.id), "source IDs");
  for (const unit of depth) {
    const paths = portugueseAudioPaths(unit);
    for (const text of portugueseUnitSpeech(unit)) {
      const key = text.normalize("NFC").trim();
      assert.equal(paths[key], portuguesePublishedAudio[key], "missing audio stays missing: " + key);
    }
    for (const path of Object.values(paths)) {
      assert.match(path, /^\/audio\/yo\/pt-br\//);
      assert.ok(existsSync("public" + path), "a reused recording must actually exist");
    }
    for (const id of unit.culture.sourceIds) assert.ok(sourceIds.has(id), unit.id + ":" + id);
  }
  const references = portugueseSources.filter(source => source.id.startsWith("ptbr-depth-"));
  assert.equal(references.length, 4);
  for (const source of references) {
    assert.match(source.url, /^https:\/\/(?:www\.acnur\.org|acervodigital\.sme\.prefeitura\.sp\.gov\.br|www\.museudalinguaportuguesa\.org\.br|www\.gov\.br)\//);
    localized(source.supports, source.id);
  }
  assert.match(portugueseExtendedFinal.description.en, /do not.*certify a level/);
  assert.equal(depth.some(unit => Boolean(unit.cultureStop?.photo)), false);
});
