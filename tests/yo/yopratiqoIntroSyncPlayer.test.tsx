import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { dismissMissionFilms, prepareCinemaMedia } from "../helpers/lessonCinema";
import { introCourses } from "@/lib/yo/shared/course";
import { emptyDraft, freshIntro, introKey } from "@/lib/yo/shared/state";
import { createIntroSyncStore, introEpochKey } from "@/lib/yo/shared/introSync";
import { courseSteps } from "@/lib/yo/shared/steps";
import { REVIEW_STORAGE_PREFIX } from "@/lib/yo/review/state";
import { woodSamples, type FeedbackCue } from "@/lib/yo/feedback/woodSound";
import type { Exercise, IntroCourse } from "@/lib/yo/shared/types";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(process.cwd() + "/package.json"), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Element: dom.window.Element, Node: dom.window.Node,
  NodeFilter: dom.window.NodeFilter, DocumentFragment: dom.window.DocumentFragment, CustomEvent: dom.window.CustomEvent, Event: dom.window.Event,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle, localStorage: dom.window.localStorage,
  requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: (id: number) => frames.delete(id),
  IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
window.scrollTo = () => {}; dom.window.HTMLElement.prototype.scrollIntoView = () => {}; prepareCinemaMedia();
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const { SharedIntro } = require("@/components/yo/shared/SharedIntro") as typeof import("@/components/yo/shared/SharedIntro");
const cues: FeedbackCue[] = [], samples = (["correct", "stamp", "step", "mission", "unlock"] as const).map(kind => ({ kind, data: woodSamples(kind) }));
class SoundContext {
  state = "running"; destination = {};
  createBuffer() { const buffer: { kind?: FeedbackCue; copyToChannel: (data: Float32Array) => void } = { copyToChannel(data) { buffer.kind = samples.find(sample => sample.data.length === data.length && sample.data.every((n, i) => n === data[i]))?.kind; } }; return buffer; }
  createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  createBufferSource() { const source: { buffer: { kind: FeedbackCue } | null; onended: unknown; connect: () => void; disconnect: () => void; start: () => void; stop: () => void } = { buffer: null, onended: null, connect() {}, disconnect() {}, start() { cues.push(source.buffer!.kind); }, stop() {} }; return source; }
  close() { return Promise.resolve(); } resume() { return Promise.resolve(); }
}
Object.defineProperty(window, "AudioContext", { value: SoundContext, configurable: true });
let now = Date.now(); Date.now = () => now;
function flush() {
  for (let index = 0; index < 20 && frames.size; index++) { const batch = [...frames.values()]; frames.clear(); act(() => batch.forEach(fn => fn(0))); }
  dismissMissionFilms();
  for (let index = 0; index < 10; index++) {
    const skip = document.querySelector<HTMLButtonElement>("[data-travel-film] .yo-film-skip");
    if (!skip) break;
    act(() => skip.click()); dismissMissionFilms();
  }
}
function click(element: HTMLElement) { now += 500; fireEvent.click(element); flush(); }
function reset() { cleanup(); frames.clear(); localStorage.clear(); cues.length = 0; localStorage.setItem("yo.practice.auto-next.v1", "off"); }
function seed(course: IntroCourse, exercise: Exercise) {
  const steps = courseSteps(course), state = freshIntro(course);
  state.profile = { experience: "some", goal: "travel", minutes: 30, entry: 0 };
  state.visited = [steps[0].id]; state.resume = "lesson"; state.step = steps.findIndex(step => step.id === exercise.id);
  state.draft = { ...emptyDraft(), heard: true };
  localStorage.setItem(introKey(course.language), JSON.stringify(state));
}
function node(course: IntroCourse, locale: YoLocale = "en") { return <SharedIntro course={course} locale={locale} audio={{}} />; }
function mount(course: IntroCourse) { const view = render(node(course)); flush(); return view; }
type View = ReturnType<typeof mount>;
const scope = (view: View) => within(view.container);
function question(view: View) { const result = view.container.querySelector<HTMLElement>("[data-intro-question]"); assert.ok(result); return result; }
function select(view: View, exercise: Exercise, correct = true) {
  const id = correct ? exercise.answer : exercise.options.find(value => value !== exercise.answer)!;
  const button = question(view).querySelector<HTMLButtonElement>('[data-answer-id="' + id + '"]'); assert.ok(button); click(button);
}
function resume(view: View) { click(scope(view).getByRole("button", { name: "Continue" })); }
function receipts() {
  return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(key => key.startsWith(REVIEW_STORAGE_PREFIX)).sort().map(key => localStorage.getItem(key)!);
}
function storageEvent(key: string | null, area = localStorage, newValue: string | null = null) {
  act(() => window.dispatchEvent(new dom.window.StorageEvent("storage", { key, newValue, storageArea: area }))); flush();
}
const course = introCourses[0], exercise = course.missions[0].practice.find(item => item.kind === "listen" || item.kind === "meaning" || item.kind === "number")!;
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);

test("two real players apply remote help before the answer and reject duplicate feedback/SRS from the stale view", () => {
  seed(course, exercise); const a = mount(course), b = mount(course); resume(a); resume(b);
  click(within(question(b)).getByRole("button", { name: "Read instead of listen" }));
  assert.equal(receipts().length, 0);
  select(a, exercise);
  const events = receipts(), feedback = [...cues];
  assert.equal(events.length, 1); assert.equal(JSON.parse(events[0]).assisted, true); assert.equal(JSON.parse(events[0]).correct, true);
  select(b, exercise);
  assert.deepEqual(receipts(), events); assert.deepEqual(cues, feedback);
  assert.equal(JSON.parse(localStorage.getItem(introKey(course.language))!).draft.assisted, true);
  assert.equal(JSON.parse(localStorage.getItem(introKey(course.language))!).best, 0);
});

test("an actual wrong answer and its help survive refresh and locale changes without another attempt or reward", () => {
  seed(course, exercise); let view = mount(course); resume(view); select(view, exercise, false);
  const events = receipts(), feedback = [...cues], raw = localStorage.getItem(introKey(course.language));
  view.unmount(); view = mount(course);
  assert.equal(localStorage.getItem(introKey(course.language)), raw);
  assert.deepEqual(receipts(), events); assert.deepEqual(cues, feedback);
  resume(view); view.rerender(node(course, "fr")); flush();
  assert.equal(JSON.parse(localStorage.getItem(introKey(course.language))!).draft.assisted, true);
  assert.ok(within(question(view)).getByText("Pas tout à fait. Essaie encore."));
  const beforeRestart = receipts();
  click(within(question(view)).getByRole("button", { name: "Recommencer sans aide" }));
  const restored = createIntroSyncStore(course).getSnapshot().state;
  assert.equal(restored.draft.assisted, false); assert.equal(restored.draft.checked, false);
  assert.deepEqual(receipts(), beforeRestart);
});

test("real accepted exercises from different open lesson views are both preserved", () => {
  const first = course.missions[0].practice.find(item => item.kind === "reply")!, second = course.missions[0].practice.find(item => item.kind === "reply" && item.id !== first.id)!;
  seed(course, first); const a = mount(course); resume(a);
  // Set only the other view's desired navigation, using the same real local store; no result is seeded.
  act(() => createIntroSyncStore(course).move(courseSteps(course).findIndex(step => step.id === second.id)));
  const b = mount(course); resume(b);
  assert.equal(question(a).dataset.introQuestion, first.id); assert.equal(question(b).dataset.introQuestion, second.id);
  select(a, first); select(b, second);
  click(within(question(a)).getByRole("button", { name: "Continue" }));
  click(within(question(b)).getByRole("button", { name: "Continue" }));
  const saved = JSON.parse(localStorage.getItem(introKey(course.language))!);
  assert.ok(saved.completed.includes(first.id)); assert.ok(saved.completed.includes(second.id));
  assert.equal(saved.best, 0);
  const feedback = [...cues], events = receipts();
  storageEvent(introKey(course.language));
  assert.deepEqual(cues, feedback); assert.deepEqual(receipts(), events);
});

test("a fresh final started in the second player invalidates the first player's checked Continue", () => {
  seed(course, exercise); const a = mount(course);
  click(scope(a).getByRole("button", { name: "Already comfortable? Try the challenge" }));
  const finalExercise = course.final[0]; select(a, finalExercise);
  const staleContinue = within(question(a)).getByRole("button", { name: "Continue" });
  const b = mount(course);
  click(scope(b).getByRole("button", { name: "Already comfortable? Try the challenge" }));
  const before = receipts(), feedback = [...cues];
  click(staleContinue);
  const saved = JSON.parse(localStorage.getItem(introKey(course.language))!);
  assert.deepEqual(saved.answers, []); assert.equal(saved.finalIndex, 0); assert.equal(saved.draft.checked, false);
  assert.equal(saved.best, 0); assert.deepEqual(receipts(), before); assert.deepEqual(cues, feedback);
  assert.equal(question(a).dataset.introQuestion, finalExercise.id);
});

test("real deletion dominates both stale players before any storage event and does not replay their SRS", () => {
  seed(course, exercise); const a = mount(course), b = mount(course); resume(a); resume(b);
  select(a, exercise, false);
  const before = receipts(), feedback = [...cues];
  localStorage.removeItem(introKey(course.language));
  select(a, exercise); select(b, exercise);
  assert.equal(localStorage.getItem(introKey(course.language)), null);
  assert.ok(localStorage.getItem(introEpochKey(course.language)));
  assert.ok(scope(a).getByRole("button", { name: "I’m starting from zero" }));
  assert.ok(scope(b).getByRole("button", { name: "I’m starting from zero" }));
  assert.deepEqual(receipts(), before); assert.deepEqual(cues, feedback);
});

test("delayed remove and unrelated sessionStorage events use the current stored value without erasing a newer result", () => {
  seed(course, exercise); const view = mount(course); resume(view); select(view, exercise, false);
  const raw = localStorage.getItem(introKey(course.language)), feedback = [...cues], events = receipts();
  storageEvent(introKey(course.language), localStorage, null);
  storageEvent(introKey(course.language), window.sessionStorage, null);
  assert.equal(localStorage.getItem(introKey(course.language)), raw);
  assert.equal(localStorage.getItem(introEpochKey(course.language)), null);
  assert.deepEqual(receipts(), events); assert.deepEqual(cues, feedback);
  assert.ok(within(question(view)).getByText("Not quite. Try again."));
});

test("switching the same mounted SharedIntro from EN to ES and back isolates the saved answer and assistance", () => {
  const spanish = introCourses.find(item => item.language === "es")!;
  const spanishExercise = spanish.missions[0].practice.find(item => item.kind === exercise.kind)!;
  seed(course, exercise); seed(spanish, spanishExercise);
  const view = mount(course); resume(view); select(view, exercise, false);
  const english = localStorage.getItem(introKey(course.language)), events = receipts();
  view.rerender(node(spanish)); flush(); resume(view);
  assert.equal(question(view).dataset.introQuestion, spanishExercise.id);
  assert.equal(JSON.parse(localStorage.getItem(introKey(spanish.language))!).draft.checked, false);
  assert.equal(JSON.parse(localStorage.getItem(introKey(spanish.language))!).draft.assisted, false);
  assert.equal(localStorage.getItem(introKey(course.language)), english); assert.deepEqual(receipts(), events);
  view.rerender(node(course)); flush(); resume(view);
  assert.ok(within(question(view)).getByText("Not quite. Try again."));
  assert.equal(JSON.parse(localStorage.getItem(introKey(course.language))!).draft.assisted, true);
  assert.deepEqual(receipts(), events);
});

test("a newer lesson revision explains the required refresh without overwriting progress or replaying a result", () => {
  seed(course, exercise); const view = mount(course); resume(view);
  const oldAnswer = within(question(view)).getByRole("button", { name: course.phrases.find(item => item.id === exercise.answer)!.text });
  const changed = structuredClone(course); changed.phrases[0].text += " Updated lesson.";
  act(() => createIntroSyncStore(changed).move(courseSteps(changed).findIndex(step => step.id === exercise.id)));
  const saved = localStorage.getItem(introKey(course.language)), events = receipts(), feedback = [...cues];
  storageEvent(introKey(course.language));
  assert.match(scope(view).getByRole("alert").textContent ?? "", /This lesson has changed/);
  assert.ok(scope(view).getByRole("button", { name: "Refresh lesson" }));
  assert.equal(scope(view).queryByText("Saving is unavailable in this browser."), null);
  click(oldAnswer);
  assert.equal(localStorage.getItem(introKey(course.language)), saved);
  assert.deepEqual(receipts(), events); assert.deepEqual(cues, feedback);
});

for (const [name, run] of cases) { reset(); run(); console.log("PASS " + name); }
cleanup(); dom.window.close(); console.log(cases.length + "/" + cases.length + " real intro synchronization checks passed");
