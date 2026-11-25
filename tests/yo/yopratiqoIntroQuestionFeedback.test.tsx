import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { introCourses } from "@/lib/yo/shared/course";
import { emptyDraft } from "@/lib/yo/shared/state";
import type { Draft, Exercise, IntroCourse } from "@/lib/yo/shared/types";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent, localStorage: dom.window.localStorage,
  requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++frameId, fn); return frameId; },
  cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
const { render, cleanup, fireEvent, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const { IntroQuestion } = require("@/components/yo/shared/IntroQuestion") as typeof import("@/components/yo/shared/IntroQuestion");
let clock = Date.now(); Date.now = () => clock;
function click(element: HTMLElement) { clock += 500; fireEvent.click(element); }
const continueCopy = { fr: "Continuer", en: "Continue", es: "Continuar" };
const checkCopy = { fr: "Vérifier la phrase", en: "Check sentence", es: "Comprobar la frase" };
function mount(course: IntroCourse, exercise: Exercise, locale: YoLocale = "en", initial: Draft = { ...emptyDraft(), heard: true }, assessment = false) {
  cleanup(); frames.clear(); localStorage.clear(); localStorage.setItem("yo.practice.auto-next.v1", "off");
  const attempts: { correct: boolean; assisted: boolean }[] = [];
  let current = initial, continued = 0;
  function Harness({ paused = false }: { paused?: boolean }) {
    const [draft, setDraft] = React.useState(initial);
    return <IntroQuestion course={course} locale={locale} audio={{}} exercise={exercise} value={draft} assessment={assessment} paused={paused}
      onChange={next => { current = next; setDraft(next); }} onAttempt={result => attempts.push(result)} onContinue={() => { continued++; }} />;
  }
  const view = render(<Harness />);
  const answer = (id: string) => {
    const button = view.container.querySelector<HTMLButtonElement>(`[data-answer-id="${id}"]`);
    assert.ok(button, `Expected answer ${id}`); return button;
  };
  return { ...view, attempts, answer, draft: () => current, continued: () => continued, pause: (paused: boolean) => view.rerender(<Harness paused={paused} />) };
}

let multilingual = 0;
for (const course of introCourses) for (const locale of ["fr", "en", "es"] as const) {
  const exercise = course.missions[0].practice[0], wrongId = exercise.options.find(id => id !== exercise.answer)!;
  const target = course.phrases.find(p => p.id === exercise.answer)!, wrong = course.phrases.find(p => p.id === wrongId)!;
  const view = mount(course, exercise, locale);
  assert.equal(view.container.querySelector("[data-intro-answer-feedback]"), null, "No model answer before submitting");
  assert.equal(view.attempts.length, 0, "Mounting a question is not evidence of practice");
  click(view.answer(wrongId));
  assert.deepEqual(view.attempts, [{ correct: false, assisted: true }]);
  const details = view.container.querySelector<HTMLDetailsElement>("[data-intro-answer-feedback]")!;
  assert.ok(details.open, "An error immediately opens useful feedback");
  assert.ok(details.textContent?.includes(target.text) && details.textContent.includes(target.meaning[locale]));
  const chosen = view.container.querySelector("[data-intro-chosen-answer]")!;
  assert.ok(chosen.textContent?.includes(wrong.text) && chosen.textContent.includes(wrong.meaning[locale]));
  assert.ok(view.container.querySelector("[data-intro-feedback-guidance]")?.textContent);
  assert.ok(view.container.querySelector("[data-intro-feedback-concept]")?.textContent?.includes(course.missions[0].concepts[0].body[locale]), "Show the applicable authored explanation, not inferred grammar");
  if (target.reading) assert.ok(details.textContent?.includes(target.reading), "Keep pinyin/kana reading support in feedback");
  assert.equal(view.queryByRole("button", { name: continueCopy[locale] }), null, "Wrong practice is not complete");
  assert.ok(view.answer(wrongId).disabled);
  click(view.answer(wrongId));
  assert.equal(view.attempts.length, 1, "The same disabled wrong choice cannot record a second attempt");
  click(view.answer(exercise.answer));
  assert.deepEqual(view.attempts, [{ correct: false, assisted: true }, { correct: true, assisted: true }], "A correction after seeing the answer stays assisted");
  click(view.answer(exercise.answer));
  assert.equal(view.attempts.length, 2, "A completed answer is accepted once");
  click(view.getByRole("button", { name: continueCopy[locale] }));
  assert.equal(view.continued(), 1);
  multilingual++;
}
console.log(`PASS ${multilingual} language/interface combinations: immediate feedback, actual meaning/concept, sticky assistance and single attempts`);

for (const course of introCourses) {
  const exercise = course.missions[0].practice.find(e => e.kind === "order")!, parts = course.phrases.find(p => p.id === exercise.answer)!.parts!;
  const view = mount(course, exercise, "en", { ...emptyDraft(), tiles: parts.map((_, index) => index).reverse() });
  click(view.getByRole("button", { name: checkCopy.en }));
  assert.deepEqual(view.attempts, [{ correct: false, assisted: true }]);
  assert.ok(view.container.querySelector("[data-intro-order-correction]")?.textContent?.includes(parts[0]));
  click(view.getByRole("button", { name: checkCopy.en }));
  assert.equal(view.attempts.length, 1, "Rechecking identical tiles does not inflate attempts");
  const sentence = within(view.getByRole("group", { name: "Your sentence" }));
  for (const tile of sentence.getAllByRole("button")) click(tile);
  assert.equal(view.draft().checked, false);
  const available = within(view.getByRole("group", { name: "Available words" }));
  for (const part of parts) click(available.getAllByRole("button", { name: part }).find(button => !(button as HTMLButtonElement).disabled)!);
  click(view.getByRole("button", { name: checkCopy.en }));
  assert.deepEqual(view.attempts.at(-1), { correct: true, assisted: true });
  assert.equal(view.attempts.length, 2);
}
console.log("PASS tile-order feedback identifies the model position and accepts a corrected phrase in all seven languages");

const course = introCourses[0];
for (const kind of ["listen", "meaning", "number"] as const) {
  const exercise = course.missions.flatMap(m => [...m.preparation, ...m.practice]).find(e => e.kind === kind)!;
  const view = mount(course, exercise, "en", emptyDraft(), true);
  click(view.answer(exercise.answer));
  assert.equal(view.attempts.length, 0, "Cannot answer an audio-first question before listening or requesting text");
  click(view.getByRole("button", { name: "Read instead of listen" }));
  click(view.answer(exercise.answer));
  assert.deepEqual(view.attempts, [{ correct: true, assisted: true }], "Reading help remains explicit evidence for every listening format");
}
{
  const exercise = course.final[0], view = mount(course, exercise, "en", emptyDraft(), true);
  click(view.answer(exercise.options.find(id => id !== exercise.answer)!));
  assert.deepEqual(view.attempts, [{ correct: false, assisted: false }]);
  assert.ok(view.container.querySelector<HTMLDetailsElement>("[data-intro-answer-feedback]")?.open);
  assert.ok(view.answer(exercise.answer).disabled, "Assessment cannot be corrected in place after seeing its model");
  click(view.answer(exercise.answer));
  assert.equal(view.attempts.length, 1);
  click(view.getByRole("button", { name: "Continue" }));
  assert.equal(view.continued(), 1, "A wrong final answer still lets the learner finish the assessment");
}
{
  const exercise = course.missions[0].practice[0], view = mount(course, exercise);
  view.pause(true); click(view.answer(exercise.answer));
  assert.equal(view.attempts.length, 0, "A paused lesson cannot accept an answer behind a tool or film");
  view.pause(false); click(view.answer(exercise.answer));
  assert.deepEqual(view.attempts, [{ correct: true, assisted: false }]);
}
{
  const exercise = course.missions[0].practice[0];
  const view = mount(course, exercise, "en", { ...emptyDraft(), selected: exercise.answer, checked: true, correct: true });
  assert.equal(view.attempts.length, 0, "Restoring a checked draft never replays its attempt");
  click(view.getByRole("button", { name: "Continue" }));
  assert.equal(view.attempts.length, 0);
  assert.equal(view.continued(), 1);
}
cleanup(); frames.clear();
console.log("PASS audio assistance, assessed answers, paused lessons and restored drafts keep honest attempt semantics");
