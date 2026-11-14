import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import type { CafeCommunityCallTransport } from "../../lib/cafe/communityCallClient";
import type { CafeCommunityCommand, CafeCommunityCallJoin, CafeCommunityCommandResult } from "../../lib/cafe/communityTypes";
import type { CafeDailyCallHandle } from "../../lib/cafe/dailyRoomSession";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://cafe.example.test", pretendToBeVisual: true });
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver,
  IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
const previousCss = require.extensions[".css"];
require.extensions[".css"] = (module) => { module.exports = {}; };
const { CafeCommunityCall } = require("@/app/cafe/appels/[callId]/CafeCommunityCall") as typeof import("../../app/cafe/appels/[callId]/CafeCommunityCall");
if (previousCss) require.extensions[".css"] = previousCss; else delete require.extensions[".css"];
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");

const me = { id: "10000000-0000-4000-8000-000000000001", displayName: "Alex", nativeLanguages: ["fr"], learningLanguages: ["ja"] };
const other = { ...me, id: "10000000-0000-4000-8000-000000000002", displayName: "Nori", nativeLanguages: ["ja"], learningLanguages: ["fr"] };
const callId = "20000000-0000-4000-8000-000000000001";
const roomId = "30000000-0000-4000-8000-000000000001";
const identity = { userId: me.id, accessToken: "test-bearer" };
const future = new Date(Date.now() + 3_600_000).toISOString();
const joinResult: CafeCommunityCallJoin = { ok: true, roomUrl: "https://test.daily.co/call", token: "test-token", expiresAt: future, endsAt: future };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
async function flush() { await act(async () => { await new Promise<void>((resolve) => setImmediate(resolve)); }); }

function harness() {
  const commands: CafeCommunityCommand[] = [];
  let join: () => Promise<CafeCommunityCallJoin> = async () => joinResult;
  let command: (value: CafeCommunityCommand) => Promise<CafeCommunityCommandResult> = async () => ({ ok: true });
  const joined: unknown[] = [];
  let frames = 0; let destroyed = 0;
  const handle: CafeDailyCallHandle = { async destroy() { destroyed += 1; }, async join(input) { joined.push(input); } };
  let create: () => Promise<CafeDailyCallHandle> = async () => handle;
  const transport: CafeCommunityCallTransport = {
    async status() { return { ok: true, callId, roomId, endsAt: future }; },
    async snapshot() { return { ok: true, me, people: [], rooms: [], room: null, blockedMembers: [], serverTime: new Date().toISOString(),
      calls: [{ id: callId, roomId, from: me, to: other, status: "accepted", createdAt: new Date().toISOString(), expiresAt: future, endsAt: future }] }; },
    join: () => join(), command: (_token, value) => { commands.push(value); return command(value); },
  };
  const createFrame = async () => { frames += 1; return create(); };
  const props = { callId, courseReturnHref: "/yopratiqo/learn/japanese?lesson=3", identity, locale: "en" as const, transport, createFrame };
  return { props, commands, joined, handle, frames: () => frames, destroyed: () => destroyed,
    setJoin: (value: typeof join) => { join = value; }, setCommand: (value: typeof command) => { command = value; }, setCreate: (value: typeof create) => { create = value; } };
}

async function main() {
  let h = harness(); let view = render(<CafeCommunityCall {...h.props} />); await flush();
  assert.equal(h.frames(), 0, "accepted invitation does not request media or create a frame");
  assert.equal((view.getByLabelText("Turn on my camera") as HTMLInputElement).checked, false);
  assert.equal((view.getByLabelText("Turn on my microphone") as HTMLInputElement).checked, false);
  assert.ok(h.commands.some((c) => c.action === "presence.heartbeat" && c.roomId === roomId));
  fireEvent.click(view.getByRole("button", { name: "Join the call" })); await flush();
  assert.equal(h.frames(), 1); assert.equal(h.joined.length, 1);
  assert.equal((h.joined[0] as { startVideoOff: boolean }).startVideoOff, true);
  assert.equal((h.joined[0] as { startAudioOff: boolean }).startAudioOff, true);
  assert.match(view.getByRole("link", { name: "Back to text chat" }).getAttribute("href")!, /salon=30000000/);
  assert.equal(view.getByRole("link", { name: "Back to my course" }).getAttribute("href"), "/yopratiqo/learn/japanese?lesson=3");
  fireEvent.click(view.getByRole("button", { name: "End the call" })); await flush();
  assert.equal(h.destroyed(), 1); assert.ok(h.commands.some((c) => c.action === "call.end")); cleanup(); await flush();

  h = harness(); const token = deferred<CafeCommunityCallJoin>(); h.setJoin(() => token.promise);
  view = render(<CafeCommunityCall {...h.props} />); await flush();
  fireEvent.click(view.getByRole("button", { name: "Join the call" })); await flush();
  fireEvent.click(view.getByRole("button", { name: "End the call" })); token.resolve(joinResult); await flush();
  assert.equal(h.frames(), 0, "late provider token cannot revive a left call"); cleanup(); await flush();

  h = harness(); const frame = deferred<CafeDailyCallHandle>(); h.setCreate(() => frame.promise);
  view = render(<CafeCommunityCall {...h.props} />); await flush();
  fireEvent.click(view.getByRole("button", { name: "Join the call" })); await flush();
  fireEvent.click(view.getByRole("button", { name: "End the call" })); frame.resolve(h.handle); await flush();
  assert.equal(h.destroyed(), 1, "frame resolving after leave is destroyed"); assert.equal(h.joined.length, 0); cleanup(); await flush();

  h = harness(); view = render(<CafeCommunityCall {...h.props} />); await flush();
  fireEvent.click(view.getByRole("button", { name: "Join the call" })); await flush();
  view.rerender(<CafeCommunityCall {...h.props} identity={null} />); await flush();
  assert.equal(h.destroyed(), 1, "signout stops media"); assert.ok(view.getByRole("link", { name: "Sign in" })); cleanup(); await flush();

  h = harness(); view = render(<CafeCommunityCall {...h.props} />); await flush();
  fireEvent.click(view.getByRole("button", { name: "Join the call" })); await flush();
  await act(async () => { window.dispatchEvent(new dom.window.Event("offline")); }); await flush();
  assert.equal(h.destroyed(), 1, "lost connectivity stops media"); assert.ok(view.getByRole("alert")); cleanup(); await flush();

  h = harness(); h.setCommand(async (value) => value.action === "member.block" ? { ok: false, code: "unavailable" } : { ok: true });
  view = render(<CafeCommunityCall {...h.props} />); await flush();
  fireEvent.click(view.getByRole("button", { name: "Join the call" })); await flush();
  fireEvent.click(view.getByRole("button", { name: "Block this person" })); await flush();
  assert.equal(h.destroyed(), 1); assert.match(view.getByRole("alert").textContent!, /block was not saved/);
  fireEvent.click(view.getByRole("button", { name: "Report" })); await flush();
  fireEvent.click(view.getByRole("button", { name: "Send report" })); await flush();
  assert.ok(h.commands.some((c) => c.action === "report.submit" && c.callId === callId && c.targetId === other.id && c.messageIds.length === 0));
  assert.ok(view.getByText("Your report was received.")); cleanup(); await flush();

  h = harness(); const submitted = deferred<CafeCommunityCommandResult>();
  h.setCommand(async (value) => value.action === "report.submit" ? submitted.promise : { ok: true });
  view = render(<CafeCommunityCall {...h.props} />); await flush();
  fireEvent.click(view.getByRole("button", { name: "Join the call" })); await flush();
  fireEvent.click(view.getByRole("button", { name: "Report" })); await flush();
  fireEvent.click(view.getByRole("button", { name: "Send report" })); await flush();
  assert.equal((view.getByRole("button", { name: "Block this person" }) as HTMLButtonElement).disabled, false);
  fireEvent.click(view.getByRole("button", { name: "Block this person" })); await flush();
  assert.equal(h.destroyed(), 1, "a pending report must never prevent immediate blocking");
  assert.ok(view.getByText("This person is blocked. The call has ended."));
  submitted.resolve({ ok: true }); await flush();
  assert.equal((view.getByRole("button", { name: "Block this person" }) as HTMLButtonElement).disabled, true);
  cleanup(); await flush();

  h = harness(); view = render(<CafeCommunityCall {...h.props} />); await flush();
  fireEvent.click(view.getByLabelText("Turn on my camera")); fireEvent.click(view.getByLabelText("Turn on my microphone"));
  view.rerender(<CafeCommunityCall {...h.props} identity={null} />); await flush();
  view.rerender(<CafeCommunityCall {...h.props} />); await flush();
  assert.equal((view.getByLabelText("Turn on my camera") as HTMLInputElement).checked, false);
  assert.equal((view.getByLabelText("Turn on my microphone") as HTMLInputElement).checked, false);
  cleanup(); await flush();
  dom.window.close();
  console.log("community video UI: explicit consent, stale work, signout, connectivity, block failure and reporting passed");
}
main().catch((error) => { cleanup(); dom.window.close(); console.error(error); process.exitCode = 1; });
