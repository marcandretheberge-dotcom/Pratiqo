/** Course-level regressions using the real player, home, content and local progress hook. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";

import { JapaneseCoursePlayer } from "@/components/yo/japanese/JapaneseCoursePlayer";
import { JapaneseCourseHome, type JapaneseUnitOutline } from "@/components/yo/japanese/JapaneseCourseHome";
import { japaneseCourseUnits, japaneseCourseSources, japaneseFinalAssessment } from "@/lib/yo/japaneseCourse";
import { japaneseJourneyUnits, japaneseFinalIds } from "@/lib/yo/foundationJourneyCatalogs";
import {
  emptyJapaneseProgress, JAPANESE_COURSE_PATH, JAPANESE_PROGRESS_KEY,
  japaneseUnitPracticeIds, parseJapaneseProgress, recordJapaneseResult,
  type JapaneseCourseProgress,
} from "@/lib/yo/japaneseCourseProgress";
import type { JapaneseChoice, JapaneseChoiceActivity, JapaneseCourseUnit } from "@/lib/yo/japaneseCourseTypes";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://pratiqo.example/yo/langues/japonais/parcours", pretendToBeVisual: true,
});
const bindings = {
  window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element,
  Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, within, act } = require("@testing-library/react") as typeof import("@testing-library/react");

const unit = japaneseCourseUnits[0];
const firstChoice = unit.activities.find((activity): activity is JapaneseChoiceActivity => activity.kind === "choice")!;
assert.ok(firstChoice, "The first real course unit must have a choice activity for these interaction checks.");
const lastUnit = japaneseCourseUnits[japaneseCourseUnits.length - 1];
// The final route passes a distinct unit with the eight synthesis activities and no module roleplay.
const finalUnit: JapaneseCourseUnit = {
  ...lastUnit, id: "jp-foundation-final", slug: "bilan", number: 9,
  title: { fr: "Une journée au Japon", en: "A day in Japan", es: "Un día en Japón" },
  activities: japaneseFinalAssessment,
  roleplay: { ...lastUnit.roleplay, turns: [] }, kana: [], kanji: [],
};
const outlines: JapaneseUnitOutline[] = japaneseCourseUnits.map((item) => ({ ...item, practiceIds: japaneseUnitPracticeIds(item) }));
const completionLabel = "Record this completion";
const completionAction = React.createElement("button", { type: "button" }, completionLabel);
const courseNode = (chosenUnit = unit, locale: YoLocale = "en", final = false) => React.createElement(JapaneseCoursePlayer, {
  unit: chosenUnit, locale, final, sources: japaneseCourseSources, completionAction, journeyUnits: japaneseJourneyUnits, finalIds: japaneseFinalIds,
});
const homeNode = (locale: YoLocale = "en") => React.createElement(JapaneseCourseHome, {
  locale, units: outlines, finalIds: japaneseFinalAssessment.map((activity) => activity.id), sources: japaneseCourseSources,
});
type View = ReturnType<typeof render>;
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);

function seed(progress: JapaneseCourseProgress) { window.localStorage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify(progress)); }
function saved() { return parseJapaneseProgress(window.localStorage.getItem(JAPANESE_PROGRESS_KEY)); }
function passed(ids: string[]) { return ids.reduce((progress, id) => recordJapaneseResult(progress, id, true, false), emptyJapaneseProgress()); }
function resume(progress: JapaneseCourseProgress, chosenUnit: JapaneseCourseUnit, step: string) {
  return { ...progress, lastUnit: chosenUnit.slug, lastSteps: { ...progress.lastSteps, [chosenUnit.slug]: step } };
}
function stage(view: View, title: string) {
  const select = view.getByRole("combobox", { name: "Step" }) as HTMLSelectElement;
  const option = [...select.options].find((item) => item.textContent === `${Number(item.value) + 1}. ${title}`);
  assert.ok(option, `The stage selector exposes “${title}”.`);
  fireEvent.change(select, { target: { value: option.value } });
  assert.equal(view.getByRole("heading", { level: 1 }).textContent, title);
}
function choose(view: View, item: JapaneseChoice, locale: YoLocale = "en") {
  const label = item.ja ?? item.label?.[locale];
  assert.ok(label);
  fireEvent.click(view.getByRole("button", { name: label }));
}
function completeChoice(view: View, activity: JapaneseChoiceActivity) {
  choose(view, activity.choices.find((item) => item.id === activity.answerId)!);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
}
function href(pathname: string, locale: YoLocale) { return pathname + (locale === "fr" ? "" : `?lang=${locale}`); }
function activateLinkAndUnmount(view: View, link: HTMLElement) {
  // Let the real React/Next click handler run; prevent jsdom's unsupported page navigation.
  link.addEventListener("click", (event) => event.preventDefault(), { once: true });
  act(() => {
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    view.unmount();
  });
}

test("the player restores its stored stage under StrictMode and saves later navigation for reopening", () => {
  const otherId = japaneseCourseUnits[1].activities[0].id;
  seed(resume(passed([otherId]), unit, firstChoice.id));
  const view = render(React.createElement(React.StrictMode, null, courseNode()));
  assert.equal(view.getByRole("heading", { level: 1 }).textContent, firstChoice.title.en);
  assert.equal(saved().lastSteps[unit.slug], firstChoice.id);
  assert.equal(saved().results[otherId]?.passed, true);
  stage(view, "Writing studio");
  assert.equal(saved().lastSteps[unit.slug], "writing");
  view.unmount();
  const reopened = render(courseNode());
  assert.equal(reopened.getByRole("heading", { level: 1 }).textContent, "Writing studio");
  assert.equal(saved().lastUnit, unit.slug);
  assert.equal(saved().results[otherId]?.passed, true);
});

test("an obsolete saved stage safely opens the mission and leaves navigation usable", () => {
  seed(resume(emptyJapaneseProgress(), unit, "retired-stage"));
  const view = render(courseNode());
  assert.equal(view.getByRole("heading", { level: 1 }).textContent, "Your mission");
  stage(view, firstChoice.title.en);
  assert.equal(saved().lastSteps[unit.slug], firstChoice.id);
});

test("a checked answer remains checked on revisit without scoring the same attempt again", () => {
  const view = render(courseNode());
  stage(view, firstChoice.title.en);
  completeChoice(view, firstChoice);
  assert.ok(view.getByRole("heading", { name: "Well done." }));
  const assessed = saved().results[firstChoice.id];
  assert.deepEqual(assessed, { passed: true, independent: true, needsReview: false, attempts: 1 });
  stage(view, "Enter the scene");
  stage(view, firstChoice.title.en);
  const correct = firstChoice.choices.find((item) => item.id === firstChoice.answerId)!;
  const answer = view.getByRole("button", { name: correct.ja ?? correct.label!.en }) as HTMLButtonElement;
  assert.equal(answer.disabled, true);
  assert.equal(answer.getAttribute("aria-pressed"), "true");
  assert.ok(view.getByRole("heading", { name: "Well done." }));
  assert.equal(view.queryByRole("button", { name: "Check" }), null);
  assert.deepEqual(saved().results[firstChoice.id], assessed);
});

test("writing drafts and self-checks survive stage navigation without entering persisted progress", () => {
  const view = render(courseNode());
  stage(view, "Writing studio");
  const draft = "アレックスです。これは、このセッションだけの練習です。";
  fireEvent.change(view.getByRole("textbox"), { target: { value: draft } });
  fireEvent.click(view.getByRole("checkbox", { name: unit.writing.checklist[0].en }));
  fireEvent.click(view.getByRole("button", { name: "See a model" }));
  stage(view, firstChoice.title.en);
  assert.equal(view.queryByRole("textbox"), null);
  assert.equal(view.queryByRole("checkbox", { name: unit.writing.checklist[0].en }), null);
  stage(view, "Writing studio");
  assert.equal((view.getByRole("textbox") as HTMLTextAreaElement).value, draft);
  assert.equal((view.getByRole("checkbox", { name: unit.writing.checklist[0].en }) as HTMLInputElement).checked, true);
  assert.equal(view.getByRole("button", { name: "Hide the model" }).getAttribute("aria-expanded"), "true");
  assert.equal(window.localStorage.getItem(JAPANESE_PROGRESS_KEY)!.includes(draft), false);
  assert.deepEqual(saved().results, {});
});

test("module completion requires every exercise and roleplay ID; confidence checkboxes cannot unlock it", () => {
  const pendingTurn = unit.roleplay.turns[unit.roleplay.turns.length - 1];
  assert.ok(pendingTurn);
  const ids = japaneseUnitPracticeIds(unit);
  seed(resume(passed(ids.filter((id) => id !== pendingTurn.id)), unit, "summary"));
  const view = render(courseNode());
  assert.equal(view.queryByRole("button", { name: completionLabel }), null);
  for (const canDo of unit.canDos) fireEvent.click(view.getByRole("checkbox", { name: canDo.en }));
  assert.equal(view.queryByRole("button", { name: completionLabel }), null);
  assert.equal(saved().results[pendingTurn.id], undefined);
  const remaining = view.getByRole("heading", { name: "Remaining exercises" }).parentElement!;
  fireEvent.click(within(remaining).getByRole("button", { name: "Guided roleplay" }));
  choose(view, pendingTurn.choices.find((item) => item.id === pendingTurn.answerId)!);
  assert.equal(saved().results[pendingTurn.id], undefined);
  fireEvent.click(view.getByRole("button", { name: "Check" }));
  stage(view, "Module review");
  assert.ok(view.getByRole("button", { name: completionLabel }));
  assert.ok(ids.every((id) => saved().results[id]?.passed));
  for (const canDo of unit.canDos) assert.equal((view.getByRole("checkbox", { name: canDo.en }) as HTMLInputElement).checked, true);
});

test("Yoppo help after Check preserves the assessed result and assistance applies to a subsequent retry", () => {
  const view = render(courseNode());
  stage(view, firstChoice.title.en);
  completeChoice(view, firstChoice);
  const assessed = saved().results[firstChoice.id];
  fireEvent.click(view.getByRole("button", { name: "Open Yoppo’s help" }));
  const coach = () => within(view.getByRole("region", { name: "Need a hand?" }));
  fireEvent.click(coach().getByRole("button", { name: "Explain it" }));
  assert.ok(view.getByText("Correct in this exercise"));
  assert.equal(view.queryByText("Completed with help"), null);
  assert.deepEqual(saved().results[firstChoice.id], assessed);
  fireEvent.click(coach().getByRole("button", { name: "Try again" }));
  assert.equal(document.activeElement, view.getByRole("heading", { level: 1 }));
  assert.equal(view.queryByRole("heading", { name: "Well done." }), null);
  fireEvent.click(coach().getByRole("button", { name: "A hint" }));
  completeChoice(view, firstChoice);
  assert.ok(view.getByText("Completed with help"));
  assert.deepEqual(saved().results[firstChoice.id], { passed: true, independent: true, needsReview: true, attempts: 2 });
});

test("Yoppo follows writing and kanji stages with the current model and relevant control guidance", () => {
  const view = render(courseNode());
  stage(view, "Writing studio");
  fireEvent.click(view.getByRole("button", { name: "Open Yoppo’s help" }));
  const coach = () => within(view.getByRole("region", { name: "Need a hand?" }));
  assert.ok(coach().getByText(unit.writing.prompt.en));
  fireEvent.click(coach().getByRole("button", { name: "An example" }));
  assert.ok(coach().getByText(unit.writing.model.ja));
  stage(view, "Kanji studio");
  assert.equal(coach().queryByText(unit.writing.prompt.en), null);
  assert.equal(coach().queryByText(unit.writing.model.ja), null);
  assert.equal(coach().queryByRole("button", { name: "An example" }), null);
  fireEvent.click(coach().getByRole("button", { name: "Explain it" }));
  assert.ok(coach().getByText(/KanjiVG strokes/));
  assert.ok(coach().getByText(/keyboard practice/));
  assert.equal(coach().queryByText(unit.grammar[0].explanation.en), null);
});

test("passing all eight modules does not complete the separate final assessment", () => {
  seed(resume(passed(japaneseCourseUnits.flatMap(japaneseUnitPracticeIds)), finalUnit, "summary"));
  const view = render(courseNode(finalUnit, "en", true));
  assert.equal(view.queryByRole("button", { name: completionLabel }), null);
  assert.equal(view.queryByRole("group", { name: "My self-assessment" }), null);
  const select = view.getByRole("combobox", { name: "Step" }) as HTMLSelectElement;
  assert.equal(select.options.length, japaneseFinalAssessment.length + 2);
  for (const activity of japaneseFinalAssessment) {
    assert.ok([...select.options].some((option) => option.textContent?.endsWith(`. ${activity.title.en}`)));
    assert.equal(saved().results[activity.id], undefined);
  }
});

test("the final completion action depends only on the final assessment’s own passed IDs", () => {
  seed(resume(passed(japaneseFinalAssessment.map((activity) => activity.id)), finalUnit, "summary"));
  const view = render(courseNode(finalUnit, "en", true));
  assert.ok(view.getByRole("button", { name: completionLabel }));
  assert.equal(view.queryByRole("button", { name: "Revisit review items" }), null);
  assert.ok(japaneseCourseUnits.flatMap(japaneseUnitPracticeIds).every((id) => saved().results[id] === undefined));
  for (const link of view.getAllByRole("link", { name: "Course map" })) assert.equal(link.getAttribute("href"), href(JAPANESE_COURSE_PATH, "en"));
});

const homeLabels = {
  fr: { resume: "Reprendre ma séance", enter: "Entrer dans le module", final: "Ouvrir le bilan final", intro: "Découvrir d’abord les bases du japonais", resources: "Ressources", notebook: "Carnet de cours imprimable", back: "Retour aux langues" },
  en: { resume: "Resume my session", enter: "Enter the module", final: "Open final review", intro: "Explore the Japanese introduction first", resources: "Resources", notebook: "Printable course notebook", back: "Back to languages" },
  es: { resume: "Retomar mi sesión", enter: "Entrar en el módulo", final: "Abrir balance final", intro: "Explorar primero la introducción al japonés", resources: "Recursos", notebook: "Cuaderno de curso imprimible", back: "Volver a los idiomas" },
};
for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: course home links preserve the explanation language and stored resume module`, () => {
    seed(resume(emptyJapaneseProgress(), japaneseCourseUnits[2], "writing"));
    const view = render(homeNode(locale));
    const copy = homeLabels[locale];
    assert.equal(view.getByRole("link", { name: copy.resume }).getAttribute("href"), href(`${JAPANESE_COURSE_PATH}/${japaneseCourseUnits[2].slug}`, locale));
    assert.equal(view.getByRole("link", { name: copy.back }).getAttribute("href"), href("/yo/langues", locale));
    assert.equal(view.queryByRole("link", { name: copy.final }), null, "A resumed module is not evidence that all modules passed.");
    assert.equal(view.getByRole("link", { name: copy.intro }).getAttribute("href"), href("/yo/langues/japonais/intro", locale));
    const unlockedLinks = view.container.querySelectorAll('[data-journey-unit][data-unlocked="true"] a');
    assert.equal(unlockedLinks.length, 2, "First and legacy-started modules remain available.");
    for (const link of unlockedLinks) {
      const url = new URL(link.getAttribute("href")!, window.location.origin);
      assert.equal(url.searchParams.get("lang"), locale === "fr" ? null : locale);
      assert.match(url.pathname, /\/parcours\/module-[1-8]$/);
    }
    fireEvent.click(view.getByRole("button", { name: copy.resources }));
    assert.equal(view.getByRole("link", { name: copy.notebook }).getAttribute("href"), href(`${JAPANESE_COURSE_PATH}/carnet`, locale));
  });
}

test("a home review link saves its exact exercise before navigation and the real player resumes there", () => {
  const targetUnit = japaneseCourseUnits[2];
  const target = targetUnit.activities[1];
  seed(resume(recordJapaneseResult(emptyJapaneseProgress(), target.id, false, false), targetUnit, "writing"));
  const home = render(homeNode());
  fireEvent.click(home.getByRole("button", { name: "Review · 1" }));
  const link = home.getByRole("link", { name: "Revisit" });
  assert.equal(link.getAttribute("href"), href(`${JAPANESE_COURSE_PATH}/${targetUnit.slug}`, "en"));
  activateLinkAndUnmount(home, link);
  assert.equal(saved().lastSteps[targetUnit.slug], target.id);
  const player = render(courseNode(targetUnit));
  assert.equal(player.getByRole("heading", { level: 1 }).textContent, target.title.en);
  assert.equal(saved().results[target.id]?.attempts, 1);
});

test("a final-review link targets the final exercise rather than a module’s remembered step", () => {
  const target = japaneseFinalAssessment[4];
  seed(resume(recordJapaneseResult(emptyJapaneseProgress(), target.id, false, false), unit, "writing"));
  const home = render(homeNode("es"));
  fireEvent.click(home.getByRole("button", { name: "Repaso · 1" }));
  const link = home.getByRole("link", { name: "Misión de síntesis · 1 ejercicio(s) para repasar" });
  assert.equal(link.getAttribute("href"), href(`${JAPANESE_COURSE_PATH}/bilan`, "es"));
  activateLinkAndUnmount(home, link);
  assert.equal(saved().lastUnit, "bilan");
  assert.equal(saved().lastSteps.bilan, target.id);
  const player = render(courseNode(finalUnit, "es", true));
  assert.equal(player.getByRole("heading", { level: 1 }).textContent, target.title.es);
});

let failed = 0;
try {
  for (const [name, run] of cases) {
    window.localStorage.clear();
    try { run(); console.log(`ok - ${name}`); }
    catch (error) { failed += 1; console.error(`not ok - ${name}`, error); }
    finally { cleanup(); }
  }
} finally {
  dom.window.close();
  for (const [key, original] of originals) {
    if (original) Object.defineProperty(globalThis, key, original);
    else Reflect.deleteProperty(globalThis, key);
  }
}
console.log(`\nJapanese course player: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
