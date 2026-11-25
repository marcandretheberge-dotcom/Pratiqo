import assert from "node:assert/strict";
import { mandarinJourneyUnits, mandarinFinalIds } from "@/lib/yo/foundationJourneyCatalogs";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import {
  MandarinCoursePlayer,
  mandarinStages,
} from "@/components/yo/mandarin/MandarinCoursePlayer";
import { MandarinExercise } from "@/components/yo/mandarin/MandarinExercise";
import { MandarinAudio } from "@/components/yo/mandarin/MandarinAudio";
import { MandarinCharacter } from "@/components/yo/mandarin/MandarinCharacter";
import { InstallAppPrompt } from "@/components/app/InstallAppPrompt";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { mandarinUnits, mandarinFinal } from "@/lib/yo/mandarin/course";
import {
  emptyProgress,
  evaluate,
  initialAttempt,
  MANDARIN_PROGRESS_KEY,
} from "@/lib/yo/mandarin/progress";
import type {
  Attempt,
  Exercise,
  Progress,
  Result,
} from "@/lib/yo/mandarin/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/yo/langues/mandarin/parcours/u01",
  pretendToBeVisual: true,
});
const frames: FrameRequestCallback[] = [];
const audios: FakeAudio[] = [];
class FakeAudio {
  preload = "none";
  playbackRate = 1;
  preservesPitch = true;
  onended: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onwaiting: (() => void) | null = null;
  paused = false;
  constructor(public src: string) {
    audios.push(this);
  }
  play() {
    this.onplaying?.();
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  removeAttribute() {}
  load() {}
}
dom.window.HTMLElement.prototype.scrollTo = function (
  options: ScrollToOptions,
) {
  this.scrollTop = options.top ?? 0;
};
dom.window.scrollTo = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
for (const [key, value] of Object.entries({
  window: dom.window,
  self: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Event: dom.window.Event,
  localStorage: dom.window.localStorage,
  Audio: FakeAudio,
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
const { render, cleanup, fireEvent, act, within } =
  require("@testing-library/react") as typeof import("@testing-library/react");
function click(element: HTMLElement) {
  fireEvent.click(element);
  act(() => frames.splice(0).forEach((fn) => fn(0)));
}
function saved(): Progress {
  return JSON.parse(localStorage.getItem(MANDARIN_PROGRESS_KEY) ?? "{}");
}
function mount(step?: string) {
  if (step) {
    const state = emptyProgress();
    state.steps.u01 = mandarinStages(mandarinUnits[0]).indexOf(step);
    localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify(state));
  }
  return render(
    React.createElement(MandarinCoursePlayer, {
      journeyUnits: mandarinJourneyUnits, finalIds: mandarinFinalIds,
      unit: mandarinUnits[0],
      locale: "fr",
    }),
  );
}
const cases: [string, () => void | Promise<void>][] = [];
const test = (name: string, run: () => void | Promise<void>) =>
  cases.push([name, run]);
test("typed draft survives trivia, three-question invitation, one more, minimize and refresh", () => {
  const exercise = mandarinUnits[0].exercises.find(
    (item) => item.kind === "write",
  )!;
  let view = mount(exercise.id);
  fireEvent.change(view.getByLabelText("Ta réponse"), {
    target: { value: "Nǐ hǎo" },
  });
  const before = saved();
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  click(view.getByRole("button", { name: "Découvrir quelque chose" }));
  const round = () => {
    const dialog = within(view.getByRole("dialog"));
    const choice = dialog
      .getAllByRole("button")
      .find((node) => node.hasAttribute("aria-pressed"))!;
    click(choice);
    click(dialog.getByRole("button", { name: "Vérifier" }));
    click(dialog.getByRole("button", { name: "Continuer" }));
  };
  round();
  round();
  round();
  assert.ok(view.getByText("Une belle pause ! On reprend ?"));
  click(view.getByRole("button", { name: "Encore une question" }));
  assert.equal(view.queryByText("Une belle pause ! On reprend ?"), null);
  round();
  assert.ok(view.getByText("Une belle pause ! On reprend ?"));
  click(view.getAllByRole("button", { name: "Revenir à ma leçon" })[0]);
  assert.equal(
    (view.getByLabelText("Ta réponse") as HTMLInputElement).value,
    "Nǐ hǎo",
  );
  assert.deepEqual(saved().results, before.results);
  assert.equal(saved().trivia, 4);
  assert.equal(saved().steps.u01, before.steps.u01);
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  click(view.getByRole("button", { name: "Réduire" }));
  assert.equal(
    (view.getByLabelText("Ta réponse") as HTMLInputElement).value,
    "Nǐ hǎo",
  );
  cleanup();
  view = mount();
  assert.equal(
    (view.getByLabelText("Ta réponse") as HTMLInputElement).value,
    "Nǐ hǎo",
  );
});
test("contextual hint and retry never award independent success after showing model", () => {
  const exercise = mandarinUnits[0].exercises.find(
    (item) => item.kind === "write",
  )!;
  const view = mount(exercise.id);
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  click(view.getByRole("button", { name: "Aide-moi" }));
  click(view.getByRole("button", { name: "Réessayer l’exercice" }));
  click(view.getByRole("button", { name: "Revenir à ma leçon" }));
  fireEvent.change(view.getByLabelText("Ta réponse"), {
    target: { value: exercise.model.hanzi },
  });
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.equal(saved().results[exercise.id].passed, true);
  assert.equal(saved().results[exercise.id].independent, false);
  assert.ok(view.getByText("Réussi avec aide"));
  click(view.getByRole("button", { name: "Réessayer" }));
  fireEvent.change(view.getByLabelText("Ta réponse"), {
    target: { value: exercise.model.hanzi },
  });
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.equal(saved().results[exercise.id].attempts, 2);
});
test("listening requires ended audio; errors and interrupted playback cannot validate", () => {
  const exercise = mandarinUnits[0].exercises.find(
    (item) => item.kind === "listen",
  )!;
  const view = mount(exercise.id);
  click(view.getByRole("button", { name: "Bonjour !" }));
  assert.equal(
    (view.getByRole("button", { name: "Vérifier" }) as HTMLButtonElement)
      .disabled,
    true,
  );
  click(view.getByRole("button", { name: "Écouter : le message" }));
  const audio = audios.at(-1)!;
  assert.match(audio.src, /^\/audio\/yo\/zh\//);
  act(() => audio.onerror?.());
  assert.ok(view.getByText(/Audio indisponible/));
  assert.equal(
    (view.getByRole("button", { name: "Vérifier" }) as HTMLButtonElement)
      .disabled,
    true,
  );
  click(view.getByRole("button", { name: "Écouter : le message" }));
  act(() => audios.at(-1)!.onended?.());
  click(view.getByRole("button", { name: "Vérifier" }));
  assert.equal(saved().results[exercise.id].passed, true);
});
test("audio never overlaps, playback is explicit and unavailable source is honest", () => {
  const view = render(
    React.createElement(
      "div",
      null,
      React.createElement(MandarinAudio, { text: "你好！", locale: "en" }),
      React.createElement(MandarinAudio, { text: "谢谢！", locale: "en" }),
      React.createElement(MandarinAudio, {
        text: "missing-recording",
        locale: "en",
      }),
    ),
  );
  assert.equal(audios.length, 0);
  click(view.getByRole("button", { name: "Listen : 你好！" }));
  const first = audios[0];
  click(view.getByRole("button", { name: "Listen : 谢谢！" }));
  assert.equal(first.paused, true);
  click(view.getByRole("button", { name: "Listen : missing-recording" }));
  assert.ok(view.getByText(/Audio unavailable/));
});
test("all module/final activity controls submit a checked result in three locales", () => {
  for (const locale of ["fr", "en", "es"] as const)
    for (const exercise of [...mandarinUnits, mandarinFinal].flatMap(
      (unit) => unit.exercises,
    )) {
      let result: Result | null = null;
      function Harness() {
        const [state, setState] = React.useState<Attempt>(() =>
          initialAttempt(exercise),
        );
        return React.createElement(MandarinExercise, {
          exercise,
          state,
          locale,
          pinyin: true,
          onChange: setState,
          onResult: (value: Result) => {
            result = value;
          },
        });
      }
      const view = render(React.createElement(Harness));
      if (exercise.kind === "write")
        fireEvent.change(view.getByRole("textbox"), {
          target: { value: exercise.accepted[0] },
        });
      else if (exercise.kind === "build")
        for (const token of exercise.answer)
          click(
            view
              .getAllByRole("button", { name: token })
              .find((node) => !(node as HTMLButtonElement).disabled)!,
          );
      else if (exercise.kind === "match")
        view
          .getAllByRole("combobox")
          .forEach((select, i) =>
            fireEvent.change(select, { target: { value: String(i) } }),
          );
      else {
        const choice = exercise.choices.find(
          (item) => item.id === exercise.answer,
        )!;
        const label = choice.phrase
          ? choice.phrase.hanzi
          : choice.label![locale];
        click(view.getByText(label, { exact: true }).closest("button")!);
        if (exercise.kind === "listen" || exercise.kind === "tone") {
          click(
            view.getByRole("button", { name: /^(Écouter|Listen|Escuchar) :/ }),
          );
          act(() => audios.at(-1)!.onended?.());
        }
      }
      click(
        view.getByRole("button", {
          name: { fr: "Vérifier", en: "Check", es: "Verificar" }[locale],
        }),
      );
      assert.equal(
        (result as Result | null)?.passed,
        true,
        locale + exercise.id,
      );
      cleanup();
    }
});
test("blocked storage does not break practice; malformed storage starts safely", () => {
  localStorage.setItem(MANDARIN_PROGRESS_KEY, "{broken");
  const view = mount();
  assert.ok(view.getByRole("heading", { name: "Mission" }));
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage")!;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw Error("blocked");
    },
  });
  click(view.getByRole("button", { name: "Suivant" }));
  assert.ok(view.getByText(/Sauvegarde indisponible/));
  Object.defineProperty(globalThis, "localStorage", original);
});
test("final mission offers real picture matching and sentence games without awarding course mastery", () => {
  // Preserve an existing final session; direct access for a new learner is tested separately.
  localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify({ ...emptyProgress(), unit: "bilan" }));
  const view = render(
    React.createElement(MandarinCoursePlayer, {
      journeyUnits: mandarinJourneyUnits, finalIds: mandarinFinalIds,
      unit: mandarinFinal,
      locale: "en",
    }),
  );
  click(view.getByRole("button", { name: "Open Yoppo" }));
  click(view.getByRole("button", { name: "Let's play" }));
  const dialog = within(view.getByRole("dialog"));
  fireEvent.change(dialog.getByLabelText("Your mini-game"), {
    target: { value: "match" },
  });
  assert.ok(
    dialog.getByRole("heading", {
      name: "Match the pictures to the Chinese words.",
    }),
  );
  for (const [i, name] of ["tea", "apple", "noodles"].entries())
    fireEvent.change(dialog.getByLabelText(name), {
      target: { value: String(i) },
    });
  click(dialog.getByRole("button", { name: "Check" }));
  assert.deepEqual(saved().results ?? {}, {});
  fireEvent.change(dialog.getByLabelText("Your mini-game"), {
    target: { value: "build" },
  });
  for (const word of ["我", "要", "一杯", "茶"])
    click(dialog.getByRole("button", { name: word }));
  click(dialog.getByRole("button", { name: "Check" }));
  assert.ok(dialog.getByText("Correct answer"));
});
test("changing stages resets only lesson scroll; discoveries do not repeat across remounts", () => {
  let view = mount();
  const scroller = view.getByRole("heading", {
    name: "Mission",
  }).parentElement!;
  scroller.scrollTop = 400;
  click(view.getByRole("button", { name: "Suivant" }));
  assert.equal(scroller.scrollTop, 0);
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  click(view.getByRole("button", { name: "Découvrir quelque chose" }));
  const question = within(view.getByRole("dialog")).getByRole("heading", {
    level: 3,
  }).textContent;
  view.unmount();
  view = mount();
  click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
  click(view.getByRole("button", { name: "Découvrir quelque chose" }));
  assert.notEqual(
    within(view.getByRole("dialog")).getByRole("heading", { level: 3 })
      .textContent,
    question,
  );
});
test("mobile install prompt stays off Mandarin controls but remains available on the homepage", () => {
  const original = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: query === "(max-width: 767px)" }),
  });
  try {
    for (const pathname of [
      "/",
      "/yo/langues/mandarin/parcours",
      "/yo/langues/mandarin/parcours/u01",
      "/yo/langues/mandarin/parcours/bilan",
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
test("stroke fetch failure can be retried without reporting a handwriting grade", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    if (++calls === 1) throw Error("offline");
    return new Response(JSON.stringify({ strokes: ["M1 1L2 2", "M2 2L3 3"] }));
  };
  try {
    const view = render(
      React.createElement(MandarinCharacter, { character: "人", locale: "en" }),
    );
    await act(async () => {});
    assert.ok(view.getByText("Stroke model unavailable."));
    await act(async () => {
      click(view.getByRole("button", { name: "Try again" }));
    });
    assert.ok(view.getByRole("img", { name: "人 · 1/2" }));
    click(view.getByRole("button", { name: "Next stroke" }));
    assert.ok(view.getByRole("img", { name: "人 · 2/2" }));
    assert.ok(view.getByText(/no handwriting grade/));
  } finally {
    globalThis.fetch = original;
  }
});
test("final completion requires checked exercises, not trivia or self-assessment, and survives refresh", () => {
  const state = emptyProgress();
  state.unit = "bilan";
  state.steps.bilan = mandarinStages(mandarinFinal).indexOf("summary");
  state.trivia = 60;
  state.selfAssessment["zh-final-self-0"] = true;
  localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify(state));
  const mountFinal = () =>
    render(
      React.createElement(MandarinCoursePlayer, {
        journeyUnits: mandarinJourneyUnits, finalIds: mandarinFinalIds,
        unit: mandarinFinal,
        locale: "fr",
      }),
    );
  let view = mountFinal();
  assert.ok(view.getByText("Ce qui reste à pratiquer"));
  assert.equal(view.queryByText("Les exercices sont réussis"), null);
  assert.ok(view.getByText(/^0 \/ 8/));
  cleanup();
  for (const exercise of mandarinFinal.exercises) {
    const answer =
      exercise.kind === "write"
        ? exercise.accepted[0]
        : exercise.kind === "match"
          ? Object.fromEntries(
              exercise.pairs.map((_, i) => [String(i), String(i)]),
            )
          : exercise.answer;
    state.results[exercise.id] = evaluate(exercise, {
      ...initialAttempt(exercise),
      answer,
      heard: true,
    })!;
  }
  localStorage.setItem(MANDARIN_PROGRESS_KEY, JSON.stringify(state));
  view = mountFinal();
  assert.ok(view.getByText("Les exercices sont réussis"));
  assert.ok(view.getByText(/^8 \/ 8.*8 sans aide affichée/));
  assert.equal(
    (view.getByLabelText(mandarinFinal.canDos[0].fr) as HTMLInputElement)
      .checked,
    true,
  );
  assert.equal(
    view
      .getByRole("link", { name: "Voir le parcours" })
      .getAttribute("href"),
    "/yo/langues/mandarin/parcours",
  );
  cleanup();
  view = mountFinal();
  assert.ok(view.getByText("Les exercices sont réussis"));
  assert.equal(Object.keys(saved().results).length, 8);
});
async function main() {
  for (const [name, run] of cases) {
    try {
      localStorage.clear();
      audios.splice(0);
      await run();
      console.log("PASS " + name);
    } finally {
      cleanup();
      frames.splice(0);
    }
  }
  dom.window.close();
}
void main().catch((error) => {
  dom.window.close();
  console.error(error);
  process.exitCode = 1;
});
