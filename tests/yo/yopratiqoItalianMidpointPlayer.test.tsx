import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

import { ItalianCourseUnit } from "@/components/yo/italian/course/ItalianCourseUnit";
import { italianCourseUnits, italianCourseCatalog as catalog, courseSources } from "@/lib/yo/italian/course/courseData";
import {
  emptyCourseProgress,
  ITALIAN_COURSE_PROGRESS_KEY,
  recordCourseActivity,
  recordCourseAssessment,
  resetCourseProgress,
  serializeCourseProgress,
  type CourseProgress,
} from "@/lib/yo/italian/course/courseProgress";
import type { CourseQuestion } from "@/lib/yo/italian/course/courseTypes";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/yo/langues/italien/parcours/u01",
  pretendToBeVisual: true,
});
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
for (const [key, value] of Object.entries({
  window: dom.window, self: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Event: dom.window.Event,
  MutationObserver: dom.window.MutationObserver, localStorage: dom.window.localStorage,
  requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; },
  cancelAnimationFrame: (id: number) => frames.delete(id),
  IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", { value: function () { this.setAttribute("open", ""); } });
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "close", { value: function () { this.removeAttribute("open"); } });

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audio.example.test";
class FakeAudio extends dom.window.EventTarget {
  src: string; preload = "none"; playbackRate = 1; preservesPitch = true; currentTime = 0;
  constructor(src: string) { super(); this.src = src; }
  play() { this.dispatchEvent(new Event("playing")); return Promise.resolve(); }
  pause() {}
  load() {}
  removeAttribute() { this.src = ""; }
}
window.Audio = FakeAudio as unknown as typeof Audio;

const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const unit = italianCourseUnits[0], midpoint = unit.midpoint!;
const activityIds = catalog.units[0].activityIds;
const audioPaths = Object.fromEntries(midpoint.questions.flatMap((question) => question.kind === "listen" && question.stimulus
  ? [[question.stimulus, "yo/it/italian-course-a1/v1/italian-standard/sentence/test.mp3"]]
  : []));
const tests: [string, () => void][] = [];

function flush() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(0)));
}
function click(element: HTMLElement) { fireEvent.click(element); flush(); }
const saved = (): CourseProgress => JSON.parse(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY) ?? "null") ?? emptyCourseProgress();
function practice(count: number, progress = emptyCourseProgress()) {
  return activityIds.slice(0, count).reduce((current, id, index) =>
    recordCourseActivity(current, catalog, id, true, false, Date.now() + index), progress);
}
function put(progress: CourseProgress) { window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, serializeCourseProgress(progress)); }
function receive(progress: CourseProgress) {
  const newValue = serializeCourseProgress(progress);
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, newValue);
  act(() => window.dispatchEvent(new dom.window.StorageEvent("storage", { key: ITALIAN_COURSE_PROGRESS_KEY, newValue })));
  flush();
}
function element(initialLessonId?: string, initialActivityId?: string) {
  return <ItalianCourseUnit unit={unit} locale="fr" catalog={catalog} sources={courseSources} audioPaths={audioPaths} initialLessonId={initialLessonId} initialActivityId={initialActivityId} />;
}
function mount(initialLessonId?: string, initialActivityId?: string) {
  const view = render(element(initialLessonId, initialActivityId));
  flush();
  return view;
}
function midpointButton(view: View) { return view.getByRole("button", { name: "Halte de mi-parcours" }) as HTMLButtonElement; }
function open(view: View) {
  click(midpointButton(view));
  click(view.getByRole("button", { name: "Commencer la halte" }));
}
function answer(view: View, question: CourseQuestion) {
  if (question.kind === "type") {
    fireEvent.change(view.getByRole("textbox", { name: "Ta réponse en italien" }), { target: { value: question.model } });
  } else {
    if (question.kind === "listen") click(view.getByRole("button", { name: "Écouter : le message de l’exercice" }));
    const option = question.options.find((item) => item.id === question.correctId)!;
    click(view.getByRole("button", { name: option.it ?? option.label!.fr }));
  }
  click(view.getByRole("button", { name: "Vérifier" }));
}

tests.push(["the parent opens the optional midpoint after ten independent successes, including live cross-tab updates", () => {
  const view = mount();
  assert.equal(midpointButton(view).disabled, true);
  assert.ok(view.getByText("Disponible après 10 activités réussies sans aide · 0/10."));
  assert.equal(view.container.querySelector("[data-midpoint-card]"), null);
  click(midpointButton(view));
  assert.equal(view.queryByRole("button", { name: "Commencer la halte" }), null);

  receive(practice(9));
  assert.equal(midpointButton(view).disabled, true);
  const assistedTenth = recordCourseActivity(saved(), catalog, activityIds[9], true, true);
  receive(assistedTenth);
  assert.equal(midpointButton(view).disabled, true);
  assert.ok(view.getByText("Disponible après 10 activités réussies sans aide · 9/10."));
  receive(recordCourseActivity(saved(), catalog, activityIds[9], true, false));
  assert.equal(midpointButton(view).disabled, false);
  assert.ok(view.getByRole("button", { name: "Faire la halte" }));
  assert.equal(view.queryByRole("button", { name: "Commencer la halte" }), null, "eligibility does not replace the lesson automatically");
  assert.equal(document.querySelector("dialog[open]"), null, "cross-tab recognition is silent");
}]);

tests.push(["finishing and leaving the midpoint preserves the mounted lesson draft, checklist and resume location", () => {
  put(practice(10));
  const lesson = unit.lessons[1];
  const view = mount(lesson.id);
  click(view.getByRole("button", { name: "6. À toi" }));
  const draft = view.getByRole("textbox", { name: "Mon essai en italien" }) as HTMLTextAreaElement;
  fireEvent.change(draft, { target: { value: "Un gelato, per favore. Mon essai privé." } });
  const check = view.getByRole("checkbox", { name: lesson.speaking.checklist[0].fr }) as HTMLInputElement;
  click(check);
  const beforeResume = saved().resume;
  const beforeActivities = saved().activities;
  open(view);
  assert.deepEqual(saved().resume, beforeResume, "the recap does not overwrite the lesson bookmark");
  for (const [index, question] of midpoint.questions.entries()) {
    answer(view, question);
    click(view.getByRole("button", { name: index === midpoint.questions.length - 1 ? "Voir mon résultat" : "Question suivante" }));
  }
  const celebration = view.getByRole("dialog", { name: "Halte réussie" });
  click(within(celebration).getAllByRole("button", { name: "Continuer" })[0]);
  assert.equal(saved().assessments[midpoint.id].bestIndependent, 100);
  assert.equal(saved().assessments[unit.quiz.id], undefined);
  assert.deepEqual(saved().activities, beforeActivities);
  click(view.getByRole("button", { name: "Poursuivre les leçons" }));
  assert.equal(view.getByRole("textbox", { name: "Mon essai en italien" }), draft);
  assert.equal(draft.value, "Un gelato, per favore. Mon essai privé.");
  assert.equal(check.checked, true);
  assert.deepEqual(saved().resume, beforeResume);
  assert.equal(document.activeElement?.textContent, lesson.title.fr);
  assert.ok(view.getByRole("button", { name: "Rejouer la halte" }));
  assert.equal(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY)!.includes("Mon essai privé"), false);
}]);

tests.push(["a cross-tab reset cancels an unfinished midpoint, clears study drafts, and closes midpoint access", () => {
  put(practice(10));
  const view = mount();
  click(view.getByRole("button", { name: "6. À toi" }));
  fireEvent.change(view.getByRole("textbox", { name: "Mon essai en italien" }), { target: { value: "Draft before reset" } });
  open(view);
  answer(view, midpoint.questions[0]);
  const oldNext = view.getByRole("button", { name: "Question suivante" });
  receive(resetCourseProgress(saved()));
  assert.equal(midpointButton(view).disabled, true);
  assert.equal(midpointButton(view).getAttribute("aria-pressed"), "false");
  assert.equal(view.queryByRole("button", { name: "Question suivante" }), null);
  assert.equal(view.container.querySelector("[data-midpoint-card]"), null);
  assert.deepEqual(saved().assessments, {});
  assert.deepEqual(saved().activities, {});
  click(oldNext);
  assert.deepEqual(saved().assessments, {}, "a removed assessment control cannot submit the canceled run");
  click(view.getByRole("button", { name: "6. À toi" }));
  assert.equal((view.getByRole("textbox", { name: "Mon essai en italien" }) as HTMLTextAreaElement).value, "");
  receive(practice(10, saved()));
  open(view);
  assert.ok(view.getByText(midpoint.questions[0].prompt.fr));
  assert.equal(view.queryByRole("button", { name: "Question suivante" }), null, "the next eligible visit starts a fresh run");
}]);

tests.push(["a new lesson/activity deep link leaves an unfinished midpoint and updates the genuine lesson bookmark", () => {
  put(practice(10));
  const view = mount();
  open(view);
  answer(view, midpoint.questions[0]);
  const lesson = unit.lessons[2], activity = lesson.activities[0];
  view.rerender(element(lesson.id, activity.id));
  flush();
  assert.equal(midpointButton(view).getAttribute("aria-pressed"), "false");
  assert.ok(view.getByRole("group", { name: "Expressions italiennes" }));
  assert.ok(view.getByText(activity.prompt.fr));
  assert.equal(view.queryByRole("button", { name: "Question suivante" }), null);
  assert.deepEqual(saved().resume, { unitId: unit.id, lessonId: lesson.id, activityId: activity.id });
  assert.equal(saved().assessments[midpoint.id], undefined);
  assert.equal(document.activeElement?.textContent, lesson.title.fr);
}]);

tests.push(["legacy independent unit mastery keeps optional midpoint review reachable without fabricated activity history", () => {
  put(recordCourseAssessment(emptyCourseProgress(), catalog, unit.quiz.id, 4, 5, false));
  const view = mount();
  assert.equal(midpointButton(view).disabled, false);
  assert.ok(view.getByRole("button", { name: "Faire la halte" }));
  assert.deepEqual(saved().activities, {});
  assert.equal(saved().assessments[midpoint.id], undefined);
  assert.equal(document.querySelector("dialog[open]"), null);
  click(midpointButton(view));
  assert.ok(view.getByRole("button", { name: "Commencer la halte" }));
}]);

let failures = 0;
for (const [name, test] of tests) {
  cleanup(); frames.clear(); window.localStorage.clear();
  try { test(); console.log("PASS", name); }
  catch (error) { failures++; console.error("FAIL", name, error); }
}
cleanup(); dom.window.close();
if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
console.log(`${tests.length - failures}/${tests.length} midpoint player tests passed`);
if (failures) process.exitCode = 1;
