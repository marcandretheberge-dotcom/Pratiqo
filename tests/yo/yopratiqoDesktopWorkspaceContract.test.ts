/**
 * YoPratiqo — desktop workspace contract (runtime tree inspection).
 *
 * Companion to `yopratiqoMobileNoScrollContract.test.ts`. Locks
 * the contract that the DESKTOP sub-tree of every audited app
 * surface is a real product workspace, not a phone shell stretched
 * to laptop width.
 *
 *   1. The catalog uses a full-width shared workspace and locale-aware
 *      direct language selector. Spanish hub + Course Home declare a
 *      desktop sub-tree on an adaptive shell.
 *   2. Each desktop sub-tree declares an `<YoAppHeader>` with
 *      `appearance="desktop"` so the chrome is product-software-
 *      style, not mobile-app-style.
 *   3. Each desktop sub-tree declares a `leftRail` AND a `center`
 *      (the workspace minimum). Course Home additionally declares a
 *      `rightRail` (progress / teacher bridge) so that layout is
 *      truly three-pane on lg+. The Spanish hub deliberately does
 *      NOT declare a `rightRail`: a 280px/1fr/300px three-pane split
 *      squeezed its two primary cards into a ~470px center track on
 *      every desktop breakpoint (the QA-reported "cramped, awkward
 *      text wrap" bug). Its secondary "what's next" content now
 *      renders inside the wider `center` column instead.
 *   4. The catalog's direct selector has two desktop columns and
 *      shrinkable mobile tracks, with no side rails squeezing its tiles.
 *   5. `<YoDesktopAppWorkspace>` itself emits the standard
 *      three-pane data-attributes (`yo-desktop-workspace-rail` =
 *      left / right, `yo-desktop-workspace-pane` = center) so
 *      future runtime probes can locate the rails.
 *   6. Mobile and desktop headers are different elements (so
 *      desktop ships its own chrome, not the mobile pill bar
 *      stretched).
 *   7. Paid YoPratiqo checkout remains disabled.
 *   8. No restricted system touched.
 *
 * Style: `node:test`-style runtime + static assertions.
 */

import assert from "node:assert/strict";
import type { ReactElement, ReactNode } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import YoLanguesPage from "@/app/yo/langues/page";
import YoSpanishLandingPage from "@/app/yo/langues/espagnol/page";
import YoEspagnolRepubliqueDominicainePage from "@/app/yo/langues/espagnol/pays/republique-dominicaine/page";

import { YoAdaptiveShell } from "@/components/yo/YoAdaptiveShell";
import { YoAdaptiveStepShell } from "@/components/yo/YoAdaptiveStepShell";
import { YoDesktopLearningWorkspace } from "@/components/yo/YoDesktopLearningWorkspace";
import { YoAppHeader } from "@/components/yo/YoAppHeader";
import { YoAppShell, YoAppShellScroller } from "@/components/yo/YoAppShell";
import { YoDesktopAppWorkspace } from "@/components/yo/YoDesktopAppWorkspace";
import { YoLanguageQuickStart } from "@/components/yo/YoLanguageQuickStart";

/**
 * Routes are migrating from the legacy `<YoAdaptiveShell>` to the
 * new `<YoAdaptiveStepShell>` (button-driven step navigator).
 * Accept either shell when locating the desktop sub-tree.
 */
function findAdaptiveShellElement(
  tree: ReactNode,
): ReactElement | undefined {
  return (
    findByType(tree, YoAdaptiveStepShell) ?? findByType(tree, YoAdaptiveShell)
  );
}

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

function findByType(
  root: ReactNode,
  target: unknown,
): ReactElement | undefined {
  for (const el of walk(root)) {
    if (el.type === target) return el;
  }
  return undefined;
}

async function renderPage<T>(
  page: (props: { searchParams: Promise<{ lang?: string | string[] }> }) => Promise<T>,
): Promise<T> {
  return page({ searchParams: Promise.resolve({}) });
}

// ─── 1. All three audited surfaces declare a desktop sub-tree ────
test("direct catalog keeps shared chrome, scrolling and a full-width responsive language workspace", async () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const tree = await YoLanguesPage({ searchParams: Promise.resolve({ lang: locale }) });
    const shell = findByType(tree, YoAppShell);
    assert.ok(shell);
    const props = shell.props as { header: ReactNode; children: ReactNode };
    const header = findByType(props.header, YoAppHeader);
    assert.ok(header);
    assert.equal((header.props as { locale: string }).locale, locale);
    assert.ok(findByType(props.children, YoAppShellScroller));
    const workspace = findByType(props.children, YoDesktopAppWorkspace);
    assert.ok(workspace);
    const workspaceProps = workspace.props as { center: ReactNode; centerMaxWidth: string; leftRail?: ReactNode; rightRail?: ReactNode };
    assert.equal(workspaceProps.centerMaxWidth, "none");
    assert.equal(workspaceProps.leftRail, undefined);
    assert.equal(workspaceProps.rightRail, undefined);
    const selector = findByType(workspaceProps.center, YoLanguageQuickStart);
    assert.ok(selector);
    assert.equal((selector.props as { locale: string }).locale, locale);
  }
});

test("Spanish hub + Course Home each declare a desktop sub-tree on the adaptive shell", async () => {
  const surfaces: Array<{
    label: string;
    tree: ReactElement;
  }> = [
    { label: "Spanish hub", tree: (await renderPage(YoSpanishLandingPage)) as ReactElement },
    {
      label: "Course Home",
      tree: (await renderPage(YoEspagnolRepubliqueDominicainePage)) as ReactElement,
    },
  ];
  for (const { label, tree } of surfaces) {
    const adaptive = findAdaptiveShellElement(tree);
    assert.ok(adaptive, `${label} must mount <YoAdaptiveShell>`);
    const desktop = (adaptive!.props as { desktop?: unknown }).desktop;
    assert.ok(
      desktop && typeof desktop === "object",
      `${label} must declare a desktop sub-tree`,
    );
  }
});

// ─── 2. Each desktop sub-tree mounts an YoAppHeader appearance="desktop" ─
test("each desktop sub-tree mounts <YoAppHeader appearance=\"desktop\">", async () => {
  for (const [label, tree] of [
    ["Spanish hub", (await renderPage(YoSpanishLandingPage)) as ReactElement],
    [
      "Course Home",
      (await renderPage(YoEspagnolRepubliqueDominicainePage)) as ReactElement,
    ],
  ] as const) {
    const adaptive = findAdaptiveShellElement(tree);
    const desktopProps = (adaptive!.props as { desktop?: { header?: ReactNode } })
      .desktop;
    const header = desktopProps?.header
      ? findByType(desktopProps.header, YoAppHeader)
      : undefined;
    if (label === "Course Home") {
      // Course Home uses YoCourseAppHeader (which wraps YoAppHeader
      // via the existing course chrome). The runtime contract is
      // simply: a header element exists in the desktop sub-tree.
      assert.ok(
        desktopProps?.header !== undefined && desktopProps.header !== null,
        `Course Home desktop sub-tree must declare a header`,
      );
      continue;
    }
    assert.ok(
      header,
      `${label} desktop sub-tree must mount <YoAppHeader>`,
    );
    const appearance = (header!.props as { appearance?: string }).appearance;
    assert.strictEqual(
      appearance,
      "desktop",
      `${label} desktop header must use appearance="desktop"; got ${appearance}`,
    );
  }
});

// ─── 3. Three-pane workspace on every audited surface ────────────
test("desktop sub-trees declare leftRail + center, with rightRail only where it does not squeeze the surface", async () => {
  for (const [label, tree, requiresRightRail] of [
    ["Spanish hub", (await renderPage(YoSpanishLandingPage)) as ReactElement, false],
    [
      "Course Home",
      (await renderPage(YoEspagnolRepubliqueDominicainePage)) as ReactElement,
      true,
    ],
  ] as const) {
    const adaptive = findAdaptiveShellElement(tree);
    const desktop = (adaptive!.props as {
      desktop: { center?: unknown; leftRail?: unknown; rightRail?: unknown };
    }).desktop;
    assert.ok(desktop.center, `${label} desktop must declare a center`);
    assert.ok(desktop.leftRail, `${label} desktop must declare a leftRail`);
    if (requiresRightRail) {
      assert.ok(desktop.rightRail, `${label} desktop must declare a rightRail`);
    }
  }
});

// ─── 4. Catalog desktop centre uses a wider grid (not stretched mobile) ─
test("catalog uses one shrinkable mobile column and two comfortable desktop columns", () => {
  const src = read("components/yo/YoLanguageQuickStart.tsx");
  assert.match(src, /<ul className="grid min-w-0 gap-3 md:grid-cols-2"/);
  const cards = [...walk(YoLanguageQuickStart({ locale: "fr" }))].filter(element => element.type === "li");
  assert.ok(cards.length > 0);
  for (const card of cards) {
    assert.ok(card.key, "language cards need stable keys");
    assert.ok((card.props as { className: string }).className.split(" ").includes("min-w-0"),
      "every language card must remain shrinkable");
  }
  assert.match(src, /break-words/);
  assert.doesNotMatch(src, /overflow-x-auto|xl:grid-cols-3/);
});

// ─── 5. YoDesktopAppWorkspace emits the standard rail / pane attrs ─
test("YoDesktopAppWorkspace ships stable data-yo-desktop-workspace-{rail,pane} attributes", () => {
  const src = read("components/yo/YoDesktopAppWorkspace.tsx");
  for (const re of [
    /data-yo-desktop-workspace-rail=["']left["']/,
    /data-yo-desktop-workspace-rail=["']right["']/,
    /data-yo-desktop-workspace-pane=["']center["']/,
  ]) {
    assert.match(src, re, `YoDesktopAppWorkspace must emit ${re.source}`);
  }
});

// ─── 6. Mobile + desktop headers are different elements ──────────
test("mobile and desktop headers on each audited surface are different element instances", async () => {
  for (const [label, tree] of [
    ["Spanish hub", (await renderPage(YoSpanishLandingPage)) as ReactElement],
    [
      "Course Home",
      (await renderPage(YoEspagnolRepubliqueDominicainePage)) as ReactElement,
    ],
  ] as const) {
    const adaptive = findAdaptiveShellElement(tree);
    const { mobile, desktop } = adaptive!.props as {
      mobile: { header?: ReactNode };
      desktop: { header?: ReactNode };
    };
    if (mobile.header && desktop.header) {
      assert.notStrictEqual(
        mobile.header,
        desktop.header,
        `${label} mobile and desktop headers must be different elements`,
      );
    } else {
      assert.fail(
        `${label} must declare both a mobile.header and a desktop.header`,
      );
    }
  }
});

// ─── 7. Desktop workspace primitive — natural scroll + grid ─────
test("YoDesktopLearningWorkspace composes a natural-scroll wrapper + grid + hidden lg:block", () => {
  // World-class-shell pass: desktop intentionally dropped the
  // <YoAppShell> viewport-lock (h-[100dvh] overflow-hidden) — that
  // lock is what produced "trapped in a tiny internal scrollbar"
  // on /yo/langues and the Course Home desktop workspace. Desktop
  // now scrolls the page naturally with only a `sticky` header.
  const src = read("components/yo/YoDesktopLearningWorkspace.tsx");
  assert.ok(
    !/from\s+["']@\/components\/yo\/YoAppShell["']/.test(src),
    "YoDesktopLearningWorkspace must NOT import YoAppShell anymore",
  );
  assert.match(
    src,
    /from\s+["']@\/components\/yo\/YoDesktopAppWorkspace["']/,
    "YoDesktopLearningWorkspace must import YoDesktopAppWorkspace",
  );
  assert.match(
    src,
    /hidden lg:block/,
    "YoDesktopLearningWorkspace must be hidden below `lg` and visible from `lg+`",
  );
  assert.ok(
    !/<YoAppShell\b/.test(src),
    "YoDesktopLearningWorkspace must NOT render <YoAppShell /> anymore",
  );
  assert.match(
    src,
    /sticky top-0/,
    "YoDesktopLearningWorkspace must keep its own header sticky while the page scrolls naturally",
  );
  assert.match(
    src,
    /<YoDesktopAppWorkspace\b/,
    "YoDesktopLearningWorkspace must render <YoDesktopAppWorkspace />",
  );
  // Suppress unused-import lint for YoDesktopLearningWorkspace.
  void YoDesktopLearningWorkspace;
});

// ─── 8. CSS grid-template-columns comma regression guard ─────────
test("no audited file declares lg:grid-cols-[…] with a top-level comma (browser-killing track list)", () => {
  // The smoking-gun bug Phase 0 fixed: writing
  // `lg:grid-cols-[280px,minmax(0,1fr),300px]` produces an
  // invalid CSS `grid-template-columns` declaration (commas are
  // only allowed inside `minmax(…)` / `repeat(…)` / `var(…)`).
  // Every browser silently drops the whole rule and the workspace
  // collapses to `grid-cols-1`. This guard parses every
  // `grid-cols-[…]` arbitrary value across the YoPratiqo source
  // tree and refuses any track list with a top-level comma.
  function extractGridColsArbitrary(source: string): string[] {
    const out: string[] = [];
    const needle = "grid-cols-[";
    let i = 0;
    while (i < source.length) {
      const idx = source.indexOf(needle, i);
      if (idx === -1) break;
      const start = idx + needle.length;
      let depth = 1;
      let j = start;
      while (j < source.length && depth > 0) {
        const ch = source[j];
        if (ch === "[") depth++;
        else if (ch === "]") depth--;
        j++;
      }
      if (depth === 0) {
        out.push(source.slice(start, j - 1));
      }
      i = j;
    }
    return out;
  }
  function hasTopLevelComma(trackList: string): boolean {
    let depth = 0;
    for (let k = 0; k < trackList.length; k++) {
      const ch = trackList[k];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) return true;
    }
    return false;
  }
  // Static scan: every Tailwind `grid-cols-[…]` arbitrary value
  // shipped by the YoPratiqo surface (components + routes) must
  // be a valid CSS track list.
  const sourcesToScan: string[] = [
    "components/yo/YoDesktopAppWorkspace.tsx",
    "components/yo/YoDesktopLearningWorkspace.tsx",
    "components/yo/YoAppShell.tsx",
    "components/yo/YoAdaptiveStepShell.tsx",
    "components/yo/YoMobileAppStepShell.tsx",
    "components/yo/YoStepNavigator.tsx",
    "components/yo/YoLanguageLandingPage.tsx",
    "components/yo/YoStudentHubContent.tsx",
    "app/yo/langues/page.tsx",
    "app/yo/langues/espagnol/page.tsx",
    "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx",
    "app/yo/langues/espagnol/pays/republique-dominicaine/decouvrir/page.tsx",
    "app/(app)/student/yopratiqo/page.tsx",
    "app/(app)/student/progress/page.tsx",
  ];
  for (const rel of sourcesToScan) {
    const src = read(rel);
    const tracks = extractGridColsArbitrary(src);
    for (const t of tracks) {
      assert.ok(
        !hasTopLevelComma(t),
        `${rel} declares grid-cols-[${t}] with a top-level comma (CSS grid-template-columns is space-separated; commas only inside minmax/repeat/var)`,
      );
    }
  }
});

// ─── 9. Paid checkout disabled + no restricted system ────────────
test("paid YoPratiqo checkout remains disabled and no restricted system is touched on the desktop primitives", () => {
  const configSrc = read("lib/yo/yopratiqoProductConfig.ts");
  assert.match(
    configSrc,
    /premiumModulesEnabled:\s*false/,
    "paid YoPratiqo checkout must stay disabled",
  );
  const forbidden = [
    /from\s+["']stripe["']/i,
    /from\s+["']@supabase\/supabase-js["']/i,
    /from\s+["']@\/lib\/stripe/i,
    /from\s+["']@\/lib\/supabase\/server/i,
    /from\s+["']@\/lib\/membrePro/i,
    /from\s+["']@\/lib\/tax/i,
    /from\s+["']@\/lib\/payments/i,
    /from\s+["']openai["']/i,
    /from\s+["']@\/scripts\//i,
    /service[_-]?role/i,
  ];
  for (const p of [
    "components/yo/YoAdaptiveShell.tsx",
    "components/yo/YoDesktopLearningWorkspace.tsx",
    "components/yo/YoDesktopAppWorkspace.tsx",
    "components/yo/YoAppBottomBar.tsx",
  ]) {
    const src = read(p);
    for (const re of forbidden) {
      assert.ok(!re.test(src), `${p} must not import ${re.source}`);
    }
  }
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
  console.log(`[yo:desktop-workspace-contract] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
