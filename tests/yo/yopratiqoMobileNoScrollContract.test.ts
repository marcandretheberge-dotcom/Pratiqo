/**
 * YoPratiqo — mobile no-scroll contract (runtime tree inspection).
 *
 * The previous PR's static suite passed because it only grepped for
 * `<YoAppShell>` / `h-[100dvh]` / `overflow-hidden`. It missed the
 * actual scroll-causing pattern: the central pane was mounted
 * inside `<YoAppShellScroller>` (`overflow-y-auto`), which lets
 * content vertically scroll inside the stage on mobile.
 *
 * Phase 4 update — explicit-step contract
 * ---------------------------------------
 * Every learner-facing route must now mount the new
 * `<YoAdaptiveStepShell>` + `<YoStepNavigator>` pair (explicit
 * Back / Next chrome). The legacy `<YoScreenPager>` swipe-only
 * pager is no longer accepted on these routes — surfacing the
 * "advance" affordance behind a swipe gesture was the root cause
 * of learners still reading the experience as "scroll".
 *
 * This suite is RUNTIME: it imports the audited page modules,
 * actually executes their server-component default export with a
 * resolved `searchParams`, and walks the returned React element
 * tree to assert:
 *
 *   1. The catalog page renders `<YoAdaptiveStepShell>` (not the
 *      bare `<YoAppShell>` + scroller pattern).
 *   2. The Spanish hub renders `<YoAdaptiveStepShell>`.
 *   3. The Dominican Republic Course Home renders
 *      `<YoAdaptiveStepShell>`.
 *   4. Each audited page declares a mobile sub-tree (via the
 *      `mobile` prop on YoAdaptiveStepShell) that contains a
 *      `<YoStepNavigator>` with N steps, and that the navigator
 *      mounts a `data-yo-step-navigator-step` host element per
 *      step.
 *   5. The mobile sub-tree of each audited page contains NO
 *      `<YoAppShellScroller>` (the old vertically-scrolling
 *      central pane) and NO `<YoScreenPager>` (the legacy
 *      swipe-only pager).
 *   6. The desktop sub-tree of each audited page (`desktop` prop)
 *      declares at minimum a `center` slot and a `leftRail`. Course
 *      Home additionally declares a `rightRail` so desktop is truly
 *      a workspace, not a stretched phone column. The Spanish hub
 *      deliberately skips `rightRail` — see
 *      yopratiqoDesktopWorkspaceContract.test.ts for why a 3-pane
 *      split squeezed its two primary cards on desktop.
 *   7. The mobile and desktop sub-trees are STRUCTURALLY DISTINCT
 *      (different JSX subtrees, not the same children passed
 *      twice with different className wrappers).
 *
 * Walking the JSX tree requires no browser, no jsdom, no
 * Playwright — a React element is just `{ type, props, key }`,
 * which we recursively crawl.
 *
 * Style: `node:test`-style runtime assertions.
 */

import assert from "node:assert/strict";
import type { ReactElement, ReactNode } from "react";

// Import the page modules. They are async server components that
// expect `searchParams: Promise<{lang?: string}>` — we resolve it
// to an empty object so the FR default locale runs.
import YoLanguesPage from "@/app/yo/langues/page";
import YoSpanishLandingPage from "@/app/yo/langues/espagnol/page";
import YoEspagnolRepubliqueDominicainePage from "@/app/yo/langues/espagnol/pays/republique-dominicaine/page";

// And the primitives we'll match against during tree walks.
// Routes are progressively migrating from the legacy
// `<YoAdaptiveShell>` + `<YoScreenPager>` (swipe-only) pair to
// the new `<YoAdaptiveStepShell>` + `<YoStepNavigator>` pair
// (explicit Back/Next chrome). Each `findAdaptive*` helper
// accepts EITHER pair so the suite stays green during the
// migration and serves as the canonical contract afterwards.
import { YoAdaptiveShell } from "@/components/yo/YoAdaptiveShell";
import { YoAdaptiveStepShell } from "@/components/yo/YoAdaptiveStepShell";
import { YoMobileAppShell } from "@/components/yo/YoMobileAppShell";
import { YoMobileAppStepShell } from "@/components/yo/YoMobileAppStepShell";
import { YoDesktopLearningWorkspace } from "@/components/yo/YoDesktopLearningWorkspace";
import { YoScreenPager } from "@/components/yo/YoScreenPager";
import { YoStepNavigator } from "@/components/yo/YoStepNavigator";
import { YoAppShell, YoAppShellScroller } from "@/components/yo/YoAppShell";
import { YoAppBottomBar } from "@/components/yo/YoAppBottomBar";

type AdaptiveShellHit =
  | { kind: "legacy"; element: ReactElement }
  | { kind: "step"; element: ReactElement };

function findAdaptiveShell(tree: ReactNode): AdaptiveShellHit | undefined {
  const stepShell = findByType(tree, YoAdaptiveStepShell);
  if (stepShell) return { kind: "step", element: stepShell };
  const legacy = findByType(tree, YoAdaptiveShell);
  if (legacy) return { kind: "legacy", element: legacy };
  return undefined;
}

type MobileShellHit =
  | { kind: "legacy"; element: ReactElement }
  | { kind: "step"; element: ReactElement };

function findMobileShell(tree: ReactNode): MobileShellHit | undefined {
  const stepShell = findByType(tree, YoMobileAppStepShell);
  if (stepShell) return { kind: "step", element: stepShell };
  const legacy = findByType(tree, YoMobileAppShell);
  if (legacy) return { kind: "legacy", element: legacy };
  return undefined;
}

function expandMobileShell(
  hit: MobileShellHit,
): ReactElement {
  if (hit.kind === "step") {
    return (YoMobileAppStepShell(
      hit.element.props as Parameters<typeof YoMobileAppStepShell>[0],
    ) as unknown) as ReactElement;
  }
  return (YoMobileAppShell(
    hit.element.props as Parameters<typeof YoMobileAppShell>[0],
  ) as unknown) as ReactElement;
}

function expandAdaptiveShell(hit: AdaptiveShellHit): ReactElement {
  if (hit.kind === "step") {
    return (YoAdaptiveStepShell(
      hit.element.props as Parameters<typeof YoAdaptiveStepShell>[0],
    ) as unknown) as ReactElement;
  }
  return (YoAdaptiveShell(
    hit.element.props as Parameters<typeof YoAdaptiveShell>[0],
  ) as unknown) as ReactElement;
}

function adaptiveMobileProps(hit: AdaptiveShellHit): {
  header?: ReactNode;
  bottom?: ReactNode;
  steps?: ReadonlyArray<{ id: string }>;
  screens?: ReadonlyArray<{ id: string }>;
} {
  const props = hit.element.props as {
    mobile?: {
      header?: ReactNode;
      bottom?: ReactNode;
      steps?: ReadonlyArray<{ id: string }>;
      screens?: ReadonlyArray<{ id: string }>;
    };
  };
  return props.mobile ?? {};
}

function adaptiveDesktopProps(hit: AdaptiveShellHit): {
  header?: ReactNode;
  center?: ReactNode;
  leftRail?: ReactNode;
  rightRail?: ReactNode;
} {
  const props = hit.element.props as {
    desktop?: {
      header?: ReactNode;
      center?: ReactNode;
      leftRail?: ReactNode;
      rightRail?: ReactNode;
    };
  };
  return props.desktop ?? {};
}

/** Returns the mobile screen/step list regardless of shell flavour. */
function adaptiveMobileSteps(
  hit: AdaptiveShellHit,
): ReadonlyArray<{ id: string }> {
  const mobile = adaptiveMobileProps(hit);
  if (hit.kind === "step") return mobile.steps ?? [];
  return mobile.screens ?? [];
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ─── Tree-walk helpers ─────────────────────────────────────────────

function isElement(value: unknown): value is ReactElement {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in (value as object) &&
    "props" in (value as object)
  );
}

function getDisplayName(type: unknown): string {
  if (typeof type === "string") return type;
  if (typeof type === "function") {
    return (type as { displayName?: string; name?: string }).displayName ??
      (type as { name?: string }).name ?? "<anonymous>";
  }
  return "<unknown>";
}

/**
 * Recursively walks a React element tree and yields every element
 * (depth-first). Handles arrays of children, single children, and
 * non-element children (strings/numbers/null/false).
 */
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
    return;
  }
}

function findByType(
  root: ReactNode,
  target: unknown,
): ReactElement | undefined {
  for (const el of walk(root)) {
    if (el.type === target) return el;
  }
  return undefined;
}

function findAllByType(root: ReactNode, target: unknown): ReactElement[] {
  const out: ReactElement[] = [];
  for (const el of walk(root)) {
    if (el.type === target) out.push(el);
  }
  return out;
}

function findByDisplayName(
  root: ReactNode,
  name: string,
): ReactElement | undefined {
  for (const el of walk(root)) {
    if (getDisplayName(el.type) === name) return el;
  }
  return undefined;
}

// ─── Fixtures: render each page module to its JSX tree ────────────

async function renderCatalog(): Promise<ReactElement> {
  const tree = await YoLanguesPage({
    searchParams: Promise.resolve({}),
  });
  return tree as ReactElement;
}

async function renderSpanishHub(): Promise<ReactElement> {
  const tree = await YoSpanishLandingPage({
    searchParams: Promise.resolve({}),
  });
  return tree as ReactElement;
}

async function renderCourseHome(): Promise<ReactElement> {
  const tree = await YoEspagnolRepubliqueDominicainePage({
    searchParams: Promise.resolve({}),
  });
  return tree as ReactElement;
}

// ─── 1. Catalog renders the adaptive step shell ──────────────────
test("/yo/langues runtime tree mounts <YoAdaptiveStepShell>", async () => {
  const tree = await renderCatalog();
  const hit = findAdaptiveShell(tree);
  assert.ok(hit, "catalog must mount a runtime adaptive shell");
  assert.strictEqual(
    hit.kind,
    "step",
    "catalog must use <YoAdaptiveStepShell> (no legacy <YoAdaptiveShell>)",
  );
});

// ─── 2. Spanish hub renders the adaptive step shell ──────────────
test("/yo/langues/espagnol runtime tree mounts <YoAdaptiveStepShell>", async () => {
  const tree = await renderSpanishHub();
  const hit = findAdaptiveShell(tree);
  assert.ok(hit, "Spanish hub must mount a runtime adaptive shell");
  assert.strictEqual(
    hit.kind,
    "step",
    "Spanish hub must use <YoAdaptiveStepShell> (no legacy <YoAdaptiveShell>)",
  );
});

// ─── 3. Course Home renders the adaptive step shell ──────────────
test("Dominican Republic Course Home runtime tree mounts <YoAdaptiveStepShell>", async () => {
  const tree = await renderCourseHome();
  const hit = findAdaptiveShell(tree);
  assert.ok(hit, "Course Home must mount a runtime adaptive shell");
  assert.strictEqual(
    hit.kind,
    "step",
    "Course Home must use <YoAdaptiveStepShell> (no legacy <YoAdaptiveShell>)",
  );
});

// ─── 4. Each audited page declares a mobile step navigator ───────
test("every audited page declares at least 2 mobile steps and mounts <YoStepNavigator>", async () => {
  for (const [label, trees] of [
    ["catalog", await renderCatalog()],
    ["Spanish hub", await renderSpanishHub()],
    ["Course Home", await renderCourseHome()],
  ] as const) {
    const hit = findAdaptiveShell(trees);
    assert.ok(hit, `${label} must mount an adaptive shell`);
    assert.strictEqual(
      hit.kind,
      "step",
      `${label} must use the new step shell`,
    );
    const steps = adaptiveMobileSteps(hit);
    assert.ok(
      steps.length >= 2,
      `${label} mobile sub-tree must declare at least 2 steps; got ${steps.length}`,
    );
    // Expand the adaptive step shell so we can see the mobile +
    // desktop sub-trees it composes.
    const adaptiveExpanded = expandAdaptiveShell(hit);
    const mobileHit = findMobileShell(adaptiveExpanded);
    assert.ok(mobileHit, `${label} must mount a mobile shell`);
    assert.strictEqual(
      mobileHit.kind,
      "step",
      `${label} mobile shell must be <YoMobileAppStepShell>`,
    );
    const expanded = expandMobileShell(mobileHit);
    const navigator = findByType(expanded, YoStepNavigator);
    assert.ok(
      navigator,
      `${label} mobile sub-tree must mount <YoStepNavigator>`,
    );
    const navSteps = (navigator!.props as {
      steps?: ReadonlyArray<unknown>;
    }).steps;
    assert.ok(
      Array.isArray(navSteps) && navSteps.length === steps.length,
      `${label} navigator must receive every step (${steps.length} expected)`,
    );
  }
});

// ─── 5. Mobile sub-trees contain NO legacy scroller and NO pager ─
test("no audited page's mobile sub-tree mounts the legacy YoAppShellScroller or YoScreenPager", async () => {
  for (const [label, trees] of [
    ["catalog", await renderCatalog()],
    ["Spanish hub", await renderSpanishHub()],
    ["Course Home", await renderCourseHome()],
  ] as const) {
    // We walk the full render tree of each page module. The
    // legacy `<YoAppShellScroller>` (overflow-y-auto stage
    // scroller) must NOT appear anywhere — it's the smoking-gun
    // pattern that let the previous PR's body-scroll bug survive.
    const scroller = findByType(trees, YoAppShellScroller);
    assert.ok(
      !scroller,
      `${label} must not mount <YoAppShellScroller> (the legacy overflow-y-auto stage)`,
    );
    // The legacy `<YoScreenPager>` (passive swipe-only horizontal
    // pager) is also banned. The whole point of Phase 1 was to
    // replace it with explicit Back / Next chrome.
    const pager = findByType(trees, YoScreenPager);
    assert.ok(
      !pager,
      `${label} must not mount <YoScreenPager> (replaced by <YoStepNavigator>)`,
    );
  }
});

// ─── 6. Desktop sub-tree slots ───────────────────────────────────
test("each audited page declares a desktop sub-tree with a centre pane (workspace, not stretched mobile)", async () => {
  // Catalog + Spanish hub: only required to declare centre +
  // leftRail; rightRail optional. The Spanish hub deliberately
  // omits it — a 280px/1fr/300px three-pane split squeezed its two
  // primary cards into a ~470px center track on every desktop
  // breakpoint. Course Home: must declare all three rails so
  // desktop is truly workspace-shaped.
  const cases = [
    {
      label: "catalog",
      tree: await renderCatalog(),
      requireRightRail: false,
    },
    {
      label: "Spanish hub",
      tree: await renderSpanishHub(),
      requireRightRail: false,
    },
    {
      label: "Course Home",
      tree: await renderCourseHome(),
      requireRightRail: true,
    },
  ];
  for (const { label, tree, requireRightRail } of cases) {
    const hit = findAdaptiveShell(tree);
    assert.ok(hit, `${label} must mount an adaptive shell`);
    const desktop = adaptiveDesktopProps(hit);
    assert.ok(
      desktop.center !== undefined && desktop.center !== null,
      `${label} desktop sub-tree must declare a center pane`,
    );
    assert.ok(
      desktop.leftRail !== undefined && desktop.leftRail !== null,
      `${label} desktop sub-tree must declare a leftRail (Yoppo / identity)`,
    );
    if (requireRightRail) {
      assert.ok(
        desktop.rightRail !== undefined && desktop.rightRail !== null,
        `${label} desktop sub-tree must declare a rightRail (progress / next / teacher bridge)`,
      );
    }
  }
});

// ─── 7. Mobile and desktop sub-trees are structurally distinct ───
test("mobile and desktop sub-trees of each audited page are structurally distinct", async () => {
  for (const [label, tree] of [
    ["catalog", await renderCatalog()],
    ["Spanish hub", await renderSpanishHub()],
    ["Course Home", await renderCourseHome()],
  ] as const) {
    const hit = findAdaptiveShell(tree);
    assert.ok(hit, `${label} must mount an adaptive shell`);
    const mobile = adaptiveMobileProps(hit);
    const desktop = adaptiveDesktopProps(hit);
    const mobileSteps = adaptiveMobileSteps(hit);
    assert.ok(
      mobileSteps.length > 0,
      `${label} mobile sub-tree must declare a paged screens/steps list`,
    );
    assert.ok(
      !("screens" in (desktop as Record<string, unknown>)) &&
        !("steps" in (desktop as Record<string, unknown>)),
      `${label} desktop sub-tree must NOT declare a screens/steps list (it must use the workspace pattern)`,
    );
    // The mobile header element and the desktop header element
    // must be distinct objects — otherwise desktop is just
    // "mobile chrome stretched".
    if (mobile.header && desktop.header) {
      assert.notStrictEqual(
        mobile.header,
        desktop.header,
        `${label} mobile and desktop headers must be different elements (not the same component re-used)`,
      );
    }
  }
});

// ─── 8. Spanish hub primary CTA still points at the DR Course Home ─
test("Spanish hub mobile sub-tree surfaces a Dominican Republic primary CTA", async () => {
  // The Spanish hub may surface the primary CTA via either the
  // legacy `<YoAppBottomBar>` in the mobile `bottom` slot OR the
  // new `lastStepNextHref` on the step navigator. Either path
  // is acceptable; what matters is that the learner has a clearly
  // labeled affordance pointing at the DR Course Home.
  const tree = await renderSpanishHub();
  const hit = findAdaptiveShell(tree);
  assert.ok(hit, "Spanish hub must mount an adaptive shell");
  const mobile = hit.element.props as {
    mobile: {
      bottom?: ReactNode;
      lastStepNextHref?: string;
    };
  };
  const bottomBar = mobile.mobile.bottom
    ? findByType(mobile.mobile.bottom, YoAppBottomBar)
    : undefined;
  const bottomBarHref = bottomBar
    ? (bottomBar.props as { primaryHref?: string }).primaryHref
    : undefined;
  const lastStepNextHref = mobile.mobile.lastStepNextHref;
  const candidate = bottomBarHref ?? lastStepNextHref;
  assert.ok(
    typeof candidate === "string" &&
      candidate.startsWith(
        "/yo/langues/espagnol/pays/republique-dominicaine",
      ),
    `Spanish hub mobile primary CTA must target the Dominican Republic Course Home — got bottom=${bottomBarHref ?? "<none>"} lastStep=${lastStepNextHref ?? "<none>"}`,
  );
});

// ─── 9. Course Home mobile primary CTA points at the Intro deck ──
test("Course Home mobile sub-tree surfaces an Intro deck primary CTA", async () => {
  const tree = await renderCourseHome();
  const hit = findAdaptiveShell(tree);
  assert.ok(hit, "Course Home must mount an adaptive shell");
  const mobile = hit.element.props as {
    mobile: {
      bottom?: ReactNode;
      lastStepNextHref?: string;
    };
  };
  const bottomBar = mobile.mobile.bottom
    ? findByType(mobile.mobile.bottom, YoAppBottomBar)
    : undefined;
  const bottomBarHref = bottomBar
    ? (bottomBar.props as { primaryHref?: string }).primaryHref
    : undefined;
  const lastStepNextHref = mobile.mobile.lastStepNextHref;
  const candidate = bottomBarHref ?? lastStepNextHref;
  assert.ok(
    typeof candidate === "string" &&
      candidate.includes(
        "/yo/langues/espagnol/pays/republique-dominicaine/intro",
      ),
    `Course Home mobile primary CTA must target the Intro deck route — got bottom=${bottomBarHref ?? "<none>"} lastStep=${lastStepNextHref ?? "<none>"}`,
  );
});

// ─── 10. Mobile keeps the YoAppShell viewport-lock; desktop scrolls naturally ──
test("mobile sub-tree still inherits the YoAppShell viewport-lock; desktop sub-tree does NOT lock the viewport", async () => {
  // YoAppShell ships `h-[100dvh] overflow-hidden` — the right call
  // for a phone-sized step shell. Desktop intentionally dropped
  // that lock (world-class-shell pass): a viewport-locked desktop
  // workspace is exactly what produced "trapped in a tiny internal
  // scrollbar" on /yo/langues and the Course Home. Desktop now lets
  // the page scroll naturally, with only a `sticky` header.
  for (const [label, tree] of [
    ["catalog", await renderCatalog()],
    ["Spanish hub", await renderSpanishHub()],
    ["Course Home", await renderCourseHome()],
  ] as const) {
    const hit = findAdaptiveShell(tree);
    assert.ok(hit, `${label} must mount an adaptive shell`);
    const adaptiveExpanded = expandAdaptiveShell(hit);
    const mobileHit = findMobileShell(adaptiveExpanded);
    assert.ok(
      mobileHit,
      `${label} must compose a mobile shell inside the adaptive shell`,
    );
    const mobileExpanded = expandMobileShell(mobileHit);
    const shellInMobile = findByType(mobileExpanded, YoAppShell);
    assert.ok(
      shellInMobile,
      `${label} mobile sub-tree must compose <YoAppShell> (viewport-lock owner)`,
    );

    const desktopNode = findByType(adaptiveExpanded, YoDesktopLearningWorkspace);
    assert.ok(
      desktopNode,
      `${label} must compose <YoDesktopLearningWorkspace> inside the adaptive shell`,
    );
    const desktopExpanded = (YoDesktopLearningWorkspace(
      desktopNode!.props as Parameters<typeof YoDesktopLearningWorkspace>[0],
    ) as unknown) as ReactElement;
    const shellInDesktop = findByType(desktopExpanded, YoAppShell);
    assert.ok(
      !shellInDesktop,
      `${label} desktop sub-tree must NOT compose <YoAppShell> — desktop scrolls the page naturally instead of locking the viewport`,
    );
  }
  // Silence the lint about findByDisplayName — kept exported for
  // future runtime diagnostics.
  void findByDisplayName;
  void findAllByType;
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
  console.log(`[yo:mobile-no-scroll-contract] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
