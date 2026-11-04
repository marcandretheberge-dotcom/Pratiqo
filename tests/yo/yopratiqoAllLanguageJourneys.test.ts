import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { japaneseJourneyUnits, japaneseFinalIds, mandarinJourneyUnits, mandarinFinalIds } from "@/lib/yo/foundationJourneyCatalogs";
import { japaneseJourney, mandarinJourney, canEnterFoundationStep } from "@/lib/yo/foundationJourney";
import { emptyJapaneseProgress, recordJapaneseResult, JAPANESE_PROGRESS_KEY } from "@/lib/yo/japaneseCourseProgress";
import { emptyProgress, MANDARIN_PROGRESS_KEY } from "@/lib/yo/mandarin/progress";
import { JapaneseCoursePlayer } from "@/components/yo/japanese/JapaneseCoursePlayer";
import { MandarinCoursePlayer } from "@/components/yo/mandarin/MandarinCoursePlayer";
import { japaneseCourseUnits, japaneseCourseSources } from "@/lib/yo/japaneseCourse";
import { mandarinUnits, getMandarinUnit } from "@/lib/yo/mandarin/course";
import { YoLessonDeck } from "@/components/yo/YoLessonDeck";
import { explorationKey, parseExploration, type IntroJourneyId } from "@/components/yo/journey/useExplorationJourney";
import type { YoLessonDeckScreen } from "@/lib/yo/lessonDeckTypes";
import { LearningJourney } from "@/components/yo/journey/CourseJourney";
import { MandarinCourseHome } from "@/components/yo/mandarin/MandarinCourseHome";
import { JapaneseCourseHome } from "@/components/yo/japanese/JapaneseCourseHome";
import { japaneseUnitPracticeIds } from "@/lib/yo/japaneseCourseProgress";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example", pretendToBeVisual: true });
const bindings = {
  window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(Object.keys(bindings).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
dom.window.HTMLElement.prototype.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
const { render, cleanup, fireEvent } = require("@testing-library/react") as typeof import("@testing-library/react");
const tests: [string, () => void][] = [];
const test = (name: string, run: () => void) => tests.push([name, run]);

test("a new learner sees one open step in each assessed course; empty evidence cannot unlock a final", () => {
  for (const journey of [japaneseJourney(japaneseJourneyUnits, emptyJapaneseProgress()), mandarinJourney(mandarinJourneyUnits, emptyProgress())]) {
    assert.equal(journey.steps.filter(step => step.unlocked).length, 1);
    assert.equal(journey.passedCount, 0);
    assert.equal(canEnterFoundationStep(journey, "bilan", false), false);
    assert.equal(canEnterFoundationStep(journey, "unknown", false), false);
  }
  assert.equal(canEnterFoundationStep(mandarinJourney([], emptyProgress()), "bilan", false), false);
});

test("Japanese checks include roleplay, distinguish help and advance Yoppo only on independent success", () => {
  let progress = emptyJapaneseProgress();
  const ids = japaneseJourneyUnits[0].activityIds;
  for (const id of ids) progress = recordJapaneseResult(progress, id, true, true);
  assert.equal(japaneseJourney(japaneseJourneyUnits, progress).steps[1].unlocked, false);
  for (const id of ids.slice(0, -1)) progress = recordJapaneseResult(progress, id, true, false);
  assert.equal(japaneseJourney(japaneseJourneyUnits, progress).steps[1].unlocked, false);
  progress = recordJapaneseResult(progress, ids.at(-1)!, true, false);
  const journey = japaneseJourney(japaneseJourneyUnits, progress);
  assert.equal(journey.passedCount, 1);
  assert.equal(journey.current?.unit.id, japaneseJourneyUnits[1].id);
  assert.equal(journey.steps[2].unlocked, false);
  const view = render(React.createElement(LearningJourney, { journey, ready: true, locale: "en", href: id => "/course/" + id }));
  assert.equal(view.container.querySelector("[data-yoppo-position]")?.getAttribute("data-yoppo-position"), japaneseJourneyUnits[1].id);
});

test("Mandarin drafts, self-assessment and culture games do not pass a step; checked answers do", () => {
  const progress = emptyProgress();
  progress.selfAssessment["zh-u01-self-0"] = true;
  progress.trivia = 99;
  for (const id of mandarinJourneyUnits[0].activityIds) progress.results[id] = { passed: true, independent: false, attempts: 1, review: true };
  assert.equal(mandarinJourney(mandarinJourneyUnits, progress).passedCount, 0);
  for (const id of mandarinJourneyUnits[0].activityIds) progress.results[id].independent = true;
  const journey = mandarinJourney(mandarinJourneyUnits, progress);
  assert.equal(journey.passedCount, 1);
  assert.equal(journey.current?.unit.id, "u02");
  assert.equal(journey.steps[2].unlocked, false);
});

test("legacy starts survive without silently passing earlier modules", () => {
  const jp = emptyJapaneseProgress();
  jp.lastUnit = "module-5"; jp.lastSteps["module-3"] = "writing";
  const zh = emptyProgress();
  zh.unit = "u05"; zh.steps.u03 = 0;
  for (const journey of [japaneseJourney(japaneseJourneyUnits, jp), mandarinJourney(mandarinJourneyUnits, zh)]) {
    assert.deepEqual(journey.steps.filter(step => step.unlocked).map(step => step.unit.number), [1, 3, 5]);
    assert.equal(journey.passedCount, 0);
    assert.equal(journey.current?.unit.number, 5);
  }
});

test("the final opens after all modules, or for an already started final; final answers stay separate", () => {
  const jp = emptyJapaneseProgress(), zh = emptyProgress();
  for (const unit of japaneseJourneyUnits) for (const id of unit.activityIds) jp.results[id] = { passed: true, independent: true, attempts: 1, needsReview: false };
  for (const unit of mandarinJourneyUnits) for (const id of unit.activityIds) zh.results[id] = { passed: true, independent: true, attempts: 1, review: false };
  assert.ok(canEnterFoundationStep(japaneseJourney(japaneseJourneyUnits, jp), "bilan", false));
  assert.ok(canEnterFoundationStep(mandarinJourney(mandarinJourneyUnits, zh), "bilan", false));
  assert.ok(japaneseFinalIds.every(id => !jp.results[id]));
  assert.ok(mandarinFinalIds.every(id => !zh.results[id]));
  assert.ok(canEnterFoundationStep(mandarinJourney(mandarinJourneyUnits, emptyProgress()), "bilan", true));
});

test("opening a locked Japanese direct URL never saves its resume state", () => {
  const before = JSON.stringify(emptyJapaneseProgress());
  localStorage.setItem(JAPANESE_PROGRESS_KEY, before);
  const view = render(React.createElement(React.StrictMode, null, React.createElement(JapaneseCoursePlayer, {
    unit: japaneseCourseUnits[4], locale: "en", sources: japaneseCourseSources,
    journeyUnits: japaneseJourneyUnits, finalIds: japaneseFinalIds,
  })));
  assert.ok(view.getByRole("heading", { name: "One step at a time" }));
  assert.equal(localStorage.getItem(JAPANESE_PROGRESS_KEY), before);
});

test("Yoppo does not show a Japanese level-up for assisted-only completion", () => {
  let progress = emptyJapaneseProgress();
  for (const id of japaneseJourneyUnits[0].activityIds) progress = recordJapaneseResult(progress, id, true, true);
  progress.lastSteps["module-1"] = "summary";
  localStorage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify(progress));
  const props = { unit: japaneseCourseUnits[0], locale: "en" as const, sources: japaneseCourseSources, journeyUnits: japaneseJourneyUnits, finalIds: japaneseFinalIds };
  const view = render(React.createElement(JapaneseCoursePlayer, props));
  assert.equal(view.baseElement.querySelector('[data-companion-visual-state="level_up"]'), null);
  assert.ok(view.getByText("Revisit the challenges without displayed help to open the next step."));
  view.unmount();
  for (const id of japaneseJourneyUnits[0].activityIds) progress = recordJapaneseResult(progress, id, true, false);
  localStorage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify(progress));
  const passed = render(React.createElement(JapaneseCoursePlayer, props));
  assert.ok(passed.baseElement.querySelector('[data-companion-visual-state="level_up"]'));
  assert.match(passed.getByRole("link", { name: "Next step" }).getAttribute("href")!, /module-2\?lang=en$/);
});

test("Mandarin direct URLs and final are gated after hydration without saving anything", () => {
  for (const unit of [mandarinUnits[4], getMandarinUnit("bilan")!]) {
    const before = JSON.stringify(emptyProgress());
    localStorage.setItem(MANDARIN_PROGRESS_KEY, before);
    const view = render(React.createElement(MandarinCoursePlayer, {
      unit, locale: "en", journeyUnits: mandarinJourneyUnits, finalIds: mandarinFinalIds,
    }));
    assert.ok(view.getByRole("heading", { name: "One step at a time" }));
    assert.equal(localStorage.getItem(MANDARIN_PROGRESS_KEY), before);
    view.unmount();
  }
});

test("Mandarin unfinished summary returns to the journey rather than promising an unlocked unit", () => {
  const progress = emptyProgress();
  progress.steps.u01 = 7 + mandarinUnits[0].exercises.length;
  localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify(progress));
  const view = render(React.createElement(MandarinCoursePlayer, {
    unit: mandarinUnits[0], locale: "en", journeyUnits: mandarinJourneyUnits, finalIds: mandarinFinalIds,
  }));
  assert.ok(view.getByText("Revisit the challenges without displayed help to open the next step."));
  assert.equal(view.container.querySelector('a[href*="/u02"]'), null);
});

test("both home pages resume an already started final rather than sending the learner back to module one", () => {
  localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify({ ...emptyProgress(), unit: "bilan" }));
  const mandarin = render(React.createElement(MandarinCourseHome, {
    locale: "en", units: mandarinJourneyUnits, finalIds: mandarinFinalIds, languageSource: "https://ocw.mit.edu",
  }));
  assert.match(mandarin.getByRole("link", { name: "Resume my session" }).getAttribute("href")!, /\/bilan\?lang=en$/);
  mandarin.unmount();
  localStorage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify({ ...emptyJapaneseProgress(), lastUnit: "bilan" }));
  const japanese = render(React.createElement(JapaneseCourseHome, {
    locale: "en", units: japaneseCourseUnits.map(unit => ({ ...unit, practiceIds: japaneseUnitPracticeIds(unit) })),
    finalIds: japaneseFinalIds, sources: japaneseCourseSources,
  }));
  assert.match(japanese.getByRole("link", { name: "Resume my session" }).getAttribute("href")!, /\/bilan\?lang=en$/);
});

const screens: YoLessonDeckScreen[] = ["mission", "practice", "summary"].map((id, index) => ({
  id, kind: index === 0 ? "mission" : index === 1 ? "practice" : "summary",
  title: "Topic " + (index + 1), companionState: "map", content: React.createElement("p", null, "Content " + id),
}));
const intro = (id?: IntroJourneyId) => React.createElement(YoLessonDeck, {
  locale: "en", moduleLabel: "Introduction", backHref: "/yo", toggleHref: "/yo?lang=fr", screens, explorationJourney: id,
});

for (const id of ["english-intro", "french-quebec-intro", "spanish-intro"] as const) {
  test(`${id}: Yoppo follows navigation, resume survives reload and no mastery is persisted`, () => {
    const view = render(React.createElement(React.StrictMode, null, intro(id)));
    fireEvent.click(view.getByRole("button", { name: "Next" }));
    const saved = JSON.parse(localStorage.getItem(explorationKey(id))!);
    assert.deepEqual(saved, { version: 1, current: "practice", visited: ["mission", "practice"] });
    view.unmount();
    const reopened = render(intro(id));
    assert.ok(reopened.getByRole("heading", { name: "Topic 2" }));
    const details = reopened.container.querySelector("details")!;
    details.open = true;
    assert.ok(reopened.getByText("Explored steps are bookmarks, not verified skills."));
    fireEvent.click(reopened.getByRole("button", { name: /1 Topic 1 Explored/ }));
    assert.ok(reopened.getByRole("heading", { name: "Topic 1" }));
    assert.equal(details.open, false);
    assert.equal(localStorage.length, 1);
  });
}

test("standard and premium decks remain unpersisted unless a free introduction opts in", () => {
  const view = render(intro());
  fireEvent.click(view.getByRole("button", { name: "Next" }));
  assert.ok(view.getByRole("heading", { name: "Topic 2" }));
  assert.equal(view.queryByLabelText("My journey with Yoppo"), null);
  assert.equal(localStorage.length, 0);
});

test("changing the introduction on a reused component never copies another language's bookmark", () => {
  localStorage.setItem(explorationKey("french-quebec-intro"), JSON.stringify({ version: 1, current: "summary", visited: ["summary"] }));
  const view = render(intro("english-intro"));
  fireEvent.click(view.getByRole("button", { name: "Next" }));
  view.rerender(intro("french-quebec-intro"));
  assert.ok(view.getByRole("heading", { name: "Topic 3" }));
  assert.equal(JSON.parse(localStorage.getItem(explorationKey("english-intro"))!).current, "practice");
  assert.deepEqual(JSON.parse(localStorage.getItem(explorationKey("french-quebec-intro"))!), { version: 1, current: "summary", visited: ["summary"] });
});

test("malformed or obsolete bookmarks cannot inject unknown steps", () => {
  const ids = screens.map(screen => screen.id);
  assert.deepEqual(parseExploration("{broken", ids, 0), { index: 0, visited: [] });
  assert.deepEqual(parseExploration(JSON.stringify({ version: 1, current: "obsolete", visited: ["mission", "invented", "mission"] }), ids, 0), { index: 0, visited: ["mission"] });
});

test("unavailable browser storage leaves introduction navigation usable and reports the unsaved state", () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage")!;
  Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("Storage blocked"); } });
  try {
    const view = render(intro("english-intro"));
    fireEvent.click(view.getByRole("button", { name: "Next" }));
    assert.ok(view.getByRole("heading", { name: "Topic 2" }));
    view.container.querySelector("details")!.open = true;
    assert.ok(view.getByRole("status"));
  } finally { Object.defineProperty(window, "localStorage", descriptor); }
});

let failed = 0;
try {
  for (const [name, run] of tests) {
    cleanup(); localStorage.clear();
    try { run(); console.log("PASS " + name); }
    catch (error) { failed++; console.error("FAIL " + name, error); }
  }
} finally {
  cleanup(); dom.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
}
console.log(`${tests.length - failed}/${tests.length} all-language journey tests passed`);
if (failed) process.exitCode = 1;
