import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import type { JapaneseReadingActivity } from "@/lib/yo/japaneseCourseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { japaneseCourseUnits, japaneseCourseSources, japaneseFinalAssessment, japaneseExtendedFinalAssessment } from "@/lib/yo/japaneseCourse";
import { emptyJapaneseProgress, JAPANESE_PROGRESS_KEY, japaneseUnitPracticeIds, parseJapaneseProgress, recordJapaneseResult } from "@/lib/yo/japaneseCourseProgress";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/japonais/parcours", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key, value] of Object.entries({ React, window: dom.window, self: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element,
  Node: dom.window.Node, NodeFilter: dom.window.NodeFilter, DocumentFragment: dom.window.DocumentFragment,
  Event: dom.window.Event, CustomEvent: dom.window.CustomEvent, MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; },
  cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
Object.defineProperty(window, "matchMedia", { value: (media: string) => ({ media, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
let plays = 0; dom.window.HTMLMediaElement.prototype.play = () => { plays++; return Promise.resolve(); };
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const { JapaneseActivityPanel, initialJapaneseActivityState } = require("@/components/yo/japanese/JapaneseActivityPanel") as typeof import("@/components/yo/japanese/JapaneseActivityPanel");
const { JapaneseCourseHome } = require("@/components/yo/japanese/JapaneseCourseHome") as typeof import("@/components/yo/japanese/JapaneseCourseHome");
const { JapaneseCoursePlayer } = require("@/components/yo/japanese/JapaneseCoursePlayer") as typeof import("@/components/yo/japanese/JapaneseCoursePlayer");
const { resolveJapaneseCourseUnit } = require("@/lib/yo/japaneseCourseRouting") as typeof import("@/lib/yo/japaneseCourseRouting");

function Harness({ activity, locale, results }: { activity: JapaneseReadingActivity; locale: YoLocale; results: Array<[boolean, boolean]> }) {
  const [state, setState] = React.useState(() => initialJapaneseActivityState(activity));
  return <JapaneseActivityPanel activity={activity} locale={locale} state={state} onChange={setState} onResult={(correct, assisted) => results.push([correct, assisted])}/>;
}
const recall = japaneseCourseUnits[9].activities.find(item => item.id === "jp-10-recall-enter") as JapaneseReadingActivity;
const outlines = japaneseCourseUnits.map(unit => ({ ...unit, practiceIds: japaneseUnitPracticeIds(unit) }));
const journeyUnits = japaneseCourseUnits.map(unit => ({ id: unit.slug, number: unit.number, title: unit.title, subtitle: unit.subtitle, objectives: unit.goals, activityIds: japaneseUnitPracticeIds(unit) }));
const currentIds = japaneseExtendedFinalAssessment.map(item => item.id), oldIds = japaneseFinalAssessment.map(item => item.id);
const labels = {
  fr: { input: "Ta phrase de mémoire", check: "Vérifier", hint: "Un indice avec Yoppo" },
  en: { input: "Your sentence from memory", check: "Check", hint: "A hint from Yoppo" },
  es: { input: "Tu frase de memoria", check: "Verificar", hint: "Una pista de Yoppo" },
};
const cases: Array<[string, () => Promise<void> | void]> = [];
async function flush() { await act(async () => { for (let index = 0; index < 15 && frames.size; index++) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); } await Promise.resolve(); }); }
function passedThrough(count: number) {
  return japaneseCourseUnits.slice(0, count).flatMap(japaneseUnitPracticeIds).reduce((state, id) => recordJapaneseResult(state, id, true, false), emptyJapaneseProgress());
}

for (const locale of ["fr", "en", "es"] as const) cases.push([`${locale}: the real recall screen has no options or visible answer and accepts punctuation-free kana`, () => {
  const results: Array<[boolean, boolean]> = [];
  const view = render(<Harness activity={recall} locale={locale} results={results}/>);
  assert.equal(view.queryByText(recall.answer), null);
  assert.equal(view.queryByText(recall.explanation[locale]), null);
  assert.equal(view.queryByRole("group"), null);
  assert.equal(view.container.querySelector("audio"), null);
  const input = view.getByRole("textbox", { name: labels[locale].input });
  fireEvent.change(input, { target: { value: "はいってもいいですか" } });
  assert.deepEqual(results, []);
  fireEvent.click(view.getByRole("button", { name: labels[locale].check }));
  assert.deepEqual(results, [[true, false]]);
  assert.ok(view.getByText(recall.answer));
}]);

cases.push(["a Japanese IME candidate never grades a partial recall and confirmed Enter grades once", () => {
  const results: Array<[boolean, boolean]> = [];
  const view = render(<Harness activity={recall} locale="en" results={results}/>);
  const input = view.getByRole("textbox");
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: "はい" } });
  fireEvent.keyDown(input, { key: "Enter", keyCode: 229, isComposing: true });
  assert.deepEqual(results, []);
  fireEvent.change(input, { target: { value: "入ってもいいですか" } });
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: "Enter", keyCode: 229, isComposing: false });
  assert.deepEqual(results, [], "Safari may end composition before reporting the IME Enter");
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13, isComposing: false });
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13, isComposing: false });
  assert.deepEqual(results, [[true, false]]);
}]);

cases.push(["hiding a recall hint cannot turn the current attempt into an unaided success", () => {
  const results: Array<[boolean, boolean]> = [];
  const view = render(<Harness activity={recall} locale="en" results={results}/>);
  fireEvent.click(view.getByRole("button", { name: labels.en.hint }));
  fireEvent.click(view.getByRole("button", { name: labels.en.hint }));
  assert.equal(view.queryByText(recall.hint.en), null);
  fireEvent.change(view.getByRole("textbox"), { target: { value: recall.answer } });
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, [[true, true]]);
}]);

cases.push(["the home resumes the initial final without treating eight old results as a new completed course", async () => {
  let progress = passedThrough(8);
  for (const id of oldIds) progress = recordJapaneseResult(progress, id, true, false);
  progress.lastUnit = "bilan"; progress.lastSteps.bilan = "jp-final-04";
  localStorage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify(progress));
  const view = render(<JapaneseCourseHome locale="en" units={outlines} finalIds={currentIds} legacyFinalIds={oldIds} sources={japaneseCourseSources}/>);
  await flush();
  assert.equal(view.getByRole("link", { name: "Resume my session" }).getAttribute("href"), "/yo/langues/japonais/parcours/bilan-initial?lang=en");
  assert.equal(view.getByRole("link", { name: "Open initial review" }).getAttribute("href"), "/yo/langues/japonais/parcours/bilan-initial?lang=en");
  assert.equal(view.queryByRole("link", { name: "Open final review" }), null);
  const legacy = view.getByRole("region", { name: "Initial review · 8 modules" });
  assert.match(legacy.textContent ?? "", /8\/8/);
  const saved = parseJapaneseProgress(localStorage.getItem(JAPANESE_PROGRESS_KEY));
  assert.equal(saved.lastSteps.bilan, "jp-final-04");
  assert.equal(currentIds.some(id => saved.results[id]), false);
}]);

cases.push(["the extended final opens after twelve modules and stores its own resume key without deleting the old one", async () => {
  const progress = passedThrough(12);
  progress.lastUnit = "bilan-fondations";
  progress.lastSteps = { bilan: "jp-final-07", "bilan-fondations": "jp-depth-final-20" };
  localStorage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify(progress));
  const unit = resolveJapaneseCourseUnit("bilan")!;
  const view = render(<JapaneseCoursePlayer unit={unit} locale="en" journeyUnits={journeyUnits} finalIds={currentIds} sources={japaneseCourseSources} final/>);
  await flush();
  const skip = view.queryByRole("button", { name: "Skip" }); if (skip) { fireEvent.click(skip); await flush(); }
  const activity = view.container.querySelector('[data-japanese-activity="jp-depth-final-20"]');
  assert.ok(activity, "the final restores the requested new writing task");
  assert.equal(within(activity as HTMLElement).queryByText("写真を撮ってもいいですか。"), null, "the new task does not reveal its answer");
  const saved = parseJapaneseProgress(localStorage.getItem(JAPANESE_PROGRESS_KEY));
  assert.equal(saved.lastSteps.bilan, "jp-final-07");
  assert.equal(saved.lastSteps["bilan-fondations"], "jp-depth-final-20");
  assert.equal(saved.lastUnit, "bilan-fondations");
}]);

async function main() {
  for (const [name, run] of cases) {
    cleanup(); localStorage.clear(); sessionStorage.clear(); frames.clear(); plays = 0;
    await run(); assert.equal(plays, 0, "written checks never auto-play audio");
    console.log(`PASS ${name}`);
  }
  cleanup(); dom.window.close(); console.log(`${cases.length}/${cases.length} Japanese depth UI checks passed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
