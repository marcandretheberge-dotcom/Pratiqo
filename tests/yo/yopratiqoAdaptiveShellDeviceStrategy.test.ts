/**
 * YoPratiqo — adaptive shell device strategy suite.
 *
 * Locks the `feat/yopratiqo-adaptive-mobile-desktop-shell` contract
 * for the SHARED primitives that make device-specific behaviour
 * possible. The companion suite
 * `yopratiqoMobileNoScrollContract.test.ts` validates that every
 * audited app surface actually USES this strategy.
 *
 *   1. The five new adaptive primitives exist:
 *        - components/yo/YoAdaptiveShell.tsx
 *        - components/yo/YoMobileAppShell.tsx
 *        - components/yo/YoDesktopLearningWorkspace.tsx
 *        - components/yo/YoScreenPager.tsx
 *        - components/yo/YoAppBottomBar.tsx
 *   2. YoAdaptiveShell mounts BOTH a mobile sub-tree
 *      (`<YoMobileAppShell>`) AND a desktop sub-tree
 *      (`<YoDesktopLearningWorkspace>`) — so the desktop layout is
 *      never just the mobile pager scaled up.
 *   3. Mobile sub-tree composes `<YoAppShell>` + `<YoScreenPager>`
 *      and is hidden on `lg+`.
 *   4. Desktop sub-tree composes `<YoAppShell>` +
 *      `<YoDesktopAppWorkspace>` and is hidden below `lg`.
 *   5. `<YoScreenPager>` lays its children out as horizontally
 *      paged screens with CSS scroll-snap — NOT a vertical
 *      overflow container — on mobile.
 *   6. `<YoAppBottomBar>` is mobile-only by default but supports
 *      `appearance="always"` for surfaces that want a persistent
 *      desktop CTA.
 *   7. `<YoAppHeader>` exposes a `mobile | desktop | auto`
 *      `appearance` prop and mounts the matching variant.
 *   8. The mobile + desktop sub-trees have DISTINCT DOM (different
 *      data-testid roots) — so a runtime probe (and a screen
 *      reader) can tell them apart.
 *   9. Paid YoPratiqo checkout remains disabled.
 *  10. No restricted system touched.
 *
 * Style: `node:test`-style static-source assertions.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}
function exists(rel: string): boolean {
  return existsSync(join(REPO_ROOT, rel));
}
function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const ADAPTIVE_PATH = "components/yo/YoAdaptiveShell.tsx";
const MOBILE_PATH = "components/yo/YoMobileAppShell.tsx";
const DESKTOP_PATH = "components/yo/YoDesktopLearningWorkspace.tsx";
const PAGER_PATH = "components/yo/YoScreenPager.tsx";
const BOTTOM_BAR_PATH = "components/yo/YoAppBottomBar.tsx";
const APP_HEADER_PATH = "components/yo/YoAppHeader.tsx";

// ─── 1. Five primitives exist ────────────────────────────────────
test("the five adaptive-shell primitives all exist on disk", () => {
  for (const p of [
    ADAPTIVE_PATH,
    MOBILE_PATH,
    DESKTOP_PATH,
    PAGER_PATH,
    BOTTOM_BAR_PATH,
  ]) {
    assert.ok(exists(p), `${p} must exist`);
  }
});

// ─── 2. YoAdaptiveShell mounts BOTH sub-trees ─────────────────────
test("YoAdaptiveShell mounts both YoMobileAppShell + YoDesktopLearningWorkspace", () => {
  const src = read(ADAPTIVE_PATH);
  const code = stripJsComments(src);
  assert.match(
    src,
    /from\s+["']@\/components\/yo\/YoMobileAppShell["']/,
    "YoAdaptiveShell must import YoMobileAppShell",
  );
  assert.match(
    src,
    /from\s+["']@\/components\/yo\/YoDesktopLearningWorkspace["']/,
    "YoAdaptiveShell must import YoDesktopLearningWorkspace",
  );
  assert.match(
    code,
    /<YoMobileAppShell\b/,
    "YoAdaptiveShell must mount <YoMobileAppShell />",
  );
  assert.match(
    code,
    /<YoDesktopLearningWorkspace\b/,
    "YoAdaptiveShell must mount <YoDesktopLearningWorkspace />",
  );
});

// ─── 3. Mobile sub-tree composes shell + pager + lg:hidden ───────
test("YoMobileAppShell composes <YoAppShell> + <YoScreenPager> and is lg:hidden", () => {
  const src = read(MOBILE_PATH);
  const code = stripJsComments(src);
  assert.match(
    src,
    /from\s+["']@\/components\/yo\/YoAppShell["']/,
    "YoMobileAppShell must import YoAppShell",
  );
  assert.match(
    src,
    /from\s+["']@\/components\/yo\/YoScreenPager["']/,
    "YoMobileAppShell must import YoScreenPager",
  );
  assert.match(code, /<YoAppShell\b/, "YoMobileAppShell must render <YoAppShell />");
  assert.match(
    code,
    /<YoScreenPager\b/,
    "YoMobileAppShell must render <YoScreenPager />",
  );
  assert.match(
    code,
    /lg:hidden/,
    "YoMobileAppShell wrapper must be hidden on `lg+`",
  );
});

// ─── 4. Desktop sub-tree composes shell + workspace + lg:block ───
test("YoDesktopLearningWorkspace composes <YoAppShell> + <YoDesktopAppWorkspace> and is hidden lg:block", () => {
  const src = read(DESKTOP_PATH);
  const code = stripJsComments(src);
  assert.match(
    src,
    /from\s+["']@\/components\/yo\/YoAppShell["']/,
    "YoDesktopLearningWorkspace must import YoAppShell",
  );
  assert.match(
    src,
    /from\s+["']@\/components\/yo\/YoDesktopAppWorkspace["']/,
    "YoDesktopLearningWorkspace must import YoDesktopAppWorkspace",
  );
  assert.match(
    code,
    /<YoAppShell\b/,
    "YoDesktopLearningWorkspace must render <YoAppShell />",
  );
  assert.match(
    code,
    /<YoDesktopAppWorkspace\b/,
    "YoDesktopLearningWorkspace must render <YoDesktopAppWorkspace />",
  );
  assert.match(
    code,
    /hidden lg:block/,
    "YoDesktopLearningWorkspace wrapper must be hidden below `lg` and visible from `lg+`",
  );
});

// ─── 5. YoScreenPager — horizontal snap pages, NOT vertical scroll ─
test("YoScreenPager uses CSS scroll-snap horizontal paging (not vertical overflow scrolling)", () => {
  const src = read(PAGER_PATH);
  const code = stripJsComments(src);
  // Horizontal snap + horizontal overflow:
  for (const re of [
    /snap-x/,
    /snap-mandatory/,
    /flex-row/,
    /overflow-x-auto/,
    /overscroll-x-contain/,
  ]) {
    assert.match(
      code,
      re,
      `YoScreenPager must declare ${re.source}`,
    );
  }
  // Each screen is exactly one viewport wide on the track:
  assert.match(
    code,
    /min-w-full/,
    "YoScreenPager screens must take min-w-full so each is one viewport wide",
  );
  assert.match(
    code,
    /snap-start/,
    "YoScreenPager screens must declare snap-start so the swipe lands cleanly",
  );
  // On lg+ the pager defers to the workspace (no snap-paging):
  assert.match(
    code,
    /lg:flex-col/,
    "YoScreenPager must collapse into a vertical column on lg+ so the workspace owns layout",
  );
  assert.match(
    code,
    /lg:snap-none/,
    "YoScreenPager must turn snap-paging off on lg+",
  );
});

// ─── 6. YoAppBottomBar — mobile-only by default, opt-in always ───
test("YoAppBottomBar is mobile-only by default and supports appearance='always'", () => {
  const src = read(BOTTOM_BAR_PATH);
  const code = stripJsComments(src);
  assert.match(
    src,
    /appearance\?\s*:\s*["']mobile-only["']\s*\|\s*["']always["']/,
    "YoAppBottomBar must expose appearance: mobile-only | always",
  );
  assert.match(
    code,
    /lg:hidden/,
    "YoAppBottomBar default ('mobile-only') must be hidden on `lg+`",
  );
});

// ─── 7. YoAppHeader exposes the adaptive `appearance` API ────────
test("YoAppHeader exposes appearance: mobile | desktop | auto and mounts the matching variant", () => {
  const src = read(APP_HEADER_PATH);
  const code = stripJsComments(src);
  assert.match(
    src,
    /appearance\?\s*:\s*["']mobile["']\s*\|\s*["']desktop["']\s*\|\s*["']auto["']/,
    "YoAppHeader must expose appearance: mobile | desktop | auto",
  );
  for (const re of [
    /data-yo-app-header-appearance=["']mobile["']/,
    /data-yo-app-header-appearance=["']desktop["']/,
  ]) {
    assert.match(
      code,
      re,
      `YoAppHeader must emit ${re.source}`,
    );
  }
});

// ─── 8. Sub-trees have DISTINCT roots ────────────────────────────
test("YoMobileAppShell and YoDesktopLearningWorkspace ship distinct stable data-testid roots", () => {
  assert.match(
    read(MOBILE_PATH),
    /data-testid=["']yo-mobile-app-shell["']/,
    "YoMobileAppShell must root at data-testid=\"yo-mobile-app-shell\"",
  );
  assert.match(
    read(DESKTOP_PATH),
    /data-testid=["']yo-desktop-learning-workspace["']/,
    "YoDesktopLearningWorkspace must root at data-testid=\"yo-desktop-learning-workspace\"",
  );
  assert.match(
    read(ADAPTIVE_PATH),
    /data-testid=["']yo-adaptive-shell["']/,
    "YoAdaptiveShell must root at data-testid=\"yo-adaptive-shell\"",
  );
});

// ─── 9. Paid YoPratiqo checkout remains disabled ─────────────────
test("paid YoPratiqo checkout remains disabled in yopratiqoProductConfig.ts", () => {
  const configSrc = read("lib/yo/yopratiqoProductConfig.ts");
  assert.match(
    configSrc,
    /premiumModulesEnabled:\s*false/,
    "paid YoPratiqo checkout must stay disabled",
  );
});

// ─── 10. No restricted system touched ────────────────────────────
test("the five adaptive primitives import no restricted systems", () => {
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
    ADAPTIVE_PATH,
    MOBILE_PATH,
    DESKTOP_PATH,
    PAGER_PATH,
    BOTTOM_BAR_PATH,
  ]) {
    const src = read(p);
    for (const re of forbidden) {
      assert.ok(
        !re.test(src),
        `${p} must not import ${re.source}`,
      );
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
  console.log(`[yo:adaptive-shell-device-strategy] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
