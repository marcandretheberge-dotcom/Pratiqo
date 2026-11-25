import assert from "node:assert/strict";
import { introCourses } from "@/lib/yo/shared/course";
import { courseSteps } from "@/lib/yo/shared/steps";
import { emptyDraft, freshIntro, introKey, introPoints } from "@/lib/yo/shared/state";
import { createIntroSyncStore, introEpochKey, INTRO_SYNC_LIMIT } from "@/lib/yo/shared/introSync";
import type { Draft, Exercise, IntroCourse } from "@/lib/yo/shared/types";

type Store = ReturnType<typeof createIntroSyncStore>;
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function seed(course: IntroCourse, disk: ReturnType<typeof memory>) {
  const state = freshIntro(course);
  state.profile = { experience: "some", goal: "travel", minutes: 30, entry: 0 };
  disk.setItem(introKey(course.language), JSON.stringify(state)); return state;
}
function stepFor(course: IntroCourse, exercise: Exercise) { return courseSteps(course).findIndex(step => step.id === exercise.id); }
function answer(course: IntroCourse, exercise: Exercise, correct = true): Draft {
  const phrase = course.phrases.find(item => item.id === exercise.answer)!;
  return { ...emptyDraft(), heard: true, checked: true, correct,
    selected: exercise.kind === "order" ? null : correct ? exercise.answer : exercise.options.find(id => id !== exercise.answer)!,
    tiles: exercise.kind === "order" ? phrase.parts!.map((_, index) => index) : [] };
}
function submit(store: Store, course: IntroCourse, exercise: Exercise, correct = true) {
  const before = store.getSnapshot(), draft = answer(course, exercise, correct);
  if (exercise.kind === "order") {
    store.edit(before.token, { ...draft, checked: false, correct: false });
  }
  const current = store.getSnapshot();
  return store.edit(current.token, draft, { draft, before: current.state.draft });
}

for (const course of introCourses) test(course.language + ": historical evidence is read unchanged, and concurrent lesson completions form a union", () => {
  const disk = memory(), legacy = seed(course, disk), steps = courseSteps(course);
  legacy.best = 5; legacy.completed = [course.missions[0].practice[0].id]; legacy.visited = [steps[0].id];
  disk.setItem(introKey(course.language), JSON.stringify(legacy));
  const original = disk.getItem(introKey(course.language));
  const a = createIntroSyncStore(course, () => disk, () => 1800000000000, "a");
  const b = createIntroSyncStore(course, () => disk, () => 1800000000000, "b");
  assert.equal(a.getSnapshot().state.best, 5); b.getSnapshot(); a.synchronize();
  assert.equal(disk.getItem(introKey(course.language)), original, "hydrating legacy evidence does not rewrite it");
  const first = course.missions[1].practice.find(item => item.kind !== "order")!, second = course.missions[2].practice.find(item => item.kind !== "order")!;
  a.move(stepFor(course, first)); assert.ok(submit(a, course, first)); a.advance(a.getSnapshot().token);
  b.move(stepFor(course, second)); assert.ok(submit(b, course, second)); b.advance(b.getSnapshot().token);
  a.synchronize();
  assert.equal(a.getSnapshot().state.best, 5); assert.equal(b.getSnapshot().state.best, 5);
  assert.deepEqual(new Set(a.getSnapshot().state.completed), new Set([...legacy.completed, first.id, second.id]));
  assert.equal(introPoints(course, a.getSnapshot().state), 130);
  assert.equal(a.getSnapshot().state.step, stepFor(course, first) + 1, "an active lesson never jumps to the other tab's cursor");
  assert.equal(b.getSnapshot().state.step, stepFor(course, second) + 1);
});

test("a real interleaving of two writes is repaired without dropping either completed exercise", () => {
  const course = introCourses[0], disk = memory(); seed(course, disk);
  const original = disk.getItem(introKey(course.language))!;
  const a = createIntroSyncStore(course, () => disk, () => 1800000000000, "a"), b = createIntroSyncStore(course, () => disk, () => 1800000000000, "b");
  a.getSnapshot(); b.getSnapshot();
  const first = course.missions[0].practice[0], second = course.missions[1].practice[0];
  a.move(stepFor(course, first)); submit(a, course, first); a.advance(a.getSnapshot().token);
  // B's storage read happened before A wrote; publish B's independently accepted result afterwards.
  disk.setItem(introKey(course.language), original);
  b.move(stepFor(course, second)); submit(b, course, second); b.advance(b.getSnapshot().token);
  a.synchronize(); b.synchronize();
  assert.deepEqual(new Set(a.getSnapshot().state.completed), new Set([first.id, second.id]));
  assert.deepEqual(a.getSnapshot().state.completed, b.getSnapshot().state.completed);
  assert.equal(a.getSnapshot().state.best, 0); assert.equal(introPoints(course, b.getSnapshot().state), 20);
});

test("recent remote help is included in the accepted answer, and an already checked answer cannot be submitted twice", () => {
  const course = introCourses[0], exercise = course.missions[0].practice.find(item => item.kind !== "order")!, disk = memory(); seed(course, disk);
  const a = createIntroSyncStore(course, () => disk), b = createIntroSyncStore(course, () => disk);
  a.move(stepFor(course, exercise)); b.move(stepFor(course, exercise));
  const old = a.getSnapshot(), remote = b.getSnapshot();
  b.edit(remote.token, { ...remote.state.draft, transcript: true, assisted: true });
  const draft = answer(course, exercise), accepted = a.edit(old.token, draft, { draft, before: old.state.draft });
  assert.equal(accepted?.assisted, true);
  assert.equal(b.edit(remote.token, draft, { draft, before: remote.state.draft }), null);
  assert.equal(b.getSnapshot().state.draft.assisted, true);
  assert.equal(b.getSnapshot().state.draft.checked, true);
});

test("navigation preserves an error and its help; only an explicit new attempt clears it", () => {
  const course = introCourses[0], exercise = course.missions[0].practice.find(item => item.kind !== "order")!, disk = memory(); seed(course, disk);
  const store = createIntroSyncStore(course, () => disk);
  store.move(stepFor(course, exercise)); assert.equal(submit(store, course, exercise, false)?.assisted, true);
  const checked = store.getSnapshot(); store.move(0); store.move(stepFor(course, exercise));
  assert.deepEqual(store.getSnapshot().state.draft, checked.state.draft);
  assert.equal(store.restart(store.getSnapshot().token), true);
  assert.deepEqual(store.getSnapshot().state.draft, emptyDraft());
  assert.equal(store.edit(checked.token, checked.state.draft), null, "an old generation cannot reintroduce its assistance or answer");
  assert.equal(store.getSnapshot().state.completed.length, 0);
});

test("an order check is bound to the rendered tiles and rejects a concurrent changed sentence", () => {
  const course = introCourses[0], exercise = course.missions.flatMap(mission => mission.practice).find(item => item.kind === "order")!, disk = memory(); seed(course, disk);
  const a = createIntroSyncStore(course, () => disk), b = createIntroSyncStore(course, () => disk);
  a.move(stepFor(course, exercise)); b.move(stepFor(course, exercise));
  const expected = answer(course, exercise);
  a.edit(a.getSnapshot().token, { ...expected, checked: false, correct: false });
  const old = a.getSnapshot();
  b.edit(b.getSnapshot().token, { ...emptyDraft(), tiles: [...expected.tiles].reverse() });
  assert.equal(a.edit(old.token, expected, { draft: expected, before: old.state.draft }), null);
  assert.deepEqual(a.getSnapshot().state.draft.tiles, [...expected.tiles].reverse());
  assert.equal(a.getSnapshot().state.draft.checked, false);
});

test("a shared final resumes its exact first checks, preserves assistance, and accepts each question once", () => {
  const course = introCourses[0], disk = memory(); seed(course, disk);
  const a = createIntroSyncStore(course, () => disk); a.startFinal();
  const b = createIntroSyncStore(course, () => disk); b.resume();
  const exercise = course.final[0], old = a.getSnapshot();
  b.edit(b.getSnapshot().token, { ...emptyDraft(), assisted: true, transcript: true });
  assert.equal(submit(a, course, exercise)?.assisted, true);
  assert.equal(b.edit(b.getSnapshot().token, answer(course, exercise), { draft: answer(course, exercise), before: b.getSnapshot().state.draft }), null);
  assert.equal(a.nextFinal(old.token).accepted, true);
  assert.equal(b.nextFinal(old.token).accepted, false);
  const before = disk.getItem(introKey(course.language));
  const restored = createIntroSyncStore(course, () => disk); restored.getSnapshot();
  assert.equal(disk.getItem(introKey(course.language)), before);
  restored.resume(); assert.equal(restored.getSnapshot().state.finalIndex, 1);
  assert.deepEqual(restored.getSnapshot().state.answers, [{ correct: true, assisted: true }]);
  assert.equal(restored.getSnapshot().state.best, 0);
});

test("a deliberate new final rejects old callbacks and preserves an already earned historical best", () => {
  const course = introCourses[0], disk = memory(), state = seed(course, disk); state.best = 6;
  disk.setItem(introKey(course.language), JSON.stringify(state));
  const a = createIntroSyncStore(course, () => disk); a.startFinal();
  const old = a.getSnapshot(); submit(a, course, course.final[0]); a.nextFinal(old.token);
  const b = createIntroSyncStore(course, () => disk); b.startFinal();
  assert.equal(a.nextFinal(old.token).accepted, false);
  assert.equal(a.edit(old.token, answer(course, course.final[0])), null);
  assert.deepEqual(a.getSnapshot().state.answers, []); assert.equal(a.getSnapshot().state.best, 6);
  assert.equal(a.getSnapshot().state.finalIndex, 0);
});

test("completion is awarded once from accepted checks, never by restoration or another tab's advance", () => {
  const course = introCourses[0], disk = memory(); seed(course, disk);
  const a = createIntroSyncStore(course, () => disk); a.startFinal();
  const b = createIntroSyncStore(course, () => disk); b.resume();
  let firstPasses = 0, lastToken = "";
  for (const exercise of course.final) {
    lastToken = a.getSnapshot().token; submit(a, course, exercise);
    const result = a.nextFinal(lastToken); if (result.firstPass) firstPasses++;
  }
  assert.equal(firstPasses, 1); assert.equal(a.getSnapshot().state.best, course.final.length);
  assert.deepEqual(b.nextFinal(lastToken), { accepted: false, firstPass: false });
  const restored = createIntroSyncStore(course, () => disk); assert.equal(restored.getSnapshot().state.best, course.final.length);
  assert.deepEqual(restored.nextFinal(lastToken), { accepted: false, firstPass: false });
});

test("reset and real deletion dominate stale callbacks even before storage events are delivered", () => {
  const course = introCourses[0], disk = memory(); seed(course, disk);
  const a = createIntroSyncStore(course, () => disk), b = createIntroSyncStore(course, () => disk), exercise = course.missions[0].practice[0];
  a.move(stepFor(course, exercise)); b.move(stepFor(course, exercise));
  const old = a.getSnapshot(), oldRaw = disk.getItem(introKey(course.language))!;
  b.reset(); assert.equal(a.edit(old.token, answer(course, exercise)), null);
  assert.equal(a.getSnapshot().state.profile, null); assert.equal(a.getSnapshot().state.best, 0);
  disk.setItem(introKey(course.language), oldRaw); // A delayed old writer cannot bypass the persisted reset epoch.
  const afterReset = createIntroSyncStore(course, () => disk); assert.equal(afterReset.getSnapshot().state.profile, null);
  afterReset.profile({ experience: "new", goal: "work", minutes: 60, entry: 0 });
  const beforeDelete = afterReset.getSnapshot(); disk.values.delete(introKey(course.language));
  assert.equal(afterReset.edit(beforeDelete.token, answer(course, exercise)), null);
  assert.ok(disk.getItem(introEpochKey(course.language)));
  assert.equal(afterReset.getSnapshot().state.profile, null);
});

test("the parser scopes evidence to its language, bounds malformed metadata, and reports storage failure honestly", () => {
  const course = introCourses[0], other = introCourses[1], disk = memory(); seed(course, disk);
  const raw = disk.getItem(introKey(course.language))!; disk.setItem(introKey(other.language), raw);
  assert.deepEqual(createIntroSyncStore(other, () => disk).getSnapshot().state, freshIntro(other));
  disk.setItem(introKey(course.language), "x".repeat(INTRO_SYNC_LIMIT + 1));
  assert.deepEqual(createIntroSyncStore(course, () => disk).getSnapshot().state, freshIntro(course));
  const blocked = createIntroSyncStore(course, () => ({ getItem: () => null, setItem: () => { throw new Error("quota"); } }));
  blocked.profile({ experience: "new", goal: "travel", minutes: 30, entry: 0 });
  assert.equal(blocked.getSnapshot().storageError, true); assert.ok(blocked.getSnapshot().state.profile);
});

test("a new content revision clears an unfinished final but keeps historical best and rejects writes from its old open store", () => {
  const course = introCourses[0], disk = memory(), legacy = seed(course, disk);
  legacy.best = 5; disk.setItem(introKey(course.language), JSON.stringify(legacy));
  const old = createIntroSyncStore(course, () => disk); old.startFinal();
  submit(old, course, course.final[0]); old.nextFinal(old.getSnapshot().token);
  const oldToken = old.getSnapshot().token;
  assert.equal(old.getSnapshot().state.answers.length, 1);
  const revised = structuredClone(course); revised.phrases[0].text += " revised";
  const current = createIntroSyncStore(revised, () => disk);
  assert.equal(current.getSnapshot().state.best, 5);
  assert.deepEqual(current.getSnapshot().state.answers, []);
  assert.equal(current.getSnapshot().state.finalIndex, 0);
  current.resume(); submit(current, revised, revised.final[0]);
  const raw = disk.getItem(introKey(course.language));
  assert.equal(old.edit(oldToken, answer(course, course.final[1])), null);
  assert.deepEqual(old.nextFinal(oldToken), { accepted: false, firstPass: false });
  old.startFinal(); old.reset();
  assert.equal(disk.getItem(introKey(course.language)), raw, "an obsolete open store cannot erase or replace new-revision answers");
  assert.equal(current.getSnapshot().state.draft.checked, true);
  assert.equal(current.getSnapshot().state.best, 5);
});

test("malformed synchronization metadata cannot shadow the validated final history with an invented completion", () => {
  const course = introCourses[0], disk = memory(); seed(course, disk);
  const store = createIntroSyncStore(course, () => disk); store.startFinal();
  const raw = JSON.parse(disk.getItem(introKey(course.language))!);
  raw.sync.final.answers = course.final.map(() => ({ correct: true, assisted: false }));
  disk.setItem(introKey(course.language), JSON.stringify(raw));
  const restored = createIntroSyncStore(course, () => disk); restored.resume();
  assert.equal(restored.getSnapshot().state.view, "final");
  assert.equal(restored.getSnapshot().state.finalIndex, 0);
  assert.deepEqual(restored.getSnapshot().state.answers, []);
  assert.equal(restored.getSnapshot().state.best, 0); assert.equal(introPoints(course, restored.getSnapshot().state), 0);
});

for (const [name, run] of cases) { run(); console.log("PASS " + name); }
console.log(cases.length + "/" + cases.length + " intro synchronization checks passed");
