import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

import FrenchQuebecLesson3Page from "../../app/yo/langues/francais-quebec/module-1/lecon-3/page";
import { YoChoiceCard, YoOneQuestionQuiz } from "../../components/yo/YoInteractiveLessonPrimitives";
import { YoLessonDraftProvider } from "../../components/yo/YoLessonDraftProvider";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.org/yo/langues/francais-quebec/module-1/lecon-3",
  pretendToBeVisual: true,
});

for (const [key, value] of Object.entries({
  window: dom.window,
  self: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  Event: dom.window.Event,
  IS_REACT_ACT_ENVIRONMENT: true,
  React,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });

globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => { callback(0); return 0; };
window.scrollTo = () => {};
dom.window.HTMLElement.prototype.scrollTo = () => {};
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", {
  value: function () { this.setAttribute("open", ""); },
});
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "close", {
  value: function () { this.removeAttribute("open"); },
});

const { render, fireEvent, within, cleanup } = require("@testing-library/react");
const tests: [string, () => void | Promise<void>][] = [];

async function renderLesson() {
  const view = render(await FrenchQuebecLesson3Page({ searchParams: Promise.resolve({ lang: "fr" }) }));
  const [mobile, desktop] = view.getAllByTestId("yo-step-navigator") as HTMLElement[];
  assert.equal(mobile.dataset.yoStepNavigatorVariant, "standalone");
  assert.equal(desktop.dataset.yoStepNavigatorVariant, "embedded");
  return { view, mobile, desktop };
}

function step(navigator: HTMLElement, id: string): HTMLElement {
  const panel = navigator.querySelector<HTMLElement>(`[data-yo-step-navigator-step="${id}"]`);
  assert.ok(panel);
  return panel;
}

function jump(navigator: HTMLElement, id: string) {
  const button = navigator.querySelector<HTMLButtonElement>(`[data-yo-step-navigator-dot-id="${id}"]`);
  assert.ok(button);
  fireEvent.click(button);
}

tests.push(["French lesson responsive trees share the current step and retain changed answers", async () => {
  const { mobile, desktop } = await renderLesson();
  jump(desktop, "best-opener");
  for (const navigator of [desktop, mobile]) {
    assert.equal(step(navigator, "best-opener").dataset.yoStepNavigatorStepActive, "true");
  }
  fireEvent.click(within(step(desktop, "best-opener")).getByRole("button", {
    name: "Aurais-tu deux minutes? J’aurais une question.",
  }));
  for (const navigator of [desktop, mobile]) {
    assert.equal(within(step(navigator, "best-opener")).getByRole("status").textContent, "Bonne amorce.");
  }

  // The mobile presentation must update the same answer when it takes over.
  fireEvent.click(within(step(mobile, "best-opener")).getByRole("button", { name: "Hé!", exact: true }));
  for (const navigator of [desktop, mobile]) {
    assert.match(within(step(navigator, "best-opener")).getByRole("status").textContent!, /Trop direct ou trop long/);
    assert.equal(within(step(navigator, "best-opener")).getByRole("button", { name: "Hé!", exact: true }).getAttribute("aria-pressed"), "true");
    for (const otherId of ["question-word", "oral-quebec", "hein"]) {
      assert.equal(within(step(navigator, otherId)).queryByRole("status", { hidden: true }), null);
    }
  }

  // Both mounted navigators listen to keyboard events; one arrow advances once.
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  for (const navigator of [desktop, mobile]) assert.equal(navigator.dataset.yoStepNavigatorCurrent, "3");
  jump(mobile, "best-opener");
  assert.match(within(step(desktop, "best-opener")).getByRole("status").textContent!, /Trop direct ou trop long/);
}]);

tests.push(["French nested quiz keeps each question's own answer and restores it in both layouts", async () => {
  const { mobile, desktop } = await renderLesson();
  jump(desktop, "quiz");
  const quiz = (navigator: HTMLElement) => within(step(navigator, "quiz"));
  fireEvent.click(quiz(desktop).getByRole("button", { name: "Aurais-tu deux minutes? J’aurais une question." }));
  assert.equal(quiz(mobile).getByRole("status").textContent, "Correct.");

  fireEvent.click(quiz(desktop).getByRole("button", { name: "Suivant", exact: true }));
  for (const navigator of [desktop, mobile]) {
    assert.ok(quiz(navigator).getByText("2. « T’es-tu disponible? » veut dire quoi?"));
    assert.equal(quiz(navigator).queryByRole("status"), null);
    assert.equal(quiz(navigator).getByRole("button", { name: "Tu es en retard?" }).getAttribute("aria-pressed"), "false");
  }

  fireEvent.click(quiz(mobile).getByRole("button", { name: "Tu es en retard?" }));
  assert.equal(quiz(desktop).getByRole("status").textContent, "Réessaie avec une phrase plus naturelle.");
  fireEvent.click(quiz(mobile).getByRole("button", { name: "Précédent", exact: true }));
  assert.equal(quiz(desktop).getByRole("status").textContent, "Correct.");
  fireEvent.click(quiz(desktop).getByRole("button", { name: "Suivant", exact: true }));
  assert.equal(quiz(mobile).getByRole("status").textContent, "Réessaie avec une phrase plus naturelle.");
}]);

tests.push(["French good/avoid choices and flashcard position and face survive a layout switch", async () => {
  const { mobile, desktop } = await renderLesson();
  jump(desktop, "good-avoid");
  const article = (navigator: HTMLElement) => step(navigator, "good-avoid").querySelector("article")!;
  fireEvent.click(within(article(desktop)).getByRole("button", { name: "À éviter", exact: true }));
  assert.equal(within(article(mobile)).getByRole("button", { name: "À éviter", exact: true }).getAttribute("aria-pressed"), "true");
  assert.ok(within(article(mobile)).getByText("Trop direct."));

  jump(mobile, "flashcards");
  fireEvent.click(within(step(mobile, "flashcards")).getByRole("button", { name: "Suivant", exact: true }));
  fireEvent.click(within(step(mobile, "flashcards")).getByRole("button", { name: /Aurais-tu deux minutes\?/ }));
  for (const navigator of [desktop, mobile]) {
    assert.ok(within(step(navigator, "flashcards")).getByText("2/10"));
    assert.ok(within(step(navigator, "flashcards")).getByText("Good when the person seems busy."));
  }
  fireEvent.click(within(step(desktop, "flashcards")).getByRole("button", { name: "Suivant", exact: true }));
  assert.ok(within(step(mobile, "flashcards")).getByText("Vite de même…"));
  assert.equal(within(step(mobile, "flashcards")).queryByText("Good when the person seems busy."), null);
}]);

const choiceProps = {
  draftKey: "same-control",
  prompt: "Choose a greeting",
  options: [{ id: "a", label: "Bonjour" }, { id: "b", label: "Bonsoir" }],
  correctOptionId: "a",
  correctFeedback: "Correct greeting",
  incorrectFeedback: "Try again",
};

tests.push(["lesson draft outlives a renderer remount but stays scoped to its mounted lesson", () => {
  window.localStorage.setItem("progress-sentinel", "unchanged");
  const before = { ...window.localStorage };
  const lesson = (renderer: string, lessonKey = "lesson-one") => (
    <YoLessonDraftProvider key={lessonKey}>
      <YoChoiceCard key={renderer} {...choiceProps} />
    </YoLessonDraftProvider>
  );
  const view = render(lesson("desktop"));
  fireEvent.click(view.getByRole("button", { name: "Bonjour" }));
  view.rerender(lesson("mobile"));
  assert.equal(view.getByRole("status").textContent, "Correct greeting");
  view.rerender(lesson("mobile", "lesson-two"));
  assert.equal(view.queryByRole("status"), null);
  assert.deepEqual({ ...window.localStorage }, before);
}]);

tests.push(["a standalone quiz isolates repeated option ids and restores earlier answers without a provider", () => {
  const view = render(<YoOneQuestionQuiz
    questions={[
      { id: "first", prompt: "First question", options: choiceProps.options, correctOptionId: "a" },
      { id: "second", prompt: "Second question", options: choiceProps.options, correctOptionId: "b" },
    ]}
    correctFeedback="Correct"
    incorrectFeedback="Try again"
    previousLabel="Previous question"
    nextLabel="Next question"
  />);
  fireEvent.click(view.getByRole("button", { name: "Bonjour" }));
  fireEvent.click(view.getByRole("button", { name: "Next question" }));
  assert.equal(view.queryByRole("status"), null);
  fireEvent.click(view.getByRole("button", { name: "Bonsoir" }));
  fireEvent.click(view.getByRole("button", { name: "Previous question" }));
  assert.equal(view.getByRole("button", { name: "Bonjour" }).getAttribute("aria-pressed"), "true");
  assert.equal(view.getByRole("status").textContent, "Correct");
}]);

async function main() {
  let failures = 0;
  for (const [name, test] of tests) {
    try { await test(); console.log("PASS", name); }
    catch (error) { failures++; console.error("FAIL", name, error); }
    finally { cleanup(); }
  }
  dom.window.close();
  if (failures) process.exitCode = 1;
  else console.log(`PASS ${tests.length}/${tests.length} French responsive draft checks`);
}
void main();
