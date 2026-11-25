/** Exercise actual learner controls, not just the shape of lesson data. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { ItalianGame } from "@/components/yo/italian/ItalianGames";
import { activities } from "@/lib/yo/italian/italianModuleData";
import type { ItalianActivity, ItalianActivityBase, ItalianCafeActivity, ItalianChoiceActivity, ItalianDialogueActivity, ItalianMapActivity, ItalianMatchActivity, ItalianOrderActivity, ItalianTypeActivity, LocaleText } from "@/lib/yo/italian/italianModuleTypes";
import { checkItalianCafe, checkItalianMap, checkItalianOrder, matchesItalianAnswer, normalizeItalianAnswer, scrambleItalianItems } from "@/lib/yo/italian/italianModuleLogic";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo/langues/italien/module-1", pretendToBeVisual: true });
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
const frames: FrameRequestCallback[] = [];
class FakeAudio extends dom.window.EventTarget {
  static instances: FakeAudio[] = [];
  src: string;
  preload = "";
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  constructor(src: string) { super(); this.src = src; FakeAudio.instances.push(this); }
  play() { return Promise.resolve(); }
  pause() { this.dispatchEvent(new dom.window.Event("pause")); }
  removeAttribute(name: string) { if (name === "src") this.src = ""; }
  load() {}
}
Object.defineProperty(dom.window, "Audio", { configurable: true, value: FakeAudio });
const bindings = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, requestAnimationFrame: (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; }, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, within, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const tr = (value: string): LocaleText => ({ fr: value, en: value, es: value });
const base: ItalianActivityBase = { id: "fixture", title: tr("Jeu"), prompt: tr("À toi"), hint: tr("Une piste"), hint2: tr("Une autre piste"), explanation: tr("Explication du jeu"), category: "cafe" };
const choice: ItalianChoiceActivity = { ...base, id: "choice", kind: "choice", correctId: "hello", options: [ { id: "bye", it: "Arrivederci!", feedback: tr("On se dit au revoir.") }, { id: "hello", it: "Buongiorno!", feedback: tr("On se dit bonjour.") } ] };
const matching: ItalianMatchActivity = { ...base, id: "matching", kind: "match", pairs: [ { id: "grazie", it: "Grazie", meaning: tr("Merci") }, { id: "prego", it: "Prego", meaning: tr("De rien") } ] };
const order: ItalianOrderActivity = { ...base, id: "ordering", kind: "order", tokens: ["un", "caffè.", "Vorrei"], answer: ["Vorrei", "un", "caffè."], distractors: ["una"], it: "Vorrei un caffè." };
const typing: ItalianTypeActivity = { ...base, id: "typing", kind: "type", accepted: ["Un caffè."], model: "Un caffè." };
const cafe: ItalianCafeActivity = { ...base, id: "cafe", kind: "cafe", orderText: "Due caffè e un panino, per favore.", menu: [ { id: "coffee", it: "Caffè", priceCents: 100 }, { id: "tea", it: "Tè", priceCents: 100 }, { id: "panino", it: "Panino", priceCents: 200 } ], order: [ { itemId: "coffee", quantity: 2 }, { itemId: "panino", quantity: 1 } ], budgetCents: 450 };
const map: ItalianMapActivity = { ...base, id: "map", kind: "map", instructions: ["Sempre dritto, poi a destra."], gridSize: 3, start: { row: 2, col: 0 }, goal: { row: 1, col: 1 }, path: ["up", "right"] };
const listening = activities.find((activity): activity is ItalianChoiceActivity => activity.kind === "listen")!;
const dialogueSource = activities.find((activity): activity is ItalianDialogueActivity => activity.kind === "dialogue")!;
const dialogue: ItalianDialogueActivity = { ...dialogueSource, id: "dialogue", turns: dialogueSource.turns.slice(0, 2) };
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);

function game(activity: ItalianActivity, extra: { onHelp?: () => void; locale?: "fr" | "en" | "es" } = {}) {
  const attempts: boolean[] = [];
  let helps = 0;
  const view = render(React.createElement(ItalianGame, { activity, locale: extra.locale ?? "fr", onAttempt: (correct) => attempts.push(correct), onHelp: () => { helps++; extra.onHelp?.(); } }));
  return { view, attempts, helps: () => helps };
}
function check(view: ReturnType<typeof render>) { return view.getByRole("button", { name: "Vérifier" }) as HTMLButtonElement; }
function answerName(activity: ItalianChoiceActivity, id = activity.correctId) { const option = activity.options.find((value) => value.id === id)!; return option.it ?? option.label!.fr; }
function optionButton(view: ReturnType<typeof render>, name: string) { return within(view.getByRole("group", { name: "Choisis une réponse" })).getByRole("button", { name }); }

test("no game records success or starts audio merely by mounting", () => {
  for (const activity of [choice, matching, order, typing, cafe, map, dialogue, listening]) {
    const { view, attempts, helps } = game(activity);
    assert.deepEqual(attempts, []);
    assert.equal(helps(), 0);
    assert.equal(FakeAudio.instances.length, 0);
    view.unmount();
  }
});

test("choice requires a selected answer and records one success after correction", () => {
  const { view, attempts } = game(choice);
  assert.equal(check(view).disabled, true);
  fireEvent.click(optionButton(view, "Arrivederci!"));
  assert.deepEqual(attempts, []);
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false]);
  assert.ok(view.getByText("On se dit au revoir."));
  fireEvent.click(optionButton(view, "Buongiorno!"));
  fireEvent.click(check(view));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false, true]);
  assert.equal(check(view).disabled, true);
});

test("matching requires every pair and wrong associations never complete it", () => {
  const { view, attempts } = game(matching);
  const left = within(view.getByRole("group", { name: "Expressions italiennes" }));
  const right = within(view.getByRole("group", { name: "Leur sens" }));
  assert.equal((right.getByRole("button", { name: "Merci" }) as HTMLButtonElement).disabled, true);
  fireEvent.click(left.getByRole("button", { name: "Grazie" }));
  fireEvent.click(right.getByRole("button", { name: "De rien" }));
  assert.deepEqual(attempts, [false]);
  fireEvent.click(right.getByRole("button", { name: "Merci" }));
  assert.deepEqual(attempts, [false]);
  fireEvent.click(left.getByRole("button", { name: "Prego" }));
  fireEvent.click(right.getByRole("button", { name: "De rien" }));
  assert.deepEqual(attempts, [false, true]);
  fireEvent.click(right.getByRole("button", { name: /Merci/ }));
  assert.deepEqual(attempts, [false, true]);
});

test("word tiles can be removed and rebuilt, and cannot be reused twice", () => {
  const { view, attempts } = game(order);
  const pool = within(view.getByRole("group", { name: "Mots disponibles" }));
  assert.equal(check(view).disabled, true);
  for (const word of ["Vorrei", "una", "caffè."]) fireEvent.click(pool.getByRole("button", { name: word }));
  assert.equal((pool.getByRole("button", { name: "Vorrei" }) as HTMLButtonElement).disabled, true);
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false]);
  fireEvent.click(view.getByRole("button", { name: "Retirer una" }));
  assert.equal((pool.getByRole("button", { name: "una" }) as HTMLButtonElement).disabled, false);
  fireEvent.click(view.getByRole("button", { name: "Tout remettre" }));
  for (const word of ["Vorrei", "un", "caffè."]) fireEvent.click(pool.getByRole("button", { name: word }));
  fireEvent.click(check(view));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false, true]);
});

test("written recall accepts case and punctuation while preserving accent distinctions", () => {
  assert.ok(matchesItalianAnswer("  UN   CAFFÈ! ", ["Un caffè."]));
  assert.ok(matchesItalianAnswer("caffe\u0300", ["caffè"]));
  assert.ok(matchesItalianAnswer("Dov'è la piazza?", ["Dov’è la piazza?"]));
  assert.ok(!matchesItalianAnswer("Un caffe", ["Un caffè"]));
  assert.ok(!matchesItalianAnswer("Un caffé", ["Un caffè"]));
  assert.ok(!matchesItalianAnswer("", [""]));
  assert.equal(normalizeItalianAnswer(" DOV’È  LA PIAZZA?! "), "dov'è la piazza");
});

test("typed recall and accent keys require an actual correct answer", () => {
  const { view, attempts } = game(typing);
  const input = view.getByRole("textbox", { name: "Ta réponse en italien" }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Un caffe" } });
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false]);
  fireEvent.change(input, { target: { value: "Un caff" } });
  fireEvent.click(view.getByRole("button", { name: "Ajouter è" }));
  act(() => { for (const callback of frames.splice(0)) callback(0); });
  assert.equal(input.value, "Un caffè");
  assert.equal(document.activeElement, input);
  fireEvent.submit(input.closest("form")!);
  fireEvent.submit(input.closest("form")!);
  assert.deepEqual(attempts, [false, true]);
});

test("accent controls insert at the caret and replace the selected text", () => {
  const { view } = game(typing);
  const input = view.getByRole("textbox") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Un caff." } });
  input.setSelectionRange(7, 7);
  fireEvent.click(view.getByRole("button", { name: "Ajouter è" }));
  act(() => { for (const callback of frames.splice(0)) callback(0); });
  assert.equal(input.value, "Un caffè.");
  assert.equal(input.selectionStart, 8);
  fireEvent.change(input, { target: { value: "Un caffe." } });
  input.setSelectionRange(7, 8);
  fireEvent.click(view.getByRole("button", { name: "Ajouter è" }));
  act(() => { for (const callback of frames.splice(0)) callback(0); });
  assert.equal(input.value, "Un caffè.");
  assert.equal(input.selectionStart, 8);
});

test("showing a written model marks assistance before the answer is exposed", () => {
  const instance = game(typing, { onHelp: () => assert.equal(instance.view.queryByText(typing.model), null) });
  const view = instance.view;
  fireEvent.click(view.getByRole("button", { name: "Voir un modèle" }));
  assert.equal(instance.helps(), 1);
  assert.equal(view.getByText(typing.model).getAttribute("lang"), "it");
  assert.deepEqual(instance.attempts, []);
});

test("the café checks requested products and quantities, not only an affordable total", () => {
  const { view, attempts } = game(cafe);
  assert.equal(check(view).disabled, true);
  for (const item of ["Tè", "Tè", "Panino"]) fireEvent.click(view.getByRole("button", { name: `Ajouter ${item}` }));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false]);
  for (let index = 0; index < 2; index++) fireEvent.click(view.getByRole("button", { name: "Retirer Tè" }));
  for (let index = 0; index < 2; index++) fireEvent.click(view.getByRole("button", { name: "Ajouter Caffè" }));
  fireEvent.click(check(view));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false, true]);
  assert.equal((view.getByRole("button", { name: "Ajouter Caffè" }) as HTMLButtonElement).disabled, true);
});

test("café evaluator rejects injected, fractional, negative and over-budget baskets", () => {
  assert.ok(checkItalianCafe(cafe, { coffee: 2, panino: 1 }));
  for (const basket of ([{ coffee: 2, panino: 1, unknown: 0 }, { coffee: 2.5, panino: 1 }, { coffee: -1, panino: 1 }, { coffee: 2, panino: 2 }] as Record<string, number>[])) assert.equal(checkItalianCafe(cafe, basket), false);
  assert.equal(checkItalianCafe({ ...cafe, budgetCents: 399 }, { coffee: 2, panino: 1 }), false);
});

test("map requires the instructed route, supports reset, and only finishes once", () => {
  const { view, attempts } = game(map);
  fireEvent.click(view.getByRole("button", { name: "À droite" }));
  fireEvent.click(view.getByRole("button", { name: "En haut" }));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false], "reaching the same square by another route does not demonstrate the instructions");
  fireEvent.click(view.getByRole("button", { name: "Tout remettre" }));
  assert.equal(check(view).disabled, true);
  fireEvent.click(view.getByRole("button", { name: "En haut" }));
  fireEvent.click(view.getByRole("button", { name: "À droite" }));
  fireEvent.click(check(view));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false, true]);
});

test("map boundaries do not teleport Yoppo or count a move; undo restores the route", () => {
  const { view, attempts } = game(map);
  fireEvent.click(view.getByRole("button", { name: "En bas" }));
  assert.ok(view.getByText("Tu arrives au bord du plan. Choisis une autre direction."));
  assert.equal(check(view).disabled, true);
  fireEvent.click(view.getByRole("button", { name: "En haut" }));
  fireEvent.click(view.getByRole("button", { name: "Annuler" }));
  assert.equal(check(view).disabled, true);
  assert.deepEqual(attempts, []);
  assert.equal(checkItalianMap(map, ["up", "right", "left", "right"]), false);
});

test("listening keeps the stimulus out of accessible names and waits for real playing", () => {
  const { view, attempts, helps } = game(listening);
  assert.equal(view.queryByText(listening.stimulus!), null);
  assert.equal(view.queryByRole("button", { name: `Écouter : ${listening.stimulus}` }), null);
  fireEvent.click(optionButton(view, answerName(listening)));
  assert.equal(check(view).disabled, true);
  fireEvent.click(view.getByRole("button", { name: "Écouter : le message de l’exercice" }));
  assert.equal(FakeAudio.instances.length, 1);
  assert.equal(check(view).disabled, true, "calling play() is not proof of audible playback");
  act(() => FakeAudio.instances[0].dispatchEvent(new dom.window.Event("playing")));
  assert.equal(check(view).disabled, false);
  fireEvent.click(check(view));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [true]);
  assert.equal(helps(), 0);
});

test("missing audio cannot unlock listening assessment; transcript offers an assisted route", () => {
  const instance = game(listening, { onHelp: () => assert.equal(instance.view.queryByText(listening.stimulus!), null) });
  const view = instance.view;
  fireEvent.click(optionButton(view, answerName(listening)));
  fireEvent.click(view.getByRole("button", { name: "Écouter : le message de l’exercice" }));
  act(() => FakeAudio.instances[0].dispatchEvent(new dom.window.Event("error")));
  assert.equal(check(view).disabled, true);
  fireEvent.click(view.getByRole("button", { name: "Lire la transcription (avec aide)" }));
  assert.equal(instance.helps(), 1);
  assert.ok(view.getByText(listening.stimulus!));
  fireEvent.click(check(view));
  assert.deepEqual(instance.attempts, [true]);
});

test("reading then hiding a transcript retains the assisted ability to answer", () => {
  const { view, attempts, helps } = game(listening);
  fireEvent.click(view.getByRole("button", { name: "Lire la transcription (avec aide)" }));
  fireEvent.click(view.getByRole("button", { name: "Lire la transcription (avec aide)" }));
  assert.equal(view.queryByText(listening.stimulus!), null);
  fireEvent.click(optionButton(view, answerName(listening)));
  assert.equal(check(view).disabled, false);
  fireEvent.click(check(view));
  assert.equal(helps(), 1);
  assert.deepEqual(attempts, [true]);
});

test("dialogue completion waits for every turn, including correction of a later mistake", () => {
  const { view, attempts } = game(dialogue);
  const first = dialogue.turns[0];
  const firstAnswer = first.options.find((item) => item.id === first.correctId)!;
  fireEvent.click(optionButton(view, firstAnswer.it ?? firstAnswer.label!.fr));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [], "a single successful turn must not complete the conversation");
  fireEvent.click(view.getByRole("button", { name: "Poursuivre la conversation" }));
  assert.equal(check(view).disabled, true);
  const last = dialogue.turns[1];
  const wrong = last.options.find((item) => item.id !== last.correctId)!;
  fireEvent.click(optionButton(view, wrong.it ?? wrong.label!.fr));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false]);
  const correct = last.options.find((item) => item.id === last.correctId)!;
  fireEvent.click(optionButton(view, correct.it ?? correct.label!.fr));
  fireEvent.click(check(view));
  fireEvent.click(check(view));
  assert.deepEqual(attempts, [false, true]);
  assert.ok(view.getByText("Conversation réussie"));
});

test("the player's key resets a game when a learner deliberately replays it", () => {
  const attempts: boolean[] = [];
  const element = (key: number) => React.createElement(ItalianGame, { key, activity: choice, locale: "fr", onAttempt: (correct: boolean) => attempts.push(correct), onHelp: () => {} });
  const view = render(element(0));
  fireEvent.click(optionButton(view, "Buongiorno!"));
  fireEvent.click(check(view));
  view.rerender(element(1));
  assert.equal(check(view).disabled, true);
  assert.equal(optionButton(view, "Buongiorno!").getAttribute("aria-pressed"), "false");
  assert.deepEqual(attempts, [true]);
});

test("stable scrambling never mutates authored data and order checks reject extra tokens", () => {
  const original = ["A", "B", "C", "D"];
  const mixed = scrambleItalianItems(original, "fixed-seed");
  assert.deepEqual(original, ["A", "B", "C", "D"]);
  assert.deepEqual(scrambleItalianItems(original, "fixed-seed"), mixed);
  assert.deepEqual([...mixed].sort(), original);
  assert.notDeepEqual(mixed, original);
  assert.ok(checkItalianOrder(["Vorrei", "un", "tè"], ["Vorrei", "un", "tè"]));
  assert.equal(checkItalianOrder(["Vorrei", "un", "tè", "un"], ["Vorrei", "un", "tè"]), false);
});

let failed = 0;
try {
  for (const [name, run] of cases) {
    FakeAudio.instances = [];
    frames.length = 0;
    try { run(); console.log(`ok - ${name}`); }
    catch (error) { failed++; console.error(`not ok - ${name}`, error); }
    finally { cleanup(); }
  }
} finally {
  dom.window.close();
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
}
console.log(`\nItalian games: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
