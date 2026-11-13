import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, afterEach, test } from "node:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { CafePublicSession } from "../../lib/cafe/publicTypes";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://cafe.example.test/cafe", pretendToBeVisual: true });
for (const [key, value] of Object.entries({
  window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
localStorage.setItem("pratiqo-locale", "fr");

const previousCss = require.extensions[".css"];
require.extensions[".css"] = module => { module.exports = {}; };
const { CafeFrontDoor } = require("@/app/cafe/CafeFrontDoor") as typeof import("../../app/cafe/CafeFrontDoor");
const { LocaleProvider } = require("@/lib/locale-context") as typeof import("../../lib/locale-context");
if (previousCss) require.extensions[".css"] = previousCss; else delete require.extensions[".css"];
const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime") as typeof import("next/dist/shared/lib/app-router-context.shared-runtime");
const { SearchParamsContext } = require("next/dist/shared/lib/hooks-client-context.shared-runtime") as typeof import("next/dist/shared/lib/hooks-client-context.shared-runtime");
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const originalFetch = globalThis.fetch;

function FrontDoor({ step = "groups" }: { step?: string }) {
  const [params, setParams] = React.useState(() => new URLSearchParams(step ? { step } : {}));
  const router = React.useMemo<AppRouterInstance>(() => ({
    back() {}, forward() {}, refresh() {}, prefetch() {},
    push(href) { setParams(new URL(href, "https://cafe.example.test").searchParams); },
    replace(href) { setParams(new URL(href, "https://cafe.example.test").searchParams); },
  }), []);
  return <LocaleProvider><AppRouterContext.Provider value={router}><SearchParamsContext.Provider value={params}>
    <CafeFrontDoor />
  </SearchParamsContext.Provider></AppRouterContext.Provider></LocaleProvider>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function session(slug: string, title: string, startsAt: string): CafePublicSession {
  return { slug, title, primary_language: "fr", practice_language: "ja", level: null, starts_at: startsAt,
    duration_minutes: 30, max_participants: 4, confirmed_count: 0, remaining_spots: 4 };
}
const EARLY = session("morning", "La table du matin", "2027-02-01T10:00:00Z");
const LATE = session("evening", "La table du soir", "2027-02-01T20:00:00Z");
async function flush() { await act(async () => { await new Promise<void>(resolve => setImmediate(resolve)); }); }

afterEach(async () => { cleanup(); await flush(); globalThis.fetch = originalFetch; });
after(() => dom.window.close());

test("hydrated front door finishes its request after entering loading, including StrictMode effect replay", async () => {
  const requests: Array<{ input: RequestInfo | URL; init?: RequestInit; response: ReturnType<typeof deferred<Response>> }> = [];
  globalThis.fetch = (input, init) => {
    const response = deferred<Response>(); requests.push({ input, init, response }); return response.promise;
  };
  const element = <React.StrictMode><FrontDoor /></React.StrictMode>;
  const container = document.createElement("div");
  container.innerHTML = renderToString(element);
  document.body.appendChild(container);
  const hydrationErrors: unknown[] = [];
  const view = render(element, { container, hydrate: true, onRecoverableError: error => hydrationErrors.push(error) });
  await flush();
  assert.ok(view.getByText("On prépare les tables…"));
  assert.ok(requests.length >= 1);
  const current = requests.at(-1)!;
  assert.equal(current.input, "/api/cafe/sessions");
  assert.equal(current.init?.cache, "no-store");
  assert.equal(new Headers(current.init?.headers).has("Authorization"), false, "Public tables do not wait for an authenticated session");
  await act(async () => current.response.resolve(Response.json({ ok: true, sessions: [LATE, EARLY] })));
  await flush();
  assert.ok(view.queryByText("On prépare les tables…") === null, "The request must not invalidate itself when it sets loading");
  const cards = view.getAllByRole("article");
  assert.match(cards[0].textContent ?? "", /La table du matin/);
  assert.match(cards[1].textContent ?? "", /La table du soir/);
  assert.deepEqual(hydrationErrors, []);
});

test("the actual feature-disabled public route reaches opening-soon without requiring auth or Supabase", async () => {
  const previousFlag = process.env.CAFE_V1_ENABLED;
  delete process.env.CAFE_V1_ENABLED;
  try {
    const { GET } = await import("../../app/api/cafe/sessions/route");
    globalThis.fetch = async input => GET(new Request(new URL(String(input), "https://cafe.example.test")));
    const view = render(<FrontDoor />);
    await flush();
    assert.ok(view.getByText("Le café n’est pas encore ouvert."));
    assert.ok(view.queryByText("On prépare les tables…") === null);
  } finally {
    if (previousFlag === undefined) delete process.env.CAFE_V1_ENABLED; else process.env.CAFE_V1_ENABLED = previousFlag;
  }
});

test("empty, unavailable and invalid listing responses each reach a completed state", async () => {
  globalThis.fetch = async () => Response.json({ ok: true, sessions: [] });
  let view = render(<FrontDoor />);
  await flush();
  assert.ok(view.getByText("Aucun café n’est programmé pour le moment. Reviens bientôt."));
  cleanup();
  for (const response of [Response.json({ ok: false }, { status: 503 }), Response.json({ ok: false, sessions: [] }), Response.json(null)]) {
    globalThis.fetch = async () => response;
    view = render(<FrontDoor />);
    await flush();
    assert.ok(view.getByText("Le café n’est pas disponible pour le moment."));
    assert.ok(view.getByRole("button", { name: "Réessayer" }));
    assert.ok(view.queryByText("On prépare les tables…") === null);
    cleanup();
  }
});

test("leaving a pending listing aborts it, and re-entering starts a fresh request that ignores the old result", async () => {
  const requests: Array<{ signal: AbortSignal | null | undefined; response: ReturnType<typeof deferred<Response>> }> = [];
  globalThis.fetch = (_input, init) => {
    const response = deferred<Response>(); requests.push({ signal: init?.signal, response }); return response.promise;
  };
  const view = render(<FrontDoor />);
  await flush();
  assert.equal(requests.length, 1);
  fireEvent.click(view.getByRole("button", { name: /Retour/ }));
  await flush();
  assert.equal(requests[0].signal?.aborted, true);
  assert.ok(view.getByRole("heading", { name: "Comment veux-tu pratiquer aujourd’hui ?" }));
  fireEvent.click(view.getByRole("button", { name: /En groupe/ }));
  await flush();
  assert.equal(requests.length, 2);
  await act(async () => requests[1].response.resolve(Response.json({ ok: true, sessions: [EARLY] })));
  await flush();
  assert.ok(view.getByText(EARLY.title));
  await act(async () => requests[0].response.resolve(Response.json({ ok: true, sessions: [LATE] })));
  await flush();
  assert.ok(view.getByText(EARLY.title));
  assert.ok(view.queryByText(LATE.title) === null, "A response from the previous visit must not overwrite the new listing");
  view.unmount();
  assert.equal(requests[1].signal?.aborted, true);
});

test("a hung request has a deadline, can be retried, and cannot replace the successful retry later", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const stalled = deferred<Response>();
  let requestCount = 0;
  let firstSignal: AbortSignal | null | undefined;
  globalThis.fetch = (_input, init) => {
    requestCount += 1;
    if (requestCount === 1) { firstSignal = init?.signal; return stalled.promise; }
    return Promise.resolve(Response.json({ ok: true, sessions: [EARLY] }));
  };
  const view = render(<FrontDoor />);
  await flush();
  await act(async () => context.mock.timers.tick(10_001));
  assert.ok(view.getByText("Le café n’est pas disponible pour le moment."));
  assert.equal(firstSignal?.aborted, true);
  fireEvent.click(view.getByRole("button", { name: "Réessayer" }));
  await flush();
  assert.equal(requestCount, 2);
  assert.ok(view.getByText(EARLY.title));
  await act(async () => stalled.resolve(Response.json({ ok: true, sessions: [LATE] })));
  await flush();
  assert.ok(view.queryByText(LATE.title) === null, "A timed-out request must not overwrite a successful retry");
  assert.ok(view.getByText(EARLY.title));
});

test("the same deadline covers a response whose JSON body never finishes", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const stalledBody = deferred<unknown>();
  globalThis.fetch = async () => ({ ok: true, status: 200, json: () => stalledBody.promise }) as Response;
  const view = render(<FrontDoor />);
  await flush();
  await act(async () => context.mock.timers.tick(10_001));
  assert.ok(view.getByText("Le café n’est pas disponible pour le moment."));
  assert.ok(view.queryByText("On prépare les tables…") === null);
  await act(async () => stalledBody.resolve({ ok: true, sessions: [LATE] }));
  await flush();
  assert.ok(view.queryByText(LATE.title) === null, "A body that resolves after the deadline must stay discarded");
});
