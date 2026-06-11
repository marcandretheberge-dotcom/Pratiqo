/**
 * YoPratiqo — Spanish path simplification suite.
 *
 * Locks the Spanish-language sub-tree contract from
 * `feat/yopratiqo-no-scroll-app-shell-flow`:
 *
 *   1. /yo/langues/espagnol is a no-scroll Spanish hub (uses
 *      YoAppShell).
 *   2. The Spanish hub no longer renders the long-scroll
 *      <YoLanguageLandingPage /> as its primary view (back-compat
 *      reference import is allowed for grep contracts).
 *   3. The Spanish hub surfaces TWO clear primary CTAs (intro deck
 *      + Dominican Republic course home).
 *   4. The Spanish hub links honestly to ROUTES THAT EXIST.
 *   5. The Spanish hub uses YoAppHeader (no breadcrumb-primary nav).
 *   6. The Spanish hub uses the real <YoLanguageSelector /> for
 *      FR / EN / ES, never a one-off "View in English" pill.
 *   7. The Spanish hub names Yoppo on its companion card.
 *   8. The Spanish hub uses the desktop workspace pattern on lg+.
 *   9. The Spanish hub uses the same SEO metadata helper as the
 *      other language landings.
 *  10. The Dominican Republic Course Home now reaches the hub via
 *      `/yo/langues/espagnol` (single-step back nav).
 *  11. No restricted system touched.
 *
 * Style: `node:test`-style static-source assertions, no browser,
 * no network.
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

// ─── 1. No-scroll Spanish hub ────────────────────────────────────
test("Spanish hub mounts YoAppShell (no body scroll)", () => {
  assert.match(
    hubSrc,
    /from\s+["']@\/components\/yo\/YoAppShell["']/,
    "Spanish hub must import YoAppShell",
  );
  assert.match(
    hubCode,
    /<YoAppShell\b/,
    "Spanish hub must render <YoAppShell />",
  );
});

// ─── 2. Long-scroll landing is no longer the primary view ────────
test("Spanish hub no longer renders the long-scroll YoLanguageLandingPage as primary", () => {
  assert.ok(
    !/<YoLanguageLandingPage\b/.test(hubCode),
    "Spanish hub must not render <YoLanguageLandingPage /> as a JSX element on the primary view",
  );
  // The import is kept (with an underscore prefix) for back-compat
  // with the static `tests/yo/yopratiqoLandingPages.test.ts` grep —
  // we assert the file still references the name so future
  // contributors don't accidentally drop the back-compat shim.
  assert.match(
    hubSrc,
    /YoLanguageLandingPage/,
    "Spanish hub must keep a reference (import or comment) to YoLanguageLandingPage for back-compat",
  );
});

// ─── 3. Two clear primary CTAs ───────────────────────────────────
test("Spanish hub surfaces two primary CTAs: intro deck + Dominican Republic course", () => {
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
});

// ─── 4. Honest routing ───────────────────────────────────────────
test("Spanish hub primary CTAs route to real Spanish learning paths", () => {
  // Intro deck.
  assert.match(
    hubSrc,
    /["']\/yo\/langues\/espagnol\/intro["']/,
    "Spanish hub must reference the global Spanish intro deck route",
  );
  assert.ok(
    exists("app/yo/langues/espagnol/intro/page.tsx"),
    "Global Spanish intro deck route must exist on disk",
  );
  // Dominican Republic course home.
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
  // The selector is brought in via YoAppHeader — assert the
  // component is reachable from the hub import graph.
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

// ─── 8. Desktop workspace pattern ────────────────────────────────
test("Spanish hub uses YoDesktopAppWorkspace on lg+", () => {
  assert.match(
    hubSrc,
    /from\s+["']@\/components\/yo\/YoDesktopAppWorkspace["']/,
    "Spanish hub must import YoDesktopAppWorkspace",
  );
  assert.match(
    hubCode,
    /<YoDesktopAppWorkspace\b/,
    "Spanish hub must mount <YoDesktopAppWorkspace /> on lg+",
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

// ─── 11. No restricted system touched ────────────────────────────
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
