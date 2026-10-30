/** Verify the public MP3 player against learner actions and real media event order. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { JapaneseCourseAudio } from "@/components/yo/japanese/JapaneseCourseAudio";
import { getJapaneseFoundationAudioItem } from "@/lib/yo/audio/japaneseFoundationAudio";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo/langues/japonais/parcours", pretendToBeVisual: true });
const bindings = {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MutationObserver: dom.window.MutationObserver,
  IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(Object.keys(bindings).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGIN = "https://japanese-audio-test.supabase.co";
const FIRST = "こんにちは";
const SECOND = "名前";
let audioCalls: FakeAudio[] = [];
let playBehavior: "resolve" | "reject" | "throw" | "pending" = "resolve";

class FakeAudio extends dom.window.EventTarget {
  src: string;
  initialSrc: string;
  preload = "";
  playbackRate = 1;
  preservesPitch = false;
  currentTime = 0;
  playCalls = 0;
  pauseCalls = 0;
  loadCalls = 0;
  rejectPending?: (reason: Error) => void;
  constructor(src: string) { super(); this.src = src; this.initialSrc = src; audioCalls.push(this); }
  play(): Promise<void> {
    this.playCalls += 1;
    if (playBehavior === "throw") throw new Error("Playback blocked");
    if (playBehavior === "reject") return Promise.reject(new Error("Playback blocked"));
    if (playBehavior === "pending") return new Promise<void>((_resolve, reject) => { this.rejectPending = reject; });
    return Promise.resolve();
  }
  pause() { this.pauseCalls += 1; }
  load() { this.loadCalls += 1; }
  removeAttribute(name: string) { if (name === "src") this.src = ""; }
  emit(name: string) { this.dispatchEvent(new Event(name)); }
}
Object.defineProperty(window, "Audio", { configurable: true, value: FakeAudio });
Object.defineProperty(window, "speechSynthesis", { configurable: true, get() { throw new Error("A recorded lesson must never depend on a browser voice"); } });
const node = (text = FIRST, extra: Partial<React.ComponentProps<typeof JapaneseCourseAudio>> = {}) => React.createElement(JapaneseCourseAudio, { text, locale: "en", ...extra });
const cases: Array<[string, () => void | Promise<void>]> = [];
const test = (name: string, run: () => void | Promise<void>) => cases.push([name, run]);

test("no recording is constructed or downloaded until a learner clicks Listen", () => {
  const view = render(node());
  assert.equal(audioCalls.length, 0);
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  assert.equal(audioCalls.length, 1);
  const item = getJapaneseFoundationAudioItem(FIRST);
  assert.ok(item);
  assert.equal(audioCalls[0].initialSrc, `${ORIGIN}/storage/v1/object/public/yopratiqo-audio/${item.storagePath}`);
  assert.equal(audioCalls[0].playCalls, 1);
  assert.equal(audioCalls[0].preload, "none");
  assert.equal(audioCalls[0].playbackRate, 1);
  assert.ok(view.getByText("AI voice"));
});

test("listening is counted only when sound begins and only once across buffering", () => {
  let listened = 0;
  const view = render(node(FIRST, { onListen: () => { listened += 1; } }));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  act(() => audioCalls[0].emit("play"));
  assert.equal(listened, 0);
  act(() => audioCalls[0].emit("playing"));
  assert.equal(listened, 1);
  act(() => audioCalls[0].emit("waiting"));
  act(() => audioCalls[0].emit("playing"));
  assert.equal(listened, 1);
  act(() => audioCalls[0].emit("ended"));
  assert.ok(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  act(() => audioCalls[1].emit("playing"));
  assert.equal(listened, 2);
});

test("a listening exercise can hide its stimulus from every accessible button label", () => {
  const view = render(node(FIRST, { label: "the message" }));
  const play = view.getByRole("button", { name: "Listen : the message" });
  assert.equal(view.queryByRole("button", { name: new RegExp(FIRST) }), null);
  assert.ok(!view.container.textContent?.includes(FIRST));
  fireEvent.click(play);
  assert.ok(view.getByRole("button", { name: "Stop : the message" }));
});

test("slow playback uses the same MP3 at 0.78 speed while preserving pitch", () => {
  const view = render(node());
  const speed = view.getByRole("button", { name: "1× · Slow down" });
  fireEvent.click(speed);
  assert.equal(speed.getAttribute("aria-pressed"), "true");
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  assert.equal(audioCalls[0].playbackRate, 0.78);
  assert.equal(audioCalls[0].preservesPitch, true);
  fireEvent.click(speed);
  assert.equal(audioCalls[0].pauseCalls, 1);
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  assert.equal(audioCalls[1].playbackRate, 1);
  assert.equal(audioCalls[1].initialSrc, audioCalls[0].initialSrc);
});

test("Stop works while buffering, releases the file and ignores late media events", () => {
  let listened = 0;
  const view = render(node(FIRST, { onListen: () => { listened += 1; } }));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  fireEvent.click(view.getByRole("button", { name: `Stop : ${FIRST}` }));
  assert.equal(audioCalls[0].pauseCalls, 1);
  assert.equal(audioCalls[0].src, "");
  assert.equal(audioCalls[0].currentTime, 0);
  act(() => { audioCalls[0].emit("playing"); audioCalls[0].emit("error"); });
  assert.equal(listened, 0);
  assert.equal(view.queryByRole("status"), null);
  assert.ok(view.getByRole("button", { name: `Listen : ${FIRST}` }));
});

test("changing phrase and unmounting both stop sound and discard stale callbacks", () => {
  let listened = 0;
  const props = { onListen: () => { listened += 1; } };
  const view = render(node(FIRST, props));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  view.rerender(node(SECOND, props));
  assert.equal(audioCalls[0].pauseCalls, 1);
  act(() => audioCalls[0].emit("playing"));
  assert.equal(listened, 0);
  fireEvent.click(view.getByRole("button", { name: `Listen : ${SECOND}` }));
  view.unmount();
  assert.equal(audioCalls[1].pauseCalls, 1);
  act(() => audioCalls[1].emit("playing"));
  assert.equal(listened, 0);
});

test("starting another phrase stops the previous player without overlap", () => {
  const view = render(React.createElement(React.Fragment, null, node(FIRST), node(SECOND)));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  act(() => audioCalls[0].emit("playing"));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${SECOND}` }));
  assert.equal(audioCalls[0].pauseCalls, 1);
  assert.ok(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  assert.ok(view.getByRole("button", { name: `Stop : ${SECOND}` }));
});

test("lesson navigation and a hidden document stop playback", () => {
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  act(() => window.dispatchEvent(new Event("yo-japanese-audio-stop")));
  assert.equal(audioCalls[0].pauseCalls, 1);
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  fireEvent(document, new Event("visibilitychange"));
  assert.equal(audioCalls[1].pauseCalls, 1);
});

test("a study panel becoming hidden stops playback even when the player stays mounted", async () => {
  const view = render(React.createElement("div", { "data-testid": "panel" }, node()));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  await act(async () => { view.getByTestId("panel").setAttribute("hidden", ""); });
  assert.equal(audioCalls[0].pauseCalls, 1);
});

test("a browser media pause returns the control to Listen", () => {
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  act(() => { audioCalls[0].emit("playing"); audioCalls[0].emit("pause"); });
  assert.ok(view.getByRole("button", { name: `Listen : ${FIRST}` }));
});

test("a missing or invalid MP3 gives feedback and a new click retries the actual recording", () => {
  let listened = 0;
  const view = render(node(FIRST, { onListen: () => { listened += 1; } }));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  act(() => audioCalls[0].emit("error"));
  assert.match(view.getByRole("status").textContent ?? "", /interrupted or did not start/);
  assert.equal(listened, 0);
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  assert.equal(audioCalls.length, 2);
  assert.equal(view.queryByRole("status"), null);
  act(() => audioCalls[1].emit("playing"));
  assert.equal(listened, 1);
});

test("a rejected play promise reports a retryable error without counting listening", async () => {
  playBehavior = "reject";
  let listened = 0;
  const view = render(node(FIRST, { onListen: () => { listened += 1; } }));
  await act(async () => { fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` })); });
  assert.ok(view.getByRole("status"));
  assert.ok(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  assert.equal(listened, 0);
});

test("a cancelled request rejecting later cannot stop or mark a newer play request as failed", async () => {
  playBehavior = "pending";
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  fireEvent.click(view.getByRole("button", { name: `Stop : ${FIRST}` }));
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  await act(async () => { audioCalls[0].rejectPending?.(new Error("Late cancellation")); });
  assert.equal(audioCalls[1].pauseCalls, 0);
  assert.equal(view.queryByRole("status"), null);
  assert.ok(view.getByRole("button", { name: `Stop : ${FIRST}` }));
});

test("a synchronous media failure gives the same usable retry path", () => {
  playBehavior = "throw";
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  assert.ok(view.getByRole("status"));
  assert.ok(view.getByRole("button", { name: `Listen : ${FIRST}` }));
});

test("missing configuration or unknown text never silently substitutes browser speech", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  assert.match(view.getByRole("status").textContent ?? "", /recording is unavailable/);
  assert.equal(audioCalls.length, 0);
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
  view.rerender(node("not a registered course phrase"));
  fireEvent.click(view.getByRole("button", { name: /Listen : not a registered/ }));
  assert.match(view.getByRole("status").textContent ?? "", /recording is unavailable/);
  assert.equal(audioCalls.length, 0);
});

test("a stalled request times out, releases playback and offers retry", () => {
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  let expire: (() => void) | undefined;
  let cleared = false;
  const token = {} as ReturnType<typeof setTimeout>;
  globalThis.setTimeout = ((callback: () => void, delay?: number, ...args: unknown[]) => {
    if (delay === 15000) { expire = callback; return token; }
    return realSetTimeout(callback, delay, ...args);
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
    if (id === token) { cleared = true; return; }
    realClearTimeout(id);
  }) as typeof clearTimeout;
  try {
    const view = render(node());
    fireEvent.click(view.getByRole("button", { name: `Listen : ${FIRST}` }));
    assert.ok(expire);
    act(() => expire?.());
    assert.ok(cleared);
    assert.equal(audioCalls[0].pauseCalls, 1);
    assert.ok(view.getByRole("status"));
    assert.ok(view.getByRole("button", { name: `Listen : ${FIRST}` }));
  } finally { globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout; }
});

for (const [locale, play, attribution] of [["fr", "Écouter", "Voix IA"], ["en", "Listen", "AI voice"], ["es", "Escuchar", "Voz IA"]] as const) {
  test(`${locale}: recorded voice disclosure and controls are localized and do not activate their parent card`, () => {
    let parentClicks = 0;
    const view = render(React.createElement("div", { onClick: () => { parentClicks += 1; } }, node(FIRST, { locale: locale as YoLocale })));
    assert.ok(view.getByText(attribution));
    fireEvent.click(view.getByRole("button", { name: `${play} : ${FIRST}` }));
    assert.equal(parentClicks, 0);
  });
}

async function main() {
  let failed = 0;
  try {
    for (const [name, run] of cases) {
      audioCalls = [];
      playBehavior = "resolve";
      process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      try { await run(); console.log(`ok - ${name}`); }
      catch (error) { failed += 1; console.error(`not ok - ${name}`, error); }
      finally { cleanup(); }
    }
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
  console.log(`\nJapanese recorded audio: ${cases.length - failed}/${cases.length} passed.`);
  if (failed) process.exitCode = 1;
}
void main();
