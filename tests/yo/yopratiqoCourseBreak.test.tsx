import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { CourseBonus } from "@/components/yo/italian/course/CourseBonus";
import { ItalianAudioProvider } from "@/components/yo/italian/ItalianAudioProvider";
import { ItalianModuleAudio } from "@/components/yo/italian/ItalianModuleAudio";
import { ItalianCourseUnit } from "@/components/yo/italian/course/ItalianCourseUnit";
import { CourseAssessmentPlayer } from "@/components/yo/italian/course/CourseAssessmentPlayer";
import { italianCourseUnits, italianCourseCatalog, courseSources } from "@/lib/yo/italian/course/courseData";
import { ITALIAN_COURSE_PROGRESS_KEY } from "@/lib/yo/italian/course/courseProgress";
import type { CoursePhrase } from "@/lib/yo/italian/course/courseTypes";
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
})) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
let scrollLeft = 0;
let scrollTop = 0;
Object.defineProperty(window, "scrollX", { configurable: true, get: () => scrollLeft });
Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollTop });
window.scrollTo = ((options: ScrollToOptions) => {
  scrollLeft = options.left ?? scrollLeft;
  scrollTop = options.top ?? scrollTop;
}) as typeof window.scrollTo;

// Keep the public component props unchanged; inject the monotonic browser clock.
let now = 0;
let visibility: DocumentVisibilityState = "visible";
const originalNow = Object.getOwnPropertyDescriptor(performance, "now");
Object.defineProperty(performance, "now", { configurable: true, value: () => now });
Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audio.example.test";

const audios: FakeAudio[] = [];
class FakeAudio extends dom.window.EventTarget {
  src: string;
  preload = "none";
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  paused = true;
  constructor(src: string) {
    super();
    this.src = src;
    audios.push(this);
  }
  play() {
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  removeAttribute() { this.src = ""; }
  load() {}
}
window.Audio = FakeAudio as unknown as typeof Audio;

const { render, cleanup, fireEvent, within, act } = require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
const phrases: CoursePhrase[] = [
  { it: "Ciao", meaning: { fr: "Salut", en: "Hello", es: "Hola" } },
  { it: "Acqua", meaning: { fr: "Eau", en: "Water", es: "Agua" } },
  { it: "Pane", meaning: { fr: "Pain", en: "Bread", es: "Pan" } },
  { it: "Grazie", meaning: { fr: "Merci", en: "Thank you", es: "Gracias" } },
];
const labels = {
  fr: { next: "Continuer", back: "Revenir à ma leçon", invitation: "Une belle pause ! On reprend ?", more: "Encore une question", close: "Fermer" },
  en: { next: "Continue", back: "Back to my lesson", invitation: "That was a good break! Ready to return?", more: "One more question", close: "Close" },
  es: { next: "Continuar", back: "Volver a mi lección", invitation: "¡Una buena pausa! ¿Volvemos?", more: "Una pregunta más", close: "Cerrar" },
};
function flush() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(now)));
}
function click(element: HTMLElement) {
  fireEvent.click(element);
  flush();
}
function mount(locale: YoLocale = "en", onClose = () => {}) {
  const view = render(<CourseBonus locale={locale} phrases={phrases} onClose={onClose} />);
  flush();
  return view;
}
function answer(view: View, round: number, locale: YoLocale = "en") {
  click(view.getByRole("button", { name: phrases[round % phrases.length].meaning[locale] }));
}
function advance(view: View, locale: YoLocale = "en") {
  click(view.getByRole("button", { name: labels[locale].next }));
}
function changeVisibility(value: DocumentVisibilityState) {
  visibility = value;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
}
function invitation(view: View, locale: YoLocale = "en") {
  return view.queryByRole("heading", { name: labels[locale].invitation });
}

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: invites return after three answered questions and their explanations`, () => {
    let closes = 0;
    const view = mount(locale, () => closes++);
    assert.ok(view.getByRole("button", { name: labels[locale].back }));
    for (let round = 0; round < 3; round++) {
      // An incorrect answer still completes a break question, without awarding a result.
      if (round === 2) click(view.getByRole("button", { name: phrases[0].meaning[locale] }));
      else answer(view, round, locale);
      assert.ok(view.getByRole("status").textContent?.includes(phrases[round].meaning[locale]));
      assert.equal(invitation(view, locale), null, "the explanation must remain until Continue");
      advance(view, locale);
      assert.equal(Boolean(invitation(view, locale)), round === 2);
    }
    assert.equal(closes, 0, "an invitation must never close the break automatically");
    assert.equal(document.activeElement, invitation(view, locale));
    click(view.getByRole("button", { name: labels[locale].back }));
    assert.equal(closes, 1);
  });
}

test("180000 active milliseconds trigger the invitation only after an answered explanation", () => {
  const view = mount();
  now = 180_000;
  changeVisibility("visible");
  assert.equal(invitation(view), null);
  assert.equal(view.queryByRole("button", { name: "Continue" }), null);
  answer(view, 0);
  assert.equal(invitation(view), null);
  assert.ok(view.getByRole("status"));
  advance(view);
  assert.ok(invitation(view));
});

test("hidden tab time is excluded and the active-time boundary is exact", () => {
  const view = mount();
  now = 60_000;
  changeVisibility("hidden");
  now = 1_260_000;
  changeVisibility("visible");
  now = 1_379_999; // 179999 active milliseconds, despite twenty hidden minutes.
  answer(view, 0);
  advance(view);
  assert.equal(invitation(view), null);
  assert.ok(view.getByRole("heading", { name: "Acqua" }));
  now = 1_380_000;
  answer(view, 1);
  advance(view);
  assert.ok(invitation(view), "two answered questions plus exactly 180000 active ms are sufficient");
});

test("a break opened in a hidden tab accrues no time until visible", () => {
  visibility = "hidden";
  const view = mount();
  now = 900_000;
  changeVisibility("visible");
  answer(view, 0);
  advance(view);
  assert.equal(invitation(view), null);
  assert.ok(view.getByRole("heading", { name: "Acqua" }));
});

test("duplicate answer and Continue clicks cannot count or skip an unanswered question", () => {
  const view = mount();
  const first = view.getByRole("button", { name: "Hello" });
  act(() => { fireEvent.click(first); fireEvent.click(first); });
  const next = view.getByRole("button", { name: "Continue" });
  act(() => { fireEvent.click(next); fireEvent.click(next); });
  flush();
  assert.ok(view.getByRole("heading", { name: "Acqua" }));
  assert.equal(view.queryByRole("button", { name: "Continue" }), null);
  answer(view, 1);
  advance(view);
  assert.equal(invitation(view), null, "only two questions have been answered");
  assert.ok(view.getByRole("heading", { name: "Pane" }));
  answer(view, 2);
  advance(view);
  assert.ok(invitation(view));
});

test("one more grants one complete question before offering return again", () => {
  const view = mount();
  now = 180_000;
  answer(view, 0);
  advance(view);
  now = 900_000; // Time spent deciding at the invitation must not skip the extra question.
  const more = view.getByRole("button", { name: "One more question" });
  act(() => { fireEvent.click(more); fireEvent.click(more); });
  flush();
  assert.ok(view.getByRole("heading", { name: "Acqua" }));
  assert.equal(invitation(view), null);
  assert.equal(view.queryByRole("button", { name: "Continue" }), null);
  answer(view, 1);
  assert.equal(invitation(view), null);
  advance(view);
  assert.ok(invitation(view));
});

test("early return, Close and Escape share one close callback per mounted break", () => {
  let closes = 0;
  const view = mount("en", () => closes++);
  const back = view.getByRole("button", { name: "Back to my lesson" });
  const close = view.getByRole("button", { name: "Close" });
  act(() => {
    fireEvent.click(back);
    fireEvent.click(close);
    fireEvent.keyDown(window, { key: "Escape" });
  });
  assert.equal(closes, 1);
  assert.equal(invitation(view), null);
});

test("Escape closes an unanswered break once and a remount starts a fresh session", () => {
  let closes = 0;
  const view = mount("en", () => closes++);
  now = 180_000;
  act(() => {
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "Escape" });
  });
  assert.equal(closes, 1);
  view.unmount();
  const reopened = mount();
  answer(reopened, 0);
  advance(reopened);
  assert.equal(invitation(reopened), null);
  assert.ok(reopened.getByRole("heading", { name: "Acqua" }));
});

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: an empty phrase pool remains a dismissible optional break`, () => {
    let closes = 0;
    const view = render(<CourseBonus locale={locale} phrases={[]} onClose={() => closes++} />);
    flush();
    assert.ok(view.getByRole("status").textContent);
    assert.equal(view.container.querySelectorAll("button[aria-pressed]").length, 0);
    click(view.getByRole("button", { name: labels[locale].back }));
    assert.equal(closes, 1);
  });
}

test("duplicate meanings do not create ambiguous answer options", () => {
  const view = render(<CourseBonus locale="en" phrases={[phrases[0], { ...phrases[0], it: "Salve" }, phrases[1]]} onClose={() => {}} />);
  assert.equal(view.getAllByRole("button", { name: "Hello" }).length, 1);
  assert.equal(view.container.querySelectorAll("button[aria-pressed]").length, 2);
  answer(view, 0);
  advance(view);
  assert.ok(view.getByRole("heading", { name: "Acqua" }));
});

for (const [language, phrase, locale] of [["it", "Ciao", "fr"], ["de", "Guten Tag", "en"], ["pt-BR", "Olá", "es"]] as const) {
  test(`${language}: question and explanation inherit the course language in a ${locale} interface`, () => {
    const view = render(
      <ItalianAudioProvider paths={{}} language={language}>
        <CourseBonus locale={locale} phrases={[{ ...phrases[0], it: phrase }]} onClose={() => {}} />
      </ItalianAudioProvider>,
    );
    assert.equal(view.getByRole("heading", { name: phrase }).getAttribute("lang"), language);
    answer(view, 0, locale);
    assert.equal(within(view.getByRole("status")).getByText(phrase, { exact: true }).getAttribute("lang"), language);
    assert.ok(view.getByRole("button", { name: labels[locale].back }));
  });
}

test("real course audio stops on entry, before a return invitation, and on early close", () => {
  function Harness() {
    const [open, setOpen] = React.useState(false);
    return (
      <ItalianAudioProvider paths={{ Ciao: "yo/it/italian-course-a1/v1/italian-standard/sentence/test.mp3" }}>
        <ItalianModuleAudio text="Ciao" locale="en" />
        <button type="button" onClick={() => setOpen(true)}>Open break</button>
        {open ? <CourseBonus locale="en" phrases={phrases} onClose={() => setOpen(false)} /> : null}
      </ItalianAudioProvider>
    );
  }
  const view = render(<Harness />);
  click(view.getByRole("button", { name: "Listen : Ciao" }));
  const beforeEntry = audios.at(-1)!;
  assert.equal(beforeEntry.paused, false);
  click(view.getByRole("button", { name: "Open break" }));
  assert.equal(beforeEntry.paused, true);
  assert.equal(beforeEntry.src, "");
  for (let round = 0; round < 2; round++) { answer(view, round); advance(view); }
  answer(view, 2);
  click(view.getByRole("button", { name: "Listen : Ciao" }));
  const duringExplanation = audios.at(-1)!;
  assert.equal(duringExplanation.paused, false);
  assert.equal(invitation(view), null);
  advance(view);
  assert.equal(duringExplanation.paused, true);
  assert.ok(invitation(view));
  click(view.getByRole("button", { name: "One more question" }));
  click(view.getByRole("button", { name: "Listen : Ciao" }));
  const beforeClose = audios.at(-1)!;
  click(view.getByRole("button", { name: "Close" }));
  assert.equal(beforeClose.paused, true);
  assert.equal(view.queryByRole("button", { name: "Back to my lesson" }), null);
});

function mountCourse() {
  const view = render(<ItalianCourseUnit unit={italianCourseUnits[0]} locale="fr" catalog={italianCourseCatalog} sources={courseSources} audioPaths={{}} />);
  flush();
  return view;
}
function openCourseBreak(view: View) {
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  click(view.getByRole("button", { name: /^Défie-moi !/ }));
  return within(view.getByRole("heading", { name: "Le défi surprise de Yoppo" }).closest("section")!);
}

test("the real workshop retains its draft, text selection and checklist without changing course or credit data", () => {
  const view = mountCourse();
  click(view.getByRole("button", { name: "Mon atelier" }));
  const draft = view.getByRole("textbox", { name: "Ton brouillon en italien" }) as HTMLTextAreaElement;
  fireEvent.change(draft, { target: { value: "La mia risposta ancora incompleta" } });
  draft.focus();
  draft.setSelectionRange(3, 15);
  const check = view.getByRole("checkbox", { name: italianCourseUnits[0].production.rubric[0].fr }) as HTMLInputElement;
  click(check);
  const before = window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY);
  window.localStorage.setItem("credit-sentinel", "unchanged");
  scrollLeft = 12;
  scrollTop = 275;
  const bonus = openCourseBreak(view);
  assert.equal(document.activeElement, bonus.getByRole("heading", { name: "Le défi surprise de Yoppo" }));
  scrollTop = 900;
  click(bonus.getByRole("button", { name: "Revenir à ma leçon" }));
  assert.equal(document.activeElement, view.getByRole("button", { name: "Ouvrir Yoppo" }));
  assert.deepEqual([window.scrollX, window.scrollY], [12, 275]);
  assert.equal(view.getByRole("textbox", { name: "Ton brouillon en italien" }), draft, "the workshop DOM remains mounted");
  assert.equal(draft.value, "La mia risposta ancora incompleta");
  assert.deepEqual([draft.selectionStart, draft.selectionEnd], [3, 15]);
  assert.equal(check.checked, true);
  assert.equal(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY), before);
  assert.equal(window.localStorage.getItem("credit-sentinel"), "unchanged");
});

test("the real practice retains an unfinished answer through a completed break", () => {
  const view = mountCourse();
  click(view.getByRole("button", { name: "Jouer et pratiquer" }));
  const group = view.getByRole("group", { name: "Expressions italiennes" });
  const selected = within(group).getAllByRole("button")[0];
  click(selected);
  const before = window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY);
  const bonus = openCourseBreak(view);
  for (let round = 0; round < 3; round++) {
    click(bonus.getByRole("button", { name: italianCourseUnits[0].lessons[0].vocabulary[round].meaning.fr }));
    click(bonus.getByRole("button", { name: "Continuer" }));
  }
  assert.ok(bonus.getByRole("heading", { name: labels.fr.invitation }));
  scrollTop = 700;
  click(bonus.getByRole("button", { name: labels.fr.back }));
  assert.equal(document.activeElement?.textContent, italianCourseUnits[0].lessons[0].title.fr, "the caller's intentional lesson-heading focus takes precedence");
  assert.equal(window.scrollY, 700, "the bonus must not undo the caller's chosen lesson position");
  assert.equal(view.getByRole("group", { name: "Expressions italiennes" }), group);
  assert.equal(selected.getAttribute("aria-pressed"), "true");
  assert.equal(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY), before);
});

test("Escape from a real assessment break restores keyboard focus and scroll without losing its selected answer", () => {
  let submissions = 0;
  const unit = italianCourseUnits[0];
  const assessment = { ...unit.quiz, questions: unit.quiz.questions.filter((question) => question.kind === "choice").slice(0, 1) };
  const view = render(<CourseAssessmentPlayer assessment={assessment} locale="fr" onComplete={() => submissions++} />);
  click(view.getByRole("button", { name: "Commencer le bilan" }));
  const options = view.getByRole("group", { name: "Choisis une réponse" });
  const selected = within(options).getAllByRole("button")[0];
  click(selected);
  scrollTop = 350;
  const bonus = openCourseBreak(view);
  assert.equal(document.activeElement, bonus.getByRole("heading", { name: "Le défi surprise de Yoppo" }));
  scrollTop = 950;
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  flush();
  assert.equal(document.activeElement, view.getByRole("button", { name: "Ouvrir Yoppo" }));
  assert.equal(window.scrollY, 350);
  assert.equal(view.getByRole("group", { name: "Choisis une réponse" }), options);
  assert.equal(selected.getAttribute("aria-pressed"), "true");
  assert.equal(submissions, 0);
});

test("restoration ignores an opener removed while the break is open", () => {
  function Harness({ showOpener }: { showOpener: boolean }) {
    const [open, setOpen] = React.useState(false);
    return <>
      {showOpener ? <button type="button" onClick={() => setOpen(true)}>Open break</button> : null}
      {open ? <CourseBonus locale="en" phrases={phrases} onClose={() => setOpen(false)} /> : null}
    </>;
  }
  const view = render(<Harness showOpener />);
  const opener = view.getByRole("button", { name: "Open break" });
  opener.focus();
  click(opener);
  view.rerender(<Harness showOpener={false} />);
  assert.equal(opener.isConnected, false);
  click(view.getByRole("button", { name: "Back to my lesson" }));
  assert.equal(document.activeElement, document.body);
});

test("Strict Mode effect replay keeps a three-question session and one close callback", () => {
  let closes = 0;
  const view = render(<React.StrictMode><CourseBonus locale="en" phrases={phrases} onClose={() => closes++} /></React.StrictMode>);
  for (let round = 0; round < 3; round++) {
    answer(view, round);
    advance(view);
    assert.equal(Boolean(invitation(view)), round === 2);
  }
  click(view.getByRole("button", { name: "Back to my lesson" }));
  assert.equal(closes, 1);
});

let failed = 0;
for (const [name, run] of cases) {
  cleanup();
  frames.clear();
  audios.length = 0;
  window.localStorage.clear();
  now = 0;
  visibility = "visible";
  scrollLeft = 0;
  scrollTop = 0;
  try {
    run();
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.error(`✗ ${name}`, error);
  }
}
cleanup();
dom.window.close();
if (originalNow) Object.defineProperty(performance, "now", originalNow);
else Reflect.deleteProperty(performance, "now");
if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
console.log(`${cases.length - failed}/${cases.length} course break tests passed`);
if (failed) process.exitCode = 1;
