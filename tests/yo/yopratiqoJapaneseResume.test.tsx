import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { japaneseCourseUnits, japaneseCourseSources, japaneseExtendedFinalAssessment } from "@/lib/yo/japaneseCourse";
import { emptyJapaneseProgress, JAPANESE_PROGRESS_KEY, japaneseUnitPracticeIds, parseJapaneseProgress } from "@/lib/yo/japaneseCourseProgress";
import type { JapaneseCourseUnit, JapaneseReadingActivity } from "@/lib/yo/japaneseCourseTypes";
import { japaneseActivityDraftKey } from "@/lib/yo/japaneseActivityDraft";
import { REVIEW_STORAGE_PREFIX } from "@/lib/yo/review/state";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/japonais/parcours/module-1", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0, plays = 0, requests = 0;
for (const [key, value] of Object.entries({ React, window: dom.window, self: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
  NodeFilter: dom.window.NodeFilter, DocumentFragment: dom.window.DocumentFragment, Event: dom.window.Event, CustomEvent: dom.window.CustomEvent,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; }, cancelAnimationFrame: (id: number) => frames.delete(id),
  fetch: async () => { requests++; throw new Error("No network expected"); }, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
Object.defineProperty(window, "matchMedia", { value: (media: string) => ({ media, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
dom.window.HTMLMediaElement.prototype.play = () => { plays++; return Promise.resolve(); };
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const { JapaneseCoursePlayer } = require("@/components/yo/japanese/JapaneseCoursePlayer") as typeof import("@/components/yo/japanese/JapaneseCoursePlayer");
const unit = japaneseCourseUnits[0], reading = unit.activities.find(activity => activity.kind === "reading") as JapaneseReadingActivity;
const choice = unit.activities[0];
const journeyUnits = japaneseCourseUnits.map(item => ({ id: item.slug, number: item.number, title: item.title, subtitle: item.subtitle, objectives: item.goals, activityIds: japaneseUnitPracticeIds(item) }));
const finalIds = japaneseExtendedFinalAssessment.map(item => item.id);
const cases: Array<[string, () => Promise<void> | void]> = [];
type View = ReturnType<typeof render>;
function player(authored: JapaneseCourseUnit = unit, locale: YoLocale = "en") {
  return <JapaneseCoursePlayer unit={authored} locale={locale} sources={japaneseCourseSources} journeyUnits={journeyUnits} finalIds={finalIds}/>;
}
async function flush() { await act(async () => { for (let i = 0; i < 20 && frames.size; i++) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); } await Promise.resolve(); }); }
async function mount(authored = unit, locale: YoLocale = "en") {
  const view = render(player(authored, locale)); await flush();
  for (let i = 0; i < 3; i++) { const skip = view.queryByRole("button", { name: /^(Skip|Passer|Saltar)$/ }); if (!skip) break; fireEvent.click(skip); await flush(); }
  return view;
}
function panel(view: View, id = reading.id) { const node = view.container.querySelector(`[data-japanese-activity="${id}"]`); assert.ok(node); return within(node as HTMLElement); }
function select(view: View, id: string, authored = unit) {
  const index = 6 + authored.activities.findIndex(item => item.id === id); assert.ok(index >= 6);
  fireEvent.change(within(view.container).getByRole("combobox", { name: "Step" }), { target: { value: String(index) } });
}
function progress() { return parseJapaneseProgress(localStorage.getItem(JAPANESE_PROGRESS_KEY)); }
function reviewEvents() { return Object.keys(localStorage).filter(key => key.startsWith(REVIEW_STORAGE_PREFIX)).sort().map(key => [key, localStorage.getItem(key)]); }
function seed(id = reading.id) { localStorage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify({ ...emptyJapaneseProgress(), lastSteps: { [unit.slug]: id } })); }
function storageEvent(key: string | null, storageArea = localStorage, newValue = localStorage.getItem(key ?? "")) {
  window.dispatchEvent(new dom.window.StorageEvent("storage", { key, storageArea, newValue }));
}

cases.push(["help and unfinished Japanese text survive real unmount, locale change, and checked restoration without another result", async () => {
  seed(); let view = await mount();
  fireEvent.click(panel(view).getByRole("button", { name: "A hint from Yoppo" }));
  fireEvent.change(panel(view).getByRole("textbox"), { target: { value: "なま" } });
  assert.deepEqual(progress().results, {}); assert.deepEqual(reviewEvents(), []);
  view.unmount(); view = await mount(unit, "fr");
  assert.equal((panel(view).getByRole("textbox") as HTMLInputElement).value, "なま");
  assert.ok(panel(view).getByText(reading.hint.fr));
  fireEvent.click(panel(view).getByRole("button", { name: "Un indice avec Yoppo" }));
  fireEvent.change(panel(view).getByRole("textbox"), { target: { value: reading.answer } });
  fireEvent.click(panel(view).getByRole("button", { name: "Vérifier" }));
  assert.deepEqual(progress().results[reading.id], { passed: true, independent: false, attempts: 1, needsReview: true });
  const outcomes = JSON.stringify(progress().results), events = reviewEvents(); assert.equal(events.length, 1);
  view.unmount(); view = await mount();
  assert.equal((panel(view).getByRole("textbox") as HTMLInputElement).disabled, true);
  assert.ok(panel(view).getByText("Completed with help")); assert.equal(panel(view).queryByRole("button", { name: "Check" }), null);
  assert.equal(JSON.stringify(progress().results), outcomes); assert.deepEqual(reviewEvents(), events);
  fireEvent.click(panel(view).getByRole("button", { name: "Try again" }));
  assert.equal((panel(view).getByRole("textbox") as HTMLInputElement).value, "");
  fireEvent.change(panel(view).getByRole("textbox"), { target: { value: reading.answer } });
  fireEvent.click(panel(view).getByRole("button", { name: "Check" }));
  assert.equal(progress().results[reading.id].attempts, 2); assert.equal(progress().results[reading.id].independent, true);
}]);

cases.push(["two rendered tabs preserve different activity drafts and merge unseen help before accepting Check", async () => {
  seed(); const a = await mount(), b = await mount(); select(b, choice.id);
  fireEvent.change(panel(a).getByRole("textbox"), { target: { value: reading.answer } });
  assert.ok("choices" in choice);
  fireEvent.click(panel(b, choice.id).getByRole("button", { name: choice.choices[0].ja ?? choice.choices[0].label!.en }));
  select(b, reading.id);
  fireEvent.click(panel(b).getByRole("button", { name: "A hint from Yoppo" }));
  assert.equal(panel(a).queryByText(reading.hint.en), null, "A has not received B's storage event");
  fireEvent.click(panel(a).getByRole("button", { name: "Check" }));
  assert.equal(progress().results[reading.id].independent, false); assert.equal(progress().results[reading.id].attempts, 1);
  a.unmount(); b.unmount(); const restored = await mount(); select(restored, choice.id);
  assert.equal(panel(restored, choice.id).getByRole("button", { name: choice.choices[0].ja ?? choice.choices[0].label!.en }).getAttribute("aria-pressed"), "true");
}]);

cases.push(["a transcript and selected option resume with help but never replay or create listening evidence", async () => {
  const listening = unit.activities.find(item => item.kind === "listening"); assert.ok(listening && "choices" in listening && listening.stimulus);
  seed(listening.id); let view = await mount();
  let current = panel(view, listening.id);
  fireEvent.click(current.getByRole("button", { name: "Read the transcript" }));
  const answer = listening.choices.find(item => item.id === listening.answerId)!;
  fireEvent.click(current.getByRole("button", { name: answer.ja ?? answer.label!.en }));
  view.unmount(); view = await mount(); current = panel(view, listening.id);
  assert.ok(current.getByText(listening.stimulus.ja));
  assert.equal(current.getByRole("button", { name: answer.ja ?? answer.label!.en }).getAttribute("aria-pressed"), "true");
  assert.deepEqual(progress().results, {}); assert.deepEqual(reviewEvents(), []); assert.equal(plays, 0);
  fireEvent.click(current.getByRole("button", { name: "Hide the transcript" }));
  fireEvent.click(current.getByRole("button", { name: "Check" }));
  assert.deepEqual(progress().results[listening.id], { passed: true, independent: false, needsReview: true, attempts: 1 });
  const raw = localStorage.getItem(japaneseActivityDraftKey(unit.id))!;
  assert.equal(raw.includes('"heard"'), false, "the draft schema has no imported listening evidence");
}]);

for (const [shown, latest] of [[reading.answer, "ちがう"], ["ちがう", reading.answer]]) cases.push([`Check rejects a stale rendered answer (${shown} → ${latest}) before any grade or SRS write`, async () => {
  seed(); const a = await mount(), b = await mount();
  fireEvent.change(panel(a).getByRole("textbox"), { target: { value: shown } });
  fireEvent.change(panel(b).getByRole("textbox"), { target: { value: latest } });
  assert.equal((panel(a).getByRole("textbox") as HTMLInputElement).value, shown);
  fireEvent.click(panel(a).getByRole("button", { name: "Check" }));
  assert.deepEqual(progress().results, {}); assert.deepEqual(reviewEvents(), []);
  assert.equal((panel(a).getByRole("textbox") as HTMLInputElement).value, latest);
  assert.equal((panel(a).getByRole("textbox") as HTMLInputElement).disabled, false);
  fireEvent.click(panel(a).getByRole("button", { name: "Check" }));
  assert.equal(progress().results[reading.id].attempts, 1); assert.equal(progress().results[reading.id].passed, latest === reading.answer);
}]);

cases.push(["a new attempt in another tab rejects an old Check and reload never repeats a checked wrong answer", async () => {
  seed(); const a = await mount(), b = await mount();
  fireEvent.change(panel(a).getByRole("textbox"), { target: { value: "ちがう" } });
  fireEvent.click(panel(a).getByRole("button", { name: "Check" }));
  await act(async () => storageEvent(japaneseActivityDraftKey(unit.id)));
  assert.equal((panel(b).getByRole("textbox") as HTMLInputElement).disabled, true);
  fireEvent.click(panel(b).getByRole("button", { name: "Try again" }));
  const raw = localStorage.getItem(japaneseActivityDraftKey(unit.id)), outcomes = JSON.stringify(progress().results), events = reviewEvents();
  fireEvent.click(panel(a).getByRole("button", { name: "Try again" }));
  assert.equal(localStorage.getItem(japaneseActivityDraftKey(unit.id)), raw, "the stale restart cannot erase the fresh run");
  a.unmount(); b.unmount(); const restored = await mount();
  assert.equal((panel(restored).getByRole("textbox") as HTMLInputElement).value, "");
  assert.equal(JSON.stringify(progress().results), outcomes); assert.deepEqual(reviewEvents(), events);
}]);

cases.push(["course deletion before its event rejects an old answer; delayed removal and sessionStorage events do not clear new work", async () => {
  seed(); const view = await mount();
  fireEvent.change(panel(view).getByRole("textbox"), { target: { value: reading.answer } });
  localStorage.removeItem(JAPANESE_PROGRESS_KEY);
  fireEvent.click(panel(view).getByRole("button", { name: "Check" }));
  assert.deepEqual(progress().results, {}); assert.deepEqual(reviewEvents(), []);
  assert.equal((panel(view).getByRole("textbox") as HTMLInputElement).value, "");
  fireEvent.change(panel(view).getByRole("textbox"), { target: { value: "新しい" } });
  await act(async () => storageEvent(JAPANESE_PROGRESS_KEY, localStorage, null));
  await act(async () => storageEvent(null, sessionStorage, null));
  assert.equal((panel(view).getByRole("textbox") as HTMLInputElement).value, "新しい");
  assert.deepEqual(progress().results, {});
}]);

cases.push(["a newer authored version invalidates the old visible Check and offers a native reload action", async () => {
  seed(); const a = await mount(); fireEvent.change(panel(a).getByRole("textbox"), { target: { value: reading.answer } });
  const revised = { ...unit, activities: unit.activities.map(item => item.id === reading.id ? { ...item, prompt: { ...item.prompt, en: "A new prompt" } } : item) };
  const b = await mount(revised); assert.equal((panel(b).getByRole("textbox") as HTMLInputElement).value, "");
  fireEvent.change(panel(b).getByRole("textbox"), { target: { value: "新しい" } }); const raw = localStorage.getItem(japaneseActivityDraftKey(unit.id));
  fireEvent.click(panel(a).getByRole("button", { name: "Check" }));
  assert.ok(a.getByRole("alert")); assert.ok(a.getByRole("button", { name: "Reload the page" }));
  assert.equal(localStorage.getItem(japaneseActivityDraftKey(unit.id)), raw); assert.deepEqual(progress().results, {}); assert.deepEqual(reviewEvents(), []);
}]);

cases.push(["an interrupted IME composition restores text without interpreting confirmation Enter as a checked attempt", async () => {
  seed(); let view = await mount(); let input = panel(view).getByRole("textbox");
  fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: "なま" } });
  fireEvent.keyDown(input, { key: "Enter", keyCode: 229, isComposing: true }); assert.deepEqual(progress().results, {});
  view.unmount(); view = await mount(); input = panel(view).getByRole("textbox");
  assert.equal((input as HTMLInputElement).value, "なま");
  fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: reading.answer } }); fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: "Enter", keyCode: 229, isComposing: false }); assert.deepEqual(progress().results, {});
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13, isComposing: false });
  assert.equal(progress().results[reading.id].attempts, 1);
}]);

async function main() {
  for (const [name, run] of cases) {
    cleanup(); localStorage.clear(); sessionStorage.clear(); frames.clear(); plays = 0; requests = 0;
    await run(); assert.equal(plays, 0, "resume does not play audio"); assert.equal(requests, 0, "resume does not call a provider");
    console.log(`PASS ${name}`);
  }
  cleanup(); dom.window.close(); console.log(`${cases.length}/${cases.length} Japanese resume renderer checks passed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
