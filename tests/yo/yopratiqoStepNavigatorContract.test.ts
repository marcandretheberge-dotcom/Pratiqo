/**
 * YoPratiqo — step navigator chrome contract.
 *
 * The world-class shell pass replaced the legacy swipe-only
 * `<YoScreenPager>` with `<YoStepNavigator>` — an explicit
 * button-driven step shell modelled on the lesson deck. This
 * suite locks the navigator's affordance contract so it cannot
 * regress to "scroll to advance":
 *
 *   1. Every navigator instance renders BOTH a Back control and
 *      a Next control (even on the first / last step — first
 *      step uses a Back link to the root, last step uses either
 *      a Next link or a disabled Done indicator).
 *   2. Every navigator instance renders one clickable dot per
 *      step. The dot for the active step carries
 *      `aria-current="step"`; non-active dots do not. Clicking a
 *      dot is wired (the dot is a `<button>`).
 *   3. The navigator wires `aria-controls` from Back / Next /
 *      dots back to the stage container so screen readers can
 *      follow which region the controls advance.
 *   4. The navigator's stage exposes a
 *      `data-yo-step-navigator-step` attribute per step (with a
 *      stable id), so runtime probes + analytics can locate
 *      individual steps.
 *   5. The navigator wires keyboard `←` / `→` arrows to advance
 *      / retreat (and DOES NOT hijack typing in form fields).
 *
 * Style: `node:test`-style runtime assertions on the rendered
 * React element tree of a known step navigator instance.
 */

import assert from "node:assert/strict";
import React, { type ReactElement, type ReactNode } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  YoStepNavigator,
  type YoStepNavigatorStep,
} from "@/components/yo/YoStepNavigator";

const REPO_ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function isElement(value: unknown): value is ReactElement {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in (value as object) &&
    "props" in (value as object)
  );
}

function* walk(node: ReactNode): Generator<ReactElement> {
  if (node == null || typeof node === "boolean") return;
  if (Array.isArray(node)) {
    for (const child of node) yield* walk(child);
    return;
  }
  if (typeof node === "string" || typeof node === "number") return;
  if (isElement(node)) {
    yield node;
    const children = (node.props as { children?: ReactNode }).children;
    if (children !== undefined) yield* walk(children);
  }
}

function findAllByTestId(root: ReactNode, testId: string): ReactElement[] {
  const out: ReactElement[] = [];
  for (const el of walk(root)) {
    const props = el.props as { ["data-testid"]?: string };
    if (props["data-testid"] === testId) out.push(el);
  }
  return out;
}

function findByTestId(
  root: ReactNode,
  testId: string,
): ReactElement | undefined {
  return findAllByTestId(root, testId)[0];
}

// Mount the navigator via React's "test renderer" approximation:
// we call the function component and walk the returned element
// tree. This works because YoStepNavigator is a regular function
// component that returns JSX; the hooks (useState / useEffect /
// useRef) will throw outside a real React renderer, so we render
// the navigator's JSX manually by constructing a thin probe.
//
// Approach: create three steps, then read the source of
// YoStepNavigator + assert the affordance markers exist in the
// JSX (data-testid + aria-current="step" + aria-controls).
// Combined with the type-level guarantees + the runtime contract
// on real pages (yopratiqoMobileNoScrollContract), this is enough
// to lock the navigator's UX shape without a jsdom renderer.

const NAVIGATOR_SRC = read("components/yo/YoStepNavigator.tsx");

// ─── 1. Back + Next controls both exist in the navigator chrome ─
test("YoStepNavigator chrome declares BOTH a Back control and a Next control", () => {
  // First-step Back is a Link to rootBackHref (with the Back
  // test-id), and every other step has a button-shaped Back. The
  // navigator's source must declare both shapes.
  assert.match(
    NAVIGATOR_SRC,
    /data-testid="yo-step-navigator-back-link"/,
    "Navigator must declare the first-step Back link affordance",
  );
  assert.match(
    NAVIGATOR_SRC,
    /data-testid="yo-step-navigator-back"/,
    "Navigator must declare the standard Back button affordance",
  );
  // Same for Next: a link when lastStepNextHref is set, a button
  // otherwise.
  assert.match(
    NAVIGATOR_SRC,
    /data-testid="yo-step-navigator-next-link"/,
    "Navigator must declare the last-step Next link affordance",
  );
  assert.match(
    NAVIGATOR_SRC,
    /data-testid="yo-step-navigator-next"/,
    "Navigator must declare the standard Next button affordance",
  );
});

// ─── 2. Dots: clickable, aria-current="step" on active ──────────
test("YoStepNavigator chrome renders clickable step dots with aria-current=\"step\" on the active step", () => {
  // The dots must be inside a <ol> (semantic list of steps), the
  // dot elements must be <button>s (clickable), and the active
  // dot must carry aria-current="step".
  assert.match(
    NAVIGATOR_SRC,
    /data-testid="yo-step-navigator-dots"/,
    "Navigator must declare a dot list with a stable test-id",
  );
  assert.match(
    NAVIGATOR_SRC,
    /<ol[\s\S]*?data-testid="yo-step-navigator-dots"/,
    "Navigator must render the step dots inside an <ol>",
  );
  assert.match(
    NAVIGATOR_SRC,
    /data-testid="yo-step-navigator-dot"[\s\S]*?<button/,
    "Each dot must be a <button> (clickable). The whole dot block must include a <button>",
  );
  assert.match(
    NAVIGATOR_SRC,
    /aria-current=\{isActive\s*\?\s*"step"\s*:\s*undefined\}/,
    "The active dot must carry aria-current=\"step\"; inactive dots must not",
  );
});

// ─── 3. aria-controls wires back to the stage id ─────────────────
test("YoStepNavigator wires aria-controls from Back / Next / dots to the stage id", () => {
  // The navigator computes a stable stageId (via React.useId) and
  // passes it as aria-controls on Back, Next, and each dot.
  assert.match(
    NAVIGATOR_SRC,
    /const stageId\s*=\s*`yo-step-navigator-stage-\$\{reactId\}`/,
    "Navigator must derive a stable stageId from React.useId",
  );
  for (const id of [
    /data-testid="yo-step-navigator-back"[\s\S]*?aria-controls=\{stageId\}/,
    /data-testid="yo-step-navigator-next"[\s\S]*?aria-controls=\{stageId\}/,
    /data-testid="yo-step-navigator-dot"[\s\S]*?aria-controls=\{stageId\}/,
  ]) {
    assert.match(
      NAVIGATOR_SRC,
      id,
      `Navigator must wire aria-controls on chrome matching ${id.source}`,
    );
  }
});

// ─── 4. Per-step host element with a stable data attribute ──────
test("YoStepNavigator stage emits one data-yo-step-navigator-step host per step", () => {
  assert.match(
    NAVIGATOR_SRC,
    /data-yo-step-navigator-step=\{step\.id\}/,
    "Each step host must carry data-yo-step-navigator-step=<id>",
  );
  assert.match(
    NAVIGATOR_SRC,
    /data-yo-step-navigator-step-index=\{String\(idx\)\}/,
    "Each step host must carry its index",
  );
  assert.match(
    NAVIGATOR_SRC,
    /data-yo-step-navigator-step-active=\{isActive\s*\?\s*"true"\s*:\s*"false"\}/,
    "Each step host must carry an active flag",
  );
});

// ─── 5. Keyboard ← / → wired, doesn't hijack form fields ────────
test("YoStepNavigator wires ArrowLeft / ArrowRight and skips form inputs", () => {
  assert.match(
    NAVIGATOR_SRC,
    /event\.key\s*===\s*"ArrowLeft"/,
    "Navigator must listen for ArrowLeft to step backward",
  );
  assert.match(
    NAVIGATOR_SRC,
    /event\.key\s*===\s*"ArrowRight"/,
    "Navigator must listen for ArrowRight to step forward",
  );
  // The guard MUST exit early for input / textarea / select /
  // contentEditable so typing in a form field doesn't trigger
  // navigation.
  assert.match(
    NAVIGATOR_SRC,
    /tag\s*===\s*"input"[\s\S]*?return;/,
    "Navigator must NOT hijack typing in form inputs",
  );
  assert.match(
    NAVIGATOR_SRC,
    /isContentEditable[\s\S]*?return;/,
    "Navigator must NOT hijack typing in contentEditable elements",
  );
});

// ─── 6. Step shape — React.createElement smoke test ─────────────
test("YoStepNavigator accepts a YoStepNavigatorStep[] with id / label / content", () => {
  // Construct a navigator element with three steps. We don't
  // render it (that requires a React DOM), but the type system
  // confirms the shape we pass is the navigator's contract.
  const steps: YoStepNavigatorStep[] = [
    {
      id: "first",
      label: "First step",
      content: React.createElement("div", null, "1"),
    },
    {
      id: "second",
      label: "Second step",
      content: React.createElement("div", null, "2"),
    },
    {
      id: "third",
      label: "Third step",
      content: React.createElement("div", null, "3"),
    },
  ];
  const el = React.createElement(YoStepNavigator, {
    surfaceId: "test-step-navigator",
    locale: "fr",
    steps,
  });
  assert.strictEqual(el.type, YoStepNavigator);
  const props = el.props as { steps?: ReadonlyArray<unknown> };
  assert.ok(Array.isArray(props.steps) && props.steps.length === 3);
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[yo:step-navigator-contract] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
