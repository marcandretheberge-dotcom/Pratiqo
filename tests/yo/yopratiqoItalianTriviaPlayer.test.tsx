/** Browser-style Trivia interaction tests, with audio events and real React state.
 * Nothing here creates a course score, Pass balance or backend record. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { emptyCourseProgress, recordCourseActivity } from "@/lib/yo/italian/course/courseProgress";
import { personalizedItalianCatalog, personalizedItalianUnits } from "@/lib/yo/personalized/courseData";
import { buildItalianTrivia, triviaSouvenirKey } from "@/lib/yo/italian/trivia";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/italien/parcours/u01", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const requestAnimationFrame = (callback: FrameRequestCallback) => { const id = ++frameId; frames.set(id, callback); return id; };
const cancelAnimationFrame = (id: number) => { frames.delete(id); };
const globals = {
  window: dom.window, self: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent, MutationObserver: dom.window.MutationObserver,
  requestAnimationFrame, cancelAnimationFrame, localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
};
for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
class FakeAudio extends dom.window.EventTarget {
  src: string;
  preload = "none";
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  constructor(src: string) { super(); this.src = src; }
  play() { this.dispatchEvent(new Event("playing")); return Promise.resolve(); }
  pause() {}
  removeAttribute() { this.src = ""; }
  load() {}
}
dom.window.Audio = FakeAudio as unknown as typeof Audio;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audio.example.test";
const { ItalianTriviaCheckpoint } = require("@/components/yo/italian/guided/ItalianTriviaCheckpoint") as typeof import("@/components/yo/italian/guided/ItalianTriviaCheckpoint");
const { ItalianAudioProvider } = require("@/components/yo/italian/ItalianAudioProvider") as typeof import("@/components/yo/italian/ItalianAudioProvider");
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const unit = personalizedItalianUnits[0];
const questions = buildItalianTrivia(unit);
const paths = Object.fromEntries(questions.flatMap(q => q.audioText ? [[q.audioText, "/audio/yo/trivia-fake.mp3"]] : []));
let studied = emptyCourseProgress();
for (const lesson of unit.lessons.slice(0, 2)) {
  for (const activity of lesson.activities) studied = recordCourseActivity(studied, personalizedItalianCatalog, activity.id, true, false);
}
function flush() {
  for (let round = 0; round < 12 && frames.size; round++) {
    const pending = [...frames.values()]; frames.clear();
    act(() => pending.forEach(callback => callback(0)));
  }
  assert.equal(frames.size, 0, "all queued DOM effects settled");
}
function click(element: HTMLElement) { fireEvent.click(element); flush(); }
function mount(progress = studied) {
  const node = <ItalianAudioProvider paths={paths}><ItalianTriviaCheckpoint unit={unit} locale="en" progress={progress} /></ItalianAudioProvider>;
  const view = render(node);
  flush();
  return view;
}
function playRound(view: ReturnType<typeof render>, assistedIndex = -1) {
  click(view.getByRole("button", { name: "Play Trivia" }));
  for (const [index, question] of questions.entries()) {
    assert.ok(view.getByText(question.prompt.en));
    if (question.audioText) {
      if (index === assistedIndex) click(view.getByRole("button", { name: "Reveal expression (assisted)" }));
      else click(view.getByRole("button", { name: /Listen/ }));
    }
    const group = within(view.getByRole("group", { name: "Play Trivia" }));
    const buttons = group.getAllByRole("button");
    assert.equal(buttons.length, 4);
    click(buttons[Number(question.correctOptionId)]);
    assert.ok(view.getByText("Well done!"));
    click(view.getByRole("button", { name: index === questions.length - 1 ? "See my score" : "Next question" }));
  }
}
const cases: [string, () => void][] = [
  ["Trivia stays unavailable before the learner has completed half the missions", () => {
    const view = mount(emptyCourseProgress());
    assert.equal(view.container.querySelector("[data-trivia-eligible]")?.getAttribute("data-trivia-eligible"), "false");
    assert.equal(view.queryByRole("button", { name: "Play Trivia" }), null);
    assert.ok(view.getByText(/Finish the first half/));
  }],
  ["five unique questions produce exactly one independent local medal, without course writes", () => {
    const view = mount();
    playRound(view);
    assert.ok(view.getByText("Medal earned!"));
    assert.equal(JSON.parse(localStorage.getItem(triviaSouvenirKey(unit.id))!).bestCorrect, 5);
    assert.equal(localStorage.length, 1, "the Trivia round only writes its cosmetic souvenir");
    assert.equal(view.queryByText("Good opportunity to review."), null);
  }],
  ["revealing a listening answer marks the round assisted, not independently mastered", () => {
    const view = mount();
    const targetIndex = questions.findIndex(q => q.mode === "listening");
    assert.ok(targetIndex >= 0);
    playRound(view, targetIndex);
    assert.ok(view.getByText("Review these expressions and play again."));
    assert.equal(JSON.parse(localStorage.getItem(triviaSouvenirKey(unit.id))!).bestCorrect, 0);
  }],
];
let failures = 0;
for (const [title, run] of cases) {
  cleanup(); localStorage.clear(); frames.clear();
  try { run(); console.log(`PASS ${title}`); }
  catch (error) { failures++; console.error(`FAIL ${title}`, error); }
  finally { cleanup(); frames.clear(); }
}
console.log(`${cases.length - failures}/${cases.length} interactive Trivia checks passed`);
if (failures) process.exitCode = 1;
