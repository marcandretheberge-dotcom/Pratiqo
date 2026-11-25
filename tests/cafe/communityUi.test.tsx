/** Exercise the real React community view and lifecycle. Fixtures never call a provider. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import type { CafeCommunityCommand, CafeCommunitySnapshot, CafeCallInvitation } from "@/lib/cafe/communityTypes";
import type { CafeCommunityTransport, CafeIdentity, CafeSnapshotResult } from "@/lib/cafe/communityClient";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://cafe.example.test/cafe", pretendToBeVisual: true });
for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
let mediaRequests = 0;
Object.defineProperty(dom.window.navigator, "mediaDevices", { value: { getUserMedia: () => { mediaRequests++; return Promise.reject(new Error("Text UI must not request media")); } } });
const previousCss = require.extensions[".css"];
require.extensions[".css"] = (module) => { module.exports = {}; };
const { CafeCommunityApp } = require("@/components/cafe/community/CafeCommunityApp") as typeof import("@/components/cafe/community/CafeCommunityApp");
const { createCommunityDemoTransport } = require("@/components/cafe/community/CafeCommunityDemo") as typeof import("@/components/cafe/community/CafeCommunityDemo");
const { useCafeCommunity } = require("@/components/cafe/community/useCafeCommunity") as typeof import("@/components/cafe/community/useCafeCommunity");
if (previousCss) require.extensions[".css"] = previousCss; else delete require.extensions[".css"];
const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");

const identity: CafeIdentity = { userId: "00000000-0000-4000-8000-000000000001", accessToken: "fixture-token" };
const roomId = "10000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
function deferred<T>() { let resolve!: (value:T)=>void; const promise = new Promise<T>((done) => { resolve = done; }); return { resolve, promise }; }
async function flush() { await act(async () => { await new Promise<void>((resolve) => setImmediate(resolve)); }); }
function mount(transport: CafeCommunityTransport, videoEnabled = false, languageHint?: string) {
  return render(<CafeCommunityApp identity={identity} transport={transport} locale="en" videoEnabled={videoEnabled} languageHint={languageHint} courseReturnHref="/yo/langues/japonais?unit=2" />);
}
async function enter(view: ReturnType<typeof mount>) {
  await flush();
  fireEvent.click(view.getByRole("button", { name: "Enter" }));
  await flush();
  const cancel = view.queryByRole("button", { name: "Cancel" });
  if (cancel) { fireEvent.click(cancel); await flush(); }
}
async function join(view: ReturnType<typeof mount>) {
  await enter(view);
  fireEvent.click(view.getByRole("button", { name: "Join the chat" }));
  await flush();
}

async function profileChoosesLanguagesOutsideCourses() {
  const source = createCommunityDemoTransport(true);
  const commands: CafeCommunityCommand[] = [];
  const transport: CafeCommunityTransport = { ...source, command: async (...args) => { commands.push(args[1]); return source.command(...args); } };
  const view = mount(transport); await enter(view);
  const submit = view.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
  assert.equal(submit.disabled, true);
  for (const [name, href] of [["Code of conduct (new tab)", "/legal/code-de-conduite"], ["Privacy (new tab)", "/legal/confidentialite"]]) {
    const link = view.getByRole("link", { name });
    assert.equal(link.getAttribute("href"), href);
    assert.equal(link.getAttribute("target"), "_blank", "Reading the rules must preserve the unfinished form");
    assert.equal(link.getAttribute("rel"), "noopener noreferrer");
  }
  assert.equal((view.getByRole("checkbox", { name: "I agree to the Café rules." }) as HTMLInputElement).checked, false);
  fireEvent.change(view.getByLabelText("Your Café name"), { target: { value: "Asha" } });
  fireEvent.click(within(view.getByRole("group", { name: "Native language(s)" })).getByRole("checkbox", { name: "Hindi" }));
  fireEvent.click(within(view.getByRole("group", { name: "Language(s) to practise" })).getByRole("checkbox", { name: "Swahili" }));
  fireEvent.click(view.getByRole("checkbox", { name: "I confirm I am 18 or older." }));
  fireEvent.click(view.getByRole("checkbox", { name: "I agree to the Café rules." }));
  fireEvent.click(submit); await flush();
  const profile = commands.find((command) => command.action === "profile.save");
  assert.equal(profile?.action, "profile.save");
  if (profile?.action !== "profile.save") throw new Error("missing save");
  assert.deepEqual(profile.nativeLanguages, ["hi"]); assert.deepEqual(profile.learningLanguages, ["sw"]);
  assert.equal(profile.adultAgreement, true); assert.equal(profile.rulesAgreement, true);
  assert.ok(view.getByRole("button", { name: "My profile · Asha" }));
  assert.equal(view.container.querySelector("iframe"), null); assert.equal(mediaRequests, 0);
}

async function joinAndIdempotentPlainTextRetry() {
  const source = createCommunityDemoTransport();
  let failures = 1;
  const requests: string[] = [];
  const transport: CafeCommunityTransport = { ...source, command: async (...args) => {
    const command = args[1];
    const result = await source.command(...args);
    if (command.action === "message.send") { requests.push(command.requestId); if (failures--) throw new Error("Response lost after server committed"); }
    return result;
  } };
  const view = mount(transport); await join(view);
  assert.ok(view.getByRole("heading", { name: "Your Café conversation" }));
  assert.equal(view.queryByRole("heading", { name: "Café des langues" }), null);
  const text = "<script>alert('escaped')</script> Hello!";
  fireEvent.change(view.getByLabelText("Your message"), { target: { value: text } });
  fireEvent.click(view.getByRole("button", { name: "Send" })); await flush();
  assert.equal((view.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled, true);
  assert.equal((view.getByLabelText("Your message") as HTMLTextAreaElement).value, text);
  fireEvent.click(view.getByRole("button", { name: "Refresh" })); await flush();
  fireEvent.click(view.getByRole("button", { name: "Send" })); await flush();
  assert.equal(requests.length, 2); assert.equal(requests[0], requests[1]);
  assert.equal(within(view.getByRole("log")).getAllByText(text).length, 1);
  assert.equal(view.container.querySelector("script"), null); assert.equal(mediaRequests, 0);
}

async function incomingInviteRequiresAcceptanceAndDocumentLink() {
  const source = createCommunityDemoTransport();
  let status: CafeCallInvitation["status"] = "pending";
  const commands: CafeCommunityCommand[] = [];
  const transport: CafeCommunityTransport = {
    async snapshot(...args) {
      const data = await source.snapshot(...args); if (!data.ok || !data.room || !data.me) return data;
      return { ...data, calls: [{ id: "20000000-0000-4000-8000-000000000001", roomId, from: data.room.creator, to: data.me, status, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 120_000).toISOString(), endsAt: status === "accepted" ? new Date(Date.now() + 3_600_000).toISOString() : null }] };
    },
    async command(...args) { commands.push(args[1]); if (args[1].action === "call.respond") { status = args[1].accept ? "accepted" : "declined"; return { ok: true }; } return source.command(...args); },
  };
  const view = mount(transport, true); await join(view);
  assert.equal(view.queryByRole("link", { name: "Prepare the call" }), null);
  fireEvent.click(view.getByRole("button", { name: "Accept invitation" })); await flush();
  const link = view.getByRole("link", { name: "Prepare the call" }) as HTMLAnchorElement;
  assert.equal(link.tagName, "A");
  const url = new URL(link.href);
  assert.equal(url.pathname, "/cafe/appels/20000000-0000-4000-8000-000000000001");
  assert.equal(url.searchParams.get("yoReturn"), "/yo/langues/japonais?unit=2"); assert.equal(url.searchParams.get("salon"), roomId);
  assert.equal(commands.filter((command) => command.action === "call.respond").length, 1);
  assert.equal(view.container.querySelector("iframe"), null); assert.equal(mediaRequests, 0);
}

async function blockDoesNotDependOnSubmittingReport() {
  const source = createCommunityDemoTransport();
  const commands: CafeCommunityCommand[] = [];
  const offendingId = "30000000-0000-4000-8000-000000000001";
  const transport: CafeCommunityTransport = {
    async snapshot(...args) {
      const data = await source.snapshot(...args); if (!data.ok || !data.room) return data;
      return { ...data, room: { ...data.room, messages: [{ id: offendingId, roomId, body: "Unwanted comment fixture", sender: data.room.creator, createdAt: new Date().toISOString() }] } };
    },
    async command(...args) { commands.push(args[1]); return source.command(...args); },
  };
  const view = mount(transport); await join(view);
  fireEvent.click(view.getByRole("button", { name: "Block and report" })); await flush();
  assert.ok(view.getByRole("dialog", { name: "Report" }));
  assert.ok(view.getByText("Unwanted comment fixture"));
  assert.equal(commands.filter((command) => command.action === "member.block").length, 1);
  assert.equal(commands.filter((command) => command.action === "report.submit").length, 0);
  fireEvent.click(view.getByRole("button", { name: "Cancel report" })); await flush();
  assert.equal(view.queryByText("Unwanted comment fixture"), null);
  assert.equal(view.queryByRole("log"), null);
  fireEvent.click(view.getByRole("button", { name: "My profile · Alex · démo" }));
  const modal = within(view.getByRole("dialog", { name: "My profile" }));
  assert.ok(modal.getByText("Maya · démo")); assert.ok(modal.getByRole("button", { name: "Unblock" }));
  assert.equal(commands.filter((command) => command.action === "member.unblock").length, 0);
}

async function reportIncludesOnlySelectedMessages() {
  const source = createCommunityDemoTransport(); let report: CafeCommunityCommand | null = null;
  const transport: CafeCommunityTransport = {
    async snapshot(...args) {
      const data = await source.snapshot(...args); if (!data.ok || !data.room) return data;
      return { ...data, room: { ...data.room, messages: [1,2].map((number) => ({ id: `30000000-0000-4000-8000-00000000000${number}`, roomId, body: `Evidence ${number}`, sender: data.room!.creator, createdAt: new Date().toISOString() })) } };
    },
    async command(...args) { if (args[1].action === "report.submit") report = args[1]; return source.command(...args); },
  };
  const view = mount(transport); await join(view);
  fireEvent.click(view.getAllByRole("button", { name: "Report message from Maya · démo" })[0]);
  fireEvent.click(view.getByRole("button", { name: "Submit report" })); await flush();
  const sent = report as CafeCommunityCommand | null;
  assert.equal(sent?.action, "report.submit");
  if (sent?.action !== "report.submit") throw new Error("missing report");
  assert.deepEqual(sent.messageIds, ["30000000-0000-4000-8000-000000000001"]); assert.equal(sent.targetId, targetId); assert.equal(sent.roomId, roomId);
  assert.ok(view.getByText("Your report was saved for the moderation team."));
}

async function failedBlockNeverClaimsPersistence() {
  const source = createCommunityDemoTransport();
  const transport: CafeCommunityTransport = { ...source, command: async (...args) => args[1].action === "member.block" ? { ok: false, code: "unavailable" } : source.command(...args) };
  const view = mount(transport); await join(view);
  fireEvent.click(view.getByRole("button", { name: "Block" })); await flush();
  assert.ok(view.getByRole("button", { name: "Retry" }));
  assert.equal(view.queryByText("Person blocked."), null);
  assert.equal(view.queryByRole("log"), null);
}

async function reportingWhileBlockPendingDoesNotCancelBlock() {
  const source = createCommunityDemoTransport();
  const pending = deferred<void>();
  const transport: CafeCommunityTransport = {
    async snapshot(...args) {
      const data = await source.snapshot(...args); if (!data.ok || !data.room) return data;
      return { ...data, room: { ...data.room, messages: [{ id: "30000000-0000-4000-8000-000000000001", roomId, body: "Selected evidence", sender: data.room.creator, createdAt: new Date().toISOString() }] } };
    },
    async command(...args) { if (args[1].action === "member.block") await pending.promise; return source.command(...args); },
  };
  const view = mount(transport); await join(view);
  fireEvent.click(view.getByRole("button", { name: "Block and report" })); await flush();
  fireEvent.click(view.getByRole("button", { name: "Submit report" })); await flush();
  assert.ok(view.getByText("Your report was saved for the moderation team."));
  pending.resolve(); await flush();
  assert.ok(view.getByText("Person blocked."));
  assert.equal(view.queryByText("Blocking…"), null);
  assert.equal(view.queryByRole("log"), null);
}

async function expiredMembershipReturnsToLobby() {
  const source = createCommunityDemoTransport();
  let expired = false;
  const requestedRooms: Array<string | null> = [];
  const transport: CafeCommunityTransport = { ...source, snapshot: async (...args) => {
    requestedRooms.push(args[1]);
    if (expired && args[1]) return { ok: false, code: "room_access_denied" };
    return source.snapshot(...args);
  } };
  const view = render(<HookHarness auth={identity} transport={transport} />); await flush();
  fireEvent.click(view.getByText("Join", { exact: true })); await flush();
  assert.notEqual(view.getByTestId("room").textContent, "no-room");
  expired = true;
  fireEvent.click(view.getByText("Read", { exact: true })); await flush();
  assert.equal(view.getByTestId("room").textContent, "no-room");
  assert.deepEqual(requestedRooms.slice(-2), [roomId, null]);
  assert.equal(view.getByTestId("error").textContent, "not_room_member");
}

function HookHarness({ auth, transport }: { auth: CafeIdentity; transport: CafeCommunityTransport }) {
  const state = useCafeCommunity(auth, transport);
  return <div><span data-testid="profile">{state.snapshot?.me?.displayName ?? "none"}</span><span data-testid="room">{state.snapshot?.room?.title ?? "no-room"}</span><button onClick={() => void state.execute({ action: "room.join", roomId })}>Join</button><button onClick={() => void state.execute({ action: "room.leave", roomId })}>Leave</button><button onClick={() => void state.refresh()}>Read</button><span data-testid="error">{state.error}</span></div>;
}

async function oldAuthAndRoomReadsNeverReviveState() {
  const source = createCommunityDemoTransport();
  const initial = await source.snapshot(identity.accessToken, null);
  assert.ok(initial.ok); const snapshot = initial as CafeCommunitySnapshot;
  const oldAuth = deferred<CafeSnapshotResult>();
  const transport: CafeCommunityTransport = { ...source, snapshot: async (token) => token === "old" ? oldAuth.promise : { ...snapshot, me: { ...snapshot.me!, id: "new-user", displayName: "New identity" } } };
  const view = render(<HookHarness auth={{ userId: "old-user", accessToken: "old" }} transport={transport} />);
  await flush(); view.rerender(<HookHarness auth={{ userId: "new-user", accessToken: "new" }} transport={transport} />); await flush();
  oldAuth.resolve({ ...snapshot, me: { ...snapshot.me!, displayName: "Old private identity" } }); await flush();
  assert.equal(view.getByTestId("profile").textContent, "New identity");
  cleanup();
  const slowRoom = deferred<CafeSnapshotResult>(); let delayRoom = false;
  const roomTransport: CafeCommunityTransport = { ...source, snapshot: async (...args) => args[1] && delayRoom ? slowRoom.promise : source.snapshot(...args) };
  const roomView = render(<HookHarness auth={identity} transport={roomTransport} />); await flush();
  fireEvent.click(roomView.getByText("Join", { exact: true })); await flush();
  const roomSnapshot = await source.snapshot(identity.accessToken, roomId); assert.ok(roomSnapshot.ok && roomSnapshot.room);
  delayRoom = true; fireEvent.click(roomView.getByText("Read", { exact: true })); await flush();
  fireEvent.click(roomView.getByText("Leave", { exact: true })); await flush();
  assert.equal(roomView.getByTestId("room").textContent, "no-room");
  slowRoom.resolve(roomSnapshot); await flush();
  assert.equal(roomView.getByTestId("room").textContent, "no-room");
}

async function emptyLobbyNeverFabricatesPeople() {
  const source = createCommunityDemoTransport();
  const transport: CafeCommunityTransport = { ...source, snapshot: async (...args) => { const data = await source.snapshot(...args); return data.ok ? { ...data, rooms: [], people: [] } : data; } };
  const view = mount(transport); await enter(view);
  assert.ok(view.getByText("No one has opened a room yet."));
  assert.ok(view.getByRole("button", { name: "Open a room" }));
  assert.equal(view.queryByText("Maya · démo"), null); assert.equal(view.queryByText("Riku · démo"), null);
}

async function scheduledRoomsRemainActionable(capacity: 2 | 4) {
  const source = createCommunityDemoTransport();
  const now = Date.now();
  const commands: CafeCommunityCommand[] = [];
  for (const [title, hours] of [["Future owned room", 24], ["Ready owned room", 1]] as const) {
    await source.command(identity.accessToken, { action: "room.create", requestId: crypto.randomUUID(), title, languages: ["fr"], mode: "scheduled", startsAt: new Date(now + hours * 3_600_000).toISOString(), capacity });
  }
  const transport: CafeCommunityTransport = {
    async snapshot(...args) {
      const result = await source.snapshot(...args);
      return result.ok ? { ...result, serverTime: new Date(now + 2 * 3_600_000).toISOString(), rooms: result.rooms.map((room) => room.mode === "scheduled" ? { ...room, capacity } : room) } : result;
    },
    async command(...args) { commands.push(args[1]); return source.command(...args); },
  };
  const view = mount(transport); await enter(view);
  const mode = capacity === 2 ? "One to one" : "In a group";
  fireEvent.click(view.getByRole("button", { name: mode }));
  const card = (title: string) => {
    const article = view.getByRole("heading", { name: title }).closest("article");
    assert.ok(article); return within(article);
  };
  const guestTitle = "Voyages, cuisine et mots à partager";
  assert.ok(card(guestTitle).getByRole("button", { name: "I’m interested" }));
  assert.equal((card("Future owned room").getByRole("button", { name: "Open my room" }) as HTMLButtonElement).disabled, true);
  assert.equal((card("Ready owned room").getByRole("button", { name: "Open my room" }) as HTMLButtonElement).disabled, false);
  fireEvent.click(view.getByRole("button", { name: capacity === 2 ? "In a group" : "One to one" }));
  assert.equal(view.queryByRole("heading", { name: guestTitle }), null);
  assert.equal(view.queryByRole("heading", { name: "Future owned room" }), null);
  fireEvent.click(view.getByRole("button", { name: mode }));
  fireEvent.change(view.getByRole("combobox", { name: "Practice language" }), { target: { value: "hi" } });
  assert.equal(view.queryByRole("heading", { name: guestTitle }), null);
  assert.equal(view.queryByRole("heading", { name: "Future owned room" }), null);
  fireEvent.change(view.getByRole("combobox", { name: "Practice language" }), { target: { value: "fr" } });
  fireEvent.click(card(guestTitle).getByRole("button", { name: "I’m interested" })); await flush();
  fireEvent.click(card(guestTitle).getByRole("button", { name: "Cancel my RSVP" })); await flush();
  assert.deepEqual(commands.filter((command) => command.action === "room.rsvp").map((command) => command.attending), [true, false]);
  assert.ok(card(guestTitle).getByRole("button", { name: "I’m interested" }));
  fireEvent.click(card("Future owned room").getByRole("button", { name: "Cancel this room" })); await flush();
  assert.equal(view.queryByRole("heading", { name: "Future owned room" }), null);
  fireEvent.click(card("Ready owned room").getByRole("button", { name: "Open my room" })); await flush();
  assert.ok(view.getByRole("heading", { name: "Your Café conversation" }));
  assert.ok(view.getByRole("heading", { name: "Ready owned room" }));
  fireEvent.click(view.getByRole("button", { name: "Close the room" })); await flush();

  // A successful future-room submission must remain visible and cancellable.
  fireEvent.click(view.getByRole("button", { name: "Later" }));
  const dialog = within(view.getByRole("dialog", { name: "Your room" }));
  fireEvent.change(dialog.getByLabelText("Room name", { exact: true }), { target: { value: "Created scheduled room" } });
  const date = new Date(now + 3 * 86_400_000);
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T18:30`;
  const dateInput = view.getByRole("dialog").querySelector('input[type="datetime-local"]');
  assert.ok(dateInput); fireEvent.change(dateInput, { target: { value: local } });
  fireEvent.click(dialog.getByRole("button", { name: "Schedule the room" })); await flush();
  assert.equal(view.queryByRole("dialog"), null);
  assert.ok(card("Created scheduled room").getByRole("button", { name: "Cancel this room" }));
  const created = commands.find((command) => command.action === "room.create" && command.title === "Created scheduled room");
  assert.ok(created?.action === "room.create");
  assert.equal(created.mode, "scheduled"); assert.equal(created.capacity, capacity); assert.deepEqual(created.languages, ["fr"]);
}

async function scheduledGroupRoomsRemainActionable() { await scheduledRoomsRemainActionable(4); }
async function scheduledPairRoomsRemainActionable() { await scheduledRoomsRemainActionable(2); }

async function selectedLanguageOverridesCourseHint(onboarding: boolean) {
  const source = createCommunityDemoTransport(onboarding);
  if (!onboarding) await source.command(identity.accessToken, { action: "profile.save", displayName: "Alex", nativeLanguages: ["en"], learningLanguages: ["it"], adultAgreement: true, rulesAgreement: true });
  const commands: CafeCommunityCommand[] = [];
  let failSave = !onboarding;
  const transport: CafeCommunityTransport = {
    async snapshot(...args) {
      const result = await source.snapshot(...args); if (!result.ok) return result;
      const french = { ...result.rooms.find((room) => room.id === roomId)!, title: "French conversation", languages: ["fr"] };
      return { ...result, rooms: [french, { ...french, id: "10000000-0000-4000-8000-000000000005", title: "Italian conversation", languages: ["it"] }] };
    },
    async command(...args) {
      commands.push(args[1]);
      if (args[1].action === "profile.save" && failSave) { failSave = false; return { ok: false, code: "unavailable" }; }
      return source.command(...args);
    },
  };
  const view = mount(transport, false, "it"); await enter(view);
  if (!onboarding) fireEvent.click(view.getByRole("button", { name: "Languages" }));
  else {
    fireEvent.change(view.getByLabelText("Your Café name"), { target: { value: "Asha" } });
    fireEvent.click(within(view.getByRole("group", { name: "Native language(s)" })).getByRole("checkbox", { name: "English" }));
    fireEvent.click(view.getByRole("checkbox", { name: "I confirm I am 18 or older." }));
    fireEvent.click(view.getByRole("checkbox", { name: "I agree to the Café rules." }));
  }
  const chooseFrench = () => {
    const picker = within(view.getByRole("group", { name: "Language(s) to practise" }));
    assert.equal((picker.getByRole("checkbox", { name: "Italian" }) as HTMLInputElement).checked, true);
    fireEvent.click(picker.getByRole("checkbox", { name: "Italian" }));
    fireEvent.click(picker.getByRole("checkbox", { name: "French" }));
  };
  chooseFrench();
  if (!onboarding) {
    fireEvent.click(view.getByRole("button", { name: "Save" })); await flush();
    assert.ok(view.getByRole("heading", { name: "Which language are we practising?" }));
    fireEvent.click(view.getByRole("button", { name: "Cancel" }));
    assert.equal((view.getByRole("combobox", { name: "Practice language" }) as HTMLSelectElement).value, "it");
    fireEvent.click(view.getByRole("button", { name: "Languages" })); chooseFrench();
  }
  fireEvent.click(view.getByRole("button", { name: onboarding ? "Continue" : "Save" })); await flush();
  const saved = commands.filter((command) => command.action === "profile.save").at(-1);
  assert.ok(saved); assert.deepEqual(saved.learningLanguages, ["fr"]);
  assert.equal((view.getByRole("combobox", { name: "Practice language" }) as HTMLSelectElement).value, "fr");
  assert.ok(view.getByRole("heading", { name: "French conversation" }));
  assert.equal(view.queryByRole("heading", { name: "Italian conversation" }), null);
  fireEvent.click(view.getByRole("button", { name: "Write now" }));
  const picker = within(within(view.getByRole("dialog", { name: "Your room" })).getByRole("group", { name: "Conversation languages" }));
  assert.equal((picker.getByRole("checkbox", { name: "French" }) as HTMLInputElement).checked, true);
  assert.equal((picker.getByRole("checkbox", { name: "Italian" }) as HTMLInputElement).checked, false);
}

async function firstProfileLanguageOverridesCourseHint() { await selectedLanguageOverridesCourseHint(true); }
async function changedProfileLanguageOverridesCourseHint() { await selectedLanguageOverridesCourseHint(false); }

async function returningMemberChoosesLanguagesBeforeLobby() {
  const source = createCommunityDemoTransport();
  const view = mount(source, false, "it");
  await flush();
  fireEvent.click(view.getByRole("button", { name: "Enter" }));
  await flush();
  assert.ok(view.getByRole("heading", { name: "Which language are we practising?" }));
  assert.equal(view.queryByRole("heading", { name: "Inside the Café" }), null);
  const picker = within(view.getByRole("group", { name: "Language(s) to practise" }));
  for (const checkbox of picker.getAllByRole("checkbox") as HTMLInputElement[]) {
    if (checkbox.checked) fireEvent.click(checkbox);
  }
  fireEvent.click(picker.getByRole("checkbox", { name: "French" }));
  fireEvent.click(view.getByRole("button", { name: "Save" }));
  await flush();
  assert.ok(view.getByRole("heading", { name: "Inside the Café" }));
  assert.equal((view.getByRole("combobox", { name: "Practice language" }) as HTMLSelectElement).value, "fr");
}

void (async () => {
  for (const test of [profileChoosesLanguagesOutsideCourses, joinAndIdempotentPlainTextRetry, incomingInviteRequiresAcceptanceAndDocumentLink, blockDoesNotDependOnSubmittingReport, reportIncludesOnlySelectedMessages, failedBlockNeverClaimsPersistence, reportingWhileBlockPendingDoesNotCancelBlock, expiredMembershipReturnsToLobby, oldAuthAndRoomReadsNeverReviveState, emptyLobbyNeverFabricatesPeople, scheduledGroupRoomsRemainActionable, scheduledPairRoomsRemainActionable, firstProfileLanguageOverridesCourseHint, changedProfileLanguageOverridesCourseHint, returningMemberChoosesLanguagesBeforeLobby]) {
    try { await test(); console.log(`✓ ${test.name}`); } finally { cleanup(); await flush(); }
  }
  assert.equal(mediaRequests, 0); console.log("communityUi: 15 production React/lifecycle scenarios passed; no media requests");
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
