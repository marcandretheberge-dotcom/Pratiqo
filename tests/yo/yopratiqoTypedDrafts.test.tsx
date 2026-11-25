import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { CourseExperience } from "@/components/yo/german/CourseExperience";
import { GermanCourseUnit } from "@/components/yo/german/GermanCourseUnit";
import { GermanAssessment } from "@/components/yo/german/GermanAssessment";
import { ItalianGame } from "@/components/yo/italian/ItalianGames";
import { ItalianAudioProvider } from "@/components/yo/italian/ItalianAudioProvider";
import { germanCourseUnits, germanCatalog } from "@/lib/yo/german/courseData";
import { GERMAN_PROGRESS_KEY } from "@/lib/yo/german/courseLogic";
import { portugueseCourseUnits, portugueseCatalog } from "@/lib/yo/portuguese/courseData";
import { PORTUGUESE_PROGRESS_KEY } from "@/lib/yo/portuguese/courseLogic";
import { englishCourseUnits, englishCatalog } from "@/lib/yo/english/courseData";
import { spanishCourseUnits, spanishCatalog } from "@/lib/yo/spanish/courseData";
import { frenchQuebecCourseUnits, frenchQuebecCatalog } from "@/lib/yo/frenchQuebec/courseData";
import { foundationSettings } from "@/lib/yo/foundations/experience";
import { parseUnitSession, UNIT_SESSION_MAX_LENGTH } from "@/lib/yo/foundations/unitSession";
import { assessmentDraftContext, assessmentDraftToken, createAssessmentDraftStore, parseAssessmentDraft } from "@/lib/yo/foundations/assessmentDraft";
import { exerciseDraftRevision } from "@/lib/yo/foundations/typedDraft";
import { resetCourseProgress, serializeCourseProgress, type CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { writeMissionCinema } from "@/lib/yo/travelCinema";
import { REVIEW_STORAGE_PREFIX } from "@/lib/yo/review/state";
import type { CourseUnit, CourseAssessment } from "@/lib/yo/italian/course/courseTypes";
import type { ItalianTypeActivity } from "@/lib/yo/italian/italianModuleTypes";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/anglais/parcours/u01", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key, value] of Object.entries({ React, window: dom.window, self: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent,
  MutationObserver: dom.window.MutationObserver, localStorage: dom.window.localStorage, getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; },
  cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
dom.window.HTMLElement.prototype.scrollIntoView = () => {}; dom.window.HTMLElement.prototype.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
dom.window.HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute("open"); };
dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
window.matchMedia = (media: string) => ({ media, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => true });
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const courses = {
  de: { units: germanCourseUnits, catalog: germanCatalog, key: GERMAN_PROGRESS_KEY },
  "pt-BR": { units: portugueseCourseUnits, catalog: portugueseCatalog, key: PORTUGUESE_PROGRESS_KEY },
  en: { units: englishCourseUnits, catalog: englishCatalog, key: foundationSettings.en.progressKey },
  es: { units: spanishCourseUnits, catalog: spanishCatalog, key: foundationSettings.es.progressKey },
  "fr-CA": { units: frenchQuebecCourseUnits, catalog: frenchQuebecCatalog, key: foundationSettings["fr-CA"].progressKey },
};
type Language = keyof typeof courses;
type Completion = Parameters<React.ComponentProps<typeof GermanAssessment>["onComplete"]>;
const cases: Array<[string, () => Promise<void> | void]> = [];
async function flush() { await act(async () => { for (let i = 0; i < 15 && frames.size; i++) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0)); } await Promise.resolve(); }); }
const input = (view: View) => view.getByRole("textbox") as HTMLInputElement;
const type = (view: View, value: string) => fireEvent.change(input(view), { target: { value } });
const receipts = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(key => key.startsWith(REVIEW_STORAGE_PREFIX)).map(key => localStorage.getItem(key));
function saved(language: Language): CourseProgress { return JSON.parse(localStorage.getItem(courses[language].key) ?? "{}"); }
function recall(unit: CourseUnit, lessonIndex = 0) {
  const lesson = unit.lessons[lessonIndex], activity = lesson.activities.find((item): item is ItalianTypeActivity => item.kind === "type" && !item.listeningText);
  assert.ok(activity); return { lesson, activity };
}
function seen(language: Language, resetAt = 0) { writeMissionCinema(`${courses[language].key}:${resetAt}`, { seen: courses[language].units[0].lessons.map(lesson => `mission-start:${lesson.id}:start`), queue: [] }); }
function tree(language: Language, locale: YoLocale = "en", unit = courses[language].units[0], lessonIndex = 0) {
  const item = recall(unit, lessonIndex);
  return <CourseExperience language={language}><GermanCourseUnit unit={unit} catalog={courses[language].catalog} audioPaths={{}} locale={locale} initialLessonId={item.lesson.id} initialActivityId={item.activity.id}/></CourseExperience>;
}
const unitKey = (language: Language) => `yo.course-session.v1.${courses[language].key}.u01`;
function unitSession(language: Language, unit = courses[language].units[0], resetAt = 0) {
  const result = parseUnitSession(localStorage.getItem(unitKey(language)), unit, resetAt, courses[language].key);
  assert.ok(result); return result;
}
function checkpoint(language: Language): CourseAssessment {
  const original = courses[language].units[0].quiz;
  const question = original.questions.find(item => item.kind === "type"); assert.ok(question);
  return { ...original, questions: [question] };
}
function assessmentTree(language: Language, assessment: CourseAssessment, events: Completion[], locale: YoLocale = "en", resetAt = 0) {
  return <CourseExperience language={language}><ItalianAudioProvider language={language} paths={{}}><GermanAssessment assessment={assessment} locale={locale} resetAt={resetAt} onComplete={(...result) => events.push(result)}/></ItalianAudioProvider></CourseExperience>;
}

for (const language of Object.keys(courses) as Language[]) cases.push([`${language}: real unit restores an unfinished bounded answer across reload and interface locale, without checking it`, async () => {
  seen(language);
  let view = render(tree(language)); await flush();
  const text = recall(courses[language].units[0]).activity.model.slice(0, 8) + " é… ";
  type(view, text);
  assert.equal(input(view).maxLength, 160);
  assert.equal(unitSession(language).typedResponses![recall(courses[language].units[0]).activity.id].text, text);
  const before = { activities: saved(language).activities, assessments: saved(language).assessments, productions: saved(language).productions, receipts: receipts() };
  view.unmount(); view = render(tree(language, "es")); await flush();
  assert.equal(input(view).value, text);
  assert.deepEqual({ activities: saved(language).activities, assessments: saved(language).assessments, productions: saved(language).productions, receipts: receipts() }, before);
  type(view, "x".repeat(180)); assert.equal(input(view).value.length, 160);
  type(view, ""); view.unmount(); view = render(tree(language)); await flush();
  assert.equal(input(view).value, "", "explicit deletion does not resurrect the previous text");
}]);

cases.push(["unit question navigation preserves each draft and assistance; explicit replay clears only the selected exercise", async () => {
  seen("en"); const unit = courses.en.units[0], first = recall(unit), second = recall(unit, 1);
  const view = render(tree("en")); await flush();
  fireEvent.click(view.getByRole("button", { name: "Show a model" })); type(view, "wrong partial reply");
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.equal(saved("en").activities[first.activity.id].attempts, 1);
  const previousEvents = receipts();
  view.rerender(tree("en", "en", unit, 1)); await flush();
  assert.equal(input(view).value, ""); type(view, "another unfinished reply");
  view.rerender(tree("en", "fr", unit)); await flush();
  assert.equal(input(view).value, "wrong partial reply");
  assert.equal(unitSession("en").typedResponses![first.activity.id].assisted, true);
  assert.deepEqual(receipts(), previousEvents);
  fireEvent.click(view.getByRole("button", { name: "Rejouer" }));
  assert.equal(input(view).value, "");
  assert.equal(unitSession("en").typedResponses![first.activity.id].assisted, false);
  view.rerender(tree("en", "en", unit, 1)); await flush();
  assert.equal(input(view).value, "another unfinished reply");
  assert.equal(unitSession("en").typedResponses![second.activity.id].text, "another unfinished reply");
  assert.equal(saved("en").activities[first.activity.id].attempts, 1);
}]);

cases.push(["real EN → ES → EN provider switching isolates unfinished text despite the shared u01/reset0", async () => {
  seen("en"); seen("es"); const view = render(tree("en")); await flush();
  type(view, "English unfinished"); const english = localStorage.getItem(unitKey("en"));
  view.rerender(tree("es")); await flush(); assert.equal(input(view).value, "");
  type(view, "Español pendiente"); assert.equal(localStorage.getItem(unitKey("en")), english);
  view.rerender(tree("en")); await flush(); assert.equal(input(view).value, "English unfinished");
  assert.deepEqual(saved("en").activities, {}); assert.deepEqual(saved("es").activities, {}); assert.equal(receipts().length, 0);
}]);

cases.push(["checked unit results restore without submissions and reset/revision invalidate only the matching local draft", async () => {
  seen("en"); const unit = courses.en.units[0], { activity } = recall(unit);
  let view = render(tree("en")); await flush(); type(view, activity.model); fireEvent.click(view.getByRole("button", { name: "Check" }));
  const before = saved("en").activities, events = receipts();
  view.unmount(); view = render(tree("en")); await flush();
  assert.ok(view.getByText("Your checked result is saved. Continue or deliberately replay this exercise."));
  assert.equal(view.queryByRole("textbox"), null); assert.deepEqual(saved("en").activities, before); assert.deepEqual(receipts(), events);
  const revised = structuredClone(unit), revisedActivity = recall(revised).activity;
  revisedActivity.model += " please"; revisedActivity.accepted = [revisedActivity.model];
  view.rerender(tree("en", "en", revised)); await flush();
  assert.equal(input(view).value, ""); assert.deepEqual(saved("en").activities, before, "an authored revision does not migrate or resubmit existing grades");
  type(view, "new revision draft"); view.unmount();
  const reset = resetCourseProgress(saved("en")); localStorage.setItem(courses.en.key, serializeCourseProgress(reset)); seen("en", reset.resetAt);
  view = render(tree("en", "en", revised)); await flush();
  assert.equal(input(view).value, ""); assert.deepEqual(saved("en").activities, {});
  assert.equal(unitSession("en", revised, reset.resetAt).resetAt, reset.resetAt);
  assert.deepEqual(receipts(), events, "draft reset creates no spaced-review event");
}]);

cases.push(["the opted-in type renderer preserves IME composition without grading an Enter candidate", async () => {
  seen("en"); const view = render(tree("en")); await flush(); const activity = recall(courses.en.units[0]).activity;
  fireEvent.compositionStart(input(view)); type(view, activity.model);
  assert.equal(fireEvent.keyDown(input(view), { key: "Enter", keyCode: 229, isComposing: true }), false);
  fireEvent.submit(input(view).closest("form")!);
  assert.deepEqual(saved("en").activities, {}); assert.equal(receipts().length, 0);
  fireEvent.compositionEnd(input(view));
  assert.equal(fireEvent.keyDown(input(view), { key: "Enter", keyCode: 229, isComposing: false }), false);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.equal(saved("en").activities[activity.id].attempts, 1);
}]);

cases.push(["two mounted unit views merge distinct activity drafts without moving either view or grading", async () => {
  seen("en"); const unit = courses.en.units[0], first = recall(unit), second = recall(unit, 1);
  const a = render(tree("en")), b = render(tree("en", "en", unit, 1)); await flush();
  const aInput = () => within(a.container).getByRole("textbox") as HTMLInputElement;
  const bInput = () => within(b.container).getByRole("textbox") as HTMLInputElement;
  fireEvent.change(aInput(), { target: { value: "first tab reply" } });
  fireEvent.change(bInput(), { target: { value: "second tab reply" } });
  assert.equal(unitSession("en").typedResponses![first.activity.id].text, "first tab reply");
  assert.equal(unitSession("en").typedResponses![second.activity.id].text, "second tab reply");
  // Emulate the later half of two interleaved read/write operations: tab B read before A's edit.
  const concurrent = JSON.parse(localStorage.getItem(unitKey("en"))!);
  delete concurrent.typedResponses[first.activity.id]; localStorage.setItem(unitKey("en"), JSON.stringify(concurrent));
  fireEvent(window, new dom.window.StorageEvent("storage", { key: unitKey("en"), storageArea: localStorage }));
  assert.equal(aInput().value, "first tab reply"); assert.equal(bInput().value, "second tab reply");
  assert.equal(unitSession("en").typedResponses![first.activity.id].text, "first tab reply", "the storage reconciliation repairs an interleaved write without losing the other activity");
  assert.deepEqual(saved("en").activities, {}); assert.equal(receipts().length, 0);
  a.unmount(); b.unmount(); const resumed = render(tree("en")); await flush(); assert.equal(input(resumed).value, "first tab reply");
}]);

cases.push(["same-activity views keep the latest explicit text edit, including deletion, across passive saves", async () => {
  seen("en"); const a = render(tree("en")), b = render(tree("en")); await flush();
  const aInput = () => within(a.container).getByRole("textbox") as HTMLInputElement;
  const bInput = () => within(b.container).getByRole("textbox") as HTMLInputElement;
  fireEvent.change(aInput(), { target: { value: "older text" } });
  fireEvent.change(bInput(), { target: { value: "latest text" } });
  a.rerender(tree("en", "fr")); await flush();
  fireEvent.focus(window); assert.equal(aInput().value, "latest text");
  fireEvent.change(bInput(), { target: { value: "" } });
  fireEvent(window, new dom.window.StorageEvent("storage", { key: unitKey("en"), newValue: null, storageArea: localStorage }));
  assert.equal(aInput().value, ""); assert.equal(bInput().value, "");
  assert.equal(unitSession("en").typedResponses![recall(courses.en.units[0]).activity.id].text, "");
  assert.deepEqual(saved("en").activities, {}); assert.equal(receipts().length, 0);
}]);

cases.push(["remote help and a checked result are revalidated before submission without waiting for a storage event", async () => {
  seen("en"); const activity = recall(courses.en.units[0]).activity;
  const a = render(tree("en")), b = render(tree("en")); await flush();
  fireEvent.change(within(a.container).getByRole("textbox"), { target: { value: activity.model } });
  fireEvent.click(within(b.container).getByRole("button", { name: "Show a model" }));
  fireEvent.click(within(a.container).getByRole("button", { name: "Check" }));
  assert.equal(saved("en").activities[activity.id].independent, false);
  assert.equal(saved("en").activities[activity.id].attempts, 1);
  const events = receipts();
  fireEvent.click(within(b.container).getByRole("button", { name: "Check" }));
  assert.equal(saved("en").activities[activity.id].attempts, 1, "a second stale view cannot submit the same checked draft again");
  assert.equal(unitSession("en").typedResponses![activity.id].resultAssisted, true); assert.deepEqual(receipts(), events);
}]);

cases.push(["two unit views reject a stale typed check in both directions until the latest displayed text is checked", async () => {
  for (const remoteCorrect of [false, true]) {
    cleanup(); localStorage.clear(); frames.clear(); seen("en");
    const activity = recall(courses.en.units[0]).activity;
    const localText = remoteCorrect ? "incorrect local reply" : activity.model;
    const remoteText = remoteCorrect ? activity.model : "incorrect remote reply";
    const a = render(tree("en")), b = render(tree("en")); await flush();
    fireEvent.change(within(a.container).getByRole("textbox"), { target: { value: localText } });
    fireEvent.change(within(b.container).getByRole("textbox"), { target: { value: remoteText } });
    assert.equal((within(a.container).getByRole("textbox") as HTMLInputElement).value, localText);
    fireEvent.click(within(a.container).getByRole("button", { name: "Check" }));
    assert.deepEqual(saved("en").activities, {}); assert.equal(receipts().length, 0);
    assert.equal((within(a.container).getByRole("textbox") as HTMLInputElement).value, remoteText);
    assert.ok(within(a.container).getByText(/draft changed in another view/));
    fireEvent.click(within(a.container).getByRole("button", { name: "Check" }));
    assert.equal(saved("en").activities[activity.id].attempts, 1);
    assert.equal(saved("en").activities[activity.id].completed, remoteCorrect);
    assert.equal(unitSession("en").typedResponses![activity.id].text, remoteText);
  }
}]);

cases.push(["an explicit replay creates a new draft generation that stale text/help cannot resurrect", async () => {
  seen("en"); const activity = recall(courses.en.units[0]).activity;
  const a = render(tree("en")), b = render(tree("en")); await flush();
  fireEvent.change(within(a.container).getByRole("textbox"), { target: { value: activity.model } });
  fireEvent.click(within(a.container).getByRole("button", { name: "Show a model" }));
  fireEvent.click(within(b.container).getByRole("button", { name: "Try again" }));
  const restarted = unitSession("en").typedResponses![activity.id];
  assert.ok(restarted.generation > 0); assert.equal(restarted.assisted, false); assert.equal(restarted.text, "");
  fireEvent.click(within(a.container).getByRole("button", { name: "Check" }));
  assert.deepEqual(saved("en").activities, {}); assert.equal(receipts().length, 0);
  assert.equal((within(a.container).getByRole("textbox") as HTMLInputElement).value, "");
  assert.equal(unitSession("en").typedResponses![activity.id].assisted, false);
  fireEvent.change(within(a.container).getByRole("textbox"), { target: { value: "new intentional reply" } });
  assert.equal(unitSession("en").typedResponses![activity.id].text, "new intentional reply");
}]);

cases.push(["a stale pre-reset unit write is rejected before its storage event arrives", async () => {
  seen("en"); const view = render(tree("en")); await flush(); type(view, "before reset");
  const before = localStorage.getItem(unitKey("en")), reset = resetCourseProgress(saved("en"));
  localStorage.setItem(courses.en.key, serializeCourseProgress(reset));
  type(view, "stale input after reset");
  assert.equal(localStorage.getItem(unitKey("en")), before, "the old mounted view cannot publish into the new course epoch");
  assert.deepEqual(saved("en").activities, {}); assert.equal(receipts().length, 0); view.unmount();
  seen("en", reset.resetAt); const resumed = render(tree("en")); await flush();
  assert.equal(input(resumed).value, ""); assert.equal(unitSession("en", courses.en.units[0], reset.resetAt).resetAt, reset.resetAt);
}]);

cases.push(["a still-open old content revision cannot overwrite the new revision's typed draft", async () => {
  seen("en"); const unit = courses.en.units[0], revised = structuredClone(unit);
  recall(revised).activity.model += " please";
  const a = render(tree("en")); await flush(); type(a, "old model draft");
  const b = render(tree("en", "en", revised)); await flush();
  const newInput = within(b.container).getByRole("textbox") as HTMLInputElement;
  assert.equal(newInput.value, ""); fireEvent.change(newInput, { target: { value: "new model draft" } });
  const raw = localStorage.getItem(unitKey("en"));
  a.rerender(tree("en", "en", unit, 1)); await flush();
  fireEvent.change(within(a.container).getByRole("textbox"), { target: { value: "obsolete write" } });
  assert.equal(localStorage.getItem(unitKey("en")), raw);
  assert.equal(unitSession("en", revised).typedResponses![recall(revised).activity.id].text, "new model draft");
  assert.deepEqual(saved("en").activities, {}); assert.equal(receipts().length, 0);
}]);

for (const language of Object.keys(courses) as Language[]) cases.push([`${language}: real assessment keeps partial text and help across reload without playing audio or submitting`, async () => {
  const value = checkpoint(language), events: Completion[] = [], context = assessmentDraftContext(courses[language].key, value);
  let view = render(assessmentTree(language, value, events));
  fireEvent.click(view.getByRole("button", { name: "Start" }));
  fireEvent.click(view.getByRole("button", { name: value.questions[0].kind === "type" && value.questions[0].listeningText ? "Read the transcript (with help)" : "Show a model" }));
  type(view, `unfinished ${language} é`); assert.equal(parseAssessmentDraft(localStorage.getItem(context.key), context).currentHelp, true);
  view.unmount(); view = render(assessmentTree(language, value, events, "fr"));
  assert.equal(input(view).value, `unfinished ${language} é`);
  assert.deepEqual(events, []); assert.equal(receipts().length, 0);
  const draft = parseAssessmentDraft(localStorage.getItem(context.key), context);
  assert.deepEqual(draft.results, []); assert.equal(draft.currentHelp, true);
  assert.equal(JSON.stringify(draft).includes("listeningText"), false); assert.equal(JSON.stringify(draft).includes("transcript"), false);
}]);

cases.push(["two assessment views bind a typed check to the rendered answer before accepting the first score", () => {
  for (const remoteCorrect of [false, true]) {
    cleanup(); localStorage.clear(); frames.clear();
    const value = checkpoint("en"), question = value.questions[0], events: Completion[] = [];
    assert.equal(question.kind, "type"); if (question.kind !== "type") throw new Error("Expected typed checkpoint");
    const context = assessmentDraftContext(courses.en.key, value);
    const localText = remoteCorrect ? "incorrect local reply" : question.model;
    const remoteText = remoteCorrect ? question.model : "incorrect remote reply";
    const a = render(assessmentTree("en", value, events)), b = render(assessmentTree("en", value, events));
    fireEvent.click(within(a.container).getByRole("button", { name: "Start" }));
    fireEvent.click(within(b.container).getByRole("button", { name: "Start" }));
    fireEvent.change(within(a.container).getByRole("textbox"), { target: { value: localText } });
    fireEvent.change(within(b.container).getByRole("textbox"), { target: { value: remoteText } });
    assert.equal((within(a.container).getByRole("textbox") as HTMLInputElement).value, localText);
    fireEvent.click(within(a.container).getByRole("button", { name: "Check" }));
    assert.deepEqual(parseAssessmentDraft(localStorage.getItem(context.key), context).results, []);
    assert.deepEqual(events, []); assert.equal(receipts().length, 0);
    assert.equal((within(a.container).getByRole("textbox") as HTMLInputElement).value, remoteText);
    assert.ok(within(a.container).getByText(/draft changed in another view/));
    fireEvent.click(within(a.container).getByRole("button", { name: "Check" }));
    assert.deepEqual(parseAssessmentDraft(localStorage.getItem(context.key), context).results, [{ correct: remoteCorrect, assisted: false }]);
    fireEvent.click(within(a.container).getByRole("button", { name: "Continue" }));
    assert.deepEqual(events, [[value.id, remoteCorrect ? 1 : 0, 1, false]]);
  }
}]);

cases.push(["assessment question advance, completion and explicit restart clear text without losing first checked results", async () => {
  const source = courses.en.units[0].quiz, questions = source.questions.filter(item => item.kind === "type").slice(0, 2);
  assert.equal(questions.length, 2);
  const value = { ...source, questions }, events: Completion[] = [], context = assessmentDraftContext(courses.en.key, value);
  let view = render(assessmentTree("en", value, events)); fireEvent.click(view.getByRole("button", { name: "Start" }));
  fireEvent.click(view.getByRole("button", { name: "Show a model" })); type(view, "wrong saved answer"); fireEvent.click(view.getByRole("button", { name: "Check" }));
  view.unmount(); view = render(assessmentTree("en", value, events));
  assert.equal(input(view).value, "wrong saved answer"); assert.ok(view.getByText("First checked answer kept: review needed."));
  type(view, questions[0].model); fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.equal(parseAssessmentDraft(localStorage.getItem(context.key), context).results[0].correct, false);
  fireEvent.click(view.getByRole("button", { name: "Continue" })); assert.equal(input(view).value, "");
  type(view, questions[1].model); fireEvent.click(view.getByRole("button", { name: "Check" }));
  view.unmount(); view = render(assessmentTree("en", value, events));
  assert.equal(input(view).value, questions[1].model); assert.equal(input(view).disabled, true); assert.deepEqual(events, []);
  fireEvent.click(view.getByRole("button", { name: "Continue" }));
  assert.deepEqual(events, [[value.id, 1, 2, true]]);
  assert.equal(parseAssessmentDraft(localStorage.getItem(context.key), context).typedText, undefined);
  view.unmount(); view = render(assessmentTree("en", value, events)); assert.equal(events.length, 1);
  fireEvent.click(view.getByRole("button", { name: "Try again" })); assert.equal(input(view).value, "");
  assert.equal(parseAssessmentDraft(localStorage.getItem(context.key), context).currentHelp, false);
}]);

cases.push(["unit parser keeps legacy cursor compatibility and rejects foreign, oversized or changed-response payloads", () => {
  const unit = courses.en.units[0], { lesson, activity } = recall(unit);
  const legacy = { version: 1 as const, unitId: unit.id, resetAt: 0, lessonId: lesson.id, activityId: activity.id, view: "practice" as const, study: 0, assisted: true, solved: false, wrong: false, resultAssisted: false };
  assert.deepEqual(parseUnitSession(JSON.stringify(legacy), unit, 0), legacy);
  const valid = { ...legacy, courseKey: courses.en.key, activityRevision: exerciseDraftRevision(activity), typedResponses: { [activity.id]: { revision: exerciseDraftRevision(activity), text: "valid", assisted: true, solved: false, wrong: false, resultAssisted: false }, foreign: { text: "secret" } }, transcript: "not copied" };
  assert.equal(parseUnitSession(JSON.stringify(valid), unit, 0, courses.es.key), null);
  assert.equal(parseUnitSession(JSON.stringify(valid), unit, 10, courses.en.key), null);
  const parsed = parseUnitSession(JSON.stringify(valid), unit, 0, courses.en.key)!;
  assert.deepEqual(Object.keys(parsed.typedResponses!), [activity.id]); assert.equal(JSON.stringify(parsed).includes("not copied"), false);
  valid.typedResponses[activity.id].text = "x".repeat(161);
  assert.deepEqual(parseUnitSession(JSON.stringify(valid), unit, 0, courses.en.key)!.typedResponses, {});
  assert.equal(parseUnitSession(" ".repeat(UNIT_SESSION_MAX_LENGTH + 1), unit, 0, courses.en.key), null);
}]);

cases.push(["assessment text is bounded, revision/reset scoped and cannot be written by stale question or pre-restart callbacks", () => {
  const value = checkpoint("en"), context = assessmentDraftContext(courses.en.key, value), map = new Map<string, string>();
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, raw: string) => { map.set(key, raw); } };
  const store = createAssessmentDraftStore(context, () => storage); store.start(); const token = assessmentDraftToken(store.getSnapshot().draft);
  store.text(token, "unfinished"); store.help(token); store.text(token, "x".repeat(161));
  assert.equal(store.getSnapshot().draft.typedText?.value, "unfinished");
  const raw = map.get(context.key)!;
  assert.equal(parseAssessmentDraft(raw, assessmentDraftContext(courses.es.key, value)).typedText, undefined);
  assert.equal(parseAssessmentDraft(raw, assessmentDraftContext(courses.en.key, value, Date.now())).typedText, undefined);
  const changed = structuredClone(value); changed.questions[0].prompt.en += " changed";
  assert.equal(parseAssessmentDraft(raw, assessmentDraftContext(courses.en.key, changed)).typedText, undefined);
  store.restart(); store.text(token, "stale"); assert.equal(store.getSnapshot().draft.typedText, undefined); assert.equal(store.getSnapshot().draft.currentHelp, false);
}]);

cases.push(["two assessment stores preserve the latest typed edit and sticky help without duplicating a checked completion", () => {
  const value = checkpoint("en"), context = assessmentDraftContext(courses.en.key, value), map = new Map<string, string>();
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, raw: string) => { map.set(key, raw); } };
  const a = createAssessmentDraftStore(context, () => storage); a.start();
  const b = createAssessmentDraftStore(context, () => storage), token = assessmentDraftToken(b.getSnapshot().draft);
  a.text(token, "first draft"); b.text(token, "latest draft"); a.help(token);
  assert.equal(a.getSnapshot().draft.typedText?.value, "latest draft");
  a.text(token, ""); b.help(token); assert.equal(b.getSnapshot().draft.typedText?.value, "");
  const question = value.questions[0]; if (question.kind !== "type") throw new Error("Expected typed checkpoint");
  b.text(token, question.model); b.attempt(token, true, question.model); a.attempt(token, false, "old answer");
  assert.deepEqual(a.getSnapshot().draft.results, [{ correct: true, assisted: true }]);
  assert.deepEqual(a.next(token), { correct: 1, total: 1, assisted: true });
  assert.equal(b.next(token), null); assert.equal(b.getSnapshot().draft.typedText, undefined);
}]);

cases.push(["stale assessment stores cannot republish typed inputs after a course reset or a newly opened content revision", () => {
  const value = checkpoint("en"), context = assessmentDraftContext(courses.en.key, value), map = new Map<string, string>();
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, raw: string) => { map.set(key, raw); } };
  const a = createAssessmentDraftStore(context, () => storage); a.start(); const token = assessmentDraftToken(a.getSnapshot().draft);
  a.text(token, "old text"); const oldRaw = map.get(context.key);
  const resetAt = Date.now(); map.set(courses.en.key, JSON.stringify({ resetAt }));
  a.text(token, "stale reset write"); a.attempt(token, true); a.restart();
  assert.equal(map.get(context.key), oldRaw); assert.deepEqual(a.getSnapshot().draft.results, []);
  const resetContext = assessmentDraftContext(courses.en.key, value, resetAt);
  const b = createAssessmentDraftStore(resetContext, () => storage); b.start();
  const resetToken = assessmentDraftToken(b.getSnapshot().draft); b.text(resetToken, "current reset text");
  const revised = structuredClone(value); revised.questions[0].prompt.en += " revised";
  const c = createAssessmentDraftStore(assessmentDraftContext(courses.en.key, revised, resetAt), () => storage); c.start();
  c.text(assessmentDraftToken(c.getSnapshot().draft), "current revision text");
  const newRaw = map.get(context.key); b.text(resetToken, "stale revision write"); b.restart(); a.restart();
  assert.equal(map.get(context.key), newRaw);
  assert.equal(c.getSnapshot().draft.typedText?.value, "current revision text"); assert.deepEqual(c.getSnapshot().draft.results, []);
}]);

cases.push(["storage failure keeps the current typed input usable with honest unit and assessment warnings", async () => {
  seen("en"); const original = dom.window.Storage.prototype.setItem;
  dom.window.Storage.prototype.setItem = function (key: string, value: string) { if (key.startsWith("yo.course-session.") || key.startsWith("yo.course-assessment.")) throw new Error("quota"); return original.call(this, key, value); };
  try {
    let view = render(tree("en")); await flush(); type(view, "keep this page open"); assert.equal(input(view).value, "keep this page open");
    assert.ok(view.getByText(/Storage is unavailable|storage.*unavailable|browser.*save/i)); view.unmount();
    const value = checkpoint("en"); view = render(assessmentTree("en", value, [])); fireEvent.click(view.getByRole("button", { name: "Start" }));
    type(view, "checkpoint still open"); assert.equal(input(view).value, "checkpoint still open");
    assert.ok(view.getByText(/browser cannot save its resume state/));
  } finally { dom.window.Storage.prototype.setItem = original; }
}]);

cases.push(["ItalianGame stays transient without the new optional contract", () => {
  const activity = recall(courses.en.units[0]).activity, attempts: boolean[] = [];
  const tree = () => <ItalianAudioProvider paths={{}}><ItalianGame activity={activity} locale="en" onAttempt={value => attempts.push(value)} onHelp={() => {}}/></ItalianAudioProvider>;
  let view = render(tree()); type(view, "not opted in"); view.unmount(); view = render(tree());
  assert.equal(input(view).value, ""); assert.equal(localStorage.length, 0); assert.deepEqual(attempts, []);
}]);

async function main() {
  for (const [name, run] of cases) { cleanup(); frames.clear(); localStorage.clear(); await run(); await flush(); console.log(`PASS ${name}`); }
  cleanup(); dom.window.close();
}
void main().catch(error => { cleanup(); dom.window.close(); console.error(error); process.exitCode = 1; });
