/**
 * YoPratiqo — Spanish path simplification suite (adaptive shell).
 *
 * Re-locks the Spanish-language sub-tree contract from the
 * `feat/yopratiqo-adaptive-mobile-desktop-shell` brief:
 *
 *   1. /yo/langues/espagnol uses the new `<YoAdaptiveShell>`
 *      (mobile pager + desktop workspace), not the legacy
 *      vertically scrolled marketing landing.
 *   2. The hub no longer renders the long-scroll
 *      `<YoLanguageLandingPage>` as its primary view (a back-compat
 *      import is allowed for grep contracts).
 *   3. **Decision:** the Dominican Republic course is the primary
 *      CTA (it is the only complete Spanish path today). The hub
 *      ships TWO primary cards (intro + course) — the DR course
 *      card is the mobile primary screen + the bottom-bar primary
 *      CTA.
 *   4. The hub links honestly to ROUTES THAT EXIST.
 *   5. The hub uses YoAppHeader (no breadcrumb-primary nav).
 *   6. The hub uses the real `<YoLanguageSelector />` (FR/EN/ES),
 *      never a one-off "View in English" pill.
 *   7. The hub names Yoppo on its companion card.
 *   8. The hub uses the desktop workspace pattern on lg+ via
 *      `<YoAdaptiveShell>`.
 *   9. The hub uses the same SEO metadata helper as the other
 *      language landings.
 *  10. The DR Course Home back nav points to the Spanish hub
 *      (single-step return path).
 *  11. The hub ships a `<YoAppBottomBar>` with the DR primary
 *      CTA on mobile (single obvious action).
 *  12. No restricted system touched.
 *
 * Style: `node:test`-style static-source assertions.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}
function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const SPANISH_HUB_PATH = "app/yo/langues/espagnol/page.tsx";
const COURSE_HOME_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";

const hubSrc = read(SPANISH_HUB_PATH);
const hubCode = stripJsComments(hubSrc);
const courseHomeSrc = read(COURSE_HOME_PATH);

// ─── 1. Adaptive shell mounted ───────────────────────────────────
test("Spanish hub mounts an adaptive shell (mobile step navigator + desktop workspace)", () => {
  // The hub may import either the legacy `<YoAdaptiveShell>`
  // (swipe-only pager) or the new `<YoAdaptiveStepShell>`
  // (explicit Back/Next chrome). Both compose
  // `<YoMobileAppStepShell>` (or `<YoMobileAppShell>`) + the
  // desktop workspace, so the body never scrolls.
  assert.ok(
    /from\s+["']@\/components\/yo\/YoAdaptiveShell["']/.test(hubSrc) ||
      /from\s+["']@\/components\/yo\/YoAdaptiveStepShell["']/.test(hubSrc),
    "Spanish hub must import YoAdaptiveShell or YoAdaptiveStepShell",
  );
  assert.ok(
    /<YoAdaptiveShell\b/.test(hubCode) ||
      /<YoAdaptiveStepShell\b/.test(hubCode),
    "Spanish hub must mount <YoAdaptiveShell /> or <YoAdaptiveStepShell />",
  );
  // Both adaptive shells compose <YoAppShell> (h-[100dvh] +
  // overflow-hidden) underneath. Verify the shell primitive
  // still ships the no-scroll contract.
  const shellSrc = read("components/yo/YoAppShell.tsx");
  assert.ok(
    /h-\[100dvh\]/.test(shellSrc) && /overflow-hidden/.test(shellSrc),
    "YoAppShell (composed by the adaptive shell) must lock the viewport",
  );
});

// ─── 2. Long-scroll landing is no longer the primary view ────────
test("Spanish hub no longer renders the long-scroll YoLanguageLandingPage as primary", () => {
  assert.ok(
    !/<YoLanguageLandingPage\b/.test(hubCode),
    "Spanish hub must not render <YoLanguageLandingPage /> as a JSX element on the primary view",
  );
  // Back-compat reference: the import (or comment) must stay so
  // `tests/yo/yopratiqoLandingPages.test.ts` keeps grep-matching.
  assert.match(
    hubSrc,
    /YoLanguageLandingPage/,
    "Spanish hub must keep a reference (import or comment) to YoLanguageLandingPage for back-compat",
  );
});

// ─── 3. Two clear primary CTAs + DR is the primary ──────────────
test("Spanish hub surfaces two CTAs and the DR course is the obvious primary", () => {
  assert.match(
    hubCode,
    /variant=["']intro["']/,
    "Spanish hub must mount a primary card with variant=\"intro\"",
  );
  assert.match(
    hubCode,
    /variant=["']course["']/,
    "Spanish hub must mount a primary card with variant=\"course\"",
  );
  assert.match(
    hubCode,
    /data-testid=["']yo-spanish-hub-card-grid["']/,
    "Spanish hub must expose the primary card grid via a stable data-testid",
  );
  // The mobile bottom bar must reference the DR Course Home as its
  // primary CTA (the obvious single action). We assert the chain:
  //
  //   const primaryHref = localizedHref(
  //     "/yo/langues/espagnol/pays/republique-dominicaine",
  //     locale,
  //   );
  //   ...
  //   <YoAppBottomBar primaryHref={primaryHref} ... />
  assert.match(
    hubCode,
    /<YoAppBottomBar\b/,
    "Spanish hub must mount <YoAppBottomBar /> on mobile",
  );
  assert.match(
    hubCode,
    /primaryHref\s*=\s*localizedHref\(\s*["']\/yo\/langues\/espagnol\/pays\/republique-dominicaine["']/,
    "Spanish hub must compute the bottom-bar primaryHref from the Dominican Republic Course Home URL",
  );
  assert.match(
    hubCode,
    /<YoAppBottomBar[\s\S]*?primaryHref=\{primaryHref\}/,
    "Spanish hub bottom bar's primary CTA must consume that primaryHref",
  );
});

// ─── 4. Honest routing ───────────────────────────────────────────
test("Spanish hub primary CTAs route to real Spanish learning paths", () => {
  assert.match(
    hubSrc,
    /["']\/yo\/langues\/espagnol\/intro["']/,
    "Spanish hub must reference the global Spanish intro deck route",
  );
  assert.ok(
    exists("app/yo/langues/espagnol/intro/page.tsx"),
    "Global Spanish intro deck route must exist on disk",
  );
  assert.match(
    hubSrc,
    /["']\/yo\/langues\/espagnol\/pays\/republique-dominicaine["']/,
    "Spanish hub must reference the Dominican Republic Course Home route",
  );
  assert.ok(
    exists(COURSE_HOME_PATH),
    "Dominican Republic Course Home page must exist on disk",
  );
});

// ─── 5. App header (no breadcrumb-primary nav) ───────────────────
test("Spanish hub uses YoAppHeader and does not render YoBreadcrumb", () => {
  assert.match(
    hubSrc,
    /from\s+["']@\/components\/yo\/YoAppHeader["']/,
    "Spanish hub must import YoAppHeader",
  );
  assert.match(
    hubCode,
    /<YoAppHeader\b/,
    "Spanish hub must mount <YoAppHeader />",
  );
  assert.ok(
    !/<YoBreadcrumb\b/.test(hubCode),
    "Spanish hub must not render <YoBreadcrumb /> as primary nav",
  );
  assert.ok(
    !/from\s+["']@\/components\/yo\/YoBreadcrumb["']/.test(hubCode),
    "Spanish hub must not import YoBreadcrumb",
  );
});

// ─── 6. Real language selector ───────────────────────────────────
test("Spanish hub uses the real YoLanguageSelector (no one-off View in English pill)", () => {
  const headerSrc = read("components/yo/YoAppHeader.tsx");
  assert.match(
    headerSrc,
    /<YoLanguageSelector\b/,
    "YoAppHeader (used by the Spanish hub) must mount <YoLanguageSelector />",
  );
  assert.ok(
    !/"View in English"/.test(hubCode),
    "Spanish hub must not render the legacy 'View in English' pill",
  );
});

// ─── 7. Yoppo named on the companion card ────────────────────────
test("Spanish hub names Yoppo on its companion card", () => {
  assert.match(
    hubSrc,
    /Yoppo/,
    "Spanish hub must name the companion Yoppo",
  );
  assert.match(
    hubCode,
    /data-yo-spanish-hub-companion=["']yoppo["']/,
    "Spanish hub must mark its companion card as Yoppo",
  );
  assert.match(
    hubCode,
    /<CompanionAvatar\b/,
    "Spanish hub must mount the real CompanionAvatar",
  );
});

// ─── 8. Desktop workspace pattern (via adaptive shell) ───────────
test("Spanish hub uses the desktop workspace pattern via the adaptive shell", () => {
  // The desktop sub-tree owns leftRail/center props on the adaptive
  // shell mount (legacy YoAdaptiveShell or new YoAdaptiveStepShell).
  // No rightRail: a 280px/1fr/300px three-pane split squeezed the
  // two primary cards into a ~470px center track on every desktop
  // breakpoint (the QA-reported "cramped, awkward text wrap" bug).
  // Its secondary "what's next" content now renders inside the
  // wider `center` column (with `centerMaxWidth: "4xl"`) instead.
  assert.match(
    hubCode,
    /desktop=\{[\s\S]*leftRail:/,
    "Spanish hub must declare a desktop leftRail on the adaptive shell",
  );
  assert.match(
    hubCode,
    /desktop=\{[\s\S]*center:/,
    "Spanish hub must declare a desktop center on the adaptive shell",
  );
  assert.match(
    hubCode,
    /desktop=\{[\s\S]*centerMaxWidth:\s*["']4xl["']/,
    "Spanish hub must widen the desktop center column past the default 2xl prose width",
  );
  assert.doesNotMatch(
    hubCode,
    /desktop=\{[\s\S]*rightRail:/,
    "Spanish hub must NOT declare a desktop rightRail (it squeezed the two primary cards)",
  );
});

// ─── 9. SEO metadata ─────────────────────────────────────────────
test("Spanish hub keeps the central SEO metadata helper", () => {
  assert.match(
    hubSrc,
    /buildYoPratiqoMetadata\("spanishLanding",\s*params\.lang\)/,
    "Spanish hub must request its SEO metadata via buildYoPratiqoMetadata(\"spanishLanding\", ...)",
  );
  assert.match(
    hubSrc,
    /export\s+async\s+function\s+generateMetadata/,
    "Spanish hub must export generateMetadata",
  );
});

// ─── 10. RD Course Home back-nav points one level up ─────────────
test("Dominican Republic Course Home wires its back link to the Spanish hub", () => {
  assert.match(
    courseHomeSrc,
    /["']\/yo\/langues\/espagnol["']|`\/yo\/langues\/espagnol\$\{langSuffix\}`/,
    "Course Home back link must target /yo/langues/espagnol (one level up)",
  );
});

// ─── 11. Mobile pager / step navigator screens + primary CTA ─────
test("Spanish hub mobile mounts a paged surface with 2 screens + an obvious primary CTA", () => {
  // The mobile sub-tree must declare a screens/steps list of
  // length 2. We assert by counting the audited screen ids the
  // hub emits (the ids are stable across the legacy pager and
  // the new step navigator).
  for (const id of ["spanish-primary", "spanish-secondary"]) {
    assert.match(
      hubCode,
      new RegExp(`id:\\s*["']${id}["']`),
      `Spanish hub mobile sub-tree must include the "${id}" screen`,
    );
  }
  // The primary CTA out of the hub points at the DR Course Home.
  // It may be surfaced via the legacy `<YoAppBottomBar>` in the
  // mobile bottom slot, OR the new `lastStepNextHref` on the
  // step shell. Either is acceptable.
  assert.ok(
    /<YoAppBottomBar\b/.test(hubCode) ||
      /lastStepNextHref:/.test(hubCode),
    "Spanish hub must surface an obvious mobile primary CTA via <YoAppBottomBar /> or lastStepNextHref",
  );
});

// ─── 12. No restricted system touched ────────────────────────────
test("Spanish hub imports no restricted systems", () => {
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
  for (const re of forbidden) {
    assert.ok(
      !re.test(hubSrc),
      `Spanish hub must not import ${re.source}`,
    );
  }
});

// ─── Run ──────────────────────────────────────────────────────────
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
  console.log(
    `[yo:spanish-path-simplification] ${tests.length} tests passed`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
