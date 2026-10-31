/** End-to-end component interactions with the actual module, games and progress hook. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { ItalianAdventure } from "@/components/yo/italian/ItalianAdventure";
import { activities, moduleCopy, vocabulary } from "@/lib/yo/italian/italianModuleData";
import type { ItalianActivity, ItalianChoiceActivity, ItalianDialogueActivity, ItalianMatchActivity, ItalianTypeActivity } from "@/lib/yo/italian/italianModuleTypes";
import { emptyItalianProgress, ITALIAN_PROGRESS_KEY, recordItalianAttempt } from "@/lib/yo/italian/italianModuleProgress";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo/langues/italien/module-1", pretendToBeVisual: true });
const frames: Array<FrameRequestCallback> = [];
let audioStarts = 0;
class FakeAudio extends dom.window.EventTarget {
  src: string; preload = "none"; playbackRate = 1; preservesPitch = true; currentTime = 0;
  constructor(src: string) { super(); this.src = src; audioStarts++; }
  play() { return Promise.resolve(); }
  pause() {}
  removeAttribute() { this.src = ""; }
  load() {}
}
Object.defineProperty(dom.window, "Audio", { configurable: true, value: FakeAudio });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
const bindings = {
  window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
  MutationObserver: dom.window.MutationObserver, requestAnimationFrame: (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; }, cancelAnimationFrame: () => {}, IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, within, act } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
const firstMatch = activities.find((item): item is ItalianMatchActivity => item.kind === "match")!;
const firstChoice = activities.find((item): item is ItalianChoiceActivity => item.kind === "choice")!;
const typed = activities.find((item): item is ItalianTypeActivity => item.kind === "type")!;
const finalDialogue = activities.find((item): item is ItalianDialogueActivity => item.kind === "dialogue" && item.category === "final")!;
const node = (locale: YoLocale = "fr") => React.createElement(ItalianAdventure, { locale });
const saved = () => JSON.parse(window.localStorage.getItem(ITALIAN_PROGRESS_KEY) ?? JSON.stringify(emptyItalianProgress())) as ReturnType<typeof emptyItalianProgress>;
function flushFrames() { const pending = frames.splice(0); act(() => { for (const callback of pending) callback(0); }); }
function click(element: HTMLElement) { fireEvent.click(element); flushFrames(); }
function heading(view: View) { return view.getByRole("heading", { level: 1 }); }
function finish(view: View) { click(view.getByRole("button", { name: "Ton carnet de voyage" })); }
function jump(view: View, activity: ItalianActivity) {
  finish(view);
  click(view.getByRole("button", { name: (name) => name.startsWith(activity.title.fr) }));
  assert.equal(heading(view).textContent, activity.title.fr);
}
function matchAll(view: View, item = firstMatch) {
  const left = within(view.getByRole("group", { name: "Expressions italiennes" }));
  const right = within(view.getByRole("group", { name: "Leur sens" }));
  for (const pair of item.pairs) { click(left.getByRole("button", { name: pair.it })); click(right.getByRole("button", { name: pair.meaning.fr })); }
}
function choiceAnswer(view: View, activity: ItalianChoiceActivity, correct = true) {
  const answer = activity.options.find((item) => correct ? item.id === activity.correctId : item.id !== activity.correctId)!;
  click(within(view.getByRole("group", { name: "Choisis une réponse" })).getByRole("button", { name: answer.it ?? answer.label!.fr }));
  click(view.getByRole("button", { name: "Vérifier" }));
}
function count(view: View) { return Number(view.getByRole("progressbar", { name: "défis réussis" }).getAttribute("aria-valuenow")); }

for (const locale of ["fr", "en", "es"] as const) {
  const labels = {
    fr: { welcome: "Bienvenue à Bologne", start: "C’est parti !", study: "Faire connaissance", next: "Continuer", hide: "Masquer les traductions", show: "Afficher les traductions", progress: "défis réussis", open: "Ouvrir Yoppo" },
    en: { welcome: "Welcome to Bologna", start: "Let’s go!", study: "Meet someone", next: "Continue", hide: "Hide translations", show: "Show translations", progress: "challenges completed", open: "Open Yoppo" },
    es: { welcome: "Bienvenido a Bolonia", start: "¡Vamos!", study: "Conocerse", next: "Continuar", hide: "Ocultar traducciones", show: "Mostrar traducciones", progress: "retos completados", open: "Abrir a Yoppo" },
  }[locale];
  test(`${locale}: welcome, study and first game are usable with localized navigation and no autoplay`, () => {
    const view = render(node(locale));
    assert.equal(heading(view).textContent, labels.welcome);
    assert.ok(view.getByRole("button", { name: labels.open }));
    const languageLink = view.getByRole("link", { name: locale.toUpperCase() });
    assert.equal(languageLink.getAttribute("aria-current"), "page");
    assert.equal(languageLink.getAttribute("href"), "/yo/langues/italien/module-1" + (locale === "fr" ? "" : `?lang=${locale}`));
    click(view.getByRole("button", { name: labels.start }));
    assert.equal(heading(view).textContent, labels.study);
    assert.equal(document.activeElement, heading(view));
    assert.ok(view.getByText(vocabulary[0].meaning[locale]));
    click(view.getByRole("button", { name: labels.hide }));
    assert.equal(view.queryByText(vocabulary[0].meaning[locale]), null);
    click(view.getByRole("button", { name: labels.show }));
    assert.ok(view.getByText(vocabulary[0].meaning[locale]));
    click(view.getByRole("button", { name: labels.next }));
    assert.equal(heading(view).textContent, firstMatch.title[locale]);
    assert.equal((view.getByRole("button", { name: labels.next }) as HTMLButtonElement).disabled, true);
    assert.equal(view.getByRole("progressbar", { name: labels.progress }).getAttribute("aria-valuenow"), "0");
    assert.deepEqual(saved().results, {});
    assert.equal(audioStarts, 0);
  });
}

test("wrong match then success is assisted; an explicit replay can establish independent recall", () => {
  const view = render(node());
  click(view.getByRole("button", { name: "C’est parti !" }));
  click(view.getByRole("button", { name: "Continuer" }));
  const left = within(view.getByRole("group", { name: "Expressions italiennes" }));
  const right = within(view.getByRole("group", { name: "Leur sens" }));
  click(left.getByRole("button", { name: firstMatch.pairs[0].it }));
  click(right.getByRole("button", { name: firstMatch.pairs[1].meaning.fr }));
  assert.equal(count(view), 0);
  matchAll(view);
  assert.deepEqual(saved().results[firstMatch.id], { attempts: 2, completed: true, independent: false });
  assert.ok(view.getByText("avec aide"));
  assert.equal(count(view), 1);
  click(view.getByRole("button", { name: "Rejouer sans aide" }));
  assert.equal((view.getByRole("button", { name: "Continuer" }) as HTMLButtonElement).disabled, true);
  assert.equal(document.activeElement, heading(view));
  matchAll(view);
  assert.deepEqual(saved().results[firstMatch.id], { attempts: 3, completed: true, independent: true });
  assert.equal(count(view), 1, "replays cannot award another completed activity");
  assert.ok(view.getByText("sans aide"));
  click(view.getByRole("button", { name: "Continuer" }));
  assert.equal(saved().currentStep, firstChoice.id);
  view.unmount();
  const resumed = render(node());
  assert.equal(heading(resumed).textContent, firstChoice.title.fr);
  assert.equal(count(resumed), 1);
});

test("skipping, chapter navigation and opening the notebook summary never complete challenges", () => {
  const view = render(node());
  click(view.getByRole("button", { name: "C’est parti !" }));
  click(view.getByRole("button", { name: "Continuer" }));
  click(view.getByRole("button", { name: "Passer pour l’instant" }));
  assert.equal(heading(view).textContent, firstChoice.title.fr);
  assert.equal(count(view), 0);
  finish(view);
  assert.ok(view.getByRole("heading", { name: "Ton aventure continue" }));
  assert.equal(view.queryByRole("heading", { name: moduleCopy.finishTitle.fr }), null);
  assert.equal(count(view), 0);
  assert.deepEqual(saved().results, {});
});

test("opening the word notebook during a game marks its next success assisted", () => {
  const view = render(node());
  jump(view, firstChoice);
  click(view.getByRole("button", { name: "Mon carnet de mots" }));
  const notebook = view.getByRole("region", { name: "Mon carnet de mots" });
  assert.ok(within(notebook).getByText(vocabulary[0].meaning.fr));
  click(within(notebook).getByRole("button", { name: "Fermer" }));
  choiceAnswer(view, firstChoice);
  assert.equal(saved().results[firstChoice.id].independent, false);
  assert.equal(saved().results[firstChoice.id].completed, true);
});

test("Yoppo hints affect the current attempt, and retry starts a new independent opportunity", () => {
  const view = render(node());
  jump(view, firstChoice);
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  const coach = within(view.getByRole("region", { name: "On joue ensemble ?" }));
  click(coach.getByRole("button", { name: "Un indice" }));
  assert.ok(coach.getByText(firstChoice.hint.fr));
  fireEvent.keyDown(view.getByRole("region", { name: "On joue ensemble ?" }), { key: "Escape" });
  choiceAnswer(view, firstChoice);
  assert.equal(saved().results[firstChoice.id].independent, false);
  click(view.getByRole("button", { name: "Rejouer sans aide" }));
  choiceAnswer(view, firstChoice);
  assert.equal(saved().results[firstChoice.id].independent, true);
  assert.equal(count(view), 1);
});

test("Yoppo bonus games are functional and never add module success or attempts", () => {
  const view = render(node());
  jump(view, firstChoice);
  const before = JSON.stringify(saved().results);
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  click(view.getByRole("button", { name: /Défie-moi/ }));
  const bonus = within(view.getByRole("region", { name: "Le petit défi de Yoppo" }));
  click(bonus.getByRole("button", { name: vocabulary[7].meaning.fr }));
  assert.ok(bonus.getByText("Pas tout à fait. Essaie une autre proposition."));
  click(bonus.getByRole("button", { name: vocabulary[0].meaning.fr }));
  assert.ok(bonus.getByText("Esatto ! Bien joué."));
  assert.equal(count(view), 0);
  assert.equal(JSON.stringify(saved().results), before);
  click(bonus.getByRole("button", { name: "Encore un !" }));
  assert.ok(view.getByRole("region", { name: "Le petit défi de Yoppo" }).textContent?.includes(vocabulary[1].it));
  click(within(view.getByRole("region", { name: "Le petit défi de Yoppo" })).getByRole("button", { name: "Fermer" }));
  assert.equal(view.queryByRole("region", { name: "Le petit défi de Yoppo" }), null);
  assert.equal(JSON.stringify(saved().results), before);
  assert.equal(audioStarts, 0);
  choiceAnswer(view, firstChoice);
  assert.equal(saved().results[firstChoice.id].independent, false, "bonus vocabulary may help with the current challenge");
});

test("opening help after an evaluated independent success does not rewrite that attempt", () => {
  const view = render(node());
  jump(view, firstChoice);
  choiceAnswer(view, firstChoice);
  const assessed = saved().results[firstChoice.id];
  assert.ok(view.getByText("sans aide"));
  click(view.getByRole("button", { name: "Mon carnet de mots" }));
  click(within(view.getByRole("region", { name: "Mon carnet de mots" })).getByRole("button", { name: "Fermer" }));
  assert.ok(view.getByText("sans aide"));
  assert.equal(view.queryByText("avec aide"), null);
  assert.deepEqual(saved().results[firstChoice.id], assessed);
});

test("review leads to the first activity without independent recall", () => {
  let progress = recordItalianAttempt(emptyItalianProgress(), firstMatch.id, true, false);
  progress = recordItalianAttempt(progress, firstChoice.id, true, true);
  progress.currentStep = "finish";
  window.localStorage.setItem(ITALIAN_PROGRESS_KEY, JSON.stringify(progress));
  const view = render(node());
  click(view.getByRole("button", { name: "Reprendre mes révisions" }));
  assert.equal(heading(view).textContent, firstChoice.title.fr);
  assert.equal((view.getByRole("button", { name: "Continuer" }) as HTMLButtonElement).disabled, true);
  assert.equal(count(view), 2);
});

test("written responses stay out of saved progress and unsubmitted drafts earn nothing", () => {
  const view = render(node());
  jump(view, typed);
  const draft = "Brouillon personnel qui ne doit pas être enregistré";
  fireEvent.change(view.getByRole("textbox"), { target: { value: draft } });
  assert.equal(window.localStorage.getItem(ITALIAN_PROGRESS_KEY)!.includes(draft), false);
  assert.equal(saved().results[typed.id], undefined);
  fireEvent.change(view.getByRole("textbox"), { target: { value: typed.accepted[0] } });
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.equal(saved().results[typed.id].completed, true);
  assert.equal(window.localStorage.getItem(ITALIAN_PROGRESS_KEY)!.includes(typed.accepted[0]), false);
});

test("the final passport waits for the last complete dialogue, not just a visit", () => {
  let progress = activities.filter((item) => item.id !== finalDialogue.id).reduce((value, item) => recordItalianAttempt(value, item.id, true, false), emptyItalianProgress());
  progress = { ...progress, currentStep: "finish" };
  window.localStorage.setItem(ITALIAN_PROGRESS_KEY, JSON.stringify(progress));
  const view = render(node());
  assert.ok(view.getByRole("heading", { name: "Ton aventure continue" }));
  jump(view, finalDialogue);
  for (let index = 0; index < finalDialogue.turns.length; index++) {
    const turn = finalDialogue.turns[index];
    const answer = turn.options.find((item) => item.id === turn.correctId)!;
    click(within(view.getByRole("group", { name: "Choisis une réponse" })).getByRole("button", { name: answer.it ?? answer.label!.fr }));
    click(view.getByRole("button", { name: "Vérifier" }));
    if (index < finalDialogue.turns.length - 1) {
      assert.equal(saved().results[finalDialogue.id], undefined);
      click(view.getByRole("button", { name: "Poursuivre la conversation" }));
    }
  }
  assert.equal(saved().results[finalDialogue.id].completed, true);
  assert.equal(count(view), activities.length);
  finish(view);
  assert.ok(view.getByRole("heading", { name: moduleCopy.finishTitle.fr }));
});

test("saved resume survives StrictMode and malformed stages safely fall back to welcome", () => {
  const progress = recordItalianAttempt(emptyItalianProgress(), firstMatch.id, true, true);
  progress.currentStep = firstChoice.id;
  window.localStorage.setItem(ITALIAN_PROGRESS_KEY, JSON.stringify(progress));
  const view = render(React.createElement(React.StrictMode, null, node()));
  assert.equal(heading(view).textContent, firstChoice.title.fr);
  assert.equal(saved().results[firstMatch.id].completed, true);
  view.unmount();
  window.localStorage.setItem(ITALIAN_PROGRESS_KEY, JSON.stringify({ ...progress, currentStep: "retired-lesson" }));
  const fresh = render(node());
  assert.equal(heading(fresh).textContent, "Bienvenue à Bologne");
  assert.equal(count(fresh), 1);
});

test("reset requires confirmation, clears progress and returns focus to a clean welcome", () => {
  const view = render(node());
  jump(view, firstChoice);
  choiceAnswer(view, firstChoice);
  finish(view);
  click(view.getByRole("button", { name: "Effacer ma progression" }));
  assert.equal(count(view), 1);
  click(view.getByRole("button", { name: "Annuler" }));
  assert.equal(count(view), 1);
  click(view.getByRole("button", { name: "Mon carnet de mots" }));
  click(view.getByRole("button", { name: "Effacer ma progression" }));
  click(view.getByRole("button", { name: "Confirmer l’effacement" }));
  assert.equal(heading(view).textContent, "Bienvenue à Bologne");
  assert.equal(view.queryByRole("region", { name: "Mon carnet de mots" }), null);
  assert.equal(document.activeElement, heading(view));
  assert.deepEqual(saved().results, {});
  assert.equal(saved().currentStep, "welcome");
  assert.equal(count(view), 0);
});

let failed = 0;
const runtimeErrors: unknown[][] = [];
const originalError = console.error;
try {
  for (const [name, run] of cases) {
    window.localStorage.clear(); frames.length = 0; audioStarts = 0;
    const errorCount = runtimeErrors.length;
    console.error = (...args: unknown[]) => { runtimeErrors.push(args); originalError(...args); };
    try { run(); assert.equal(runtimeErrors.length, errorCount, "the player must not emit React or DOM runtime errors"); console.log(`ok - ${name}`); }
    catch (error) { failed++; originalError(`not ok - ${name}`, error); }
    finally { cleanup(); frames.length = 0; console.error = originalError; }
  }
} finally {
  console.error = originalError;
  dom.window.close();
  for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
}
console.log(`\nItalian adventure: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
