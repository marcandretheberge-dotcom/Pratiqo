import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { CourseExperience } from "@/components/yo/german/CourseExperience";
import { GermanCourseUnit } from "@/components/yo/german/GermanCourseUnit";
import { MandarinCoursePlayer, mandarinStages } from "@/components/yo/mandarin/MandarinCoursePlayer";
import { englishCourseUnits, englishCatalog } from "@/lib/yo/english/courseData";
import { spanishCourseUnits, spanishCatalog } from "@/lib/yo/spanish/courseData";
import { foundationSettings } from "@/lib/yo/foundations/experience";
import { parseUnitSession } from "@/lib/yo/foundations/unitSession";
import { mandarinJourneyUnits, mandarinFinalIds } from "@/lib/yo/foundationJourneyCatalogs";
import { mandarinUnits } from "@/lib/yo/mandarin/course";
import { emptyProgress, MANDARIN_PROGRESS_KEY } from "@/lib/yo/mandarin/progress";
import { readReviewState } from "@/lib/yo/review/store";
import { REVIEW_STORAGE_PREFIX, type ReviewAttempt } from "@/lib/yo/review/state";
import { writeMissionCinema } from "@/lib/yo/travelCinema";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import type { ItalianTypeActivity } from "@/lib/yo/italian/italianModuleTypes";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/anglais/parcours/u01", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
for (const [key, value] of Object.entries({
  React, window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Element: dom.window.Element,
  Node: dom.window.Node, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent,
  MutationObserver: dom.window.MutationObserver, localStorage: dom.window.localStorage,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++nextFrame, fn); return nextFrame; },
  cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLElement.prototype.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
dom.window.HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute("open"); };
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};
window.matchMedia = (media: string) => ({ media, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => true });
const { render, cleanup, fireEvent, act, waitFor, within } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const courses = {
  en: { units: englishCourseUnits, catalog: englishCatalog },
  es: { units: spanishCourseUnits, catalog: spanishCatalog },
};
type Language = keyof typeof courses;
function writtenRecall(language: Language) {
  const lesson = courses[language].units[0].lessons[0];
  const activity = lesson.activities.find((item): item is ItalianTypeActivity => item.kind === "type" && !item.listeningText);
  assert.ok(activity, `${language} has a real written recall activity`);
  return { lesson, activity };
}
function courseTree(language: Language) {
  const { lesson, activity } = writtenRecall(language), { units, catalog } = courses[language];
  return <CourseExperience language={language}><GermanCourseUnit unit={units[0]} catalog={catalog} locale="en" audioPaths={{}}
    initialLessonId={lesson.id} initialActivityId={activity.id}/></CourseExperience>;
}
function session(language: Language) {
  const key = `yo.course-session.v1.${foundationSettings[language].progressKey}.u01`;
  const value = parseUnitSession(localStorage.getItem(key), courses[language].units[0], 0);
  assert.ok(value, `${language} has its own resumable session`);
  return value;
}
function progress(language: Language): CourseProgress {
  return JSON.parse(localStorage.getItem(foundationSettings[language].progressKey) ?? "{}");
}
function click(node: HTMLElement) {
  fireEvent.click(node);
  const pending = [...frames.values()]; frames.clear();
  act(() => pending.forEach(fn => fn(0)));
}
function answerRecall(view: View, language: Language) {
  fireEvent.change(view.getByRole("textbox"), { target: { value: writtenRecall(language).activity.model } });
  click(view.getByRole("button", { name: "Check" }));
}
function seenMission(namespace: string, id: string) {
  // Cosmetic film history is separate; these cases exercise the real course controls.
  writeMissionCinema(namespace, { seen: [`mission-start:${id}:start`], queue: [] });
}

async function languageSwitch() {
  for (const language of ["en", "es"] as const) seenMission(`${foundationSettings[language].progressKey}:0`, writtenRecall(language).lesson.id);
  const view = render(courseTree("en"));
  await waitFor(() => assert.ok(view.getByRole("textbox", { name: "Your answer in English" })));
  click(view.getByRole("button", { name: "Show a model" }));
  answerRecall(view, "en");
  const enActivityId = writtenRecall("en").activity.id;
  assert.equal(progress("en").activities[enActivityId].completed, true);
  assert.equal(progress("en").activities[enActivityId].independent, false);
  assert.equal(session("en").solved, true);
  assert.equal(session("en").assisted, true);
  const englishBefore = localStorage.getItem(foundationSettings.en.progressKey);
  const englishSessionBefore = JSON.stringify(session("en"));

  // Both routes have unit u01 and resetAt 0. Only the learning language changes.
  view.rerender(courseTree("es"));
  await waitFor(() => assert.ok(view.getByRole("textbox", { name: "Your answer in Spanish" })));
  const spanishSession = session("es");
  assert.equal(spanishSession.resetAt, 0);
  assert.equal(spanishSession.assisted, false);
  assert.equal(spanishSession.solved, false);
  assert.equal(spanishSession.wrong, false);
  assert.equal(spanishSession.resultAssisted, false);
  assert.equal(spanishSession.activityId, writtenRecall("es").activity.id);
  assert.equal((view.getByRole("textbox") as HTMLInputElement).value, "");
  assert.deepEqual(progress("es").activities, {});
  assert.deepEqual(progress("es").assessments, {});
  assert.equal(localStorage.getItem(foundationSettings.en.progressKey), englishBefore);
  assert.equal(JSON.stringify(session("en")), englishSessionBefore);

  answerRecall(view, "es");
  const esActivityId = writtenRecall("es").activity.id;
  assert.equal(progress("es").activities[esActivityId].independent, true, "English assistance cannot follow the learner into Spanish");
  assert.deepEqual(Object.keys(progress("es").activities), [esActivityId], "English evidence cannot enter the Spanish catalog");
  view.rerender(courseTree("en"));
  await waitFor(() => assert.ok(view.getByText("Your checked result is saved. Continue or deliberately replay this exercise.")));
  assert.equal(localStorage.getItem(foundationSettings.en.progressKey), englishBefore, "returning restores the checked result without a new attempt");
  assert.equal(JSON.stringify(session("en")), englishSessionBefore);
  console.log("PASS real EN → ES → EN provider changes preserve each course and isolate assistance, checked results and attempts");
}

async function visiblePinyin() {
  const unit = mandarinUnits[0];
  const exercise = unit.exercises.find(item => item.kind === "roleplay" && item.choices.some(choice => choice.phrase));
  assert.ok(exercise && exercise.kind === "roleplay", "use an actual Mandarin roleplay choice with visible pronunciation support");
  const correct = exercise.choices.find(choice => choice.id === exercise.answer);
  assert.ok(correct?.phrase);
  const state = emptyProgress();
  const historicalId = unit.exercises.find(item => item.id !== exercise.id)!.id;
  const historicalResult = { passed: true, independent: true, attempts: 2, review: false };
  state.results[historicalId] = historicalResult;
  assert.equal(state.pinyin, true, "keep the real default rather than enabling help in the test");
  state.steps[unit.id] = mandarinStages(unit).indexOf(exercise.id);
  localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify(state));
  seenMission("zh:foundations", unit.id);
  const view = render(<MandarinCoursePlayer unit={unit} locale="en" journeyUnits={mandarinJourneyUnits} finalIds={mandarinFinalIds}/>);
  const answer = await waitFor(() => view.getByRole("button", { name: `${correct.phrase!.hanzi} ${correct.phrase!.pinyin}` }));
  assert.equal(within(answer).getByText(correct.phrase.pinyin).getAttribute("lang"), "zh-Latn-pinyin");
  assert.equal((view.getByRole("checkbox", { name: "Pinyin" }) as HTMLInputElement).checked, true);
  click(answer);
  click(view.getByRole("button", { name: "Check" }));
  const itemId = `course:${unit.id}:practice:${exercise.id}`;
  const receipts: ReviewAttempt[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)!;
    if (key.startsWith(`${REVIEW_STORAGE_PREFIX}zh.`)) receipts.push(JSON.parse(localStorage.getItem(key)!));
  }
  assert.equal(receipts.length, 1, "one accepted answer appends one Mandarin receipt");
  assert.equal(receipts[0].language, "zh");
  assert.equal(receipts[0].itemId, itemId);
  assert.equal(receipts[0].correct, true);
  assert.equal(receipts[0].assisted, true, "visible pinyin is assistance even without touching its checkbox");
  assert.ok(readReviewState("zh").records[itemId], "the assisted answer enters the real review queue");
  assert.deepEqual(readReviewState("ja").records, {});
  const savedResults = JSON.parse(localStorage.getItem(MANDARIN_PROGRESS_KEY)!).results;
  assert.equal(savedResults[exercise.id].attempts, 1);
  assert.equal(savedResults[exercise.id].independent, false, "a newly checked answer with visible pinyin is assisted in both course and review");
  assert.deepEqual(savedResults[historicalId], historicalResult, "existing historical independent evidence is preserved exactly");
  console.log("PASS default-visible Mandarin pinyin records new outcomes as assisted while preserving historical grades");
}

async function main() {
  for (const run of [languageSwitch, visiblePinyin]) {
    cleanup(); frames.clear(); localStorage.clear();
    await run();
    await act(async () => { await Promise.resolve(); });
  }
  cleanup(); frames.clear();
  dom.window.close();
}
void main().catch(error => { cleanup(); dom.window.close(); console.error(error); process.exitCode = 1; });
