/** Actual React room component; network responses are mocked, never live Daily. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://cafe.example.test/",
  pretendToBeVisual: true,
});
const frames: FrameRequestCallback[] = [];
for (const [key, value] of Object.entries({
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  requestAnimationFrame: (fn: FrameRequestCallback) => frames.push(fn),
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

// Node has no CSS module loader; only styling is stubbed. The component,
// reducer, request helper and lifecycle code are the production modules.
const previousCssLoader = require.extensions[".css"];
require.extensions[".css"] = (module) => { module.exports = {}; };
const { CafeConversationRoom } = require("@/components/cafe/CafeConversationRoom") as typeof import("@/components/cafe/CafeConversationRoom");
if (previousCssLoader) require.extensions[".css"] = previousCssLoader;
else delete require.extensions[".css"];
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const originalFetch = globalThis.fetch;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function mount(getAccessToken: () => Promise<string | null>) {
  return render(<CafeConversationRoom
    locale="en" mode="live" slug="test-table" sessionTitle="Test table"
    courseReturnHref={null} getAccessToken={getAccessToken}
  />);
}

async function flush() {
  await act(async () => {
    for (const frame of frames.splice(0)) frame(0);
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
}

async function enter(view: ReturnType<typeof mount>) {
  fireEvent.click(view.getByRole("button", { name: "Prepare camera and microphone" }));
  fireEvent.click(view.getByRole("button", { name: "Enter the room" }));
  await flush();
}

function phase(view: ReturnType<typeof mount>) {
  return view.container.querySelector("main")?.getAttribute("data-cafe-room-phase");
}

async function authRejectionShowsRetry() {
  const view = mount(async () => { throw new Error("auth temporarily unavailable"); });
  await enter(view);
  assert.equal(phase(view), "error");
  assert.ok(view.getByRole("alert"));
  fireEvent.click(view.getByRole("button", { name: "Try again" }));
  assert.equal(phase(view), "media_prep");
}

async function malformedJsonShowsRetry() {
  const paths: string[] = [];
  globalThis.fetch = async (path) => {
    paths.push(String(path));
    return new Response("null", { status: 200 });
  };
  const view = mount(async () => "test-bearer");
  await enter(view);
  assert.equal(phase(view), "error");
  assert.deepEqual(paths, ["/api/cafe/sessions/test-table/host"]);
  assert.equal(view.container.querySelector("iframe"), null);
  assert.ok(view.getByRole("button", { name: "Try again" }));
}

async function cancelDuringAuthIgnoresLateResolution() {
  const token = deferred<string | null>();
  let requests = 0;
  globalThis.fetch = async () => { requests += 1; throw new Error("unexpected request"); };
  const view = mount(() => token.promise);
  await enter(view);
  assert.equal(phase(view), "joining");
  fireEvent.click(view.getByRole("button", { name: "Leave the room" }));
  assert.equal(phase(view), "left");
  token.resolve("test-bearer");
  await flush();
  assert.equal(phase(view), "left");
  assert.equal(requests, 0);
}

async function cancelDuringJoinIgnoresLateToken() {
  const reply = deferred<Response>();
  globalThis.fetch = async () => reply.promise;
  const view = mount(async () => "test-bearer");
  await enter(view);
  assert.equal(phase(view), "joining");
  fireEvent.click(view.getByRole("button", { name: "Leave the room" }));
  reply.resolve(new Response(JSON.stringify({
    ok: true, role: "host", roomUrl: "https://example.daily.co/test-room",
    token: "test-meeting-token", expiresAt: "2099-01-01T00:00:00.000Z",
  })));
  await flush();
  assert.equal(phase(view), "left");
  assert.equal(view.container.querySelector("iframe"), null);
  assert.equal(dom.window.localStorage.length, 0);
}

void (async () => {
  try {
    for (const test of [authRejectionShowsRetry, malformedJsonShowsRetry, cancelDuringAuthIgnoresLateResolution, cancelDuringJoinIgnoresLateToken]) {
      cleanup();
      frames.length = 0;
      globalThis.fetch = originalFetch;
      await test();
    }
    console.log("[cafe:room-component] 4 actual-component auth/error/cancellation checks passed (mocked network)");
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
    dom.window.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
