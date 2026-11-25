import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProgress, initialAttempt, MANDARIN_PROGRESS_LIMIT, parseProgress } from "@/lib/yo/mandarin/progress";
import { mandarinSnapshot, mergeMandarinProgress, resetMandarinProgress, serializeMandarinProgress, stampMandarinUpdate } from "@/lib/yo/mandarin/progressSync";
import { mandarinUnits } from "@/lib/yo/mandarin/course";
import type { Progress } from "@/lib/yo/mandarin/types";

const A = "m-0000000000000001", B = "m-0000000000000002";
const pass = { passed: true, independent: true, attempts: 1, review: false };
function answer(state: Progress, id: string, actor: string, independent = true) {
  return stampMandarinUpdate(state, { ...state, results: { ...state.results, [id]: { ...pass, independent, attempts: (state.results[id]?.attempts ?? 0) + 1, review: !independent } } }, state, actor);
}

test("simultaneous independent tabs retain distinct results and count same-item attempts once per actor", () => {
  const base = emptyProgress();
  const one = answer(base, "zh-u09-recall-1", A);
  const two = answer(base, "zh-u10-recall-1", B, false);
  const merged = mergeMandarinProgress(one, two);
  assert.equal(merged.results["zh-u09-recall-1"].independent, true);
  assert.equal(merged.results["zh-u10-recall-1"].passed, true);
  assert.equal(merged.results["zh-u10-recall-1"].independent, false);
  assert.equal(mandarinSnapshot(merged), mandarinSnapshot(mergeMandarinProgress(two, one)));
  const concurrentSameItem = answer(base, "zh-u09-recall-1", B, false);
  const combined = mergeMandarinProgress(one, concurrentSameItem);
  assert.equal(combined.results["zh-u09-recall-1"].attempts, 2);
  assert.equal(combined.results["zh-u09-recall-1"].independent, true);
  assert.deepEqual(mergeMandarinProgress(combined, one).results, combined.results);
  const third = answer(combined, "zh-u09-recall-1", A, false);
  assert.equal(third.results["zh-u09-recall-1"].attempts, 3);
  assert.equal(mergeMandarinProgress(third, concurrentSameItem).results["zh-u09-recall-1"].attempts, 3);
});

test("legacy aggregate results stay exact and are not counted again when merged with new metadata", () => {
  const legacy = emptyProgress();
  legacy.results["zh-u01-write"] = { ...pass, attempts: 5 };
  legacy.unit = "bilan";
  legacy.steps.bilan = 3;
  const restored = parseProgress(JSON.stringify(legacy));
  assert.deepEqual(restored, legacy);
  const next = answer(restored, "zh-u01-write", A, false);
  assert.equal(next.results["zh-u01-write"].attempts, 6);
  assert.equal(next.results["zh-u01-write"].independent, true);
  assert.equal(mergeMandarinProgress(next, legacy).results["zh-u01-write"].attempts, 6);
  const oldClient = { ...legacy, results: { "zh-u01-write": { ...pass, attempts: 6 } } };
  assert.equal(mergeMandarinProgress(next, oldClient).results["zh-u01-write"].attempts, 6);
  assert.equal(next.unit, "bilan");
});

test("same-attempt help is sticky; only a new explicit generation clears it and stale checked drafts cannot return", () => {
  const exercise = mandarinUnits[0].exercises.find(item => item.kind === "write")!;
  const base = emptyProgress();
  base.drafts[exercise.id] = initialAttempt(exercise);
  const helped = stampMandarinUpdate(base, { ...base, drafts: { [exercise.id]: { ...base.drafts[exercise.id], hint: true, assisted: true } } }, base, A);
  const typed = stampMandarinUpdate(base, { ...base, drafts: { [exercise.id]: { ...base.drafts[exercise.id], answer: exercise.model.hanzi } } }, base, B);
  const combined = mergeMandarinProgress(helped, typed);
  assert.equal(combined.drafts[exercise.id].assisted, true);
  assert.equal(combined.drafts[exercise.id].hint, true);
  const checked = stampMandarinUpdate(combined, { ...combined, drafts: { [exercise.id]: { ...combined.drafts[exercise.id], checked: true, correct: true } } }, combined, A);
  assert.equal(mergeMandarinProgress(checked, typed).drafts[exercise.id].checked, true);
  const restarted = stampMandarinUpdate(checked, { ...checked, drafts: { [exercise.id]: { ...initialAttempt(exercise), generation: 1 } }, pinyin: false, translation: false }, checked, A);
  const lateHelp = stampMandarinUpdate(helped, { ...helped, drafts: { [exercise.id]: { ...helped.drafts[exercise.id], answer: "old answer" } } }, helped, B);
  const final = mergeMandarinProgress(restarted, lateHelp);
  assert.equal(final.drafts[exercise.id].generation, 1);
  assert.equal(final.drafts[exercise.id].answer, "");
  assert.equal(final.drafts[exercise.id].assisted, false);
  assert.equal(final.drafts[exercise.id].hint, false);
});

test("a reset dominates an older tab even when that tab writes afterwards; new work starts in the reset epoch", () => {
  const before = answer(emptyProgress(), "zh-u01-write", A);
  const reset = resetMandarinProgress(before, B);
  const late = answer(before, "zh-u12-recall-1", A);
  assert.deepEqual(mergeMandarinProgress(reset, late).results, {});
  assert.deepEqual(mergeMandarinProgress(late, reset).results, {});
  assert.equal(stampMandarinUpdate(reset, late, before, A), reset);
  const fresh = answer(reset, "zh-u09-recall-1", B);
  assert.deepEqual(Object.keys(mergeMandarinProgress(fresh, late).results), ["zh-u09-recall-1"]);
  assert.equal(fresh.resetAt, reset.resetAt);
  assert.equal(parseProgress(JSON.stringify(fresh)).resetAt, reset.resetAt);
});

test("new IDs and bounded sync metadata parse without admitting foreign/prototype fields or preserving audio evidence", () => {
  const state = answer(emptyProgress(), "zh-foundations-final-u12-write", A);
  state.unit = "bilan-fondations";
  state.steps.u12 = 10;
  state.steps["bilan-fondations"] = 2;
  const exercise = mandarinUnits[0].exercises[0];
  state.drafts[exercise.id] = { ...initialAttempt(exercise), heard: true, generation: 2, assisted: true };
  const restored = parseProgress(serializeMandarinProgress(state));
  assert.equal(restored.results["zh-foundations-final-u12-write"].attempts, 1);
  assert.equal(restored.steps.u12, 10);
  assert.equal(restored.unit, "bilan-fondations");
  assert.equal(restored.drafts[exercise.id].heard, false);
  assert.equal(restored.drafts[exercise.id].generation, 2);
  assert.equal(restored.drafts[exercise.id].assisted, true);
  const malicious = parseProgress('{"version":1,"unit":"u99","results":{"__proto__":{"passed":true},"ja-u09-write":{"passed":true}},"sync":{"clock":1,"marks":{"__proto__":[1,"m-0000000000000001"]},"attempts":{"constructor":{"base":99,"actors":{}}}}}');
  assert.deepEqual(malicious.results, {});
  assert.deepEqual(malicious.sync?.marks, {});
  assert.deepEqual(malicious.sync?.attempts, {});
  assert.equal(malicious.unit, "u01");
  const tooLarge = { ...state, drafts: { [exercise.id]: { ...initialAttempt(exercise), answer: "x".repeat(MANDARIN_PROGRESS_LIMIT) } } };
  assert.equal(serializeMandarinProgress(tooLarge), null);
  assert.deepEqual(parseProgress("x".repeat(MANDARIN_PROGRESS_LIMIT + 1)), emptyProgress());
});
