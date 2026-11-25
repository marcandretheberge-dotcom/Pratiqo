import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/anglais/demarrer", pretendToBeVisual: true });
for (const [key, value] of Object.entries({
  React, window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
  CustomEvent: dom.window.CustomEvent, Event: dom.window.Event, StorageEvent: dom.window.StorageEvent,
  MutationObserver: dom.window.MutationObserver, localStorage: dom.window.localStorage,
  getComputedStyle: dom.window.getComputedStyle, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });

let now = Date.UTC(2026, 10, 25, 12);
const originalNow = Date.now;
Date.now = () => now;
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const { introCourses } = require("@/lib/yo/shared/course") as typeof import("../../lib/yo/shared/course");
const { IntroDueReview } = require("@/components/yo/review/IntroDueReview") as typeof import("../../components/yo/review/IntroDueReview");
const { YoDueReviewPanel } = require("@/components/yo/review/YoDueReviewPanel") as typeof import("../../components/yo/review/YoDueReviewPanel");
const { introReviewItems } = require("@/lib/yo/review/intro") as typeof import("../../lib/yo/review/intro");
const { recordReviewAttempt, readReviewState } = require("@/lib/yo/review/store") as typeof import("../../lib/yo/review/store");
const { reviewEventKey } = require("@/lib/yo/review/state") as typeof import("../../lib/yo/review/state");
const { AUTO_NEXT_KEY } = require("@/components/yo/learning/PracticeAdvance") as typeof import("../../components/yo/learning/PracticeAdvance");

function reset() { cleanup(); now += 1000; window.localStorage.clear(); window.localStorage.setItem(AUTO_NEXT_KEY, "off"); }
function click(element: Element) { now += 400; fireEvent.click(element); }
const launches = { fr: "Revoir jusqu’à 3 phrases", en: "Review up to 3 phrases", es: "Repasar hasta 3 frases" };
const continues = { fr: "Continuer", en: "Continue", es: "Continuar" };
const tests: Array<[string, () => void]> = [];

tests.push(["all seven intro targets and three interfaces review actual checked answers without changing course outcomes", () => {
  for (const course of introCourses) for (const locale of ["fr", "en", "es"] as const) {
    reset();
    const exercise = course.missions[0].practice[0];
    const item = introReviewItems(course).find((entry) => entry.activityId === exercise.id)!;
    const originalProgress = JSON.stringify({ best: 6, completed: ["kept"], resume: "kept-private-draft" });
    window.localStorage.setItem(`yo.shared-intro.v1.${course.language}`, originalProgress);
    recordReviewAttempt({ language: course.language, itemId: item.id, correct: false, assisted: false, attemptId: `seed-${locale}`, at: now - 1000 });
    const view = render(<IntroDueReview course={course} locale={locale} audio={{}} />);
    assert.equal(view.container.querySelector("[data-intro-question]"), null, "a due item never opens itself");
    click(view.getByRole("button", { name: launches[locale] }));
    assert.equal(view.container.querySelector("[data-intro-question]")?.getAttribute("data-intro-question"), exercise.id);
    const wrong = exercise.options.find((option) => option !== exercise.answer)!;
    click(view.container.querySelector(`[data-answer-id="${wrong}"]`)!);
    const beforeRepeat = readReviewState(course.language).records[item.id].attempts;
    click(view.container.querySelector(`[data-answer-id="${wrong}"]`)!);
    assert.equal(readReviewState(course.language).records[item.id].attempts, beforeRepeat, "a disabled repeated tap is not another attempt");
    click(view.container.querySelector(`[data-answer-id="${exercise.answer}"]`)!);
    const reviewed = readReviewState(course.language).records[item.id];
    assert.equal(reviewed.streak, 0, "correcting after feedback remains assisted");
    assert.equal(reviewed.nextReviewAt, reviewed.lastAt + 86400000);
    click(view.getByRole("button", { name: continues[locale] }));
    assert.equal(view.container.querySelector("[data-intro-question]"), null);
    assert.equal(view.queryByRole("button", { name: launches[locale] }), null);
    assert.equal(window.localStorage.getItem(`yo.shared-intro.v1.${course.language}`), originalProgress);
    const title = view.container.querySelector("[data-yo-due-review] h2");
    assert.equal(document.activeElement, title, "finishing returns focus to the review summary");
    cleanup();
    const reloaded = render(<IntroDueReview course={course} locale={locale} audio={{}} />);
    assert.equal(reloaded.container.querySelector("[data-intro-question]"), null);
    assert.equal(reloaded.queryByRole("button", { name: launches[locale] }), null, "reload retains tomorrow's date");
  }
}]);

tests.push(["cross-tab receipts refresh the appropriate queue and leaving review stops lesson audio", () => {
  reset();
  const course = introCourses[0], item = introReviewItems(course).find((entry) => entry.exercise.kind === "reply")!;
  const view = render(<IntroDueReview course={course} locale="en" audio={{}} />);
  const event = { version: 1 as const, language: "en" as const, itemId: item.id, id: "other-tab", at: now, correct: false, assisted: false };
  const key = reviewEventKey(event), value = JSON.stringify(event);
  window.localStorage.setItem(key, value);
  act(() => window.dispatchEvent(new StorageEvent("storage", { key, newValue: value })));
  click(view.getByRole("button", { name: launches.en }));
  let stops = 0;
  const stop = () => { stops++; };
  window.addEventListener("yo-audio-stop", stop);
  fireEvent.keyDown(view.container.querySelector("[data-intro-question]")!, { key: "Escape" });
  assert.ok(stops >= 1);
  assert.equal(view.container.querySelector("[data-intro-question]"), null);
  click(view.getByRole("button", { name: launches.en }));
  const beforeUnmount = stops;
  cleanup();
  assert.ok(stops > beforeUnmount, "unmount cancels any pending recording or playback");
  window.removeEventListener("yo-audio-stop", stop);
  assert.equal(readReviewState("en").records[item.id].attempts, 1, "opening/closing is not evidence");
}]);

tests.push(["a callback from a previous target cannot write an answer into the next target", () => {
  reset();
  const itemId = "interest:art:venue";
  recordReviewAttempt({ language: "en", itemId, correct: false, assisted: false, attemptId: "en-seed", at: now });
  recordReviewAttempt({ language: "fr", itemId, correct: false, assisted: false, attemptId: "fr-seed", at: now });
  let oldAttempt: ((result: { correct: boolean; assisted: boolean }) => void) | undefined;
  const renderExercise = (_id: string, actions: import("../../components/yo/review/YoDueReviewPanel").ReviewExerciseActions) => {
    oldAttempt = actions.onAttempt;
    return <p>Checked renderer</p>;
  };
  const view = render(<YoDueReviewPanel language="en" locale="en" itemIds={[itemId]} renderExercise={renderExercise} />);
  click(view.getByRole("button", { name: launches.en }));
  assert.ok(oldAttempt);
  view.rerender(<YoDueReviewPanel language="fr" locale="en" itemIds={[itemId]} renderExercise={renderExercise} />);
  act(() => oldAttempt!({ correct: true, assisted: false }));
  assert.equal(readReviewState("fr").records[itemId].attempts, 1);
  assert.equal(readReviewState("en").records[itemId].attempts, 1);
  assert.equal(view.queryByText("Checked renderer"), null);
}]);

tests.push(["closing and reopening the same item invalidates the previous session's callback", () => {
  reset();
  const itemId = "interest:history:venue";
  recordReviewAttempt({ language: "en", itemId, correct: false, assisted: false, attemptId: "reopen-seed", at: now });
  let latest: import("../../components/yo/review/YoDueReviewPanel").ReviewExerciseActions | undefined;
  const view = render(<YoDueReviewPanel language="en" locale="en" itemIds={[itemId]} renderExercise={(_id, actions) => {
    latest = actions;
    return <p>Checked renderer</p>;
  }} />);
  click(view.getByRole("button", { name: launches.en }));
  const stale = latest!;
  click(view.getByRole("button", { name: "Close review" }));
  click(view.getByRole("button", { name: launches.en }));
  act(() => stale.onAttempt({ correct: true, assisted: false }));
  act(() => stale.onContinue());
  assert.equal(readReviewState("en").records[itemId].attempts, 1);
  assert.ok(view.getByText("Checked renderer"));
}]);

tests.push(["a failed browser write shows session-only feedback instead of claiming persistence", () => {
  reset();
  const course = introCourses[0], exercise = course.missions[0].practice[0];
  const item = introReviewItems(course).find((entry) => entry.activityId === exercise.id)!;
  recordReviewAttempt({ language: course.language, itemId: item.id, correct: false, assisted: false, attemptId: "before-denial", at: now });
  const view = render(<IntroDueReview course={course} locale="en" audio={{}} />);
  click(view.getByRole("button", { name: launches.en }));
  const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage")!;
  Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("Denied"); } });
  try {
    click(view.container.querySelector(`[data-answer-id="${exercise.options.find((id) => id !== exercise.answer)}"]`)!);
    assert.ok(view.getByText(/The browser cannot save all these reviews/));
    assert.equal(readReviewState(course.language).persistent, false);
  } finally { Object.defineProperty(window, "localStorage", descriptor); }
}]);

try {
  for (const [name, test] of tests) { test(); console.log(`✓ ${name}`); }
  console.log(`Local review UI: ${tests.length} checks passed, including 7 × 3 real intro exercises.`);
} finally { cleanup(); Date.now = originalNow; dom.window.close(); }
