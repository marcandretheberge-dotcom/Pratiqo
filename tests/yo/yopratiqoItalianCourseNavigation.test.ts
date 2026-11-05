/** User-facing navigation regressions: drafts, deep links and Yoppo focus/help. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { ItalianCourseUnit } from "@/components/yo/italian/course/ItalianCourseUnit";
import { CourseAssessmentPlayer } from "@/components/yo/italian/course/CourseAssessmentPlayer";
import { italianCourseUnits, italianCourseCatalog, courseSources, courseAssessments } from "@/lib/yo/italian/course/courseData";
import { ITALIAN_COURSE_PROGRESS_KEY, emptyCourseProgress, recordCourseActivity, resetCourseProgress, type CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import type { CourseQuestion } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/yo/langues/italien/parcours/u01",
  pretendToBeVisual: true,
});
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
const requestFrame = (callback: FrameRequestCallback) => {
  const id = ++nextFrame;
  frames.set(id, callback);
  return id;
};
const cancelFrame = (id: number) => { frames.delete(id); };
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
Object.defineProperty(dom.window, "requestAnimationFrame", { configurable: true, value: requestFrame });
Object.defineProperty(dom.window, "cancelAnimationFrame", { configurable: true, value: cancelFrame });
const bindings = {
  window: dom.window, self: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent, MutationObserver: dom.window.MutationObserver,
  requestAnimationFrame: requestFrame, cancelAnimationFrame: cancelFrame,
  IS_REACT_ACT_ENVIRONMENT: true,
};
for (const [key, value] of Object.entries(bindings)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
const { render, cleanup, fireEvent, within, act } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
const unit = italianCourseUnits[0];
const lesson = unit.lessons[0];
const unitProps = { unit, locale: "fr" as const, catalog: italianCourseCatalog, sources: courseSources, audioPaths: {} };
const unitNode = (extra: Partial<React.ComponentProps<typeof ItalianCourseUnit>> = {}) => React.createElement(ItalianCourseUnit, { ...unitProps, ...extra });
const saved = () => JSON.parse(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY) ?? "{}") as CourseProgress;

function flushFrames() {
  // Effects can schedule a frame after a state change. Drain those too, with a guard.
  for (let pass = 0; frames.size && pass < 10; pass++) {
    const pending = [...frames];
    act(() => {
      for (const [id, callback] of pending) {
        if (!frames.delete(id)) continue;
        callback(0);
      }
    });
  }
  assert.equal(frames.size, 0, "animation frames should settle");
}
function click(node: HTMLElement) { fireEvent.click(node); flushFrames(); }
function assertDraftNeverStored(draft: string) {
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index)!;
    assert.equal(window.localStorage.getItem(key)?.includes(draft), false, `draft leaked into ${key}`);
  }
}

test("removing an activity deep link in the same lesson returns to study without recording a success", () => {
  const activity = lesson.activities[0];
  const view = render(unitNode({ initialLessonId: lesson.id, initialActivityId: activity.id }));
  assert.equal(view.getByRole("button", { name: "Jouer et pratiquer" }).getAttribute("aria-pressed"), "true");
  assert.equal(saved().resume?.activityId, activity.id);

  view.rerender(unitNode({ initialLessonId: lesson.id }));
  flushFrames();
  assert.equal(view.getByRole("button", { name: "Découvrir" }).getAttribute("aria-pressed"), "true");
  assert.equal(view.getByRole("button", { name: "Jouer et pratiquer" }).getAttribute("aria-pressed"), "false");
  assert.ok(view.getByText(lesson.goal.fr));
  click(view.getByRole("button", { name: "4. La langue" }));
  assert.ok(view.getByText(lesson.grammar.body.fr));
  assert.equal(view.queryByRole("group", { name: "Expressions italiennes" }), null);
  assert.equal(saved().resume?.lessonId, lesson.id);
  assert.equal(saved().resume?.activityId, undefined);
  assert.deepEqual(saved().activities, {});
});

test("a project draft survives project to checkpoint to project navigation and stays out of localStorage", () => {
  const draft = "Mi chiamo Ada. Questa è la mia bozza privata.";
  const view = render(unitNode());
  click(view.getByRole("button", { name: "Mon atelier" }));
  fireEvent.change(view.getByRole("textbox", { name: "Ton brouillon en italien" }), { target: { value: draft } });
  assertDraftNeverStored(draft);
  click(view.getByRole("button", { name: "Bilan de l’unité" }));
  assert.ok(view.getByRole("button", { name: "Commencer le bilan" }));
  assert.equal(view.queryByRole("textbox", { name: "Ton brouillon en italien" }), null);
  assertDraftNeverStored(draft);
  // The checkpoint also has a forward link to the workshop; the sidebar is first.
  click(view.getAllByRole("button", { name: "Mon atelier" })[0]);
  assert.equal((view.getByRole("textbox", { name: "Ton brouillon en italien" }) as HTMLTextAreaElement).value, draft);
  assertDraftNeverStored(draft);
  assert.deepEqual(saved().activities, {});
  assert.deepEqual(saved().assessments, {});
});

test("Yoppo reviews the actual due exercise in another lesson without scoring a visit", () => {
  const dueLesson = unit.lessons[1];
  const due = dueLesson.activities[0];
  const progress = recordCourseActivity(emptyCourseProgress(), italianCourseCatalog, due.id, false, false, Date.now() - 1000);
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, JSON.stringify(progress));
  const view = render(unitNode());
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  click(view.getByRole("button", { name: "Mes révisions (1)" }));
  assert.equal(saved().resume?.lessonId, dueLesson.id);
  assert.equal(saved().resume?.activityId, due.id);
  assert.equal(view.getByRole("button", { name: "Jouer et pratiquer" }).getAttribute("aria-pressed"), "true");
  assert.deepEqual(saved().activities, progress.activities);
});

test("unseen lessons are not presented as overdue review", () => {
  const view = render(unitNode());
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  assert.equal(view.queryByRole("button", { name: /^Mes révisions/ }), null);
});

test("an explicit cross-tab course reset clears the in-memory project draft", () => {
  const draft = "La mia bozza da cancellare con il reset.";
  const view = render(unitNode());
  click(view.getByRole("button", { name: "Mon atelier" }));
  fireEvent.change(view.getByRole("textbox", { name: "Ton brouillon en italien" }), { target: { value: draft } });
  const value = JSON.stringify(resetCourseProgress(saved()));
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, value);
  act(() => window.dispatchEvent(new dom.window.StorageEvent("storage", {
    key: ITALIAN_COURSE_PROGRESS_KEY, newValue: value,
  })));
  flushFrames();
  assert.equal((view.getByRole("textbox", { name: "Ton brouillon en italien" }) as HTMLTextAreaElement).value, "");
  assertDraftNeverStored(draft);
  assert.deepEqual(saved().productions, {});
});

test("opening Yoppo’s bonus leaves keyboard focus on its title after animation frames", () => {
  const view = render(unitNode());
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  fireEvent.click(view.getByRole("button", { name: /^Défie-moi !/ }));
  flushFrames();
  const title = view.getByRole("heading", { name: "Le défi surprise de Yoppo" });
  assert.equal(document.activeElement, title, "the minimized avatar must not retain focus over the new activity");
  assert.equal(title.getAttribute("tabindex"), "-1");
  assert.equal(view.queryByRole("region", { name: "On joue ensemble ?" }), null);
  assert.deepEqual(saved().activities, {});
});

const labels = {
  fr: { begin: "Commencer le bilan", open: "Ouvrir Yoppo", review: "Mes révisions", group: "Choisis une réponse", input: "Ta réponse en italien", check: "Vérifier", next: "Question suivante", finish: "Voir mon résultat", unit: "Unité", first: "Première réponse enregistrée", independent: "sans aide", assisted: "avec aide" },
  en: { begin: "Start the checkpoint", open: "Open Yoppo", review: "My review", group: "Choose an answer", input: "Your answer in Italian", check: "Check", next: "Next question", finish: "See my result", unit: "Unit", first: "First answer recorded", independent: "without help", assisted: "with help" },
  es: { begin: "Empezar el balance", open: "Abrir a Yoppo", review: "Mis repasos", group: "Elige una respuesta", input: "Tu respuesta en italiano", check: "Comprobar", next: "Pregunta siguiente", finish: "Ver mi resultado", unit: "Unidad", first: "Primera respuesta guardada", independent: "sin ayuda", assisted: "con ayuda" },
};
function answer(view: View, question: CourseQuestion, locale: YoLocale) {
  const copy = labels[locale];
  if (question.kind === "type") {
    fireEvent.change(view.getByRole("textbox", { name: copy.input }), { target: { value: question.model } });
  } else {
    assert.notEqual(question.kind, "listen", "navigation tests must not depend on audio availability");
    const option = question.options.find(item => item.id === question.correctId)!;
    click(within(view.getByRole("group", { name: copy.group })).getByRole("button", { name: option.it ?? option.label![locale] }));
  }
  click(view.getByRole("button", { name: copy.check }));
}

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: checkpoint review is reachable, links retain the language and the next answer is assisted`, () => {
    const source = courseAssessments[0];
    const assessment = { ...source, questions: source.questions.filter(question => question.kind !== "listen").slice(0, 2) };
    assert.equal(assessment.questions.length, 2);
    const events: Array<[string, number, number, boolean]> = [];
    const view = render(React.createElement(CourseAssessmentPlayer, {
      assessment, locale,
      onComplete: (...args: [string, number, number, boolean]) => events.push(args),
    }));
    const copy = labels[locale];
    click(view.getByRole("button", { name: copy.begin }));
    answer(view, assessment.questions[0], locale);
    assert.ok(view.getByText(`${copy.first} · ${copy.independent}`));
    click(view.getByRole("button", { name: copy.next }));

    click(view.getByRole("button", { name: copy.open }));
    const reviewButton = view.getByRole("button", { name: new RegExp(`^${copy.review} \\(`) });
    assert.equal((reviewButton as HTMLButtonElement).disabled, false);
    click(reviewButton);
    const panel = view.getByRole("heading", { name: copy.review }).closest("section")!;
    assert.ok(panel);
    assert.equal(within(panel).getAllByRole("link").length, assessment.unitIds.length);
    for (const id of assessment.unitIds) {
      assert.ok(italianCourseCatalog.units.some(item => item.id === id));
      const link = within(panel).getByRole("link", { name: `${copy.unit} ${Number(id.slice(1))}` });
      assert.equal(link.getAttribute("href"), `/yo/langues/italien/parcours/${id}${locale === "fr" ? "" : `?lang=${locale}`}`);
    }
    assert.equal(events.length, 0);
    answer(view, assessment.questions[1], locale);
    assert.ok(view.getByText(`${copy.first} · ${copy.assisted}`));
    click(view.getByRole("button", { name: copy.finish }));
    assert.deepEqual(events, [[assessment.id, 2, 2, true]], "consulting review must affect the recorded attempt");
  });
}

let failed = 0;
for (const [name, run] of cases) {
  cleanup();
  window.localStorage.clear();
  frames.clear();
  try { run(); console.log(`✓ ${name}`); }
  catch (error) { failed++; console.error(`✗ ${name}`, error); }
}
cleanup();
dom.window.close();
console.log(`${cases.length - failed}/${cases.length} Italian course navigation tests passed`);
if (failed) process.exitCode = 1;
