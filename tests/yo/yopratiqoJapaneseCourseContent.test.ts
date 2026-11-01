import assert from "node:assert/strict";
import test from "node:test";
import {
  japaneseCourseUnits,
  japaneseCourseSources,
  japaneseFinalAssessment,
} from "../../lib/yo/japaneseCourse";
import type {
  JapaneseActivity, JapaneseChoice, JapaneseChoiceActivity, JapaneseLocalized, JapanesePhrase,
} from "../../lib/yo/japaneseCourseTypes";

const allActivities = [...japaneseCourseUnits.flatMap(unit => unit.activities), ...japaneseFinalAssessment];
const isChoice = (activity: JapaneseActivity): activity is JapaneseChoiceActivity =>
  activity.kind === "choice" || activity.kind === "listening" || activity.kind === "culture";
const normalizedText = (value: string) => value.normalize("NFKC").replace(/[\s。！？、,.!?]/gu, "");

function localized(value: JapaneseLocalized, context: string) {
  for (const locale of ["fr", "en", "es"] as const) {
    assert.equal(typeof value[locale], "string", `${context}.${locale} must be text`);
    assert.ok(value[locale].trim().length > 0, `${context}.${locale} must not be blank`);
    assert.doesNotMatch(value[locale], /\b(?:TODO|TBD)\b|lorem ipsum|coming soon/u, context);
    assert.doesNotMatch(value[locale], /[\u200B-\u200D\uFEFF]/u, `${context}: invisible control character`);
  }
}

function phrase(value: JapanesePhrase, context: string) {
  assert.match(value.ja, /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, context);
  assert.ok(value.kana.trim(), `${context}: missing reading`);
  assert.doesNotMatch(value.kana, /\p{Script=Han}/u, `${context}: kana reading contains kanji`);
  assert.ok(value.romaji.trim(), `${context}: missing romanization`);
  localized(value.meaning, `${context}.meaning`);
}

function choices(value: { id: string; choices: JapaneseChoice[]; answerId: string }) {
  assert.equal(value.choices.length, 3, `${value.id}: three distinct options required`);
  assert.equal(new Set(value.choices.map(option => option.id)).size, 3, `${value.id}: duplicate option IDs`);
  assert.equal(value.choices.filter(option => option.id === value.answerId).length, 1, `${value.id}: dangling or ambiguous answer`);
  for (const option of value.choices) {
    assert.ok(option.ja || option.label, `${option.id}: no learner-visible option`);
    if (option.ja) {
      assert.ok(option.kana?.trim(), `${option.id}: missing reading support`);
      assert.ok(option.romaji?.trim(), `${option.id}: missing romanization support`);
    }
    if (option.label) localized(option.label, `${option.id}.label`);
    localized(option.feedback, `${option.id}.feedback`);
  }
  for (const locale of ["fr", "en", "es"] as const) {
    const rendered = value.choices.map(option => normalizedText(option.ja ?? option.label![locale]));
    assert.equal(new Set(rendered).size, 3, `${value.id}: duplicate options in ${locale}`);
  }
}

test("the eight linked modules form a complete ordered course, not missing route placeholders", () => {
  assert.equal(japaneseCourseUnits.length, 8);
  japaneseCourseUnits.forEach((unit, index) => {
    assert.equal(unit.number, index + 1);
    assert.equal(unit.id, `jp-foundation-${String(index + 1).padStart(2, "0")}`);
    assert.equal(unit.slug, `module-${index + 1}`);
    assert.ok(unit.estimatedMinutes >= 30 && unit.estimatedMinutes <= 90, `${unit.id}: proposed workload out of range`);
  });
});

test("every module supplies input, explicit goals, language support and an independent writing task", () => {
  for (const unit of japaneseCourseUnits) {
    [unit.title, unit.subtitle, unit.setting, unit.roleplay.title, unit.roleplay.context, unit.culture.title,
      unit.culture.note, unit.culture.reflection, unit.writing.prompt].forEach((value, index) => localized(value, `${unit.id}.section-${index}`));
    assert.ok(unit.goals.length >= 3, unit.id);
    assert.ok(unit.canDos.length >= 3, unit.id);
    [...unit.goals, ...unit.canDos, ...unit.writing.checklist].forEach((value, index) => localized(value, `${unit.id}.outcome-${index}`));
    assert.ok(unit.dialogue.length >= 4, unit.id);
    assert.equal(unit.vocabulary.length, 8, unit.id);
    assert.equal(unit.grammar.length, 2, unit.id);
    assert.ok(unit.writing.checklist.length >= 3, unit.id);
    unit.dialogue.forEach((line, index) => { phrase(line, `${unit.id}.dialogue-${index}`); localized(line.speaker, `${unit.id}.speaker-${index}`); });
    unit.vocabulary.forEach(word => phrase(word, word.id));
    unit.grammar.forEach(point => { localized(point.title, point.id); localized(point.explanation, point.id); phrase(point.example, point.id); });
    phrase(unit.writing.model, `${unit.id}.writing-model`);
  }
});

test("each module includes varied executable practice instead of a repeated single question type", () => {
  for (const unit of japaneseCourseUnits) {
    const counts = Object.fromEntries(["choice", "listening", "build", "reading", "match", "culture"].map(kind => [kind, unit.activities.filter(activity => activity.kind === kind).length]));
    assert.ok(counts.choice >= 2 && counts.listening >= 1 && counts.build >= 2 && counts.reading >= 1 && counts.match >= 1 && counts.culture >= 1, `${unit.id}: missing an activity mode`);
    assert.ok(unit.activities.length >= 8, unit.id);
    assert.equal(unit.roleplay.turns.length, 3, unit.id);
    unit.roleplay.turns.forEach(role => {
      localized(role.goal, role.id); localized(role.hint, role.id); localized(role.speaker, role.id);
      phrase(role.line, role.id); choices(role);
      assert.equal(new Set(role.choices.map(option => option.feedback.en)).size, 3, `${role.id}: feedback must distinguish the choices`);
    });
  }
});

test("every activity has full localized instruction, meaningful feedback and a resolvable answer", () => {
  for (const activity of allActivities) {
    [activity.title, activity.prompt, activity.hint, activity.explanation].forEach(value => localized(value, activity.id));
    if (isChoice(activity)) {
      choices(activity);
      if (activity.stimulus) phrase(activity.stimulus, `${activity.id}.stimulus`);
      if (activity.kind === "listening") assert.ok(activity.stimulus, `${activity.id}: listening has no audio text`);
    }
  }
  const answerPositions = new Set(allActivities.filter(isChoice).map(activity => activity.choices.findIndex(option => option.id === activity.answerId)));
  assert.deepEqual([...answerPositions].sort(), [0, 1, 2], "correct choices must not all occupy the same position");
});

test("sentence tasks reconstruct the exact published Japanese sentence with no duplicate-token ambiguity", () => {
  for (const activity of allActivities) {
    if (activity.kind !== "build") continue;
    phrase(activity.phrase, activity.id);
    const ids = activity.tokens.map(token => token.id);
    assert.equal(new Set(ids).size, ids.length, activity.id);
    assert.equal(new Set(activity.tokens.map(token => token.text)).size, ids.length, `${activity.id}: indistinguishable tokens`);
    assert.equal(new Set(activity.answerOrder).size, ids.length, `${activity.id}: repeated or missing answer token`);
    assert.deepEqual([...activity.answerOrder].sort(), [...ids].sort(), activity.id);
    const byId = new Map(activity.tokens.map(token => [token.id, token.text]));
    assert.equal(activity.answerOrder.map(id => byId.get(id)).join(""), activity.phrase.ja, `${activity.id}: model and answer disagree`);
    assert.notDeepEqual(ids, activity.answerOrder, `${activity.id}: exercise starts already solved`);
    for (const alternative of activity.alternativeOrders ?? []) {
      assert.equal(new Set(alternative).size, ids.length, activity.id);
      assert.deepEqual([...alternative].sort(), [...ids].sort(), activity.id);
    }
  }
});

test("reading checks explicitly require kana and retain contrasts that change Japanese words", () => {
  for (const activity of allActivities) {
    if (activity.kind !== "reading") continue;
    assert.equal(activity.acceptsRomaji, false, activity.id);
    assert.ok(activity.accepted.includes(activity.answer), `${activity.id}: displayed answer would fail`);
    assert.equal(new Set(activity.accepted).size, activity.accepted.length, activity.id);
    assert.match(activity.stimulus, /\p{Script=Han}/u, `${activity.id}: expected contextual kanji target`);
    activity.accepted.forEach(answer => assert.match(answer, /^[\p{Script=Hiragana}ー]+$/u, `${activity.id}: answer bypasses kana practice`));
  }
  const expected: Record<string, { correct: string; wrong: string }> = {
    "jp-2-reading": { correct: "よじ", wrong: "よんじ" },
    "jp-4-reading": { correct: "おちゃ", wrong: "おちや" },
    "jp-5-reading": { correct: "すいようび", wrong: "すいよび" },
    "jp-7-reading": { correct: "でぐち", wrong: "てくち" },
    "jp-8-reading": { correct: "よみました", wrong: "よみます" },
    "jp-final-03": { correct: "いりぐち", wrong: "でぐち" },
  };
  for (const [id, answers] of Object.entries(expected)) {
    const activity = allActivities.find(candidate => candidate.id === id);
    assert.ok(activity?.kind === "reading", id);
    assert.ok(activity.accepted.includes(answers.correct), id);
    assert.ok(!activity.accepted.includes(answers.wrong), `${id}: incorrect reading must not be accepted`);
  }
});

test("matching cards have distinct meanings in every supported locale", () => {
  for (const activity of allActivities) {
    if (activity.kind !== "match") continue;
    assert.ok(activity.pairs.length >= 3, activity.id);
    assert.equal(new Set(activity.pairs.map(pair => pair.id)).size, activity.pairs.length, activity.id);
    assert.equal(new Set(activity.pairs.map(pair => pair.phrase.ja)).size, activity.pairs.length, activity.id);
    activity.pairs.forEach(pair => phrase(pair.phrase, pair.id));
    for (const locale of ["fr", "en", "es"] as const) {
      assert.equal(new Set(activity.pairs.map(pair => normalizedText(pair.phrase.meaning[locale]))).size, activity.pairs.length, `${activity.id}: ambiguous meanings in ${locale}`);
    }
  }
});

test("kana coverage contains all 46 basic hiragana and all 46 basic katakana exactly once", () => {
  const hiragana = Array.from("あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん");
  const katakana = Array.from("アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン");
  const actual = japaneseCourseUnits.flatMap(unit => unit.kana);
  assert.equal(actual.length, 92);
  assert.equal(new Set(actual).size, 92);
  assert.deepEqual([...actual].sort(), [...hiragana, ...katakana].sort());
  assert.deepEqual(japaneseCourseUnits.slice(0, 4).flatMap(unit => unit.kana), hiragana);
  assert.deepEqual(japaneseCourseUnits.slice(4).flatMap(unit => unit.kana), katakana);
});

test("forty kanji are distributed without duplication or accidental kana", () => {
  const actual = japaneseCourseUnits.flatMap(unit => unit.kanji);
  assert.equal(actual.length, 40);
  assert.equal(new Set(actual).size, 40);
  japaneseCourseUnits.forEach(unit => assert.equal(unit.kanji.length, 5, unit.id));
  actual.forEach(character => assert.match(character, /^\p{Script=Han}$/u));
  for (const useful of ["人", "日", "語", "右", "左", "食", "円", "月", "学", "出", "入", "読", "書"]) assert.ok(actual.includes(useful), useful);
});

test("global IDs remain unique so persisted answers cannot collide across modules or finals", () => {
  const seen = new Set<string>();
  function visit(value: unknown) {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    if (typeof object.id === "string") {
      assert.ok(!seen.has(object.id), `duplicate global ID: ${object.id}`);
      seen.add(object.id);
    }
    Object.values(object).forEach(visit);
  }
  visit(japaneseCourseUnits);
  visit(japaneseFinalAssessment);
});

test("cultural cases and methodology link only to declared authoritative sources", () => {
  const sourceIds = new Set(japaneseCourseSources.map(source => source.id));
  assert.equal(sourceIds.size, japaneseCourseSources.length);
  for (const source of japaneseCourseSources) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:");
    assert.ok(["www.jfstandard.jpf.go.jp", "www.irodori.jpf.go.jp", "catalog.mit.edu", "kanjivg.tagaini.net"].includes(url.hostname));
    assert.ok(source.title.trim() && source.publisher.trim());
    localized(source.purpose, source.id);
  }
  for (const unit of japaneseCourseUnits) {
    assert.ok(unit.culture.sourceIds.length > 0, unit.id);
    unit.culture.sourceIds.forEach(id => assert.ok(sourceIds.has(id), `${unit.id}: unknown source ${id}`));
  }
  for (const activity of allActivities.filter(isChoice)) {
    if (activity.kind === "culture") assert.ok(activity.sourceIds?.length, activity.id);
    activity.sourceIds?.forEach(id => assert.ok(sourceIds.has(id), `${activity.id}: unknown source ${id}`));
  }
});

test("the cumulative check contains fresh prompts and several response modes", () => {
  assert.equal(japaneseFinalAssessment.length, 8);
  assert.ok(japaneseFinalAssessment.every(activity => activity.id.startsWith("jp-final-")));
  const unitPrompts = new Set(japaneseCourseUnits.flatMap(unit => unit.activities.map(activity => activity.prompt.en)));
  japaneseFinalAssessment.forEach(activity => assert.ok(!unitPrompts.has(activity.prompt.en), `${activity.id}: copied unit prompt`));
  const kinds = new Set(japaneseFinalAssessment.map(activity => activity.kind));
  for (const kind of ["choice", "listening", "build", "reading", "culture"]) assert.ok(kinds.has(kind as JapaneseActivity["kind"]));
  assert.ok(japaneseCourseSources.find(source => source.id === "mit-japanese")?.purpose.en.includes("No affiliation or credit equivalence"));
});
