import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key, value] of Object.entries({
  React, window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter,
  DocumentFragment: dom.window.DocumentFragment, HTMLInputElement: dom.window.HTMLInputElement, CustomEvent: dom.window.CustomEvent,
  Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++frameId, fn); return frameId; },
  cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
Object.defineProperty(window, "matchMedia", { value: (media: string) => ({ media, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};
let plays = 0;
dom.window.HTMLMediaElement.prototype.play = () => { plays++; return Promise.resolve(); };
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const { InterestPracticeCard } = require("@/components/yo/interests/InterestPracticeCard") as typeof import("../../components/yo/interests/InterestPracticeCard");
const { interestProgressKey } = require("@/lib/yo/interests/session") as typeof import("../../lib/yo/interests/session");

async function settle() {
  await act(async () => {
    for (let i = 0; i < 12 && frames.size; i++) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(0)); }
    // Radix restores focus after the unmounted scope has left its stack.
    await new Promise(resolve => setTimeout(resolve, 10));
  });
}
async function click(button: HTMLElement) { button.focus(); fireEvent.click(button); await settle(); }
async function escape() { fireEvent.keyDown(document.activeElement ?? document, { key: "Escape", code: "Escape" }); await settle(); }

async function main() {
  const key = interestProgressKey("en");
  const unrelated = JSON.stringify({ results: ["real-result"], credits: 0 });
  localStorage.setItem("yo.test.unrelated-course", unrelated);
  const view = render(<InterestPracticeCard language="en" locale="en" interests={["art"]}/>);
  await settle();
  const trigger = view.getByRole("button", { name: "Explore · Art" });
  await click(trigger);
  const film = document.querySelector('[data-mission-film="mission-start"]');
  assert.ok(film, "a new stop presents its optional introduction film");
  assert.equal(view.getAllByRole("dialog").length, 1, "only the top dialog is exposed to assistive technology");
  assert.ok(film.contains(document.activeElement), `the film owns focus while it covers the practice; active=${document.activeElement?.outerHTML.slice(0, 180)}`);
  const beforeSkip = localStorage.getItem(key);
  await escape();
  assert.equal(document.querySelector("[data-mission-film]"), null);
  assert.equal(localStorage.getItem(key), beforeSkip, "dismissing a film never advances or answers the practice");
  assert.equal(document.querySelector("[data-interest-step]")?.getAttribute("data-interest-step"), "0");
  assert.ok(view.getByRole("dialog").contains(document.activeElement), "focus returns to the still-open practice");

  await click(view.getByRole("button", { name: "Continue" }));
  await click(view.getByRole("button", { name: "Continue" }));
  assert.equal(document.querySelector("[data-interest-step]")?.getAttribute("data-interest-step"), "2");
  const beforeClose = localStorage.getItem(key);
  await escape();
  assert.equal(view.queryByRole("dialog"), null, "Escape closes only the remaining practice dialog");
  assert.equal(localStorage.getItem(key), beforeClose, "closing keeps the exact unanswered step");
  assert.equal(document.activeElement, trigger, "closing the practice returns keyboard focus to its original trigger");
  await click(view.getByRole("button", { name: "Resume my stop" }));
  assert.equal(document.querySelector("[data-mission-film]"), null, "the dismissed start film does not replay on resume");
  assert.equal(document.querySelector("[data-interest-step]")?.getAttribute("data-interest-step"), "2");
  await click(view.getByRole("button", { name: "Close and save my place" }));
  assert.equal(document.activeElement, trigger, "the close button also restores keyboard focus");
  assert.equal(localStorage.getItem("yo.test.unrelated-course"), unrelated);
  assert.equal(plays, 0, "no media or device voice starts automatically under reduced motion");
  console.log("PASS: interest cinema top-layer Escape, focus restoration, exact resume and untouched course outcomes");
}
void main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { cleanup(); dom.window.close(); });
