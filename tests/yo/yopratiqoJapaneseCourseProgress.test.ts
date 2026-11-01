/** Pure grading/aggregation and rendered persistence behavior, without network calls. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { useJapaneseCourseProgress } from "@/components/yo/japanese/useJapaneseCourseProgress";
import {
  checkJapaneseAnswer, emptyJapaneseProgress, JAPANESE_PROGRESS_KEY,
  japaneseUnitPracticeIds, japaneseUnitProgress, mergeJapaneseProgress,
  normalizeJapaneseAnswer, parseJapaneseProgress, recordJapaneseResult,
  type JapaneseAnswer, type JapaneseCourseProgress,
} from "@/lib/yo/japaneseCourseProgress";
import { japaneseCourseUnits } from "@/lib/yo/japaneseCourse";
import type {
  JapaneseActivityBase, JapaneseBuildActivity, JapaneseChoiceActivity,
  JapaneseMatchActivity, JapaneseReadingActivity,
} from "@/lib/yo/japaneseCourseTypes";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo", pretendToBeVisual: true });
const bindings = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { renderHook, cleanup, act } = require("@testing-library/react") as typeof import("@testing-library/react");

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  failRead = false;
  failWrite = false;
  writes: Array<{ key: string; value: string }> = [];
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  getItem(key: string) {
    if (this.failRead) throw new Error("Storage access blocked");
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error("Storage quota exceeded");
    this.items.set(key, String(value));
    this.writes.push({ key, value: String(value) });
  }
  removeItem(key: string) { this.items.delete(key); }
}
let storage: MemoryStorage;
function resetStorage() {
  storage = new MemoryStorage();
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
}
function saveFixture(progress: JapaneseCourseProgress) {
  storage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify(progress));
  storage.writes = [];
}
function savedProgress() { return parseJapaneseProgress(storage.getItem(JAPANESE_PROGRESS_KEY)); }
function storageEvent(key: string | null = JAPANESE_PROGRESS_KEY, newValue = storage.getItem(JAPANESE_PROGRESS_KEY)) {
  window.dispatchEvent(new dom.window.StorageEvent("storage", { key, newValue }));
}
const cases: Array<[string, () => void | Promise<void>]> = [];
function test(name: string, run: () => void | Promise<void>) { cases.push([name, run]); }
const text = { fr: "Exemple", en: "Example", es: "Ejemplo" };
const base: JapaneseActivityBase = { id: "jp-test", title: text, prompt: text, hint: text, explanation: text, skill: "reading" };
const phrase = { ja: "学校", kana: "がっこう", romaji: "gakkō", meaning: text };
const reading: JapaneseReadingActivity = { ...base, kind: "reading", stimulus: "学校", answer: "がっこう", accepted: ["がっこう"], acceptsRomaji: false };
const build: JapaneseBuildActivity = {
  ...base, kind: "build", tokens: [{ id: "a", text: "私" }, { id: "b", text: "は" }, { id: "c", text: "学生です。" }],
  answerOrder: ["a", "b", "c"], alternativeOrders: [["c", "b", "a"]], phrase,
};
const match: JapaneseMatchActivity = { ...base, kind: "match", pairs: [{ id: "one", phrase }, { id: "two", phrase: { ...phrase, ja: "日本" } }] };
const checked = (id: string, correct = true, assisted = false) => recordJapaneseResult(emptyJapaneseProgress(), id, correct, assisted);
const strictWrapper = ({ children }: React.PropsWithChildren) => React.createElement(React.StrictMode, null, children);

test("normalization accepts width/composition/spacing variants without erasing meaningful kana or vowels", () => {
  assert.equal(normalizeJapaneseAnswer("　か\u3099っこう \n"), "がっこう");
  assert.equal(normalizeJapaneseAnswer(" ｶﾞｯｺｳ "), "ガッコウ");
  assert.equal(normalizeJapaneseAnswer("  NŌ  ", true), "nō");
  assert.equal(normalizeJapaneseAnswer("a\t \nb", true), "a b");
  assert.notEqual(normalizeJapaneseAnswer("がっこう"), normalizeJapaneseAnswer("がつこう"));
  assert.notEqual(normalizeJapaneseAnswer("きょう"), normalizeJapaneseAnswer("きょ"));
  assert.notEqual(normalizeJapaneseAnswer("ō", true), normalizeJapaneseAnswer("o", true));
});

test("choice, listening and culture answers require the configured option ID", () => {
  for (const kind of ["choice", "listening", "culture"] as const) {
    const activity: JapaneseChoiceActivity = { ...base, kind, answerId: "right", choices: [{ id: "right", ja: "はい", feedback: text }, { id: "wrong", ja: "いいえ", feedback: text }] };
    assert.equal(checkJapaneseAnswer(activity, "right"), true);
    for (const answer of ["wrong", "はい", "", ["right"], { right: "right" }]) assert.equal(checkJapaneseAnswer(activity, answer), false);
  }
});

test("reading grading respects accepted spellings, input mode, small kana and long vowels", () => {
  assert.equal(checkJapaneseAnswer(reading, " か\u3099っこう\n"), true);
  for (const answer of ["", "がつこう", "がっこ", "gakkō", ["がっこう"]]) assert.equal(checkJapaneseAnswer(reading, answer), false);
  const romaji: JapaneseReadingActivity = { ...reading, accepted: ["がっこう", "gakkō"], acceptsRomaji: true };
  assert.equal(checkJapaneseAnswer(romaji, "GAKKŌ"), true);
  assert.equal(checkJapaneseAnswer(romaji, "gakko"), false);
});

test("build grading checks the complete token order and explicitly authored alternatives", () => {
  assert.equal(checkJapaneseAnswer(build, ["a", "b", "c"]), true);
  assert.equal(checkJapaneseAnswer(build, ["c", "b", "a"]), true);
  for (const answer of [[], ["a", "b"], ["a", "c", "b"], ["a", "b", "c", "c"], "abc"]) assert.equal(checkJapaneseAnswer(build, answer), false);
});

test("matching requires every correct pairing and rejects incomplete or malformed answers", () => {
  assert.equal(checkJapaneseAnswer(match, { one: "one", two: "two" }), true);
  for (const answer of [{}, { one: "one" }, { one: "two", two: "one" }, { one: "one", two: "one" }, ["one", "two"], null]) {
    assert.equal(checkJapaneseAnswer(match, answer as JapaneseAnswer), false);
  }
});

test("checked attempts preserve earned success, separate assistance and set review from the latest attempt", () => {
  let progress = checked("jp-1-answer", true, true);
  assert.deepEqual(progress.results["jp-1-answer"], { passed: true, independent: false, needsReview: true, attempts: 1 });
  progress = recordJapaneseResult(progress, "jp-1-answer", true, false);
  assert.deepEqual(progress.results["jp-1-answer"], { passed: true, independent: true, needsReview: false, attempts: 2 });
  progress = recordJapaneseResult(progress, "jp-1-answer", false, false);
  assert.deepEqual(progress.results["jp-1-answer"], { passed: true, independent: true, needsReview: true, attempts: 3 });
  for (let i = 0; i < 110; i += 1) progress = recordJapaneseResult(progress, "jp-1-answer", false, false);
  assert.equal(progress.results["jp-1-answer"].attempts, 99);
  assert.equal(recordJapaneseResult(progress, "__proto__", true, false), progress);
});

test("module completion counts checked exercises and roleplay, not study screens or bookmarked reviews", () => {
  const unit = japaneseCourseUnits[0];
  const ids = japaneseUnitPracticeIds(unit);
  assert.equal(ids.length, unit.activities.length + unit.roleplay.turns.length);
  let progress = emptyJapaneseProgress();
  progress.results[ids[0]] = { passed: false, independent: false, needsReview: true, attempts: 0 };
  progress.practicedKanji = [...unit.kanji];
  progress.lastSteps[unit.slug] = "summary";
  assert.deepEqual(japaneseUnitProgress(unit, progress), { passed: 0, independent: 0, review: 1, total: ids.length, complete: false });
  for (const id of ids) progress = recordJapaneseResult(progress, id, true, true);
  assert.deepEqual(japaneseUnitProgress(unit, progress), { passed: ids.length, independent: 0, review: ids.length, total: ids.length, complete: true });
  progress = recordJapaneseResult(progress, ids[0], true, false);
  assert.equal(japaneseUnitProgress(unit, progress).independent, 1);
});

test("snapshot merges are idempotent, preserve distinct results and never add duplicated attempt counts", () => {
  const first = { ...checked("jp-1-one", true, true), practicedKanji: ["人"], lastUnit: "module-1", lastSteps: { "module-1": "jp-1-one" } };
  const second = { ...checked("jp-2-two", true, false), practicedKanji: ["人", "日"], lastUnit: "module-2", lastSteps: { "module-2": "jp-2-two" } };
  const merged = mergeJapaneseProgress(first, second);
  assert.deepEqual(Object.keys(merged.results).sort(), ["jp-1-one", "jp-2-two"]);
  assert.deepEqual(merged.practicedKanji, ["人", "日"]);
  assert.deepEqual(merged.lastSteps, { "module-1": "jp-1-one", "module-2": "jp-2-two" });
  assert.equal(merged.lastUnit, "module-2");
  assert.deepEqual(mergeJapaneseProgress(merged, merged), merged);
  assert.deepEqual(mergeJapaneseProgress(merged, second), merged);
  assert.equal(merged.results["jp-1-one"].attempts, 1);
  assert.equal(merged.results["jp-2-two"].attempts, 1);
});

test("newer checked attempts clear stale review flags while equal-count incoming bookmarks remain meaningful", () => {
  const assisted = checked("jp-1-one", true, true);
  const independent = recordJapaneseResult(assisted, "jp-1-one", true, false);
  for (const merged of [mergeJapaneseProgress(assisted, independent), mergeJapaneseProgress(independent, assisted)]) {
    assert.deepEqual(merged.results["jp-1-one"], { passed: true, independent: true, needsReview: false, attempts: 2 });
  }
  const bookmarked: JapaneseCourseProgress = { ...independent, results: { "jp-1-one": { ...independent.results["jp-1-one"], needsReview: true } } };
  assert.equal(mergeJapaneseProgress(independent, bookmarked).results["jp-1-one"].needsReview, true);
  const simultaneous = mergeJapaneseProgress(checked("jp-1-one", false), checked("jp-1-one", true));
  assert.equal(simultaneous.results["jp-1-one"].attempts, 1);
  assert.equal(simultaneous.results["jp-1-one"].independent, true);
});

test("parsing keeps zero-attempt bookmarks, strips raw fields and bounds malformed state", () => {
  const parsed = parseJapaneseProgress(JSON.stringify({
    version: 1, rawAnswers: ["private"], handwriting: "private", draft: "private",
    results: {
      "jp-bookmark": { passed: false, independent: true, needsReview: true, attempts: 0, answer: "private" },
      "jp-bounded": { passed: true, independent: true, needsReview: false, attempts: 999 },
      "jp-negative": { passed: false, independent: false, needsReview: true, attempts: -2 },
      "jp-fraction": { passed: false, independent: false, needsReview: true, attempts: 2.9 },
      "jp-missing": { passed: false, independent: false, needsReview: true },
      "jp-invalid": { passed: "yes", independent: true, needsReview: true, attempts: 1 },
      "jp-array": [], "not-an-id": { passed: true, independent: true, needsReview: false, attempts: 1 },
    },
    practicedKanji: ["人", "人", "日", "hello", "日本", null, 4],
    lastUnit: "../admin", lastSteps: { "module-1": "jp-1-reading", "module-2": "../../private", admin: "mission" },
  }));
  assert.deepEqual(parsed.results["jp-bookmark"], { passed: false, independent: false, needsReview: true, attempts: 0 });
  assert.equal(parsed.results["jp-bounded"].attempts, 99);
  assert.equal(parsed.results["jp-negative"].attempts, 0);
  assert.equal(parsed.results["jp-fraction"].attempts, 2);
  assert.equal(parsed.results["jp-missing"].attempts, 0);
  assert.equal(Object.keys(parsed.results).length, 5);
  assert.deepEqual(parsed.practicedKanji, ["人", "日"]);
  assert.equal(parsed.lastUnit, "module-1");
  assert.deepEqual(parsed.lastSteps, { "module-1": "jp-1-reading" });
  assert.equal(JSON.stringify(parsed).includes("private"), false);
  for (const raw of [null, "{", "[]", JSON.stringify({ version: 2 }), "x".repeat(120001)]) assert.deepEqual(parseJapaneseProgress(raw), emptyJapaneseProgress());
  const many = parseJapaneseProgress(JSON.stringify({ version: 1, results: Object.fromEntries(Array.from({ length: 510 }, (_, i) => ["jp-" + i, { passed: false, independent: false, needsReview: true, attempts: 0 }])), practicedKanji: Array.from({ length: 50 }, (_, i) => String.fromCharCode(0x4e00 + i)) }));
  assert.equal(Object.keys(many.results).length, 500);
  assert.equal(many.practicedKanji.length, 40);
  assert.deepEqual(parseJapaneseProgress(JSON.stringify(parsed)), parsed);
});

test("rendered hook restores saved progress in StrictMode without mount-time writes", () => {
  const restored = { ...checked("jp-2-reading"), lastUnit: "module-2", lastSteps: { "module-2": "jp-2-reading" }, practicedKanji: ["二"] };
  saveFixture(restored);
  const view = renderHook(useJapaneseCourseProgress, { wrapper: strictWrapper });
  assert.equal(view.result.current.ready, true);
  assert.equal(view.result.current.storageAvailable, true);
  assert.deepEqual(view.result.current.progress, restored);
  assert.equal(storage.writes.length, 0);
});

test("updates persist before returning or unmounting, and React StrictMode does not duplicate transforms", () => {
  const view = renderHook(useJapaneseCourseProgress, { wrapper: strictWrapper });
  let calls = 0;
  act(() => {
    view.result.current.update((current) => {
      calls += 1;
      return { ...recordJapaneseResult(current, "jp-2-reading", true, false), lastUnit: "module-2", lastSteps: { ...current.lastSteps, "module-2": "jp-2-reading" } };
    });
    // This assertion runs before React can commit another render/effect.
    assert.equal(savedProgress().results["jp-2-reading"].attempts, 1);
    assert.equal(savedProgress().lastSteps["module-2"], "jp-2-reading");
    view.unmount();
  });
  assert.equal(calls, 1);
  assert.equal(storage.writes.length, 1);
  const nextPage = renderHook(useJapaneseCourseProgress);
  assert.equal(nextPage.result.current.progress.lastUnit, "module-2");
  assert.equal(nextPage.result.current.progress.lastSteps["module-2"], "jp-2-reading");
});

test("successive actions in one event use the newest ref and count each explicit attempt once", () => {
  const view = renderHook(useJapaneseCourseProgress);
  act(() => {
    view.result.current.update((current) => recordJapaneseResult(current, "jp-1-reading", false, false));
    view.result.current.update((current) => recordJapaneseResult(current, "jp-1-reading", true, false));
  });
  assert.deepEqual(savedProgress().results["jp-1-reading"], { passed: true, independent: true, needsReview: false, attempts: 2 });
  assert.deepEqual(view.result.current.progress, savedProgress());
});

test("blocked reads keep practice in memory and recovery saves that session without fabricating attempts", () => {
  storage.failRead = true;
  const view = renderHook(useJapaneseCourseProgress);
  assert.equal(view.result.current.ready, true);
  assert.equal(view.result.current.storageAvailable, false);
  act(() => view.result.current.update((current) => ({ ...recordJapaneseResult(current, "jp-5-reading", true, true), lastUnit: "module-5", lastSteps: { "module-5": "jp-5-reading" } })));
  assert.equal(view.result.current.progress.results["jp-5-reading"].attempts, 1);
  assert.equal(storage.writes.length, 0);
  storage.failRead = false;
  act(() => view.result.current.update((current) => recordJapaneseResult(current, "jp-5-reading", true, false)));
  assert.equal(view.result.current.storageAvailable, true);
  assert.equal(savedProgress().results["jp-5-reading"].attempts, 2);
  assert.equal(savedProgress().lastUnit, "module-5");
  assert.equal(savedProgress().lastSteps["module-5"], "jp-5-reading");
});

test("failed writes preserve unsaved bookmarks and navigation when storage later recovers", () => {
  saveFixture(checked("jp-1-reading"));
  const view = renderHook(useJapaneseCourseProgress);
  storage.failWrite = true;
  act(() => view.result.current.update((current) => ({ ...current, lastUnit: "module-1", lastSteps: { "module-1": "jp-1-reading" }, results: { ...current.results, "jp-1-reading": { ...current.results["jp-1-reading"], needsReview: true } } })));
  assert.equal(view.result.current.storageAvailable, false);
  assert.equal(view.result.current.progress.results["jp-1-reading"].needsReview, true);
  assert.equal(savedProgress().results["jp-1-reading"].needsReview, false);
  storage.failWrite = false;
  act(() => view.result.current.update((current) => ({ ...current, practicedKanji: ["人"] })));
  assert.equal(view.result.current.storageAvailable, true);
  assert.equal(savedProgress().results["jp-1-reading"].needsReview, true);
  assert.equal(savedProgress().results["jp-1-reading"].attempts, 1);
  assert.equal(savedProgress().lastSteps["module-1"], "jp-1-reading");
});

test("two stale tab instances preserve distinct results before storage events arrive", () => {
  const first = renderHook(useJapaneseCourseProgress);
  const second = renderHook(useJapaneseCourseProgress);
  act(() => first.result.current.update((current) => ({ ...recordJapaneseResult(current, "jp-1-reading", true, false), practicedKanji: ["人"], lastUnit: "module-1", lastSteps: { "module-1": "jp-1-reading" } })));
  assert.equal(second.result.current.progress.results["jp-1-reading"], undefined);
  act(() => second.result.current.update((current) => ({ ...recordJapaneseResult(current, "jp-2-reading", true, true), practicedKanji: [...current.practicedKanji, "二"], lastUnit: "module-2", lastSteps: { ...current.lastSteps, "module-2": "jp-2-reading" } })));
  const saved = savedProgress();
  assert.deepEqual(Object.keys(saved.results).sort(), ["jp-1-reading", "jp-2-reading"]);
  assert.deepEqual(saved.practicedKanji, ["二", "人"]);
  assert.equal(saved.results["jp-1-reading"].attempts, 1);
  assert.equal(saved.results["jp-2-reading"].attempts, 1);
  const writes = storage.writes.length;
  act(() => storageEvent());
  assert.deepEqual(first.result.current.progress, saved);
  assert.deepEqual(second.result.current.progress, saved);
  assert.equal(storage.writes.length, writes);
});

test("storage events reconcile an overlapping cross-tab write and ignore queued stale event payloads", () => {
  const view = renderHook(useJapaneseCourseProgress);
  act(() => view.result.current.update((current) => recordJapaneseResult(current, "jp-1-reading", true, false)));
  const remote = { ...checked("jp-2-reading", false), lastUnit: "module-2", lastSteps: { "module-2": "jp-2-reading" } };
  storage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify(remote));
  act(() => storageEvent(JAPANESE_PROGRESS_KEY, JSON.stringify(emptyJapaneseProgress())));
  assert.deepEqual(Object.keys(savedProgress().results).sort(), ["jp-1-reading", "jp-2-reading"]);
  assert.equal(view.result.current.progress.lastUnit, "module-2");
  assert.equal(view.result.current.progress.results["jp-2-reading"].needsReview, true);
  const writes = storage.writes.length;
  act(() => storageEvent());
  assert.equal(storage.writes.length, writes);
});

test("equivalent kanji sets and object keys converge despite opposite insertion orders across tabs", () => {
  const one = checked("jp-1-reading").results["jp-1-reading"];
  const two = checked("jp-2-reading").results["jp-2-reading"];
  const forward: JapaneseCourseProgress = {
    ...emptyJapaneseProgress(), results: { "jp-1-reading": one, "jp-2-reading": two },
    practicedKanji: ["人", "日"], lastSteps: { "module-1": "jp-1-reading", "module-2": "jp-2-reading" },
  };
  const reversed: JapaneseCourseProgress = {
    ...forward, results: { "jp-2-reading": two, "jp-1-reading": one }, practicedKanji: ["日", "人"],
    lastSteps: { "module-2": "jp-2-reading", "module-1": "jp-1-reading" },
  };
  assert.equal(JSON.stringify(mergeJapaneseProgress(forward, reversed)), JSON.stringify(mergeJapaneseProgress(reversed, forward)));
  saveFixture(forward);
  const first = renderHook(useJapaneseCourseProgress);
  saveFixture(reversed);
  const second = renderHook(useJapaneseCourseProgress);
  act(() => storageEvent());
  assert.deepEqual(first.result.current.progress, second.result.current.progress);
  const canonical = storage.getItem(JAPANESE_PROGRESS_KEY);
  const writes = storage.writes.length;
  for (let i = 0; i < 4; i += 1) act(() => storageEvent());
  assert.equal(storage.getItem(JAPANESE_PROGRESS_KEY), canonical);
  assert.equal(storage.writes.length, writes, "Equivalent snapshots must not continually echo storage writes");
});

test("a stale tab cannot reintroduce review after a newer independent checked answer", () => {
  saveFixture(checked("jp-1-reading", true, true));
  const first = renderHook(useJapaneseCourseProgress);
  const second = renderHook(useJapaneseCourseProgress);
  act(() => first.result.current.update((current) => recordJapaneseResult(current, "jp-1-reading", true, false)));
  assert.equal(second.result.current.progress.results["jp-1-reading"].needsReview, true);
  act(() => second.result.current.update((current) => ({ ...current, lastUnit: "module-2" })));
  assert.deepEqual(savedProgress().results["jp-1-reading"], { passed: true, independent: true, needsReview: false, attempts: 2 });
  act(() => storageEvent());
  assert.deepEqual(first.result.current.progress, second.result.current.progress);
});

test("unrelated storage events do nothing and explicit progress removal is respected without resurrection", () => {
  saveFixture(checked("jp-1-reading"));
  const view = renderHook(useJapaneseCourseProgress);
  const before = view.result.current.progress;
  act(() => storageEvent("another-course", null));
  assert.equal(view.result.current.progress, before);
  storage.removeItem(JAPANESE_PROGRESS_KEY);
  act(() => storageEvent(JAPANESE_PROGRESS_KEY, null));
  assert.deepEqual(view.result.current.progress, emptyJapaneseProgress());
  assert.equal(storage.getItem(JAPANESE_PROGRESS_KEY), null);
  assert.equal(storage.writes.length, 0);
});

test("unmounted hooks remove their storage listener", () => {
  saveFixture(checked("jp-1-reading"));
  const view = renderHook(useJapaneseCourseProgress);
  view.unmount();
  saveFixture(checked("jp-2-reading"));
  act(() => storageEvent());
  assert.deepEqual(Object.keys(savedProgress().results), ["jp-2-reading"]);
  assert.equal(storage.writes.length, 0);
});

async function main() {
  let failed = 0;
  try {
    for (const [name, run] of cases) {
      resetStorage();
      try { await run(); console.log(`ok - ${name}`); }
      catch (error) { failed += 1; console.error(`not ok - ${name}`, error); }
      finally { cleanup(); }
    }
  } finally {
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
  console.log(`\nJapanese course progress: ${cases.length - failed}/${cases.length} passed.`);
  if (failed) process.exitCode = 1;
}
void main();
