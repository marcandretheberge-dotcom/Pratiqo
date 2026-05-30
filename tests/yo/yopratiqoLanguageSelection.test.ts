/**
 * YoPratiqo — language hub regression suite.
 *
 * Style: `node:test`-style static-source assertions, no browser, no
 * live network, no Stripe / Supabase / RLS / migration / booking /
 * search / Membre Pro code touched. Mirrors the existing
 * `tests/yo/yopratiqoAudio.test.ts` pattern.
 *
 * What we guard:
 *
 *  1. Visual badge fix — the `/yo/langues` page renders the
 *     `<YoLanguageBadge>` component which now ships **inline** SVG
 *     flag markup directly inside the component (no <img>, no
 *     external `/images/yo/flags/*.svg` assets that can break in
 *     production, no Unicode regional-indicator emoji that would
 *     degrade to "ES" / "FR" / "GB" / "JP" on Windows desktop, and
 *     no CSS-painted "fake" gradient flags). The four expected
 *     language ids each map to an inline <svg> renderer.
 *
 *  2. Francisation scope — the French card copy is intentionally
 *     scoped to francisation / Québec / Canada, NOT all global French
 *     variants. Forbidden tokens (`Paris`, `Africa`, `Afrique`, etc.)
 *     are absent in both FR and EN copy.
 *
 *  3. Launch scope — Spanish and the new Quebec-French pre-arrival
 *     intro expose an `href` to a real parcours. English / Japanese
 *     stay `coming_soon` with `href: null` so the cards are
 *     non-clickable. The Quebec French route also exists on disk so
 *     the open `href` is never broken on production.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}
function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const pageSrc = read("app/yo/langues/page.tsx");
const badgeSrc = read("components/yo/YoLanguageBadge.tsx");

/**
 * Strip JS line + block comments — used so structural assertions
 * (e.g. "no <img> tag") only run against shipped JSX, not against
 * historical explanations in JSDoc / comments that legitimately
 * reference the approaches we explicitly moved away from.
 */
function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const badgeSrcCode = stripJsComments(badgeSrc);

/**
 * Strip JS line + block comments so forbidden-token assertions only
 * run against shipped UI copy, not explanatory comments that may
 * legitimately describe the launch positioning (including the
 * variants we are NOT yet supporting).
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments (incl. JSDoc)
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1"); // line comments, skipping URL-ish slashes
}

const pageCopySrc = stripComments(pageSrc);

// ─── 1. Visual badge replaces the broken emoji-flag fallback ──────
test("page imports YoLanguageBadge and its YoLanguageBadgeId type", () => {
  assert.match(
    pageSrc,
    /import\s+\{[^}]*YoLanguageBadge[^}]*\}\s+from\s+["']@\/components\/yo\/YoLanguageBadge["']/s,
  );
  assert.match(pageSrc, /YoLanguageBadgeId/);
});

test("page no longer carries raw Unicode regional-indicator emoji on the language cards", () => {
  // Each regional-indicator letter sits in U+1F1E6..U+1F1FF.
  // The previous implementation paired ES/FR/GB/JP via these
  // codepoints; the new implementation must NOT ship them.
  const regionalIndicator = /[\uD83C][\uDDE6-\uDDFF]/;
  assert.ok(
    !regionalIndicator.test(pageSrc),
    "page must not embed regional-indicator emoji (Windows desktop renders them as raw codes)",
  );
  // Defensive: the legacy `flag:` field was renamed to `badge:` so
  // a future contributor cannot accidentally re-introduce string
  // emoji on the data structure.
  assert.ok(
    !/^\s*flag\s*:\s*["']/m.test(pageSrc),
    "language card data must not declare a `flag:` string field anymore",
  );
});

test("page declares badge ids for the four launch languages", () => {
  for (const id of ['"es"', '"fr-ca"', '"en"', '"ja"']) {
    assert.ok(
      pageSrc.includes(`badge: ${id}`),
      `language card data must declare badge: ${id}`,
    );
  }
});

test("YoLanguageBadge component renders accessible swatches without emoji", () => {
  // No regional-indicator emoji codepoints in the component source.
  const regionalIndicator = /[\uD83C][\uDDE6-\uDDFF]/;
  assert.ok(!regionalIndicator.test(badgeSrc));
  // The component must surface an aria-label for SR users.
  assert.match(badgeSrc, /aria-label\s*=\s*\{?\s*ariaLabel\s*\}?/);
  // It must declare a typed YoLanguageBadgeId union covering the
  // four launch languages so the page's `badge:` field is type-safe.
  assert.match(badgeSrc, /YoLanguageBadgeId\s*=\s*"es"\s*\|\s*"fr-ca"\s*\|\s*"en"\s*\|\s*"ja"/);
});

test("YoLanguageBadge renders flags as inline <svg>, not <img>", () => {
  // The previous iteration shipped <img src="/images/yo/flags/*.svg">
  // and those external asset paths failed in production. The
  // current iteration must render inline SVG markup directly in
  // the component so there is no asset path to break.
  // We assert against `badgeSrcCode` (comments stripped) so the
  // historical mention in JSDoc doesn't fail the check.
  assert.ok(
    !/<img\b/i.test(badgeSrcCode),
    "YoLanguageBadge must not render <img>; flags must be inline SVG",
  );
  assert.match(
    badgeSrcCode,
    /<svg\b/,
    "YoLanguageBadge must render inline <svg> markup",
  );
});

test("YoLanguageBadge does not reference external /images/yo/flags asset paths", () => {
  // Belt-and-suspenders for the production-broken-paths root cause.
  // No `src=` strings, no string literals pointing at the public
  // assets folder, no <Image> import either. Compare against the
  // comment-stripped source so the JSDoc rationale block is OK.
  assert.ok(
    !/\/images\/yo\/flags/.test(badgeSrcCode),
    "YoLanguageBadge must not reference any /images/yo/flags asset",
  );
  assert.ok(
    !/from\s+["']next\/image["']/.test(badgeSrcCode),
    "YoLanguageBadge must not import next/image — flags are inline SVG",
  );
});

test("YoLanguageBadge declares an inline-SVG renderer for every language id", () => {
  // Each badge id must appear as a key in the inline renderer map
  // so the type system rules out a missing flag at compile time.
  for (const id of ["es:", '"fr-ca":', "en:", "ja:"]) {
    assert.ok(
      badgeSrc.includes(id),
      `YoLanguageBadge must declare an entry for ${id}`,
    );
  }
  // Each flag must paint with the documented brand colour so the
  // visual stays recognisable across desktop and mobile rendering.
  // Cheap structural sniff: check that the canonical heraldic
  // hex codes are present somewhere in the inline SVG markup.
  const expectedFlagFills = [
    "#AA151B", // Spain red
    "#F1BF00", // Spain yellow
    "#003DA5", // Quebec blue
    "#012169", // UK navy
    "#C8102E", // UK red
    "#BC002D", // Japan red
  ];
  for (const fill of expectedFlagFills) {
    assert.ok(
      badgeSrc.toUpperCase().includes(fill.toUpperCase()),
      `YoLanguageBadge inline SVG must include the ${fill} brand colour`,
    );
  }
});

test("Spain inline SVG ships a recognisable coat of arms", () => {
  // The simplified earlier iteration drew Spain as just three
  // horizontal stripes. The production-quality iteration must
  // render the official escudo on top of the yellow band.
  // Cheap, robust structural sniff: a `data-yoflag-coa="es"`
  // marker tags the COA group, plus the heraldic palette
  // (gold pillar fill #C8A030 + Bourbon blue #0034AB) must
  // be present somewhere in the inline markup.
  assert.match(
    badgeSrcCode,
    /data-yoflag-coa\s*=\s*["']es["']/,
    "Spain inline SVG must mark up a coat-of-arms group (data-yoflag-coa=\"es\")",
  );
  for (const colour of [
    "#C8A030", // gold pillars / shield border
    "#0034AB", // Bourbon inescutcheon blue
  ]) {
    assert.ok(
      badgeSrcCode.toUpperCase().includes(colour.toUpperCase()),
      `Spain coat of arms must use the ${colour} heraldic colour`,
    );
  }
});

test("Québec inline SVG ships real heraldic fleurs-de-lis (not placeholder dots)", () => {
  // Each of the four quadrants must declare a fleur-de-lis
  // marker, and the path data must contain the curve commands
  // that produce a real heraldic shape (centre petal + outer
  // curling petals). A plain placeholder (e.g. `<circle>`) on
  // its own would not satisfy this check.
  for (const id of ["qc-tl", "qc-tr", "qc-bl", "qc-br"]) {
    assert.match(
      badgeSrcCode,
      new RegExp(`data-yoflag-fleur\\s*=\\s*["']${id}["']`),
      `Québec inline SVG must mark up a fleur-de-lis at quadrant ${id}`,
    );
  }
  // Fleur-de-lis path must contain curve segments (`C` cubic
  // bézier commands), not just straight lines or circles. Real
  // heraldic fleurs require curved petals.
  const fleurPathRe =
    /M0\s+-10[\s\S]*?C[^"]*?C[^"]*?C[^"]*?Z[\s\S]*?L0\s+11/;
  assert.match(
    badgeSrcCode,
    fleurPathRe,
    "Québec fleur-de-lis path must include the heraldic petal curves and bottom point",
  );
});

test("United Kingdom inline SVG counter-changes the St Patrick saltire", () => {
  // The simplified iteration drew the red saltire centred on
  // the white. The production-quality iteration must offset
  // the two red diagonals perpendicular to each other so the
  // result reads as the heraldic counter-change. We sniff for
  // the two characteristic offset coordinates the implementation
  // computed (≈ 1.3 / 2 unit perpendicular displacement on a
  // 60×40 viewBox).
  assert.match(
    badgeSrcCode,
    /M-?1\.3\s+2\s+L\s*58\.7\s+42/,
    "UK inline SVG must offset the TL-BR red saltire (red below white)",
  );
  assert.match(
    badgeSrcCode,
    /M\s*58\.7\s+-2\s+L-?1\.3\s+38/,
    "UK inline SVG must offset the TR-BL red saltire (red above white)",
  );
});

test("language flags never embed <text> labels inside the flag", () => {
  // No two-letter codes (ES / FR / EN / JP) hidden as <text>
  // children of any flag <svg>. The wrapper's aria-label is
  // what a SR user hears.
  assert.ok(
    !/<text\b/.test(badgeSrcCode),
    "YoLanguageBadge must not render <text> inside any flag",
  );
});

test("YoLanguageBadge no longer paints flags via CSS gradients", () => {
  // The earlier "fake flag" iteration stacked linear/radial
  // gradients. Inline real SVG ships now, so the component must
  // not rely on `linear-gradient` / `radial-gradient` to fake
  // the flag visual.
  assert.ok(
    !/\blinear-gradient\s*\(/i.test(badgeSrc),
    "YoLanguageBadge must not paint flags via linear-gradient anymore",
  );
  assert.ok(
    !/\bradial-gradient\s*\(/i.test(badgeSrc),
    "YoLanguageBadge must not paint flags via radial-gradient anymore",
  );
});

test("legacy /public/images/yo/flags/*.svg assets are no longer shipped", () => {
  // The inline-SVG migration removed the four external assets so
  // we do not keep dead bytes in the bundle. Make sure a future
  // contributor cannot accidentally re-introduce them and tempt
  // the page back into broken-image-icon territory.
  const removedAssets = [
    "public/images/yo/flags/es.svg",
    "public/images/yo/flags/fr-qc.svg",
    "public/images/yo/flags/en.svg",
    "public/images/yo/flags/ja.svg",
  ];
  for (const filePath of removedAssets) {
    assert.ok(
      !exists(filePath),
      `${filePath} should be removed (flags are inline SVG now)`,
    );
  }
});

// ─── 2. Francisation scope ────────────────────────────────────────
test("French card copy never claims global French scope", () => {
  // Tokens we must NOT ship on the launch French card.
  // Case-insensitive — covers stylistic variations.
  const forbidden = [
    /Paris/i,
    /Parisian/i,
    /\bAfrique\b/i,
    /\bAfrica\b/i,
    /\bfran[cç]ais\s+mondial\b/i,
    /\bworld\s+French\b/i,
    /\bglobal\s+French\b/i,
  ];
  for (const re of forbidden) {
    assert.ok(
      !re.test(pageCopySrc),
      `French card copy must not mention ${re.source}`,
    );
  }
});

test("French card copy mentions francisation and Québec / Canada", () => {
  // The FR blurb is the source of truth for the launch positioning.
  assert.match(pageSrc, /[Ff]rancisation/);
  assert.match(pageSrc, /Qu[eé]bec/);
  // Canada is the umbrella geography we promise in copy.
  assert.match(pageSrc, /Canada/);
  // EN equivalent must also be scoped.
  assert.match(pageSrc, /Francization/);
  // Both copies should still flag this as not yet shipped.
  assert.match(pageSrc, /À\s+venir/);
  assert.match(pageSrc, /[Cc]oming\s+soon/);
});

// ─── 3. Launch scope ───────────────────────────────────────────────
test("Spanish and Quebec French are available; English / Japanese stay coming_soon", () => {
  // Status flags are declared inline next to each card in the data
  // file. We extract the relative ordering (Spanish first, then
  // French / English / Japanese) and assert the status mapping.
  assert.match(
    pageSrc,
    /id:\s*"spanish"[\s\S]*?status:\s*"available"[\s\S]*?href:\s*"\/yo\/langues\/espagnol"/,
  );
  assert.match(
    pageSrc,
    /id:\s*"french"[\s\S]*?status:\s*"available"[\s\S]*?href:\s*"\/yo\/langues\/francais-quebec\/intro"/,
  );
  for (const id of ["english", "japanese"]) {
    const re = new RegExp(
      `id:\\s*"${id}"[\\s\\S]*?status:\\s*"coming_soon"[\\s\\S]*?href:\\s*null`,
    );
    assert.match(pageSrc, re);
  }
});

test("the two open language hrefs point at routes that actually exist on disk", () => {
  // Every language card must declare an `href:` field — two null,
  // exactly two pointing at real /yo/langues routes. We verify the
  // routes also exist on disk so a contributor cannot flip a
  // `coming_soon` card into a clickable link before the parcours
  // actually ships (a broken-link guard).
  const hrefMatches = [...pageSrc.matchAll(/href:\s*("[^"]+"|null)/g)];
  // The page also wires a hero language toggle (`buildYoLocaleHref`),
  // so the data-only `href:` count is exactly the four cards.
  const cardHrefs = hrefMatches
    .map((m) => m[1])
    .filter((value) => value === "null" || value.startsWith('"/yo/langues'));
  assert.equal(cardHrefs.length, 4);
  assert.equal(cardHrefs.filter((v) => v === "null").length, 2);
  assert.equal(
    cardHrefs.filter((v) => v === '"/yo/langues/espagnol"').length,
    1,
  );
  assert.equal(
    cardHrefs.filter(
      (v) => v === '"/yo/langues/francais-quebec/intro"',
    ).length,
    1,
  );
  // Both open routes must resolve to a real `page.tsx` on disk.
  assert.ok(
    exists("app/yo/langues/espagnol/page.tsx"),
    "Spanish hub page must exist",
  );
  assert.ok(
    exists("app/yo/langues/francais-quebec/intro/page.tsx"),
    "Quebec French pre-arrival intro page must exist",
  );
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
  console.log(`[yo:languages] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
