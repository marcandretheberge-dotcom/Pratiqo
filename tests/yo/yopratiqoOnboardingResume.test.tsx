import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { personalizedItalianCatalog, placementChecks } from "@/lib/yo/personalized/courseData";
import { GUIDED_PROGRESS_KEY, profileKey, type LearningProfile } from "@/lib/yo/personalized/profile";
import { introCourses } from "@/lib/yo/shared/course";
import { freshIntro, introKey } from "@/lib/yo/shared/state";
import { introEpochKey } from "@/lib/yo/shared/introSync";
import type { IntroCourse, IntroProfile } from "@/lib/yo/shared/types";
import { interestLanguage } from "@/lib/yo/interests/preferences";
import { ONBOARDING_DRAFT_PREFIX } from "@/lib/yo/onboarding/draftStore";
import { createItalianWelcomeStore } from "@/lib/yo/onboarding/draftAdapters";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frame = 0, played = 0, requests = 0, earlyFrame = false;
for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter,
  DocumentFragment: dom.window.DocumentFragment, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent, MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle, localStorage: dom.window.localStorage,
  requestAnimationFrame: (fn: FrameRequestCallback) => { const id = ++frame; if (earlyFrame) fn(0); else frames.set(id, fn); return id; }, cancelAnimationFrame: (id: number) => frames.delete(id),
  fetch: async () => { requests++; throw new Error("No request expected"); }, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
window.scrollTo = () => {}; dom.window.HTMLElement.prototype.scrollIntoView = () => {};
Object.defineProperty(window, "Audio", { value: class { constructor() { played++; } }, configurable: true });
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const { ItalianOnboarding } = require("@/components/yo/personalized/ItalianOnboarding") as typeof import("@/components/yo/personalized/ItalianOnboarding");
const { IntroWelcome } = require("@/components/yo/shared/IntroWelcome") as typeof import("@/components/yo/shared/IntroWelcome");
type View = ReturnType<typeof render>;
const cases: Array<[string, () => void]> = [];
let clock = Date.now(); Date.now = () => clock;
function flush() { for (let i = 0; i < 20 && frames.size; i++) { const next = [...frames.values()]; frames.clear(); act(() => next.forEach(fn => fn(0))); } }
function queries(view: View) { return within(view.container); }
function click(view: View, name: string) { clock += 500; fireEvent.click(queries(view).getByRole("button", { name })); flush(); }
function italian(done: LearningProfile[] = [], locale: YoLocale = "en", checks = placementChecks) {
  const view = render(<ItalianOnboarding locale={locale} catalog={personalizedItalianCatalog} checks={checks} audioPaths={{}} onComplete={profile => done.push(profile)}/>); flush(); return view;
}
function shared(course: IntroCourse, done: IntroProfile[] = [], locale: YoLocale = "en") {
  const view = render(<IntroWelcome course={course} locale={locale} audio={{}} onComplete={profile => done.push(profile)}/>); flush(); return view;
}
function choosePreferences(view: View, isItalian: boolean) {
  click(view, "I know a few words"); click(view, "Travel"); click(view, "Food"); click(view, "Continue");
  fireEvent.click(queries(view).getByRole("radio", { name: isItalian ? "1 h / week" : "60 min" })); flush();
  click(view, "Continue"); click(view, "Find my starting point");
}
function italianChoice(view: View, index: number, correct: boolean) {
  const question = placementChecks[index].activity; assert.notEqual(question.kind, "type");
  if (question.kind === "type") return;
  const options = question.options, option = options.find(option => correct ? option.id === question.correctId : option.id !== question.correctId)!;
  const help = queries(view).queryByRole("button", { name: "Read instead of listen (with help)" });
  if (help) { fireEvent.click(help); flush(); }
  click(view, option.it ?? option.label!.en);
}
function sharedAnswer(view: View, course: IntroCourse, index: number) {
  const question = course.final[index];
  const read = queries(view).queryByRole("button", { name: "Read instead of listen" });
  if (read) { fireEvent.click(read); flush(); }
  if (question.kind === "order") {
    const words = within(queries(view).getByRole("group", { name: "Available words" }));
    for (const button of [...words.getAllByRole("button")].reverse()) { fireEvent.click(button); flush(); }
    click(view, "Check sentence");
  } else {
    const id = question.options.find(id => id !== question.answer)!;
    clock += 500; fireEvent.click(view.container.querySelector(`[data-answer-id="${id}"]`)!); flush();
  }
}
function draft(language = "it") { return JSON.parse(localStorage.getItem(ONBOARDING_DRAFT_PREFIX + language)!).state; }
function evidence() {
  return Object.fromEntries(Object.keys(localStorage).filter(key => !key.startsWith(ONBOARDING_DRAFT_PREFIX) && key !== "yo.practice.auto-next.v1" && !key.startsWith("yo.interests.")).sort().map(key => [key, localStorage.getItem(key)]));
}

cases.push(["both welcome headings receive initial focus after the loading state is replaced", () => {
  // A frame can run before passive hydration work. It must not consume the sole focus effect while its refs are absent.
  earlyFrame = true;
  try {
    const first = italian(); assert.equal(document.activeElement, queries(first).getByRole("heading", { level: 1 })); first.unmount();
    const second = shared(introCourses[0]); assert.equal(document.activeElement, queries(second).getByRole("heading", { level: 1 }));
  } finally { earlyFrame = false; }
}]);

cases.push(["Italian choices, interests and unfinished custom pace survive reload and interface-language changes", () => {
  const done: LearningProfile[] = []; let view = italian(done);
  click(view, "I know a few words"); click(view, "Work or studies"); click(view, "Nature"); click(view, "Art"); click(view, "Continue");
  click(view, "Choose another duration"); fireEvent.change(queries(view).getByRole("spinbutton"), { target: { value: "95" } }); flush();
  view.unmount(); view = italian(done, "fr");
  assert.equal(view.container.querySelector("[data-onboarding-step]")?.getAttribute("data-onboarding-step"), "time");
  assert.equal((queries(view).getByRole("spinbutton") as HTMLInputElement).value, "95");
  click(view, "Retour"); assert.equal(queries(view).getByRole("button", { name: "Nature" }).getAttribute("aria-pressed"), "true");
  click(view, "Continuer"); click(view, "Continuer");
  assert.equal(view.container.querySelector("[data-onboarding-step]")?.getAttribute("data-onboarding-step"), "choice");
  assert.equal(draft().goal, "work"); assert.deepEqual(draft().interests, ["nature", "art"]); assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
}]);

cases.push(["Italian checked first answer, assisted listening and unfinished word tiles resume without grading or replay", () => {
  const done: LearningProfile[] = []; let view = italian(done); choosePreferences(view, true);
  italianChoice(view, 0, true);
  const first = JSON.stringify(draft().game); view.unmount(); view = italian(done, "fr");
  assert.equal(JSON.stringify(draft().game), first); assert.equal(draft().answers.length, 0); assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
  click(view, "Continuer"); view.unmount(); view = italian(done);
  italianChoice(view, 1, true); assert.equal(draft().game.assisted, true);
  view.unmount(); view = italian(done); assert.equal(draft().game.assisted, true); assert.equal(draft().game.complete, true);
  click(view, "Continue");
  const words = within(queries(view).getByRole("group", { name: "Available words" })); fireEvent.click(words.getAllByRole("button")[0]); flush();
  const partial = [...draft().game.tiles]; assert.equal(partial.length, 1);
  view.unmount(); view = italian(done, "es");
  assert.deepEqual(draft().game.tiles, partial); assert.equal(draft().game.complete, false); assert.equal(draft().answers.length, 2);
  assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
  click(view, "Reiniciar este cuestionario"); assert.equal(draft().answers.length, 0); assert.deepEqual(draft().game.tiles, []); assert.equal(draft().game.assisted, false);
}]);

cases.push(["Italian stale tab cannot replace a checked answer or append it twice", () => {
  const done: LearningProfile[] = [], a = italian(done); choosePreferences(a, true); const b = italian(done);
  italianChoice(a, 0, false); const accepted = JSON.stringify(draft());
  italianChoice(b, 0, true); assert.equal(JSON.stringify(draft()), accepted); assert.equal(draft().game.feedback, false);
  assert.ok(queries(b).getByText(/choices were updated in another window/));
  click(b, "Continue"); assert.equal(draft().answers.length, 1);
  click(a, "Continue"); assert.equal(draft().answers.length, 1); assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
}]);

cases.push(["Italian can continue after adopting a second external restart and checked first answer", () => {
  const done: LearningProfile[] = [], a = italian(done); choosePreferences(a, true); const b = italian(done);
  italianChoice(a, 0, false); italianChoice(b, 0, true);
  assert.ok(queries(b).getByText(/choices were updated/));
  click(a, "Start this check again"); italianChoice(a, 0, false);
  const latest = JSON.stringify(draft());
  click(b, "Continue"); assert.equal(JSON.stringify(draft()), latest, "the stale continuation must reject before advancing");
  click(b, "Continue"); assert.equal(draft().answers.length, 1, "the deliberate retry must advance the newly adopted attempt");
  assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
}]);

cases.push(["Italian result and mission picker restore; stale and duplicate finish never invoke completion", () => {
  const done: LearningProfile[] = []; let a = italian(done); click(a, "Skip");
  fireEvent.change(queries(a).getByRole("combobox"), { target: { value: "u05" } }); flush();
  a.unmount(); a = italian(done); const b = italian(done);
  assert.equal((queries(a).getByRole("combobox") as HTMLSelectElement).value, "u05"); assert.equal(done.length, 0);
  fireEvent.change(queries(a).getByRole("combobox"), { target: { value: "u06" } }); flush();
  click(b, "Start here"); assert.equal(done.length, 0); assert.equal((queries(b).getByRole("combobox") as HTMLSelectElement).value, "u06");
  click(b, "Start here"); assert.equal(done.length, 1); assert.equal(done[0].startUnitId, "u06");
  click(a, "Start here"); click(b, "Start here"); assert.equal(done.length, 1); assert.deepEqual(evidence(), {});
}]);

for (const boundary of ["profile", "course-reset", "draft-deletion", "content"] as const) cases.push([`Italian ${boundary} invalidates an already rendered finish`, () => {
  const done: LearningProfile[] = [], view = italian(done); click(view, "Skip");
  if (boundary === "profile") localStorage.setItem(profileKey("it"), JSON.stringify({ version: 1, language: "it", experience: "new", goal: "work", weeklyMinutes: 60, startUnitId: "u02", placement: "manual", reviewUnitIds: [], updatedAt: clock }));
  if (boundary === "course-reset") localStorage.setItem(GUIDED_PROGRESS_KEY, JSON.stringify({ version: 1, resetAt: clock }));
  if (boundary === "draft-deletion") localStorage.removeItem(ONBOARDING_DRAFT_PREFIX + "it");
  if (boundary === "content") italian(done, "en", placementChecks.map((check, index) => index ? check : { ...check, activity: { ...check.activity, prompt: { ...check.activity.prompt, en: "Changed check" } } }));
  click(view, "Start here"); assert.equal(done.length, 0); assert.ok(queries(view).getByRole("alert")); assert.ok(queries(view).getByRole("button", { name: "Reload the page" }));
}]);

for (const course of introCourses) cases.push([`${course.language}: shared placement, preferences and checked result survive a locale-changing reload`, () => {
  const done: IntroProfile[] = [], language = interestLanguage(course.language)!; let view = shared(course, done); choosePreferences(view, false);
  sharedAnswer(view, course, 0); const checked = draft(language).draft;
  assert.equal(checked.checked, true); view.unmount(); view = shared(course, done, "fr");
  assert.equal(view.container.querySelector("[data-intro-question]")?.getAttribute("data-intro-question"), course.final[0].id);
  assert.deepEqual(draft(language).draft, { ...checked, heard: false }); assert.deepEqual(draft(language).interests, ["food"]); assert.equal(draft(language).experience, "some");
  assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
  click(view, "Continuer"); assert.equal(draft(language).answers.length, 1); assert.equal(draft(language).draft.checked, false);
  click(view, "Recommencer ce questionnaire"); assert.equal(draft(language).answers.length, 0); assert.equal(draft(language).draft.assisted, false);
}]);

cases.push(["shared stale answer and result finish preserve the current window's choices", () => {
  const course = introCourses[0], language = interestLanguage(course.language)!, done: IntroProfile[] = [], a = shared(course, done); choosePreferences(a, false); const b = shared(course, done);
  sharedAnswer(a, course, 0); const first = JSON.stringify(draft(language));
  const correct = course.final[0].answer; clock += 500; fireEvent.click(b.container.querySelector(`[data-answer-id="${correct}"]`)!); flush();
  assert.equal(JSON.stringify(draft(language)), first); assert.ok(queries(b).getByText(/choices were updated/));
  click(b, "Choose a mission instead"); click(a, "Choose a mission instead");
  fireEvent.change(queries(b).getByRole("combobox"), { target: { value: "2" } }); flush();
  click(a, "Start here"); assert.equal(done.length, 0); click(a, "Start here"); assert.equal(done.length, 1); assert.equal(done[0].entry, 2);
  click(b, "Start here"); assert.equal(done.length, 1); assert.deepEqual(evidence(), {});
}]);

cases.push(["shared can continue after adopting a second external restart and checked first answer", () => {
  const course = introCourses[0], language = interestLanguage(course.language)!, done: IntroProfile[] = [], a = shared(course, done);
  choosePreferences(a, false); const b = shared(course, done);
  sharedAnswer(a, course, 0); clock += 500; fireEvent.click(b.container.querySelector(`[data-answer-id="${course.final[0].answer}"]`)!); flush();
  assert.ok(queries(b).getByText(/choices were updated/));
  click(a, "Start this check again"); sharedAnswer(a, course, 0);
  const latest = JSON.stringify(draft(language));
  click(b, "Continue"); assert.equal(JSON.stringify(draft(language)), latest, "the stale continuation must reject before advancing");
  click(b, "Continue"); assert.equal(draft(language).answers.length, 1, "the deliberate retry must advance the newly adopted attempt");
  assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
}]);

cases.push(["a completed shared placement result restores without submitting a course final", () => {
  const course = introCourses[0], language = interestLanguage(course.language)!, done: IntroProfile[] = []; let view = shared(course, done); choosePreferences(view, false);
  for (let index = 0; index < course.final.length; index++) { sharedAnswer(view, course, index); click(view, "Continue"); }
  assert.ok(view.container.querySelector("[data-shared-recommendation]")); const before = JSON.stringify(draft(language));
  view.unmount(); view = shared(course, done, "es"); assert.equal(JSON.stringify(draft(language)), before); assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
  assert.equal(localStorage.getItem(introKey(course.language)), null); click(view, "Empezar aquí"); assert.equal(done.length, 1);
}]);

for (const boundary of ["profile", "reset", "draft-deletion", "content"] as const) cases.push([`shared ${boundary} changes block the old placement without restoring outcomes`, () => {
  const course = introCourses[0], done: IntroProfile[] = [], view = shared(course, done); click(view, "Skip");
  if (boundary === "profile") localStorage.setItem(introKey(course.language), JSON.stringify({ ...freshIntro(course), profile: { experience: "new", goal: "work", minutes: 30, entry: 1 } }));
  if (boundary === "reset") localStorage.setItem(introEpochKey(course.language), JSON.stringify({ version: 1, language: course.language, reset: { at: clock, actor: "other-tab" } }));
  if (boundary === "draft-deletion") localStorage.removeItem(ONBOARDING_DRAFT_PREFIX + interestLanguage(course.language));
  if (boundary === "content") shared({ ...course, final: course.final.map((question, i) => i ? question : { ...question, prompt: { ...question.prompt, en: "Changed check" } }) });
  const before = evidence();
  click(view, "Start here"); assert.equal(done.length, 0); assert.ok(queries(view).getByRole("alert")); assert.deepEqual(evidence(), before);
}]);

cases.push(["an Italian checked-placement recommendation restores without completing a lesson", () => {
  const done: LearningProfile[] = []; let view = italian(done); choosePreferences(view, true);
  italianChoice(view, 0, false); click(view, "Continue"); italianChoice(view, 1, false); click(view, "Continue");
  const words = within(queries(view).getByRole("group", { name: "Available words" })); fireEvent.click(words.getAllByRole("button")[0]); flush();
  click(view, "Check"); click(view, "Continue");
  assert.ok(view.container.querySelector("[data-onboarding-recommendation]")); assert.equal(draft().mode, "check"); assert.equal(draft().answers.length, 3);
  const before = JSON.stringify(draft()); view.unmount(); view = italian(done, "es");
  assert.equal(JSON.stringify(draft()), before); assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
  click(view, "Empezar aquí"); assert.equal(done.length, 1); assert.equal(done[0].placement, "check"); assert.deepEqual(evidence(), {});
}]);

cases.push(["blocked browser storage remains session-only and completion is still deliberate", () => {
  const prototype = dom.window.Storage.prototype, getItem = prototype.getItem, setItem = prototype.setItem;
  prototype.getItem = () => { throw new Error("blocked"); }; prototype.setItem = () => { throw new Error("blocked"); };
  try {
    const done: LearningProfile[] = [], view = italian(done); assert.ok(queries(view).getByText(/choices last for this session only/));
    click(view, "Skip"); assert.equal(done.length, 0); click(view, "Start here"); assert.equal(done.length, 1);
    click(view, "Start here"); assert.equal(done.length, 1);
  } finally { prototype.getItem = getItem; prototype.setItem = setItem; }
}]);

cases.push(["malformed or oversized saved UI state cannot become a placement result", () => {
  localStorage.setItem(ONBOARDING_DRAFT_PREFIX + "it", "x".repeat(24001));
  const store = createItalianWelcomeStore(personalizedItalianCatalog, placementChecks); store.refresh();
  assert.equal(store.getSnapshot().state.screen, "experience"); assert.deepEqual(store.getSnapshot().state.answers, []);
  const saved = JSON.parse(localStorage.getItem(store.key)!); saved.state.screen = "check"; saved.state.game.tiles = [999];
  localStorage.setItem(store.key, JSON.stringify(saved));
  const next = createItalianWelcomeStore(personalizedItalianCatalog, placementChecks); next.refresh(); assert.equal(next.getSnapshot().state.screen, "experience");
  assert.deepEqual(evidence(), {});
}]);

cases.push(["a session-only draft survives storage recovery without creating learning evidence", () => {
  let blocked = true;
  const storage = { getItem(key: string) { if (blocked) throw new Error("Blocked"); return localStorage.getItem(key); },
    setItem(key: string, value: string) { if (blocked) throw new Error("Blocked"); localStorage.setItem(key, value); } };
  const store = createItalianWelcomeStore(personalizedItalianCatalog, placementChecks, null, () => storage);
  store.refresh(); store.update(store.getSnapshot().token, state => ({ ...state, screen: "time", goal: "work", custom: true, customText: "95" }));
  assert.equal(store.getSnapshot().storageError, true); assert.equal(localStorage.getItem(store.key), null);
  blocked = false; store.refresh();
  assert.equal(store.getSnapshot().storageError, false); assert.equal(draft().customText, "95"); assert.equal(draft().goal, "work");
  const reloaded = createItalianWelcomeStore(personalizedItalianCatalog, placementChecks); reloaded.refresh();
  assert.equal(reloaded.getSnapshot().state.screen, "time"); assert.deepEqual(evidence(), {});
}]);

cases.push(["an older page does not downgrade a future saved-draft schema", () => {
  const key = ONBOARDING_DRAFT_PREFIX + "it", future = JSON.stringify({ version: 2, state: { screen: "result" } });
  localStorage.setItem(key, future);
  const done: LearningProfile[] = [], view = italian(done);
  assert.ok(queries(view).getByRole("alert")); click(view, "Skip");
  assert.equal(localStorage.getItem(key), future); assert.equal(done.length, 0); assert.deepEqual(evidence(), {});
}]);

let failures = 0;
for (const [name, run] of cases) {
  cleanup(); frames.clear(); localStorage.clear(); localStorage.setItem("yo.practice.auto-next.v1", "off"); played = 0; requests = 0;
  try { run(); assert.equal(played, 0, "onboarding restoration does not start audio"); assert.equal(requests, 0, "onboarding uses no provider or outcome API"); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}`, error); }
}
cleanup(); dom.window.close(); console.log(`${cases.length - failures}/${cases.length} onboarding resume checks passed`);
if (failures) process.exitCode = 1;
