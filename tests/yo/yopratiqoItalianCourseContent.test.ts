/** Course integrity: authored learning material, valid games, catalog and server boundaries. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { italianCourseUnits, italianCourseCatalog, courseAssessments, courseSources, getItalianCourseUnit } from "@/lib/yo/italian/course/courseData";
import { italianAssessmentHref, italianCourseHref, ITALIAN_COURSE_PATH } from "@/lib/yo/italian/course/courseLinks";
import { checkItalianCafe, checkItalianMap, checkItalianOrder, italianCafeTotal, italianMapPosition, matchesItalianAnswer, normalizeItalianAnswer } from "@/lib/yo/italian/italianModuleLogic";
import type { ItalianActivity, ItalianCafeActivity, ItalianChoiceActivity, ItalianMapActivity, ItalianOption } from "@/lib/yo/italian/italianModuleTypes";
import type { CourseLesson, LocaleText } from "@/lib/yo/italian/course/courseTypes";

const locales = ["fr", "en", "es"] as const;
const lessons = italianCourseUnits.flatMap(unit => unit.lessons);
const practice = lessons.flatMap(lesson => lesson.activities);
const assessments = [...italianCourseUnits.map(unit => unit.quiz), ...courseAssessments];
const questions = assessments.flatMap(assessment => assessment.questions);
const activities: ItalianActivity[] = [...practice, ...questions];
const norm = (value: string) => normalizeItalianAnswer(value);
const root = process.cwd();

function text(value: unknown, label: string): asserts value is string {
  assert.equal(typeof value, "string", `${label}: text required`);
  assert.ok((value as string).trim().length > 0, `${label}: empty text`);
}
function localized(value: LocaleText, label: string) {
  for (const locale of locales) text(value?.[locale], `${label}.${locale}`);
}
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(strings);
}
function unique(values: readonly string[], label: string) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  assert.deepEqual([...counts].filter(([, count]) => count > 1), [], `${label}: duplicate values`);
}
function options(items: ItalianOption[], correctId: string, label: string) {
  assert.ok(items.length >= 3, `${label}: answer plus at least two distractors`);
  unique(items.map(item => item.id), `${label} option ids`);
  assert.equal(items.filter(item => item.id === correctId).length, 1, `${label}: exactly one answer id`);
  for (const item of items) {
    assert.ok(item.it?.trim() || item.label, `${label}/${item.id}: visible option`);
    if (item.it !== undefined) text(item.it, `${label}/${item.id}.it`);
    if (item.label) localized(item.label, `${label}/${item.id}.label`);
    localized(item.feedback, `${label}/${item.id}.feedback`);
  }
  for (const locale of locales) unique(items.map(item => norm(item.it ?? item.label![locale])), `${label}: visible ${locale} answers`);
}
function taught(lesson: CourseLesson): string[] {
  return [...lesson.vocabulary.map(item => item.it), ...lesson.grammar.examples.map(item => item.it), ...lesson.pronunciation.practice, lesson.reading.it].map(norm);
}

test("the complete course contains twelve ordered units, three lessons each and substantial vocabulary", () => {
  assert.equal(italianCourseUnits.length, 12);
  assert.deepEqual(italianCourseUnits.map(unit => unit.number), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.deepEqual(italianCourseUnits.map(unit => unit.id), Array.from({ length: 12 }, (_, i) => `u${String(i + 1).padStart(2, "0")}`));
  assert.equal(lessons.length, 36);
  for (const unit of italianCourseUnits) {
    assert.equal(unit.lessons.length, 3, unit.id);
    assert.ok(unit.objectives.length >= 3, `${unit.id}: communicative objectives`);
    for (const lesson of unit.lessons) {
      assert.ok(lesson.vocabulary.length >= 6, `${lesson.id}: six useful expressions`);
      unique(lesson.vocabulary.map(item => norm(item.it)), `${lesson.id} vocabulary`);
      assert.ok(lesson.grammar.examples.length >= 2, `${lesson.id}: grammar examples`);
      assert.ok(lesson.pronunciation.practice.length >= 2, `${lesson.id}: pronunciation practice`);
      assert.ok(lesson.reading.it.trim().split(/\s+/).length >= 15, `${lesson.id}: contextual reading`);
      assert.ok(lesson.activities.length >= 5, `${lesson.id}: varied practice`);
      for (const kind of ["match", "order", "choice", "listen", "type"]) assert.ok(lesson.activities.some(activity => activity.kind === kind), `${lesson.id}: ${kind}`);
      assert.equal(lesson.activities.filter(activity => activity.id === lesson.readingActivityId && activity.kind === "choice").length, 1, `${lesson.id}: reading remains attached to its comprehension task`);
    }
  }
});

test("all 36 lessons have speaking tasks with criteria and all twelve units have assessed personal productions", () => {
  for (const lesson of lessons) {
    localized(lesson.speaking.prompt, `${lesson.id}.speaking.prompt`);
    assert.ok(lesson.speaking.checklist.length >= 2, `${lesson.id}: observable speaking criteria`);
    for (const locale of locales) unique(lesson.speaking.checklist.map(item => item[locale]), `${lesson.id}: distinct ${locale} criteria`);
  }
  for (const unit of italianCourseUnits) {
    localized(unit.production.prompt, `${unit.id}.production.prompt`);
    text(unit.production.model, `${unit.id}.production.model`);
    assert.ok(unit.production.model.split(/[.!?]+/).filter(part => part.trim()).length >= 3, `${unit.id}: usable multi-part production model`);
    assert.ok(unit.production.rubric.length >= 3, `${unit.id}: explicit production criteria`);
  }
});

test("twelve five-question unit quizzes and three eight-question cumulative assessments declare correct scopes", () => {
  for (const unit of italianCourseUnits) {
    assert.equal(unit.quiz.questions.length, 5, unit.quiz.id);
    assert.equal(unit.quiz.passPercent, 80);
    assert.deepEqual(unit.quiz.unitIds, [unit.id]);
    assert.ok(unit.quiz.questions.some(question => question.kind === "type"), `${unit.id}: productive recall`);
    assert.ok(unit.quiz.questions.some(question => question.kind === "listen"), `${unit.id}: listening check`);
  }
  assert.equal(courseAssessments.length, 3);
  for (const [index, assessment] of courseAssessments.entries()) {
    assert.equal(assessment.questions.length, 8, assessment.id);
    assert.equal(assessment.passPercent, 80);
    assert.deepEqual(assessment.unitIds, italianCourseUnits.slice(0, [4, 8, 12][index]).map(unit => unit.id), assessment.id);
    assert.ok(assessment.questions.filter(question => question.kind === "listen").length >= 2, `${assessment.id}: listening transfer`);
    assert.ok(assessment.questions.filter(question => question.kind === "type").length >= 2, `${assessment.id}: written transfer`);
  }
  assert.equal(questions.length, 84);
});

test("cumulative assessment prerequisites occur in teaching material within the announced unit scope", () => {
  // These anchors cover the concepts checked in the authored assessments. Quiz answers
  // and hints are deliberately excluded: an exam cannot provide its own prerequisites.
  const required: Array<Array<[string, RegExp]>> = [
    [["morning greeting", /buongiorno/], ["essere", /\bsono\b/], ["age with avere", /\bho\b[^.\n]{0,45}\banni\b/], ["languages", /\bfrancese\b/], ["noun plurals", /\ble case\b/], ["adjective agreement", /\balti\b/], ["routine", /\bmattina\b/], ["telling time", /\balle (?:sette|otto|nove)\b/], ["negation", /\bnon (?:parlo|ho|sono)\b/]],
    [["polite orders", /\bvorrei\b/], ["plural existence", /\bci sono\b/], ["prices", /\bcosta(?:no)?\b/], ["tens", /\bcinquanta\b/], ["demonstrative agreement", /\bqueste\b/], ["colour agreement", /\bross[aoei]\b/], ["transport", /\bstazione\b/], ["a with city names", /\ba (?:roma|firenze|bologna)\b/]],
    [["preferences", /\bmi piace\b/], ["music vocabulary", /\bmusica\b/], ["invitations", /\b(?:vuoi|possiamo)\b/], ["booking", /\bprenotazione\b/], ["past with avere", /\bho (?:mangiato|visitato|comprato)\b/], ["weather", /\bpiove\b/], ["polite clarification", /può ripetere/], ["future plans", /\bdomani\b/]],
  ];
  for (const [index, assessment] of courseAssessments.entries()) {
    const content = italianCourseUnits.filter(unit => assessment.unitIds.includes(unit.id)).flatMap(unit => unit.lessons)
      .map(lesson => strings({ vocabulary: lesson.vocabulary, grammar: lesson.grammar, reading: lesson.reading }).join("\n")).join("\n").normalize("NFC").toLocaleLowerCase("it-IT");
    for (const [concept, pattern] of required[index]) assert.match(content, pattern, `${assessment.id}: ${concept} must be taught before this checkpoint`);
  }
});

test("unit, lesson, activity, question, assessment and project identifiers are globally unique and storage safe", () => {
  const ids = [...italianCourseUnits.map(unit => unit.id), ...lessons.map(lesson => lesson.id), ...activities.map(activity => activity.id), ...assessments.map(assessment => assessment.id), ...italianCourseUnits.map(unit => unit.production.id)];
  unique(ids, "course identifiers");
  for (const id of ids) assert.match(id, /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/, id);
});

test("all localized teaching and feedback objects contain nonempty French, English and Spanish", () => {
  let count = 0;
  function visit(value: unknown, location: string) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach((item, i) => visit(item, `${location}[${i}]`)); return; }
    const object = value as Record<string, unknown>;
    if (locales.some(locale => locale in object)) {
      count++;
      for (const locale of locales) text(object[locale], `${location}.${locale}`);
    }
    for (const [key, child] of Object.entries(object)) visit(child, `${location}.${key}`);
  }
  visit({ units: italianCourseUnits, assessments: courseAssessments, sources: courseSources, catalog: italianCourseCatalog }, "course");
  assert.ok(count > 1000, "check traverses the complete material, including feedback");
  for (const lesson of lessons) {
    localized(lesson.title, `${lesson.id}.title`);
    localized(lesson.goal, `${lesson.id}.goal`);
    localized(lesson.grammar.title, `${lesson.id}.grammar.title`);
    localized(lesson.grammar.body, `${lesson.id}.grammar.body`);
    localized(lesson.pronunciation.body, `${lesson.id}.pronunciation.body`);
    localized(lesson.reading.meaning, `${lesson.id}.reading.meaning`);
    for (const item of lesson.vocabulary) { text(item.it, `${lesson.id}.vocabulary.it`); localized(item.meaning, `${lesson.id}.vocabulary.meaning`); }
  }
});

test("no unfinished content markers are exposed to learners", () => {
  // The Spanish word “todo” is ordinary course prose, not the TODO code marker.
  const markers = /\b(?:TODO|TBD|FIXME|PLACEHOLDER)\b/;
  const unfinished = /lorem ipsum|contenu à venir|coming soon|contenido próximamente|à rédiger|text goes here/i;
  for (const value of strings({ units: italianCourseUnits, assessments: courseAssessments, sources: courseSources })) {
    assert.doesNotMatch(value, markers, value.slice(0, 120));
    assert.doesNotMatch(value, unfinished, value.slice(0, 120));
  }
});

test("the course itself includes at least eight distinct interactive mechanics", () => {
  const mechanics = new Set(practice.map(activity => activity.kind === "culture" ? "choice" : activity.kind));
  assert.deepEqual([...mechanics].sort(), ["cafe", "choice", "dialogue", "listen", "map", "match", "order", "type"]);
});

test("every choice and dialogue has one visible answer, distinct distractors and explanatory feedback", () => {
  for (const activity of activities) {
    for (const field of ["title", "prompt", "hint", "hint2", "explanation"] as const) localized(activity[field], `${activity.id}.${field}`);
    if (activity.kind === "choice" || activity.kind === "listen" || activity.kind === "culture") options(activity.options, activity.correctId, activity.id);
    if (activity.kind === "listen") text(activity.stimulus, `${activity.id}.stimulus`);
    if (activity.kind === "dialogue") {
      assert.ok(activity.turns.length >= 2, `${activity.id}: an actual exchange`);
      for (const [index, turn] of activity.turns.entries()) {
        text(turn.speaker, `${activity.id}/${index}.speaker`);
        text(turn.line, `${activity.id}/${index}.line`);
        localized(turn.prompt, `${activity.id}/${index}.prompt`);
        options(turn.options, turn.correctId, `${activity.id}/${index}`);
      }
    }
  }
});

test("typed models are accepted by the real evaluator while unrelated answers are rejected", () => {
  for (const activity of activities) if (activity.kind === "type") {
    text(activity.model, `${activity.id}.model`);
    assert.ok(activity.accepted.length > 0, activity.id);
    for (const answer of activity.accepted) text(answer, `${activity.id}.accepted`);
    assert.ok(matchesItalianAnswer(activity.model, activity.accepted), `${activity.id}: displayed model accepted`);
    assert.ok(matchesItalianAnswer(`  ${activity.model.toLocaleUpperCase("it-IT")}  `, activity.accepted), `${activity.id}: typography tolerance`);
    assert.equal(matchesItalianAnswer("", activity.accepted), false, activity.id);
    assert.equal(matchesItalianAnswer("questa non è la risposta attesa 987654321", activity.accepted), false, activity.id);
  }
  for (const lesson of lessons) for (const activity of lesson.activities) if (activity.kind === "type") {
    assert.ok(taught(lesson).some(value => value.includes(norm(activity.model))), `${activity.id}: recall is prepared in its lesson`);
  }
});

test("sentence-building tiles form an available, taught model and cannot require missing words", () => {
  for (const lesson of lessons) for (const activity of lesson.activities) if (activity.kind === "order") {
    assert.ok(activity.answer.length >= 2, activity.id);
    assert.deepEqual([...activity.tokens].sort(), [...activity.answer].sort(), `${activity.id}: tile multiplicities`);
    assert.equal(activity.answer.join(" "), activity.it, `${activity.id}: complete Italian sentence`);
    for (const token of activity.tokens) text(token, `${activity.id}.token`);
    for (const distractor of activity.distractors ?? []) assert.ok(!activity.answer.includes(distractor), `${activity.id}: unambiguous distractor`);
    assert.ok(taught(lesson).some(value => value.includes(norm(activity.it))), `${activity.id}: model has been taught`);
    assert.ok(checkItalianOrder(activity.answer, activity.answer), activity.id);
    assert.equal(checkItalianOrder(activity.answer.slice(1), activity.answer), false, activity.id);
    assert.equal(checkItalianOrder([...activity.answer, activity.answer[0]], activity.answer), false, activity.id);
  }
});

test("matching games reuse the lesson’s expressions and meanings without ambiguous duplicates", () => {
  for (const lesson of lessons) for (const activity of lesson.activities) if (activity.kind === "match") {
    assert.ok(activity.pairs.length >= 3, activity.id);
    unique(activity.pairs.map(pair => pair.id), `${activity.id}: pair ids`);
    unique(activity.pairs.map(pair => norm(pair.it)), `${activity.id}: Italian expressions`);
    for (const locale of locales) unique(activity.pairs.map(pair => pair.meaning[locale]), `${activity.id}: ${locale} meanings`);
    for (const pair of activity.pairs) {
      const taughtPhrase = lesson.vocabulary.find(item => norm(item.it) === norm(pair.it));
      assert.ok(taughtPhrase, `${activity.id}: ${pair.it} has been introduced`);
      assert.deepEqual(pair.meaning, taughtPhrase.meaning, `${activity.id}: translation consistency`);
    }
  }
});

test("authored café orders are affordable, have exact quantities and reject a different basket", () => {
  const cafes = practice.filter((activity): activity is ItalianCafeActivity => activity.kind === "cafe");
  assert.ok(cafes.length >= 1);
  for (const activity of cafes) {
    text(activity.orderText, `${activity.id}.orderText`);
    unique(activity.menu.map(item => item.id), `${activity.id}: menu ids`);
    unique(activity.order.map(item => item.itemId), `${activity.id}: order lines`);
    assert.ok(activity.order.length > 0 && activity.menu.length >= 3, activity.id);
    for (const item of activity.menu) assert.ok(Number.isInteger(item.priceCents) && item.priceCents > 0, `${activity.id}/${item.id}: integer cents`);
    assert.ok(Number.isInteger(activity.budgetCents) && activity.budgetCents > 0);
    const basket: Record<string, number> = {};
    for (const item of activity.order) {
      assert.ok(activity.menu.some(product => product.id === item.itemId), `${activity.id}/${item.itemId}`);
      assert.ok(Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 9);
      basket[item.itemId] = item.quantity;
    }
    assert.ok(italianCafeTotal(activity, basket) <= activity.budgetCents, `${activity.id}: achievable budget`);
    assert.ok(checkItalianCafe(activity, basket), `${activity.id}: correct basket accepted`);
    const first = activity.order[0].itemId;
    assert.equal(checkItalianCafe(activity, { ...basket, [first]: basket[first] - 1 }), false, `${activity.id}: missing quantity rejected`);
    assert.equal(checkItalianCafe(activity, { ...basket, unknown: 1 }), false, `${activity.id}: injected item rejected`);
  }
});

test("map routes stay within the visible grid, reach the stated goal and require the instructed sequence", () => {
  const maps = practice.filter((activity): activity is ItalianMapActivity => activity.kind === "map");
  assert.ok(maps.length >= 1);
  for (const activity of maps) {
    assert.equal(activity.gridSize, 3);
    assert.ok(activity.path.length >= 2 && activity.instructions.length > 0, activity.id);
    for (const line of activity.instructions) text(line, `${activity.id}.instructions`);
    for (let length = 1; length <= activity.path.length; length++) assert.ok(italianMapPosition(activity, activity.path.slice(0, length)), `${activity.id}: no move leaves the map`);
    assert.deepEqual(italianMapPosition(activity, activity.path), activity.goal, activity.id);
    assert.ok(checkItalianMap(activity, activity.path), `${activity.id}: correct route accepted`);
    assert.equal(checkItalianMap(activity, activity.path.slice(1)), false, `${activity.id}: incomplete route rejected`);
    assert.equal(checkItalianMap(activity, [...activity.path, "left", "right"]), false, `${activity.id}: extra moves rejected`);
  }
});

test("the unit-five café reference order is one tea and one sandwich for six euros", () => {
  const cafe = practice.find((activity): activity is ItalianCafeActivity => activity.kind === "cafe" && activity.id === "it1-u05-cafe");
  assert.ok(cafe, "authored café reference exists");
  assert.equal(cafe.orderText, "Un tè e un panino, per favore.");
  assert.deepEqual(Object.fromEntries(cafe.menu.map(item => [item.id, item.priceCents])), { coffee: 150, tea: 200, water: 150, sandwich: 400 });
  assert.deepEqual(Object.fromEntries(cafe.order.map(item => [item.itemId, item.quantity])), { tea: 1, sandwich: 1 });
  assert.equal(cafe.budgetCents, 1000);
  assert.equal(italianCafeTotal(cafe, { tea: 1, sandwich: 1 }), 600);
  assert.equal(cafe.budgetCents - italianCafeTotal(cafe, { tea: 1, sandwich: 1 }), 400);
  assert.equal(checkItalianCafe(cafe, { tea: 1, sandwich: 1 }), true);
  assert.equal(checkItalianCafe(cafe, { coffee: 1, sandwich: 1 }), false, "an affordable different drink does not satisfy the order");
});

test("the unit-six map reference moves up twice then right twice to the top-right square", () => {
  const map = practice.find((activity): activity is ItalianMapActivity => activity.kind === "map" && activity.id === "it1-u06-map");
  assert.ok(map, "authored map reference exists");
  assert.deepEqual(map.start, { row: 2, col: 0 });
  assert.deepEqual(map.path, ["up", "up", "right", "right"]);
  assert.deepEqual(map.goal, { row: 0, col: 2 });
  assert.deepEqual(italianMapPosition(map, ["up", "up", "right", "right"]), { row: 0, col: 2 });
  assert.equal(checkItalianMap(map, ["up", "up", "right", "right"]), true);
  assert.equal(checkItalianMap(map, ["right", "right", "up", "up"]), false, "same destination by another route does not follow the directions");
});

test("cultural source IDs resolve to explicit HTTPS primary references", () => {
  unique(courseSources.map(source => source.id), "cultural sources");
  const ids = new Set(courseSources.map(source => source.id));
  for (const unit of italianCourseUnits) {
    assert.ok(unit.culture.sourceIds.length > 0, unit.id);
    for (const id of unit.culture.sourceIds) assert.ok(ids.has(id), `${unit.id}: unknown source ${id}`);
  }
  for (const activity of activities) if (activity.kind === "culture") {
    assert.ok(activity.sourceIds?.length, activity.id);
    for (const id of activity.sourceIds ?? []) assert.ok(ids.has(id), `${activity.id}: unknown source ${id}`);
  }
  for (const source of courseSources) {
    text(source.title, `${source.id}.title`);
    text(source.publisher, `${source.id}.publisher`);
    localized(source.supports, `${source.id}.supports`);
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:");
    assert.ok(["www.coe.int", "www.cla.uniud.it", "www.raiscuola.rai.it", "www.bolognawelcome.com"].includes(url.hostname), `${source.id}: source publisher`);
  }
});

test("the compact catalog exactly describes the lessons, activities, assessments and projects it links", () => {
  assert.equal(italianCourseCatalog.units.length, italianCourseUnits.length);
  for (const [index, unit] of italianCourseUnits.entries()) {
    const entry = italianCourseCatalog.units[index];
    assert.equal(entry.id, unit.id);
    assert.equal(entry.number, unit.number);
    assert.deepEqual(entry.title, unit.title);
    assert.deepEqual(entry.subtitle, unit.subtitle);
    assert.deepEqual(entry.objectives, unit.objectives);
    assert.equal(entry.quizId, unit.quiz.id);
    assert.equal(entry.productionId, unit.production.id);
    assert.equal(entry.phraseCount, unit.lessons.reduce((sum, lesson) => sum + lesson.vocabulary.length, 0));
    assert.deepEqual(entry.activityIds, unit.lessons.flatMap(lesson => lesson.activities.map(activity => activity.id)));
    assert.deepEqual(entry.lessons, unit.lessons.map(lesson => ({ id: lesson.id, title: lesson.title, activityIds: lesson.activities.map(activity => activity.id) })));
    assert.strictEqual(getItalianCourseUnit(unit.id), unit);
  }
  assert.equal(italianCourseCatalog.assessments.length, 15);
  for (const [index, assessment] of assessments.entries()) {
    assert.deepEqual(italianCourseCatalog.assessments[index], { id: assessment.id, title: assessment.title, unitIds: assessment.unitIds, questionCount: assessment.questions.length, passPercent: assessment.passPercent });
  }
  assert.equal(getItalianCourseUnit("unknown-unit"), undefined);
  assert.ok(!JSON.stringify(italianCourseCatalog).includes('"questions":'), "catalog does not ship answer keys");
  assert.ok(!JSON.stringify(italianCourseCatalog).includes('"accepted":'), "catalog does not ship typed models");
});

test("all generated course and assessment links preserve locale and resume coordinates", () => {
  assert.equal(ITALIAN_COURSE_PATH, "/yo/langues/italien/parcours");
  for (const locale of locales) {
    const home = new URL(italianCourseHref(locale), "https://pratiqo.example");
    assert.equal(home.pathname, ITALIAN_COURSE_PATH);
    assert.equal(home.searchParams.get("lang"), locale === "fr" ? null : locale);
    for (const unit of italianCourseUnits) for (const lesson of unit.lessons) {
      const url = new URL(italianCourseHref(locale, unit.id, lesson.id, lesson.activities[0].id), "https://pratiqo.example");
      assert.equal(url.pathname, `${ITALIAN_COURSE_PATH}/${unit.id}`);
      assert.equal(url.searchParams.get("lecon"), lesson.id);
      assert.equal(url.searchParams.get("activite"), lesson.activities[0].id);
      assert.equal(url.searchParams.get("lang"), locale === "fr" ? null : locale);
    }
    for (const assessment of assessments) {
      const url = new URL(italianAssessmentHref(locale, assessment.id), "https://pratiqo.example");
      assert.equal(url.pathname, `${ITALIAN_COURSE_PATH}/bilans/${assessment.id}`);
      assert.equal(url.searchParams.get("lang"), locale === "fr" ? null : locale);
    }
  }
});

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesUnder(path.join(directory, entry.name)) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [path.join(directory, entry.name)] : []);
}
function source(file: string) { return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS); }
function isClient(file: string): boolean {
  return source(file).statements.some(statement => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === "use client");
}
function runtimeImports(file: string): string[] {
  const imports: string[] = [];
  const add = (node: ts.Expression | undefined) => { if (node && ts.isStringLiteralLike(node)) imports.push(node.text); };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const onlyNamedTypes = clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every(item => item.isTypeOnly);
      if (!clause?.isTypeOnly && !onlyNamedTypes) add(node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node)) {
      const onlyNamedTypes = node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length > 0 && node.exportClause.elements.every(item => item.isTypeOnly);
      if (!node.isTypeOnly && !onlyNamedTypes) add(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) add(node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(source(file));
  return imports;
}
function resolveLocal(from: string, specifier: string): string | undefined {
  const base = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : specifier.startsWith(".") ? path.resolve(path.dirname(from), specifier) : undefined;
  if (!base) return;
  return [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find(file => existsSync(file) && statSync(file).isFile() && /\.[cm]?[jt]sx?$/.test(file));
}
function runtimeClosure(entry: string): Set<string> {
  const visited = new Set<string>();
  const visit = (file: string) => {
    if (visited.has(file)) return;
    visited.add(file);
    for (const dependency of runtimeImports(file)) { const local = resolveLocal(file, dependency); if (local) visit(local); }
  };
  visit(entry);
  return visited;
}

test("client components and their runtime dependencies never import the complete course data", () => {
  const entries = filesUnder(path.join(root, "components/yo/italian")).filter(isClient);
  assert.ok(entries.length > 0);
  const forbidden = /\/lib\/yo\/italian\/course\/(?:courseData|courseAssessments|units01to06|units07to12)\.ts$/;
  for (const entry of entries) {
    const importedContent = [...runtimeClosure(entry)].filter(file => forbidden.test(file));
    assert.deepEqual(importedContent, [], `${path.relative(root, entry)} must receive only the required server props`);
  }
});

test("dashboard, unit and assessment routes load course content on the server", () => {
  for (const relative of ["app/yo/langues/italien/parcours/page.tsx", "app/yo/langues/italien/parcours/[unitId]/page.tsx", "app/yo/langues/italien/parcours/bilans/[assessmentId]/page.tsx"]) {
    const file = path.join(root, relative);
    assert.ok(existsSync(file), `${relative}: route exists`);
    assert.equal(isClient(file), false, `${relative}: server route`);
    assert.ok(runtimeClosure(file).has(path.join(root, "lib/yo/italian/course/courseData.ts")), `${relative}: server loads authoritative course data`);
  }
});
