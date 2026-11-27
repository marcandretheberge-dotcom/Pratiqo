import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import type { RankingSnapshot } from "@/lib/yo/rankings/contract";
import { RANKING_LANGUAGES } from "@/lib/yo/rankings/contract";
import { productLoginHref } from "@/lib/auth/productReturn";
import { RankingClientError, readRankingSnapshot, type RankingTransport } from "@/lib/yo/rankings/uiClient";

// Component/HTTP contract tests use explicit synthetic fixtures; this is not live-account evidence.
const require = createRequire(`${process.cwd()}/package.json`);
require.extensions[".css"] = module => { module.exports = new Proxy({}, { get: (_target, name) => name === "__esModule" ? false : String(name) }); };
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/classement?lang=en", pretendToBeVisual: true });
for (const [key, value] of Object.entries({ React, window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Node: dom.window.Node, Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent, MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const { RankingsAccount } = require("@/components/yo/rankings/YoRankings") as typeof import("@/components/yo/rankings/YoRankings");
const { RankingNavLink } = require("@/components/yo/rankings/RankingNavLink") as typeof import("@/components/yo/rankings/RankingNavLink");
const tests: [string, () => void | Promise<void>][] = [];
const test = (name: string, run: () => void | Promise<void>) => tests.push([name, run]);
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function click(element: HTMLElement) { fireEvent.click(element); await flush(); }
function base(): RankingSnapshot {
  return {
    profile: { id: "public-self", displayName: "Test explorer", participating: true, friendCode: "ABCD1234", totalXp: 120, weekXp: 30 },
    scope: "everyone", period: "week", language: "all", weekStartsAt: "2026-11-23T05:00:00.000Z",
    rows: [{ id: "public-other", name: "Test neighbour", xp: 40, rank: 1, isYou: false, friend: true }, { id: "public-self", name: "Test explorer", xp: 30, rank: 2, isYou: true, friend: false }],
    nearby: [], me: { id: "public-self", name: "Test explorer", xp: 30, rank: 2, isYou: true, friend: false }, totalParticipants: 2,
    friends: { incoming: [], outgoing: [], accepted: [], blocked: [] },
  };
}
function forPath(snapshot: RankingSnapshot, path: string): RankingSnapshot {
  const query = new URLSearchParams(path.startsWith("?") ? path.slice(1) : "");
  return { ...snapshot, scope: query.get("scope") as RankingSnapshot["scope"] || "everyone", period: query.get("period") as RankingSnapshot["period"] || "week", language: query.get("language") as RankingSnapshot["language"] || "all" };
}
function transportFor(state: RankingSnapshot, calls: { path: string; body?: unknown; owner: string }[] = []): RankingTransport {
  return async (owner, path, init) => { calls.push({ owner, path, body: init?.body ? JSON.parse(String(init.body)) : undefined }); return forPath(state, path); };
}
function account(transport: RankingTransport, locale: "fr" | "en" | "es" = "en") { return render(<RankingsAccount userId="account-a" locale={locale} transport={transport} />); }

test("only supplied real rows render, with the current learner highlighted and private fields absent", async () => {
  const view = account(transportFor(base())); await flush();
  assert.ok(view.getByText("Test neighbour"));
  assert.equal(document.querySelectorAll('[data-ranking-self="true"]').length, 1);
  assert.ok(document.querySelector('[data-ranking-self="true"]')?.textContent?.includes("30"));
  assert.equal(view.queryByText("Alba"), null); assert.equal(view.queryByText("Nico"), null);
  assert.ok(view.getByText("120")); assert.ok(view.getByText("#2"));
  assert.equal(document.body.textContent?.includes("account-a"), false);
});
test("empty is honest, without invented learners or an invented current rank", async () => {
  const data = base(); data.rows = []; data.me = null; data.totalParticipants = 0; data.profile.totalXp = 0; data.profile.weekXp = 0;
  const view = account(transportFor(data)); await flush();
  assert.ok(view.getByText("The adventure is just beginning."));
  assert.ok(view.getByText("Your first points are ahead"));
  assert.equal(view.queryByRole("list", { name: "Rankings" }), null);
});
test("all eight language filters, weekly/all-time and friends send explicit query scopes", async () => {
  const calls: { path: string; body?: unknown; owner: string }[] = [];
  const view = account(transportFor(base(), calls)); await flush();
  await click(view.getByRole("button", { name: "Friends" }));
  fireEvent.change(view.getByRole("combobox", { name: "Time period" }), { target: { value: "all" } }); await flush();
  for (const language of RANKING_LANGUAGES) {
    fireEvent.change(view.getByRole("combobox", { name: "Learning language" }), { target: { value: language } }); await flush();
    const query = new URLSearchParams(calls.at(-1)!.path.slice(1));
    assert.equal(query.get("scope"), "friends"); assert.equal(query.get("period"), "all"); assert.equal(query.get("language"), language);
  }
});
test("joining is explicit; no automatic alias or participation is submitted", async () => {
  const data = base(); data.profile = { ...data.profile, id: "", displayName: "", friendCode: "", participating: false }; data.me = null;
  const calls: { path: string; body?: unknown; owner: string }[] = [];
  const transport: RankingTransport = async (owner, path, init) => {
    calls.push({ owner, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (init?.method === "POST") { const payload = JSON.parse(String(init.body)); data.profile = { ...data.profile, id: "new-public", friendCode: "QWER5678", displayName: payload.displayName, participating: payload.participating }; return { ok: true }; }
    return forPath(data, path);
  };
  const view = account(transport); await flush();
  assert.equal(calls.filter(c => c.body).length, 0);
  const input = view.getByRole("textbox", { name: "Your nickname" }) as HTMLInputElement;
  assert.equal(input.value, "");
  fireEvent.change(input, { target: { value: " Test alias " } });
  fireEvent.submit(input.closest("form")!); await flush();
  assert.deepEqual(calls.find(c => c.path === "/profile")?.body, { displayName: "Test alias", participating: true });
  assert.ok(view.getByText("You’re participating"));
});
test("opting out keeps total XP, removes personal standing and offers no friend-request form", async () => {
  const data = base();
  const transport: RankingTransport = async (_owner, path, init) => {
    if (init?.method === "POST") { assert.deepEqual(JSON.parse(String(init.body)), { displayName: "Test explorer", participating: false }); data.profile.participating = false; data.me = null; data.rows = data.rows.filter(row => !row.isYou); return { ok: true }; }
    return forPath(data, path);
  };
  const view = account(transport); await flush();
  await click(view.getByRole("button", { name: "Keep my progress private" }));
  assert.ok(view.getAllByText("Your progress is private").length);
  assert.ok(view.getByText("120")); assert.equal(view.queryByText("#2"), null);
  assert.equal(view.queryByRole("textbox", { name: "A friend’s code" }), null);
  assert.equal(document.querySelector('[data-ranking-self="true"]'), null);
});
test("friend requests use the entered code and explicit accept/remove/block/unblock actions", async () => {
  const data = base(); data.friends.incoming = [{ id: "public-pending", name: "Test pending friend" }];
  data.friends.blocked = [{ id: "public-blocked", name: "Test blocked profile" }];
  data.friends.accepted = [{ id: "public-accepted", name: "Test accepted friend" }];
  const calls: { path: string; body?: unknown; owner: string }[] = [];
  const view = account(transportFor(data, calls)); await flush();
  const input = view.getByRole("textbox", { name: "A friend’s code" });
  fireEvent.change(input, { target: { value: "ZXCV1234" } }); fireEvent.submit(input.closest("form")!); await flush();
  assert.deepEqual(calls.find(call => call.path === "/friends")?.body, { action: "request", code: "ZXCV1234" });
  await click(view.getByRole("button", { name: "Accept" }));
  assert.deepEqual(calls.filter(c => c.path === "/friends").at(-1)?.body, { action: "accept", id: "public-pending" });
  await click(view.getByRole("button", { name: "Remove friend" }));
  assert.deepEqual(calls.filter(c => c.path === "/friends").at(-1)?.body, { action: "remove", id: "public-accepted" });
  await click(view.getByRole("button", { name: "Unblock" }));
  assert.deepEqual(calls.filter(c => c.path === "/friends").at(-1)?.body, { action: "unblock", id: "public-blocked" });
  const pending = view.getByText("Test pending friend").closest("li")!;
  await click(Array.from(pending.querySelectorAll("button")).find(button => button.textContent === "Block")!);
  assert.deepEqual(calls.filter(c => c.path === "/friends").at(-1)?.body, { action: "block", id: "public-pending" });
});
test("a service failure offers retry and cannot masquerade as an empty leaderboard", async () => {
  let fail = true;
  const view = account(async (_owner, path) => { if (fail) throw new RankingClientError(503, "unavailable"); return forPath(base(), path); }); await flush();
  assert.ok(view.getByRole("alert").textContent?.includes("couldn’t be loaded"));
  assert.equal(view.queryByText("The adventure is just beginning."), null);
  assert.equal(view.queryByText("0"), null);
  fail = false; await click(view.getByRole("button", { name: "Try again" }));
  assert.ok(view.getByText("Test neighbour"));
});
test("redacted friend aliases keep a localized label without exposing an identifier", async () => {
  const data = base(); data.friends.blocked = [{ id: "public-redacted-id", name: "" }];
  for (const [locale, label] of [["en", "Hidden profile"], ["fr", "Profil masqué"], ["es", "Perfil oculto"]] as const) {
    cleanup(); const view = account(transportFor(data), locale); await flush();
    assert.ok(view.getByText(label));
    assert.equal(document.body.textContent?.includes("public-redacted-id"), false);
  }
});
test("a slow response for an old filter cannot replace the newly selected board", async () => {
  let resolveFirst!: (value: unknown) => void;
  let calls = 0;
  const friendData = base(); friendData.rows[0] = { ...friendData.rows[0], name: "Test current selection" };
  const transport: RankingTransport = async (_owner, path) => {
    calls++; if (calls === 1) return new Promise(resolve => { resolveFirst = resolve; });
    return forPath(friendData, path);
  };
  const view = account(transport); await flush();
  await click(view.getByRole("button", { name: "Friends" }));
  assert.ok(view.getByText("Test current selection"));
  await act(async () => { resolveFirst(base()); await Promise.resolve(); });
  assert.ok(view.getByText("Test current selection")); assert.equal(view.queryByText("Test neighbour"), null);
});
test("keyed account replacement clears private rows immediately and ignores the previous account’s request", async () => {
  let resolveOld!: (value: unknown) => void;
  const transport: RankingTransport = async (owner, path) => owner === "account-a" ? new Promise(resolve => { resolveOld = resolve; }) : forPath({ ...base(), rows: [] }, path);
  const view = render(<RankingsAccount key="account-a" userId="account-a" locale="en" transport={transport} />); await flush();
  view.rerender(<RankingsAccount key="account-b" userId="account-b" locale="en" transport={transport} />); await flush();
  await act(async () => { resolveOld(base()); await Promise.resolve(); });
  assert.equal(view.queryByText("Test neighbour"), null);
});
test("nearby rows retain their actual position when the learner is outside the top rows", async () => {
  const data = base(); data.rows = [data.rows[0]]; data.me = { ...data.me!, rank: 24 };
  data.nearby = [{ id: "public-near", name: "Test nearby learner", xp: 40, rank: 23, isYou: false, friend: false }, data.me];
  const view = account(transportFor(data)); await flush();
  assert.ok(view.getByText("Around your position")); assert.ok(view.getByText("Test nearby learner")); assert.ok(view.getByText("#24"));
  assert.equal(document.querySelectorAll('[data-ranking-self="true"]').length, 1);
});
for (const locale of ["fr", "es"] as const) test(`${locale}: labels and calls to action are localized`, async () => {
  const view = account(transportFor(base()), locale); await flush();
  assert.ok(view.getByRole("button", { name: locale === "fr" ? "Mes amis" : "Mis amigos" }));
  assert.ok(view.getByRole("button", { name: locale === "fr" ? "Garder mes progrès privés" : "Mantener mi progreso privado" }));
  assert.equal(view.queryByRole("button", { name: "Keep my progress private" }), null);
});
test("navigation and sign-in return to the real product route, retaining interface language", () => {
  const view = render(<RankingNavLink locale="es" />);
  assert.equal(view.getByRole("link", { name: "Clasificación" }).getAttribute("href"), "/yo/classement?lang=es");
  assert.equal(new URL(productLoginHref("/yo/classement?lang=es"), "https://example.test").searchParams.get("next"), "/yo/classement?lang=es");
});
test("malformed server responses cannot supply invented zero totals or incomplete friend state", () => {
  assert.throws(() => readRankingSnapshot({}), RankingClientError);
  assert.throws(() => readRankingSnapshot({ ...base(), profile: { ...base().profile, totalXp: -1 } }), RankingClientError);
  assert.throws(() => readRankingSnapshot({ ...base(), friends: {} }), RankingClientError);
  assert.equal(readRankingSnapshot(base()).profile.totalXp, 120);
});

async function main() {
  for (const [name, run] of tests) { cleanup(); await run(); console.log(`PASS ${name}`); }
  cleanup(); console.log(`PASS ${tests.length} ranking UI/HTTP contract cases (synthetic data)`);
}
void main().catch(error => { cleanup(); console.error(error); process.exitCode = 1; });
