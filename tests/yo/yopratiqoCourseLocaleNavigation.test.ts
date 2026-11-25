/**
 * Rendered navigation regression: lesson links must preserve the learner's
 * interface language through progress loading, resume, and locale changes.
 * Runs with `node --import tsx tests/yo/yopratiqoCourseLocaleNavigation.test.ts`.
 *
 * Render the real hub, server page composition, CoursePath and resolver.
 * Stub authentication and presentation-only children; never contact a backend.
 * Awaiting the page function tests its composition, not Next's RSC transport.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInThisContext } from "node:vm";
import * as React from "react";
import ts from "typescript";

const root = process.cwd();
const nodeRequire = createRequire(path.join(root, "package.json"));
const { JSDOM } = nodeRequire("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://www.pratiqo.ca/student/yopratiqo",
});
const globals = {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(
  Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
const { render, cleanup, act } = nodeRequire("@testing-library/react") as typeof import("@testing-library/react");

type Locale = "fr" | "en" | "es";
type Snapshot = { course_id: string; module_id: string; progress_state: "completed" };
type Steps = { steps: Array<{ id: string; content: React.ReactNode }> };
let locale: Locale = "fr";
let snapshots: Snapshot[] | null = null;
let snapshotRequest: Promise<Snapshot[] | null> = Promise.resolve(null);
let fetchCount = 0;
const empty = () => null;
const steps = ({ steps: items }: Steps) => React.createElement(
  React.Fragment, null,
  ...items.map((item) => React.createElement(React.Fragment, { key: item.id }, item.content)),
);
const mocks = new Map<string, unknown>([
  ["next/link", (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => React.createElement("a", props)],
  ["lucide-react", new Proxy({}, { get: () => empty })],
  ["@/lib/utils", { cn: (...values: unknown[]) => values.filter(Boolean).join(" ") }],
  ["@/lib/locale-context", { useLocale: () => ({ locale }) }],
  ["@/lib/seo/site", { SITE_URL: "https://www.pratiqo.ca" }],
  ["@/components/companion/CompanionAvatar", { CompanionAvatar: empty }],
  ["@/components/yo/YoLanguageBadge", { YoLanguageBadge: empty }],
  ["@/lib/yo/dominicanRepublicA1", { dominicanRepublicA1: {
    module: { destinationLabel: { fr: "République dominicaine", en: "Dominican Republic", es: "República Dominicana" } },
  } }],
  ["@/lib/yopratiqo/fetchAuthenticatedProgressSnapshots", {
    fetchAuthenticatedProgressSnapshots: () => { fetchCount += 1; return snapshotRequest; },
  }],
  ["@/lib/yopratiqo/loadAuthenticatedProgressSnapshots", {
    loadAuthenticatedProgressSnapshots: async () => snapshots,
  }],
  ["@/components/yo/YoStepNavigator", { YoStepNavigator: steps }],
  ["@/components/yo/YoAdaptiveStepShell", { YoAdaptiveStepShell:
    ({ mobile, desktop }: { mobile: Steps; desktop: { center: React.ReactNode } }) =>
      React.createElement(React.Fragment, null, steps(mobile), desktop.center),
  }],
]);
for (const name of [
  "YoStudentCompanionCard", "YoCourseAppHeader", "YoCourseCompanionPanel",
  "YoCourseHero", "YoAppBottomBar", "YoPremiumModuleUnlockCTA", "YoDesktopAppWorkspace",
]) mocks.set(`@/components/yo/${name}`, { [name]: empty });
mocks.set("@/components/yo/YoAppShell", { YoAppShell: empty, YoAppShellScroller: empty });

// A local module loader keeps mocks isolated without adding a test-runner
// dependency or changing the production import graph.
const cache = new Map<string, Record<string, unknown>>();
function load(id: string): Record<string, unknown> {
  if (cache.has(id)) return cache.get(id)!;
  const base = path.join(root, id.slice(2));
  const filename = [base + ".tsx", base + ".ts"].find(existsSync);
  assert.ok(filename, `Missing source module: ${id}`);
  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const loadedModule = { exports: {} as Record<string, unknown> };
  cache.set(id, loadedModule.exports);
  const requireMock = (dependency: string) => {
    const resolved = dependency.startsWith(".")
      ? "@/" + path.relative(root, path.resolve(path.dirname(filename), dependency)).replace(/\\/g, "/")
      : dependency;
    return mocks.has(resolved) ? mocks.get(resolved)
      : resolved.startsWith("@/") ? load(resolved) : nodeRequire(resolved);
  };
  runInThisContext(`(function(require,module,exports){${js}\n})`, { filename })(
    requireMock, loadedModule, loadedModule.exports,
  );
  return loadedModule.exports;
}

const Hub = load("@/components/yo/YoStudentHubContent").YoStudentHubContent as React.ComponentType;
const CourseHome = load("@/app/yo/langues/espagnol/pays/republique-dominicaine/page").default as (
  props: { searchParams: Promise<{ lang: Locale }> },
) => Promise<React.ReactElement>;
const course = "/yo/langues/espagnol/pays/republique-dominicaine";
const modules = ["intro", "module-2", "module-3", "module-4", "module-5"];
const completed = (ids: string[]): Snapshot[] => ids.map((module_id) => ({
  course_id: "yopratiqo:es:republique-dominicaine", module_id, progress_state: "completed",
}));
const url = (route: string, language: Locale) => route + (language === "fr" ? "" : `?lang=${language}`);

function assertHref(container: HTMLElement, selector: string, expected: string) {
  const anchors = container.querySelectorAll(selector);
  assert.ok(anchors.length > 0, `Missing rendered link: ${selector}`);
  for (const anchor of anchors) {
    assert.equal(anchor.getAttribute("href"), expected, `${selector} must preserve ${locale}`);
  }
}
function assertHub(container: HTMLElement, language: Locale, next: string) {
  for (const route of [
    "/yo/langues/italien/parcours", "/yo/langues/japonais/demarrer", "/yo/langues/allemand/demarrer",
    "/yo/langues/espagnol/demarrer", "/yo/langues/francais-quebec/demarrer", "/yo/langues/anglais/demarrer",
    "/yo/langues/portugais-bresil/demarrer", "/yo/langues/mandarin/demarrer",
  ]) assertHref(container, `[data-testid="yo-language-quick-start"] a[href="${url(route, language)}"]`, url(route, language));
  assertHref(container, '[data-testid="yo-student-hub-continue-cta"]', url(next, language));
  assertHref(container, '[data-testid="yo-student-hub-course-home-link"]', url(course, language));
  modules.forEach((id, i) => assertHref(container,
    `[data-testid="yo-student-hub-path-step-${i + 1}"]`, url(`${course}/${id}`, language)));
  assertHref(container, '[data-testid="yo-student-hub-full-progress-link"]', "/student/progress");
  assertHref(container, '[data-testid="yo-student-hub-find-teacher-link"]', "/trouver-un-prof");
}

async function main() {
  const failures: string[] = [];
  let passed = 0;
  async function check(name: string, body: () => Promise<void>) {
    try { await body(); passed += 1; console.log(`ok - ${name}`); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(name);
      console.error(`FAIL - ${name}\n${message}`);
    } finally { cleanup(); }
  }

  try {
    for (const language of ["fr", "en", "es"] as const) {
      for (const scenario of [
        { name: "signed out", rows: null, next: `${course}/intro` },
        { name: "no progress", rows: [], next: `${course}/intro` },
        { name: "Module 2 complete", rows: completed(["module-2"]), next: `${course}/module-3` },
        { name: "all complete", rows: completed(modules.slice(1)), next: course },
      ]) {
        await check(`hub ${language}: loading then ${scenario.name}`, async () => {
          locale = language;
          let resolve!: (rows: Snapshot[] | null) => void;
          snapshotRequest = new Promise((done) => { resolve = done; });
          const view = render(React.createElement(Hub));
          assertHub(view.container, language, `${course}/intro`);
          await act(async () => { resolve(scenario.rows); });
          assertHub(view.container, language, scenario.next);
        });
      }

      await check(`Course Home ${language}: every roadmap link`, async () => {
        locale = language;
        snapshots = completed(["module-2"]);
        const view = render(await CourseHome({ searchParams: Promise.resolve({ lang: language }) }));
        modules.forEach((id, i) => assertHref(view.container,
          `[data-yo-course-path-step="${i + 1}"] a`, url(`${course}/${id}`, language)));
      });
    }

    await check("hub locale switch updates existing progress links without refetch", async () => {
      locale = "fr";
      snapshotRequest = Promise.resolve(completed(["module-2"]));
      const view = render(React.createElement(Hub));
      await act(async () => { await snapshotRequest; });
      const previousFetches = fetchCount;
      for (const language of ["en", "es", "fr"] as const) {
        locale = language;
        view.rerender(React.createElement(Hub));
        assertHub(view.container, language, `${course}/module-3`);
      }
      assert.equal(fetchCount, previousFetches);
    });
    assert.equal(failures.length, 0, `${failures.length} navigation cases failed: ${failures.join("; ")}`);
    console.log(`\n${passed} rendered YoPratiqo locale navigation cases passed.`);
  } finally {
    cleanup();
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
