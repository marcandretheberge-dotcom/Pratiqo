import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { GermanAssessment } from "@/components/yo/german/GermanAssessment";
import { CourseExperience } from "@/components/yo/german/CourseExperience";
import { ItalianAudioProvider } from "@/components/yo/italian/ItalianAudioProvider";
import { spanishCourseUnits, spanishFinal } from "@/lib/yo/spanish/courseData";
import { germanCourseUnits } from "@/lib/yo/german/courseData";
import { SPANISH_PROGRESS_KEY } from "@/lib/yo/spanish/courseLogic";
import { ITALIAN_COURSE_PROGRESS_KEY } from "@/lib/yo/italian/course/courseProgress";
import { introKey } from "@/lib/yo/shared/state";
import { ASSESSMENT_DRAFT_MAX_LENGTH, assessmentDraftContext, assessmentDraftToken, assessmentDraftScore, assessmentDraftAssisted, createAssessmentDraftStore, emptyAssessmentDraft, parseAssessmentDraft } from "@/lib/yo/foundations/assessmentDraft";
import type { CourseAssessment, CourseQuestion } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/yo/langues/espagnol/parcours/u01", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
for (const [key, value] of Object.entries({
  window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Element: dom.window.Element,
  Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, MutationObserver: dom.window.MutationObserver,
  localStorage: dom.window.localStorage, requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++nextFrame, fn); return nextFrame; },
  cancelAnimationFrame: (id: number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
const { render, cleanup, fireEvent, within, act } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
type Result = Parameters<React.ComponentProps<typeof GermanAssessment>["onComplete"]>;
type Language = React.ComponentProps<typeof CourseExperience>["language"];
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
const assessment: CourseAssessment = { ...spanishCourseUnits[0].quiz, id: "esf-durable-check", questions: spanishCourseUnits[0].quiz.questions.slice(0, 2) };
const context = assessmentDraftContext(SPANISH_PROGRESS_KEY, assessment);
function flush() {
  const pending = [...frames.values()]; frames.clear();
  act(() => pending.forEach((fn) => fn(0)));
}
function click(node: HTMLElement) { fireEvent.click(node); flush(); }
function mount(events: Result[], value = assessment, language: Language = "es", locale: YoLocale = "en", resetAt = 0) {
  return render(<CourseExperience language={language}><ItalianAudioProvider language={language} paths={{}}><GermanAssessment assessment={value} locale={locale} resetAt={resetAt} onComplete={(...args) => events.push(args)} /></ItalianAudioProvider></CourseExperience>);
}
function answer(view: View, question: CourseQuestion, correct = true) {
  if (question.kind === "type") fireEvent.change(view.getByRole("textbox"), { target: { value: correct ? question.model : "unrelated-private-answer" } });
  else {
    const option = question.options.find((item) => (item.id === question.correctId) === correct)!;
    click(within(view.getByRole("group", { name: "Choose an answer" })).getByRole("button", { name: option.it ?? option.label!.en }));
  }
  click(view.getByRole("button", { name: "Check" }));
}
function state(view: View) { return view.container.querySelector<HTMLElement>("[data-course-assessment]")!; }
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test("bounded parsing restores matching runs and excludes unrecognized answer fields and forged completion", () => {
  const storage = memory(), now = 1800000000000;
  const store = createAssessmentDraftStore(context, () => storage, () => now);
  store.start();
  const token = assessmentDraftToken(store.getSnapshot().draft);
  store.help(token); store.attempt(token, false);
  const raw = storage.getItem(context.key)!;
  const restored = parseAssessmentDraft(raw, context, now + 10);
  assert.equal(restored.index, 0);
  assert.deepEqual(restored.results, [{ correct: false, assisted: true }]);
  assert.equal(restored.done, false);
  const withPrivateFields = { ...JSON.parse(raw), typedAnswer: "secret", selectedOption: "wrong", results: [{ correct: false, assisted: true, text: "secret" }] };
  assert.equal(JSON.stringify(parseAssessmentDraft(JSON.stringify(withPrivateFields), context, now + 10)).includes("secret"), false);
  for (const change of [{ done: true }, { index: 1, results: [] }, { results: [{ correct: "yes", assisted: false }] }, { updatedAt: now + 60001 }, { run: -1 }, { version: 2 }, { courseKey: "another-course" }]) {
    assert.deepEqual(parseAssessmentDraft(JSON.stringify({ ...JSON.parse(raw), ...change }), context, now), emptyAssessmentDraft(context));
  }
  assert.deepEqual(parseAssessmentDraft("x".repeat(ASSESSMENT_DRAFT_MAX_LENGTH + 1), context, now), emptyAssessmentDraft(context));
  assert.deepEqual(parseAssessmentDraft(raw, assessmentDraftContext(SPANISH_PROGRESS_KEY, assessment, 10), now), emptyAssessmentDraft(assessmentDraftContext(SPANISH_PROGRESS_KEY, assessment, 10)));
  const changed = { ...assessment, questions: assessment.questions.map((question, index) => index === 0 ? { ...question, prompt: { fr: "Nouveau contexte", en: "New context", es: "Otro contexto" } } : question) };
  assert.equal(parseAssessmentDraft(raw, assessmentDraftContext(SPANISH_PROGRESS_KEY, changed), now).started, false);
});

test("same-run views preserve first outcomes and help; stale question and pre-restart callbacks cannot count", () => {
  const storage = memory(), now = 1800000000000;
  const a = createAssessmentDraftStore(context, () => storage, () => now);
  const b = createAssessmentDraftStore(context, () => storage, () => now);
  a.getSnapshot(); b.getSnapshot(); a.start(); b.start();
  const first = assessmentDraftToken(a.getSnapshot().draft);
  a.help(first); b.attempt(first, false); a.attempt(first, true);
  assert.equal(assessmentDraftScore(a.getSnapshot().draft), 0);
  assert.equal(assessmentDraftAssisted(a.getSnapshot().draft), true);
  a.next(first);
  const second = assessmentDraftToken(a.getSnapshot().draft);
  a.attempt(first, true); a.help(first); a.next(first);
  assert.equal(a.getSnapshot().draft.index, 1);
  assert.equal(a.getSnapshot().draft.results.length, 1);
  const typedQuestion = assessment.questions[1]; assert.equal(typedQuestion.kind, "type");
  if (typedQuestion.kind !== "type") throw new Error("Expected the authored typed question");
  a.text(second, typedQuestion.model);
  a.attempt(second, true, typedQuestion.model);
  assert.deepEqual(a.next(second), { correct: 1, total: 2, assisted: true });
  assert.equal(a.next(second), null);
  b.next(second);
  assert.equal(b.getSnapshot().draft.done, true);
  a.restart();
  a.attempt(second, true); a.help(second); a.next(second);
  assert.equal(a.getSnapshot().draft.results.length, 0);
  assert.equal(a.getSnapshot().draft.currentHelp, false);
  assert.equal(a.getSnapshot().draft.index, 0);
  assert.notEqual(assessmentDraftToken(a.getSnapshot().draft), first);
});

test("a checked wrong answer, unsubmitted help and completed result survive real component remounts without duplicate completion", () => {
  localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, "untouched-italian");
  localStorage.setItem(introKey("es"), "untouched-spanish-intro");
  const events: Result[] = [];
  let view = mount(events);
  assert.equal(state(view).dataset.assessmentStarted, "false");
  click(view.getByRole("button", { name: "Start" }));
  answer(view, assessment.questions[0], false);
  assert.equal(events.length, 0);
  cleanup(); frames.clear();
  view = mount(events);
  assert.equal(state(view).dataset.assessmentIndex, "0");
  assert.ok(view.getByText("First checked answer kept: review needed."));
  assert.ok(view.getByRole("button", { name: "Continue" }));
  answer(view, assessment.questions[0], true);
  assert.equal(assessmentDraftScore(parseAssessmentDraft(localStorage.getItem(context.key), context)), 0, "reviewing a correction cannot replace the first result");
  click(view.getByRole("button", { name: "Continue" }));
  assert.equal(state(view).dataset.assessmentIndex, "1");
  click(view.getByRole("button", { name: "Show a model" }));
  fireEvent.change(view.getByRole("textbox"), { target: { value: "a private unsent draft" } });
  assert.equal(parseAssessmentDraft(localStorage.getItem(context.key), context).typedText?.value, "a private unsent draft");
  cleanup(); frames.clear();
  view = mount(events);
  assert.equal(state(view).dataset.assessmentIndex, "1");
  assert.equal((view.getByRole("textbox") as HTMLInputElement).value, "a private unsent draft", "the explicitly supported local draft restores without checking");
  assert.equal(parseAssessmentDraft(localStorage.getItem(context.key), context).currentHelp, true);
  answer(view, assessment.questions[1]);
  const next = view.getByRole("button", { name: "Continue" });
  act(() => { fireEvent.click(next); fireEvent.click(next); }); flush();
  assert.deepEqual(events, [[assessment.id, 1, 2, true]]);
  assert.equal(state(view).dataset.assessmentDone, "true");
  cleanup(); frames.clear();
  view = mount(events);
  assert.ok(view.getByRole("heading", { name: "1/2" }));
  assert.ok(view.getByText(/With help/));
  assert.equal(events.length, 1, "completed hydration never calls onComplete");
  assert.equal(localStorage.getItem(context.key)!.includes("Nora"), false, "even checked answer strings are absent");
  assert.equal(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY), "untouched-italian");
  assert.equal(localStorage.getItem(introKey("es")), "untouched-spanish-intro");
  click(view.getByRole("button", { name: "Try again" }));
  assert.equal(state(view).dataset.assessmentIndex, "0");
  assert.equal(state(view).dataset.assessmentDone, "false");
  assert.equal(parseAssessmentDraft(localStorage.getItem(context.key), context).currentHelp, false);
  assert.equal(events.length, 1);
});

test("a deliberate fresh run can prove independence after an assisted completed run", () => {
  const events: Result[] = [], single: CourseAssessment = { ...assessment, questions: [assessment.questions[1]] };
  const view = mount(events, single);
  click(view.getByRole("button", { name: "Start" }));
  click(view.getByRole("button", { name: "Show a model" }));
  answer(view, single.questions[0]); click(view.getByRole("button", { name: "Continue" }));
  click(view.getByRole("button", { name: "Try again" }));
  answer(view, single.questions[0]); click(view.getByRole("button", { name: "Continue" }));
  assert.deepEqual(events, [[single.id, 1, 1, true], [single.id, 1, 1, false]]);
});

test("resetAt invalidates a partial run and changing interface language keeps the canonical draft", () => {
  const events: Result[] = [], single: CourseAssessment = { ...assessment, questions: [assessment.questions[1]] };
  let view = mount(events, single);
  click(view.getByRole("button", { name: "Start" }));
  click(view.getByRole("button", { name: "Show a model" }));
  cleanup(); frames.clear();
  view = mount(events, single, "es", "es");
  assert.equal(state(view).dataset.assessmentStarted, "true");
  assert.ok(view.getByRole("textbox", { name: "Tu respuesta en español" }));
  assert.equal(localStorage.length, 1, "interface locale does not create another assessment key");
  cleanup(); frames.clear();
  view = mount(events, single, "es", "en", Date.now());
  assert.equal(state(view).dataset.assessmentStarted, "false");
  assert.ok(view.getByRole("button", { name: "Start" }));
  assert.equal(events.length, 0);
});

test("the common component resumes separately in German, Portuguese, English, Spanish and Québec French", () => {
  const events: Result[] = [], single: CourseAssessment = { ...assessment, questions: [assessment.questions[0]] };
  for (const language of ["de", "pt-BR", "en", "es", "fr-CA"] as const) {
    let view = mount(events, single, language);
    assert.equal(state(view).dataset.assessmentStarted, "false", language);
    click(view.getByRole("button", { name: "Start" }));
    answer(view, single.questions[0]);
    cleanup(); frames.clear();
    view = mount(events, single, language);
    assert.equal(state(view).dataset.assessmentStarted, "true", language);
    assert.ok(view.getByRole("button", { name: "Continue" }));
    click(view.getByRole("button", { name: "Continue" }));
    cleanup(); frames.clear();
  }
  assert.equal(events.length, 5);
  assert.equal(Object.keys(localStorage).filter((key) => key.startsWith("yo.course-assessment.v1/")).length, 5);
});

test("legacy listening transcript assistance survives reload before the first check", () => {
  const listening = germanCourseUnits[0].quiz.questions.find((question) => question.kind === "type" && question.listeningText)!;
  const single: CourseAssessment = { ...germanCourseUnits[0].quiz, questions: [listening] }, events: Result[] = [];
  let view = mount(events, single, "de");
  click(view.getByRole("button", { name: "Start" }));
  click(view.getByRole("button", { name: "Read the transcript (with help)" }));
  cleanup(); frames.clear();
  view = mount(events, single, "de");
  assert.equal(state(view).dataset.assessmentStarted, "true");
  click(view.getByRole("button", { name: "Read the transcript (with help)" }));
  answer(view, listening); click(view.getByRole("button", { name: "Continue" }));
  assert.deepEqual(events, [[single.id, 1, 1, true]]);
});

test("quota failures are visible and keep this session usable without writing learner text", () => {
  const events: Result[] = [], single: CourseAssessment = { ...assessment, questions: [assessment.questions[1]] };
  const view = mount(events, single);
  const previous = dom.window.Storage.prototype.setItem;
  dom.window.Storage.prototype.setItem = () => { throw new dom.window.DOMException("full", "QuotaExceededError"); };
  try {
    click(view.getByRole("button", { name: "Start" }));
    assert.ok(view.getByText(/this browser cannot save its resume state/));
    answer(view, single.questions[0]); click(view.getByRole("button", { name: "Continue" }));
    assert.deepEqual(events, [[single.id, 1, 1, false]]);
    assert.equal(state(view).dataset.assessmentDone, "true");
    assert.equal(localStorage.getItem(assessmentDraftContext(SPANISH_PROGRESS_KEY, single).key), null);
  } finally { dom.window.Storage.prototype.setItem = previous; }
  const blocked = createAssessmentDraftStore(context, () => { throw new Error("blocked"); });
  assert.equal(blocked.getSnapshot().storageError, true);
  blocked.start();
  assert.equal(blocked.getSnapshot().draft.started, true);
});

test("start, navigation and restart stop every lesson audio engine and new foundations do not invent a culture final", () => {
  const events: Result[] = [], single: CourseAssessment = { ...assessment, id: spanishFinal.id, questions: [assessment.questions[0]] };
  const names = ["yo-audio-stop", "yo-italian-audio-stop", "yo-japanese-audio-stop", "yo-mandarin-audio-stop", "yo-speech-cancel"];
  const counts = new Map(names.map((name) => [name, 0]));
  const listeners = names.map((name) => { const fn = () => counts.set(name, counts.get(name)! + 1); window.addEventListener(name, fn); return [name, fn] as const; });
  try {
    const view = mount(events, single);
    click(view.getByRole("button", { name: "Start" }));
    answer(view, single.questions[0]); click(view.getByRole("button", { name: "Continue" }));
    assert.equal(view.queryByRole("link", { name: "The culture finale" }), null);
    click(view.getByRole("button", { name: "Try again" }));
    for (const name of names) assert.ok(counts.get(name)! >= 3, name);
  } finally { for (const [name, fn] of listeners) window.removeEventListener(name, fn); }
});

let failures = 0;
for (const [name, run] of cases) {
  cleanup(); frames.clear(); localStorage.clear();
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}`, error); }
  finally { cleanup(); frames.clear(); }
}
console.log(`${cases.length - failures}/${cases.length} assessment draft checks passed`);
if (failures) process.exitCode = 1;
