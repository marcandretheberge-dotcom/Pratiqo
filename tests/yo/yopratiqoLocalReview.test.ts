import assert from "node:assert/strict";
import { learningLanguageId, learningLanguages, YO_LANGUAGE_IDS } from "../../lib/yo/config/languages";
import { createReviewStore, getReviewSummary, type ReviewStorage } from "../../lib/yo/review/store";
import { REVIEW_MAX_EVENTS, REVIEW_MAX_SESSION_EVENTS, REVIEW_STORAGE_PREFIX, parseReviewAttempt, reviewEventKey } from "../../lib/yo/review/state";
import { SRS_DAY_MS as DAY } from "../../lib/yo/srs/intervals";
import { introCourses } from "../../lib/yo/shared/course";
import { introReviewItems, recordIntroReviewAttempt } from "../../lib/yo/review/intro";
import { courseReviewItems, japaneseReviewItems, mandarinReviewItems } from "../../lib/yo/review/adapters";
import { personalizedItalianUnits } from "../../lib/yo/personalized/courseData";
import { germanCourseUnits, germanFinal, germanExtendedFinal } from "../../lib/yo/german/courseData";
import { portugueseCourseUnits, portugueseFinal, portugueseExtendedFinal } from "../../lib/yo/portuguese/courseData";
import { japaneseCourseUnits, japaneseFinalAssessment } from "../../lib/yo/japaneseCourse";
import { mandarinUnits, mandarinFinal } from "../../lib/yo/mandarin/course";

class MemoryStorage implements ReviewStorage {
  readonly entries = new Map<string, string>();
  failWrites = false;
  get length() { return this.entries.size; }
  key(index: number) { return [...this.entries.keys()][index] ?? null; }
  getItem(key: string) { return this.entries.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("Storage full");
    this.entries.set(key, value);
  }
}
const base = Date.UTC(2026, 10, 25, 12);
const tests: Array<[string, () => void]> = [];

tests.push(["all eight languages use one interval registry without merging different targets", () => {
  assert.equal(YO_LANGUAGE_IDS.length, 8);
  for (const id of YO_LANGUAGE_IDS) {
    assert.equal(learningLanguageId(id), id);
    assert.deepEqual(learningLanguages[id].reviewIntervalsDays, [1, 3, 7, 14]);
    for (const alias of learningLanguages[id].aliases) assert.equal(learningLanguageId(alias.toUpperCase()), id);
  }
  assert.equal(learningLanguageId("fr-CA"), "fr");
  assert.equal(learningLanguageId("pt-BR"), "pt");
  assert.equal(learningLanguageId("zh-Hans"), "zh");
  assert.equal(learningLanguageId("unknown"), null);
  assert.equal(learningLanguageId("__proto__"), null);
  assert.equal(learningLanguages.es.speechLocale, "es-419");
}]);

tests.push(["only mistakes or help enroll an item; dated independent recall uses 1/3/7/14 days", () => {
  const disk = new MemoryStorage(), store = createReviewStore(() => disk);
  const input = { language: "en", itemId: "intro:first:hello", correct: true, assisted: false };
  assert.deepEqual(store.record({ ...input, attemptId: "first-success", at: base }), { recorded: false, saved: true });
  assert.equal(disk.length, 0);
  store.record({ ...input, correct: false, attemptId: "miss", at: base });
  assert.deepEqual(getReviewSummary(store.read("en"), undefined, base).dueIds, [input.itemId]);
  store.record({ ...input, attemptId: "recall-1", at: base + 1 });
  let record = store.read("en").records[input.itemId];
  assert.equal(record.nextReviewAt, base + 1 + DAY);
  assert.equal(record.streak, 1);
  for (let i = 0; i < 5; i++) store.record({ ...input, attemptId: `immediate-${i}`, at: base + 2 + i });
  assert.equal(store.read("en").records[input.itemId].streak, 1, "immediate repetitions are not spaced evidence");
  for (const [index, interval] of [3, 7, 14, 14].entries()) {
    const at = record.nextReviewAt;
    store.record({ ...input, attemptId: `spaced-${index}`, at });
    record = store.read("en").records[input.itemId];
    assert.equal(record.nextReviewAt, at + interval * DAY);
  }
  store.record({ ...input, assisted: true, attemptId: "used-help", at: record.nextReviewAt });
  const helped = store.read("en").records[input.itemId];
  assert.equal(helped.streak, 0);
  assert.equal(helped.nextReviewAt, helped.lastAt + DAY);
  store.record({ ...input, correct: false, attemptId: "new-miss", at: helped.lastAt + 2 });
  assert.equal(store.read("en").records[input.itemId].nextReviewAt, helped.lastAt + 2);
}]);

tests.push(["receipt replay is idempotent across reload, aliases and conflicting duplicate payloads", () => {
  const disk = new MemoryStorage(), store = createReviewStore(() => disk);
  const event = { language: "fr-CA", itemId: "interest:music:venue", correct: false, assisted: false, attemptId: "one-submit", at: base };
  assert.equal(store.record(event).saved, true);
  const original = store.read("fr");
  const reloaded = createReviewStore(() => disk);
  assert.deepEqual(reloaded.record({ ...event, language: "fr", correct: true, at: base + DAY }), { recorded: false, saved: true });
  assert.deepEqual(reloaded.read("fr-CA"), original);
  assert.equal(disk.length, 1);
  assert.deepEqual(reloaded.read("en").records, {});
  assert.deepEqual(reloaded.read("pt").records, {});
}]);

tests.push(["two stale tab snapshots append distinct evidence rather than overwrite progress", () => {
  const disk = new MemoryStorage();
  disk.setItem("yo.shared-intro.v1.en", "original course progress");
  const stale = (): ReviewStorage => ({ length: 0, key: () => null, getItem: () => null, setItem: (key, value) => disk.setItem(key, value) });
  const tabA = createReviewStore(stale), tabB = createReviewStore(stale);
  tabA.record({ language: "en", itemId: "intro:first:hello", correct: false, assisted: false, attemptId: "tab-a", at: base });
  tabB.record({ language: "en", itemId: "intro:first:hello", correct: false, assisted: false, attemptId: "tab-b", at: base + 1 });
  tabB.record({ language: "de", itemId: "intro:first:hello", correct: false, assisted: false, attemptId: "tab-b-de", at: base });
  const fresh = createReviewStore(() => disk);
  assert.equal(fresh.read("en").records["intro:first:hello"].attempts, 2);
  assert.equal(fresh.read("de").records["intro:first:hello"].attempts, 1);
  assert.equal(disk.getItem("yo.shared-intro.v1.en"), "original course progress");
}]);

tests.push(["keys cannot collide and malformed, foreign and prototype records are ignored", () => {
  const a = { language: "en" as const, itemId: "a.b", id: "c" }, b = { language: "en" as const, itemId: "a", id: "b.c" };
  assert.notEqual(reviewEventKey(a), reviewEventKey(b));
  const valid = { version: 1 as const, ...a, at: base, correct: false, assisted: false };
  assert.deepEqual(parseReviewAttempt(JSON.stringify(valid), reviewEventKey(a), "en"), valid);
  for (const invalid of [null, {}, { ...valid, at: -1 }, { ...valid, correct: "true" }, { ...valid, version: 2 }, { ...valid, itemId: "__proto__" }, { ...valid, language: "it" }]) {
    assert.equal(parseReviewAttempt(JSON.stringify(invalid), reviewEventKey(a), "en"), null);
  }
  const disk = new MemoryStorage(), store = createReviewStore(() => disk);
  disk.setItem(reviewEventKey(a), "not json");
  assert.deepEqual(store.read("en").records, {});
  assert.deepEqual(store.record({ language: "x", itemId: "valid", correct: false, assisted: false }), { recorded: false, saved: false });
  assert.deepEqual(store.record({ language: "en", itemId: "constructor", correct: false, assisted: false }), { recorded: false, saved: false });
  for (const itemId of ["toString", "valueOf"]) {
    store.record({ language: "en", itemId, correct: false, assisted: false, attemptId: `prototype-${itemId}`, at: base });
    const record = store.read("en").records[itemId];
    assert.equal(record.attempts, 1);
    assert.equal(record.streak, 0);
    assert.equal(record.nextReviewAt, base);
  }
}]);

tests.push(["due summaries are catalog-scoped and stable without attendance rewards", () => {
  const disk = new MemoryStorage(), store = createReviewStore(() => disk);
  store.record({ language: "ja", itemId: "intro:a", correct: false, assisted: false, attemptId: "a", at: base });
  store.record({ language: "ja", itemId: "intro:b", correct: false, assisted: false, attemptId: "b", at: base });
  store.record({ language: "ja", itemId: "interest:art:venue", correct: true, assisted: true, attemptId: "c", at: base });
  const state = store.read("ja");
  assert.deepEqual(getReviewSummary(state, ["intro:b", "intro:a", "intro:a", "not-in-catalog"], base), { dueIds: ["intro:a", "intro:b"], pending: 0, total: 2, nextAt: null });
  assert.deepEqual(getReviewSummary(state, ["interest:art:venue"], base), { dueIds: [], pending: 1, total: 1, nextAt: base + DAY });
  assert.equal(getReviewSummary(state, undefined, base + 90 * DAY).total, 3);
  for (const raw of disk.entries.values()) {
    const event = JSON.parse(raw);
    assert.deepEqual(Object.keys(event).sort(), ["assisted", "at", "correct", "id", "itemId", "language", "version"]);
  }
}]);

tests.push(["denied/full storage is honest, bounded and never deletes existing receipts", () => {
  const disk = new MemoryStorage(), store = createReviewStore(() => disk);
  disk.failWrites = true;
  const event = { language: "zh-Hans", itemId: "intro:a", correct: false, assisted: false, attemptId: "denied", at: base };
  assert.deepEqual(store.record(event), { recorded: true, saved: false });
  assert.equal(store.read("zh").persistent, false);
  assert.deepEqual(store.record(event), { recorded: false, saved: false });
  assert.equal(store.read("zh").records[event.itemId].attempts, 1);
  assert.equal(disk.length, 0);
  const session = createReviewStore(() => null);
  for (let i = 0; i < REVIEW_MAX_SESSION_EVENTS; i++) assert.equal(session.record({ ...event, attemptId: `memory-${i}`, at: base + i }).recorded, true);
  assert.deepEqual(session.record({ ...event, attemptId: "beyond-cap" }), { recorded: false, saved: false });
  assert.equal(session.read("zh").records[event.itemId].attempts, REVIEW_MAX_SESSION_EVENTS);
  assert.equal(session.read("zh").persistent, false);
  const full = new MemoryStorage();
  for (let i = 0; i < REVIEW_MAX_EVENTS; i++) full.setItem(`${REVIEW_STORAGE_PREFIX}it.pre-existing-${i}`, "kept");
  const capped = createReviewStore(() => full);
  assert.deepEqual(capped.record({ ...event, attemptId: "at-cap" }), { recorded: true, saved: false });
  assert.equal(full.length, REVIEW_MAX_EVENTS);
  assert.ok([...full.entries.values()].every((value) => value === "kept"));
}]);

tests.push(["intro adapters retain actual authored content and exclude diagnostic/final questions", () => {
  assert.equal(introCourses.length, 7);
  for (const course of introCourses) {
    const items = introReviewItems(course);
    assert.equal(items.length, 32, course.slug);
    assert.equal(new Set(items.map((item) => item.id)).size, items.length);
    for (const item of items) {
      assert.equal(item.language, learningLanguageId(course.language));
      assert.ok(course.phrases.some((phrase) => phrase.text === item.correctForm.fr));
      assert.ok(!course.final.some((question) => question.id === item.activityId));
      assert.ok(item.prompt.fr && item.prompt.en && item.prompt.es);
    }
    assert.deepEqual(recordIntroReviewAttempt(course, course.final[0], { correct: false, assisted: false }), { recorded: false, saved: false });
  }
}]);

tests.push(["reusable course adapters cover every authored practice item and exclude assessments", () => {
  const assessmentIds = new Set([
    ...[...personalizedItalianUnits, ...germanCourseUnits, ...portugueseCourseUnits].flatMap((unit) => unit.quiz.questions.map((question) => question.id)),
    ...japaneseFinalAssessment.map((question) => question.id), ...mandarinFinal.exercises.map((question) => question.id),
    ...[germanFinal, germanExtendedFinal, portugueseFinal, portugueseExtendedFinal].flatMap(assessment => assessment.questions.map(question => question.id)),
  ]);
  const catalogs = [
    [courseReviewItems("it", personalizedItalianUnits), 228],
    [courseReviewItems("de", germanCourseUnits), 232],
    [courseReviewItems("pt-BR", portugueseCourseUnits), 232],
    [japaneseReviewItems(japaneseCourseUnits), 88],
    [mandarinReviewItems(mandarinUnits), 104],
  ] as const;
  for (const [items, count] of catalogs) {
    assert.equal(items.length, count);
    assert.equal(new Set(items.map((item) => item.id)).size, count);
    for (const item of items) {
      assert.ok(item.prompt.fr && item.prompt.en && item.prompt.es, item.id);
      assert.ok(item.correctForm.fr && item.correctForm.en && item.correctForm.es, item.id);
      assert.ok(item.feedback.fr && item.feedback.en && item.feedback.es, item.id);
      assert.ok(!assessmentIds.has(item.activityId), item.id);
    }
  }
}]);

for (const [name, test] of tests) { test(); console.log(`✓ ${name}`); }
console.log(`Local review: ${tests.length} checks passed.`);
