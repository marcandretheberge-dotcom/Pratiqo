/**
 * YoPratiqo — language catalog (`/yo/langues`) app-shell suite.
 *
 * Locks the new `feat/yopratiqo-no-scroll-app-shell-flow` contract
 * for the catalog screen (replaces the previous version that asserted
 * the legacy `min-h-[100dvh]` body-scroll + sticky-rail pattern):
 *
 *  1. /yo/langues uses YoPratiqo branding/logo.
 *  2. /yo/langues drops breadcrumb-primary navigation in favour of
 *     the shared `<YoAppHeader />`.
 *  3. /yo/langues mounts the shared `<YoAppShell />` (viewport-locked
 *     `h-[100dvh]` + `overflow-hidden`).
 *  4. /yo/langues uses the real `<YoLanguageSelector />` (FR/EN/ES)
 *     instead of a one-off "View in English" pill.
 *  5. /yo/langues uses the desktop workspace pattern on lg+.
 *  6. The Spanish, Quebec French, Italian, Japanese, and English
 *     cards point at the correct intro / hub routes.
 *  7. /yo/langues uses app-like premium tiles (rounded-3xl + soft
 *     shadow + per-card data attribute).
 *  8. Companion presence — Yoppo is named on the catalog rail.
 *  9. No fake paid claims; the free-intro framing is preserved.
 * 10. Paid YoPratiqo checkout remains disabled.
 * 11. No restricted system touched.
 *
 * Style: `node:test`-style static-source assertions. No browser,
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

const CATALOG_PATH = "app/yo/langues/page.tsx";
const catalogSrc = read(CATALOG_PATH);
const catalogCode = stripJsComments(catalogSrc);

// ─── 1. YoPratiqo branding / logo ─────────────────────────────────
test("catalog mounts the YoPratiqo logo", () => {
  assert.match(
    catalogSrc,
    /from\s+["']@\/components\/yo\/YoPratiqoLogo["']/,
    "catalog must import YoPratiqoLogo",
  );
  assert.match(
    catalogCode,
    /<YoPratiqoLogo\b/,
    "catalog must render <YoPratiqoLogo />",
  );
  // No standalone "Yo" — must always be "YoPratiqo" or "Yoppo".
  const standalone = catalogCode.match(
    /(?<![A-Za-z0-9_-])Yo(?![A-Za-z])(?!\s*Pratiqo)/g,
  );
  assert.ok(
    standalone === null,
    `catalog must always say 'YoPratiqo' (or 'Yoppo'), never 'Yo' alone: ${
      standalone?.slice(0, 3).join(", ") ?? ""
    }`,
  );
});

// ─── 2. No breadcrumb-primary navigation ─────────────────────────
test("catalog drops breadcrumb-primary navigation in favour of YoAppHeader", () => {
  assert.ok(
    !/<YoBreadcrumb\b/.test(catalogCode),
    "catalog must not render <YoBreadcrumb />",
  );
  assert.ok(
    !/from\s+["']@\/components\/yo\/YoBreadcrumb["']/.test(catalogCode),
    "catalog must not import YoBreadcrumb",
  );
  assert.match(
    catalogSrc,
    /from\s+["']@\/components\/yo\/YoAppHeader["']/,
    "catalog must import the shared YoAppHeader",
  );
  assert.match(
    catalogCode,
    /<YoAppHeader\b/,
    "catalog must mount <YoAppHeader />",
  );
  // The catalog still ships its legacy data-testids so older static
  // checks (and the legal-guard suite) continue to recognise the
  // screen.
  assert.match(
    catalogCode,
    /data-testid="yo-langues-catalog-header"/,
    "catalog must continue to expose the catalog-header data-testid",
  );
  assert.match(
    catalogCode,
    /data-testid="yo-langues-catalog-back"/,
    "catalog must continue to expose the catalog-back data-testid",
  );
  // The back arrow must wire to /yo with the lang suffix.
  assert.match(
    catalogCode,
    /\/yo\$\{langSuffix\}/,
    "catalog back arrow must target /yo with the lang suffix",
  );
});

// ─── 3. Viewport-locked app shell ────────────────────────────────
test("catalog mounts YoAppShell so the page never body-scrolls", () => {
  assert.match(
    catalogSrc,
    /from\s+["']@\/components\/yo\/YoAppShell["']/,
    "catalog must import YoAppShell",
  );
  assert.match(
    catalogCode,
    /<YoAppShell\b/,
    "catalog must render <YoAppShell />",
  );
  // The shell itself is the contract owner — assert the contract is
  // present in the shared primitive too.
  const shellSrc = read("components/yo/YoAppShell.tsx");
  assert.match(
    shellSrc,
    /h-\[100dvh\]/,
    "YoAppShell must lock the viewport with h-[100dvh]",
  );
  assert.match(
    shellSrc,
    /overflow-hidden/,
    "YoAppShell must declare overflow-hidden so the body never scrolls",
  );
});

// ─── 4. Real language selector ────────────────────────────────────
test("catalog uses the real <YoLanguageSelector /> via YoAppHeader (no one-off View in English)", () => {
  // The selector is brought in via YoAppHeader — assert the
  // component is reachable from the catalog import graph.
  const headerSrc = read("components/yo/YoAppHeader.tsx");
  assert.match(
    headerSrc,
    /<YoLanguageSelector\b/,
    "YoAppHeader (used by the catalog) must mount <YoLanguageSelector />",
  );
  // The catalog must not ship the literal "View in English" pill
  // anymore — comments stripped so legacy doc-mentions don't count.
  assert.ok(
    !/"View in English"/.test(catalogCode),
    "catalog must not render the legacy 'View in English' pill",
  );
});

// ─── 5. Desktop workspace pattern ────────────────────────────────
test("catalog uses YoDesktopAppWorkspace on lg+ (real desktop app workspace, not stretched mobile)", () => {
  assert.match(
    catalogSrc,
    /from\s+["']@\/components\/yo\/YoDesktopAppWorkspace["']/,
    "catalog must import YoDesktopAppWorkspace",
  );
  assert.match(
    catalogCode,
    /<YoDesktopAppWorkspace\b/,
    "catalog must mount <YoDesktopAppWorkspace /> on lg+",
  );
});

// ─── 6. Honest language routing ──────────────────────────────────
test("catalog routes each language card to the correct intro / hub", () => {
  // Spanish → /yo/langues/espagnol (the Spanish hub)
  assert.match(
    catalogSrc,
    /id:\s*"spanish"[\s\S]*?href:\s*"\/yo\/langues\/espagnol"/,
    'Spanish card must point at the Spanish hub',
  );
  assert.ok(
    exists("app/yo/langues/espagnol/page.tsx"),
    "Spanish hub must exist on disk",
  );
  // Quebec French → /yo/langues/francais-quebec/intro
  assert.match(
    catalogSrc,
    /id:\s*"french"[\s\S]*?href:\s*"\/yo\/langues\/francais-quebec\/intro"/,
    'Quebec French card must point at the intro deck',
  );
  assert.ok(
    exists("app/yo/langues/francais-quebec/intro/page.tsx"),
    "Quebec French intro must exist on disk",
  );
  // Italian / Japanese
  assert.match(
    catalogSrc,
    /id:\s*"italian"[\s\S]*?href:\s*"\/yo\/langues\/italien\/intro"/,
    "Italian card must point at the intro deck",
  );
  assert.match(
    catalogSrc,
    /id:\s*"japanese"[\s\S]*?href:\s*"\/yo\/langues\/japonais\/intro"/,
    "Japanese card must point at the intro deck",
  );
  assert.ok(
    exists("app/yo/langues/italien/intro/page.tsx"),
    "Italian intro page must exist on disk",
  );
  assert.ok(
    exists("app/yo/langues/japonais/intro/page.tsx"),
    "Japanese intro page must exist on disk",
  );
  // English: if claimed available, the deck route must exist.
  const englishAvailable =
    /id:\s*"english"[\s\S]*?status:\s*"available"[\s\S]*?href:\s*"\/yo\/langues\/anglais\/intro"/.test(
      catalogSrc,
    );
  if (englishAvailable) {
    assert.ok(
      exists("app/yo/langues/anglais/intro/page.tsx"),
      "catalog claims English intro available — page.tsx must exist on disk",
    );
  } else {
    assert.ok(
      !/id:\s*"english"[\s\S]*?status:\s*"available"/.test(catalogSrc),
      "English card must not claim status: available when the deck route is missing",
    );
  }
});

// ─── 7. App-like premium tiles ───────────────────────────────────
test("catalog renders app-style language tiles, not generic web cards", () => {
  assert.match(
    catalogCode,
    /data-testid="yo-langues-catalog-tiles"/,
    "catalog must mount the tile grid container",
  );
  assert.match(
    catalogCode,
    /data-yo-langues-card-id=\{language\.id\}/,
    "each language tile must carry a data-yo-langues-card-id attribute",
  );
  assert.match(
    catalogCode,
    /rounded-3xl/,
    "tiles must use rounded-3xl premium corners",
  );
  assert.match(
    catalogCode,
    /shadow-\[0_8px_24px_rgba\(15,58,52,0\.05\)\]/,
    "tiles must declare the premium shadow",
  );
  // Cards stack one-up on mobile, two-up on sm+.
  assert.match(
    catalogCode,
    /grid\s+gap-4\s+sm:grid-cols-2/,
    "catalog card grid must declare `grid gap-4 sm:grid-cols-2`",
  );
});

// ─── 8. Yoppo named on the catalog rail ──────────────────────────
test("catalog left rail names Yoppo, the YoPratiqo companion", () => {
  assert.match(
    catalogSrc,
    /Yoppo/,
    "catalog must name the companion Yoppo on the rail",
  );
  assert.match(
    catalogCode,
    /<CompanionAvatar\b/,
    "catalog must mount the real CompanionAvatar (no fake mascot)",
  );
  assert.match(
    catalogCode,
    /from\s+["']@\/components\/companion\/CompanionAvatar["']/,
    "catalog must import CompanionAvatar via the manifest",
  );
});

// ─── 9. No fake paid claims ──────────────────────────────────────
test("catalog ships no fake paid claims (only free intro language)", () => {
  const forbidden = [
    /\bcheckout\b/i,
    /\bachète(?:r|z)?\b/i,
    /\bbuy\s+now\b/i,
    /\bplan\s+premium\b/i,
    /\babonnement\b/i,
    /\bsubscribe\b/i,
    /\bunlock\s+premium\b/i,
    /\bcredit\s*card\b/i,
  ];
  for (const re of forbidden) {
    assert.ok(
      !re.test(catalogCode),
      `catalog must not ship copy matching ${re.source}`,
    );
  }
  assert.match(
    catalogCode,
    /Intro gratuite/,
    "catalog must surface the 'Intro gratuite' promise tile (FR)",
  );
  assert.match(
    catalogCode,
    /Free intro/,
    "catalog must surface the 'Free intro' promise tile (EN)",
  );
});

// ─── 10. Paid YoPratiqo checkout remains disabled ────────────────
test("paid YoPratiqo checkout remains disabled in yopratiqoProductConfig.ts", () => {
  const configSrc = read("lib/yo/yopratiqoProductConfig.ts");
  assert.match(
    configSrc,
    /premiumModulesEnabled:\s*false/,
    "paid YoPratiqo checkout must stay disabled",
  );
});

// ─── 11. No restricted systems touched ───────────────────────────
test("catalog imports no restricted systems", () => {
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
      !re.test(catalogSrc),
      `catalog must not import ${re.source}`,
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
  console.log(`[yo:language-catalog-app-shell] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
