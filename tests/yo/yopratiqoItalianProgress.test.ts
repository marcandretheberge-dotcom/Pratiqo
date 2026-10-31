import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { emptyItalianProgress, ITALIAN_PROGRESS_KEY, mergeItalianProgress, parseItalianProgress, recordItalianAttempt } from "@/lib/yo/italian/italianModuleProgress";
import { useItalianModuleProgress } from "@/components/yo/italian/useItalianModuleProgress";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo/langues/italien/module-1" });
const bindings = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, StorageEvent: dom.window.StorageEvent, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { renderHook, act, cleanup } = require("@testing-library/react") as typeof import("@testing-library/react");
const ids = ["greeting", "cafe", "map"] as const;
const steps = ["welcome", "learn", ...ids, "finish"] as const;
const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
const parse = (value: unknown) => parseItalianProgress(JSON.stringify(value), ids, steps);
const saved = () => parseItalianProgress(window.localStorage.getItem(ITALIAN_PROGRESS_KEY), ids, steps);

test("missing, malformed, oversized and unsupported records restart safely", () => {
  for (const raw of [null, "", "{", "null", "false", "[]", JSON.stringify({ version: 2 }), "x".repeat(30001)]) {
    assert.deepEqual(parseItalianProgress(raw, ids, steps), emptyItalianProgress());
  }
});

test("only known activities and aggregate values survive parsing", () => {
  const parsed = parse({ version: 1, resetAt: 0, updatedAt: Date.now(), currentStep: "cafe", rawAnswer: "private text", results: {
    greeting: { attempts: 2, completed: true, independent: false, answer: "Buongiorno" },
    cafe: { attempts: 1, completed: false, independent: true },
    map: { attempts: 1, completed: "yes", independent: "yes" },
    unknown: { attempts: 1, completed: true, independent: true },
  } });
  assert.equal(parsed.currentStep, "cafe");
  assert.deepEqual(parsed.results, {
    greeting: { attempts: 2, completed: true, independent: false },
    cafe: { attempts: 1, completed: false, independent: false },
    map: { attempts: 1, completed: false, independent: false },
  });
  assert.deepEqual(Object.keys(parsed).sort(), ["currentStep", "resetAt", "results", "updatedAt", "version"]);
});

test("invalid attempt counts are rejected and very large counts are bounded", () => {
  for (const attempts of [-1, 0, 1.5, "2", null, Infinity]) assert.deepEqual(parse({ version: 1, results: { greeting: { attempts, completed: true } } }).results, {});
  assert.equal(parse({ version: 1, results: { greeting: { attempts: 100001, completed: true } } }).results.greeting.attempts, 100000);
});

test("timestamps and resume steps are bounded before they affect merge order", () => {
  const invalid = parse({ version: 1, resetAt: -1, updatedAt: Date.now() + 120000, currentStep: "not-a-step" });
  assert.equal(invalid.resetAt, 0);
  assert.equal(invalid.updatedAt, 0);
  assert.equal(invalid.currentStep, "welcome");
  const now = Date.now();
  assert.equal(parse({ version: 1, resetAt: now, updatedAt: 0 }).updatedAt, now);
});

test("an unsuccessful attempt never completes an activity", () => {
  const base = emptyItalianProgress();
  const next = recordItalianAttempt(base, "greeting", false, false, 10);
  assert.deepEqual(base.results, {});
  assert.deepEqual(next.results.greeting, { attempts: 1, completed: false, independent: false });
});

test("assisted success and later independent recall are recorded separately", () => {
  const assisted = recordItalianAttempt(emptyItalianProgress(), "cafe", true, true, 10);
  assert.deepEqual(assisted.results.cafe, { attempts: 1, completed: true, independent: false });
  const independent = recordItalianAttempt(assisted, "cafe", true, false, 10);
  assert.deepEqual(independent.results.cafe, { attempts: 2, completed: true, independent: true });
  assert.equal(independent.updatedAt, assisted.updatedAt + 1);
  const laterMiss = recordItalianAttempt(independent, "cafe", false, true, 9);
  assert.deepEqual(laterMiss.results.cafe, { attempts: 3, completed: true, independent: true });
  assert.equal(laterMiss.updatedAt, independent.updatedAt + 1);
});

test("merging concurrent tabs keeps successes without doubling completed activities", () => {
  const left = recordItalianAttempt(emptyItalianProgress(), "greeting", true, false, 100);
  const right = recordItalianAttempt(recordItalianAttempt(emptyItalianProgress(), "greeting", true, true, 99), "cafe", true, true, 101);
  right.currentStep = "map";
  const merged = mergeItalianProgress(left, right);
  assert.deepEqual(Object.keys(merged.results).sort(), ["cafe", "greeting"]);
  assert.deepEqual(merged.results.greeting, { attempts: 1, completed: true, independent: true });
  assert.equal(merged.currentStep, "map");
  assert.deepEqual(mergeItalianProgress(right, left), merged);
  assert.deepEqual(mergeItalianProgress(merged, merged), merged);
  assert.deepEqual(Object.keys(left.results), ["greeting"]);
});

test("an explicit newer reset cannot be undone by an older tab", () => {
  const stale = recordItalianAttempt(emptyItalianProgress(), "cafe", true, false, 1000);
  const reset = emptyItalianProgress(900);
  assert.deepEqual(mergeItalianProgress(stale, reset), reset);
  assert.deepEqual(mergeItalianProgress(reset, stale), reset);
});

test("hook resumes saved progress without replacing it with initial empty state", () => {
  const initial = recordItalianAttempt(emptyItalianProgress(), "greeting", true, true);
  initial.currentStep = "cafe";
  window.localStorage.setItem(ITALIAN_PROGRESS_KEY, JSON.stringify(initial));
  const { result } = renderHook(() => useItalianModuleProgress(ids, steps));
  assert.equal(result.current.ready, true);
  assert.equal(result.current.progress.currentStep, "cafe");
  assert.equal(result.current.progress.results.greeting.completed, true);
  assert.deepEqual(saved(), initial);
});

test("attempts and navigation persist synchronously and survive remount", () => {
  const hook = renderHook(() => useItalianModuleProgress(ids, steps));
  act(() => {
    hook.result.current.attempt("cafe", true, true);
    assert.equal(saved().results.cafe.completed, true);
    hook.result.current.visit("map");
    assert.equal(saved().currentStep, "map");
  });
  assert.equal(hook.result.current.progress.results.cafe.independent, false);
  hook.unmount();
  const fresh = renderHook(() => useItalianModuleProgress(ids, steps));
  assert.equal(fresh.result.current.progress.currentStep, "map");
  assert.equal(fresh.result.current.progress.results.cafe.completed, true);
});

test("hook ignores unknown activities and unknown resume steps", () => {
  const { result } = renderHook(() => useItalianModuleProgress(ids, steps));
  act(() => { result.current.attempt("injected", true, false); result.current.visit("injected"); });
  assert.deepEqual(result.current.progress, emptyItalianProgress());
  assert.equal(window.localStorage.getItem(ITALIAN_PROGRESS_KEY), null);
});

test("a concurrent saved success is read before the next local write", () => {
  const { result } = renderHook(() => useItalianModuleProgress(ids, steps));
  act(() => result.current.attempt("greeting", true, false));
  const remote = recordItalianAttempt(saved(), "map", true, true);
  remote.currentStep = "map";
  window.localStorage.setItem(ITALIAN_PROGRESS_KEY, JSON.stringify(remote));
  act(() => result.current.attempt("cafe", false, false));
  assert.equal(saved().results.map.completed, true);
  assert.equal(saved().results.greeting.independent, true);
  assert.equal(saved().results.cafe.completed, false);
});

test("storage events merge outcomes and respect a remote explicit reset", () => {
  const { result } = renderHook(() => useItalianModuleProgress(ids, steps));
  act(() => result.current.attempt("greeting", true, false));
  const remote = recordItalianAttempt(emptyItalianProgress(), "cafe", true, true);
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: ITALIAN_PROGRESS_KEY, newValue: JSON.stringify(remote) })));
  assert.equal(result.current.progress.results.cafe.completed, true);
  assert.equal(result.current.progress.results.greeting.completed, true);
  const reset = emptyItalianProgress(Date.now() + 5);
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: ITALIAN_PROGRESS_KEY, newValue: JSON.stringify(reset) })));
  assert.deepEqual(result.current.progress.results, {});
  assert.equal(result.current.progress.currentStep, "welcome");
});

test("explicit reset clears progress immediately and records a reset generation", () => {
  const { result } = renderHook(() => useItalianModuleProgress(ids, steps));
  act(() => { result.current.attempt("greeting", true, false); result.current.visit("cafe"); });
  const before = result.current.progress;
  act(() => result.current.reset());
  assert.ok(result.current.progress.resetAt > before.resetAt);
  assert.deepEqual(result.current.progress.results, {});
  assert.equal(saved().currentStep, "welcome");
});

test("blocked local storage keeps memory progress usable and reports non-persistence", () => {
  const prototype = dom.window.Storage.prototype;
  const originalGet = prototype.getItem;
  const originalSet = prototype.setItem;
  prototype.getItem = () => { throw new Error("Storage blocked"); };
  prototype.setItem = () => { throw new Error("Storage blocked"); };
  try {
    const { result } = renderHook(() => useItalianModuleProgress(ids, steps));
    assert.equal(result.current.ready, true);
    assert.equal(result.current.storageAvailable, false);
    act(() => { result.current.attempt("cafe", true, true); result.current.visit("map"); });
    assert.equal(result.current.progress.results.cafe.completed, true);
    assert.equal(result.current.progress.currentStep, "map");
    assert.equal(result.current.storageAvailable, false);
  } finally { prototype.getItem = originalGet; prototype.setItem = originalSet; }
});

let failed = 0;
try {
  for (const [name, run] of cases) {
    window.localStorage.clear();
    try { run(); console.log(`ok - ${name}`); }
    catch (error) { failed++; console.error(`not ok - ${name}`, error); }
    finally { cleanup(); }
  }
} finally {
  dom.window.close();
  for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
}
console.log(`\nItalian progress: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
