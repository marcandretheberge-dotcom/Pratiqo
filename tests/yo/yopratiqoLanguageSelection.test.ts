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
 *     `<YoLanguageBadge>` component which now ships **real** local
 *     SVG flag assets (no Unicode regional-indicator emoji that
 *     would degrade to "ES" / "FR" / "GB" / "JP" on Windows desktop,
 *     and no CSS-painted "fake" gradient flags either). The four
 *     expected language ids are wired up to assets that exist on
 *     disk under `public/images/yo/flags/`.
 *
 *  2. Francisation scope — the French card copy is intentionally
 *     scoped to francisation / Québec / Canada, NOT all global French
 *     variants. Forbidden tokens (`Paris`, `Africa`, `Afrique`, etc.)
 *     are absent in both FR and EN copy.
 *
 *  3. Launch scope — only Spanish exposes an `href` to a real
 *     parcours. French / English / Japanese stay `coming_soon` with
 *     `href: null` so the cards are non-clickable.
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
  // Decorative `<img>` keeps `alt=""` so the wrapper's aria-label
  // (the localized language name) is what SR users actually hear.
  assert.match(badgeSrc, /alt\s*=\s*["']{2}/);
});

test("YoLanguageBadge maps every language id to a local SVG flag asset", () => {
  // Each badge id must declare a /images/yo/flags/<slug>.svg src.
  // Quebec ships under `fr-qc.svg` even though the badge id stays
  // `fr-ca`, because the data contract on /yo/langues is `fr-ca`.
  const expectedAssetPaths: Record<string, string> = {
    es: "/images/yo/flags/es.svg",
    "fr-ca": "/images/yo/flags/fr-qc.svg",
    en: "/images/yo/flags/en.svg",
    ja: "/images/yo/flags/ja.svg",
  };
  for (const [, src] of Object.entries(expectedAssetPaths)) {
    assert.ok(
      badgeSrc.includes(src),
      `YoLanguageBadge must reference ${src}`,
    );
  }
});

test("YoLanguageBadge no longer paints flags via CSS gradients", () => {
  // The previous iteration drew flags with stacked linear/radial
  // gradients. Real SVG assets ship now, so neither the runtime
  // <span> nor the asset map should rely on `linear-gradient` /
  // `radial-gradient` to fake the flag visual.
  assert.ok(
    !/\blinear-gradient\s*\(/i.test(badgeSrc),
    "YoLanguageBadge must not paint flags via linear-gradient anymore",
  );
  assert.ok(
    !/\bradial-gradient\s*\(/i.test(badgeSrc),
    "YoLanguageBadge must not paint flags via radial-gradient anymore",
  );
});

test("each language flag SVG asset exists on disk under public/images/yo/flags/", () => {
  const expectedFiles = [
    "public/images/yo/flags/es.svg",
    "public/images/yo/flags/fr-qc.svg",
    "public/images/yo/flags/en.svg",
    "public/images/yo/flags/ja.svg",
  ];
  for (const filePath of expectedFiles) {
    assert.ok(exists(filePath), `Missing asset: ${filePath}`);
    const src = read(filePath);
    // Each asset must actually be an SVG, not a placeholder.
    assert.match(src, /<svg[\s>]/, `${filePath} is not a valid <svg> document`);
    assert.match(src, /<\/svg>\s*$/, `${filePath} does not close its <svg>`);
    // No regional-indicator emoji smuggled into the asset itself.
    assert.ok(
      !/[\uD83C][\uDDE6-\uDDFF]/.test(src),
      `${filePath} must not embed regional-indicator emoji`,
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
test("Spanish remains the only available parcours; others stay coming_soon", () => {
  // Status flags are declared inline next to each card in the data
  // file. We extract the relative ordering (Spanish first, then
  // French / English / Japanese) and assert the status mapping.
  assert.match(
    pageSrc,
    /id:\s*"spanish"[\s\S]*?status:\s*"available"[\s\S]*?href:\s*"\/yo\/langues\/espagnol"/,
  );
  for (const id of ["french", "english", "japanese"]) {
    const re = new RegExp(
      `id:\\s*"${id}"[\\s\\S]*?status:\\s*"coming_soon"[\\s\\S]*?href:\\s*null`,
    );
    assert.match(pageSrc, re);
  }
});

test("only one card carries an open href to a real /yo/langues route", () => {
  // Every language card must declare an `href:` field — three null,
  // exactly one pointing at the Spanish hub. This guards against a
  // contributor flipping a `coming_soon` card into a clickable link
  // before the parcours actually ships.
  const hrefMatches = [...pageSrc.matchAll(/href:\s*("[^"]+"|null)/g)];
  // The page also wires a hero language toggle (`buildYoLocaleHref`),
  // so the data-only `href:` count is exactly the four cards.
  const cardHrefs = hrefMatches
    .map((m) => m[1])
    .filter((value) => value === "null" || value.startsWith('"/yo/langues'));
  assert.equal(cardHrefs.length, 4);
  assert.equal(cardHrefs.filter((v) => v === "null").length, 3);
  assert.equal(
    cardHrefs.filter((v) => v === '"/yo/langues/espagnol"').length,
    1,
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
