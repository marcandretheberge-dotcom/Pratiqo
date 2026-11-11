/** Real React interactions: the illustrated map stays mounted while the lesson
 * opens in a mobile bottom-sheet. No new progress, Pass or credit source. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as React from "react";
import { italianCourseCatalog, italianCourseUnits } from "@/lib/yo/italian/course/courseData";
import { ITALIAN_COURSE_PROGRESS_KEY, emptyCourseProgress, recordCourseAssessment, recordCourseActivity, serializeCourseProgress, parseCourseProgress } from "@/lib/yo/italian/course/courseProgress";
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
dom.window.HTMLMediaElement.prototype.play = async () => {};
dom.window.HTMLMediaElement.prototype.pause = () => {};
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
    assert.match(source, /max-h-\[96dvh\]/);
    assert.match(source, /sm:max-h-\[92dvh\]/);
    assert.match(source, /sm:inset-0 sm:m-auto sm:h-\[92dvh\]/, "mission sheet desktop centering must not depend on transforms that Motion owns");
    assert.match(source, /bg-\[#16382f\]\/36/);
    assert.match(source, /useReducedMotion/);
  }],
  ["printables are available from map tools, before any mission or earned stamp", () => {
    const view = mount();
    const map = view.container.querySelector("[data-yoppo-world-map]");
    click(view.getByRole("button", { name: "Yoppo and my tools" }));
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
    assert.ok(panel.className.includes("max-h-[96dvh]"), "mobile lesson uses the available viewport");
    const backdrop = document.querySelector("[data-yoppo-mission-backdrop]") as HTMLElement;
    assert.ok(backdrop);
    assert.ok(backdrop.className.includes("bg-[#16382f]/36"), "overlay keeps spatial context recognizable");
    assert.ok(document.querySelector("[data-yoppo-mission-briefing]"));
    assert.ok(within(panel).getByText(unit.lessons[0].goal.en));
    click(within(panel).getByRole("button", { name: "Start my mission" }));
    assert.equal(document.querySelector("[data-yoppo-mission-briefing]"), null);
    assert.ok(within(panel).getByRole("heading", { name: "Word notebook" }));
    assert.equal(panel.querySelectorAll("[role=progressbar]").length, 1);
    assert.ok(within(panel).getByText(unit.lessons[0].vocabulary[0].it));
    click(within(panel).getByRole("button", { name: "Next expression" }));
    assert.ok(within(panel).getByText(unit.lessons[0].vocabulary[1].it));
    assert.equal(within(panel).queryByText(unit.lessons[0].vocabulary[0].it), null);
    click(within(panel).getByRole("button", { name: "Leave and save my place" }));
    assert.equal(document.querySelector("[data-yoppo-mission-window]"), null);
    assert.equal(map, view.container.querySelector("[data-yoppo-world-map]"));
    click(view.getByRole("button", { name: "Continue my mission" }));
    assert.ok(document.querySelector("[data-yoppo-mission-window]"));
    assert.ok(view.getByRole("heading", { name: "Word notebook" }));
    assert.ok(view.getByText(unit.lessons[0].vocabulary[1].it), "the study cursor resumes without granting progress");
    assertNoFakeMastery();
  }],
  ["city selection moves only the visual traveler, preserving the canonical guide and progress", () => {
    const progress = recordCourseAssessment(emptyCourseProgress(), italianCourseCatalog, unit.quiz.id, unit.quiz.questions.length, unit.quiz.questions.length, false);
    localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, serializeCourseProgress(progress));
    const view = mount(); skipTour(view);
    const before=localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY);
    const map=view.container.querySelector("[data-yoppo-world-map]");
    const art=view.container.querySelector(".yo-world-art");
    const traveler=view.container.querySelector("[data-yoppo-traveler]");
    const path=view.container.querySelector("[data-yoppo-path-progress]")?.getAttribute("data-yoppo-path-progress");
    const guide=view.container.querySelector('[data-yoppo-active-city="true"]')?.getAttribute("data-yoppo-map-token");
    assert.equal(traveler?.getAttribute("data-destination-index"),"1");
    click(view.getByRole("button",{name:/Explore Bologna/}));
    assert.equal(traveler?.getAttribute("data-destination-index"),"0","a visited city is independent of the canonical guide");
    assert.equal(traveler?.getAttribute("data-motion"),"walking");
    click(view.getByRole("button",{name:/Explore Parma/}));
    assert.equal(document.querySelector("[data-yoppo-mission-window]"),null,"browsing never auto-opens a mission");
    assert.equal(view.container.querySelector("[data-yoppo-world-map]"),map,"browsing never remounts the map");
    assert.equal(view.container.querySelector('[data-yoppo-active-city="true"]')?.getAttribute("data-yoppo-map-token"),guide,"visual travel does not change the canonical guide");
    assert.equal(view.container.querySelector(".yo-world-art"),art,"artwork never remounts");
    assert.equal(view.container.querySelector("[data-yoppo-traveler]"),traveler,"traveler never remounts on selection");
    assert.equal(traveler?.getAttribute("data-destination-index"),"1");
    assert.equal(view.container.querySelector("[data-yoppo-path-progress]")?.getAttribute("data-yoppo-path-progress"),path,"earned road remains unchanged");
    assert.equal(view.getByRole("link",{name:"Continue"}).getAttribute("href"),"/yo/langues/italien/parcours/u02?lang=en&mission=continue");
    assert.equal(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),before,"selection does not write progress");
    assert.equal(view.getByRole("switch",{name:"Gentle ambience"}).getAttribute("aria-checked"),"false","ambient sound starts off");
  }],
  ["Continue route opens and resumes the existing mission without granting access or mastery", () => {
    const props={locale:"en" as const,unit,catalog:italianCourseCatalog,audioPaths:paths,resumeMission:true};
    let view=render(<GuidedItalianCourse {...props}/>);flush();
    let panel=document.querySelector("[data-yoppo-mission-window]") as HTMLElement;
    assert.ok(panel,"explicit Continue opens the mission directly");
    click(within(panel).getByRole("button",{name:"Start my mission"}));
    click(within(panel).getByRole("button",{name:"Next expression"}));
    click(within(panel).getByRole("button",{name:"Leave and save my place"}));
    view.unmount();
    view=render(<GuidedItalianCourse {...props}/>);flush();
    panel=document.querySelector("[data-yoppo-mission-window]") as HTMLElement;
    assert.ok(panel);
    assert.ok(within(panel).getByText(unit.lessons[0].vocabulary[1].it),"Continue restores the saved study cursor");
    click(within(panel).getByRole("button",{name:"Leave and save my place"}));
    flush();assert.equal(document.querySelector("[data-yoppo-mission-window]"),null,"closing never reopens from the query");
    assertNoFakeMastery();
  }],
  ["earned completion supersedes a cosmetic visit without remounting the map", () => {
    const view=mount();skipTour(view);
    click(view.getByRole("button",{name:/Explore Bologna/}));
    const map=view.container.querySelector("[data-yoppo-world-map]");
    const completed=serializeCourseProgress(recordCourseAssessment(emptyCourseProgress(),italianCourseCatalog,unit.quiz.id,unit.quiz.questions.length,unit.quiz.questions.length,false));
    act(()=>{localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY,completed);window.dispatchEvent(new dom.window.StorageEvent("storage",{key:ITALIAN_COURSE_PROGRESS_KEY,newValue:completed}));});flush();
    assert.equal(view.container.querySelector('[data-yoppo-active-city="true"]')?.getAttribute("data-yoppo-map-token"),"u02");
    assert.equal(view.container.querySelector("[data-yoppo-traveler]")?.getAttribute("data-destination-index"),"1","real completion sends Yoppo to the next city");
    assert.equal(view.container.querySelector('[data-selected="true"]')?.getAttribute("data-yoppo-map-token"),"u02","Continue and highlight follow the earned next destination");
    assert.equal(view.container.querySelector("[data-yoppo-world-map]"),map);
    assert.equal(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),completed);
  }],
  ["transport mission offers the approved taxi, immediate Skip and a failure-safe continuation", () => {
    const transport=italianCourseUnits[7];
    const view=render(<GuidedItalianCourse locale="en" unit={transport} catalog={italianCourseCatalog} audioPaths={courseAudioPaths(unitSpeech(transport))} resumeMission/>);flush();
    const transition=view.container.ownerDocument.querySelector("[data-yoppo-taxi-transition]") as HTMLElement;
    assert.ok(transition,"the ordered first vocabulary step triggers the transport introduction");
    assert.ok(within(transition).getByText("Alla stazione, per favore."));
    assert.ok(within(transition).getByText("To the station, please."));
    assert.ok(within(transition).getByRole("button",{name:"Skip video"}));
    const video=transition.querySelector("video")!;
    assert.equal(video.getAttribute("src"),"/companion/travel/animations/yoppo-taxi-approved.mp4");
    assert.equal(video.muted,true,"the fallback provider never enables sound");
    fireEvent.error(video);
    assert.ok(within(transition).getByRole("status"));
    click(within(transition).getByRole("button",{name:"Skip video"}));
    assert.ok(document.querySelector("[data-yoppo-mission-briefing]"));
    click(view.getByRole("button",{name:"Leave and save my place"}));
    click(view.getByRole("button",{name:"Continue my mission"}));
    assert.equal(document.querySelector("[data-yoppo-taxi-transition]"),null,"resuming never forces the clip again");
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
