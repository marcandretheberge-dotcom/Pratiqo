import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { buildCourseJourney, canEnterCourseAssessment } from "@/lib/yo/courseJourney";
import { emptyCourseProgress, recordCourseActivity, recordCourseAssessment, markCourseProduction, parseCourseProgress, serializeCourseProgress, resetCourseProgress, setCourseResume, mergeCourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { germanCatalog, germanCourseUnits } from "@/lib/yo/german/courseData";
import { GERMAN_PROGRESS_KEY } from "@/lib/yo/german/courseLogic";
import { GermanCourseUnit } from "@/components/yo/german/GermanCourseUnit";
import { GermanCourseDashboard } from "@/components/yo/german/GermanCourseDashboard";
import { CourseJourney } from "@/components/yo/journey/CourseJourney";
import { journeyCopy } from "@/components/yo/journey/journeyCopy";
import { copy as germanCopy } from "@/components/yo/german/GermanCourseShared";

const catalog = germanCatalog;
const first = catalog.units[0], second = catalog.units[1];
const now = Date.now();
const pass = (progress = emptyCourseProgress(), unit = first, assisted = false) => {
  const assessment = catalog.assessments.find(a => a.id === unit.quizId)!;
  return recordCourseAssessment(progress, catalog, assessment.id, assessment.questionCount, assessment.questionCount, assisted, now);
};
const cases: [string, () => void][] = [];
const test = (name: string, fn: () => void) => cases.push([name, fn]);
test("new learner: only first step opens; final is closed", () => {
  const journey = buildCourseJourney(catalog, emptyCourseProgress());
  assert.deepEqual(journey.steps.map(s => s.unlocked), catalog.units.map((_, i) => i === 0));
  assert.equal(journey.current?.unit.id, first.id);
  assert.equal(canEnterCourseAssessment(catalog, emptyCourseProgress(), first.quizId), true);
  assert.equal(canEnterCourseAssessment(catalog, emptyCourseProgress(), "de-final"), false);
  assert.equal(canEnterCourseAssessment(catalog, emptyCourseProgress(), "missing"), false);
});
test("practice, self-report and assisted perfect score do not unlock the next step", () => {
  let state = emptyCourseProgress();
  for (const id of first.activityIds) state = recordCourseActivity(state, catalog, id, true, false, now);
  state = markCourseProduction(state, catalog, first.productionId, true, now);
  state = pass(state, first, true);
  const journey = buildCourseJourney(catalog, state);
  assert.equal(journey.steps[0].practiced, first.activityIds.length);
  assert.equal(journey.steps[0].passed, false);
  assert.equal(journey.steps[1].unlocked, false);
});
test("independent checkpoint opens the next step and moves Yoppo", () => {
  const journey = buildCourseJourney(catalog, pass());
  assert.equal(journey.passedCount, 1);
  assert.equal(journey.steps[1].unlocked, true);
  assert.equal(journey.steps[2].unlocked, false);
  assert.equal(journey.current?.unit.id, second.id);
});
test("failed and incomplete checkpoints never open a new step", () => {
  const a = catalog.assessments.find(a => a.id === first.quizId)!;
  for (const state of [recordCourseAssessment(emptyCourseProgress(), catalog, a.id, 0, a.questionCount, false, now), recordCourseAssessment(emptyCourseProgress(), catalog, a.id, 1, 1, false, now)]) {
    assert.equal(buildCourseJourney(catalog, state).steps[1].unlocked, false);
  }
});
test("the catalog threshold is used at the boundary", () => {
  const fixture = { ...catalog, assessments: catalog.assessments.map(a => a.id === first.quizId ? { ...a, questionCount: 10 } : a) };
  for (const correct of [7, 8]) {
    const state = recordCourseAssessment(emptyCourseProgress(), fixture, first.quizId, correct, 10, false, now);
    assert.equal(buildCourseJourney(fixture, state).steps[1].unlocked, correct === 8);
  }
});
test("old progress is preserved without inventing previous passes", () => {
  let state = recordCourseActivity(emptyCourseProgress(), catalog, catalog.units[4].activityIds[0], false, true, now);
  state = setCourseResume(state, catalog, catalog.units[4].id, catalog.units[4].lessons[0].id, undefined, now);
  const raw = serializeCourseProgress(state);
  const journey = buildCourseJourney(catalog, parseCourseProgress(raw, catalog));
  assert.equal(journey.steps[4].unlocked, true);
  assert.equal(journey.steps[5].unlocked, false);
  assert.equal(journey.passedCount, 0);
  assert.equal(journey.current?.unit.id, catalog.units[4].id);
  assert.equal(serializeCourseProgress(state), raw);
  const continued = buildCourseJourney(catalog, pass(state, catalog.units[4]));
  assert.equal(continued.steps[5].unlocked, true);
  assert.equal(continued.current?.unit.id, catalog.units[5].id);
  assert.equal(continued.passedCount, 1);
});
test("retry failure, reload and merge do not remove an earned checkpoint; explicit reset does", () => {
  const a = catalog.assessments.find(a => a.id === first.quizId)!;
  const earned = pass();
  const retry = recordCourseAssessment(earned, catalog, a.id, 0, a.questionCount, false, now + 2);
  const restored = parseCourseProgress(serializeCourseProgress(mergeCourseProgress(earned, retry)), catalog);
  assert.equal(buildCourseJourney(catalog, restored).steps[1].unlocked, true);
  assert.equal(buildCourseJourney(catalog, resetCourseProgress(restored, now + 3)).steps[1].unlocked, false);
});
test("all completed unit checkpoints unlock the final and culture; course namespaces stay separate", () => {
  let state = emptyCourseProgress();
  for (const unit of catalog.units) state = pass(state, unit);
  for (const a of catalog.assessments) assert.equal(canEnterCourseAssessment(catalog, state, a.id), true);
  assert.equal(buildCourseJourney(catalog, state).passedCount, catalog.units.length);
  assert.equal(buildCourseJourney(catalog, emptyCourseProgress()).passedCount, 0);
});

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/allemand/parcours", pretendToBeVisual: true });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
class TestAudio extends dom.window.EventTarget {
  currentTime = 0;
  play() { this.dispatchEvent(new dom.window.Event("playing")); return Promise.resolve(); }
  pause() {} removeAttribute() {} load() {}
}
Object.defineProperty(dom.window, "Audio", { value: TestAudio, configurable: true });
for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent } = require("@testing-library/react") as typeof import("@testing-library/react");
for (const locale of ["fr", "en", "es"] as const) test(`${locale}: semantic map retains goals, shows locked steps without dead links and positions Yoppo`, () => {
  const view = render(React.createElement(CourseJourney, { catalog, progress: pass(), ready: true, locale, href: id => `/course/${id ?? ""}` }));
  assert.ok(view.getByRole("region", { name: journeyCopy[locale].title }));
  const visibleIds = () => Array.from(view.container.querySelectorAll("[data-journey-unit]")).map(node => node.getAttribute("data-journey-unit"));
  assert.deepEqual(visibleIds(), catalog.units.slice(0,4).map(unit => unit.id));
  assert.equal(view.container.querySelector("[data-yoppo-position]")?.getAttribute("data-yoppo-position"), second.id);
  assert.equal(view.container.querySelector('[data-unlocked="false"] a:not([target])'), null);
  const continueLabel = {fr:"Continuer",en:"Continue",es:"Continuar"}[locale];
  assert.equal(view.getByRole("link", { name: continueLabel }).getAttribute("href"), `/course/${second.id}`);
  assert.ok(view.getByText(second.objectives[0][locale]));
  fireEvent.click(view.getByRole("button", {name:{fr:"Étapes suivantes",en:"Next stops",es:"Etapas siguientes"}[locale]}));
  assert.deepEqual(visibleIds(),catalog.units.slice(4).map(unit=>unit.id));
  assert.ok(Array.from(view.container.querySelectorAll<HTMLButtonElement>('.yo-shared-destinations button')).every(button=>button.disabled));
  assert.equal(view.queryByRole("link",{name:continueLabel}),null);
});
test("direct locked route cannot create a resume entry or unlock itself", () => {
  const view = render(React.createElement(GermanCourseUnit, { catalog, unit: germanCourseUnits[1], locale: "fr", audioPaths: {} }));
  assert.ok(view.getByRole("heading", { name: journeyCopy.fr.lockedTitle }));
  assert.equal(window.localStorage.getItem(GERMAN_PROGRESS_KEY), null);
});
test("blocked storage is reported without inventing a passed checkpoint", () => {
  const prototype = Object.getPrototypeOf(window.localStorage);
  const get = prototype.getItem;
  prototype.getItem = () => { throw new Error("storage denied"); };
  try {
    const view = render(React.createElement(GermanCourseDashboard, { catalog, locale: "fr" }));
    assert.ok(view.getByText(germanCopy.fr.blocked));
    assert.equal(view.container.querySelectorAll('[data-unlocked="true"]').length, 1);
  } finally { prototype.getItem = get; }
});
test("real assessment handlers persist independent success, reveal next step, and survive reload", () => {
  const unit = germanCourseUnits[0];
  // Short catalog fixture uses real questions and the real assessment/progress handlers.
  const questions = unit.quiz.questions.filter(q => q.kind === "type");
  assert.equal(questions.length, unit.quiz.questions.length);
  const fixture = { ...catalog, assessments: catalog.assessments.map(a => a.id === unit.quiz.id ? { ...a, questionCount: questions.length } : a) };
  const view = render(React.createElement(GermanCourseUnit, { catalog: fixture, unit: { ...unit, quiz: { ...unit.quiz, questions } }, locale: "fr", audioPaths: Object.fromEntries(questions.filter(q => q.listeningText).map(q => [q.listeningText!, "/audio/yo/de/german-course-foundations/v1/german-standard/sentence/test.mp3"])) }));
  fireEvent.click(view.getByRole("button", { name: "Bilan" }));
  fireEvent.click(view.getByRole("button", { name: "Commencer" }));
  for (const q of questions) {
    if (q.listeningText) fireEvent.click(view.getByRole("button", { name: "Écouter : le message de l’exercice" }));
    fireEvent.change(view.getByRole("textbox", { name: "Ta réponse en allemand" }), { target: { value: q.model } });
    fireEvent.click(view.getByRole("button", { name: "Vérifier" }));
    fireEvent.click(view.getByRole("button", { name: "Continuer" }));
  }
  assert.ok(view.getByRole("link", { name: new RegExp(journeyCopy.fr.next) }).getAttribute("href")?.includes(second.id));
  const stored = window.localStorage.getItem(GERMAN_PROGRESS_KEY);
  assert.equal(buildCourseJourney(fixture, parseCourseProgress(stored, fixture)).steps[1].unlocked, true);
  cleanup();
  const dashboard = render(React.createElement(GermanCourseDashboard, { catalog: fixture, locale: "fr" }));
  assert.equal(dashboard.container.querySelector("[data-yoppo-position]")?.getAttribute("data-yoppo-position"), second.id);
});
let failures = 0;
for (const [name, run] of cases) {
  cleanup(); window.localStorage.clear();
  try { run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}`, error); }
}
cleanup(); dom.window.close();
console.log(`${cases.length - failures}/${cases.length} journey checks passed`);
if (failures) process.exitCode = 1;
