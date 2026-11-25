import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement, StrictMode } from "react";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import { COURSE_PROGRESS_MAX_LENGTH, COURSE_REVIEW_INTERVAL_DAYS, emptyCourseProgress, getDueActivityIds, ITALIAN_COURSE_PROGRESS_KEY, markCourseProduction, mergeCourseProgress, parseCourseProgress, recordCourseActivity, recordCourseAssessment, resetCourseProgress, serializeCourseProgress, setCourseResume, type CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { useItalianCourseProgress } from "@/components/yo/italian/course/useItalianCourseProgress";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo/langues/italien/cours" });
const bindings = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, StorageEvent: dom.window.StorageEvent, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(bindings).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { renderHook, act, cleanup } = require("@testing-library/react") as typeof import("@testing-library/react");
const t = { fr: "Exemple", en: "Example", es: "Ejemplo" };
const catalog: CourseCatalog = {
  units: [
    { id: "u1", number: 1, title: t, subtitle: t, objectives: [t], lessons: [{ id: "l1", title: t, activityIds: ["a1", "a2"] }, { id: "l2", title: t, activityIds: ["a3"] }], activityIds: ["a1", "a2", "a3"], quizId: "q1", productionId: "p1", phraseCount: 10 },
    { id: "u2", number: 2, title: t, subtitle: t, objectives: [t], lessons: [{ id: "l3", title: t, activityIds: ["a4"] }], activityIds: ["a4"], quizId: "q2", productionId: "p2", phraseCount: 8 },
  ],
  assessments: [{ id: "q1", title: t, unitIds: ["u1"], questionCount: 5, passPercent: 80 }, { id: "q2", title: t, unitIds: ["u2"], questionCount: 3, passPercent: 80 }, { id: "final", title: t, unitIds: ["u1", "u2"], questionCount: 8, passPercent: 80 }],
};
const NOW = Date.now();
const DAY = 86400000;
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
const parse = (value: unknown) => parseCourseProgress(JSON.stringify(value), catalog, NOW + 1000);
const activity = (state: CourseProgress, id = "a1", correct = true, assisted = false, now = NOW) => recordCourseActivity(state, catalog, id, correct, assisted, now);
const quiz = (state: CourseProgress, correct = 4, assisted = false, now = NOW) => recordCourseAssessment(state, catalog, "q1", correct, 5, assisted, now);
const saved = () => parseCourseProgress(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY), catalog);
const emit = (value: CourseProgress) => window.dispatchEvent(new StorageEvent("storage", { key: ITALIAN_COURSE_PROGRESS_KEY, newValue: serializeCourseProgress(value) }));

test("missing, corrupt, oversized and unsupported storage restarts safely", () => {
  for (const raw of [null, "", "{", "null", "true", "[]", JSON.stringify({ version: 2 }), "x".repeat(COURSE_PROGRESS_MAX_LENGTH + 1)]) {
    assert.deepEqual(parseCourseProgress(raw, catalog), emptyCourseProgress());
  }
});

test("only catalog identifiers and aggregate fields survive storage parsing", () => {
  const valid = setCourseResume(markCourseProduction(quiz(activity(emptyCourseProgress())), catalog, "p1", true, NOW + 2), catalog, "u1", "l1", "a1", NOW + 3);
  const polluted = JSON.parse(serializeCourseProgress(valid));
  polluted.privateAnswer = "learner private text";
  polluted.activities.a1.answer = "learner private text";
  polluted.activities.unknown = polluted.activities.a1;
  polluted.assessments.q1.last.responses = ["learner private text"];
  polluted.assessments.unknown = polluted.assessments.q1;
  polluted.productions.unknown = true;
  polluted.productionsUpdatedAt.unknown = NOW;
  polluted.resume.essay = "learner private text";
  const restored = parse(polluted);
  assert.deepEqual(restored, valid);
  assert.ok(!serializeCourseProgress(restored).includes("learner private text"));
  assert.deepEqual(Object.keys(restored.activities), ["a1"]);
});

test("invalid counts, flags, streaks and intervals cannot become progress", () => {
  const valid = activity(emptyCourseProgress());
  for (const attempts of [0, -1, 1.2, "3", 100001, null]) {
    assert.deepEqual(parse({ ...valid, activities: { a1: { ...valid.activities.a1, attempts } } }).activities, {});
  }
  for (const patch of [{ completed: false }, { independent: false }, { completed: "true" }, { streak: 5 }, { streak: 2 }, { nextReviewAt: NOW - 1 }, { nextReviewAt: NOW + 15 * DAY }, { nextReviewAt: NOW + 2000 }]) {
    assert.deepEqual(parse({ ...valid, activities: { a1: { ...valid.activities.a1, ...patch } } }).activities, {});
  }
});

test("invalid clocks cannot override a reset or resurrect pre-reset records", () => {
  const valid = activity(emptyCourseProgress());
  for (const patch of [{ resetAt: -1 }, { updatedAt: Infinity }, { updatedAt: NOW + 120000 }, { resetAt: NOW + 1, updatedAt: NOW }, { updatedAt: "123" }]) {
    assert.deepEqual(parse({ ...valid, ...patch }), emptyCourseProgress());
  }
  assert.deepEqual(parse({ ...valid, resetAt: NOW + 1, updatedAt: NOW + 2 }).activities, {});
  assert.deepEqual(parse({ ...valid, activities: { a1: { ...valid.activities.a1, lastAt: NOW + 1 } } }).activities, {});
  assert.deepEqual(parseCourseProgress(serializeCourseProgress(valid), catalog, Number.NaN), emptyCourseProgress());
});

test("stored assessment totals and scores are bounded, with last-result evidence retained", () => {
  const valid = quiz(emptyCourseProgress(), 4, true);
  assert.deepEqual(parse({ ...valid, assessments: { q1: { ...valid.assessments.q1, last: { ...valid.assessments.q1.last, total: 4 } } } }).assessments, {});
  const sanitized = parse({ ...valid, assessments: { q1: { ...valid.assessments.q1, bestIndependent: 101, bestAssisted: -10 } } });
  assert.equal(sanitized.assessments.q1.bestIndependent, null);
  assert.equal(sanitized.assessments.q1.bestAssisted, 80);
  assert.equal(parse(quiz(emptyCourseProgress(), 0)).assessments.q1.bestIndependent, 0);
});

test("resume validates the entire unit, lesson and activity relationship", () => {
  const valid = setCourseResume(emptyCourseProgress(), catalog, "u1", "l1", "a1", NOW);
  for (const resume of [{ unitId: "u2", lessonId: "l1" }, { unitId: "u1", lessonId: "l3" }, { unitId: "u1", lessonId: "l1", activityId: "a3" }, { unitId: "u1", lessonId: "l1", activityId: "a4" }, { unitId: "u1", lessonId: "l1", activityId: "x".repeat(1000) }, { unitId: "__proto__", lessonId: "l1" }]) {
    assert.equal(parse({ ...valid, resume }).resume, null);
  }
  assert.deepEqual(parse(valid).resume, { unitId: "u1", lessonId: "l1", activityId: "a1" });
  assert.deepEqual(setCourseResume(valid, catalog, "u2", "l3", undefined, NOW + 1).resume, { unitId: "u2", lessonId: "l3" });
});

test("unaided recall schedules 1, 3, 7 and 14 days, then stays bounded", () => {
  let state = emptyCourseProgress();
  for (let n = 0; n < 6; n++) {
    state = activity(state, "a1", true, false, NOW + n);
    const result = state.activities.a1;
    assert.equal(result.streak, Math.min(n + 1, 4));
    assert.equal(result.nextReviewAt - result.lastAt, COURSE_REVIEW_INTERVAL_DAYS[Math.min(n, 3)] * DAY);
    assert.equal(result.attempts, n + 1);
    assert.equal(result.independent, true);
  }
  assert.deepEqual(parse(state), state);
});

test("latest assistance and mistakes reset revision intervals without deleting acquired mastery", () => {
  let state = activity(activity(emptyCourseProgress()));
  state = activity(state, "a1", true, true, NOW + 2);
  assert.equal(state.activities.a1.independent, true);
  assert.equal(state.activities.a1.streak, 0);
  assert.equal(state.activities.a1.nextReviewAt, state.activities.a1.lastAt + DAY);
  state = activity(state, "a1", false, false, NOW + 3);
  assert.equal(state.activities.a1.completed, true);
  assert.equal(state.activities.a1.independent, true);
  assert.equal(state.activities.a1.nextReviewAt, state.activities.a1.lastAt);
  assert.equal(activity(state, "a1", true, false, NOW + 4).activities.a1.streak, 1);
});

test("failure never completes a task, and assisted success never grants independent mastery", () => {
  const failed = activity(emptyCourseProgress(), "a1", false);
  assert.equal(failed.activities.a1.completed, false);
  assert.equal(failed.activities.a1.independent, false);
  const assisted = activity(failed, "a1", true, true);
  assert.equal(assisted.activities.a1.completed, true);
  assert.equal(assisted.activities.a1.independent, false);
});

test("review queues contain due attempted activities in due-time order, never unseen or unknown IDs", () => {
  let state = activity(emptyCourseProgress(), "a1", true, false, NOW);
  state = activity(state, "a2", false, false, NOW + 1);
  state = activity(state, "a4", true, true, NOW + 2);
  state.activities.unknown = state.activities.a2;
  assert.deepEqual(getDueActivityIds(state, catalog, NOW), []);
  assert.deepEqual(getDueActivityIds(state, catalog, NOW + 1), ["a2"]);
  assert.deepEqual(getDueActivityIds(state, catalog, NOW + DAY), ["a2", "a1"]);
  assert.deepEqual(getDueActivityIds(state, catalog, NOW + DAY + 2), ["a2", "a1", "a4"]);
});

test("only a complete assessment with valid integer counts can be committed", () => {
  const base = emptyCourseProgress();
  for (const [correct, total] of [[0, 0], [2, 2], [4, 4], [6, 5], [-1, 5], [2.5, 5], [5, 5.1], [Number.NaN, 5], [3, Infinity]]) {
    assert.strictEqual(recordCourseAssessment(base, catalog, "q1", correct, total, false, NOW), base);
  }
  assert.strictEqual(recordCourseAssessment(base, catalog, "unknown", 5, 5, false, NOW), base);
  assert.strictEqual(recordCourseAssessment(base, catalog, "q1", 5, 5, "false" as unknown as boolean, NOW), base);
  assert.equal(recordCourseAssessment(base, catalog, "q2", 2, 3, false, NOW).assessments.q2.bestIndependent, 67);
  assert.equal(recordCourseAssessment(base, catalog, "final", 7, 8, false, NOW).assessments.final.bestIndependent, 88);
});

test("latest quiz score remains separate from best assisted and best independent scores", () => {
  const mastered = quiz(emptyCourseProgress(), 4, false);
  const aided = quiz(mastered, 5, true, NOW + 1);
  const latest = quiz(aided, 1, false, NOW + 2);
  assert.deepEqual(latest.assessments.q1, { attempts: 3, last: { correct: 1, total: 5, assisted: false, completedAt: NOW + 2 }, bestIndependent: 80, bestAssisted: 100 });
  assert.equal(mastered.assessments.q1.last.correct, 4);
  assert.deepEqual(parse(latest), latest);
});

test("unknown identifiers, malformed flags and invalid action clocks are ignored", () => {
  const base = emptyCourseProgress();
  assert.strictEqual(activity(base, "injected"), base);
  assert.strictEqual(recordCourseActivity(base, catalog, "a1", "true" as unknown as boolean, false, NOW), base);
  assert.strictEqual(activity(base, "a1", true, false, -1), base);
  assert.strictEqual(markCourseProduction(base, catalog, "injected", true, NOW), base);
  assert.strictEqual(setCourseResume(base, catalog, "u1", "l3", undefined, NOW), base);
  assert.strictEqual(resetCourseProgress(base, Number.NaN), base);
});

test("merging concurrent results preserves both successes and never adds replayed counters", () => {
  const left = activity(emptyCourseProgress(), "a1", true, false, NOW);
  const right = activity(activity(emptyCourseProgress(), "a1", true, true, NOW), "a2", false, false, NOW + 1);
  const merged = mergeCourseProgress(left, right);
  assert.equal(merged.activities.a1.attempts, 1);
  assert.equal(merged.activities.a1.independent, true);
  assert.equal(merged.activities.a1.streak, 0);
  assert.deepEqual(Object.keys(merged.activities), ["a1", "a2"]);
  assert.deepEqual(mergeCourseProgress(right, left), merged);
  assert.deepEqual(mergeCourseProgress(merged, right), merged);
  assert.deepEqual(Object.keys(left.activities), ["a1"]);
});

test("latest failed recall controls the due date even when an older tab carries higher mastery", () => {
  const independent = activity(activity(activity(emptyCourseProgress())), "a1", true, false, NOW + 2);
  const failed = activity(emptyCourseProgress(), "a1", false, false, NOW + 20);
  const merged = mergeCourseProgress(independent, failed);
  assert.equal(merged.activities.a1.independent, true);
  assert.equal(merged.activities.a1.completed, true);
  assert.equal(merged.activities.a1.attempts, 3);
  assert.equal(merged.activities.a1.streak, 0);
  assert.equal(merged.activities.a1.nextReviewAt, NOW + 20);
});

test("assessment merging keeps the latest result and both kinds of historical best", () => {
  const left = quiz(emptyCourseProgress(), 4, false, NOW);
  const right = quiz(quiz(emptyCourseProgress(), 5, true, NOW), 0, true, NOW + 1);
  const merged = mergeCourseProgress(left, right);
  assert.deepEqual(merged.assessments.q1, { attempts: 2, last: { correct: 0, total: 5, assisted: true, completedAt: NOW + 1 }, bestIndependent: 80, bestAssisted: 100 });
  assert.deepEqual(mergeCourseProgress(right, left), merged);
});

test("equal-clock merges converge in either order and remain associative", () => {
  let a = activity(emptyCourseProgress(), "a1", true, false, NOW);
  let b = activity(emptyCourseProgress(), "a1", false, true, NOW);
  let c = activity(emptyCourseProgress(), "a1", true, true, NOW);
  a = setCourseResume(markCourseProduction(quiz(a, 5, false, NOW + 1), catalog, "p1", true, NOW + 2), catalog, "u1", "l1", "a1", NOW + 3);
  b = setCourseResume(markCourseProduction(quiz(b, 1, false, NOW + 1), catalog, "p1", false, NOW + 2), catalog, "u2", "l3", "a4", NOW + 3);
  c = setCourseResume(markCourseProduction(quiz(c, 1, true, NOW + 1), catalog, "p2", true, NOW + 2), catalog, "u1", "l2", "a3", NOW + 3);
  const ab = mergeCourseProgress(a, b);
  assert.deepEqual(mergeCourseProgress(b, a), ab);
  assert.deepEqual(mergeCourseProgress(ab, c), mergeCourseProgress(a, mergeCourseProgress(b, c)));
  assert.equal(ab.activities.a1.nextReviewAt, NOW);
  assert.equal(ab.productions.p1, false);
  assert.equal(mergeCourseProgress(ab, c).assessments.q1.last.assisted, true);
});

test("a newer reset generation wins even when the old tab has a later modification clock", () => {
  const stale = activity(emptyCourseProgress(), "a1", true, false, NOW + 100);
  const reset = resetCourseProgress(quiz(emptyCourseProgress(), 5, false, NOW), NOW + 10);
  assert.deepEqual(mergeCourseProgress(stale, reset), reset);
  assert.deepEqual(mergeCourseProgress(reset, stale), reset);
  assert.equal(reset.resume, null);
  assert.deepEqual(reset.assessments, {});
});

test("production unchecking uses its own clock and survives unrelated newer activity", () => {
  const checked = markCourseProduction(emptyCourseProgress(), catalog, "p1", true, NOW);
  const unchecked = markCourseProduction(checked, catalog, "p1", false, NOW + 1);
  const stale = activity(checked, "a2", true, false, NOW + 10);
  assert.equal(mergeCourseProgress(unchecked, stale).productions.p1, false);
  assert.deepEqual(parse(unchecked), unchecked);
});

test("resume keeps the latest navigation, independently of other tabs’ later exercise results", () => {
  const initial = setCourseResume(emptyCourseProgress(), catalog, "u1", "l1", "a1", NOW);
  const navigation = setCourseResume(initial, catalog, "u2", "l3", "a4", NOW + 1);
  const exercise = activity(initial, "a1", true, false, NOW + 10);
  assert.deepEqual(mergeCourseProgress(navigation, exercise).resume, { unitId: "u2", lessonId: "l3", activityId: "a4" });
  assert.strictEqual(setCourseResume(navigation, catalog, "u2", "l3", "a4", NOW + 20), navigation);
});

test("hook restores saved state without writing an initial empty value", () => {
  const initial = setCourseResume(quiz(activity(emptyCourseProgress())), catalog, "u1", "l2", "a3", NOW + 2);
  const raw = serializeCourseProgress(initial);
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, raw);
  const { result } = renderHook(() => useItalianCourseProgress(catalog));
  assert.equal(result.current.ready, true);
  assert.equal(result.current.storageAvailable, true);
  assert.deepEqual(result.current.progress, initial);
  assert.equal(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY), raw);
});

test("actions persist synchronously, keep batched attempts, and resume after remount", () => {
  const hook = renderHook(() => useItalianCourseProgress(catalog));
  act(() => {
    hook.result.current.recordActivity("a1", false, false);
    assert.equal(saved().activities.a1.attempts, 1);
    hook.result.current.recordActivity("a1", true, false);
    assert.equal(saved().activities.a1.attempts, 2);
    hook.result.current.recordAssessment("q1", 4, 5, false);
    assert.equal(saved().assessments.q1.bestIndependent, 80);
    hook.result.current.markProduction("p1", true);
    hook.result.current.setResume("u2", "l3", "a4");
    assert.equal(saved().resume?.activityId, "a4");
  });
  const before = hook.result.current.progress;
  hook.unmount();
  assert.deepEqual(renderHook(() => useItalianCourseProgress(catalog)).result.current.progress, before);
});

test("unknown tasks, partial quizzes and invalid cross-unit navigation never create saved progress", () => {
  const { result } = renderHook(() => useItalianCourseProgress(catalog));
  act(() => {
    result.current.recordActivity("unknown", true, false);
    result.current.recordAssessment("q1", 2, 2, false);
    result.current.markProduction("unknown", true);
    result.current.setResume("u1", "l3", "a4");
  });
  assert.deepEqual(result.current.progress, emptyCourseProgress());
  assert.equal(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY), null);
});

test("the next local action reads and merges a remote write before saving", () => {
  const { result } = renderHook(() => useItalianCourseProgress(catalog));
  act(() => result.current.recordActivity("a1", true, false));
  const remote = setCourseResume(activity(saved(), "a4", true, true), catalog, "u2", "l3", "a4");
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, serializeCourseProgress(remote));
  act(() => result.current.recordActivity("a2", false, false));
  assert.deepEqual(Object.keys(saved().activities).sort(), ["a1", "a2", "a4"]);
  assert.equal(saved().resume?.activityId, "a4");
});

test("storage events repair a concurrent overwrite and replaying them never inflates attempts", () => {
  const { result } = renderHook(() => useItalianCourseProgress(catalog));
  act(() => result.current.recordActivity("a1", true, false));
  const remote = activity(emptyCourseProgress(), "a2", true, true);
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, serializeCourseProgress(remote));
  act(() => emit(remote));
  assert.deepEqual(Object.keys(saved().activities), ["a1", "a2"]);
  act(() => emit(remote));
  assert.equal(saved().activities.a2.attempts, 1);
  assert.deepEqual(result.current.progress, saved());
});

test("remote reset and later stale writes cannot resurrect completed activities", () => {
  const { result } = renderHook(() => useItalianCourseProgress(catalog));
  act(() => result.current.recordActivity("a1", true, false));
  const old = result.current.progress;
  const reset = resetCourseProgress(old);
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, serializeCourseProgress(reset));
  act(() => emit(reset));
  assert.deepEqual(result.current.progress, reset);
  const stale = activity(old, "a2", true, false, reset.resetAt + 10);
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, serializeCourseProgress(stale));
  act(() => emit(stale));
  assert.deepEqual(saved(), reset);
  act(() => result.current.recordActivity("a4", true, false));
  assert.deepEqual(Object.keys(saved().activities), ["a4"]);
});

test("reset clears every course result immediately while preserving the separate Bologna module", () => {
  const bolognaKey = "yopratiqo:italian-bologna-a1:v1";
  window.localStorage.setItem(bolognaKey, "existing bologna progress");
  const { result } = renderHook(() => useItalianCourseProgress(catalog));
  act(() => { result.current.recordActivity("a1", true, false); result.current.recordAssessment("q1", 5, 5, false); result.current.markProduction("p1", true); result.current.setResume("u1", "l1"); });
  const before = result.current.progress;
  act(() => result.current.reset());
  assert.ok(saved().resetAt > before.updatedAt);
  assert.deepEqual(saved(), emptyCourseProgress(saved().resetAt));
  assert.equal(window.localStorage.getItem(bolognaKey), "existing bologna progress");
});

test("blocked storage keeps the full course usable in memory and reports the limitation", () => {
  const prototype = dom.window.Storage.prototype;
  const get = prototype.getItem, set = prototype.setItem;
  prototype.getItem = () => { throw new Error("blocked"); };
  prototype.setItem = () => { throw new Error("blocked"); };
  try {
    const { result, rerender } = renderHook(({ value }) => useItalianCourseProgress(value), { initialProps: { value: catalog } });
    assert.equal(result.current.ready, true);
    assert.equal(result.current.storageAvailable, false);
    act(() => { result.current.recordActivity("a1", true, false); result.current.recordAssessment("q1", 4, 5, true); result.current.markProduction("p1", true); result.current.setResume("u1", "l1", "a1"); });
    rerender({ value: { ...catalog } });
    assert.equal(result.current.progress.activities.a1.independent, true);
    assert.equal(result.current.progress.assessments.q1.bestAssisted, 80);
    assert.equal(result.current.progress.productions.p1, true);
    assert.equal(result.current.progress.resume?.activityId, "a1");
    assert.equal(result.current.storageAvailable, false);
    act(() => result.current.reset());
    assert.deepEqual(result.current.progress.activities, {});
  } finally { prototype.getItem = get; prototype.setItem = set; }
});

test("quota failure preserves memory and a later successful action saves all accumulated work", () => {
  const prototype = dom.window.Storage.prototype;
  const originalSet = prototype.setItem;
  const { result } = renderHook(() => useItalianCourseProgress(catalog));
  prototype.setItem = () => { throw new Error("quota"); };
  try { act(() => result.current.recordActivity("a1", true, false)); }
  finally { prototype.setItem = originalSet; }
  assert.equal(result.current.storageAvailable, false);
  assert.equal(result.current.progress.activities.a1.completed, true);
  act(() => result.current.recordActivity("a2", true, true));
  assert.equal(result.current.storageAvailable, true);
  assert.deepEqual(Object.keys(saved().activities), ["a1", "a2"]);
});

test("StrictMode does not duplicate actions, and unmount removes the storage listener", () => {
  const prototype = dom.window.Storage.prototype;
  const originalSet = prototype.setItem;
  let writes = 0;
  prototype.setItem = function(key: string, value: string) { writes++; return originalSet.call(this, key, value); };
  try {
    const hook = renderHook(() => useItalianCourseProgress(catalog), { wrapper: ({ children }) => createElement(StrictMode, null, children) });
    assert.equal(writes, 0);
    act(() => hook.result.current.recordActivity("a1", true, false));
    assert.equal(writes, 1);
    assert.equal(saved().activities.a1.attempts, 1);
    hook.unmount();
    act(() => emit(activity(emptyCourseProgress(), "a2", true, false)));
    assert.equal(writes, 1);
  } finally { prototype.setItem = originalSet; }
});

let failed = 0;
try {
  for (const [name, run] of cases) {
    window.localStorage.clear();
    try { run(); console.log(`ok - ${name}`); }
    catch (error) { failed++; console.error(`not ok - ${name}`, error); }
    finally { cleanup(); }
  }
} finally {
  dom.window.close();
  for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
}
console.log(`\nItalian course progress: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
