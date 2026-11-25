import assert from "node:assert/strict";
import { createRequire } from "node:module";
import React from "react";
import { introCourses } from "@/lib/yo/shared/course";
import { freshIntro, introKey } from "@/lib/yo/shared/state";
import { goalOptions, type LearningProfile } from "@/lib/yo/personalized/profile";
import { learningLanguages, YO_LANGUAGE_IDS } from "@/lib/yo/config/languages";
import { readStudyPreferences, studyGoalFocus, studyPaceText, studyPreferenceSource } from "@/lib/yo/studyPlan";
import { englishCatalog } from "@/lib/yo/english/courseData";
import { emptyCourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { CourseStudyPlan } from "@/components/yo/journey/CourseStudyPlan";
import { LearningJourney } from "@/components/yo/journey/CourseJourney";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
const frame = (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; };
const cancel = (id: number) => frames.delete(id);
dom.window.requestAnimationFrame = frame;
dom.window.cancelAnimationFrame = cancel;
for (const [key, value] of Object.entries({
  window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Event: dom.window.Event,
  StorageEvent: dom.window.StorageEvent, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  requestAnimationFrame: frame, cancelAnimationFrame: cancel, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, act } = require("@testing-library/react") as typeof import("@testing-library/react");
function flush() { for (let i = 0; i < 10 && frames.size; i++) { const callbacks = [...frames.values()]; frames.clear(); act(() => callbacks.forEach(callback => callback(0))); } }
function reset() { cleanup(); frames.clear(); localStorage.clear(); sessionStorage.clear(); }
function profile(goal: LearningProfile["goal"] = "work", weeklyMinutes = 60): LearningProfile {
  return { version: 1, language: "it", experience: "new", goal, weeklyMinutes, startUnitId: "u01", placement: "beginner", reviewUnitIds: [], updatedAt: Date.now() };
}
function seed(language: string, goal: LearningProfile["goal"] = "work", minutes = 60) {
  const source = studyPreferenceSource(language)!;
  if (source.id === "it") localStorage.setItem(source.key, JSON.stringify(profile(goal, minutes)));
  else {
    const course = introCourses.find(course => course.language === source.language)!;
    localStorage.setItem(introKey(course.language), JSON.stringify({ ...freshIntro(course), profile: { experience: "new", goal, minutes, entry: 0 } }));
  }
}
function snapshot() { return Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => { const key = localStorage.key(index)!; return [key, localStorage.getItem(key)]; })); }
let checks = 0;
function test(name: string, run: () => void) { reset(); run(); checks++; console.log(`PASS ${name}`); }

test("all eight source profiles and regional aliases supply only their own goal and weekly pace", () => {
  for (const id of YO_LANGUAGE_IDS) {
    seed(id);
    const before = snapshot();
    for (const alias of [id, ...learningLanguages[id].aliases]) assert.deepEqual(readStudyPreferences(localStorage, alias), { goal: "work", weeklyMinutes: 60 }, alias);
    assert.deepEqual(snapshot(), before, "Reading a preference never migrates, grades or changes a stored record");
  }
  assert.equal(readStudyPreferences(localStorage, "unknown"), null);
});

test("missing, mismatched, malformed and oversized profiles never leak another course's preferences", () => {
  const source = studyPreferenceSource("de")!;
  const base = { version: 2, language: source.language, profile: { goal: "travel", minutes: 30 } };
  for (const value of [null, [], {}, { ...base, language: "en" }, { ...base, version: 99 }, { ...base, profile: null },
    ...["unknown", {}, null].map(goal => ({ ...base, profile: { goal, minutes: 30 } })),
    ...[-1, 1, 14, 30.5, 1201, "60"].map(minutes => ({ ...base, profile: { goal: "travel", minutes } })),
  ]) {
    localStorage.setItem(source.key, JSON.stringify(value));
    assert.equal(readStudyPreferences(localStorage, "de"), null);
  }
  for (const raw of ["broken json", " ".repeat(30001)]) {
    localStorage.setItem(source.key, raw); assert.equal(readStudyPreferences(localStorage, "de"), null);
  }
  assert.equal(readStudyPreferences({ getItem: () => { throw new Error("Storage blocked"); } }, "de"), null);
});

test("a newer reset tombstone suppresses stale intro preferences without touching old progress", () => {
  seed("zh");
  const source = studyPreferenceSource("zh")!, raw = localStorage.getItem(source.key)!;
  localStorage.setItem(source.epochKey!, JSON.stringify({ version: 1, language: source.language, reset: { at: 10, actor: "tab-b" } }));
  assert.equal(readStudyPreferences(localStorage, "zh-CN"), null);
  assert.equal(localStorage.getItem(source.key), raw);
  localStorage.setItem(source.key, JSON.stringify({ ...JSON.parse(raw), sync: { reset: { at: 10, actor: "tab-b" } } }));
  assert.deepEqual(readStudyPreferences(localStorage, "zh-Hans"), { goal: "work", weeklyMinutes: 60 });
  localStorage.setItem(source.epochKey!, JSON.stringify({ version: 1, language: source.language, reset: { at: 10, actor: "tab-c" } }));
  assert.equal(readStudyPreferences(localStorage, "zh"), null, "Equal timestamp uses the same actor ordering as intro synchronization");
});

test("goal/pace guidance renders in every target and UI locale without another action or a storage write", () => {
  for (const id of YO_LANGUAGE_IDS) for (const locale of ["fr", "en", "es"] as const) {
    cleanup(); frames.clear(); seed(id); const before = snapshot();
    const view = render(<CourseStudyPlan language={id} locale={locale}/>); flush();
    assert.ok(view.getByText(studyGoalFocus.work[locale]));
    assert.ok(view.getByText(studyPaceText(60)[locale]));
    assert.equal(view.container.querySelectorAll("button,a,input").length, 0, "Guidance must not compete with the course's Continue action");
    assert.deepEqual(snapshot(), before);
  }
});

test("Italian in-memory profile and zero-minute pace remain authoritative and can be changed", () => {
  seed("it", "travel", 120);
  const view = render(<CourseStudyPlan language="it" locale="en" profile={profile("family", 0)}/>); flush();
  assert.ok(view.getByText(studyGoalFocus.family.en));
  assert.ok(view.getByText("At your pace, without a fixed schedule."));
  for (const goal of goalOptions) {
    view.rerender(<CourseStudyPlan language="it" locale="en" profile={profile(goal, 30)}/>);
    assert.ok(view.getByText(studyGoalFocus[goal].en));
    assert.ok(view.getByText(studyPaceText(30).en));
  }
});

test("switching language clears old guidance; external edits, deletion and reset are observed", () => {
  seed("en", "work", 60); seed("ja", "travel", 120);
  const view = render(<CourseStudyPlan language="en" locale="en"/>); flush();
  assert.ok(view.getByText(studyGoalFocus.work.en));
  view.rerender(<CourseStudyPlan language="ja" locale="en"/>);
  assert.equal(view.queryByText(studyGoalFocus.work.en), null);
  flush(); assert.ok(view.getByText(studyGoalFocus.travel.en));
  seed("ja", "thorough", 180);
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: studyPreferenceSource("ja")!.key })));
  assert.ok(view.getByText(studyGoalFocus.thorough.en));
  localStorage.removeItem(studyPreferenceSource("ja")!.key);
  act(() => window.dispatchEvent(new Event("focus")));
  assert.equal(view.container.textContent, "");
  seed("ja"); act(() => window.dispatchEvent(new Event("pageshow")));
  assert.ok(view.getByText(studyGoalFocus.work.en));
  localStorage.clear(); act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
  assert.equal(view.container.textContent, "");
});

test("the real course map keeps its only Continue link and exact saved lesson/activity target", () => {
  seed("en");
  const progress = emptyCourseProgress(), unit = englishCatalog.units[2], lesson = unit.lessons[1];
  progress.resume = { unitId: unit.id, lessonId: lesson.id, activityId: lesson.activityIds[0] };
  const journey = buildCourseJourney(englishCatalog, progress);
  const href = (id = "") => `/yo/langues/anglais/parcours${id ? `/${id}` : ""}?lang=es${id === unit.id ? `&lesson=${lesson.id}&activity=${lesson.activityIds[0]}` : ""}`;
  const before = JSON.stringify(progress), storageBefore = snapshot();
  const view = render(<LearningJourney journey={journey} locale="es" ready={true} href={href}/>); flush();
  assert.equal(view.getAllByRole("link", { name: "Continuar" }).length, 1);
  assert.equal(view.getByRole("link", { name: "Continuar" }).getAttribute("href"), href(unit.id));
  assert.ok(view.getByText(studyGoalFocus.work.es));
  assert.equal(JSON.stringify(progress), before);
  assert.deepEqual(snapshot(), storageBefore);
  seed("en", "travel", 0); act(() => window.dispatchEvent(new Event("focus")));
  assert.ok(view.getByText(studyGoalFocus.travel.es));
  assert.equal(view.getByRole("link", { name: "Continuar" }).getAttribute("href"), href(unit.id));
  assert.equal(JSON.stringify(progress), before, "Preferences cannot grant a different unit or alter the pending answer");
});

cleanup(); frames.clear(); dom.window.close();
console.log(`PASS ${checks} study-plan cases`);
