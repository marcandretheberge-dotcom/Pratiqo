import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://cafe.example.test/cafe", pretendToBeVisual: true });
for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
require.extensions[".css"] = module => { module.exports = {}; };
const { CafeCommunityApp } = require("@/components/cafe/community/CafeCommunityApp") as typeof import("@/components/cafe/community/CafeCommunityApp");
const { createPeopleDemoTransport } = require("@/components/cafe/community/CafePeopleDemo") as typeof import("@/components/cafe/community/CafePeopleDemo");
const { render, fireEvent, act, cleanup, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const identity = { userId: "00000000-0000-4000-8000-000000000001", accessToken: "local-fixture" };
async function flush() { await act(async () => { await new Promise(resolve => setImmediate(resolve)); }); }

async function main() {
  const demo = createPeopleDemoTransport();
  const view = render(<CafeCommunityApp identity={identity} locale="en" transport={demo.transport} peopleEnabled videoEnabled={false} />);
  await flush();
  assert.ok(view.getByRole("heading", { name: "Language partners" }));
  assert.ok(view.getByText("Bonjour Alex ! Je pratique le français. On fait connaissance ?"), "the introduction is visible before accepting");
  assert.equal(within(view.getByLabelText("Language", { exact: true })).getAllByRole("option").length, 7, "only represented languages plus the all-languages option are shown");
  assert.equal(view.queryByRole("button", { name: /^Enter$/ }), null, "returning members skip repeated onboarding");
  fireEvent.change(view.getByLabelText("Language", { exact: true }), { target: { value: "ja" } });
  assert.equal(view.getAllByRole("article").length, 2);
  fireEvent.click(view.getByLabelText("Online now"));
  assert.equal(view.getAllByRole("article").length, 1, "offline people are never shown as online");
  fireEvent.click(view.getByLabelText("Online now"));
  const riku = view.getAllByRole("article").find(item => item.textContent?.includes("Riku"))!;
  fireEvent.click(within(riku).getByRole("button", { name: "Say hello" }));
  fireEvent.change(within(riku).getByLabelText("A note to say hello"), { target: { value: "Hello Riku, can we practise Japanese?" } });
  demo.failNext();
  fireEvent.click(within(riku).getByRole("button", { name: "Send request" })); await flush();
  assert.equal((within(riku).getByLabelText("A note to say hello") as HTMLTextAreaElement).value, "Hello Riku, can we practise Japanese?", "failed saves retain the introduction");
  fireEvent.click(view.getByRole("button", { name: "Refresh" })); await flush();
  fireEvent.click(within(riku).getByRole("button", { name: "Send request" })); await flush();
  assert.ok(within(riku).getByText("Request sent"));
  assert.equal(within(riku).queryByRole("button", { name: /^Message$/ }), null, "unaccepted invitations cannot open private messaging");
  fireEvent.click(view.getByRole("button", { name: /Messages/ })); await flush();
  fireEvent.click(view.getByRole("button", { name: /^Accept$/ })); await flush();
  fireEvent.click(view.getByRole("button", { name: /^Message$/ })); await flush();
  assert.ok(view.getByText("Private conversation"));
  assert.equal(view.queryByRole("button", { name: "Close the room" }), null);
  assert.equal(view.queryByRole("button", { name: "Invite to a call" }), null);
  fireEvent.change(view.getByLabelText("Your message"), { target: { value: "Bonjour Maya !" } });
  fireEvent.click(view.getByRole("button", { name: /^Send$/ })); await flush();
  assert.equal(within(view.getByRole("log")).getAllByText("Bonjour Maya !").length, 1);
  fireEvent.click(view.getByRole("button", { name: "Back to messages" })); await flush();
  fireEvent.click(view.getByRole("button", { name: /^Message$/ })); await flush();
  assert.ok(within(view.getByRole("log")).getByText("Bonjour Maya !"), "reopening resumes the conversation");
  fireEvent.click(view.getByRole("button", { name: "Back to messages" })); await flush();
  fireEvent.click(view.getByRole("button", { name: /^Rooms$/ })); await flush();
  assert.ok(view.getByRole("button", { name: "Join the chat" }), "public rooms still work");
  fireEvent.click(view.getByRole("button", { name: "Join the chat" })); await flush();
  assert.ok(view.getByRole("button", { name: "Leave the room" }));
  fireEvent.click(view.getByRole("button", { name: "Leave the room" })); await flush();
  fireEvent.click(view.getByRole("button", { name: /My profile/ })); await flush();
  assert.ok(view.getByLabelText("Café photo"));
  fireEvent.click(view.getByRole("button", { name: /^Edit$/ })); await flush();
  assert.equal((view.getByRole("checkbox", { name: /Remain visible/ }) as HTMLInputElement).checked, false);
  console.log("PASS people-first UI: language/presence filters, request/retry, recipient acceptance, private messages, reopen, existing rooms, opt-in and photo control");
}
main().finally(() => { cleanup(); dom.window.close(); }).catch(error => { console.error(error); process.exitCode = 1; });
