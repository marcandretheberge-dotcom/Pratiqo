/** Real React interactions: the illustrated map stays mounted while the lesson
 * opens in a mobile bottom-sheet. No new progress, Pass or credit source. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as React from "react";
import { italianCourseCatalog, italianCourseUnits } from "@/lib/yo/italian/course/courseData";
import { ITALIAN_COURSE_PROGRESS_KEY, emptyCourseProgress, recordCourseActivity, serializeCourseProgress, parseCourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "@/lib/yo/italian/course/courseSpeech";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/yo/langues/italien/parcours/u01",
  pretendToBeVisual: true,
});
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
for (const [name, value] of Object.entries({
  window: dom.window, self: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node,
  NodeFilter: dom.window.NodeFilter, DocumentFragment: dom.window.DocumentFragment,
  HTMLInputElement: dom.window.HTMLInputElement, CustomEvent: dom.window.CustomEvent,
  Event: dom.window.Event, MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle, localStorage: dom.window.localStorage,
  requestAnimationFrame: (fn: FrameRequestCallback) => { const id = ++frameId; frames.set(id, fn); return id; },
  cancelAnimationFrame: (id: number) => frames.delete(id),
  IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
Object.defineProperty(dom.window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return false; },
  }),
});
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLElement.prototype.scrollTo = () => {};
window.scrollTo = () => {};
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audio.example.test";

const { GuidedItalianCourse } = require("@/components/yo/italian/guided/GuidedItalianCourse") as typeof import("@/components/yo/italian/guided/GuidedItalianCourse");
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const unit = italianCourseUnits[0];
const paths = courseAudioPaths(unitSpeech(unit));
function flush() {
  for (let i = 0; i < 15 && frames.size; i++) {
    const tasks = [...frames.values()]; frames.clear();
    act(() => tasks.forEach(task => task(0)));
  }
}
let clock = Date.now();
Date.now = () => clock;
function click(node: HTMLElement) { clock += 500; fireEvent.click(node); flush(); }
function mount(locale: "fr" | "en" | "es" = "en") {
  localStorage.setItem("yo.practice.auto-next.v1", "off");
  const view = render(<GuidedItalianCourse locale={locale} unit={unit} catalog={italianCourseCatalog} audioPaths={paths}/>);
  flush();
  return view;
}
function skipTour(view: View) { const skip = view.queryByRole("button", { name: "Skip the tour" }); if (skip) click(skip); }
function assertNoFakeMastery() {
  const current = parseCourseProgress(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY), italianCourseCatalog);
  assert.equal(Object.keys(current.assessments).length, 0, "mission navigation cannot grant exam success");
  assert.equal(Object.keys(current.activities).length, 0, "opening and closing cannot complete exercises");
}
const tests: [string, () => void][] = [
  ["mission sheet keeps atlas context visible and uses a reduced-motion-aware spring", () => {
    const source = readFileSync("components/yo/italian/guided/GuidedItalianCourse.tsx", "utf8");
    assert.match(source, /from "motion\/react"/);
    assert.match(source, /type: "spring", stiffness: 430, damping: 34/);
    assert.match(source, /max-h-\[76dvh\]/);
    assert.match(source, /sm:max-h-\[92dvh\]/);
    assert.match(source, /sm:inset-0 sm:m-auto sm:h-fit/, "mission sheet desktop centering must not depend on transforms that Motion owns");
    assert.match(source, /bg-\[#16382f\]\/36/);
    assert.match(source, /useReducedMotion/);
  }],
  ["printables are one tap from the map, before any mission or earned stamp", () => {
    const view = mount();
    const map = view.container.querySelector("[data-yoppo-world-map]");
    click(view.getByRole("button", { name: "My printable sheets" }));
    const dialog = document.querySelector("[data-yoppo-tools-dialog]") as HTMLElement;
    assert.ok(dialog && dialog.querySelector("[data-yoppo-printables-menu]"), "printable resources are in a real dialog");
    assert.equal(dialog.querySelector("[data-yoppo-printable-vocabulary]")?.getAttribute("href"), "/yo/langues/italien/parcours/u01/vocabulaire?lang=en");
    assert.equal(dialog.querySelector("[data-yoppo-printable-achievement]")?.getAttribute("href"), "/yo/langues/italien/parcours/u01/bilan?lang=en");
    assert.ok(within(dialog).getByText(/no stamp unless you pass/), "unearned stamps are not implied");
    assert.equal(map, view.container.querySelector("[data-yoppo-world-map]"), "printables never replace the map");
    assertNoFakeMastery();
    click(within(dialog).getByRole("button", { name: "Close" }));
    assert.equal(document.querySelector("[data-yoppo-tools-dialog]"), null);
  }],
  ["world map is the whole landing screen; Yoppo guides the next city", () => {
    const view = mount();
    assert.equal(view.container.querySelectorAll("[data-yoppo-world-map]").length, 1);
    assert.equal(view.container.querySelectorAll("[data-yoppo-immersive-atlas]").length, 1);
    assert.ok(view.container.querySelector("[data-yoppo-map-only]"), "the world map is the only persistent learning surface");
    assert.equal(view.container.querySelectorAll("[data-yoppo-city-arrival]").length, 0, "no second dashboard arrival card");
    assert.equal(view.container.querySelectorAll("[data-yoppo-primary-mobile]").length, 0, "no duplicate primary mobile button");
    assert.ok(view.container.querySelector('[data-yoppo-map-token="u01"]'));
    assert.ok(view.getByRole("button", { name: "Start my mission" }));
    assert.ok(view.getByRole("button", { name: "Skip the tour" }), "short Yoppo in-map hint is dismissible");
    assert.equal(document.querySelector("[data-yoppo-mission-window]"), null);
    assertNoFakeMastery();
  }],
  ["tap city -> briefing -> mission sheet; closing returns to SAME map without losing draft", () => {
    const view = mount();
    skipTour(view);
    const map = view.container.querySelector("[data-yoppo-world-map]");
    assert.ok(map);
    click(view.getByRole("button", { name: "Start my mission" }));
    assert.equal(map, view.container.querySelector("[data-yoppo-world-map]"), "map remains mounted");
    const panel = document.querySelector("[data-yoppo-mission-window]") as HTMLElement;
    assert.ok(panel);
    assert.ok(panel.className.includes("max-h-[76dvh]"), "mobile sheet deliberately leaves the atlas visible");
    const backdrop = document.querySelector("[data-yoppo-mission-backdrop]") as HTMLElement;
    assert.ok(backdrop);
    assert.ok(backdrop.className.includes("bg-[#16382f]/36"), "overlay keeps spatial context recognizable");
    assert.ok(document.querySelector("[data-yoppo-mission-briefing]"));
    assert.ok(within(panel).getByText(unit.lessons[0].goal.en));
    click(within(panel).getByRole("button", { name: "Start my mission" }));
    assert.equal(document.querySelector("[data-yoppo-mission-briefing]"), null);
    assert.ok(within(panel).getByRole("heading", { name: "Word notebook" }));
    click(within(panel).getByRole("button", { name: "Leave and save my place" }));
    assert.equal(document.querySelector("[data-yoppo-mission-window]"), null);
    assert.equal(map, view.container.querySelector("[data-yoppo-world-map]"));
    click(view.getByRole("button", { name: "Continue my mission" }));
    assert.ok(document.querySelector("[data-yoppo-mission-window]"));
    assert.ok(view.getByRole("heading", { name: "Word notebook" }));
    assertNoFakeMastery();
  }],
  ["after real midpoint activities, Trivia opens in a window above the same map", () => {
    let progress = emptyCourseProgress();
    for (const lesson of unit.lessons.slice(0, Math.ceil(unit.lessons.length / 2))) {
      for (const activity of lesson.activities) progress = recordCourseActivity(progress, italianCourseCatalog, activity.id, true, false);
    }
    localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, serializeCourseProgress(progress));
    const view = mount();
    skipTour(view);
    const map = view.container.querySelector("[data-yoppo-world-map]");
    const button = view.getByRole("button", { name: "Play Trivia" });
    click(button);
    assert.ok(document.querySelector("[data-yoppo-trivia-window]"));
    assert.equal(map, view.container.querySelector("[data-yoppo-world-map]"));
    assert.equal(document.querySelector("[data-yoppo-mission-window]"), null);
    const trivia = document.querySelector("[data-yoppo-trivia-window]") as HTMLElement;
    click(within(trivia).getByRole("button", { name: "Leave and save my place" }));
    assert.equal(document.querySelector("[data-yoppo-trivia-window]"), null);
    assert.equal(map, view.container.querySelector("[data-yoppo-world-map]"));
  }],
];
let failures = 0;
for (const [name, test] of tests) {
  cleanup(); localStorage.clear(); frames.clear();
  try { test(); console.log("PASS " + name); }
  catch (error) { failures++; console.error("FAIL " + name, error); }
  finally { cleanup(); frames.clear(); }
}
console.log(`${tests.length - failures}/${tests.length} map-first mission interactions passed`);
if (failures) process.exitCode = 1;
