import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

import { CourseAssessmentPlayer } from "@/components/yo/italian/course/CourseAssessmentPlayer";
import { ItalianAudioProvider } from "@/components/yo/italian/ItalianAudioProvider";
import { italianCourseUnits } from "@/lib/yo/italian/course/courseData";
import { italianFirstMidpoint, italianFirstMission } from "@/lib/yo/italian/course/coursePilot";
import type { CourseAssessment, CourseQuestion } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/yo/langues/italien/parcours/u01",
  pretendToBeVisual: true,
});
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
for (const [key, value] of Object.entries({
  window: dom.window,
  self: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Event: dom.window.Event,
  MutationObserver: dom.window.MutationObserver,
  requestAnimationFrame: (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  },
  cancelAnimationFrame: (id: number) => frames.delete(id),
  IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audio.example.test";
let plays = 0;
class FakeAudio extends dom.window.EventTarget {
  src: string;
  preload = "none";
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  constructor(src: string) { super(); this.src = src; }
  play() { plays++; this.dispatchEvent(new Event("playing")); return Promise.resolve(); }
  pause() {}
  load() {}
  removeAttribute() { this.src = ""; }
}
window.Audio = FakeAudio as unknown as typeof Audio;

const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
type AssessmentEvent = Parameters<React.ComponentProps<typeof CourseAssessmentPlayer>["onComplete"]>;
const tests: [string, () => void][] = [];
const quiz: CourseAssessment = { ...italianCourseUnits[0].quiz, mission: italianFirstMission };
const labels = {
  fr: { begin: "Commencer le bilan", check: "Vérifier", next: "Question suivante", finish: "Voir mon résultat", retake: "Refaire le bilan", answer: "Ta réponse en italien", listen: "Écouter : le message de l’exercice", transcript: "Lire la transcription (avec aide)", skip: "Passer pour l’instant", midpoint: "Halte de mi-parcours", beginMidpoint: "Commencer la halte", retakeMidpoint: "Rejouer la halte", unit: "Unité 1" },
  en: { begin: "Start the checkpoint", check: "Check", next: "Next question", finish: "See my result", retake: "Retake the checkpoint", answer: "Your answer in Italian", listen: "Listen : the exercise message", transcript: "Read the transcript (with help)", skip: "Skip for now", midpoint: "Midpoint recap", beginMidpoint: "Start the recap", retakeMidpoint: "Retake the recap", unit: "Unit 1" },
  es: { begin: "Empezar el balance", check: "Comprobar", next: "Pregunta siguiente", finish: "Ver mi resultado", retake: "Repetir el balance", answer: "Tu respuesta en italiano", listen: "Escuchar : el mensaje del ejercicio", transcript: "Leer la transcripción (con ayuda)", skip: "Omitir por ahora", midpoint: "Repaso a mitad de camino", beginMidpoint: "Empezar el repaso", retakeMidpoint: "Repetir el repaso", unit: "Unidad 1" },
} as const;

function flush() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(0)));
}
function click(element: HTMLElement) { fireEvent.click(element); flush(); }
function mount(assessment: CourseAssessment = quiz, locale: YoLocale = "en") {
  const events: AssessmentEvent[] = [];
  const paths = Object.fromEntries(assessment.questions.flatMap((question) => {
    const text = question.kind === "listen" ? question.stimulus : question.kind === "type" ? question.listeningText : undefined;
    return text ? [[text, "yo/it/italian-course-a1/v1/italian-standard/sentence/test.mp3"]] : [];
  }));
  const view = render(<ItalianAudioProvider paths={paths}>
    <CourseAssessmentPlayer assessment={assessment} locale={locale} onComplete={(...args) => events.push(args)} />
  </ItalianAudioProvider>);
  flush();
  return { view, events };
}
function selectResponse(view: View, question: CourseQuestion, correct = true, locale: YoLocale = "en") {
  if (question.kind === "type") {
    fireEvent.change(view.getByRole("textbox", { name: labels[locale].answer }), {
      target: { value: correct ? question.accepted.at(-1) : "xyz" },
    });
  } else {
    const option = question.options.find((item) => (item.id === question.correctId) === correct)!;
    click(view.getByRole("button", { name: option.it ?? option.label![locale] }));
  }
}
function answer(view: View, question: CourseQuestion, correct = true, locale: YoLocale = "en") {
  if (question.kind === "listen" || (question.kind === "type" && question.listeningText)) {
    click(view.getByRole("button", { name: labels[locale].listen }));
  }
  selectResponse(view, question, correct, locale);
  click(view.getByRole("button", { name: labels[locale].check }));
}

for (const locale of ["fr", "en", "es"] as const) {
  tests.push([`${locale}: mission introduces a localized scene and reveals only the checked response's feedback`, () => {
    const question = quiz.questions[0];
    assert.notEqual(question.kind, "type");
    if (question.kind === "type") throw new Error("Expected the original opening choice");
    const scene = italianFirstMission.scenes[question.id];
    const { view, events } = mount({ ...quiz, questions: [question] }, locale);
    assert.ok(view.getByRole("heading", { name: italianFirstMission.title[locale] }));
    assert.ok(view.getByText(italianFirstMission.briefing[locale]));
    assert.equal(plays, 0);
    click(view.getByRole("button", { name: labels[locale].begin }));
    assert.ok(view.getByRole("heading", { name: scene.title[locale] }));
    assert.ok(view.getByTestId("course-mission-scene").textContent?.includes(scene.character[locale]));
    assert.ok(view.getByText(scene.setting[locale]));
    assert.ok(view.getByText(question.prompt[locale]));
    assert.equal(view.queryByTestId("course-mission-outcome"), null);
    for (const option of question.options) assert.equal(view.queryByText(option.feedback[locale]), null);
    const wrong = question.options.find((option) => option.id !== question.correctId)!;
    click(view.getByRole("button", { name: wrong.it! }));
    assert.equal(view.queryByTestId("course-response-feedback"), null, "selection alone is not a checked answer");
    click(view.getByRole("button", { name: labels[locale].check }));
    assert.equal(view.getByTestId("course-mission-outcome").textContent, scene.recovery[locale]);
    assert.equal(view.getByTestId("course-response-feedback").textContent, wrong.feedback[locale]);
    assert.equal(view.queryByRole("button", { name: labels[locale].check }), null);
    assert.deepEqual(events, []);
    click(view.getByRole("button", { name: labels[locale].finish }));
    assert.deepEqual(events, [[quiz.id, 0, 1, false]]);
    assert.equal(view.getByTestId("course-mission-result").textContent, italianFirstMission.retry[locale]);
    assert.equal(view.getByRole("link", { name: labels[locale].unit }).getAttribute("href"), `/yo/langues/italien/parcours/u01${locale === "fr" ? "" : `?lang=${locale}`}`);
  }]);
}

tests.push(["the real five-scene mission keeps first-attempt scoring and submits an independent 4/5 only once", () => {
  assert.equal(quiz.id, "it1-u01-quiz");
  assert.equal(quiz.questions.length, 5);
  const { view, events } = mount();
  window.localStorage.setItem("course-sentinel", "unchanged");
  const before = { ...window.localStorage };
  click(view.getByRole("button", { name: labels.en.begin }));
  for (const [index, question] of quiz.questions.entries()) {
    const scene = italianFirstMission.scenes[question.id];
    assert.ok(view.getByRole("heading", { name: scene.title.en }));
    answer(view, question, index !== 0);
    assert.equal(view.getByTestId("course-mission-outcome").textContent, index === 0 ? scene.recovery.en : scene.success.en);
    assert.equal(view.queryByRole("button", { name: "Check" }), null, "the first checked response is locked");
    assert.equal(events.length, 0);
    const next = view.getByRole("button", { name: index === quiz.questions.length - 1 ? labels.en.finish : labels.en.next });
    act(() => { fireEvent.click(next); fireEvent.click(next); });
    flush();
  }
  assert.deepEqual(events, [["it1-u01-quiz", 4, 5, false]]);
  assert.equal(plays, 1, "only the existing listening stimulus was played");
  assert.ok(view.getByRole("heading", { name: "Checkpoint target reached" }));
  assert.ok(view.getByText("80 %"));
  assert.equal(view.getByTestId("course-mission-result").textContent, italianFirstMission.success.en);
  assert.ok(view.getByRole("link", { name: "Unit 1" }));
  assert.deepEqual({ ...window.localStorage }, before, "the presentation stores neither answers nor extra rewards");
}]);

tests.push(["mission listening retains its audio gate; transcript help stays assisted until a fresh recorded retry", () => {
  const question = quiz.questions.find((item) => item.kind === "listen")!;
  const { view, events } = mount({ ...quiz, questions: [question] });
  click(view.getByRole("button", { name: labels.en.begin }));
  selectResponse(view, question);
  assert.equal((view.getByRole("button", { name: "Check" }) as HTMLButtonElement).disabled, true);
  click(view.getByRole("button", { name: labels.en.transcript }));
  click(view.getByRole("button", { name: labels.en.transcript }));
  click(view.getByRole("button", { name: "Check" }));
  click(view.getByRole("button", { name: labels.en.finish }));
  assert.deepEqual(events, [[quiz.id, 1, 1, true]]);
  assert.ok(view.getByRole("heading", { name: "A review will help you progress" }));
  assert.equal(view.getByTestId("course-mission-result").textContent, italianFirstMission.assisted.en);
  assert.equal(view.queryByText(italianFirstMission.success.en), null);
  assert.ok(view.getByRole("link", { name: "Unit 1" }));

  click(view.getByRole("button", { name: labels.en.retake }));
  assert.equal(view.queryByTestId("course-mission-outcome"), null);
  assert.equal(view.queryByTestId("course-response-feedback"), null);
  assert.equal((view.getByRole("button", { name: "Check" }) as HTMLButtonElement).disabled, true);
  answer(view, question);
  click(view.getByRole("button", { name: labels.en.finish }));
  assert.deepEqual(events, [[quiz.id, 1, 1, true], [quiz.id, 1, 1, false]]);
  assert.equal(view.getByTestId("course-mission-result").textContent, italianFirstMission.success.en);
  assert.equal(view.queryByRole("link", { name: "Unit 1" }), null);
}]);

tests.push(["a Yoppo hint before checking is assistance; reviewing feedback afterwards does not change the recorded result", () => {
  const question = quiz.questions[0];
  for (const helpBeforeAnswer of [true, false]) {
    const { view, events } = mount({ ...quiz, questions: [question] });
    click(view.getByRole("button", { name: labels.en.begin }));
    if (!helpBeforeAnswer) answer(view, question);
    click(view.getByRole("button", { name: "Open Yoppo" }));
    const coach = within(view.getByRole("region", { name: "Shall we play?" }));
    click(coach.getByRole("button", { name: "A hint" }));
    click(coach.getByRole("button", { name: "Minimize Yoppo" }));
    if (helpBeforeAnswer) answer(view, question);
    click(view.getByRole("button", { name: labels.en.finish }));
    assert.deepEqual(events, [[quiz.id, 1, 1, helpBeforeAnswer]]);
    assert.equal(view.getByTestId("course-mission-result").textContent, helpBeforeAnswer ? italianFirstMission.assisted.en : italianFirstMission.success.en);
    cleanup();
  }
}]);

tests.push(["skipping a scene does not reuse a previous choice's feedback or count as success", () => {
  const questions = [quiz.questions[0], quiz.questions[2]];
  const { view, events } = mount({ ...quiz, questions });
  click(view.getByRole("button", { name: labels.en.begin }));
  answer(view, questions[0], false);
  assert.ok(view.getByTestId("course-response-feedback"));
  click(view.getByRole("button", { name: labels.en.next }));
  click(view.getByRole("button", { name: labels.en.skip }));
  assert.equal(view.queryByTestId("course-response-feedback"), null);
  assert.equal(view.getByTestId("course-mission-outcome").textContent, italianFirstMission.scenes[questions[1].id].recovery.en);
  click(view.getByRole("button", { name: labels.en.finish }));
  assert.deepEqual(events, [[quiz.id, 0, 2, false]]);
}]);

for (const locale of ["fr", "en", "es"] as const) {
  tests.push([`${locale}: the midpoint has a recap entry and replay without mission scenes`, () => {
    const { view, events } = mount(italianFirstMidpoint, locale);
    assert.ok(view.getByText(labels[locale].midpoint));
    assert.ok(view.getByRole("heading", { name: italianFirstMidpoint.title[locale] }));
    assert.equal(view.queryByRole("button", { name: labels[locale].begin }), null);
    click(view.getByRole("button", { name: labels[locale].beginMidpoint }));
    assert.equal(view.queryByTestId("course-mission-scene"), null);
    for (const [index, question] of italianFirstMidpoint.questions.entries()) {
      answer(view, question, true, locale);
      click(view.getByRole("button", { name: index === italianFirstMidpoint.questions.length - 1 ? labels[locale].finish : labels[locale].next }));
    }
    assert.deepEqual(events, [[italianFirstMidpoint.id, italianFirstMidpoint.questions.length, italianFirstMidpoint.questions.length, false]]);
    assert.equal(view.queryByTestId("course-mission-result"), null);
    click(view.getByRole("button", { name: labels[locale].retakeMidpoint }));
    assert.ok(view.getByText(italianFirstMidpoint.questions[0].prompt[locale]));
    assert.equal(events.length, 1);
  }]);
}

tests.push(["an assessment without mission metadata retains the standard introduction and result", () => {
  const assessment = { ...quiz, mission: undefined, questions: [quiz.questions[0]] };
  const { view, events } = mount(assessment);
  assert.ok(view.getByRole("heading", { name: assessment.title.en }));
  assert.ok(view.getByText(assessment.description.en));
  click(view.getByRole("button", { name: labels.en.begin }));
  assert.equal(view.queryByTestId("course-mission-scene"), null);
  assert.ok(view.getByRole("heading", { name: assessment.questions[0].title.en }));
  answer(view, assessment.questions[0]);
  click(view.getByRole("button", { name: labels.en.finish }));
  assert.deepEqual(events, [[assessment.id, 1, 1, false]]);
  assert.ok(view.getByRole("heading", { name: "Checkpoint target reached" }));
  assert.equal(view.queryByTestId("course-mission-result"), null);
}]);

let failures = 0;
for (const [name, test] of tests) {
  cleanup();
  frames.clear();
  window.localStorage.clear();
  plays = 0;
  try { test(); console.log("PASS", name); }
  catch (error) { failures++; console.error("FAIL", name, error); }
}
cleanup();
dom.window.close();
if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
console.log(`${tests.length - failures}/${tests.length} course mission tests passed`);
if (failures) process.exitCode = 1;
