import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { AdventureProgress, CourseAdventure, EFFECTS_KEY } from "../../components/yo/journey/AdventureProgress";
import { AdventureScenery } from "../../components/yo/journey/AdventureScenery";
import { adventureCss } from "../../components/yo/journey/adventureStyles";
import { adventureCopy, adventureMilestones, announceAdventureEvaluation } from "../../lib/yo/adventure";
import { adventureScore, italianVictoryScore, playAdventureSound, stopAdventureSound } from "../../lib/yo/adventureSound";
import { buildCourseJourney } from "../../lib/yo/courseJourney";
import { italianCourseCatalog as catalog } from "../../lib/yo/italian/course/courseData";
import { italianCourseHref } from "../../lib/yo/italian/course/courseLinks";
import { emptyCourseProgress, recordCourseActivity, recordCourseAssessment, serializeCourseProgress } from "../../lib/yo/italian/course/courseProgress";
import type { CourseProgress } from "../../lib/yo/italian/course/courseProgress";
import type { YoLocale } from "../../lib/yo/types";

const require = createRequire(process.cwd() + "/package.json");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.org/yo/langues/italien/parcours/u01", pretendToBeVisual: true });
const bindings = { window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, React, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(bindings).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", { value: function () { this.setAttribute("open", ""); } });
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "close", { value: function () { this.removeAttribute("open"); } });
const { render, fireEvent, cleanup, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const first = catalog.units[0], second = catalog.units[1];
const cases: [string, () => void | Promise<void>][] = [];
const test = (name: string, run: () => void | Promise<void>) => cases.push([name, run]);
const node = (progress = emptyCourseProgress(), locale: YoLocale = "en", ready = true) => <CourseAdventure catalog={catalog} progress={progress} locale={locale} ready={ready} href={italianCourseHref(locale)} />;
function pass(id = first.quizId, progress = emptyCourseProgress(), assisted = false) {
  const assessment = catalog.assessments.find(item => item.id === id)!;
  assert.ok(assessment);
  return recordCourseAssessment(progress, catalog, id, assessment.questionCount, assessment.questionCount, assisted);
}
function evaluated(view: View, progress: CourseProgress, locale: YoLocale = "en") {
  act(() => { announceAdventureEvaluation(); view.rerender(node(progress, locale)); });
}

class Voice {
  frequency = { value: 0 }; type = ""; stops: number[] = []; starts: number[] = []; onended?: () => void;
  connect() {} disconnect() {}
  start(at: number) { this.starts.push(at); }
  stop(at = -1) { this.stops.push(at); }
}
const voices: Voice[] = [];
const contexts: AudioContextMock[] = [];
let resumeWait: Promise<void> | undefined;
class AudioContextMock {
  state = "running"; currentTime = 10; destination = {};
  constructor() { contexts.push(this); }
  async resume() { await resumeWait; this.state = "running"; }
  createOscillator() { const voice = new Voice(); voices.push(voice); return voice; }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
}
const audioConstructor = AudioContextMock as unknown as typeof AudioContext;
Object.defineProperty(window, "AudioContext", { configurable: true, writable: true, value: audioConstructor });

test("the assessed recap is separate from halfway practice, assistance and unit mastery", () => {
  assert.ok(first.midpointId);
  let progress = emptyCourseProgress();
  for (const id of first.activityIds.slice(0, Math.ceil(first.activityIds.length / 2))) progress = recordCourseActivity(progress, catalog, id, true, false);
  const kinds = (value: CourseProgress) => adventureMilestones(buildCourseJourney(catalog, value)).map(item => item.kind);
  assert.ok(kinds(progress).includes("checkpoint"));
  assert.equal(kinds(progress).includes("recap"), false);
  assert.equal(kinds(pass(first.midpointId, progress, true)).includes("recap"), false);
  const result = pass(first.midpointId, progress);
  const journey = buildCourseJourney(catalog, result);
  assert.equal(journey.steps[0].passed, false);
  assert.equal(journey.steps[1].unlocked, false);
  assert.equal(adventureMilestones(journey).filter(item => item.id === "u01:recap").length, 1);
  assert.deepEqual(adventureMilestones(journey).find(item => item.kind === "recap")?.skills, []);
  assert.equal(kinds(result).includes("mastery"), false);
});

test("a saved recap pass celebrates once; replay writes no progress or preferences", () => {
  const progress = pass(first.midpointId!);
  const original = serializeCourseProgress(progress);
  const view = render(node());
  evaluated(view, progress);
  const dialog = view.getByRole("dialog", { name: adventureCopy.en.kinds.recap });
  assert.equal(dialog.querySelector("[data-celebration]")?.getAttribute("data-celebration"), "recap");
  assert.equal(dialog.querySelector("[data-next-destination]"), null);
  const storage = { ...localStorage };
  fireEvent.click(within(dialog).getByRole("button", { name: adventureCopy.en.replay }));
  assert.equal(serializeCourseProgress(progress), original);
  assert.deepEqual({ ...localStorage }, storage);
  fireEvent.click(within(dialog).getAllByRole("button", { name: "Continue" })[0]);
  evaluated(view, progress);
  assert.equal(view.queryByRole("dialog"), null);
});

test("hydrated or externally received passes remain silent even when effects were enabled", () => {
  localStorage.setItem(EFFECTS_KEY, "false");
  const start = voices.length;
  const view = render(node(pass(), "en", false));
  view.rerender(node(pass()));
  assert.equal(view.queryByRole("dialog"), null);
  assert.equal(view.container.querySelector("[data-victory-scene]"), null);
  assert.equal(voices.length, start);
  view.unmount();
  const incoming = render(node());
  incoming.rerender(node(pass()));
  assert.equal(incoming.queryByRole("dialog"), null);
  assert.equal(voices.length, start);
});

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: unit one reveals the actual next destination in one skippable victory`, () => {
    const progress = pass(), original = serializeCourseProgress(progress), soundCount = voices.length;
    const view = render(node(emptyCourseProgress(), locale));
    evaluated(view, progress, locale);
    const copy = adventureCopy[locale];
    const dialog = view.getByRole("dialog", { name: copy.victory });
    assert.equal(dialog.querySelectorAll('[data-victory-scene="italian-u01"]').length, 1);
    assert.ok(dialog.querySelector('[data-victory-part="tower"]'));
    assert.ok(dialog.querySelector('[data-victory-part="path"]'));
    assert.ok(dialog.querySelector('[data-victory-part="destination"]'));
    const destination = within(dialog).getByRole("region", { name: copy.nextDestination });
    assert.equal(destination.getAttribute("data-next-destination"), second.id);
    assert.ok(within(destination).getByRole("heading", { name: second.title[locale] }));
    assert.ok(within(destination).getByText(second.objectives[0][locale]));
    const link = within(destination).getByRole("link", { name: `${copy.visitDestination} : ${second.title[locale]}` });
    assert.equal(link.getAttribute("href"), italianCourseHref(locale, second.id));
    assert.equal(link.getAttribute("aria-disabled"), null, "the next destination never waits for an animation timer");
    assert.equal(voices.length, soundCount, "effects remain muted until the learner opts in");
    const oldScene = dialog.querySelector("[data-celebration]");
    fireEvent.click(within(dialog).getByRole("button", { name: copy.replay }));
    assert.notEqual(dialog.querySelector("[data-celebration]"), oldScene, "replay restarts the same presentation");
    assert.ok(dialog.contains(document.activeElement));
    fireEvent.click(within(dialog).getAllByRole("button", { name: copy.skip })[0]);
    assert.equal(view.queryByRole("dialog"), null, "the matching unlock must not become a second ceremony");
    evaluated(view, progress, locale);
    assert.equal(view.queryByRole("dialog"), null);
    assert.equal(serializeCourseProgress(progress), original);
    assert.deepEqual({ ...localStorage }, {});
  });
}

test("other worlds and later Italian units keep the original mastery and unlock sequence", () => {
  for (const world of ["german", "italian"] as const) {
    const before = world === "italian" ? pass() : emptyCourseProgress();
    const after = world === "italian" ? pass(second.quizId, before) : pass();
    const fixture = (progress: CourseProgress) => <AdventureProgress journey={buildCourseJourney(catalog, progress)} world={world} locale="en" ready hrefForUnit={id => italianCourseHref("en", id)} />;
    const view = render(fixture(before));
    act(() => { announceAdventureEvaluation(); view.rerender(fixture(after)); });
    assert.equal(view.container.querySelector("[data-victory-scene]"), null);
    assert.equal(view.container.querySelector("[data-celebration]")?.getAttribute("data-celebration"), "mastery");
    fireEvent.click(within(view.getByRole("dialog")).getAllByRole("button", { name: "Continue" })[0]);
    assert.equal(view.container.querySelector("[data-celebration]")?.getAttribute("data-celebration"), "unlock");
    view.unmount();
  }
});

test("the scene never invents a destination when the next step remains locked", () => {
  const fixture = (progress: CourseProgress) => {
    const journey = buildCourseJourney(catalog, progress);
    journey.steps[1].unlocked = false;
    return <AdventureProgress journey={journey} world="italian" locale="en" ready hrefForUnit={id => italianCourseHref("en", id)} />;
  };
  const view = render(fixture(emptyCourseProgress()));
  act(() => { announceAdventureEvaluation(); view.rerender(fixture(pass())); });
  assert.ok(view.getByRole("dialog"));
  assert.equal(view.container.querySelector("[data-next-destination]"), null);
  assert.equal(view.container.querySelector("[data-victory-scene]"), null);
});

test("Escape cancellation restores the learner's focus and never advances the course", () => {
  const fixture = (progress: CourseProgress) => <><button type="button">Return to my result</button>{node(progress)}</>;
  const progress = pass(), original = serializeCourseProgress(progress);
  const view = render(fixture(emptyCourseProgress()));
  const opener = view.getByRole("button", { name: "Return to my result" });
  opener.focus();
  act(() => { announceAdventureEvaluation(); view.rerender(fixture(progress)); });
  const dialog = view.getByRole("dialog");
  assert.ok(dialog.contains(document.activeElement));
  const cancel = new dom.window.Event("cancel", { cancelable: true, bubbles: true });
  fireEvent(dialog, cancel);
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(view.queryByRole("dialog"), null);
  assert.equal(document.activeElement, opener);
  assert.equal(serializeCourseProgress(progress), original);
});

test("Tab wraps both dialog boundaries and ignores disabled, hidden and non-tabbable controls", () => {
  const view = render(node());
  evaluated(view, pass());
  const dialog = view.getByRole("dialog") as HTMLDialogElement;
  const first = within(dialog).getAllByRole("button", { name: "Continue" })[0];
  const last = within(dialog).getByRole("button", { name: "Sound effects" });
  const disabled = document.createElement("button"); disabled.disabled = true;
  const hiddenParent = document.createElement("div"); hiddenParent.hidden = true;
  hiddenParent.append(document.createElement("button"));
  const hidden = document.createElement("button"); hidden.style.visibility = "hidden";
  const notTabbable = document.createElement("button"); notTabbable.tabIndex = -1;
  const collapsed = document.createElement("button");
  dialog.prepend(disabled, hiddenParent);
  dialog.append(hidden, notTabbable, collapsed);
  // JSDOM has no layout; only the collapsed target reports no rendered box.
  for (const element of dialog.querySelectorAll<HTMLElement>("button, a[href]")) {
    Object.defineProperty(element, "getClientRects", { value: () => element === collapsed ? [] : [{ width: 44, height: 44 }] });
  }
  const tab = (target: HTMLElement, shiftKey = false) => {
    target.focus();
    assert.equal(document.activeElement, target);
    const event = new dom.window.KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
    fireEvent(target, event);
    return event;
  };
  assert.equal(tab(last).defaultPrevented, true);
  assert.equal(document.activeElement, first);
  assert.equal(tab(first, true).defaultPrevented, true);
  assert.equal(document.activeElement, last);
  // Model the native dialog's own focusability, which JSDOM does not implement.
  dialog.tabIndex = -1;
  assert.equal(tab(dialog, true).defaultPrevented, true);
  assert.equal(document.activeElement, last);
  assert.equal(tab(dialog).defaultPrevented, true);
  assert.equal(document.activeElement, first);
  const middle = within(dialog).getByRole("button", { name: adventureCopy.en.replay });
  assert.equal(tab(middle).defaultPrevented, false, "ordinary movement within the dialog stays native");
  const escape = new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  fireEvent(middle, escape);
  assert.equal(escape.defaultPrevented, false, "Escape is still handled by native dialog cancellation");
});

test("reduced motion has a visible resting destination and ordinary maps never play the victory", () => {
  const view = render(<AdventureScenery world="italian" state="mastered" />);
  assert.equal(view.container.querySelector("[data-victory-scene]"), null);
  view.rerender(<AdventureScenery world="italian" state="mastered" victory={{ destinationNumber: second.number }} />);
  const svg = view.container.querySelector("svg")!;
  assert.equal(svg.getAttribute("aria-hidden"), "true");
  assert.equal(svg.getAttribute("focusable"), "false");
  const resting = adventureCss.split("@media (prefers-reduced-motion: no-preference)")[0];
  assert.match(resting, /\.yo-italian-victory-stone[^}]*transform: translate\(var\(--stone-x\), var\(--stone-y\)\)/);
  assert.match(resting, /\.yo-italian-victory-destination[^}]*opacity: 1/);
  assert.match(adventureCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.yo-italian-victory-scene \* \{ animation: none; transition: none;/);
  assert.doesNotMatch(adventureCss, /infinite|flash|blink/);
});

test("an unavailable sound device leaves the victory, skip and destination usable", async () => {
  Object.defineProperty(window, "AudioContext", { configurable: true, writable: true, value: undefined });
  localStorage.setItem(EFFECTS_KEY, "false");
  try {
    const view = render(node());
    await act(async () => { announceAdventureEvaluation(); view.rerender(node(pass())); });
    const dialog = view.getByRole("dialog", { name: adventureCopy.en.victory });
    assert.ok(within(dialog).getByText(adventureCopy.en.unavailable));
    assert.ok(within(dialog).getByRole("link", { name: /Go to this destination/ }));
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Continue" })[0]);
    assert.equal(view.queryByRole("dialog"), null);
  } finally { Object.defineProperty(window, "AudioContext", { configurable: true, writable: true, value: audioConstructor }); }
});

test("the original victory cue is bounded and still uses the interruptible shared sound engine", async () => {
  let start = voices.length;
  assert.equal(await playAdventureSound("mastery", "italian-u01"), true);
  const played = voices.slice(start), time = contexts.at(-1)!.currentTime;
  assert.deepEqual(played.map(voice => voice.frequency.value), italianVictoryScore.map(note => note.frequency));
  assert.ok(played.every(voice => voice.starts[0] >= time && voice.stops[0] <= time + 2.4));
  stopAdventureSound();
  assert.ok(played.every(voice => voice.stops.includes(-1)));
  start = voices.length;
  assert.equal(await playAdventureSound("mastery"), true);
  assert.deepEqual(voices.slice(start).map(voice => voice.frequency.value), [...adventureScore.mastery]);
  assert.ok(voices.slice(start).every(voice => voice.stops[0] < time + 1));
  assert.notDeepEqual(adventureScore.recap, adventureScore.checkpoint);
});

test("sound status belongs to the current replay while a suspended context resumes", async () => {
  localStorage.setItem(EFFECTS_KEY, "false");
  const view = render(node());
  await act(async () => { announceAdventureEvaluation(); view.rerender(node(pass())); });
  const state = () => view.container.querySelector("[data-effect-state]")?.getAttribute("data-effect-state");
  assert.equal(state(), "played");
  contexts.at(-1)!.state = "suspended";
  let resume!: () => void;
  resumeWait = new Promise<void>(resolve => { resume = resolve; });
  try {
    const dialog = view.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: adventureCopy.en.replay }));
    assert.equal(state(), "idle", "the previous replay's success cannot describe a pending replay");
    await act(async () => { resume(); await resumeWait; });
    assert.equal(state(), "played");
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Continue" })[0]);
    assert.equal(state(), "idle");
  } finally { resume(); resumeWait = undefined; }
});

test("sound can be muted inside the victory; replay and hiding stop all scheduled notes", async () => {
  localStorage.setItem(EFFECTS_KEY, "false");
  const view = render(node());
  let start = voices.length;
  await act(async () => { announceAdventureEvaluation(); view.rerender(node(pass())); });
  const dialog = view.getByRole("dialog", { name: adventureCopy.en.victory });
  const played = voices.slice(start);
  assert.equal(played.length, italianVictoryScore.length);
  await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Sound effects" })));
  assert.equal(localStorage.getItem(EFFECTS_KEY), "true");
  assert.equal(view.container.querySelector("[data-effect-state]")?.getAttribute("data-effect-state"), "idle");
  assert.ok(played.every(voice => voice.stops.includes(-1)));
  start = voices.length;
  await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: adventureCopy.en.replay })));
  assert.equal(voices.length, start);
  assert.equal(within(dialog).queryByText(adventureCopy.en.unavailable), null);
  await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Sound effects" })));
  await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: adventureCopy.en.replay })));
  const replayed = voices.slice(start);
  assert.equal(replayed.length, italianVictoryScore.length);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  assert.equal(view.queryByRole("dialog"), null);
  assert.ok(replayed.every(voice => voice.stops.includes(-1)));
});

test("cancelling a suspended sound context prevents late victory playback", async () => {
  const context = contexts.at(-1)!;
  context.state = "suspended";
  let resume!: () => void;
  resumeWait = new Promise<void>(resolve => { resume = resolve; });
  const start = voices.length;
  const pending = playAdventureSound("mastery", "italian-u01");
  stopAdventureSound();
  resume();
  assert.equal(await pending, false);
  assert.equal(voices.length, start);
  resumeWait = undefined;
});

async function main() {
  let failures = 0;
  try {
    for (const [name, run] of cases) {
      localStorage.clear();
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      try { await run(); console.log("PASS " + name); }
      catch (error) { failures++; console.error("FAIL " + name, error); }
      finally { cleanup(); stopAdventureSound(); }
    }
  } finally {
    dom.window.close();
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
  console.log(`${cases.length - failures}/${cases.length} Italian victory checks passed`);
  if (failures) process.exitCode = 1;
}
void main();
