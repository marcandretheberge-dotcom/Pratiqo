/** Rendered interaction checks for floating and reserved inline Italian help. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { ItalianYoppoCoach, type ItalianYoppoCoachProps } from "@/components/yo/italian/ItalianYoppoCoach";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo/langues/italien/module-1", pretendToBeVisual: true });
class TestPointerEvent extends dom.window.MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true; }
}
Object.defineProperty(dom.window, "PointerEvent", { configurable: true, value: TestPointerEvent });
const bindings = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, PointerEvent: TestPointerEvent, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const key = "yopratiqo:italian:yoppo-preferences:v1";
const tr = (fr: string, en: string, es: string): Record<YoLocale, string> => ({ fr, en, es });
const props: ItalianYoppoCoachProps = {
  locale: "fr", contextId: "cafe:1", message: tr("Commande au comptoir.", "Order at the counter.", "Pide en la barra."),
  hint: tr("Cherche une demande polie.", "Look for a polite request.", "Busca una petición cortés."),
  hint2: tr("Elle commence par Vorrei.", "It begins with Vorrei.", "Empieza por Vorrei."),
  explanation: tr("Vorrei permet de demander poliment.", "Vorrei is a polite way to ask.", "Vorrei sirve para pedir con cortesía."),
  example: { it: "Vorrei un caffè, per favore.", meaning: tr("Je voudrais un café, s’il vous plaît.", "I would like a coffee, please.", "Quisiera un café, por favor.") },
};
const labels = {
  fr: { open: "Ouvrir Yoppo", close: "Réduire Yoppo", title: "On joue ensemble ?", hint: "Un indice", hint2: "Un autre indice", explain: "Explique-moi", example: "Un exemple" },
  en: { open: "Open Yoppo", close: "Minimize Yoppo", title: "Shall we play?", hint: "A hint", hint2: "Another hint", explain: "Explain it", example: "An example" },
  es: { open: "Abrir a Yoppo", close: "Minimizar a Yoppo", title: "¿Jugamos juntos?", hint: "Una pista", hint2: "Otra pista", explain: "Explícamelo", example: "Un ejemplo" },
};
const node = (overrides: Partial<ItalianYoppoCoachProps> = {}) => React.createElement(ItalianYoppoCoach, { ...props, ...overrides });
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
function viewport(width: number, height: number) { Object.defineProperty(window, "innerWidth", { configurable: true, value: width }); Object.defineProperty(window, "innerHeight", { configurable: true, value: height }); }
function point(view: ReturnType<typeof render>) { const e = view.getByTestId("italian-yoppo-position"); return { x: parseFloat(e.style.left), y: parseFloat(e.style.top) }; }

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: learner opens help, unlocks two hints and an explanation, and returns to the lesson`, () => {
    const actions: string[] = [];
    const view: ReturnType<typeof render> = render(node({ locale, onAction: (action) => { if (action === "hint" && actions.length === 0) assert.equal(view.queryByText(props.hint[locale]), null); actions.push(action); } }));
    assert.equal(view.queryByRole("region"), null);
    assert.equal(view.queryByText(props.hint[locale]), null);
    fireEvent.click(view.getByRole("button", { name: labels[locale].open }));
    const panel = view.getByRole("region", { name: labels[locale].title });
    assert.equal(panel.parentElement, document.body, "the companion must float outside the lesson layout");
    assert.equal(document.activeElement, within(panel).getByRole("heading"));
    assert.equal((within(panel).getByRole("button", { name: labels[locale].explain }) as HTMLButtonElement).disabled, true);
    fireEvent.click(within(panel).getByRole("button", { name: labels[locale].hint }));
    assert.ok(within(panel).getByText(props.hint[locale]));
    assert.equal(within(panel).queryByText(props.hint2![locale]), null);
    fireEvent.click(within(panel).getByRole("button", { name: labels[locale].hint2 }));
    assert.ok(within(panel).getByText(props.hint2![locale]));
    fireEvent.click(within(panel).getByRole("button", { name: labels[locale].explain }));
    assert.ok(within(panel).getByText(props.explanation[locale]));
    fireEvent.click(within(panel).getByRole("button", { name: labels[locale].example }));
    assert.equal(within(panel).getByText(props.example!.it).getAttribute("lang"), "it");
    assert.ok(within(panel).getByText(props.example!.meaning[locale]));
    assert.deepEqual(actions, ["hint", "hint", "explain", "explain"]);
    assert.equal(panel.getAttribute("aria-modal"), null);
    assert.equal(document.querySelector("[inert]"), null);
    fireEvent.keyDown(panel, { key: "Escape" });
    assert.equal(view.queryByRole("region"), null);
    assert.equal(document.activeElement, view.getByRole("button", { name: labels[locale].open }));
  });
}

test("changing activity resets support without taking focus from the lesson or auto-opening", () => {
  const view = render(React.createElement(React.Fragment, null, React.createElement("button", null, "Lesson control"), node()));
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.hint }));
  const lesson = view.getByRole("button", { name: "Lesson control" });
  lesson.focus();
  const next = { contextId: "piazza:2", message: tr("Cherche la place.", "Find the square.", "Busca la plaza.") };
  view.rerender(React.createElement(React.Fragment, null, React.createElement("button", null, "Lesson control"), node(next)));
  assert.equal(document.activeElement, lesson);
  assert.ok(view.getByText(next.message.fr));
  assert.equal(view.queryByText(props.hint.fr), null);
  view.rerender(React.createElement(React.Fragment, null, React.createElement("button", null, "Lesson control"), node()));
  assert.equal(view.queryByText(props.hint.fr), null);
  fireEvent.keyDown(view.getByRole("region"), { key: "Escape" });
  view.rerender(node(next));
  assert.equal(view.queryByRole("region"), null);
});

test("evaluated feedback replaces help and cannot resurrect an old hint on retry", () => {
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.hint }));
  const feedback = tr("Bien joué !", "Well done!", "¡Bien hecho!");
  view.rerender(node({ message: feedback, visualState: "celebrating" }));
  assert.ok(view.getByText(feedback.fr));
  assert.equal(view.queryByText(props.hint.fr), null);
  assert.equal(view.getByTestId("companion-avatar").getAttribute("data-companion-visual-state"), "celebrating");
  view.rerender(node());
  assert.equal(view.queryByText(props.hint.fr), null);
});

test("challenge, retry and targeted review invoke lesson callbacks and do not award progress", () => {
  const actions: string[] = [];
  const view = render(node({ onAction: (action) => actions.push(action), canRetry: true, reviewCount: 3, completedCount: 2, totalCount: 16 }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  const progress = view.getByRole("progressbar", { name: "Étapes réussies" }) as HTMLProgressElement;
  assert.equal(progress.value, 2);
  fireEvent.click(view.getByRole("button", { name: "Je réessaie" }));
  assert.equal(progress.value, 2);
  fireEvent.click(view.getByRole("button", { name: "Mes révisions (3)" }));
  assert.equal(view.queryByRole("region"), null);
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: /Défie-moi/ }));
  assert.deepEqual(actions, ["retry", "review", "challenge"]);
  assert.equal(view.queryByRole("region"), null);
  const saved = JSON.parse(window.localStorage.getItem(key)!);
  assert.deepEqual(Object.keys(saved).sort(), ["hidden", "version", "x", "y"]);
});

test("no placeholder challenge or retry button appears without a handler", () => {
  const view = render(node({ onAction: undefined, canRetry: true, reviewCount: 2 }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  assert.equal(view.queryByRole("button", { name: /Défie-moi/ }), null);
  assert.equal(view.queryByRole("button", { name: "Je réessaie" }), null);
  assert.equal(view.queryByRole("button", { name: /Mes révisions/ }), null);
});

test("recorded example control is exposed only with the example and preserves its handler", () => {
  let listens = 0;
  const view = render(node({ exampleAudio: React.createElement("button", { onClick: () => listens++ }, "Listen to the example") }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  assert.equal(view.queryByRole("button", { name: "Listen to the example" }), null);
  fireEvent.click(view.getByRole("button", { name: labels.fr.hint }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.example }));
  fireEvent.click(view.getByRole("button", { name: "Listen to the example" }));
  assert.equal(listens, 1);
});

test("keyboard movement is bounded, remembered and reset with Home", () => {
  const view = render(node());
  const initial = point(view);
  const avatar = view.getByRole("button", { name: labels.fr.open });
  fireEvent.keyDown(avatar, { key: "ArrowLeft" });
  fireEvent.keyDown(avatar, { key: "ArrowUp", shiftKey: true });
  const moved = point(view);
  assert.equal(initial.x - moved.x, 12);
  assert.equal(initial.y - moved.y, 40);
  assert.equal(view.queryByRole("region"), null);
  view.unmount();
  const fresh = render(node());
  assert.deepEqual(point(fresh), moved);
  fireEvent.keyDown(fresh.getByRole("button", { name: labels.fr.open }), { key: "Home" });
  assert.deepEqual(point(fresh), initial);
});

test("pointer drag moves freely while suppressing the resulting click", () => {
  const view = render(node());
  const initial = point(view);
  const avatar = view.getByRole("button", { name: labels.fr.open });
  fireEvent.pointerDown(avatar, { pointerId: 5, button: 0, clientX: 920, clientY: 600 });
  fireEvent.pointerMove(avatar, { pointerId: 5, clientX: 620, clientY: 390 });
  fireEvent.pointerUp(avatar, { pointerId: 5, button: 0, clientX: 620, clientY: 390 });
  assert.ok(point(view).x < initial.x && point(view).y < initial.y);
  fireEvent.click(avatar);
  assert.equal(view.queryByRole("region"), null);
  fireEvent.click(avatar);
  assert.ok(view.getByRole("region"));
});

test("secondary pointers cannot move the companion", () => {
  const view = render(node());
  const initial = point(view);
  const avatar = view.getByRole("button", { name: labels.fr.open });
  fireEvent.pointerDown(avatar, { pointerId: 3, isPrimary: false, clientX: 920, clientY: 600 });
  fireEvent.pointerMove(avatar, { pointerId: 3, clientX: 620, clientY: 390 });
  assert.deepEqual(point(view), initial);
});

test("mobile resizing clamps offscreen preferences and preserves space for bottom navigation", () => {
  window.localStorage.setItem(key, JSON.stringify({ version: 1, x: 99999, y: -9999, hidden: false }));
  const view = render(node());
  viewport(320, 568);
  fireEvent.resize(window);
  const position = point(view);
  assert.ok(position.x >= 0 && position.x + 88 <= 320);
  assert.ok(position.y >= 0 && position.y + 88 <= 568 - 104);
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  const panel = view.getByRole("region");
  assert.ok(parseFloat(panel.style.left) >= 0);
  assert.ok(parseFloat(panel.style.left) + parseFloat(panel.style.width) <= 320);
  assert.ok(parseFloat(panel.style.maxHeight) <= 568 - 104);
});

test("a visual viewport change keeps the avatar above the software keyboard", () => {
  const visual = new dom.window.EventTarget();
  Object.assign(visual, { offsetLeft: 0, offsetTop: 20, width: 375, height: 360 });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: visual });
  const view = render(node());
  const position = point(view);
  assert.ok(position.y >= 20 && position.y + 88 <= 20 + 360 - 104);
  Object.assign(visual, { height: 280 });
  fireEvent(visual, new dom.window.Event("resize"));
  assert.ok(point(view).y + 88 <= 20 + 280 - 104);
});

test("hide persists and the reachable restore button restores focus to help", () => {
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: "Masquer Yoppo" }));
  assert.equal(view.queryByTestId("italian-yoppo-position"), null);
  assert.equal(document.activeElement, view.getByRole("button", { name: "Retrouver Yoppo" }));
  view.unmount();
  const fresh = render(node());
  assert.equal(fresh.queryByTestId("italian-yoppo-position"), null);
  fireEvent.click(fresh.getByRole("button", { name: "Retrouver Yoppo" }));
  assert.ok(fresh.getByTestId("italian-yoppo-position"));
  assert.equal(document.activeElement, fresh.getByRole("heading"));
  assert.equal(JSON.parse(window.localStorage.getItem(key)!).hidden, false);
});

test("malformed preferences and unavailable local storage do not disable interaction", () => {
  window.localStorage.setItem(key, "{broken json");
  const first = render(node());
  assert.ok(Number.isFinite(point(first).x));
  first.unmount();
  const prototype = dom.window.Storage.prototype;
  const getItem = prototype.getItem;
  const setItem = prototype.setItem;
  prototype.getItem = () => { throw new Error("Disabled"); };
  prototype.setItem = () => { throw new Error("Full"); };
  try {
    const view = render(node());
    fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
    fireEvent.click(view.getByRole("button", { name: "Masquer Yoppo" }));
    fireEvent.click(view.getByRole("button", { name: "Retrouver Yoppo" }));
    assert.ok(view.getByRole("region"));
  } finally { prototype.getItem = getItem; prototype.setItem = setItem; }
});

test("the lesson remains interactive and position controls do not require dragging", () => {
  let pageClicks = 0;
  const view = render(React.createElement(React.Fragment, null, React.createElement("button", { onClick: () => pageClicks++ }, "Lesson action"), node()));
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: "Lesson action" }));
  assert.equal(pageClicks, 1);
  fireEvent.click(view.getByText("Déplacer Yoppo", { selector: "summary" }));
  const before = point(view);
  fireEvent.click(view.getByRole("button", { name: "Déplacer Yoppo à gauche" }));
  fireEvent.click(view.getByRole("button", { name: "Déplacer Yoppo vers le haut" }));
  assert.ok(point(view).x < before.x && point(view).y < before.y);
  fireEvent.click(view.getByRole("button", { name: "Replacer Yoppo" }));
  assert.deepEqual(point(view), before);
});

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: inline help keeps progressive reveal, recorded audio and lesson callbacks`, () => {
    const actions: string[] = [];
    let listens = 0;
    const view = render(node({ locale, presentation: "inline", onAction: action => actions.push(action), canRetry: true, reviewCount: 3, completedCount: 2, totalCount: 16,
      exampleAudio: React.createElement("button", { onClick: () => listens++ }, "Recorded example") }));
    fireEvent.click(view.getByRole("button", { name: labels[locale].open }));
    const panel = view.getByRole("region", { name: labels[locale].title });
    assert.ok(view.container.contains(panel), "help must reserve space inside the course layout");
    assert.equal(document.activeElement, within(panel).getByRole("heading"));
    assert.equal(view.queryByText(props.hint[locale]), null);
    assert.equal((view.getByRole("button", { name: labels[locale].explain }) as HTMLButtonElement).disabled, true);
    fireEvent.click(view.getByRole("button", { name: labels[locale].hint }));
    assert.ok(view.getByText(props.hint[locale]));
    fireEvent.click(view.getByRole("button", { name: labels[locale].hint2 }));
    assert.ok(view.getByText(props.hint2![locale]));
    fireEvent.click(view.getByRole("button", { name: labels[locale].explain }));
    assert.ok(view.getByText(props.explanation[locale]));
    assert.equal(view.queryByRole("button", { name: "Recorded example" }), null);
    fireEvent.click(view.getByRole("button", { name: labels[locale].example }));
    fireEvent.click(view.getByRole("button", { name: "Recorded example" }));
    assert.equal(listens, 1);
    assert.deepEqual(actions, ["hint", "hint", "explain", "explain"]);
    const progress = view.getByRole("progressbar") as HTMLProgressElement;
    const retry = { fr: "Je réessaie", en: "Try again", es: "Lo intento de nuevo" }[locale];
    const review = { fr: "Mes révisions (3)", en: "My review (3)", es: "Mis repasos (3)" }[locale];
    fireEvent.click(view.getByRole("button", { name: retry }));
    assert.equal(progress.value, 2, "help actions must not award mastery");
    fireEvent.click(view.getByRole("button", { name: review }));
    assert.equal(view.queryByRole("region"), null);
    fireEvent.click(view.getByRole("button", { name: labels[locale].open }));
    const challenge = { fr: /Défie-moi/, en: /Challenge me/, es: /Ponme a prueba/ }[locale];
    fireEvent.click(view.getByRole("button", { name: challenge }));
    assert.deepEqual(actions.slice(-3), ["retry", "review", "challenge"]);
    assert.equal(view.queryByRole("region"), null);
  });
}

test("inline help stays in normal flow on mobile and leaves lesson controls interactive", () => {
  viewport(320, 568);
  window.localStorage.setItem(key, JSON.stringify({ version: 1, x: 900, y: 650, hidden: false }));
  let lessonClicks = 0;
  const lesson = React.createElement("button", { onClick: () => lessonClicks++ }, "Lesson action");
  const view = render(React.createElement(React.Fragment, null, node({ presentation: "inline" }), lesson));
  const opener = view.getByRole("button", { name: labels.fr.open });
  fireEvent.click(opener);
  const panel = view.getByRole("region");
  assert.ok(view.container.contains(opener) && view.container.contains(panel));
  assert.equal(view.container.querySelector(".fixed"), null, "no avatar, panel or restore control may cover lesson content");
  assert.equal(panel.style.left, "");
  assert.equal(panel.style.top, "");
  assert.equal(panel.style.transform, "");
  assert.equal(view.getByTestId("italian-yoppo-position").style.left, "");
  assert.equal(view.queryByText("Déplacer Yoppo", { selector: "summary" }), null);
  const arrow = new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
  fireEvent(opener, arrow);
  assert.equal(arrow.defaultPrevented, false, "inline controls must leave normal keyboard scrolling available");
  fireEvent.click(view.getByRole("button", { name: "Lesson action" }));
  assert.equal(lessonClicks, 1);
  fireEvent.keyDown(panel, { key: "Escape" });
  assert.equal(document.activeElement, opener);
  assert.equal(view.queryByRole("region"), null);
});

test("inline hide and restore preserve preferences and accessible focus in the reserved slot", () => {
  let view = render(node({ presentation: "inline" }));
  fireEvent.click(view.getByRole("button", { name: labels.fr.open }));
  fireEvent.click(view.getByRole("button", { name: "Masquer Yoppo" }));
  assert.equal(document.activeElement, view.getByRole("button", { name: "Retrouver Yoppo" }));
  assert.equal(JSON.parse(window.localStorage.getItem(key)!).hidden, true);
  view.unmount();
  view = render(node({ presentation: "inline" }));
  const restore = view.getByRole("button", { name: "Retrouver Yoppo" });
  assert.ok(view.container.contains(restore));
  assert.equal(restore.style.top, "");
  assert.equal(restore.classList.contains("fixed"), false);
  fireEvent.click(restore);
  assert.equal(document.activeElement, view.getByRole("heading", { name: labels.fr.title }));
  assert.equal(JSON.parse(window.localStorage.getItem(key)!).hidden, false);
});

let failed = 0;
try {
  for (const [name, run] of cases) {
    viewport(1024, 768);
    Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
    window.localStorage.clear();
    try { run(); console.log(`ok - ${name}`); }
    catch (error) { failed++; console.error(`not ok - ${name}`, error); }
    finally { cleanup(); }
  }
} finally {
  dom.window.close();
  for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
}
console.log(`\nItalian Yoppo: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
