import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { interestCorpus, practiceDirections, correctRecall } from "@/lib/yo/interests/content";
import { interestIds, interestLanguages, interestLanguage, parseInterests } from "@/lib/yo/interests/preferences";
import { emptyInterestProgress, interestProgressKey, newInterestSession, parseInterestProgress } from "@/lib/yo/interests/session";
import { introCourses } from "@/lib/yo/shared/course";
import { freshIntro, parseIntro } from "@/lib/yo/shared/state";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key, value] of Object.entries({ React, window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter,
  DocumentFragment: dom.window.DocumentFragment, HTMLInputElement: dom.window.HTMLInputElement, CustomEvent: dom.window.CustomEvent,
  Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
Object.defineProperty(window, "matchMedia", { value: (media: string) => ({ media, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) });
dom.window.HTMLElement.prototype.scrollIntoView = () => {}; window.scrollTo = () => {};
dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
let audioStarts = 0;
dom.window.HTMLMediaElement.prototype.play = () => { audioStarts++; return Promise.resolve(); };
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const { InterestPracticeCard } = require("@/components/yo/interests/InterestPracticeCard") as typeof import("@/components/yo/interests/InterestPracticeCard");
const { InterestChoices } = require("@/components/yo/interests/InterestChoices") as typeof import("@/components/yo/interests/InterestChoices");
const { readReviewState } = require("@/lib/yo/review/store") as typeof import("@/lib/yo/review/store");
const tests: Array<[string, () => Promise<void> | void]> = [];
async function flush() { await act(async () => { for (let i = 0; i < 15 && frames.size; i++) { const values = [...frames.values()]; frames.clear(); values.forEach(fn => fn(0)); } await Promise.resolve(); }); }
async function click(element: HTMLElement) { fireEvent.click(element); await flush(); }
async function skipFilm(view: ReturnType<typeof render>) { const skip = view.queryByRole("button", { name: "Skip" }); if (skip) await click(skip); }
function reset() { cleanup(); localStorage.clear(); sessionStorage.clear(); frames.clear(); audioStarts = 0; }

tests.push(["48 original interest variants preserve one communicative objective and vary the transfer direction", () => {
  for (const language of interestLanguages) {
    const corpus = interestCorpus[language];
    assert.equal(Object.keys(corpus.venues).length, 6);
    assert.equal(new Set(Object.values(corpus.venues).map(v => v.question.text)).size, 6);
    for (const id of interestIds) {
      const venue = corpus.venues[id];
      assert.ok(venue.noun && venue.question.text && Object.values(venue.meaning).every(Boolean));
      for (let attempt = 0; attempt < 3; attempt++) {
        const path = practiceDirections(id, attempt); assert.notEqual(path.first, path.transfer);
        assert.notDeepEqual(path, practiceDirections(id, attempt + 1));
      }
    }
  }
  assert.equal(correctRecall(" MUSÉE! ", "musée"), true);
  assert.equal(correctRecall("musee", "musée"), false);
  assert.equal(correctRecall("出口", "入口"), false);
  assert.equal(correctRecall("galerie d'art", "galerie d’art"), true);
}]);
tests.push(["optional interest metadata cannot erase saved lesson evidence", () => {
  for (const course of introCourses) {
    assert.ok(interestLanguage(course.language), `real course alias ${course.language}`);
    const state = freshIntro(course); state.profile = { experience: "some", goal: "travel", minutes: 60, entry: 0 };
    state.completed = [course.missions[0].practice[0].id];
    const raw = JSON.stringify({ ...state, profile: { ...state.profile, interests: ["art", "art", "__proto__", "history"] } });
    const parsed = parseIntro(raw, course);
    assert.deepEqual(parsed.completed, state.completed); assert.deepEqual(parsed.profile?.interests, ["art", "history"]);
  }
  assert.deepEqual(parseInterests("art"), []);
  assert.deepEqual(parseInterests(["art", "history", "music", "nature"]), ["art", "history", "music"]);
}]);
tests.push(["interest selection limits to three, supports deselection and surprise", async () => {
  function Choices() { const [value, setValue] = React.useState<("art" | "history" | "music" | "nature" | "sport" | "food")[]>([]); return <InterestChoices locale="en" value={value} onChange={setValue}/>; }
  const view = render(<Choices/>);
  for (const name of ["Music", "Art", "History"]) await click(view.getByRole("button", { name }));
  assert.equal((view.getByRole("button", { name: "Nature" }) as HTMLButtonElement).disabled, true);
  await click(view.getByRole("button", { name: "Art" }));
  await click(view.getByRole("button", { name: "Nature" }));
  await click(view.getByRole("button", { name: "Surprise me" }));
  assert.equal(view.container.querySelectorAll('[aria-pressed="true"]').length, 1);
}]);
for (const language of interestLanguages) tests.push([`${language}: real selected dialogue, exact pause/resume and controlled recall`, async () => {
  let view = render(<InterestPracticeCard language={language} locale="en" interests={["art"]} city="Practice city"/>); await flush();
  await click(view.getByRole("button", { name: "Explore · Art" })); await skipFilm(view);
  assert.equal(document.querySelector("[data-interest-step]")?.getAttribute("data-interest-step"), "0");
  assert.ok(view.getByText(interestCorpus[language].venues.art.question.text, { exact: true }));
  await click(view.getByRole("button", { name: "Continue" }));
  await click(view.getByRole("button", { name: "Continue" }));
  await click(view.getByRole("button", { name: interestCorpus[language].venues.art.question.text }));
  await click(view.getByRole("button", { name: "Check" }));
  await click(view.getByRole("button", { name: "Continue" }));
  await click(view.getByRole("button", { name: "Close and save my place" }));
  cleanup(); view = render(<InterestPracticeCard language={language} locale="en" interests={["history"]}/>); await flush();
  await click(view.getByRole("button", { name: "Resume my stop" })); await skipFilm(view);
  assert.equal(document.querySelector("[data-interest-step]")?.getAttribute("data-interest-step"), "3");
  assert.equal(parseInterestProgress(localStorage.getItem(interestProgressKey(language)), language).session?.interest, "art");
  await click(view.getByRole("button", { name: "Turn right" }));
  await click(view.getByRole("button", { name: "Check" }));
  fireEvent.click(view.getByRole("button", { name: "Continue" }));
  const input = view.getByRole("textbox", { name: "Word from memory" }) as HTMLInputElement;
  input.focus();
  fireEvent.change(input, { target: { value: interestCorpus[language].venues.art.noun } });
  await flush();
  assert.equal(document.activeElement, input, "a delayed heading focus cannot interrupt the learner's input");
  assert.equal(input.value, interestCorpus[language].venues.art.noun);
  await click(view.getByRole("button", { name: "Check" }));
  await click(view.getByRole("button", { name: "Continue" }));
  assert.equal(document.querySelector("[data-interest-step]")?.getAttribute("data-interest-step"), "5");
  await click(view.getByRole("button", { name: "Go straight ahead" }));
  await click(view.getByRole("button", { name: "Check" }));
  await click(view.getByRole("button", { name: "Continue" })); await skipFilm(view);
  assert.ok(view.getByText("4/4 answers without help"));
  assert.equal(parseInterestProgress(localStorage.getItem(interestProgressKey(language)), language).attempts.art, 1);
  assert.deepEqual(readReviewState(language).records, {});
  assert.equal(audioStarts, 0, "no automatic audio under reduced motion");
}]);
tests.push(["confirming an IME candidate cannot grade a partial Mandarin word", async () => {
  const session = newInterestSession("zh-CN", "history", 0); session.step = 4;
  localStorage.setItem(interestProgressKey("zh-CN"), JSON.stringify({ ...emptyInterestProgress(), session }));
  const view = render(<InterestPracticeCard language="zh" locale="en"/>); await flush();
  await click(view.getByRole("button", { name: "Resume my stop" })); await skipFilm(view);
  const input = view.getByRole("textbox"); input.focus();
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: "博" } });
  fireEvent.keyDown(input, { key: "Enter", keyCode: 229, isComposing: true });
  assert.equal(parseInterestProgress(localStorage.getItem(interestProgressKey("zh-CN")), "zh-CN").session?.assisted[2], false);
  assert.deepEqual(readReviewState("zh").records, {});
  fireEvent.change(input, { target: { value: interestCorpus["zh-CN"].venues.history.noun } });
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13, isComposing: false });
  assert.equal(parseInterestProgress(localStorage.getItem(interestProgressKey("zh-CN")), "zh-CN").session?.correct[2], true);
}]);
tests.push(["wrong recall survives help/reload, schedules review and never becomes an independent result", async () => {
  const session = newInterestSession("fr-CA", "history", 0); session.step = 4;
  localStorage.setItem(interestProgressKey("fr-CA"), JSON.stringify({ ...emptyInterestProgress(), session }));
  let view = render(<InterestPracticeCard language="fr-CA" locale="en"/>); await flush();
  await click(view.getByRole("button", { name: "Resume my stop" })); await skipFilm(view);
  fireEvent.change(view.getByRole("textbox"), { target: { value: "musee" } });
  await click(view.getByRole("button", { name: "Check" }));
  assert.ok(view.getByRole("status").textContent?.includes("Notice the difference"));
  assert.ok(readReviewState("fr-CA").records["interest:history:recall"]);
  assert.equal(localStorage.getItem(interestProgressKey("fr-CA"))?.includes("musee"), false, "typed response not retained");
  await click(view.getByRole("button", { name: "Close and save my place" })); cleanup();
  view = render(<InterestPracticeCard language="fr-CA" locale="en"/>); await flush();
  await click(view.getByRole("button", { name: "Resume my stop" })); await skipFilm(view);
  fireEvent.change(view.getByRole("textbox"), { target: { value: "musée" } });
  await click(view.getByRole("button", { name: "Check" }));
  const saved = parseInterestProgress(localStorage.getItem(interestProgressKey("fr-CA")), "fr-CA").session!;
  assert.equal(saved.assisted[2], true); assert.equal(saved.correct[2], false);
}]);
for (const locale of ["fr", "es"] as const) tests.push([`${locale}: localized practice shell and settings are usable`, async () => {
  const view = render(<InterestPracticeCard language="ja" locale={locale} interests={["nature"]}/>); await flush();
  await click(view.getByRole("button", { name: locale === "fr" ? "Mes centres d’intérêt" : "Mis intereses" }));
  assert.equal(view.getAllByRole("button", { pressed: true }).length, 1);
  assert.ok(view.getByText(locale === "fr" ? "Nature" : "Naturaleza", { exact: true }));
}]);
async function main() {
  let passed = 0;
  for (const [name, run] of tests) { reset(); try { await run(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}`); throw error; } }
  reset(); console.log(`${passed}/${tests.length} interest-practice checks passed`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
