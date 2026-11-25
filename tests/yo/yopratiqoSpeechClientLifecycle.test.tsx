import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/yo/langues/anglais/demarrer", pretendToBeVisual: true,
});
for (const [name, value] of Object.entries({
  React, window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
  HTMLInputElement: dom.window.HTMLInputElement, CustomEvent: dom.window.CustomEvent,
  Event: dom.window.Event, MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
dom.window.HTMLMediaElement.prototype.pause = function () {};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
type Session = { user: { id: string }; access_token: string } | null;
const userA = { user: { id: "learner-a" }, access_token: "test-token-a" };
const userB = { user: { id: "learner-b" }, access_token: "test-token-b" };
let session: Session = userA, authCalls = 0;
const listeners = new Set<(event: string, session: Session) => void>();
const sessionReads: Array<Promise<{ data: { session: Session } }>> = [];
const auth = {
  getSession() { authCalls++; return sessionReads.shift() ?? Promise.resolve({ data: { session } }); },
  onAuthStateChange(callback: (event: string, session: Session) => void) {
    listeners.add(callback);
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
};
type Capture = { signal: AbortSignal; cancelled: boolean; stops: number };
const captures: Capture[] = [];
function stubModule(name: string, exports: object) {
  const id = require.resolve(name);
  require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule;
}
stubModule("@/lib/supabase", { getSupabaseClient: () => ({ auth }) });
stubModule("@/lib/yo/speech/recorder", {
  speechRequestId: () => "12345678-1234-4234-8234-123456789012",
  startSpeechRecording: async (signal: AbortSignal) => {
    const capture: Capture = { signal, cancelled: false, stops: 0 };
    captures.push(capture);
    signal.addEventListener("abort", () => { capture.cancelled = true; }, { once: true });
    return {
      cancel() { capture.cancelled = true; },
      stop() { capture.stops++; return "AQABAA=="; },
    };
  },
  pcmWavBlob: () => new Blob([], { type: "audio/wav" }),
});

type RequestLog = { url: string; method: string; headers?: HeadersInit; signal?: AbortSignal | null; body?: BodyInit | null };
const requests: RequestLog[] = [];
const turns: Array<Promise<Response>> = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  requests.push({ url, method: init?.method ?? "GET", headers: init?.headers, signal: init?.signal, body: init?.body });
  if (url.endsWith("/status")) return Response.json({ available: true, remainingSeconds: 300 });
  if (url.includes("/reviews")) return Response.json({ items: [] });
  if (url.endsWith("/turn")) return await (turns.shift() ?? Promise.resolve(Response.json({ error: "unavailable" }, { status: 503 })));
  throw new Error(`Unexpected request: ${url}`);
}) as typeof fetch;
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const { YoSpeechPractice } = require("@/components/yo/speech/YoSpeechPractice") as typeof import("../../components/yo/speech/YoSpeechPractice");
async function flush() { await act(async () => { await Promise.resolve(); }); }
function reset() {
  cleanup(); session = userA; authCalls = 0; listeners.clear(); sessionReads.length = 0;
  captures.length = 0; requests.length = 0; turns.length = 0;
}
function mount() { return render(<YoSpeechPractice language="en" locale="en" />); }
async function open(view: ReturnType<typeof mount>) {
  const details = view.container.querySelector("details")!;
  act(() => { details.open = true; fireEvent(details, new Event("toggle")); });
  await flush();
}
function agree(view: ReturnType<typeof mount>) {
  fireEvent.click(view.getByRole("checkbox", { name: /I agree to send my voice/ }));
}
async function start(view: ReturnType<typeof mount>) {
  fireEvent.click(view.getByRole("button", { name: "Your turn to speak" }));
  await flush();
}
function changeAccount(next: Session) {
  act(() => { session = next; listeners.forEach((listener) => listener("SIGNED_IN", next)); });
}
const tests: Array<[string, () => Promise<void>]> = [];

tests.push(["opening and consent are separate from the explicit microphone gesture", async () => {
  const view = mount(); await flush();
  assert.equal(authCalls, 0); assert.equal(requests.length, 0); assert.equal(captures.length, 0);
  await open(view);
  assert.ok(authCalls > 0); assert.equal(captures.length, 0);
  const record = view.getByRole("button", { name: "Your turn to speak" }) as HTMLButtonElement;
  assert.equal(record.disabled, true);
  agree(view); assert.equal(record.disabled, false); assert.equal(captures.length, 0);
  await start(view); assert.equal(captures.length, 1);
  assert.ok(view.getByRole("button", { name: "Send my reply" }));
  assert.equal(requests.filter((request) => request.url.endsWith("/turn")).length, 0);
}]);

tests.push(["a cancelled send cannot reset a newer recording when its token lookup resolves", async () => {
  const view = mount(); await open(view); agree(view); await start(view);
  const oldToken = deferred<{ data: { session: Session } }>(); sessionReads.push(oldToken.promise);
  fireEvent.click(view.getByRole("button", { name: "Send my reply" }));
  fireEvent.click(view.getByRole("button", { name: "Cancel" }));
  await start(view); assert.equal(captures.length, 2);
  await act(async () => { oldToken.resolve({ data: { session: userA } }); await oldToken.promise; }); await flush();
  assert.ok(view.getByRole("button", { name: "Send my reply" }), "the new capture must remain visibly recording");
  assert.equal(captures[1].cancelled, false);
  assert.equal(requests.filter((request) => request.url.endsWith("/turn")).length, 0, "the cancelled audio must never be sent");
}]);

tests.push(["late results from an old account cannot appear or become the next account's history", async () => {
  const view = mount(); await open(view); agree(view); await start(view);
  const oldReply = deferred<Response>(); turns.push(oldReply.promise);
  fireEvent.click(view.getByRole("button", { name: "Send my reply" })); await flush();
  const oldRequest = requests.find((request) => request.url.endsWith("/turn"))!;
  assert.ok(oldRequest); assert.equal(new Headers(oldRequest.headers).get("Authorization"), "Bearer test-token-a");
  changeAccount(userB); await flush();
  assert.equal(oldRequest.signal?.aborted, true);
  assert.equal((view.getByRole("checkbox", { name: /I agree to send my voice/ }) as HTMLInputElement).checked, false);
  await act(async () => { oldReply.resolve(Response.json({ requestId: "old", transcript: "private former learner phrase", reply: "old response", audio: "", feedback: null, reviewSaved: false })); }); await flush();
  assert.equal(view.queryByText("private former learner phrase"), null);
  agree(view); await start(view);
  fireEvent.click(view.getByRole("button", { name: "Send my reply" })); await flush();
  const latest = requests.filter((request) => request.url.endsWith("/turn")).at(-1)!;
  assert.equal(new Headers(latest.headers).get("Authorization"), "Bearer test-token-b");
  assert.deepEqual(JSON.parse(String(latest.body)).history, []);
}]);

tests.push(["a delayed initial session cannot replace a newer authenticated account", async () => {
  const firstSession = deferred<{ data: { session: Session } }>(); sessionReads.push(firstSession.promise);
  const view = mount(); await open(view);
  changeAccount(userB); await flush();
  await act(async () => { firstSession.resolve({ data: { session: userA } }); await firstSession.promise; }); await flush();
  const statusRequests = requests.filter((request) => request.url.endsWith("/status"));
  assert.equal(statusRequests.length, 1);
  assert.equal(new Headers(statusRequests[0].headers).get("Authorization"), "Bearer test-token-b");
  agree(view); await start(view);
  fireEvent.click(view.getByRole("button", { name: "Send my reply" })); await flush();
  const turn = requests.find((request) => request.url.endsWith("/turn"))!;
  assert.ok(turn); assert.equal(new Headers(turn.headers).get("Authorization"), "Bearer test-token-b");
}]);

tests.push(["cinema, hidden course content and closing the disclosure stop microphone use", async () => {
  const view = mount(); await open(view); agree(view); await start(view);
  act(() => { window.dispatchEvent(new Event("yo-cinema-open")); });
  assert.equal(captures[0].cancelled, true);
  assert.ok(view.getByRole("button", { name: "Your turn to speak" }));
  await start(view);
  await act(async () => { view.container.setAttribute("aria-hidden", "true"); }); await flush();
  assert.equal(captures[1].cancelled, true);
  act(() => view.container.removeAttribute("aria-hidden"));
  await start(view);
  const details = view.container.querySelector("details")!;
  act(() => { details.open = false; fireEvent(details, new Event("toggle")); }); await flush();
  assert.equal(captures[2].cancelled, true); assert.equal(listeners.size, 0);
  assert.equal(requests.filter((request) => request.url.endsWith("/turn")).length, 0);
}]);

async function main() {
  try { for (const [name, run] of tests) { reset(); await run(); console.log("PASS: " + name); } }
  finally { cleanup(); dom.window.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
