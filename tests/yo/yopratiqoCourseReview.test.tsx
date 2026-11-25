import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import type { CourseCatalog, CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import type { TextCourseLanguage } from "@/lib/yo/foundations/experience";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/", pretendToBeVisual: true });
for (const [key, value] of Object.entries({ React, window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, CustomEvent: dom.window.CustomEvent,
  Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, localStorage: dom.window.localStorage,
  getComputedStyle: dom.window.getComputedStyle, requestAnimationFrame: (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = (media: string) => ({ media, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => true });
let audioStarts = 0;
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};
dom.window.HTMLMediaElement.prototype.play = () => { audioStarts++; return Promise.resolve(); };
globalThis.fetch = async () => new Response('{"available":false}', { status: 503 });
const { render, cleanup, fireEvent, act, waitFor } = require("@testing-library/react") as typeof import("@testing-library/react");
const { useItalianCourseProgress } = require("@/components/yo/italian/course/useItalianCourseProgress") as typeof import("@/components/yo/italian/course/useItalianCourseProgress");
const { CourseDueReview } = require("@/components/yo/review/CourseDueReview") as typeof import("@/components/yo/review/CourseDueReview");
const { EasternDueReview } = require("@/components/yo/review/EasternDueReview") as typeof import("@/components/yo/review/EasternDueReview");
const { readReviewState, recordReviewAttempt } = require("@/lib/yo/review/store") as typeof import("@/lib/yo/review/store");
const { courseReviewId, reviewLanguageForCourseKey } = require("@/lib/yo/review/courseRegistry") as typeof import("@/lib/yo/review/courseRegistry");
const { loadCourseReviewContent } = require("@/lib/yo/review/courseContent") as typeof import("@/lib/yo/review/courseContent");
const { loadEasternReviews } = require("@/lib/yo/review/easternContent") as typeof import("@/lib/yo/review/easternContent");
const { foundationContent } = require("@/lib/yo/foundations/catalog.server") as typeof import("@/lib/yo/foundations/catalog.server");
const { foundationSettings } = require("@/lib/yo/foundations/experience") as typeof import("@/lib/yo/foundations/experience");
const { personalizedItalianCatalog, personalizedItalianUnits } = require("@/lib/yo/personalized/courseData") as typeof import("@/lib/yo/personalized/courseData");
const { germanCatalog, germanCourseUnits } = require("@/lib/yo/german/courseData") as typeof import("@/lib/yo/german/courseData");
const { portugueseCatalog, portugueseCourseUnits } = require("@/lib/yo/portuguese/courseData") as typeof import("@/lib/yo/portuguese/courseData");
const { GUIDED_PROGRESS_KEY } = require("@/lib/yo/personalized/profile") as typeof import("@/lib/yo/personalized/profile");
const { GERMAN_PROGRESS_KEY } = require("@/lib/yo/german/courseLogic") as typeof import("@/lib/yo/german/courseLogic");
const { PORTUGUESE_PROGRESS_KEY } = require("@/lib/yo/portuguese/courseLogic") as typeof import("@/lib/yo/portuguese/courseLogic");
const { AUTO_NEXT_KEY } = require("@/components/yo/learning/PracticeAdvance") as typeof import("@/components/yo/learning/PracticeAdvance");

const courses: { language: TextCourseLanguage; key: string; catalog: CourseCatalog; units: CourseUnit[] }[] = [
  { language: "it", key: GUIDED_PROGRESS_KEY, catalog: personalizedItalianCatalog, units: personalizedItalianUnits },
  { language: "de", key: GERMAN_PROGRESS_KEY, catalog: germanCatalog, units: germanCourseUnits },
  { language: "pt-BR", key: PORTUGUESE_PROGRESS_KEY, catalog: portugueseCatalog, units: portugueseCourseUnits },
  ...(["en", "es", "fr-CA"] as const).map(language => ({ language, key: foundationSettings[language].progressKey, ...foundationContent(language) })),
];
function reset() { cleanup(); window.localStorage.clear(); window.localStorage.setItem(AUTO_NEXT_KEY, "off"); audioStarts = 0; }
function Probe({ catalog, storageKey, id }: { catalog: CourseCatalog; storageKey: string; id: string }) {
  const state = useItalianCourseProgress(catalog, storageKey);
  return <button type="button" disabled={!state.ready} onClick={() => state.recordActivity(id, false, false)}>Record an actual mistake</button>;
}
async function main() {
  for (const course of courses) {
    reset();
    const unit = course.units[0], lesson = unit.lessons[0];
    const original = lesson.activities.find(item => item.id === lesson.readingActivityId && item.kind === "choice") ?? lesson.activities.find(item => item.kind === "choice")!;
    assert.ok(original, `${course.language} has real written practice`);
    const id = courseReviewId(unit.id, lesson.id, original.id);
    const probe = render(<Probe catalog={course.catalog} storageKey={course.key} id={original.id}/>);
    fireEvent.click(probe.getByRole("button"));
    assert.ok(readReviewState(course.language).records[id], "the actual canonical course writer schedules its mistake");
    const progress = localStorage.getItem(course.key);
    cleanup();
    const item = await loadCourseReviewContent(course.language, id);
    assert.equal(item.activity.kind, "choice");
    if (item.activity.kind !== "choice") throw new Error("Written fixture required");
    if (original.id === lesson.readingActivityId) assert.equal(item.activity.stimulus, lesson.reading.it, "isolated reading retains the passage");
    const view = render(<CourseDueReview language={course.language} locale="en" catalog={course.catalog}/>);
    fireEvent.click(view.getByRole("button", { name: "Review up to 3 phrases" }));
    const activity = item.activity;
    const correct = activity.options.find(option => option.id === activity.correctId)!;
    const label = correct.it ?? correct.label!.en;
    await waitFor(() => assert.ok(view.getByRole("button", { name: label })));
    if (item.activity.stimulus) assert.equal(view.container.querySelector("[data-written-stimulus]")?.textContent, item.activity.stimulus);
    fireEvent.click(view.getByRole("button", { name: label }));
    fireEvent.click(view.getByRole("button", { name: "Check" }));
    fireEvent.click(view.getByRole("button", { name: "Continue" }));
    assert.equal(localStorage.getItem(course.key), progress, "review cannot write grades, resume, XP or unlocks");
    assert.equal(readReviewState(course.language).records[id].attempts, 2);
    assert.equal(audioStarts, 0, "written review starts no recording");
    console.log(`PASS ${course.language}: actual course mistake, contextual review, isolated outcomes`);
  }
  reset();
  assert.equal(reviewLanguageForCourseKey("demo"), null);
  const legacy = render(<Probe catalog={germanCatalog} storageKey="demo" id={germanCourseUnits[0].lessons[0].activities[0].id}/>);
  fireEvent.click(legacy.getByRole("button"));
  assert.equal(Object.keys(readReviewState("de").records).length, 0, "demo writes do not populate the learner queue");
  console.log("PASS legacy and demo progress remain outside the canonical review journal");
  for (const language of ["ja", "zh"] as const) {
    reset();
    const content = await loadEasternReviews(language);
    assert.ok(Object.keys(content).length >= 88);
    assert.equal(Object.keys(content).some(id => /final|bilan/.test(id)), false, "checkpoints are not recycled as graded course attempts");
    const entry = Object.entries(content).find(([, value]) => value.language === "ja" ? value.activity.kind === "choice" : value.exercise.kind === "choice")!;
    assert.ok(entry);
    const [id, item] = entry;
    recordReviewAttempt({ language, itemId: id, correct: false, assisted: false, at: Date.now() - 1000 });
    const legacyKey = language === "ja" ? "yopratiqo:japanese-foundations:v1" : "yopratiqo:mandarin-foundations:v1";
    localStorage.setItem(legacyKey, "unchanged-course-evidence");
    const view = render(<EasternDueReview language={language} locale="en"/>);
    await waitFor(() => assert.ok(view.getByRole("button", { name: "Review up to 3 phrases" })));
    fireEvent.click(view.getByRole("button", { name: "Review up to 3 phrases" }));
    let answer: string;
    if (item.language === "ja" && "choices" in item.activity) {
      const activity = item.activity;
      const correct = activity.choices.find(option => option.id === activity.answerId)!;
      answer = correct.ja ?? correct.label!.en;
    } else if (item.language === "zh" && "choices" in item.exercise) {
      const exercise = item.exercise;
      const correct = exercise.choices.find(option => option.id === exercise.answer)!;
      answer = correct.phrase?.hanzi ?? correct.label!.en;
    } else throw new Error("Written choice required");
    fireEvent.click(view.getByRole("button", { name: answer }));
    fireEvent.click(view.getByRole("button", { name: "Check" }));
    fireEvent.click(view.getByRole("button", { name: "Continue" }));
    assert.equal(localStorage.getItem(legacyKey), "unchanged-course-evidence");
    assert.equal(readReviewState(language).records[id].attempts, 2);
    console.log(`PASS ${language}: authored script-aware exercise, checked answer, untouched legacy evidence`);
  }
  reset(); await act(async () => { await Promise.resolve(); });
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
