import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import type { MissionCinemaScene } from "../../lib/yo/travelCinema";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/anglais/demarrer", pretendToBeVisual: true });
for (const [name, value] of Object.entries({
  React, window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter,
  DocumentFragment: dom.window.DocumentFragment, HTMLInputElement: dom.window.HTMLInputElement, CustomEvent: dom.window.CustomEvent,
  Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
let reduced = true, online = true, hidden = false, plays = 0, rejectPlay = false, emitPlaying = true;
const mediaSubscribers = new Set<() => void>(), paused = new WeakMap<object, boolean>();
Object.defineProperty(window, "matchMedia", { configurable: true, value: (query: string) => ({
  matches: reduced, media: query, addListener: (fn: () => void) => mediaSubscribers.add(fn), removeListener: (fn: () => void) => mediaSubscribers.delete(fn),
  addEventListener: (_name: string, fn: () => void) => mediaSubscribers.add(fn), removeEventListener: (_name: string, fn: () => void) => mediaSubscribers.delete(fn),
}) });
Object.defineProperty(navigator, "onLine", { configurable: true, get: () => online });
Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
Object.defineProperty(dom.window.HTMLMediaElement.prototype, "paused", { configurable: true, get() { return paused.get(this) ?? true; } });
dom.window.HTMLMediaElement.prototype.play = function () {
  plays++;
  if (rejectPlay) return Promise.reject(new dom.window.DOMException("User gesture required", "NotAllowedError"));
  paused.set(this, false); this.dispatchEvent(new Event("play"));
  if (emitPlaying) this.dispatchEvent(new Event("playing"));
  return Promise.resolve();
};
dom.window.HTMLMediaElement.prototype.pause = function () { if (!this.paused) { paused.set(this, true); this.dispatchEvent(new Event("pause")); } };
const { render, renderHook, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const { CinemaPlayer } = require("@/components/yo/travel/CinemaPlayer") as typeof import("../../components/yo/travel/CinemaPlayer");
const { useMissionCinema } = require("@/components/yo/travel/useMissionCinema") as typeof import("../../components/yo/travel/useMissionCinema");
const { readCinemaPlayback } = require("@/components/yo/travel/cinemaPlayback") as typeof import("../../components/yo/travel/cinemaPlayback");
const film = { src: "/companion/travel/films/departure.mp4", poster: "/companion/travel/films/departure.webp" };
const base = { film, locale: "en" as const, eyebrow: "By plane", title: "Tokyo", caption: "Yoppo's journey to Tokyo", travelMode: "flight" as const };
async function flush() { await act(async () => { await Promise.resolve(); }); }
function video() { return document.querySelector("video") as HTMLVideoElement; }
function reset() { cleanup(); reduced = true; online = true; hidden = false; plays = 0; rejectPlay = false; emitPlaying = true; }
const tests: Array<[string, () => Promise<void>]> = [];

tests.push(["reduced motion, readable captions and immediate skip never require playback", async () => {
  let exits = 0;
  const view = render(<CinemaPlayer {...base} id="reduced" onFinish={() => exits++}/>); await flush();
  assert.equal(plays, 0); assert.equal(video().preload, "none"); assert.equal(video().muted, true);
  assert.equal(view.getByRole("button", { name: "Descriptive captions" }).getAttribute("aria-pressed"), "true");
  fireEvent.click(view.getByRole("button", { name: "Descriptive captions" }));
  assert.ok(document.querySelector("[data-cinema-caption]")?.classList.contains("sr-only"));
  fireEvent.click(view.getByRole("button", { name: "Play film" })); await flush(); assert.equal(plays, 1);
  fireEvent.click(view.getByRole("button", { name: "Skip" })); fireEvent.ended(video());
  assert.equal(exits, 1, "skip plus delayed ended must deliver exactly one continuation");
}]);
tests.push(["offline and still-only scenes expose a direct continuation without a fake source", async () => {
  online = false; let exits = 0;
  let view = render(<CinemaPlayer {...base} id="offline" onFinish={() => exits++}/>); await flush();
  assert.equal(video().getAttribute("src"), null); assert.equal(plays, 0);
  assert.ok(view.getByRole("status").textContent?.includes("offline"));
  fireEvent.click(view.getByRole("button", { name: "Continue" })); assert.equal(exits, 1);
  cleanup(); online = true;
  view = render(<CinemaPlayer {...base} id="still" film={{ src: null, poster: film.poster }} onFinish={() => exits++}/>); await flush();
  assert.equal(video().getAttribute("src"), null); assert.equal(view.queryByRole("button", { name: "Play film" }), null);
  fireEvent.click(view.getByRole("button", { name: "Continue" })); assert.equal(exits, 2);
}]);
tests.push(["autoplay denial and media errors leave both skip and continue usable", async () => {
  reduced = false; rejectPlay = true; let exits = 0;
  const view = render(<CinemaPlayer {...base} id="blocked" onFinish={() => exits++}/>); await flush();
  assert.equal(plays, 1); assert.match(view.getByRole("status").textContent ?? "", /Tap Play/);
  fireEvent.error(video()); assert.match(view.getByRole("status").textContent ?? "", /unavailable/);
  fireEvent.click(view.getByRole("button", { name: "Continue" })); assert.equal(exits, 1);
}]);
tests.push(["interrupted film resumes its cursor; completed or skipped films clear it", async () => {
  let view = render(<CinemaPlayer {...base} id="resume" onFinish={() => {}}/>); await flush();
  video().currentTime = 2.5; fireEvent.timeUpdate(video()); view.unmount();
  view = render(<CinemaPlayer {...base} id="resume" onFinish={() => {}}/>); await flush();
  Object.defineProperty(video(), "duration", { configurable: true, value: 7.5 }); fireEvent.loadedMetadata(video());
  assert.equal(video().currentTime, 2.5);
  fireEvent.click(view.getByRole("button", { name: "Skip" }));
  assert.equal(readCinemaPlayback("resume", film.src), 0);
}]);
tests.push(["visibility pause does not resume sound automatically when returning", async () => {
  reduced = false;
  render(<CinemaPlayer {...base} id="visibility" onFinish={() => {}}/>); await flush();
  assert.equal(plays, 1); assert.equal(video().paused, false);
  hidden = true; fireEvent(document, new Event("visibilitychange")); assert.equal(video().paused, true);
  hidden = false; fireEvent(document, new Event("visibilitychange")); await flush(); assert.equal(plays, 1);
  act(() => { reduced = true; mediaSubscribers.forEach(fn => fn()); });
  assert.equal(video().paused, true);
}]);
tests.push(["a stalled network reaches a fallback without ever disabling continuation", async () => {
  reduced = false; emitPlaying = false;
  const original = window.setTimeout; let watchdog: (() => void) | undefined;
  window.setTimeout = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
    if (delay === 8000 && typeof fn === "function") { watchdog = fn as () => void; return 987654; }
    return original(fn, delay, ...args);
  }) as typeof window.setTimeout;
  try {
    const view = render(<CinemaPlayer {...base} id="stall" onFinish={() => {}}/>); await flush();
    assert.ok(watchdog); act(() => watchdog?.());
    assert.match(view.getByRole("status").textContent ?? "", /taking a while/);
    assert.equal(view.getByRole("button", { name: "Continue" }).hasAttribute("disabled"), false);
  } finally { window.setTimeout = original; }
}]);
tests.push(["queued mission moments restore, suspend and deduplicate independently of learning", async () => {
  const courseKey = "yo.test.actual-progress", actualProgress = JSON.stringify({ correct: 3, credits: 0, artifacts: ["earned-stamp"] });
  localStorage.setItem(courseKey, actualProgress);
  const scene: MissionCinemaScene = { id: "u01:lesson1:attempt0", kind: "mission-success", title: "First conversation" };
  const renderCinema = (active: boolean) => renderHook(({ active }: { active: boolean }) => useMissionCinema("en:foundation:reset0", { active }), { initialProps: { active } });
  let hook = renderCinema(false); await flush();
  const currentScene = () => hook.result.current.scene;
  act(() => { assert.equal(hook.result.current.present(scene), true); assert.equal(hook.result.current.present(scene), false); hook.result.current.present({ ...scene, kind: "artifact" }); });
  assert.equal(currentScene(), null);
  hook.rerender({ active: true }); assert.equal(currentScene()?.kind, "mission-success");
  assert.equal(currentScene()?.scope, "en:foundation:reset0");
  const firstFinish = hook.result.current.finish;
  act(firstFinish); assert.equal(currentScene()?.kind, "artifact");
  act(firstFinish); assert.equal(currentScene()?.kind, "artifact", "stale finish must not skip the next moment");
  hook.unmount();
  hook = renderCinema(true); await flush();
  assert.equal(currentScene()?.kind, "artifact");
  act(() => hook.result.current.finish()); assert.equal(currentScene(), null);
  act(() => { assert.equal(hook.result.current.present(scene), false); });
  assert.equal(localStorage.getItem(courseKey), actualProgress, "cosmetic playback cannot mutate learning or grant rewards");
}]);
tests.push(["blocked browser storage never blocks queue completion", async () => {
  const originalGet = dom.window.Storage.prototype.getItem, originalSet = dom.window.Storage.prototype.setItem, originalRemove = dom.window.Storage.prototype.removeItem;
  dom.window.Storage.prototype.getItem = dom.window.Storage.prototype.setItem = dom.window.Storage.prototype.removeItem = () => { throw new Error("Storage blocked"); };
  try {
    const hook = renderHook(() => useMissionCinema("pt-BR:storage-blocked")); await flush();
    act(() => { hook.result.current.present({ id: "unit1:mission1", kind: "mission-start", title: "Olá" }); });
    assert.equal(hook.result.current.scene?.title, "Olá");
    act(() => hook.result.current.finish()); assert.equal(hook.result.current.scene, null);
  } finally { dom.window.Storage.prototype.getItem = originalGet; dom.window.Storage.prototype.setItem = originalSet; dom.window.Storage.prototype.removeItem = originalRemove; }
}]);

async function main() {
  try { for (const [name, run] of tests) { reset(); await run(); console.log("PASS: " + name); } }
  finally { cleanup(); dom.window.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
