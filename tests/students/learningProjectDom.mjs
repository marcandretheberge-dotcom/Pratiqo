import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom = new JSDOM('<div id="root"></div>', {
  url: "https://example.test/dashboard",
});
global.window = dom.window;
global.self = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.Event = dom.window.Event;
global.sessionStorage = dom.window.sessionStorage;
global.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
load("tsx/cjs");
const React = load("react");
const {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} = load("@testing-library/react");
const { LearningProjectCard } = load(
  load("node:path").resolve("components/student/LearningProjectCard.tsx"),
);
let stored = null,
  fail = false,
  writes = 0;
const transport = async (_id, payload) => {
  if (payload) {
    writes++;
    if (fail) throw new Error(fail === "limited" ? "rate_limited" : "offline");
    stored =
      payload.action === "save"
        ? {
            ...payload,
            completed_at: new Date().toISOString(),
            dismissed_at: null,
            updated_at: new Date().toISOString(),
          }
        : {
            subject: "",
            city: "",
            format: "in_person",
            audience: "self",
            completed_at: null,
            dismissed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
  }
  return {
    project: stored,
    searchHref: stored?.completed_at
      ? "/student/search?q=espagnol&format=online"
      : null,
  };
};
function mount() {
  return render(
    React.createElement(LearningProjectCard, {
      userId: "fixture-a",
      locale: "fr",
      transport,
    }),
  );
}
(async () => {
  let view = mount();
  await screen.findByRole("button", { name: "Continuer" });
  assert.equal(writes, 0);
  fireEvent.change(screen.getByLabelText("Une matière ou une envie"), {
    target: { value: "Espagnol" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
  fireEvent.click(screen.getByLabelText("En ligne"));
  assert.equal(screen.queryByLabelText("Dans quelle ville ?"), null);
  view.unmount();
  view = mount();
  await screen.findByRole("button", { name: "Enregistrer mon projet" });
  assert.ok(
    screen.getByLabelText("En ligne").checked,
    "interrupted step/format recovered",
  );
  fail = true;
  fireEvent.click(
    screen.getByRole("button", { name: "Enregistrer mon projet" }),
  );
  await screen.findByRole("alert");
  assert.ok(screen.getByLabelText("En ligne").checked);
  fail = "limited";
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer mon projet" }));
  await screen.findByText(/Attends une minute/);
  assert.ok(screen.getByLabelText("En ligne").checked, "quota failure keeps the form and draft");
  fail = false;
  fireEvent.click(
    screen.getByRole("button", { name: "Enregistrer mon projet" }),
  );
  await screen.findByText("Ton projet est enregistré.");
  assert.equal(
    sessionStorage.getItem("pratiqo:learning-project:v1:fixture-a"),
    null,
  );
  assert.ok(screen.getByRole("link", { name: "Voir les profs en ligne" }));
  view.unmount();
  view = mount();
  await screen.findByRole("button", { name: "Modifier" });
  assert.equal(
    screen.queryByRole("button", { name: "Continuer" }),
    null,
    "saved project does not restart onboarding",
  );
  fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
  fireEvent.change(screen.getByLabelText("Une matière ou une envie"), {
    target: { value: "Piano" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
  assert.ok(
    screen.getByText("Espagnol"),
    "unsaved edits do not change saved summary",
  );
  view.unmount();
  view = mount();
  await screen.findByLabelText("Une matière ou une envie");
  assert.equal(
    screen.getByLabelText("Une matière ou une envie").value,
    "Piano",
    "a newer edit draft resumes without silently presenting only the old saved project",
  );
  cleanup();
  sessionStorage.clear();
  stored = null;
  view = mount();
  await screen.findByRole("button", { name: "Je découvre d’abord" });
  fireEvent.click(screen.getByRole("button", { name: "Je découvre d’abord" }));
  await screen.findByText("Tu pourras définir ton projet quand tu voudras.");
  view.unmount();
  view = mount();
  await screen.findByRole("button", { name: "Définir mon projet" });
  assert.equal(screen.queryByRole("button", { name: "Continuer" }), null);
  cleanup();
  render(
    React.createElement(LearningProjectCard, {
      userId: "fixture-b",
      locale: "fr",
      transport: async () => {
        throw new Error("read failure");
      },
    }),
  );
  await screen.findByText(
    "Ton projet est temporairement indisponible. Tu peux continuer à utiliser Pratiqo.",
  );
  assert.equal(screen.queryByRole("button", { name: "Continuer" }), null);
  cleanup();
  console.log(
    "PASS simulated DOM: two-step flow, online city omission, interruption/recovery, network failure/retry, saved summary, skip persistence, read errors",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => dom.window.close());
