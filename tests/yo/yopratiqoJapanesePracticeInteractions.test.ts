/** Exercise the real Japanese practice components with React and a browser-like DOM. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";

import { JapaneseActivityPanel, initialJapaneseActivityState, type JapaneseActivityState } from "@/components/yo/japanese/JapaneseActivityPanel";
import { JapaneseDialoguePanel, JapaneseKanaLab, JapaneseVocabularyLab, JapaneseWritingLab } from "@/components/yo/japanese/JapaneseStudyPanels";
import type { JapaneseActivity, JapaneseBuildActivity, JapaneseChoiceActivity, JapaneseCourseUnit, JapaneseLocalized, JapaneseMatchActivity, JapanesePhrase, JapaneseReadingActivity } from "@/lib/yo/japaneseCourseTypes";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo/langues/japonais", pretendToBeVisual: true });
const bindings = {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, KeyboardEvent: dom.window.KeyboardEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, within, act } = require("@testing-library/react") as typeof import("@testing-library/react");

const l = (fr: string, en = fr, es = en): JapaneseLocalized => ({ fr, en, es });
const phrase = (ja: string, meaning: string): JapanesePhrase => ({ ja, kana: ja, romaji: "", meaning: l(meaning) });
const base = {
  id: "jp-test-choice", title: l("Présentation", "Introduction", "Presentación"),
  prompt: l("Quelle formule convient ?", "Which phrase fits?", "¿Qué frase encaja?"),
  hint: l("Pense à une première rencontre.", "Think of a first meeting.", "Piensa en un primer encuentro."),
  explanation: l("Le contexte détermine la formule.", "The context determines the phrase.", "El contexto determina la frase."),
  skill: "vocabulary" as const,
};
const choice: JapaneseChoiceActivity = { ...base, kind: "choice", answerId: "greeting", choices: [
  { id: "greeting", ja: "はじめまして。", feedback: l("Cette formule ouvre une présentation.", "This phrase starts an introduction.", "Esta frase abre una presentación.") },
  { id: "thanks", ja: "ありがとう。", feedback: l("C’est un remerciement.", "This expresses thanks.", "Expresa agradecimiento.") },
] };
const reading: JapaneseReadingActivity = { ...base, id: "jp-test-reading", kind: "reading", stimulus: "おばあさん", answer: "おばあさん", accepted: ["おばあさん", "obaasan"], acceptsRomaji: true, skill: "reading" };
const build: JapaneseBuildActivity = { ...base, id: "jp-test-build", kind: "build", tokens: [
  { id: "desu", text: "です" }, { id: "watashi", text: "わたし" }, { id: "wa", text: "は" }, { id: "alex", text: "アレックス" },
], answerOrder: ["watashi", "wa", "alex", "desu"], phrase: phrase("わたしはアレックスです。", "I am Alex."), skill: "grammar" };
const match: JapaneseMatchActivity = { ...base, id: "jp-test-match", kind: "match", pairs: [
  { id: "water", phrase: phrase("水", "water") }, { id: "tea", phrase: phrase("お茶", "tea") },
] };
const listening: JapaneseChoiceActivity = { ...base, id: "jp-test-listening", kind: "listening", stimulus: phrase("三番線です。", "It is platform three."), skill: "listening", answerId: "three", choices: [
  { id: "three", label: l("Quai trois", "Platform three", "Andén tres"), feedback: l("Trois est le numéro annoncé.") },
  { id: "five", label: l("Quai cinq", "Platform five", "Andén cinco"), feedback: l("Écoute le numéro une nouvelle fois.") },
] };
const unit: JapaneseCourseUnit = {
  id: "module-1", slug: "test", number: 1, title: l("Test"), subtitle: l("Test"), setting: l("At the café."), estimatedMinutes: 20,
  goals: [l("Order a drink.")], dialogue: [
    { ...phrase("こんにちは。", "Hello."), speaker: l("Alex") },
    { ...phrase("いらっしゃいませ。", "Welcome."), speaker: l("Host") },
  ], vocabulary: [{ id: "water", ...phrase("水", "water") }, { id: "tea", ...phrase("お茶", "tea") }],
  grammar: [], kana: ["あ"], kanji: ["水"], activities: [choice],
  roleplay: { title: l("Test"), context: l("Test"), turns: [] },
  culture: { title: l("Test"), note: l("Test"), reflection: l("Test"), sourceIds: [] },
  writing: { prompt: l("Introduce yourself."), model: phrase("アレックスです。", "I am Alex."), checklist: [l("I included my name."), l("I checked the ending.")] },
  canDos: [l("I can introduce myself.")],
};
const labels = {
  fr: { check: "Vérifier", retry: "Réessayer", correct: "Bien joué.", wrong: "Une autre tentative ?", hint: "Un indice avec Yoppo", assisted: "Réussi avec aide" },
  en: { check: "Check", retry: "Try again", correct: "Well done.", wrong: "Try another approach?", hint: "A hint from Yoppo", assisted: "Completed with help" },
  es: { check: "Verificar", retry: "Reintentar", correct: "Bien hecho.", wrong: "¿Otro intento?", hint: "Una pista de Yoppo", assisted: "Completado con ayuda" },
};
function ActivityHarness({ activity, locale = "en", result, showRomaji = false }: { activity: JapaneseActivity; locale?: YoLocale; result: (correct: boolean, assisted: boolean) => void; showRomaji?: boolean }) {
  const [state, setState] = React.useState(() => initialJapaneseActivityState(activity));
  return React.createElement(JapaneseActivityPanel, { activity, locale, state, onChange: setState, onResult: result, showRomaji });
}
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: tentative choices do not score; check, retry and assistance produce the right result`, () => {
    const results: Array<[boolean, boolean]> = [];
    const view = render(React.createElement(ActivityHarness, { activity: choice, locale, result: (correct, assisted) => results.push([correct, assisted]) }));
    assert.equal(view.getAllByRole("button", { name: labels[locale].check }).length, 1);
    assert.equal((view.getByRole("button", { name: labels[locale].check }) as HTMLButtonElement).disabled, true);
    fireEvent.click(view.getByRole("button", { name: "はじめまして。" }));
    fireEvent.click(view.getByRole("button", { name: "ありがとう。" }));
    assert.deepEqual(results, []);
    assert.equal(view.queryByText(base.explanation[locale]), null);
    fireEvent.click(view.getByRole("button", { name: labels[locale].check }));
    assert.deepEqual(results, [[false, false]]);
    assert.equal(document.activeElement, view.getByRole("heading", { name: labels[locale].wrong }));
    assert.equal((view.getByRole("button", { name: "はじめまして。" }) as HTMLButtonElement).disabled, true);
    fireEvent.click(view.getByRole("button", { name: labels[locale].retry }));
    assert.equal(document.activeElement, view.getByText(base.prompt[locale]));
    assert.equal(view.getByRole("button", { name: "ありがとう。" }).getAttribute("aria-pressed"), "false");
    fireEvent.click(view.getByRole("button", { name: labels[locale].hint }));
    assert.ok(view.getByText(base.hint[locale]));
    fireEvent.click(view.getByRole("button", { name: "はじめまして。" }));
    fireEvent.click(view.getByRole("button", { name: labels[locale].check }));
    assert.deepEqual(results, [[false, false], [true, true]]);
    assert.ok(view.getByText(labels[locale].assisted));
    assert.equal(document.activeElement, view.getByRole("heading", { name: labels[locale].correct }));
  });
}

test("a delayed controlled-parent update cannot record the same checked attempt twice", () => {
  const results: boolean[] = [];
  const state = { ...initialJapaneseActivityState(choice), answer: "greeting" };
  const view = render(React.createElement(JapaneseActivityPanel, { activity: choice, locale: "en", state, onChange: () => {}, onResult: (correct) => results.push(correct) }));
  const check = view.getByRole("button", { name: "Check" });
  fireEvent.click(check);
  fireEvent.click(check);
  assert.deepEqual(results, [true]);
});

test("a controlled reset clears checked presentation and stale selections", () => {
  const checked: JapaneseActivityState = { ...initialJapaneseActivityState(choice), answer: "greeting", checked: true, correct: true };
  const shared = { activity: choice, locale: "en" as const, onChange: () => {}, onResult: () => {} };
  const view = render(React.createElement(JapaneseActivityPanel, { ...shared, state: checked }));
  assert.ok(view.getByRole("heading", { name: "Well done." }));
  view.rerender(React.createElement(JapaneseActivityPanel, { ...shared, state: initialJapaneseActivityState(choice, 1) }));
  assert.equal(view.queryByRole("heading", { name: "Well done." }), null);
  assert.equal(view.getByRole("button", { name: "はじめまして。" }).getAttribute("aria-pressed"), "false");
  assert.equal((view.getByRole("button", { name: "Check" }) as HTMLButtonElement).disabled, true);
});

test("IME confirmation does not submit a reading answer; the next ordinary Enter submits once", () => {
  const results: boolean[] = [];
  const view = render(React.createElement(ActivityHarness, { activity: reading, result: (correct) => results.push(correct) }));
  const input = view.getByRole("textbox");
  assert.equal(view.getAllByRole("button", { name: "Check" }).length, 1);
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: "おばあさん" } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true, keyCode: 229 });
  fireEvent.submit(input.closest("form")!);
  assert.deepEqual(results, []);
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
  fireEvent.submit(input.closest("form")!);
  assert.deepEqual(results, []);
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
  assert.deepEqual(results, [true]);
  assert.equal(document.activeElement, view.getByRole("heading", { name: "Well done." }));
});

test("reading feedback preserves meaningful long-vowel distinctions in kana and rōmaji", () => {
  const results: boolean[] = [];
  const view = render(React.createElement(ActivityHarness, { activity: reading, result: (correct) => results.push(correct) }));
  for (const answer of ["おばさん", "obasan", "OBAASAN"]) {
    fireEvent.change(view.getByRole("textbox"), { target: { value: answer } });
    fireEvent.click(view.getByRole("button", { name: "Check" }));
    if (answer !== "OBAASAN") fireEvent.click(view.getByRole("button", { name: "Try again" }));
  }
  assert.deepEqual(results, [false, false, true]);
});

test("building and removing words retains keyboard focus and only checking produces a result", () => {
  const results: boolean[] = [];
  const view = render(React.createElement(ActivityHarness, { activity: build, result: (correct) => results.push(correct) }));
  const bank = () => within(view.getByRole("group", { name: "Available words" }));
  fireEvent.click(bank().getByRole("button", { name: "わたし" }));
  assert.equal(document.activeElement, bank().getByRole("button", { name: "です" }));
  fireEvent.click(view.getByRole("button", { name: "Remove word わたし" }));
  assert.equal(document.activeElement, bank().getByRole("button", { name: "わたし" }));
  assert.deepEqual(results, []);
  for (const id of build.answerOrder) fireEvent.click(bank().getByRole("button", { name: build.tokens.find((token) => token.id === id)!.text }));
  assert.equal(document.activeElement, view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, []);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, [true]);
  fireEvent.click(view.getByRole("button", { name: "Try again" }));
  fireEvent.click(bank().getByRole("button", { name: "です" }));
  fireEvent.click(view.getByRole("button", { name: "Undo last word" }));
  assert.equal(document.activeElement, bank().getByRole("button", { name: "です" }));
  assert.equal((view.getByRole("button", { name: "Check" }) as HTMLButtonElement).disabled, true);
});

test("matching announces each pair and moves focus to the next word, then Check", () => {
  const results: boolean[] = [];
  const view = render(React.createElement(ActivityHarness, { activity: match, result: (correct) => results.push(correct) }));
  const water = view.getByRole("button", { name: "water" });
  const tea = view.getByRole("button", { name: "tea" });
  fireEvent.click(view.getByRole("button", { name: /^1 水/ }));
  fireEvent.click(water);
  assert.match(view.getByRole("status").textContent ?? "", /水 → water/);
  assert.equal(document.activeElement, view.getByRole("button", { name: /^2 お茶/ }));
  assert.equal((water as HTMLButtonElement).disabled, true);
  fireEvent.click(view.getByRole("button", { name: /^2 お茶/ }));
  fireEvent.click(tea);
  assert.equal(document.activeElement, view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, []);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, [true]);
});

test("reassigning a matching target frees its previous pair and wrong matches stay ungraded until Check", () => {
  const results: boolean[] = [];
  const view = render(React.createElement(ActivityHarness, { activity: match, result: (correct) => results.push(correct) }));
  const water = view.getByRole("button", { name: "water" });
  const tea = view.getByRole("button", { name: "tea" });
  fireEvent.click(view.getByRole("button", { name: /^1 水/ })); fireEvent.click(water);
  fireEvent.click(view.getByRole("button", { name: /^2 お茶/ })); fireEvent.click(water);
  assert.equal((view.getByRole("button", { name: "Check" }) as HTMLButtonElement).disabled, true);
  assert.equal(document.activeElement, view.getByRole("button", { name: /^1 水/ }));
  fireEvent.click(view.getByRole("button", { name: /^1 水/ })); fireEvent.click(tea);
  assert.deepEqual(results, []);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, [false]);
});

test("listening controls do not reveal the stimulus; a revealed transcript marks the attempt assisted", () => {
  const results: Array<[boolean, boolean]> = [];
  const view = render(React.createElement(ActivityHarness, { activity: listening, result: (correct, assisted) => results.push([correct, assisted]) }));
  assert.ok(view.getByRole("button", { name: "Listen : the exercise message" }));
  assert.equal(view.queryByText(listening.stimulus!.ja), null);
  assert.equal(view.getAllByRole("button").some((button) => button.getAttribute("aria-label")?.includes(listening.stimulus!.ja)), false);
  fireEvent.click(view.getByRole("button", { name: "Read the transcript" }));
  assert.equal(view.getByText(listening.stimulus!.ja).getAttribute("lang"), "ja");
  fireEvent.click(view.getByRole("button", { name: "Hide the transcript" }));
  fireEvent.click(view.getByRole("button", { name: "Platform three" }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, [[true, true]]);
});

test("choice rōmaji support remains assisted after it is hidden and resets for a fresh unaided attempt", () => {
  const activity: JapaneseChoiceActivity = { ...choice, choices: choice.choices.map((item, index) => ({ ...item, romaji: index === 0 ? "hajimemashite" : "arigatō" })) };
  const results: Array<[boolean, boolean]> = [];
  const props = { activity, result: (correct: boolean, assisted: boolean) => results.push([correct, assisted]) };
  const view = render(React.createElement(ActivityHarness, props));
  view.rerender(React.createElement(ActivityHarness, { ...props, showRomaji: true }));
  assert.ok(view.getByText("hajimemashite"));
  view.rerender(React.createElement(ActivityHarness, { ...props, showRomaji: false }));
  assert.equal(view.queryByText("hajimemashite"), null);
  fireEvent.click(view.getByRole("button", { name: "はじめまして。" }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, [[true, true]]);
  assert.ok(view.getByText("Completed with help"));
  fireEvent.click(view.getByRole("button", { name: "Try again" }));
  fireEvent.click(view.getByRole("button", { name: "はじめまして。" }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, [[true, true], [true, false]]);
  assert.ok(view.getByText("Correct in this exercise"));
});

test("the rōmaji preference does not count as support when this activity renders no choice readings", () => {
  const activity: JapaneseChoiceActivity = { ...listening, stimulus: { ...listening.stimulus!, romaji: "sanbansen desu" } };
  const results: Array<[boolean, boolean]> = [];
  const view = render(React.createElement(ActivityHarness, { activity, showRomaji: true, result: (correct, assisted) => results.push([correct, assisted]) }));
  assert.equal(view.queryByText("sanbansen desu"), null);
  fireEvent.click(view.getByRole("button", { name: "Platform three" }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.deepEqual(results, [[true, false]]);
  assert.ok(view.getByText("Correct in this exercise"));
});

test("revealing rōmaji after Check preserves the assessed result and its assistance label", () => {
  const activity: JapaneseChoiceActivity = { ...choice, choices: choice.choices.map((item) => ({ ...item, romaji: "reading aid" })) };
  const results: Array<[boolean, boolean]> = [];
  const props = { activity, result: (correct: boolean, assisted: boolean) => results.push([correct, assisted]) };
  const view = render(React.createElement(ActivityHarness, props));
  fireEvent.click(view.getByRole("button", { name: "はじめまして。" }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  view.rerender(React.createElement(ActivityHarness, { ...props, showRomaji: true }));
  assert.equal(view.getAllByText("reading aid").length, 2);
  assert.deepEqual(results, [[true, false]]);
  assert.ok(view.getByText("Correct in this exercise"));
  assert.equal(view.queryByText("Completed with help"), null);
});

test("revealing and hiding a transcript after Check keeps the independent result stable", () => {
  const results: Array<[boolean, boolean]> = [];
  const view = render(React.createElement(ActivityHarness, { activity: listening, result: (correct, assisted) => results.push([correct, assisted]) }));
  fireEvent.click(view.getByRole("button", { name: "Platform three" }));
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  fireEvent.click(view.getByRole("button", { name: "Read the transcript" }));
  assert.ok(view.getByText(listening.stimulus!.ja));
  assert.ok(view.getByText("Correct in this exercise"));
  assert.equal(view.queryByText("Completed with help"), null);
  fireEvent.click(view.getByRole("button", { name: "Hide the transcript" }));
  assert.equal(view.queryByText(listening.stimulus!.ja), null);
  assert.ok(view.getByText("Correct in this exercise"));
  assert.deepEqual(results, [[true, false]]);
});

test("vocabulary ratings recycle difficult cards and focus the next reveal or finished status", () => {
  const view = render(React.createElement(JapaneseVocabularyLab, { unit, locale: "en", showRomaji: false }));
  assert.equal(view.queryByText("water"), null);
  fireEvent.click(view.getByRole("button", { name: "Reveal meaning" }));
  fireEvent.click(view.getByRole("button", { name: "Practice again" }));
  assert.equal(document.activeElement, view.getByRole("button", { name: "Reveal meaning" }));
  assert.ok(view.getByText("お茶"));
  for (let i = 0; i < 2; i += 1) {
    fireEvent.click(view.getByRole("button", { name: "Reveal meaning" }));
    fireEvent.click(view.getByRole("button", { name: "I remember it" }));
  }
  assert.equal(document.activeElement, view.getByRole("status"));
  assert.match(view.getByRole("status").textContent ?? "", /every card/);
  assert.ok(view.getByText(/not an assessment score/));
  fireEvent.click(view.getByRole("button", { name: "Restart" }));
  assert.equal(document.activeElement, view.getByRole("button", { name: "Reveal meaning" }));
});

test("the final kana has an explicit retry and its practice count does not increase for repeated success", () => {
  const view = render(React.createElement(JapaneseKanaLab, { characters: ["あ"], locale: "en" }));
  fireEvent.click(view.getByRole("button", { name: "Test yourself" }));
  assert.equal(document.activeElement, view.getByText("Which sound matches this kana?"));
  const wrong = view.getAllByRole("button").find((button) => /^[a-z]{1,3}$/.test(button.textContent ?? "") && button.textContent !== "a")!;
  fireEvent.click(wrong);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  assert.match(document.activeElement?.textContent ?? "", /Listen and compare/);
  for (let i = 0; i < 2; i += 1) {
    fireEvent.click(view.getByRole("button", { name: "Try this kana again" }));
    assert.equal(document.activeElement, view.getByText("Which sound matches this kana?"));
    assert.equal((view.getByRole("button", { name: "Check" }) as HTMLButtonElement).disabled, true);
    fireEvent.click(view.getByRole("button", { name: "a" }));
    fireEvent.click(view.getByRole("button", { name: "Check" }));
    assert.match(document.activeElement?.textContent ?? "", /1 \/ 1$/);
  }
  assert.ok(view.getByText(/does not measure unaided recall/));
});

test("writing drafts and self-assessment remain intact when a mounted study screen is hidden", () => {
  const host = (hidden: boolean) => React.createElement("div", { hidden, inert: hidden }, React.createElement(JapaneseWritingLab, { unit, locale: "en", showRomaji: true }));
  const view = render(host(false));
  fireEvent.change(view.getByRole("textbox"), { target: { value: "アレックスです。" } });
  fireEvent.click(view.getByRole("checkbox", { name: "I included my name." }));
  fireEvent.click(view.getByRole("button", { name: "See a model" }));
  assert.ok(view.getByRole("button", { name: "Hide the model" }));
  view.rerender(host(true));
  assert.equal(view.queryByRole("textbox"), null);
  view.rerender(host(false));
  assert.equal((view.getByRole("textbox") as HTMLTextAreaElement).value, "アレックスです。");
  assert.equal((view.getByRole("checkbox", { name: "I included my name." }) as HTMLInputElement).checked, true);
});

test("dialogue navigation focuses the new line even when the last Next button becomes disabled", () => {
  const view = render(React.createElement(JapaneseDialoguePanel, { unit, locale: "en", showRomaji: false }));
  fireEvent.click(view.getByRole("button", { name: "Next" }));
  assert.equal(document.activeElement, view.getByText("Line 2 / 2").parentElement);
  assert.equal((view.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled, true);
  fireEvent.click(view.getByRole("button", { name: "Previous" }));
  assert.equal(document.activeElement, view.getByText("Line 1 / 2").parentElement);
});

let failed = 0;
try {
  for (const [name, run] of cases) {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
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
console.log(`\nJapanese practice interactions: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
