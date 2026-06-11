/**
 * YoPratiqo — language catalog (`/yo/langues`) app-shell suite.
 *
 * Locks the catalog half of the
 * `feat/yopratiqo-all-language-intros-app-shell` brief:
 *
 *  1. /yo/langues uses YoPratiqo branding/logo.
 *  2. /yo/langues does not rely on a breadcrumb as primary product
 *     navigation.
 *  3. /yo/langues links to the correct intro/course route for
 *     Spanish.
 *  4. /yo/langues links to the correct intro route for Quebec French.
 *  5. /yo/langues links to the correct intro route for Italian.
 *  6. /yo/langues links to the correct intro route for Japanese.
 *  7. /yo/langues handles English honestly based on route
 *     availability.
 *  8. /yo/langues has responsive mobile/desktop layout classes.
 *  9. /yo/langues uses app-like language cards/tiles.
 * 10. No fake paid claims.
 * 11. Paid YoPratiqo checkout remains disabled.
 * 12. No restricted systems touched.
 *
 * Style: `node:test`-style static-source assertions, no browser,
 * no network. Mirrors the existing `tests/yo/*` suites.
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
  // No "Yo" alone anywhere in shipped catalog copy.
  const standalone = catalogCode.match(
    /(?<![A-Za-z0-9_-])Yo(?![A-Za-z])(?!\s*Pratiqo)/g,
  );
  assert.ok(
    standalone === null,
    `catalog must always say 'YoPratiqo', never 'Yo' alone (offending matches: ${
      standalone?.slice(0, 3).join(", ") ?? ""
    })`,
  );
});

// ─── 2. No breadcrumb-primary navigation ─────────────────────────
test("catalog drops breadcrumb-primary navigation in favour of an app header", () => {
  assert.ok(
    !/<YoBreadcrumb\b/.test(catalogCode),
    "catalog must not render <YoBreadcrumb />",
  );
  assert.ok(
    !/from\s+["']@\/components\/yo\/YoBreadcrumb["']/.test(catalogCode),
    "catalog must not import YoBreadcrumb",
  );
  // App-style header markers from the new implementation.
  assert.match(
    catalogCode,
    /data-testid="yo-langues-catalog-header"/,
    "catalog must render the new app-style header",
  );
  assert.match(
    catalogCode,
    /data-testid="yo-langues-catalog-back"/,
    "catalog must render the back-to-YoPratiqo arrow",
  );
  // The header must wire the back arrow to /yo (with optional lang
  // suffix) — never a stale legacy route.
  assert.match(
    catalogCode,
    /href=\{`\/yo\$\{langSuffix\}`\}/,
    "back arrow must target /yo with the lang suffix",
  );
});

// ─── 3. Spanish link points to the Spanish hub ───────────────────
test("catalog links Spanish to /yo/langues/espagnol (RD path preserved downstream)", () => {
  assert.match(
    catalogSrc,
    /id:\s*"spanish"[\s\S]*?status:\s*"available"[\s\S]*?href:\s*"\/yo\/langues\/espagnol"/,
    'Spanish card must keep href: "/yo/langues/espagnol"',
  );
  // The Spanish hub itself still exists — sanity check so the link
  // never goes stale.
  assert.ok(
    exists("app/yo/langues/espagnol/page.tsx"),
    "Spanish hub page must exist on disk",
  );
});

// ─── 4. Quebec French links to the intro deck ────────────────────
test("catalog links Quebec French to /yo/langues/francais-quebec/intro", () => {
  assert.match(
    catalogSrc,
    /id:\s*"french"[\s\S]*?href:\s*"\/yo\/langues\/francais-quebec\/intro"/,
    'Quebec French card must keep href: "/yo/langues/francais-quebec/intro"',
  );
  assert.ok(
    exists("app/yo/langues/francais-quebec/intro/page.tsx"),
    "Quebec French intro page must exist on disk",
  );
});

// ─── 5. Italian links to the intro deck ──────────────────────────
test("catalog links Italian to /yo/langues/italien/intro", () => {
  assert.match(
    catalogSrc,
    /id:\s*"italian"[\s\S]*?href:\s*"\/yo\/langues\/italien\/intro"/,
    'Italian card must keep href: "/yo/langues/italien/intro"',
  );
  assert.ok(
    exists("app/yo/langues/italien/intro/page.tsx"),
    "Italian intro page must exist on disk",
  );
});

// ─── 6. Japanese links to the intro deck ─────────────────────────
test("catalog links Japanese to /yo/langues/japonais/intro", () => {
  assert.match(
    catalogSrc,
    /id:\s*"japanese"[\s\S]*?href:\s*"\/yo\/langues\/japonais\/intro"/,
    'Japanese card must keep href: "/yo/langues/japonais/intro"',
  );
  assert.ok(
    exists("app/yo/langues/japonais/intro/page.tsx"),
    "Japanese intro page must exist on disk",
  );
});

// ─── 7. English handled honestly ─────────────────────────────────
test("catalog only claims English is available when the deck route exists", () => {
  const englishAvailable = /id:\s*"english"[\s\S]*?status:\s*"available"[\s\S]*?href:\s*"\/yo\/langues\/anglais\/intro"/.test(
    catalogSrc,
  );
  if (englishAvailable) {
    assert.ok(
      exists("app/yo/langues/anglais/intro/page.tsx"),
      "catalog claims English intro available — page.tsx must exist on disk",
    );
  } else {
    // If we ever flip English back to coming_soon, it must declare
    // either `href: null` OR no href, and must NOT claim available.
    assert.ok(
      !/id:\s*"english"[\s\S]*?status:\s*"available"/.test(catalogSrc),
      "English card must not claim status: available when the deck route is missing",
    );
  }
});

// ─── 8. Responsive mobile / desktop layout classes ───────────────
test("catalog uses responsive layout classes (mobile stack, desktop two-pane)", () => {
  // Desktop two-pane: aside + grid split via lg:grid-cols.
  assert.match(
    catalogCode,
    /lg:grid-cols-\[1fr,1\.6fr\]/,
    "catalog must split into a sticky rail + grid on lg viewports",
  );
  // Mobile-friendly card grid (sm: two columns max so cards stay
  // readable).
  assert.match(
    catalogCode,
    /grid\s+gap-4\s+sm:grid-cols-2/,
    "catalog card grid must declare `grid gap-4 sm:grid-cols-2`",
  );
  // Sticky rail anchor for desktop.
  assert.match(
    catalogCode,
    /lg:sticky\s+lg:top-24/,
    "left rail must stick on lg viewports so it never stretches",
  );
  // Catalog body must opt into a real min-height viewport surface
  // so it never collapses into a thin band on tall screens.
  assert.match(
    catalogCode,
    /min-h-\[100dvh\]/,
    "catalog root must claim full dvh height",
  );
});

// ─── 9. App-like cards / tiles ───────────────────────────────────
test("catalog renders app-style language tiles, not generic web cards", () => {
  // Each card declares a stable data attribute we can grep against.
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
  // Tiles must use the premium rounded-3xl + shadow + hover lift
  // contract introduced by the app-shell upgrade.
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
  // Companion presence on the left rail — every catalog screen must
  // expose the companion so YoPratiqo feels like one consistent
  // product.
  assert.match(
    catalogCode,
    /from\s+["']@\/components\/companion\/CompanionAvatar["']/,
    "catalog must import CompanionAvatar",
  );
  assert.match(
    catalogCode,
    /<CompanionAvatar\b/,
    "catalog must render <CompanionAvatar />",
  );
});

// ─── 10. No fake paid claims ─────────────────────────────────────
test("catalog ships no fake paid claims (only free intro language)", () => {
  // Forbidden marketing language that would imply a paid funnel.
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
  // Positive framing must talk about the free intro.
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

// ─── 11. Paid YoPratiqo checkout remains disabled ────────────────
test("paid YoPratiqo checkout remains disabled in yopratiqoProductConfig.ts", () => {
  const configSrc = read("lib/yo/yopratiqoProductConfig.ts");
  assert.match(
    configSrc,
    /premiumModulesEnabled:\s*false/,
    "paid YoPratiqo checkout must stay disabled",
  );
});

// ─── 12. No restricted systems touched ───────────────────────────
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
