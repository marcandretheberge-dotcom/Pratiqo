/** Player lifecycle only: media is mocked; this does not prove a film exists or plays in a browser. */
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { cafeHeroMedia, CAFE_HERO_POSTER_SRC, CAFE_WORLD_VIDEO_SRC } from "@/lib/cafe/heroMedia";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://cafe.example.test/cafe", pretendToBeVisual: true });
for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

let reducedMotion = false;
let hidden = false;
const motion = new dom.window.EventTarget();
Object.defineProperty(motion, "matches", { get: () => reducedMotion });
Object.defineProperty(dom.window, "matchMedia", { value: () => motion });
Object.defineProperty(dom.window.document, "hidden", { get: () => hidden, configurable: true });
const connection = Object.assign(new dom.window.EventTarget(), { saveData: false, effectiveType: "4g" });
Object.defineProperty(dom.window.navigator, "connection", { value: connection, configurable: true });
let mediaRequests = 0;
Object.defineProperty(dom.window.navigator, "mediaDevices", { value: { getUserMedia: () => { mediaRequests++; return Promise.reject(new Error("Ambient video must not request the camera or microphone")); } } });

const observers: FakeIntersectionObserver[] = [];
class FakeIntersectionObserver {
  disconnected = false;
  constructor(readonly callback: IntersectionObserverCallback) { observers.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
  trigger(isIntersecting: boolean) { this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
}
Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIntersectionObserver, configurable: true });

const playSources: (string | null)[] = [];
let pauseCalls = 0;
let loadCalls = 0;
let rejectNextPlay = false;
let pendingPlay: Promise<void> | null = null;
Object.defineProperties(dom.window.HTMLMediaElement.prototype, {
  play: { configurable: true, value: function (this: HTMLVideoElement) {
    playSources.push(this.getAttribute("src"));
    if (rejectNextPlay) {
      rejectNextPlay = false;
      return Promise.reject(Object.assign(new Error("Autoplay blocked"), { name: "NotAllowedError" }));
    }
    if (pendingPlay) return pendingPlay;
    if (this.getAttribute("src") !== CAFE_WORLD_VIDEO_SRC) return Promise.reject(Object.assign(new Error("Source missing"), { name: "NotSupportedError" }));
    this.dispatchEvent(new dom.window.Event("playing"));
    return Promise.resolve();
  } },
  pause: { configurable: true, value: function (this: HTMLVideoElement) { pauseCalls++; this.dispatchEvent(new dom.window.Event("pause")); } },
  load: { configurable: true, value: () => { loadCalls++; } },
});

const previousCss = require.extensions[".css"];
require.extensions[".css"] = (module) => { module.exports = {}; };
const { CafeHeroMedia } = require("@/components/cafe/CafeHeroMedia") as typeof import("@/components/cafe/CafeHeroMedia");
if (previousCss) require.extensions[".css"] = previousCss; else delete require.extensions[".css"];
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");

async function flush() { await act(async () => { await new Promise<void>((resolve) => setImmediate(resolve)); }); }
function resetEnvironment() {
  reducedMotion = false; hidden = false; connection.saveData = false; connection.effectiveType = "4g";
  playSources.length = 0; pauseCalls = 0; loadCalls = 0; observers.length = 0; rejectNextPlay = false; pendingPlay = null;
}
const mount = (locale: "fr" | "en" | "es" = "en") => render(<CafeHeroMedia locale={locale} videoSrc={CAFE_WORLD_VIDEO_SRC} />);
const videoIn = (view: ReturnType<typeof mount>) => {
  const element = view.container.querySelector("video"); assert.ok(element); return element;
};
const playLabel = "Play the cafés around the world video";
const pauseLabel = "Pause the cafés around the world video";

async function unconfiguredMediaKeepsPhotoWithoutVideoRequest() {
  assert.ok(existsSync(`public${CAFE_HERO_POSTER_SRC}`));
  if (cafeHeroMedia.videoSrc !== null) {
    assert.equal(cafeHeroMedia.videoSrc, CAFE_WORLD_VIDEO_SRC);
    assert.ok(statSync(`public${cafeHeroMedia.videoSrc}`).size > 0, "an activated video must be committed with the site");
  }
  for (const videoSrc of [null, undefined, "https://example.test/invented.mp4", "/videos/unreviewed.mp4"]) {
    const view = render(<CafeHeroMedia locale="en" videoSrc={videoSrc} />);
    assert.equal(view.container.querySelector("video"), null);
    assert.equal(view.queryByRole("button"), null);
    assert.equal(view.container.firstElementChild?.getAttribute("data-cafe-hero"), "photo");
    cleanup();
  }
  assert.equal(playSources.length, 0);
}

async function serverMarkupNeverAssumesMotionOrNetworkPermission() {
  const html = renderToString(<CafeHeroMedia locale="en" videoSrc={CAFE_WORLD_VIDEO_SRC} />);
  const container = dom.window.document.createElement("div"); container.innerHTML = html;
  const element = container.querySelector("video"); assert.ok(element);
  assert.equal(element.getAttribute("src"), null);
  assert.equal(element.getAttribute("poster"), CAFE_HERO_POSTER_SRC);
  assert.equal(element.getAttribute("preload"), "none");
  assert.equal(playSources.length, 0);
}

async function playbackHasSilentInlineControlsInEveryLocale() {
  for (const [locale, pause, play] of [
    ["en", pauseLabel, playLabel],
    ["fr", "Mettre la vidéo des cafés du monde en pause", "Lire la vidéo des cafés du monde"],
    ["es", "Pausar el vídeo de cafés del mundo", "Reproducir el vídeo de cafés del mundo"],
  ] as const) {
    const view = mount(locale); await flush();
    const element = videoIn(view);
    assert.equal(element.getAttribute("src"), CAFE_WORLD_VIDEO_SRC);
    assert.equal(element.muted, true); assert.equal(element.defaultMuted, true);
    assert.equal(element.loop, true); assert.equal(element.playsInline, true);
    assert.equal(element.preload, "none"); assert.equal(element.tabIndex, -1);
    assert.equal(element.getAttribute("aria-hidden"), "true");
    assert.equal(view.getByRole("button", { name: pause }).getAttribute("aria-controls"), element.id);
    fireEvent.click(view.getByRole("button", { name: pause })); await flush();
    const attempts = playSources.length;
    assert.ok(view.getByRole("button", { name: play }));
    fireEvent.click(view.getByRole("button", { name: play })); await flush();
    assert.ok(playSources.length > attempts);
    assert.ok(view.getByRole("button", { name: pause }));
    cleanup();
  }
}

async function reducedMotionLoadsOnlyAfterExplicitPlay() {
  reducedMotion = true;
  const view = mount(); await flush();
  assert.equal(videoIn(view).getAttribute("src"), null); assert.equal(playSources.length, 0);
  fireEvent.click(view.getByRole("button", { name: playLabel })); await flush();
  assert.equal(videoIn(view).getAttribute("src"), CAFE_WORLD_VIDEO_SRC);
  assert.ok(view.getByRole("button", { name: pauseLabel }));
  fireEvent.click(view.getByRole("button", { name: pauseLabel })); await flush();
  assert.equal(videoIn(view).getAttribute("src"), null);
  assert.ok(view.getByRole("button", { name: playLabel }));
}

async function savingDataAndSlowConnectionsAvoidAutomaticDownloads() {
  for (const mode of ["saveData", "2g", "slow-2g"]) {
    connection.saveData = mode === "saveData"; connection.effectiveType = mode === "saveData" ? "4g" : mode;
    const view = mount(); await flush();
    assert.equal(videoIn(view).getAttribute("src"), null); assert.equal(playSources.length, 0);
    cleanup();
  }
  connection.saveData = false; connection.effectiveType = "4g";
  const view = mount(); await flush();
  assert.ok(view.getByRole("button", { name: pauseLabel }));
  await act(async () => { connection.saveData = true; connection.dispatchEvent(new dom.window.Event("change")); });
  assert.equal(videoIn(view).getAttribute("src"), null);
  assert.ok(view.getByRole("button", { name: playLabel }));
}

async function firstPlayClickRecoversFromAutoplayDenial() {
  rejectNextPlay = true;
  const view = mount(); await flush();
  assert.equal(playSources.length, 1);
  fireEvent.click(view.getByRole("button", { name: playLabel })); await flush();
  assert.equal(playSources.length, 2, "the first Play click must retry, not enter the Pause branch");
  assert.ok(view.getByRole("button", { name: pauseLabel }));
}

async function hiddenAndOffscreenPlaybackPausesWithoutUndoingManualPause() {
  const view = mount(); await flush();
  const observer = observers.at(-1); assert.ok(observer);
  await act(async () => { hidden = true; document.dispatchEvent(new dom.window.Event("visibilitychange")); });
  assert.ok(view.getByRole("button", { name: playLabel }));
  const attempts = playSources.length;
  await act(async () => { hidden = false; document.dispatchEvent(new dom.window.Event("visibilitychange")); });
  assert.ok(playSources.length > attempts); assert.ok(view.getByRole("button", { name: pauseLabel }));
  await act(async () => { observer.trigger(false); });
  assert.ok(view.getByRole("button", { name: playLabel }));
  await act(async () => { observer.trigger(true); });
  assert.ok(view.getByRole("button", { name: pauseLabel }));
  fireEvent.click(view.getByRole("button", { name: pauseLabel })); await flush();
  const pausedAttempts = playSources.length;
  await act(async () => { hidden = true; document.dispatchEvent(new dom.window.Event("visibilitychange")); observer.trigger(false); });
  await act(async () => { hidden = false; document.dispatchEvent(new dom.window.Event("visibilitychange")); observer.trigger(true); });
  assert.equal(playSources.length, pausedAttempts); assert.ok(view.getByRole("button", { name: playLabel }));
}

async function failedVideoReturnsToPhotoWithoutBrokenControls() {
  const view = mount(); await flush();
  fireEvent.error(videoIn(view)); await flush();
  assert.equal(view.container.querySelector("video"), null);
  assert.equal(view.queryByRole("button"), null);
  assert.equal(view.getByRole("status").textContent, "The video is unavailable. A café photo is shown.");
  assert.ok(view.container.querySelector("[data-cafe-hero]"), "the poster wrapper remains in place");
}

async function strictModeReplaysRestoreTheLocalSource() {
  const view = render(<React.StrictMode><CafeHeroMedia locale="en" videoSrc={CAFE_WORLD_VIDEO_SRC} /></React.StrictMode>); await flush();
  assert.ok(playSources.length >= 2, "effect replay must be exercised");
  assert.ok(loadCalls >= 1, "the first effect cleanup must release the source");
  assert.deepEqual([...new Set(playSources)], [CAFE_WORLD_VIDEO_SRC], "every replay must restore src before playing");
  assert.equal(videoIn(view).getAttribute("src"), CAFE_WORLD_VIDEO_SRC);
  assert.ok(view.getByRole("button", { name: pauseLabel }));
}

async function unmountReleasesMediaAndIgnoresPendingPlaybackFailure() {
  let reject!: (error: Error) => void;
  pendingPlay = new Promise<void>((_, fail) => { reject = fail; });
  const view = mount(); await flush();
  const element = videoIn(view);
  view.unmount();
  assert.equal(element.getAttribute("src"), null); assert.ok(loadCalls > 0); assert.ok(pauseCalls > 0);
  assert.ok(observers.every((observer) => observer.disconnected));
  reject(Object.assign(new Error("Late unsupported result"), { name: "NotSupportedError" })); await flush();
  assert.equal(view.container.textContent, "");
}

void (async () => {
  const cases = [unconfiguredMediaKeepsPhotoWithoutVideoRequest, serverMarkupNeverAssumesMotionOrNetworkPermission, playbackHasSilentInlineControlsInEveryLocale, reducedMotionLoadsOnlyAfterExplicitPlay, savingDataAndSlowConnectionsAvoidAutomaticDownloads, firstPlayClickRecoversFromAutoplayDenial, hiddenAndOffscreenPlaybackPausesWithoutUndoingManualPause, failedVideoReturnsToPhotoWithoutBrokenControls, strictModeReplaysRestoreTheLocalSource, unmountReleasesMediaAndIgnoresPendingPlaybackFailure];
  for (const test of cases) {
    resetEnvironment();
    try { await test(); console.log(`✓ ${test.name}`); } finally { cleanup(); await flush(); }
  }
  assert.equal(mediaRequests, 0);
  console.log(`cafeHeroMedia: ${cases.length} React player lifecycle scenarios passed; media mocked, no camera/microphone requests`);
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
