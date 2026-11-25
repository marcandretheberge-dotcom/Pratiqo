import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { adventureMilestones, adventureWorld, announceAdventureEvaluation, destinationState, newAdventureMilestones } from "../../lib/yo/adventure";
import { adventureScore, playAdventureSound, stopAdventureSound, listenForAdventureInterruptions } from "../../lib/yo/adventureSound";
import { AdventureProgress, EFFECTS_KEY } from "../../components/yo/journey/AdventureProgress";
import { AdventureScenery } from "../../components/yo/journey/AdventureScenery";
import { adventureCss } from "../../components/yo/journey/adventureStyles";
import { buildCourseJourney } from "../../lib/yo/courseJourney";
import { italianCourseCatalog as catalog } from "../../lib/yo/italian/course/courseData";
import { emptyCourseProgress, recordCourseActivity, recordCourseAssessment, mergeCourseProgress, serializeCourseProgress, parseCourseProgress } from "../../lib/yo/italian/course/courseProgress";
import { useItalianCourseProgress } from "../../components/yo/italian/course/useItalianCourseProgress";
const require = createRequire(process.cwd() + "/package.json");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.org", pretendToBeVisual: true });
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, React, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
const { render, fireEvent, cleanup, act } = require("@testing-library/react");
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", { value: function () { this.setAttribute("open", ""); } });
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "close", { value: function () { this.removeAttribute("open"); } });
const cases: [string, () => void | Promise<void>][] = [];
const test = (name: string, run: () => void | Promise<void>) => cases.push([name, run]);
const first = catalog.units[0], second = catalog.units[1];
const empty = () => emptyCourseProgress();
const pass = (progress = empty(), unit = first, assisted = false) => {
  const assessment = catalog.assessments.find(item => item.id === unit.quizId)!;
  return recordCourseAssessment(progress, catalog, unit.quizId, assessment.questionCount, assessment.questionCount, assisted);
};
const journey = (progress = empty()) => buildCourseJourney(catalog, progress);
const view = (progress = empty(), ready = true) => <AdventureProgress journey={journey(progress)} world="italian" locale="en" ready={ready} />;

test("saved-result events belong to the target browser window, not the host runtime", () => {
  const original = globalThis.Event;
  let received = 0;
  const listener = () => { received++; };
  window.addEventListener("yo-adventure-evaluated", listener);
  Object.defineProperty(globalThis, "Event", { configurable: true, writable: true, value: class HostEvent {} });
  try { announceAdventureEvaluation(); assert.equal(received, 1); }
  finally {
    Object.defineProperty(globalThis, "Event", { configurable: true, writable: true, value: original });
    window.removeEventListener("yo-adventure-evaluated", listener);
  }
});

test("five states distinguish available access, practice completion and assessed mastery", () => {
  assert.equal(destinationState(journey().steps[0]), "available");
  assert.equal(destinationState(journey().steps[1]), "locked");
  let progress = recordCourseActivity(empty(), catalog, first.activityIds[0], false, false);
  assert.equal(destinationState(journey(progress).steps[0]), "progress");
  for (const id of first.activityIds) progress = recordCourseActivity(progress, catalog, id, true, true);
  assert.equal(destinationState(journey(progress).steps[0]), "completed");
  assert.equal(destinationState(journey(pass(progress)).steps[0]), "mastered");
});
test("halfway requires independently checked exercises, not self-reports or assisted practice", () => {
  let progress = empty();
  for (const id of first.activityIds) progress = recordCourseActivity(progress, catalog, id, true, true);
  assert.equal(adventureMilestones(journey(progress)).some(item => item.kind === "checkpoint"), false);
  const half = Math.ceil(first.activityIds.length / 2);
  for (const id of first.activityIds.slice(0, half - 1)) progress = recordCourseActivity(progress, catalog, id, true, false);
  assert.equal(adventureMilestones(journey(progress)).some(item => item.kind === "checkpoint"), false);
  progress = recordCourseActivity(progress, catalog, first.activityIds[half - 1], true, false);
  assert.equal(adventureMilestones(journey(progress)).filter(item => item.kind === "checkpoint").length, 1);
});
test("an independent challenge recognises mastery and opens the next goal, not the entire course", () => {
  const gained = newAdventureMilestones(adventureMilestones(journey()), adventureMilestones(journey(pass())));
  assert.deepEqual(gained.map(item => item.id), [first.id + ":mastery", second.id + ":unlock"]);
  assert.deepEqual(gained[0].skills, first.objectives);
  assert.equal(gained.some(item => item.kind === "finale"), false);
});
test("culture-only scores and assisted checkpoints cannot grant language mastery", () => {
  const fixture = { ...catalog, assessments: catalog.assessments.map(item => ({ ...item, theme: "culture" as const })) };
  assert.equal(buildCourseJourney(fixture, pass()).steps[0].passed, false);
  assert.equal(adventureMilestones(journey(pass(empty(), first, true))).some(item => item.kind === "mastery"), false);
});
test("finale requires both all units and the separate final assessment", () => {
  assert.equal(adventureMilestones(journey(), true).some(item => item.kind === "finale"), false);
  let progress = empty();
  for (const unit of catalog.units) progress = pass(progress, unit);
  assert.equal(adventureMilestones(journey(progress)).some(item => item.kind === "finale"), false);
  assert.equal(adventureMilestones(journey(progress), true).filter(item => item.kind === "finale").length, 1);
});
test("legacy checkpoints survive retries, parse and idempotent merges without duplicate trophies", () => {
  const earned = pass();
  const total = catalog.assessments.find(item => item.id === first.quizId)!.questionCount;
  const retry = recordCourseAssessment(earned, catalog, first.quizId, 0, total, false);
  const restored = parseCourseProgress(serializeCourseProgress(mergeCourseProgress(earned, retry)), catalog);
  assert.deepEqual(adventureMilestones(journey(earned)), adventureMilestones(journey(restored)));
  assert.equal(newAdventureMilestones(adventureMilestones(journey(earned)), adventureMilestones(journey(restored))).length, 0);
});
test("hydration recognises prior achievements without automatic ceremonies", () => {
  const v = render(view(pass(), false));
  v.rerender(view(pass(), true));
  assert.equal(v.container.querySelector("[data-celebration]"), null);
  assert.ok(v.getByRole("button", { name: /Replay celebration/ }));
});
test("saved local assessment -> mastery -> next destination; replay grants no new result", () => {
  const progress = pass(), original = serializeCourseProgress(progress);
  const v = render(view());
  act(() => { announceAdventureEvaluation(); v.rerender(view(progress)); });
  assert.equal(v.container.querySelector("[data-celebration]")?.getAttribute("data-celebration"), "mastery");
  fireEvent.click(v.getByRole("button", { name: "Replay celebration", exact: true }));
  assert.ok(v.container.querySelector("dialog")?.contains(document.activeElement));
  fireEvent.click(v.getAllByRole("button", { name: "Continue" })[0]);
  assert.equal(v.container.querySelector("[data-celebration]")?.getAttribute("data-celebration"), "unlock");
  assert.ok(v.container.querySelector("dialog")?.contains(document.activeElement));
  assert.ok(v.getByText(second.objectives[0].en));
  fireEvent.click(v.getAllByRole("button", { name: "Continue" })[0]);
  act(() => { announceAdventureEvaluation(); v.rerender(view(progress)); });
  assert.equal(v.container.querySelector("[data-celebration]"), null);
  fireEvent.click(v.getByRole("button", { name: /^Replay celebration :/ }));
  assert.equal(v.container.querySelector("[data-celebration]")?.getAttribute("data-celebration"), "mastery");
  assert.equal(serializeCourseProgress(progress), original);
});
test("incoming progress is silent, including after a local attempt that earned nothing", () => {
  const v = render(view());
  act(() => announceAdventureEvaluation());
  v.rerender(view(pass()));
  assert.equal(v.container.querySelector("[data-celebration]"), null);
});
test("reload and hidden app do not repeat a just-dismissed milestone", () => {
  const v = render(view());
  act(() => { announceAdventureEvaluation(); v.rerender(view(pass())); });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  assert.equal(v.container.querySelector("[data-celebration]"), null);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  v.unmount();
  assert.equal(render(view(pass())).container.querySelector("[data-celebration]"), null);
});
test("real persistence handler announces only a successfully saved evaluation", () => {
  function Harness() {
    const state = useItalianCourseProgress(catalog, "adventure-test");
    return <><button onClick={() => state.recordAssessment(first.quizId, 5, 5, false)}>Evaluate</button>{view(state.progress, state.ready)}</>;
  }
  const v = render(<Harness />);
  fireEvent.click(v.getByRole("button", { name: "Evaluate" }));
  assert.ok(localStorage.getItem("adventure-test"));
  assert.ok(v.container.querySelector('[data-celebration="mastery"]'));
});
test("failed persistence keeps learning usable but never announces a saved reward", () => {
  const storage = Object.getOwnPropertyDescriptor(window, "localStorage")!;
  Object.defineProperty(window, "localStorage", { configurable: true, get() { throw Error("Blocked"); } });
  try {
    function Harness() {
      const state = useItalianCourseProgress(catalog, "adventure-test");
      return <><button onClick={() => state.recordAssessment(first.quizId, 5, 5, false)}>Evaluate</button>{view(state.progress, state.ready)}</>;
    }
    const v = render(<Harness />);
    fireEvent.click(v.getByRole("button", { name: "Evaluate" }));
    assert.equal(v.container.querySelector("[data-celebration]"), null);
  } finally { Object.defineProperty(window, "localStorage", storage); }
});
test("eight cultural visual themes share the same semantic states without fabricated mastery", () => {
  const paths = ["italien", "allemand", "portugais", "japonais", "mandarin", "francais", "anglais", "espagnol"];
  const worlds = paths.map(path => adventureWorld("/yo/langues/" + path));
  assert.equal(new Set(worlds).size, 8);
  for (const world of worlds) {
    const v = render(<AdventureScenery world={world} state="completed" />);
    assert.equal(v.container.querySelector("svg")?.getAttribute("data-evolved"), "false");
    v.rerender(<AdventureScenery world={world} state="mastered" />);
    assert.equal(v.container.querySelector("svg")?.getAttribute("data-evolved"), "true");
    v.unmount();
  }
});
test("motion is bounded and reduced-motion disables celebrations; no motion on restored maps", () => {
  assert.match(adventureCss, /prefers-reduced-motion: reduce/);
  assert.match(adventureCss, /\.yo-adventure-celebration \{ animation: none/);
  assert.doesNotMatch(adventureCss, /infinite|flash|blink/);
  assert.match(adventureCss, /\.yo-adventure-celebration \.yo-adventure-open-gate/);
});

test("an unseen remote result merged during a local attempt is recognised without a ceremony", () => {
  function Harness() {
    const state = useItalianCourseProgress(catalog, "adventure-merge-test");
    return <><button onClick={() => state.recordActivity(first.activityIds[0], false, false)}>Attempt</button><button onClick={() => state.recordAssessment(second.quizId, 5, 5, false)}>Next mission</button>{view(state.progress, state.ready)}</>;
  }
  const v = render(<Harness />);
  localStorage.setItem("adventure-merge-test", serializeCourseProgress(pass()));
  fireEvent.click(v.getByRole("button", { name: "Attempt" }));
  assert.equal(v.container.querySelector("[data-celebration]"), null);
  assert.ok(v.getByRole("button", { name: /^Replay celebration :/ }));
  fireEvent.click(v.getByRole("button", { name: "Next mission" }));
  assert.equal(v.container.querySelector("[data-celebration]")?.getAttribute("data-celebration"), "mastery");
});

class Voice {
  frequency = { value: 0 }; type = ""; stopped = 0; onended?: () => void; starts: number[] = [];
  connect() {} disconnect() {} start(at: number) { this.starts.push(at); } stop() { this.stopped++; }
}
const voices: Voice[] = [];
class AudioContextMock {
  state = "running"; currentTime = 0; destination = {};
  async resume() { this.state = "running"; }
  createOscillator() { const voice = new Voice(); voices.push(voice); return voice; }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
}
window.AudioContext = AudioContextMock as unknown as typeof AudioContext;
test("original sounds are distinct, short and interrupted by lesson audio and app hiding", async () => {
  const stop = listenForAdventureInterruptions();
  for (const kind of ["unlock", "checkpoint", "mastery", "finale", "retry"] as const) {
    const before = voices.length;
    assert.equal(await playAdventureSound(kind), true);
    assert.deepEqual(voices.slice(before).map(voice => voice.frequency.value), [...adventureScore[kind]]);
    assert.ok(Math.max(...voices.slice(before).flatMap(voice => voice.starts)) < 1);
  }
  const latest = voices.at(-1)!; const before = latest.stopped;
  window.dispatchEvent(new Event("yo-mandarin-audio-stop"));
  assert.ok(latest.stopped > before);
  const pending = playAdventureSound("mastery");
  stopAdventureSound();
  assert.equal(await pending, false);
  stop();
});
test("effects preference is remembered independently of recorded lesson audio", async () => {
  const v = render(view());
  const checkbox = v.getByRole("checkbox", { name: "Sound effects" });
  assert.equal(checkbox.checked, false);
  await act(async () => fireEvent.click(checkbox));
  assert.equal(localStorage.getItem(EFFECTS_KEY), "false");
  v.unmount();
  const next = render(view());
  assert.equal(next.getByRole("checkbox", { name: "Sound effects" }).checked, true);
});
test("all three interface locales retain explicit mastery and access caveats", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const v = render(<AdventureProgress journey={journey(pass())} world="italian" locale={locale} ready />);
    assert.equal(v.container.querySelectorAll("input[type=checkbox]").length, 1);
    assert.ok(v.container.textContent.length > 50);
    v.unmount();
  }
});
let failures = 0;
(async () => {
  for (const [name, run] of cases) {
    cleanup(); localStorage.clear(); stopAdventureSound();
    try { await run(); console.log("PASS " + name); } catch (error) { failures++; console.error("FAIL " + name, error); }
  }
  cleanup(); dom.window.close();
  console.log(`${cases.length - failures}/${cases.length} adventure checks passed`);
  if (failures) process.exitCode = 1;
})();
