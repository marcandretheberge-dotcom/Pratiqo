const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<div id="root"></div>', { url: "https://example.test/admin/learning-project-demand" });
Object.assign(global, { window: dom.window, self: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
require("tsx/cjs");
const React = require("react");
const { render, screen, fireEvent, cleanup, waitFor } = require("@testing-library/react");
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function(id, ...rest) {
  if (id === "@/lib/supabase") return { getSupabaseClient: () => ({ auth: { getSession: async () =>
    ({ data: { session: { access_token: "synthetic-only" } } }) } }) };
  return originalLoad.call(this, id, ...rest);
};
const { StudentLearningDirectory } = require(require("node:path").resolve("components/admin/StudentLearningDirectory.tsx"));
Module._load = originalLoad;
const first = { id: "fixture-1", name: "Élève Alpha", email: "alpha@example.test", profile_city: "Québec",
  project_city: "St-Georges", subject: "Espagnol", audience: "self", format: "in_person", status: "declared",
  inactive: false, created_at: "2026-10-18", project_updated_at: "2026-10-18T12:00:00Z" };
const unanswered = { ...first, id: "fixture-2", name: "Élève Beta", email: "beta@example.test", profile_city: null,
  project_city: null, subject: null, audience: null, format: null, status: "unanswered", project_updated_at: null };
let requests = [], fail = false;
global.fetch = async (path, options) => {
  assert.equal(options.cache, "no-store");
  assert.equal(options.headers.Authorization, "Bearer synthetic-only");
  const params = new URL(path, "https://example.test").searchParams;
  requests.push(params);
  if (fail) return new Response('{}', { status: 503 });
  const filtered = params.get("status") === "unanswered";
  const page = Number(params.get("page"));
  return new Response(JSON.stringify({ directory: { page, pageSize: 25,
    total: filtered ? 1 : 26, students: filtered || page === 2 ? [unanswered] : [first, unanswered] } }));
};
(async () => {
  render(React.createElement(StudentLearningDirectory));
  await screen.findByRole("link", { name: "Élève Alpha" });
  assert.equal(screen.getByRole("link", { name: "Élève Alpha" }).getAttribute("href"), "/admin/users/fixture-1");
  assert.ok(screen.getByText("Québec")); assert.ok(screen.getByText("St-Georges"));
  assert.ok(screen.getByText("Ville souhaitée pour les cours"));
  assert.ok(screen.getByText("Non renseignée")); assert.ok(screen.getByText("Besoin non renseigné"));
  fireEvent.click(screen.getByRole("button", { name: "Suivante" }));
  await screen.findByText("Page 2 / 2");
  assert.equal(screen.queryByRole("link", { name: "Élève Alpha" }), null);
  fireEvent.change(screen.getByLabelText("Nom, courriel, ville ou matière"), { target: { value: "St-Georges" } });
  fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
  await screen.findByText("Page 1 / 2");
  assert.equal(requests.at(-1).get("q"), "St-Georges");
  fireEvent.change(screen.getByLabelText("Réponse au projet"), { target: { value: "unanswered" } });
  await screen.findByText("Page 1 / 1");
  assert.equal(requests.at(-1).get("status"), "unanswered");
  fail = true;
  fireEvent.click(screen.getByRole("button", { name: "Actualiser la liste" }));
  await screen.findByRole("alert");
  assert.equal(screen.queryByRole("list", { name: "Liste des élèves" }), null, "failed request hides stale data");
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Réessayer la liste" }));
  await waitFor(() => assert.ok(screen.getByRole("link", { name: "Élève Beta" })));
  cleanup();
  console.log("PASS admin directory UI: identity, separate city sources, missing answers, search, pagination/filter reset, failure and recovery");
})().catch(error => { console.error(error); process.exitCode = 1; });
