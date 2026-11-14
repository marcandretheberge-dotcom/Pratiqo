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
  delete dom.window.__PRATIQO_APP_STATE__;
}
const mount = (locale: "fr" | "en" | "es" = "en") => render(<CafeHeroMedia locale={locale} videoSrc={CAFE_WORLD_VIDEO_SRC} />);
const videoIn = (view: ReturnType<typeof mount>) => {
  const element = view.container.querySelector("video"); assert.ok(element); return element;
};
const playLabel = "Play the cafés around the world video";
const pauseLabel = "Pause the cafés around the world video";

async function nativeAppState(state: "active" | "inactive" | "background") {
  await act(async () => {
    dom.window.__PRATIQO_APP_STATE__ = state;
    window.dispatchEvent(new dom.window.Event("pratiqo:app-state"));
  });
}

function invitationIn(view: ReturnType<typeof mount>, id: string) {
  const invitation = view.container.querySelector<HTMLDivElement>(`[data-cafe-cue="${id}"]`);
  assert.ok(invitation, `invitation ${id} is present`);
  return invitation;
}

function assertVisibleInvitation(view: ReturnType<typeof mount>, expected: string | null) {
  const visible = Array.from(view.container.querySelectorAll<HTMLDivElement>("[data-cafe-cue]"))
    .filter((element) => Number(element.style.opacity) > 0)
    .map((element) => element.dataset.cafeCue);
  assert.deepEqual(visible, expected ? [expected] : []);
}

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

async function hiddenDocumentDefersFirstSourceAttachment() {
  hidden = true;
  const view = mount(); await flush();
  const element = videoIn(view);
  assert.equal(element.getAttribute("src"), null, "a hidden document must not attach the initial video source");
  assert.equal(playSources.length, 0);
  await act(async () => { hidden = false; document.dispatchEvent(new dom.window.Event("visibilitychange")); });
  assert.equal(element.getAttribute("src"), CAFE_WORLD_VIDEO_SRC);
  assert.ok(view.getByRole("button", { name: pauseLabel }));
}

async function hiddenAndOffscreenPlaybackPausesWithoutUndoingManualPause() {
  const view = mount(); await flush();
  const element = videoIn(view);
  element.currentTime = 13;
  const observer = observers.at(-1); assert.ok(observer);
  await act(async () => { hidden = true; document.dispatchEvent(new dom.window.Event("visibilitychange")); });
  assert.ok(view.getByRole("button", { name: playLabel }));
  assert.equal(element.getAttribute("src"), CAFE_WORLD_VIDEO_SRC, "a visibility pause retains the loaded source");
  assert.equal(element.currentTime, 13);
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

async function nativeBackgroundAndInactivePauseUntilBothNativeAndWebAreVisible() {
  for (const initialState of ["background", "inactive"] as const) {
    resetEnvironment();
    dom.window.__PRATIQO_APP_STATE__ = initialState;
    const view = mount(); await flush();
    assert.equal(videoIn(view).getAttribute("src"), null, `a WebView loaded while ${initialState} must not attach a source`);
    assert.equal(playSources.length, 0, `a WebView loaded while ${initialState} must not start playback`);
    assert.ok(view.getByRole("button", { name: playLabel }));

    await nativeAppState("active");
    assert.ok(view.getByRole("button", { name: pauseLabel }));
    const beforePause = pauseCalls;
    await nativeAppState(initialState);
    assert.ok(pauseCalls > beforePause);
    assert.ok(view.getByRole("button", { name: playLabel }));
    const attempts = playSources.length;

    await act(async () => { hidden = true; document.dispatchEvent(new dom.window.Event("visibilitychange")); });
    await nativeAppState("active");
    assert.equal(playSources.length, attempts, "native activation must not override a still-hidden web document");
    await act(async () => { hidden = false; document.dispatchEvent(new dom.window.Event("visibilitychange")); });
    assert.ok(playSources.length > attempts);
    assert.ok(view.getByRole("button", { name: pauseLabel }));
    cleanup();
  }
}

async function nativeResumeDoesNotUndoAnExplicitPause() {
  const view = mount(); await flush();
  fireEvent.click(view.getByRole("button", { name: pauseLabel })); await flush();
  const attempts = playSources.length;
  for (const state of ["inactive", "background", "active"] as const) await nativeAppState(state);
  assert.equal(playSources.length, attempts, "returning to the native app must preserve the user's Pause choice");
  assert.ok(view.getByRole("button", { name: playLabel }));
  fireEvent.click(view.getByRole("button", { name: playLabel })); await flush();
  assert.ok(playSources.length > attempts, "explicit Play remains available after the background round trip");
  assert.ok(view.getByRole("button", { name: pauseLabel }));
}

async function queuedPlayWaitsForNativeActivationWithoutLosingIntent() {
  const view = mount(); await flush();
  fireEvent.click(view.getByRole("button", { name: pauseLabel })); await flush();
  await nativeAppState("background");
  const attempts = playSources.length;
  fireEvent.click(view.getByRole("button", { name: playLabel })); await flush();
  assert.equal(playSources.length, attempts, "a queued Play activation must not start media in the native background");
  assert.ok(view.getByRole("button", { name: playLabel }));

  const beforeLateEvent = pauseCalls;
  await act(async () => { videoIn(view).dispatchEvent(new dom.window.Event("playing")); });
  assert.ok(pauseCalls > beforeLateEvent, "a late playing event must remain blocked after the queued Play activation");
  assert.ok(view.getByRole("button", { name: playLabel }));

  await nativeAppState("active");
  assert.ok(playSources.length > attempts, "the explicit Play intent must take effect once the app becomes active");
  assert.ok(view.getByRole("button", { name: pauseLabel }));
}

async function queuedRestrictedPlayDefersSourceUntilVisible() {
  for (const preference of ["reducedMotion", "saveData"] as const) {
    resetEnvironment();
    reducedMotion = preference === "reducedMotion";
    connection.saveData = preference === "saveData";
    dom.window.__PRATIQO_APP_STATE__ = "background";
    const view = mount(); await flush();
    const element = videoIn(view);
    assert.equal(element.getAttribute("src"), null);
    assert.equal(playSources.length, 0);

    fireEvent.click(view.getByRole("button", { name: playLabel })); await flush();
    assert.equal(playSources.length, 0, `${preference}: queued Play must wait for native activation`);
    assert.equal(element.getAttribute("src"), null, `${preference}: keep the source absent while the opted-in film cannot play`);
    assert.ok(view.getByRole("button", { name: playLabel }));

    await nativeAppState("active");
    assert.equal(element.getAttribute("src"), CAFE_WORLD_VIDEO_SRC);
    assert.ok(playSources.length > 0, `${preference}: load and play once the queued intent becomes eligible`);
    assert.ok(view.getByRole("button", { name: pauseLabel }));

    fireEvent.click(view.getByRole("button", { name: pauseLabel })); await flush();
    assert.equal(element.getAttribute("src"), null);
    await nativeAppState("background");
    const attempts = playSources.length;
    fireEvent.click(view.getByRole("button", { name: playLabel })); await flush();
    assert.equal(element.getAttribute("src"), null, `${preference}: previously played media must also defer a queued reload`);
    assert.equal(playSources.length, attempts);
    await nativeAppState("active");
    assert.equal(element.getAttribute("src"), CAFE_WORLD_VIDEO_SRC);
    assert.ok(playSources.length > attempts);
    cleanup();
  }
}

async function latePlayingEventCannotEscapeNativeBackgroundPause() {
  let resolve!: () => void;
  pendingPlay = new Promise<void>((done) => { resolve = done; });
  const view = mount(); await flush();
  const element = videoIn(view);
  await nativeAppState("background");
  const beforeLateEvent = pauseCalls;
  await act(async () => { element.dispatchEvent(new dom.window.Event("playing")); resolve(); });
  assert.ok(pauseCalls > beforeLateEvent, "a queued native playing event must be stopped after backgrounding");
  assert.ok(view.getByRole("button", { name: playLabel }));
  pendingPlay = null;
  await nativeAppState("active");
  assert.ok(view.getByRole("button", { name: pauseLabel }));
}

async function invitationsFollowSeekingPausedTimeAndLoopRestart() {
  const view = mount(); await flush();
  const element = videoIn(view);
  assertVisibleInvitation(view, null);
  for (const [time, id, text] of [
    [2.5, "japan", "一緒にコーヒーでもどうですか？"],
    [13, "marrakech", "أجي نشربو قهوة"],
    [23, "paris", "On prend un café ensemble ?"],
  ] as const) {
    await act(async () => { element.currentTime = time; fireEvent.seeked(element); });
    assertVisibleInvitation(view, id);
    assert.equal(invitationIn(view, id).querySelector("p")?.textContent, text);
  }
  const arabic = invitationIn(view, "marrakech").querySelector("p");
  assert.equal(arabic?.getAttribute("dir"), "rtl");
  assert.equal(arabic?.getAttribute("lang"), "ary");

  fireEvent.click(view.getByRole("button", { name: pauseLabel })); await flush();
  await act(async () => { element.currentTime = 27; fireEvent.seeked(element); });
  assertVisibleInvitation(view, "welcome");
  assert.equal(invitationIn(view, "welcome").querySelector("p")?.textContent, "Ta place t’attend.");
  assert.ok(view.getByRole("button", { name: playLabel }), "seeking must not implicitly resume paused media");

  for (const time of [29.35, 0]) {
    await act(async () => { element.currentTime = time; fireEvent.timeUpdate(element); });
    assertVisibleInvitation(view, null);
  }
  await act(async () => { element.currentTime = 1.55; fireEvent.timeUpdate(element); });
  assertVisibleInvitation(view, "japan");
  const fade = Number(invitationIn(view, "japan").style.opacity);
  assert.ok(fade > 0 && fade < 1, "the Japanese invitation fades in after the loop restarts");
}

async function invitationTranslationsChangeWithoutRestartingTheFilm() {
  const view = mount("en"); await flush();
  const element = videoIn(view);
  await act(async () => { element.currentTime = 13; fireEvent.seeked(element); });
  fireEvent.click(view.getByRole("button", { name: pauseLabel })); await flush();
  const attempts = playSources.length;
  const arabic = invitationIn(view, "marrakech");
  assert.equal(arabic.querySelector('p[lang="en"]')?.textContent, "Shall we have a coffee together?");

  view.rerender(<CafeHeroMedia locale="es" videoSrc={CAFE_WORLD_VIDEO_SRC} />); await flush();
  assert.equal(videoIn(view), element);
  assert.equal(element.currentTime, 13);
  assert.equal(playSources.length, attempts, "a language change must not restart playback");
  assertVisibleInvitation(view, "marrakech");
  assert.equal(arabic.querySelector('p[lang="es"]')?.textContent, "¿Tomamos un café juntos?");
  assert.equal(arabic.querySelector('p[lang="en"]'), null);
  assert.equal(invitationIn(view, "welcome").querySelector('p[lang="es"]')?.textContent, "Tu sitio te espera.");
  assert.ok(view.getByRole("button", { name: "Reproducir el vídeo de cafés del mundo" }), "a locale change preserves the deliberate pause");

  view.rerender(<CafeHeroMedia locale="fr" videoSrc={CAFE_WORLD_VIDEO_SRC} />); await flush();
  assert.equal(arabic.querySelector('p[lang="fr"]')?.textContent, "On prend un café ensemble ?");
  assert.equal(invitationIn(view, "paris").querySelectorAll("p").length, 1, "French copy has no duplicate translation");
  assert.equal(invitationIn(view, "welcome").querySelectorAll("p").length, 1);
}

async function failedVideoReturnsToPhotoWithoutBrokenControls() {
  const view = mount(); await flush();
  const element = videoIn(view);
  const film = element.parentElement;
  const footer = view.getByRole("button", { name: pauseLabel }).parentElement;
  const reservedCaptions = [...view.container.querySelectorAll("[data-cafe-cue]")];
  fireEvent.error(element); await flush();
  assert.equal(view.container.querySelector("video"), null);
  assert.equal(view.queryByRole("button"), null);
  assert.equal(view.getByRole("status").textContent, "The video is unavailable. A café photo is shown.");
  assert.ok(view.container.querySelector("[data-cafe-hero]"), "the poster wrapper remains in place");
  assert.ok(film?.isConnected && footer?.isConnected, "the film and mobile footer remain after a media failure");
  assert.ok(reservedCaptions.every(caption => caption.isConnected), "caption sizing remains reserved when the player fails");
  assert.equal(element.getAttribute("src"), null, "failed playback releases the source");
  assert.ok(observers.every(observer => observer.disconnected));
}

async function unmountUnsubscribesFromNativeLifecycleChanges() {
  const nativeListeners = new Set<EventListenerOrEventListenerObject>();
  const originalAdd = window.addEventListener;
  const originalRemove = window.removeEventListener;
  Object.defineProperties(window, {
    addEventListener: { configurable: true, writable: true, value: function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (type === "pratiqo:app-state") nativeListeners.add(listener);
      return Reflect.apply(originalAdd, window, [type, listener, options]);
    } },
    removeEventListener: { configurable: true, writable: true, value: function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
      if (type === "pratiqo:app-state") nativeListeners.delete(listener);
      return Reflect.apply(originalRemove, window, [type, listener, options]);
    } },
  });
  try {
    const view = mount(); await flush();
    assert.ok(nativeListeners.size > 0);
    view.unmount(); await flush();
    assert.equal(nativeListeners.size, 0, "leaving the entrance must release native lifecycle listeners");
    const attempts = playSources.length;
    await nativeAppState("background");
    await nativeAppState("active");
    assert.equal(playSources.length, attempts);
  } finally {
    cleanup();
    Object.defineProperties(window, {
      addEventListener: { configurable: true, writable: true, value: originalAdd },
      removeEventListener: { configurable: true, writable: true, value: originalRemove },
    });
  }
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
  const cases = [unconfiguredMediaKeepsPhotoWithoutVideoRequest, serverMarkupNeverAssumesMotionOrNetworkPermission, playbackHasSilentInlineControlsInEveryLocale, reducedMotionLoadsOnlyAfterExplicitPlay, savingDataAndSlowConnectionsAvoidAutomaticDownloads, firstPlayClickRecoversFromAutoplayDenial, hiddenDocumentDefersFirstSourceAttachment, hiddenAndOffscreenPlaybackPausesWithoutUndoingManualPause, nativeBackgroundAndInactivePauseUntilBothNativeAndWebAreVisible, nativeResumeDoesNotUndoAnExplicitPause, queuedPlayWaitsForNativeActivationWithoutLosingIntent, queuedRestrictedPlayDefersSourceUntilVisible, latePlayingEventCannotEscapeNativeBackgroundPause, invitationsFollowSeekingPausedTimeAndLoopRestart, invitationTranslationsChangeWithoutRestartingTheFilm, failedVideoReturnsToPhotoWithoutBrokenControls, unmountUnsubscribesFromNativeLifecycleChanges, strictModeReplaysRestoreTheLocalSource, unmountReleasesMediaAndIgnoresPendingPlaybackFailure];
  for (const test of cases) {
    resetEnvironment();
    try { await test(); console.log(`✓ ${test.name}`); } finally { cleanup(); await flush(); }
  }
  assert.equal(mediaRequests, 0);
  console.log(`cafeHeroMedia: ${cases.length} React player lifecycle scenarios passed; media mocked, no camera/microphone requests`);
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
