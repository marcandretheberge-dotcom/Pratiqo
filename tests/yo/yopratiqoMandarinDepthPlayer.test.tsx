import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { MandarinCoursePlayer, mandarinStages } from "@/components/yo/mandarin/MandarinCoursePlayer";
import { MandarinCourseHome } from "@/components/yo/mandarin/MandarinCourseHome";
import { MandarinAudio } from "@/components/yo/mandarin/MandarinAudio";
import { useMandarinProgress } from "@/components/yo/mandarin/useMandarinProgress";
import { mandarinUnits, mandarinFinal, mandarinExtendedFinal, MANDARIN_LANGUAGE_SOURCE } from "@/lib/yo/mandarin/course";
import { emptyProgress, MANDARIN_PROGRESS_KEY, parseProgress, restartMandarinAttempt } from "@/lib/yo/mandarin/progress";
import { serializeMandarinProgress, stampMandarinUpdate, resetMandarinProgress } from "@/lib/yo/mandarin/progressSync";
import { mandarinJourneyUnits, mandarinFinalIds, mandarinLegacyFinalIds, mandarinCourseReviewIds } from "@/lib/yo/foundationJourneyCatalogs";
import type { Exercise, Progress, Unit } from "@/lib/yo/mandarin/types";
import { writeMissionCinema } from "@/lib/yo/travelCinema";
import { REVIEW_STORAGE_PREFIX, type ReviewAttempt } from "@/lib/yo/review/state";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/mandarin/parcours", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
const audios: FakeAudio[] = [];
class FakeAudio {
  onended: (() => void) | null = null; onplaying: (() => void) | null = null;
  onerror: (() => void) | null = null; onwaiting: (() => void) | null = null;
  preload = "none"; playbackRate = 1; preservesPitch = true; paused = false;
  constructor(public src: string) { audios.push(this); }
  play() { this.onplaying?.(); return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute() {} load() {}
}
for (const [key, value] of Object.entries({ React, window: dom.window, self: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent,
  MutationObserver: dom.window.MutationObserver, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  getComputedStyle: dom.window.getComputedStyle, Audio: FakeAudio,
  requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; },
  cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
dom.window.HTMLElement.prototype.scrollIntoView = () => {}; dom.window.HTMLElement.prototype.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
dom.window.HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute("open"); };
dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
window.matchMedia = (media: string) => ({ media, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => true });
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const cases: Array<[string, () => Promise<void> | void]> = [];
const remoteActor = "m-fffffffffffffffe";
const pass = { passed: true, independent: true, attempts: 1, review: false };
const saved = () => parseProgress(localStorage.getItem(MANDARIN_PROGRESS_KEY));
function receipts(): ReviewAttempt[] {
  return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(key => key.startsWith(`${REVIEW_STORAGE_PREFIX}zh.`)).map(key => JSON.parse(localStorage.getItem(key)!));
}
async function flush() { await act(async () => { for (let i = 0; i < 15 && frames.size; i++) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0)); } await Promise.resolve(); }); }
function seed(unit: Unit, exercise: Exercise, patch: Partial<Progress> = {}) {
  const progress = { ...emptyProgress(), ...patch };
  for (const previous of mandarinUnits.filter(item => item.number < unit.number)) for (const item of previous.exercises) progress.results[item.id] ??= { ...pass };
  progress.unit = unit.id;
  progress.steps[unit.id] = mandarinStages(unit).indexOf(exercise.id);
  localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify(progress));
  writeMissionCinema("zh:foundations", { seen: [`mission-start:${unit.id}:start`], queue: [] });
}
function player(unit: Unit) {
  const legacy = unit.id === "bilan";
  return <MandarinCoursePlayer unit={unit} locale="en" journeyUnits={legacy ? mandarinJourneyUnits.slice(0, 8) : mandarinJourneyUnits} finalIds={legacy ? mandarinLegacyFinalIds : mandarinFinalIds}/>;
}
function choose(view: View, exercise: Exercise) {
  assert.ok("choices" in exercise);
  const option = exercise.choices.find(item => item.id === exercise.answer)!;
  const label = option.phrase ? `${option.phrase.hanzi}${(view.getByRole("checkbox", { name: "Pinyin" }) as HTMLInputElement).checked ? ` ${option.phrase.pinyin}` : ""}` : option.label!.en;
  fireEvent.click(view.getByRole("button", { name: label }));
}
function submit(view: View, exercise: Exercise) {
  if (exercise.kind === "write") fireEvent.change(view.getByRole("textbox", { name: "Your answer" }), { target: { value: exercise.model.hanzi } });
  else choose(view, exercise);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
}
function remoteWrite(transform: (value: Progress) => Progress) {
  const base = saved();
  const remote = stampMandarinUpdate(base, transform(base), base, remoteActor);
  localStorage.setItem(MANDARIN_PROGRESS_KEY, serializeMandarinProgress(remote)!);
  return remote;
}

cases.push(["default-visible pinyin stays assisted through hide/reload; an explicit new unaided attempt clears its own evidence", async () => {
  const unit = mandarinUnits[0], exercise = unit.exercises.find(item => item.kind === "roleplay" && item.choices.some(choice => choice.phrase))!;
  seed(unit, exercise);
  let view = render(player(unit)); await flush();
  assert.equal(saved().drafts[exercise.id].assisted, true);
  fireEvent.click(view.getByRole("checkbox", { name: "Pinyin" }));
  assert.equal(saved().drafts[exercise.id].hint, false, "hiding pronunciation does not reveal the full answer as a side effect");
  view.unmount(); view = render(player(unit)); await flush();
  submit(view, exercise);
  assert.equal(saved().results[exercise.id].independent, false);
  assert.equal(saved().results[exercise.id].attempts, 1);
  assert.equal(receipts().length, 1); assert.equal(receipts()[0].assisted, true);
  view.unmount(); view = render(player(unit)); await flush();
  assert.ok(view.getByText("Completed with help"));
  assert.equal(saved().results[exercise.id].attempts, 1); assert.equal(receipts().length, 1);
  fireEvent.click(view.getByRole("button", { name: "Start again without help" }));
  assert.equal(saved().drafts[exercise.id].generation, 1);
  assert.equal(saved().drafts[exercise.id].answer, "");
  assert.equal(saved().drafts[exercise.id].assisted, false);
  assert.equal(saved().pinyin, false); assert.equal(saved().translation, false);
  submit(view, exercise);
  assert.equal(saved().results[exercise.id].independent, true);
  assert.equal(saved().results[exercise.id].attempts, 2);
  assert.equal(receipts().length, 2); assert.equal(receipts()[1].assisted, false);
  const before = localStorage.getItem(MANDARIN_PROGRESS_KEY);
  act(() => window.dispatchEvent(new window.StorageEvent("storage", { key: MANDARIN_PROGRESS_KEY, storageArea: localStorage, newValue: before })));
  view.unmount(); render(player(unit)); await flush();
  assert.equal(saved().results[exercise.id].attempts, 2); assert.equal(receipts().length, 2);
}]);

cases.push(["a historical independent result stays valid while new source translation is counted as assistance", async () => {
  const unit = mandarinUnits[8], exercise = unit.exercises.find(item => item.stimulus)!;
  seed(unit, exercise, { pinyin: false, translation: true, results: { [exercise.id]: { ...pass, attempts: 4 } } });
  const view = render(player(unit)); await flush();
  assert.ok(view.getByRole("article", { name: "Message to read" }));
  assert.ok(view.getByText(exercise.stimulus!.meaning.en));
  fireEvent.click(view.getByRole("checkbox", { name: "Translation" }));
  submit(view, exercise);
  assert.equal(saved().results[exercise.id].independent, true, "existing independent evidence is not retroactively removed");
  assert.equal(saved().results[exercise.id].review, true);
  assert.equal(saved().drafts[exercise.id].assisted, true);
  assert.equal(receipts()[0].assisted, true);
}]);

cases.push(["new written recall does not leak its model; toggling irrelevant display preferences is not assistance and IME is never graded mid-composition", async () => {
  const unit = mandarinUnits[8], exercise = unit.exercises.find(item => item.id === "zh-u09-ime")!;
  seed(unit, exercise);
  const view = render(player(unit)); await flush();
  assert.equal(view.queryByText(exercise.model.hanzi), null);
  assert.equal(view.queryByText(exercise.model.pinyin), null);
  assert.equal(saved().drafts[exercise.id]?.assisted ?? false, false);
  fireEvent.click(view.getByRole("checkbox", { name: "Pinyin" }));
  fireEvent.click(view.getByRole("checkbox", { name: "Translation" }));
  const input = view.getByRole("textbox", { name: "Your answer" });
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: exercise.model.hanzi } });
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.equal(saved().results[exercise.id], undefined);
  fireEvent.compositionEnd(input);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.equal(saved().results[exercise.id].independent, true);
  assert.equal(saved().results[exercise.id].attempts, 1);
}]);

cases.push(["submission reads remote help already on disk before its storage event arrives", async () => {
  const unit = mandarinUnits[8], exercise = unit.exercises.find(item => item.kind === "write")!;
  seed(unit, exercise, { pinyin: false, translation: false });
  const view = render(player(unit)); await flush();
  fireEvent.change(view.getByRole("textbox"), { target: { value: exercise.model.hanzi } });
  remoteWrite(value => ({ ...value, drafts: { ...value.drafts, [exercise.id]: { ...value.drafts[exercise.id], hint: true, assisted: true } } }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.equal(saved().results[exercise.id].independent, false);
  assert.equal(saved().results[exercise.id].review, true);
  assert.equal(saved().drafts[exercise.id].checked, true);
  assert.equal(saved().drafts[exercise.id].assisted, true);
  assert.equal(receipts().length, 1); assert.equal(receipts()[0].assisted, true);
}]);

cases.push(["a remote restart or already checked draft rejects a stale submit before its storage event arrives", async () => {
  const unit = mandarinUnits[8], exercise = unit.exercises.find(item => item.kind === "write")!;
  seed(unit, exercise, { pinyin: false, translation: false });
  const view = render(player(unit)); await flush();
  fireEvent.change(view.getByRole("textbox"), { target: { value: exercise.model.hanzi } });
  remoteWrite(value => ({ ...value, drafts: { ...value.drafts, [exercise.id]: restartMandarinAttempt(exercise, value.drafts[exercise.id], true) } }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.equal(saved().results[exercise.id], undefined);
  assert.equal(saved().drafts[exercise.id].generation, 1);
  assert.equal((view.getByRole("textbox") as HTMLInputElement).value, "");
  assert.equal(receipts().length, 0);
  fireEvent.change(view.getByRole("textbox"), { target: { value: exercise.model.hanzi } });
  remoteWrite(value => ({ ...value, drafts: { ...value.drafts, [exercise.id]: { ...value.drafts[exercise.id], checked: true, correct: true } }, results: { ...value.results, [exercise.id]: { ...pass } } }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.equal(saved().results[exercise.id].attempts, 1);
  assert.equal(receipts().length, 0, "restoring another tab’s checked draft creates no local review receipt");
}]);

type Handle = ReturnType<typeof useMandarinProgress>;
const handles: Record<string, Handle> = {};
function Probe({ id }: { id: string }) {
  const value = useMandarinProgress();
  React.useLayoutEffect(() => { handles[id] = value; }, [id, value]);
  return <output data-testid={id}>{JSON.stringify({ ready: value.ready, stored: value.stored, progress: value.progress })}</output>;
}
function resultUpdate(value: Progress, id: string) { return { ...value, results: { ...value.results, [id]: { ...pass, attempts: (value.results[id]?.attempts ?? 0) + 1 } } }; }
cases.push(["two real hook instances merge updates and ignore delayed remove/clear events and other storage areas", async () => {
  render(<><Probe id="a"/><Probe id="b"/></>); await flush();
  act(() => { handles.a.update(value => resultUpdate(value, "zh-u09-recall-1")); });
  assert.equal(handles.b.progress.results["zh-u09-recall-1"].attempts, 1);
  const newer = remoteWrite(value => resultUpdate(value, "zh-u10-recall-1"));
  for (const key of [MANDARIN_PROGRESS_KEY, null]) act(() => window.dispatchEvent(new window.StorageEvent("storage", { key, storageArea: localStorage, newValue: null })));
  assert.deepEqual(Object.keys(saved().results).sort(), ["zh-u09-recall-1", "zh-u10-recall-1"]);
  assert.equal(saved().resetAt, undefined, "stale removal payload must not create a dominant reset epoch");
  const before = localStorage.getItem(MANDARIN_PROGRESS_KEY);
  const unrelated = resetMandarinProgress(newer, remoteActor);
  act(() => window.dispatchEvent(new window.StorageEvent("storage", { key: MANDARIN_PROGRESS_KEY, storageArea: sessionStorage, newValue: serializeMandarinProgress(unrelated) })));
  assert.equal(localStorage.getItem(MANDARIN_PROGRESS_KEY), before);
  act(() => { handles.b.update(value => resultUpdate(value, "zh-u11-recall-1")); });
  assert.equal(Object.keys(handles.a.progress.results).length, 3);
}]);

cases.push(["reset wins over stale callbacks and delayed old writes; a genuine external deletion persists a reset tombstone", async () => {
  render(<><Probe id="a"/><Probe id="b"/></>); await flush();
  act(() => { handles.a.update(value => resultUpdate(value, "zh-u09-recall-1")); });
  const stale = handles.a.update, old = localStorage.getItem(MANDARIN_PROGRESS_KEY)!;
  localStorage.setItem("unrelated-course", "keep");
  act(() => { handles.b.reset(); });
  assert.deepEqual(saved().results, {});
  let accepted = true;
  act(() => { accepted = stale(value => resultUpdate(value, "zh-u10-recall-1")); });
  assert.equal(accepted, false);
  act(() => window.dispatchEvent(new window.StorageEvent("storage", { key: MANDARIN_PROGRESS_KEY, storageArea: localStorage, newValue: old })));
  assert.deepEqual(saved().results, {});
  const resetAt = saved().resetAt!;
  act(() => { handles.a.update(value => resultUpdate(value, "zh-u12-recall-1")); });
  localStorage.removeItem(MANDARIN_PROGRESS_KEY);
  act(() => window.dispatchEvent(new window.StorageEvent("storage", { key: MANDARIN_PROGRESS_KEY, storageArea: localStorage, newValue: null })));
  assert.deepEqual(saved().results, {});
  assert.ok(saved().resetAt! > resetAt);
  assert.equal(localStorage.getItem("unrelated-course"), "keep");
}]);

cases.push(["failed browser storage keeps the current attempt in memory and reports unavailable persistence", async () => {
  render(<Probe id="a"/>); await flush();
  const prototype = Object.getPrototypeOf(localStorage), original = prototype.setItem;
  prototype.setItem = function (key: string, value: string) { if (key === MANDARIN_PROGRESS_KEY) throw new Error("Quota exceeded"); return original.call(this, key, value); };
  try {
    act(() => { handles.a.update(value => resultUpdate(value, "zh-u09-recall-1")); });
    assert.equal(handles.a.stored, false);
    assert.equal(handles.a.progress.results["zh-u09-recall-1"].attempts, 1);
    act(() => window.dispatchEvent(new Event("focus")));
    assert.equal(handles.a.progress.results["zh-u09-recall-1"].attempts, 1);
    assert.equal(localStorage.getItem(MANDARIN_PROGRESS_KEY), null);
  } finally { prototype.setItem = original; }
  act(() => { handles.a.update(value => resultUpdate(value, "zh-u10-recall-1")); });
  assert.equal(handles.a.stored, true);
  assert.equal(saved().results["zh-u09-recall-1"].attempts, 1);
}]);

cases.push(["the home keeps the original review route, results and resume position without opening the new final", async () => {
  const exercise = mandarinFinal.exercises[3];
  seed(mandarinFinal, exercise);
  for (const item of mandarinFinal.exercises) remoteWrite(value => resultUpdate(value, item.id));
  const view = render(<MandarinCourseHome locale="en" units={mandarinJourneyUnits} finalIds={mandarinFinalIds} legacyFinalIds={mandarinLegacyFinalIds} reviewIds={mandarinCourseReviewIds} languageSource={MANDARIN_LANGUAGE_SOURCE}/>); await flush();
  assert.equal(view.getByRole("link", { name: "Resume my session" }).getAttribute("href"), "/yo/langues/mandarin/parcours/bilan-initial?lang=en");
  assert.equal(view.getByRole("link", { name: "Return to the original eight-unit review" }).getAttribute("href"), "/yo/langues/mandarin/parcours/bilan-initial?lang=en");
  assert.equal(view.queryByRole("link", { name: "Twelve-unit review: read and respond" }), null);
  assert.equal(saved().steps.bilan, 3);
  assert.equal(mandarinFinalIds.some(id => saved().results[id]), false);
}]);

cases.push(["both finals save real checked answers without adding final content to the SRS queue", async () => {
  for (const unit of [mandarinFinal, mandarinExtendedFinal]) {
    cleanup(); localStorage.clear();
    const exercise = unit.exercises.find(item => "choices" in item)!;
    seed(unit, exercise, { pinyin: false, translation: false });
    const view = render(player(unit)); await flush();
    submit(view, exercise);
    assert.equal(saved().results[exercise.id].attempts, 1);
    assert.equal(saved().results[exercise.id].independent, true);
    assert.equal(receipts().length, 0);
    view.unmount(); render(player(unit)); await flush();
    assert.equal(saved().results[exercise.id].attempts, 1);
  }
}]);

cases.push(["unpublished phrases show honest recording availability and existing recordings stop for nearby speech or cinema", async () => {
  let view = render(<MandarinAudio text={mandarinUnits[8].vocabulary[0].hanzi} locale="en"/>);
  assert.ok(view.getByText("No published recording for this phrase. Practise with the text and pinyin."));
  assert.equal(view.queryByRole("button", { name: /Listen/ }), null); assert.equal(audios.length, 0);
  view.unmount(); view = render(<MandarinAudio text="你好！" locale="en"/>);
  fireEvent.click(view.getByRole("button", { name: "Listen : 你好！" }));
  assert.equal(audios.length, 1);
  act(() => window.dispatchEvent(new Event("yo-speech-start")));
  assert.equal(audios[0].paused, true);
  fireEvent.click(view.getByRole("button", { name: "Listen : 你好！" }));
  act(() => window.dispatchEvent(new Event("yo-cinema-open")));
  assert.equal(audios[1].paused, true);
}]);

async function main() {
  for (const [name, run] of cases) {
    cleanup(); frames.clear(); localStorage.clear(); sessionStorage.clear(); audios.length = 0;
    await run(); await flush();
    console.log(`PASS ${name}`);
  }
  cleanup(); dom.window.close();
}
void main().catch(error => { cleanup(); dom.window.close(); console.error(error); process.exitCode = 1; });
