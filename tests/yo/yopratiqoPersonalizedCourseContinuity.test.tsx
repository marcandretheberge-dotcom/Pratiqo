import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { dismissMissionFilms, prepareCinemaMedia } from "../helpers/lessonCinema";
import { introCourses } from "@/lib/yo/shared/course";
import { emptyDraft, freshIntro, introKey } from "@/lib/yo/shared/state";
import { courseSteps } from "@/lib/yo/shared/steps";
import { introContinuation } from "@/lib/yo/shared/continuation";
import type { IntroState } from "@/lib/yo/shared/types";
import { interestPreferenceKey, type InterestLanguage } from "@/lib/yo/interests/preferences";
import { interestCorpus } from "@/lib/yo/interests/content";
import { germanCatalog } from "@/lib/yo/german/courseData";
import { GERMAN_PROGRESS_KEY } from "@/lib/yo/german/courseLogic";
import { portugueseCatalog } from "@/lib/yo/portuguese/courseData";
import { PORTUGUESE_PROGRESS_KEY } from "@/lib/yo/portuguese/courseLogic";
import { emptyCourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { japaneseCourseUnits, japaneseCourseSources } from "@/lib/yo/japaneseCourse";
import { emptyJapaneseProgress, japaneseUnitPracticeIds, JAPANESE_PROGRESS_KEY } from "@/lib/yo/japaneseCourseProgress";
import { mandarinJourneyUnits, japaneseFinalIds, mandarinFinalIds } from "@/lib/yo/foundationJourneyCatalogs";
import { emptyProgress, MANDARIN_PROGRESS_KEY } from "@/lib/yo/mandarin/progress";
import { MANDARIN_LANGUAGE_SOURCE } from "@/lib/yo/mandarin/course";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter,
  DocumentFragment: dom.window.DocumentFragment, HTMLInputElement: dom.window.HTMLInputElement, Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  localStorage: dom.window.localStorage, requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++frameId, fn); return frameId; },
  cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
window.scrollTo = () => {}; dom.window.HTMLElement.prototype.scrollIntoView = () => {};
prepareCinemaMedia();
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const { SharedIntro } = require("@/components/yo/shared/SharedIntro") as typeof import("@/components/yo/shared/SharedIntro");
const { IntroWelcome } = require("@/components/yo/shared/IntroWelcome") as typeof import("@/components/yo/shared/IntroWelcome");
const { readReviewState } = require("@/lib/yo/review/store") as typeof import("@/lib/yo/review/store");
const { GermanCourseDashboard } = require("@/components/yo/german/GermanCourseDashboard") as typeof import("@/components/yo/german/GermanCourseDashboard");
const { CourseExperience } = require("@/components/yo/german/CourseExperience") as typeof import("@/components/yo/german/CourseExperience");
const { JapaneseCourseHome } = require("@/components/yo/japanese/JapaneseCourseHome") as typeof import("@/components/yo/japanese/JapaneseCourseHome");
const { MandarinCourseHome } = require("@/components/yo/mandarin/MandarinCourseHome") as typeof import("@/components/yo/mandarin/MandarinCourseHome");
let clock = Date.now(); Date.now = () => clock;
function flush() {
  for (let index = 0; index < 20 && frames.size; index++) {
    const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(fn => fn(0)));
  }
  dismissMissionFilms();
}
function click(element: HTMLElement) { clock += 500; fireEvent.click(element); flush(); }
function reset() { cleanup(); frames.clear(); localStorage.clear(); localStorage.setItem("yo.practice.auto-next.v1", "off"); }
const course = introCourses[0], steps = courseSteps(course);
function seededIntro(): IntroState {
  return { ...freshIntro(course), profile: { experience: "some", goal: "work", minutes: 60, entry: 0 }, visited: [steps[0].id] };
}
function mountIntro(state: IntroState) {
  localStorage.setItem(introKey(course.language), JSON.stringify(state));
  const view = render(<SharedIntro course={course} locale="en" audio={{}} />); flush(); return view;
}

for (const kind of ["recall", "exercise"] as const) {
  reset();
  const index = steps.findIndex(step => step.kind === kind), step = steps[index];
  const exercise = kind === "recall" ? course.missions[step.mission].preparation[step.index - 1] : course.missions[step.mission].practice[step.index];
  const view = mountIntro({ ...seededIntro(), resume: "lesson", step: index, draft: { ...emptyDraft(), heard: true } });
  assert.equal(Object.keys(readReviewState(course.language).records).length, 0);
  click(view.getByRole("button", { name: "Continue" }));
  assert.ok(view.container.querySelector(`[data-intro-question="${exercise.id}"]`));
  const wrong = exercise.options.find(id => id !== exercise.answer)!;
  click(view.container.querySelector<HTMLButtonElement>(`[data-answer-id="${wrong}"]`)!);
  const expected = `intro:${course.missions[step.mission].id}:${exercise.id}`;
  assert.deepEqual(Object.keys(readReviewState(course.language).records), [expected], `${kind} errors enter the actual local review journal`);
  const saved: IntroState = JSON.parse(localStorage.getItem(introKey(course.language))!);
  assert.equal(saved.best, 0); assert.equal(saved.completed.length, 0, "Review scheduling cannot complete a lesson");
  click(view.container.querySelector<HTMLButtonElement>(`[data-answer-id="${exercise.answer}"]`)!);
  const evidence = JSON.stringify(readReviewState(course.language));
  const resumed: IntroState = JSON.parse(localStorage.getItem(introKey(course.language))!);
  cleanup(); frames.clear();
  const restored = mountIntro(resumed);
  assert.equal(JSON.stringify(readReviewState(course.language)), evidence, "Hydrating a corrected lesson must not replay its review event");
  click(restored.getByRole("button", { name: "Continue" }));
  assert.equal(JSON.stringify(readReviewState(course.language)), evidence, "Resuming a checked draft is not a second attempt");
}
console.log("PASS actual shared preparation/practice errors reach review without fabricated progress or replay on resume");

reset();
{
  const view = mountIntro({ ...seededIntro(), resume: "final" });
  click(view.getByRole("button", { name: "Continue" }));
  click(view.container.querySelector<HTMLButtonElement>(`[data-answer-id="${course.final[0].options.find(id => id !== course.final[0].answer)}"]`)!);
  assert.equal(Object.keys(readReviewState(course.language).records).length, 0, "Final assessment errors stay outside practice SRS");
}
reset();
{
  const view = render(<IntroWelcome course={course} locale="en" audio={{}} onComplete={() => { throw new Error("Placement must not auto-complete onboarding"); }} />); flush();
  click(view.getByRole("button", { name: "I know a few words" }));
  click(view.getByRole("button", { name: "Travel" }));
  click(view.getByRole("button", { name: "Continue" }));
  click(view.getByRole("radio", { name: "30 min" }));
  click(view.getByRole("button", { name: "Continue" }));
  click(view.getByRole("button", { name: "Find my starting point" }));
  click(view.container.querySelector<HTMLButtonElement>(`[data-answer-id="${course.final[0].options.find(id => id !== course.final[0].answer)}"]`)!);
  assert.equal(Object.keys(readReviewState(course.language).records).length, 0, "Placement is a diagnostic, not a practice review event");
  assert.equal(localStorage.getItem(introKey(course.language)), null);
}
console.log("PASS final and placement diagnostics never enter the review queue");

reset();
{
  const result = { ...seededIntro(), view: "result" as const, best: course.final.length, answers: course.final.map(() => ({ correct: false, assisted: false })) };
  let view = mountIntro(result);
  const card = view.container.querySelector("[data-intro-continuation]")!;
  assert.ok(card, "A previously earned stamp keeps continuation after a failed retry");
  assert.equal(within(card as HTMLElement).getByRole("link").getAttribute("href"), introContinuation(course, "work", "en").href);
  const before = localStorage.getItem(introKey(course.language));
  cleanup(); frames.clear(); view = mountIntro(result);
  assert.equal(localStorage.getItem(introKey(course.language)), before, "The continuation card does not rewrite progress");
  click(view.getByRole("button", { name: "Back to my journey" }));
  assert.ok(view.container.querySelector("[data-intro-continuation]"));
  assert.ok(view.container.querySelector("[data-intro-session-plan]")?.textContent?.includes("2 sessions of about 30 minutes"));
}
console.log("PASS durable achievements retain real continuation on result/map and selected weekly rhythm is visible");

const homes: { language: InterestLanguage; key: string; progress: unknown; node: React.ReactNode; path: string }[] = [
  { language: "de", key: GERMAN_PROGRESS_KEY, progress: emptyCourseProgress(), node: <CourseExperience language="de"><GermanCourseDashboard locale="en" catalog={germanCatalog} /></CourseExperience>, path: "/yo/langues/allemand/parcours/" },
  { language: "pt-BR", key: PORTUGUESE_PROGRESS_KEY, progress: emptyCourseProgress(), node: <CourseExperience language="pt-BR"><GermanCourseDashboard locale="en" catalog={portugueseCatalog} /></CourseExperience>, path: "/yo/langues/portugais-bresil/parcours/" },
  { language: "ja", key: JAPANESE_PROGRESS_KEY, progress: emptyJapaneseProgress(), node: <JapaneseCourseHome locale="en" units={japaneseCourseUnits.map(unit => ({ ...unit, practiceIds: japaneseUnitPracticeIds(unit) }))} finalIds={japaneseFinalIds} sources={japaneseCourseSources} />, path: "/yo/langues/japonais/parcours/" },
  { language: "zh-CN", key: MANDARIN_PROGRESS_KEY, progress: emptyProgress(), node: <MandarinCourseHome locale="en" units={mandarinJourneyUnits} finalIds={mandarinFinalIds} languageSource={MANDARIN_LANGUAGE_SOURCE} />, path: "/yo/langues/mandarin/parcours/" },
];
for (const home of homes) {
  reset();
  localStorage.setItem(home.key, JSON.stringify(home.progress));
  localStorage.setItem(interestPreferenceKey(home.language), JSON.stringify(["food"]));
  const before = localStorage.getItem(home.key), view = render(home.node); flush();
  const card = view.container.querySelector<HTMLElement>(`[data-interest-practice="${home.language}"]`)!;
  assert.ok(card, `${home.language} keeps interest practice on its actual course home`);
  const main = view.container.querySelector<HTMLAnchorElement>("a.yo-shared-continue")!;
  assert.ok(main?.getAttribute("href")?.startsWith(home.path), "The main course CTA keeps its real unit destination");
  assert.ok(main.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING, "The optional practice follows the course CTA");
  click(within(card).getByRole("button", { name: "Explore · Food" }));
  assert.ok(document.querySelector("[data-interest-step='0']")?.textContent?.includes(interestCorpus[home.language].venues.food.question.text), "Saved preferences open the authored activity in the course language");
  assert.equal(localStorage.getItem(home.key), before, "Opening optional practice preserves the course cursor and results");
  click(view.getByRole("button", { name: "Close and save my place" }));
  assert.equal(localStorage.getItem(home.key), before);
  assert.ok(within(card).getByRole("button", { name: "Resume my stop" }));
  if (home.language === "ja") {
    click(view.getByRole("button", { name: "Syllabus" }));
    assert.equal(view.container.querySelector("[data-interest-practice]"), null, "Japanese practice belongs to the itinerary tab");
    click(view.getByRole("button", { name: "Course" }));
    assert.ok(view.container.querySelector("[data-interest-practice]"));
    assert.equal(localStorage.getItem(home.key), before);
  }
}
cleanup(); frames.clear();
console.log("PASS German/Portuguese/Japanese/Mandarin homes retain chosen interests after the primary course action without changing course progress");
