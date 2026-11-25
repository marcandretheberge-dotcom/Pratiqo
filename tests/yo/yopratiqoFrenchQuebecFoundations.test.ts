import assert from "node:assert/strict";
import { test } from "node:test";
import { frenchQuebecCourseUnits as units, frenchQuebecCatalog as catalog, frenchQuebecFinal as final, frenchQuebecSources as sources, getFrenchQuebecUnit } from "../../lib/yo/frenchQuebec/courseData";
import { FRENCH_QUEBEC_PROGRESS_KEY, frenchQuebecCourseHref, matchesFrenchQuebecAnswer as matches, normalizeFrenchQuebecAnswer as normalize } from "../../lib/yo/frenchQuebec/courseLogic";
import { emptyCourseProgress, recordCourseAssessment, parseCourseProgress, serializeCourseProgress } from "../../lib/yo/italian/course/courseProgress";
import { buildCourseJourney, canEnterCourseAssessment } from "../../lib/yo/courseJourney";
import type { ItalianActivity, ItalianOption, LocaleText } from "../../lib/yo/italian/italianModuleTypes";

const lessons = units.flatMap(unit => unit.lessons);
const practice = lessons.flatMap(lesson => lesson.activities);
const assessments = [...units.map(unit => unit.quiz), final];
const questions = assessments.flatMap(assessment => assessment.questions);
const localized = (text: LocaleText) => {
  for (const locale of ["fr", "en", "es"] as const) assert.ok(text[locale]?.trim(), locale);
};
const unique = (values: string[]) => assert.equal(new Set(values).size, values.length);
function validOptions(id: string, options: ItalianOption[], correctId: string) {
  unique(options.map(option => option.id));
  assert.equal(options.filter(option => option.id === correctId).length, 1, id);
  for (const locale of ["fr", "en", "es"] as const) unique(options.map(option => option.it ?? option.label![locale]));
  for (const option of options) localized(option.feedback);
}
function answer(id: string) {
  const question = questions.find(question => question.id === id);
  assert.ok(question, id);
  assert.ok("options" in question, id);
  return question.options.find(option => option.id === question.correctId)?.it;
}

test("Québec foundations contains twelve sequenced units with substantive original scenes", () => {
  assert.deepEqual(units.map(unit => unit.id), Array.from({ length: 12 }, (_, index) => `u${String(index + 1).padStart(2, "0")}`));
  assert.equal(lessons.length, 36);
  assert.equal(lessons.reduce((sum, lesson) => sum + lesson.vocabulary.length, 0), 216);
  unique(lessons.map(lesson => lesson.id));
  unique(lessons.map(lesson => lesson.reading.it));
  unique([...practice, ...questions].map(activity => activity.id));
  for (const unit of units) {
    assert.equal(unit.lessons.length, 3);
    assert.equal(getFrenchQuebecUnit(unit.id), unit);
    assert.equal(unit.quiz.questions.length, 6);
    assert.equal(unit.production.rubric.length, 3);
    localized(unit.production.prompt);
    for (const lesson of unit.lessons) {
      assert.match(lesson.id, new RegExp(`^frqf-${unit.id}-l[123]$`));
      assert.ok(lesson.reading.it.split(/\s+/).length >= 32, lesson.id);
      for (const text of [lesson.title, lesson.goal, lesson.reading.meaning, lesson.grammar.body, lesson.pronunciation.body]) localized(text);
      for (const phrase of lesson.vocabulary) {
        localized(phrase.meaning);
        assert.notEqual(normalize(phrase.it), normalize(phrase.meaning.fr), `${lesson.id}: FR must explain the intent instead of duplicate the target`);
      }
      assert.ok(lesson.activities.some(activity => activity.id === lesson.readingActivityId));
      for (const kind of ["match", "order", "choice", "listen", "type", "dialogue"]) assert.ok(lesson.activities.some(activity => activity.kind === kind), `${lesson.id}:${kind}`);
      const dialogue = lesson.activities.find(activity => activity.kind === "dialogue");
      assert.equal(dialogue?.turns.length, 4, lesson.id);
    }
  }
  assert.equal(getFrenchQuebecUnit("u13"), undefined);
});

test("all choices, interactive dialogue turns and typed models have a valid single target", () => {
  const positions = new Set<number>();
  for (const activity of [...practice, ...questions] as ItalianActivity[]) {
    for (const text of [activity.title, activity.prompt, activity.explanation, activity.hint, activity.hint2]) localized(text);
    if ("options" in activity) {
      validOptions(activity.id, activity.options, activity.correctId);
      positions.add(activity.options.findIndex(option => option.id === activity.correctId));
    }
    if (activity.kind === "type") {
      assert.ok(matches(activity.model, activity.accepted), activity.id);
      if (!activity.listeningText) assert.ok(!normalize(activity.prompt.fr).includes(normalize(activity.model)), `${activity.id}: complete target leaked in FR prompt`);
    }
    if (activity.kind === "order") assert.equal(activity.answer.join(" "), activity.it);
    if (activity.kind === "dialogue") {
      for (const turn of activity.turns) {
        assert.ok(turn.speaker && turn.line);
        localized(turn.prompt);
        validOptions(activity.id, turn.options, turn.correctId);
      }
    }
  }
  assert.deepEqual([...positions].sort(), [0, 1, 2]);
});

test("written checkpoints and final use new contexts and never require an audio transcript", () => {
  assert.equal(questions.length, 96);
  assert.equal(final.questions.length, 24);
  const practicePrompts = new Set(practice.map(activity => activity.prompt.fr));
  const practiceIds = new Set(practice.map(activity => activity.id));
  unique(questions.map(question => question.prompt.fr));
  for (const question of questions) {
    assert.ok(question.kind === "choice" || question.kind === "type", question.id);
    assert.ok(!("listeningText" in question) || !question.listeningText, question.id);
    assert.ok(!practiceIds.has(question.id));
    assert.ok(!practicePrompts.has(question.prompt.fr), question.id);
    assert.ok(units.some(unit => unit.id === question.taughtInUnitId));
    if (question.kind === "choice") assert.ok(question.stimulus?.trim(), question.id);
    if (question.kind === "choice") for (const choice of question.options.filter(option => option.id !== question.correctId)) {
      assert.ok(choice.feedback.fr.includes(question.explanation.fr), `${question.id}: wrong-answer feedback must itself explain the correction`);
      assert.ok(choice.feedback.fr.includes(question.options.find(option => option.id === question.correctId)!.it!));
    }
  }
  for (const unit of units) assert.equal(final.questions.filter(question => question.taughtInUnitId === unit.id).length, 2);
  assert.match(final.description.en, /written/);
  assert.match(final.description.en, /does not certify listening/);
});

test("independent written evidence unlocks the next unit without media, assisted success does not", () => {
  const empty = emptyCourseProgress(0);
  assert.equal(buildCourseJourney(catalog, empty).steps[1].unlocked, false);
  const assisted = recordCourseAssessment(empty, catalog, "frqf-u01-quiz", 6, 6, true, 1000);
  assert.equal(buildCourseJourney(catalog, assisted).steps[1].unlocked, false);
  const independent = recordCourseAssessment(empty, catalog, "frqf-u01-quiz", 5, 6, false, 1000);
  assert.equal(buildCourseJourney(catalog, independent).steps[1].unlocked, true);
  assert.equal(independent.assessments["frqf-u01-quiz"].bestIndependent, 83);
  let all = empty;
  for (const unit of units) all = recordCourseAssessment(all, catalog, unit.quiz.id, 5, 6, false, 2000);
  assert.ok(canEnterCourseAssessment(catalog, all, "frqf-final"));
  assert.deepEqual(parseCourseProgress(serializeCourseProgress(all), catalog, 3000), all);
});

test("transfer answers preserve quantities, order, negation, deadlines and regional meal context", () => {
  for (const [id, expected] of [
    ["frqf-u02-q3", "À seize heures."],
    ["frqf-u03-q2", "Sept dollars."],
    ["frqf-u04-q3", "Au café à douze heures."],
    ["frqf-u05-q2", "Rester dans le bus encore un arrêt."],
    ["frqf-u06-q1", "Vendredi à onze heures."],
    ["frqf-u06-q4", "Une heure plus tôt."],
    ["frqf-u08-q3", "Six cahiers."],
    ["frqf-u09-q4", "Le jour."],
    ["frqf-final-u06-1", "Jeudi à quinze heures."],
    ["frqf-final-u10-1", "La visite A."],
    ["frqf-final-u11-1", "Changer le jour en gardant dix heures."],
  ]) assert.equal(answer(id), expected, id);
  const replay = units[7].lessons[2].activities.find(activity => activity.kind === "listen");
  assert.ok(replay && replay.kind === "listen");
  assert.match(replay.stimulus!, /pas encore terminé/);
  const correct = replay.options.find(option => option.id === replay.correctId);
  assert.match(correct?.label?.fr ?? "", /reste à faire/);
});

test("French matcher accepts typography without erasing accents, negation or word boundaries", () => {
  assert.ok(matches("  «JE M’APPELLE ZOÉ !»  ", ["Je m’appelle Zoé."]));
  assert.ok(matches("Je m'appelle Zoe\u0301", ["Je m’appelle Zoé."]));
  assert.ok(matches("Jʼai perdu mon sac", ["J’ai perdu mon sac."]));
  assert.ok(matches("Je voudrais le reçu s’il vous plaît", ["Je voudrais le reçu, s’il vous plaît."]));
  assert.ok(matches("Je ne comprends pas plus lentement s’il vous plaît", ["Je ne comprends pas. Plus lentement, s’il vous plaît."]));
  for (const [wrong, expected] of [
    ["Je suis la.", "Je suis là."],
    ["Ou est le parc ?", "Où est le parc ?"],
    ["Je peux venir.", "Je ne peux pas venir."],
    ["Je n’ai plus terminé.", "Je n’ai pas encore terminé."],
    ["Je viens a midi.", "Je viens à midi."],
    ["Jai perdu mon sac.", "J’ai perdu mon sac."],
    ["Je vais rentrer après midi.", "Je vais rentrer avant midi."],
    ["l a", "la"],
    ["15", "1,5"],
    ["rendez vous", "rendez-vous"],
  ]) assert.equal(matches(wrong, [expected]), false, `${wrong} must not become ${expected}`);
  assert.equal(matches("", [""]), false);
});

test("catalogue, isolated progress identity and sourced register remain honest", () => {
  assert.equal(FRENCH_QUEBEC_PROGRESS_KEY, "yopratiqo:french-quebec-foundations:v1");
  assert.equal(frenchQuebecCourseHref("en", "u12"), "/yo/langues/francais-quebec/parcours/u12?lang=en");
  assert.equal(frenchQuebecCourseHref("unsupported"), "/yo/langues/francais-quebec/parcours?lang=fr");
  assert.equal(final.id, "frqf-final");
  assert.equal(catalog.units.length, 12);
  assert.equal(catalog.assessments.length, 13);
  assert.equal(catalog.units.reduce((sum, unit) => sum + unit.phraseCount, 0), 216);
  unique(sources.map(source => source.id));
  for (const source of sources) {
    assert.match(source.url, /^https:\/\/(vitrinelinguistique\.oqlf\.gouv\.qc\.ca|usito\.usherbrooke\.ca)\//);
    localized(source.supports);
  }
  const ids = new Set(sources.map(source => source.id));
  for (const unit of units) for (const id of unit.culture.sourceIds) assert.ok(ids.has(id), id);
  assert.match(units[5].lessons[2].grammar.body.fr, /plus tôt ou plus tard dans la même journée/);
  assert.match(units[8].lessons[2].pronunciation.body.fr, /z écrit reste muet devant le v/);
  assert.match(units[11].culture.body.en, /no diploma, CEFR or CLB level is awarded/);
});
