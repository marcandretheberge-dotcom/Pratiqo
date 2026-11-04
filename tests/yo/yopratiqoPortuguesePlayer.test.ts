import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { CourseExperience } from "@/components/yo/german/CourseExperience";
import { GermanCourseUnit } from "@/components/yo/german/GermanCourseUnit";
import { GermanCourseDashboard } from "@/components/yo/german/GermanCourseDashboard";
import { GermanAssessment } from "@/components/yo/german/GermanAssessment";
import { ItalianAudioProvider } from "@/components/yo/italian/ItalianAudioProvider";
import { ItalianGame } from "@/components/yo/italian/ItalianGames";
import {
  portugueseCourseUnits as units,
  portugueseCatalog as catalog,
  portugueseCultureFinal,
} from "@/lib/yo/portuguese/courseData";
import { portugueseAudioPaths } from "@/lib/yo/portuguese/courseAudio.server";
import { PORTUGUESE_PROGRESS_KEY } from "@/lib/yo/portuguese/courseLogic";
import { GERMAN_PROGRESS_KEY } from "@/lib/yo/german/courseLogic";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/yo/langues/portugais-bresil/parcours/u01",
  pretendToBeVisual: true,
});
const played: string[] = [],
  frames: FrameRequestCallback[] = [];
class FakeAudio extends dom.window.EventTarget {
  preload = "none";
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  constructor(public src: string) {
    super();
    played.push(src);
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
for (const [key, value] of Object.entries({
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
}))
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  });
const { render, cleanup, fireEvent, within, act } =
  require("@testing-library/react") as typeof import("@testing-library/react");
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
const unit = units[0],
  lesson = unit.lessons[0];
function flush() {
  const pending = frames.splice(0);
  act(() => pending.forEach((f) => f(0)));
}
function click(node: HTMLElement) {
  fireEvent.click(node);
  flush();
}
const saved = (): CourseProgress =>
  JSON.parse(window.localStorage.getItem(PORTUGUESE_PROGRESS_KEY) ?? "{}");
function wrap(node: React.ReactNode) {
  return React.createElement(
    CourseExperience,
    {
      language: "pt-BR",
    } as React.ComponentProps<typeof CourseExperience>,
    node,
  );
}
function mount(
  locale: "fr" | "en" | "es" = "fr",
  extra: Record<string, unknown> = {},
) {
  return render(
    wrap(
      React.createElement(GermanCourseUnit, {
        unit,
        catalog,
        locale,
        audioPaths: portugueseAudioPaths(unit),
        ...extra,
      }),
    ),
  );
}
for (const locale of ["fr", "en", "es"] as const)
  test(`${locale}: Brazilian content, navigation, photo, language and no autoplay`, () => {
    const view = mount(locale);
    assert.equal(
      view.getByRole("heading", { level: 1 }).textContent,
      unit.title[locale],
    );
    assert.ok(
      view.getByRole("img", { name: unit.cultureStop!.photo.alt[locale] }),
    );
    assert.ok(view.container.querySelector('[lang="pt-BR"]'));
    assert.match(view.container.textContent!, /PORTUGUÊS DO BRASIL/);
    assert.doesNotMatch(view.container.textContent!, /DEUTSCH/);
    assert.deepEqual(played, []);
    cleanup();
    const dashboard = render(
      wrap(
        React.createElement(GermanCourseDashboard, {
          catalog,
          locale,
          audioReady: true,
        }),
      ),
    );
    const links = dashboard
      .getAllByRole("link")
      .filter((a) => /\/parcours\/u\d/.test(a.getAttribute("href") ?? ""));
    assert.equal(links.length, 2);
    assert.equal(dashboard.container.querySelectorAll('[data-unlocked="false"]').length,catalog.units.length-1);
    assert.equal(
      dashboard
        .getAllByRole("link")
        .some(
          (a) =>
            a.getAttribute("href") ===
            `/yo/langues/portugais-bresil/parcours/final?lang=${locale}`,
        ), false,
    );
    assert.equal(
      dashboard
        .getAllByRole("link")
        .some(
          (a) =>
            a.getAttribute("href") ===
            `/yo/langues/portugais-bresil/parcours/culture?lang=${locale}`,
        ), false,
    );
    assert.ok(
      links.every((a) =>
        a.getAttribute("href")?.startsWith("/yo/langues/portugais-bresil/"),
      ),
    );
  });

test("real matching persists independently, resumes and does not touch German progress", () => {
  window.localStorage.setItem(GERMAN_PROGRESS_KEY, "untouched");
  const view = mount(),
    match = lesson.activities.find((a) => a.kind === "match")!;
  if (match.kind !== "match") throw Error("Missing pairs");
  click(view.getByRole("button", { name: "Pratiquer" }));
  const left = within(
    view.getByRole("group", { name: "Expressions portugaises" }),
  );
  const right = within(view.getByRole("group", { name: "Leur sens" }));
  for (const p of match.pairs) {
    click(left.getByRole("button", { name: p.it }));
    click(right.getByRole("button", { name: p.meaning.fr }));
  }
  assert.equal(saved().activities[match.id].independent, true);
  assert.equal(saved().resume?.activityId, match.id);
  cleanup();
  mount();
  assert.equal(saved().activities[match.id].completed, true);
  assert.equal(window.localStorage.getItem(GERMAN_PROGRESS_KEY), "untouched");
});

test("dictation needs actual pt-BR playback and does not leak the answer in the audio label", () => {
  const q = lesson.activities.find(
    (a) => a.kind === "type" && a.listeningText,
  )!;
  if (q.kind !== "type") throw Error("Missing dictation");
  const view = mount("fr", { initialActivityId: q.id });
  assert.equal(view.queryByText(q.model), null);
  fireEvent.change(
    view.getByRole("textbox", { name: "Ta réponse en portugais du Brésil" }),
    { target: { value: q.model } },
  );
  assert.equal(
    (view.getByRole("button", { name: "Vérifier" }) as HTMLButtonElement)
      .disabled,
    true,
  );
  click(
    view.getByRole("button", { name: "Écouter : le message de l’exercice" }),
  );
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.match(played.at(-1)!, /^\/audio\/yo\/pt-br\//);
  assert.equal(saved().activities[q.id].independent, true);
});

test("Portuguese answer UI rejects a changed accent and offers the pt-BR keyboard", () => {
  const q = lesson.activities.find((a) => a.kind === "type")!;
  if (q.kind !== "type") throw Error("Missing type");
  const results: boolean[] = [];
  const view = render(
    wrap(
      React.createElement(
        ItalianAudioProvider,
        {
          language: "pt-BR",
          paths: {},
        } as React.ComponentProps<typeof ItalianAudioProvider>,
        React.createElement(ItalianGame, {
          activity: {
            ...q,
            model: "avó",
            accepted: ["avó"],
            listeningText: undefined,
          },
          locale: "fr",
          onAttempt: (x) => results.push(x),
          onHelp: () => {},
        }),
      ),
    ),
  );
  fireEvent.change(view.getByRole("textbox"), { target: { value: "avô" } });
  click(view.getByRole("button", { name: "Vérifier" }));
  fireEvent.change(view.getByRole("textbox"), { target: { value: "avó" } });
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.deepEqual(results, [false, true]);
  assert.equal(view.getByRole("textbox").getAttribute("lang"), "pt-BR");
  assert.ok(view.getByRole("button", { name: "Ajouter ã" }));
});

test("workshop draft survives interruption without becoming a quiz score", () => {
  let view = mount();
  click(view.getByRole("button", { name: "À toi de créer" }));
  assert.equal(
    view.getAllByRole("heading", { name: unit.production.title.fr }).length,
    1,
  );
  fireEvent.change(view.getByRole("textbox"), {
    target: { value: "Olá! Eu sou a Ana." },
  });
  cleanup();
  view = mount();
  click(view.getByRole("button", { name: "À toi de créer" }));
  assert.equal(
    (view.getByRole("textbox") as HTMLTextAreaElement).value,
    "Olá! Eu sou a Ana.",
  );
  for (const c of unit.production.rubric)
    click(view.getByRole("checkbox", { name: c.fr }));
  click(view.getByRole("button", { name: "J’ai relu ma scène" }));
  assert.equal(saved().productions[unit.production.id], true);
  assert.deepEqual(saved().assessments, {});
  assert.equal(
    window.localStorage.getItem(PORTUGUESE_PROGRESS_KEY)!.includes("Olá!"),
    false,
  );
});

test("culture answer reveals the real place and links back to the taught Brazilian unit", () => {
  const q = portugueseCultureFinal.questions[0];
  if (q.kind !== "choice" || !q.photo) throw Error("Missing photo question");
  const events: unknown[] = [];
  const view = render(
    wrap(
      React.createElement(GermanAssessment, {
        assessment: { ...portugueseCultureFinal, questions: [q] },
        locale: "fr",
        onComplete: (...args) => events.push(args),
      }),
    ),
  );
  click(view.getByRole("button", { name: "Commencer" }));
  assert.equal(view.queryByText(q.photo.caption.fr), null);
  const choice = q.options.find((o) => o.id === q.correctId)!;
  click(view.getByRole("button", { name: choice.it ?? choice.label!.fr }));
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.ok(view.getByText(q.photo.caption.fr));
  assert.match(
    view.getByRole("link", { name: "À revoir" }).getAttribute("href")!,
    /^\/yo\/langues\/portugais-bresil\/parcours\/u01/,
  );
  click(view.getByRole("button", { name: "Continuer" }));
  assert.deepEqual(events, [[portugueseCultureFinal.id, 1, 1, false]]);
});

test("practice prices use reais, not the German or Italian currency", () => {
  const activity = units
    .flatMap((u) => u.lessons.flatMap((l) => l.activities))
    .find((a) => a.kind === "cafe")!;
  const view = render(
    wrap(
      React.createElement(
        ItalianAudioProvider,
        { language: "pt-BR", paths: {} } as React.ComponentProps<
          typeof ItalianAudioProvider
        >,
        React.createElement(ItalianGame, {
          activity,
          locale: "fr",
          onAttempt: () => {},
          onHelp: () => {},
        }),
      ),
    ),
  );
  assert.match(view.container.textContent!, /R\$/);
  assert.doesNotMatch(view.container.textContent!, /€/);
});

test("completed Brazilian language final leads directly to its cultural final", () => {
  const q = lesson.activities.find(
    (a) => a.kind === "type" && !a.listeningText,
  )!;
  if (q.kind !== "type") throw Error("Missing writing");
  const assessment = { ...unit.quiz, id: "ptbr1-final", questions: [q] };
  const view = render(
    wrap(
      React.createElement(
        ItalianAudioProvider,
        { language: "pt-BR", paths: {} } as React.ComponentProps<
          typeof ItalianAudioProvider
        >,
        React.createElement(GermanAssessment, {
          assessment,
          locale: "fr",
          onComplete: () => {},
        }),
      ),
    ),
  );
  click(view.getByRole("button", { name: "Commencer" }));
  fireEvent.change(view.getByRole("textbox"), { target: { value: q.model } });
  click(view.getByRole("button", { name: "Vérifier" }));
  click(view.getByRole("button", { name: "Continuer" }));
  assert.ok(
    view
      .getAllByRole("link")
      .some(
        (a) =>
          a.getAttribute("href") ===
          "/yo/langues/portugais-bresil/parcours/culture?lang=fr",
      ),
  );
});

let failures = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log("PASS " + name);
  } catch (error) {
    failures++;
    console.error("FAIL " + name, error);
  } finally {
    cleanup();
    flush();
    window.localStorage.clear();
    played.length = 0;
  }
}
dom.window.close();
console.log(
  `${cases.length} Portuguese interaction cases, ${failures} failures`,
);
if (failures) process.exitCode = 1;
