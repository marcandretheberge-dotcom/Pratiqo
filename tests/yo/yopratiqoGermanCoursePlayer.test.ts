import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { GermanCourseUnit } from "@/components/yo/german/GermanCourseUnit";
import { GermanCourseDashboard } from "@/components/yo/german/GermanCourseDashboard";
import { GermanAssessment } from "@/components/yo/german/GermanAssessment";
import { GermanCourseFinal } from "@/components/yo/german/GermanCourseFinal";
import { ItalianAudioProvider } from "@/components/yo/italian/ItalianAudioProvider";
import { ItalianGame } from "@/components/yo/italian/ItalianGames";
import { InstallAppPrompt } from "@/components/app/InstallAppPrompt";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import {
  germanCourseUnits,
  germanCatalog,
  germanCultureFinal,
} from "@/lib/yo/german/courseData";
import { GERMAN_PROGRESS_KEY } from "@/lib/yo/german/courseLogic";
import {
  ITALIAN_COURSE_PROGRESS_KEY,
  emptyCourseProgress,
  resetCourseProgress,
  type CourseProgress,
} from "@/lib/yo/italian/course/courseProgress";
import type {
  ItalianMatchActivity,
  ItalianChoiceActivity,
} from "@/lib/yo/italian/italianModuleTypes";
import type { CourseQuestion } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/yo/langues/allemand/parcours/u01",
  pretendToBeVisual: true,
});
let starts = 0;
const played: string[] = [];
const frames: FrameRequestCallback[] = [];
class FakeAudio extends dom.window.EventTarget {
  src: string;
  preload = "none";
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  constructor(src: string) {
    super();
    this.src = src;
    played.push(src);
    starts++;
  }
  play() {
    this.dispatchEvent(new dom.window.Event("playing"));
    return Promise.resolve();
  }
  pause() {}
  removeAttribute() {
    this.src = "";
  }
  load() {}
}
Object.defineProperty(dom.window, "Audio", {
  configurable: true,
  value: FakeAudio,
});
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
const bindings = {
  window: dom.window,
  self: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent,
  MutationObserver: dom.window.MutationObserver,
  requestAnimationFrame: (fn: FrameRequestCallback) => {
    frames.push(fn);
    return frames.length;
  },
  cancelAnimationFrame: () => {},
  IS_REACT_ACT_ENVIRONMENT: true,
};
for (const [key, value] of Object.entries(bindings))
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  });
const { render, cleanup, fireEvent, within, act } =
  require("@testing-library/react") as typeof import("@testing-library/react");
type View = ReturnType<typeof render>;
type Result = Parameters<
  React.ComponentProps<typeof GermanAssessment>["onComplete"]
>;
const cases: Array<[string, () => void]> = [],
  test = (name: string, run: () => void) => cases.push([name, run]);
const unit = germanCourseUnits[0],
  lesson = unit.lessons[0],
  match = lesson.activities[0] as ItalianMatchActivity;
function flush() {
  const pending = frames.splice(0);
  act(() => pending.forEach((f) => f(0)));
}
function click(node: HTMLElement) {
  fireEvent.click(node);
  flush();
}
const saved = (): CourseProgress =>
  JSON.parse(window.localStorage.getItem(GERMAN_PROGRESS_KEY) ?? "{}");
function mount(locale: YoLocale = "fr", extra: Record<string, unknown> = {}) {
  return render(
    React.createElement(GermanCourseUnit, {
      unit,
      catalog: germanCatalog,
      locale,
      audioPaths: {},
      ...extra,
    }),
  );
}
function pairs(view: View) {
  const left = within(
      view.getByRole("group", { name: "Expressions allemandes" }),
    ),
    right = within(view.getByRole("group", { name: "Leur sens" }));
  for (const p of match.pairs) {
    click(left.getByRole("button", { name: p.it }));
    click(right.getByRole("button", { name: p.meaning.fr }));
  }
}
function provider(node: React.ReactNode, paths: Record<string, string> = {}) {
  return React.createElement(
    ItalianAudioProvider,
    { language: "de", paths } as React.ComponentProps<
      typeof ItalianAudioProvider
    >,
    node,
  );
}
function answer(view: View, q: CourseQuestion, correct = true) {
  if (q.kind === "type") {
    if (q.listeningText)
      click(
        view.getByRole("button", { name: "Lire la transcription (avec aide)" }),
      );
    fireEvent.change(
      view.getByRole("textbox", { name: "Ta réponse en allemand" }),
      { target: { value: correct ? q.model : "xyz" } },
    );
  } else {
    if (q.kind === "listen")
      click(
        view.getByRole("button", { name: "Lire la transcription (avec aide)" }),
      );
    const o = q.options.find((o) => (o.id === q.correctId) === correct)!;
    click(
      within(
        view.getByRole("group", { name: "Choisis une réponse" }),
      ).getByRole("button", { name: o.it ?? o.label!.fr }),
    );
  }
  click(view.getByRole("button", { name: "Vérifier" }));
}
for (const locale of ["fr", "en", "es"] as const)
  test(
    locale + ": localized lessons, photos, navigation and no autoplay",
    () => {
      const view = mount(locale);
      assert.equal(
        view.getByRole("heading", { level: 1 }).textContent,
        unit.title[locale],
      );
      assert.ok(
        view.getByRole("img", { name: unit.cultureStop!.photo.alt[locale] }),
      );
      assert.ok(view.getByRole("link", { name: locale.toUpperCase() }));
      assert.equal(starts, 0);
      cleanup();
      const dashboard = render(
        React.createElement(GermanCourseDashboard, {
          catalog: germanCatalog,
          locale,
          audioReady: true,
        }),
      );
      assert.equal(
        dashboard
          .getAllByRole("link")
          .filter((a) => /\/parcours\/u\d/.test(a.getAttribute("href") ?? ""))
          .length,
        1,
      );
      assert.equal(dashboard.container.querySelectorAll('[data-unlocked="false"]').length, 3);
      click(dashboard.getByRole('button',{name:{fr:'Étapes suivantes',en:'Next stops',es:'Etapas siguientes'}[locale]}));
      assert.equal(dashboard.container.querySelectorAll('[data-unlocked="false"]').length, germanCatalog.units.length - 4);
      assert.equal(dashboard.container.querySelector('.yo-shared-continue'),null);
      assert.equal(starts, 0);
    },
  );
test("independent practice persists only in German storage and resumes on reload", () => {
  window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY, "untouched-italian");
  const view = mount();
  click(view.getByRole("button", { name: "Pratiquer" }));
  pairs(view);
  assert.equal(saved().activities[match.id].independent, true);
  assert.equal(
    window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),
    "untouched-italian",
  );
  assert.equal(saved().resume?.activityId, match.id);
  cleanup();
  mount();
  assert.equal(saved().activities[match.id].completed, true);
});
test("help and incorrect pairs record assistance, fresh replay can prove independence", () => {
  const view = mount();
  click(view.getByRole("button", { name: "Pratiquer" }));
  const left = within(
      view.getByRole("group", { name: "Expressions allemandes" }),
    ),
    right = within(view.getByRole("group", { name: "Leur sens" }));
  click(left.getByRole("button", { name: match.pairs[0].it }));
  click(right.getByRole("button", { name: match.pairs[1].meaning.fr }));
  pairs(view);
  assert.equal(saved().activities[match.id].independent, false);
  click(view.getByRole("button", { name: "Rejouer" }));
  pairs(view);
  assert.equal(saved().activities[match.id].independent, true);
});
test("skip and rapid double-next cannot award success or skip two activities", () => {
  const view = mount();
  click(view.getByRole("button", { name: "Pratiquer" }));
  const skip = view.getByRole("button", { name: "Passer sans valider" });
  act(() => {
    fireEvent.click(skip);
    fireEvent.click(skip);
  });
  flush();
  assert.ok(view.getByRole("heading", { name: lesson.activities[1].title.fr }));
  assert.deepEqual(saved().activities, {});
});
test("dictation is gated by actual playback, bundled MP3 needs no backend and keeps the answer out of its label", () => {
  const q = lesson.activities.find(
    (a) => a.kind === "type" && a.listeningText,
  )!;
  if (q.kind !== "type") throw Error("Missing dictation");
  const path =
    "/audio/yo/de/german-course-foundations/v1/german-standard/sentence/test.mp3";
  const view = mount("fr", {
    initialActivityId: q.id,
    audioPaths: { [q.listeningText!]: path },
  });
  assert.equal(view.queryByText(q.model), null);
  fireEvent.change(
    view.getByRole("textbox", { name: "Ta réponse en allemand" }),
    { target: { value: q.model } },
  );
  assert.equal(
    (view.getByRole("button", { name: "Vérifier" }) as HTMLButtonElement)
      .disabled,
    true,
  );
  fireEvent.submit(view.getByRole("textbox").closest("form")!);
  assert.deepEqual(saved().activities, {});
  click(
    view.getByRole("button", { name: "Écouter : le message de l’exercice" }),
  );
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.equal(played.at(-1), path);
  assert.equal(saved().activities[q.id].independent, true);
});
test("transcript fallback is explicitly assisted", () => {
  const q = lesson.activities.find(
    (a) => a.kind === "type" && a.listeningText,
  )!;
  if (q.kind !== "type") throw Error("Missing dictation");
  const view = mount("fr", { initialActivityId: q.id });
  click(
    view.getByRole("button", { name: "Lire la transcription (avec aide)" }),
  );
  fireEvent.change(view.getByRole("textbox"), { target: { value: q.model } });
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.equal(saved().activities[q.id].independent, false);
});
test("German answer control does not accept a missing meaningful umlaut", () => {
  const q = lesson.activities.find((a) => a.kind === "type")!;
  if (q.kind !== "type") throw Error("Missing writing");
  const results: boolean[] = [];
  const view = render(
    provider(
      React.createElement(ItalianGame, {
        activity: { ...q, model: "schön", accepted: ["schön"] },
        locale: "fr",
        onAttempt: (x: boolean) => results.push(x),
        onHelp: () => {},
      }),
    ),
  );
  fireEvent.change(
    view.getByRole("textbox", { name: "Ta réponse en allemand" }),
    { target: { value: "schon" } },
  );
  click(view.getByRole("button", { name: "Vérifier" }));
  fireEvent.change(view.getByRole("textbox"), { target: { value: "schön" } });
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.deepEqual(results, [false, true]);
  assert.equal(view.getByRole("textbox").getAttribute("lang"), "de");
});
test("assessment keeps first checked answer, resists double-next and saves only a completed run", () => {
  const assessment = {
      ...unit.quiz,
      questions: unit.quiz.questions
        .filter((q) => q.kind === "type" && !q.listeningText)
        .slice(0, 3),
    },
    events: Result[] = [];
  const view = render(
    provider(
      React.createElement(GermanAssessment, {
        assessment,
        locale: "fr",
        onComplete: (...args: Result) => events.push(args),
      }),
    ),
  );
  click(view.getByRole("button", { name: "Commencer" }));
  answer(view, assessment.questions[0], false);
  answer(view, assessment.questions[0], true);
  const next = view.getByRole("button", { name: "Continuer" });
  act(() => {
    fireEvent.click(next);
    fireEvent.click(next);
  });
  flush();
  assert.ok(
    view.getByRole("heading", { name: assessment.questions[1].prompt.fr }),
  );
  assert.equal(events.length, 0);
  answer(view, assessment.questions[1]);
  click(view.getByRole("button", { name: "Continuer" }));
  answer(view, assessment.questions[2]);
  click(view.getByRole("button", { name: "Continuer" }));
  assert.deepEqual(events, [[assessment.id, 2, 3, false]]);
  click(view.getByRole("button", { name: "Rejouer" }));
  assert.equal(events.length, 1);
});
test("culture photo reveals after answering, source access counts as help", () => {
  const q = germanCultureFinal.questions[0] as ItalianChoiceActivity & {
    photo: NonNullable<CourseQuestion["photo"]>;
  };
  const events: Result[] = [];
  const view = render(
    provider(
      React.createElement(GermanAssessment, {
        assessment: { ...germanCultureFinal, questions: [q] },
        locale: "fr",
        onComplete: (...args: Result) => events.push(args),
      }),
    ),
  );
  click(view.getByRole("button", { name: "Commencer" }));
  assert.equal(view.queryByText(q.photo.caption.fr), null);
  click(view.getByRole("link", { name: "Source de la photo" }));
  answer(view, q);
  assert.ok(view.getByText(q.photo.caption.fr));
  assert.equal(view.getAllByText(q.explanation.fr).length, 1);
  assert.ok(
    view
      .getByRole("link", { name: "À revoir" })
      .getAttribute("href")
      ?.includes("u01"),
  );
  click(view.getByRole("button", { name: "Continuer" }));
  assert.deepEqual(events, [[germanCultureFinal.id, 1, 1, true]]);
});
test("cross-tab reset cancels an in-progress final without contaminating Italian progress", () => {
  const view = render(
    React.createElement(GermanCourseFinal, {
      assessment: unit.quiz,
      catalog: germanCatalog,
      locale: "fr",
      audioPaths: {},
    }),
  );
  click(view.getByRole("button", { name: "Commencer" }));
  answer(view, unit.quiz.questions[0]);
  const reset = JSON.stringify(resetCourseProgress(emptyCourseProgress()));
  window.localStorage.setItem(GERMAN_PROGRESS_KEY, reset);
  act(() =>
    window.dispatchEvent(
      new dom.window.StorageEvent("storage", {
        key: GERMAN_PROGRESS_KEY,
        newValue: reset,
      }),
    ),
  );
  flush();
  assert.ok(view.getByRole("button", { name: "Commencer" }));
  assert.deepEqual(saved().assessments, {});
});
test("workshop draft survives interruption; self-review is not a quiz score", () => {
  let view = mount();
  click(view.getByRole("button", { name: "À toi de créer" }));
  fireEvent.change(view.getByRole("textbox", { name: "À toi de créer" }), {
    target: { value: "Guten Tag! Ich heiße Sami." },
  });
  cleanup();
  view = mount();
  click(view.getByRole("button", { name: "À toi de créer" }));
  assert.equal(
    (view.getByRole("textbox") as HTMLTextAreaElement).value,
    "Guten Tag! Ich heiße Sami.",
  );
  for (const criterion of unit.production.rubric)
    click(view.getByRole("checkbox", { name: criterion.fr }));
  click(view.getByRole("button", { name: "J’ai relu ma scène" }));
  assert.equal(saved().productions[unit.production.id], true);
  assert.deepEqual(saved().assessments, {});
  assert.equal(
    window.localStorage.getItem(GERMAN_PROGRESS_KEY)!.includes("Guten Tag!"),
    false,
  );
});

test("mobile install invitation never covers German lessons or Yoppo, but remains available on the homepage", () => {
  const original = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: query === "(max-width: 767px)" }),
  });
  try {
    for (const pathname of [
      "/",
      "/yo/langues/allemand/parcours",
      "/yo/langues/allemand/parcours/u01",
      "/yo/langues/allemand/parcours/culture",
    ]) {
      const view = render(
        React.createElement(
          PathnameContext.Provider,
          { value: pathname },
          React.createElement(InstallAppPrompt),
        ),
      );
      assert.equal(
        view.queryAllByRole("complementary").length,
        pathname === "/" ? 1 : 0,
      );
      cleanup();
    }
  } finally {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: original,
    });
  }
});

let failures = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log("PASS " + name);
  } catch (error) {
    failures++;
    console.error("FAIL " + name);
    console.error(error);
  } finally {
    cleanup();
    flush();
    window.localStorage.clear();
    starts = 0;
    played.length = 0;
  }
}
dom.window.close();
console.log(
  cases.length + " German interaction cases, " + failures + " failures",
);
if (failures) process.exitCode = 1;
