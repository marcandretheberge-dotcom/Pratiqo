/** Exercise the real quiz: a draft choice must not disclose its correctness. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { DominicanRepublicModule5Quiz } from "@/components/yo/DominicanRepublicModule5Interactive";
import type { Dom5QuizQuestion } from "@/lib/yo/dominicanRepublicA2Capstone";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://www.pratiqo.ca/yo",
  pretendToBeVisual: true,
});
const bindings = {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(
  Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);
for (const [key, value] of Object.entries(bindings)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");

const questions = [
  {
    id: "reservation",
    type: { fr: "Situation", en: "Situation", es: "Situación" },
    prompt: { fr: "Annonce ta réservation.", en: "Mention your reservation.", es: "Menciona tu reservación." },
    options: [
      { id: "reservation", target: "Tengo una reservación.", translation: { fr: "J'ai une réservation.", en: "I have a reservation.", es: "Indicas que tienes una reservación." } },
      { id: "bill", target: "La cuenta, por favor.", translation: { fr: "L'addition, s'il vous plaît.", en: "The bill, please.", es: "Pides la cuenta." } },
    ],
    correctOptionId: "reservation",
    explanation: { fr: "Tengo sert ici à annoncer une réservation.", en: "Tengo introduces your reservation here.", es: "Tengo permite mencionar tu reservación." },
  },
  {
    id: "repeat",
    type: { fr: "Situation", en: "Situation", es: "Situación" },
    prompt: { fr: "Demande de répéter.", en: "Ask for repetition.", es: "Pide que repitan." },
    options: [
      { id: "repeat", target: "¿Me puede repetir, por favor?", translation: { fr: "Pouvez-vous répéter, s'il vous plaît?", en: "Could you repeat that, please?", es: "Pides una repetición con cortesía." } },
      { id: "bye", target: "Hasta mañana.", translation: { fr: "À demain.", en: "See you tomorrow.", es: "Te despides hasta mañana." } },
    ],
    correctOptionId: "repeat",
    explanation: { fr: "Puede rend la demande polie.", en: "Puede makes the request polite.", es: "Puede hace que la petición sea cortés." },
  },
] satisfies Dom5QuizQuestion[];

const labels = {
  fr: { check: "Vérifier", next: "Question suivante", restart: "Recommencer", score: "Score" },
  en: { check: "Check", next: "Next question", restart: "Restart", score: "Score" },
  es: { check: "Verificar", next: "Pregunta siguiente", restart: "Reiniciar", score: "Puntuación" },
} as const;
const heading = { fr: "Quiz de pratique", en: "Practice quiz", es: "Quiz de práctica" };
function mount(locale: YoLocale) {
  return render(React.createElement(DominicanRepublicModule5Quiz, {
    questions, locale, title: heading, subtitle: heading, eyebrow: heading,
  }));
}
async function click(element: HTMLElement) {
  await act(async () => { fireEvent.click(element); });
}
type View = ReturnType<typeof mount>;
function scoreIs(view: View, locale: YoLocale, value: number) {
  assert.ok(view.getByText(`${labels[locale].score} ${value}/${questions.length}`));
}
function choice(view: View, target: string) {
  return view.getByRole("button", { name: target }) as HTMLButtonElement;
}
function check(view: View, locale: YoLocale) {
  return view.getByRole("button", { name: labels[locale].check }) as HTMLButtonElement;
}

const cases: Array<[string, () => Promise<void>]> = [];
for (const locale of ["fr", "en", "es"] as const) {
  cases.push([`${locale}: changing draft choices keeps score and feedback concealed`, async () => {
    const view = mount(locale);
    scoreIs(view, locale, 0);
    assert.equal(check(view, locale).disabled, true);
    const correct = choice(view, questions[0].options[0].target);
    const wrong = choice(view, questions[0].options[1].target);
    await click(correct);
    scoreIs(view, locale, 0);
    assert.equal(correct.getAttribute("aria-pressed"), "true");
    assert.equal(wrong.getAttribute("aria-pressed"), "false");
    await click(wrong);
    scoreIs(view, locale, 0);
    assert.equal(correct.getAttribute("aria-pressed"), "false");
    assert.equal(wrong.getAttribute("aria-pressed"), "true");
    assert.equal(check(view, locale).disabled, false);
    for (const option of questions[0].options) {
      assert.equal(view.queryByText(option.translation[locale]), null);
    }
    assert.equal(view.container.querySelector("[data-yo-module5-quiz-feedback]"), null);
  }]);

  cases.push([`${locale}: a checked wrong answer stays unscored and next question starts unselected`, async () => {
    const view = mount(locale);
    await click(choice(view, questions[0].options[1].target));
    await click(check(view, locale));
    scoreIs(view, locale, 0);
    assert.ok(view.getByText(questions[0].explanation[locale]));
    const choices = view.container.querySelectorAll("[data-yo-module5-quiz-choice-label]");
    for (const label of choices) assert.equal((label.closest("button") as HTMLButtonElement).disabled, true);
    await click(choices[0].closest("button") as HTMLButtonElement);
    scoreIs(view, locale, 0);
    await click(view.getByRole("button", { name: labels[locale].next }));
    assert.ok(view.getByText(questions[1].prompt[locale]));
    assert.equal(check(view, locale).disabled, true);
    for (const option of questions[1].options) {
      assert.equal(choice(view, option.target).getAttribute("aria-pressed"), "false");
    }
    await click(choice(view, questions[1].options[0].target));
    scoreIs(view, locale, 0);
    await click(check(view, locale));
    scoreIs(view, locale, 1);
  }]);

  cases.push([`${locale}: only checked correct answers count and restart clears the attempt`, async () => {
    const view = mount(locale);
    await click(choice(view, questions[0].options[0].target));
    await click(check(view, locale));
    scoreIs(view, locale, 1);
    await click(view.getByRole("button", { name: labels[locale].next }));
    await click(choice(view, questions[1].options[0].target));
    scoreIs(view, locale, 1);
    await click(choice(view, questions[1].options[1].target));
    scoreIs(view, locale, 1);
    await click(choice(view, questions[1].options[0].target));
    await click(check(view, locale));
    scoreIs(view, locale, 2);
    await click(view.getByRole("button", { name: labels[locale].restart }));
    scoreIs(view, locale, 0);
    assert.ok(view.getByText(questions[0].prompt[locale]));
    assert.equal(check(view, locale).disabled, true);
    assert.equal(view.container.querySelector("[data-yo-module5-quiz-feedback]"), null);
    for (const option of questions[0].options) {
      assert.equal(choice(view, option.target).getAttribute("aria-pressed"), "false");
      assert.equal(view.queryByText(option.translation[locale]), null);
    }
  }]);
}

async function main() {
  let failures = 0;
  try {
    for (const [name, fn] of cases) {
      try { await fn(); console.log(`ok - ${name}`); }
      catch (error) { failures += 1; console.error(`not ok - ${name}`); console.error(error); }
      finally { cleanup(); }
    }
  } finally {
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
  assert.equal(failures, 0, `${failures}/${cases.length} Module 5 quiz interactions failed`);
  console.log(`\nAll ${cases.length} Module 5 quiz interaction tests passed.`);
}
void main();
