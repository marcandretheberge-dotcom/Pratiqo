/** Rendered regressions for the movable, local Japanese lesson companion. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";

import { JapaneseYoppoCoach, type JapaneseYoppoCoachProps } from "@/components/yo/japanese/JapaneseYoppoCoach";
import type { JapaneseLocalized } from "@/lib/yo/japaneseCourseTypes";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo/langues/japonais", pretendToBeVisual: true });
class TestPointerEvent extends dom.window.MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.isPrimary = init.isPrimary ?? true;
  }
}
Object.defineProperty(dom.window, "PointerEvent", { configurable: true, value: TestPointerEvent });
const bindings = {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
  PointerEvent: TestPointerEvent, IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, within } = require("@testing-library/react") as typeof import("@testing-library/react");

const preferencesKey = "yopratiqo:japanese:yoppo-preferences:v1";
const localized = (fr: string, en: string, es: string): JapaneseLocalized => ({ fr, en, es });
const props: JapaneseYoppoCoachProps = {
  locale: "fr", contextId: "greetings:question-1",
  message: localized("Présente-toi à ton partenaire.", "Introduce yourself to your partner.", "Preséntate a tu compañero."),
  hint: localized("Repère la formule de présentation.", "Look for the introduction phrase.", "Busca la frase de presentación."),
  explanation: localized("Cette formule sert à une première rencontre.", "This phrase is used for a first meeting.", "Esta frase se usa al conocerse."),
  example: { ja: "はじめまして。", kana: "はじめまして。", romaji: "Hajimemashite.", meaning: localized("Enchanté.", "Nice to meet you.", "Mucho gusto.") },
};
const labels: Record<YoLocale, { open: string; title: string; hint: string; explain: string; example: string; close: string }> = {
  fr: { open: "Ouvrir l’aide de Yoppo", title: "Un coup de main ?", hint: "Un indice", explain: "Explique-moi", example: "Un exemple", close: "Réduire l’aide de Yoppo" },
  en: { open: "Open Yoppo’s help", title: "Need a hand?", hint: "A hint", explain: "Explain it", example: "An example", close: "Minimize Yoppo’s help" },
  es: { open: "Abrir la ayuda de Yoppo", title: "¿Necesitas una mano?", hint: "Una pista", explain: "Explícamelo", example: "Un ejemplo", close: "Minimizar la ayuda de Yoppo" },
};
const node = (overrides: Partial<JapaneseYoppoCoachProps> = {}) => React.createElement(JapaneseYoppoCoach, { ...props, ...overrides });
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
function viewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}
function point(view: ReturnType<typeof render>) {
  const avatar = view.getByTestId("japanese-yoppo-position");
  return { x: Number.parseFloat(avatar.style.left), y: Number.parseFloat(avatar.style.top) };
}

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: help opens only on request and support notifies the lesson before disclosure`, () => {
    const actions: string[] = [];
    const view: ReturnType<typeof render> = render(node({ locale, onAction: (action) => {
      if (action === "hint") assert.equal(view.queryByText(props.hint[locale]), null);
      if (action === "explain") assert.equal(view.queryByText(props.explanation[locale]), null);
      if (action === "example") assert.equal(view.queryByText(props.example!.ja), null);
      actions.push(action);
    } }));
    assert.equal(view.queryByRole("region"), null);
    assert.equal(view.queryByText(props.hint[locale]), null);
    const avatar = view.getByRole("button", { name: labels[locale].open });
    assert.equal(avatar.getAttribute("aria-expanded"), "false");
    fireEvent.click(avatar);
    const panel = view.getByRole("region", { name: labels[locale].title });
    assert.equal(document.activeElement, within(panel).getByRole("heading", { name: labels[locale].title }));
    assert.ok(within(panel).getByText(props.message[locale]));
    fireEvent.click(within(panel).getByRole("button", { name: labels[locale].hint }));
    assert.ok(within(panel).getByText(props.hint[locale]));
    fireEvent.click(within(panel).getByRole("button", { name: labels[locale].explain }));
    assert.ok(within(panel).getByText(props.explanation[locale]));
    fireEvent.click(within(panel).getByRole("button", { name: labels[locale].example }));
    assert.equal(within(panel).getByText(props.example!.ja).getAttribute("lang"), "ja");
    assert.ok(within(panel).getByText(props.example!.meaning[locale]));
    assert.deepEqual(actions, ["hint", "explain", "example"]);
    assert.equal(panel.getAttribute("aria-modal"), null);
    assert.equal(document.querySelector("[inert]"), null);
    fireEvent.click(within(panel).getByRole("button", { name: labels[locale].close }));
    assert.equal(view.queryByRole("region"), null);
    assert.equal(document.activeElement, view.getByRole("button", { name: labels[locale].open }));
  });
}

test("context changes clear revealed help and never automatically open a closed panel", () => {
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.hint }));
  const next = { contextId: "station:question-2", message: localized("Trouve le quai.", "Find the platform.", "Busca el andén.") };
  view.rerender(node(next));
  assert.ok(view.getByText(next.message.fr));
  assert.equal(view.queryByText(props.hint.fr), null);
  view.rerender(node());
  assert.ok(view.getByText(props.message.fr));
  assert.equal(view.queryByText(props.hint.fr), null);
  fireEvent.keyDown(view.getByRole("region"), { key: "Escape" });
  view.rerender(node(next));
  assert.equal(view.queryByRole("region"), null);
});

test("new evaluated feedback replaces a stale hint even within the same activity", () => {
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.hint }));
  const feedback = localized("Oui, cette formule convient ici.", "Yes, this phrase fits here.", "Sí, esta frase encaja aquí.");
  view.rerender(node({ message: feedback, visualState: "celebrating" }));
  assert.ok(view.getByText(feedback.fr));
  assert.equal(view.queryByText(props.hint.fr), null);
});

test("retry and review are real conditional actions, without inert placeholder buttons", () => {
  const actions: string[] = [];
  const view = render(node({ example: undefined, hint: localized("", "", ""), explanation: localized("", "", ""), canRetry: true, reviewCount: 2 }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  assert.equal(view.queryByRole("button", { name: "Réessayer" }), null);
  assert.equal(view.queryByRole("button", { name: "Réviser (2)" }), null);
  assert.equal(view.queryByRole("button", { name: labels.fr.hint }), null);
  assert.equal(view.queryByRole("button", { name: labels.fr.example }), null);
  view.rerender(node({ canRetry: true, reviewCount: 2, onAction: (action) => actions.push(action) }));
  fireEvent.click(view.getByRole("button", { name: "Réessayer" }));
  fireEvent.click(view.getByRole("button", { name: "Réviser (2)" }));
  assert.deepEqual(actions, ["retry", "review"]);
});

test("keyboard movement works on both axes, remembers the position, and Home resets it", () => {
  const view = render(node());
  const start = point(view);
  const avatar = view.getByRole("button", { name: labels.fr.open });
  fireEvent.keyDown(avatar, { key: "ArrowLeft" });
  fireEvent.keyDown(avatar, { key: "ArrowUp", shiftKey: true });
  const moved = point(view);
  assert.ok(moved.x < start.x);
  assert.ok(moved.y < start.y);
  assert.equal(view.queryByRole("region"), null);
  const remembered = JSON.parse(window.localStorage.getItem(preferencesKey)!);
  assert.deepEqual(Object.keys(remembered).sort(), ["hidden", "version", "x", "y"]);
  assert.equal(remembered.x, moved.x);
  assert.equal(remembered.y, moved.y);
  view.unmount();
  const fresh = render(node());
  assert.deepEqual(point(fresh), moved);
  assert.equal(fresh.queryByRole("region"), null);
  fireEvent.keyDown(fresh.getByRole("button", { name: labels.fr.open }), { key: "Home" });
  assert.deepEqual(point(fresh), start);
});

test("pointer dragging moves in two directions without also opening help", () => {
  const view = render(node());
  const start = point(view);
  const avatar = view.getByRole("button", { name: labels.fr.open });
  fireEvent.pointerDown(avatar, { pointerId: 7, button: 0, clientX: 950, clientY: 580 });
  fireEvent.pointerMove(avatar, { pointerId: 7, clientX: 550, clientY: 350 });
  fireEvent.pointerUp(avatar, { pointerId: 7, button: 0, clientX: 550, clientY: 350 });
  assert.ok(point(view).x < start.x);
  assert.ok(point(view).y < start.y);
  fireEvent.click(avatar);
  assert.equal(view.queryByRole("region"), null);
  fireEvent.click(avatar);
  assert.ok(view.getByRole("region"));
});

test("saved out-of-bounds positions and a smaller viewport stay reachable above the mobile navigation", () => {
  window.localStorage.setItem(preferencesKey, JSON.stringify({ version: 1, x: 99999, y: 99999, hidden: false }));
  const view = render(node());
  viewport(320, 568);
  fireEvent.resize(window);
  const moved = point(view);
  assert.ok(moved.x >= 0 && moved.x + 88 <= 320);
  assert.ok(moved.y >= 0 && moved.y + 88 <= 568 - 100);
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  const panel = view.getByRole("region");
  assert.ok(Number.parseFloat(panel.style.left) >= 0);
  assert.ok(Number.parseFloat(panel.style.left) + Number.parseFloat(panel.style.width) <= 320);
  assert.ok(Number.parseFloat(panel.style.maxHeight) <= 568 - 100);
});

test("hiding is remembered but a focused restore control always brings the companion back", () => {
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: "Masquer Yoppo" }));
  assert.equal(view.queryByTestId("japanese-yoppo-position"), null);
  assert.equal(view.queryByRole("region"), null);
  assert.equal(document.activeElement, view.getByRole("button", { name: "Afficher Yoppo" }));
  view.unmount();
  const fresh = render(node());
  assert.equal(fresh.queryByTestId("japanese-yoppo-position"), null);
  fireEvent.click(fresh.getByRole("button", { name: "Afficher Yoppo" }));
  assert.ok(fresh.getByTestId("japanese-yoppo-position"));
  assert.ok(fresh.getByRole("region"));
  assert.equal(JSON.parse(window.localStorage.getItem(preferencesKey)!).hidden, false);
});

test("malformed preferences and blocked storage do not disable the companion", () => {
  window.localStorage.setItem(preferencesKey, "{broken json");
  let view = render(node());
  assert.ok(Number.isFinite(point(view).x));
  view.unmount();
  const prototype = dom.window.Storage.prototype;
  const getItem = prototype.getItem;
  const setItem = prototype.setItem;
  prototype.getItem = () => { throw new Error("Storage disabled"); };
  prototype.setItem = () => { throw new Error("Storage full"); };
  try {
    view = render(node());
    const avatar = view.getByRole("button", { name: labels.fr.open });
    fireEvent.keyDown(avatar, { key: "ArrowLeft" });
    fireEvent.click(avatar);
    assert.ok(view.getByRole("region"));
    fireEvent.click(view.getByRole("button", { name: "Masquer Yoppo" }));
    fireEvent.click(view.getByRole("button", { name: "Afficher Yoppo" }));
    assert.ok(view.getByRole("region"));
  } finally { prototype.getItem = getItem; prototype.setItem = setItem; }
});

test("opening help leaves the lesson interactive and explicit position controls work", () => {
  let pageClicks = 0;
  const view = render(React.createElement(React.Fragment, null,
    React.createElement("button", { type: "button", onClick: () => { pageClicks += 1; } }, "Lesson action"), node()));
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: "Lesson action" }));
  assert.equal(pageClicks, 1);
  fireEvent.click(view.getByText("Déplacer Yoppo", { selector: "summary" }));
  const before = point(view);
  fireEvent.click(view.getByRole("button", { name: "Déplacer à gauche" }));
  fireEvent.click(view.getByRole("button", { name: "Déplacer vers le haut" }));
  assert.ok(point(view).x < before.x && point(view).y < before.y);
  fireEvent.click(view.getByRole("button", { name: "Replacer Yoppo" }));
  assert.deepEqual(point(view), before);
});

let failed = 0;
try {
  for (const [name, run] of cases) {
    viewport(1024, 768);
    window.localStorage.clear();
    try { run(); console.log(`ok - ${name}`); }
    catch (error) { failed += 1; console.error(`not ok - ${name}`, error); }
    finally { cleanup(); }
  }
} finally {
  dom.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
}
console.log(`\nJapanese Yoppo coach: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
