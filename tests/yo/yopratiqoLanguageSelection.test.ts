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
 *  3. Launch scope — Spanish, Quebec French, Italian, English, AND
 *     Japanese all expose an `href` to a real parcours. No card
 *     stays `coming_soon` at the moment — every open route also
 *     exists on disk so the hub page never ships a broken link in
 *     production.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { catalogRouteExists } from "./sharedRouteAssertion";
import { getYoPublicLanguages, yoPublicCatalog } from "@/lib/yo/publicCatalog";

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

const pageSrc = read("components/yo/YoLanguageQuickStart.tsx");
const catalogSrc = read("lib/yo/publicCatalog.ts");
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

const pageCopySrc = stripComments(catalogSrc);

// ─── 1. Visual badge replaces the broken emoji-flag fallback ──────
test("page imports YoLanguageBadge and its YoLanguageBadgeId type", () => {
  assert.match(
    pageSrc,
    /import\s+\{[^}]*YoLanguageBadge[^}]*\}\s+from\s+["']@\/components\/yo\/YoLanguageBadge["']/,
  );
  assert.match(catalogSrc, /YoLanguageBadgeId/);
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

test("page declares badge ids for the core launch languages", () => {
  for (const id of ['"es"', '"fr-ca"', '"en"', '"ja"', '"it"']) {
    assert.ok(
      catalogSrc.includes(`badge: ${id}`),
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
  // five launch languages so the page's `badge:` field is type-safe.
  assert.match(
    badgeSrc,
    /YoLanguageBadgeId\s*=\s*"es"\s*\|\s*"fr-ca"\s*\|\s*"en"\s*\|\s*"ja"\s*\|\s*"it"\s*\|\s*"de"\s*\|\s*"pt-br"/,
  );
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
  for (const id of ["es:", '"fr-ca":', "en:", "ja:", "it:", "de:", '"pt-br":']) {
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
    "#ad1519", // Spain red from Wikimedia source
    "#fabd00", // Spain yellow from Wikimedia source
    "#003da5", // Quebec blue from Wikimedia source
    "#012169", // UK navy
    "#C8102E", // UK red
    "#BC002D", // Japan red
    "#009246", // Italy green from Wikimedia "Flag of Italy.svg"
    "#CE2B37", // Italy red  from Wikimedia "Flag of Italy.svg",
    "#DD0000", // Germany red
    "#FFCE00", // Germany gold
    "#009C3B", // Brazil green
    "#FFDF00", // Brazil yellow
    "#002776", // Brazil blue
  ];
  for (const fill of expectedFlagFills) {
    assert.ok(
      badgeSrc.toUpperCase().includes(fill.toUpperCase()),
      `YoLanguageBadge inline SVG must include the ${fill} brand colour`,
    );
  }
});

test("Spain renderer embeds the Wikimedia source coat of arms, not the old hand-drawn placeholder", () => {
  assert.ok(
    !/data-yoflag-coa\s*=/.test(badgeSrcCode),
    "Spain renderer must not rely on the old hand-drawn placeholder marker",
  );
  assert.match(
    badgeSrc,
    /Flag of Spain\.svg/,
    "source note must name the Wikimedia Spain file",
  );
  assert.match(
    badgeSrcCode,
    /viewBox="0 0 750 500"/,
    "Spain renderer must keep the Wikimedia source proportions",
  );
  assert.match(
    badgeSrcCode,
    /matrix\(\.2091873 0 0 \.22203612 154\.81963 148\.88973\)/,
    "Spain source must include the escudo transform from Flag of Spain.svg",
  );
  assert.match(
    badgeSrcCode,
    /m451\.967 134\.945c31\.61 0 59\.737 4\.68 78\.06 11\.942/,
    "Spain source must include detailed coat-of-arms path data",
  );
});

test("Quebec renderer embeds the Wikimedia fleur-de-lis source, not old placeholder markers", () => {
  assert.ok(
    !/data-yoflag-fleur\s*=/.test(badgeSrcCode),
    "Quebec renderer must not rely on the old hand-drawn placeholder markers",
  );
  assert.match(
    badgeSrc,
    /Flag of Quebec\.svg/,
    "source note must name the Wikimedia Quebec file",
  );
  assert.match(
    badgeSrcCode,
    /viewBox="0 0 9600 6400"/,
    "Quebec renderer must keep the Wikimedia source viewBox",
  );
  assert.match(
    badgeSrcCode,
    /M2309 1622v-129h-115c0-66 32-130 66-150/,
    "Quebec source must include the real source fleur-de-lis path data",
  );
  assert.match(
    badgeSrcCode,
    /xlink:href=\\"#a\\"/,
    "Quebec source must reuse the original fleur-de-lis path through the source-local use reference",
  );
});

test("Italy renderer embeds the Wikimedia source tricolour, no coat of arms", () => {
  // The standard Italian national flag is a vertical green-white-red
  // tricolour with NO coat of arms. We test:
  //   - the source note names "Flag of Italy.svg"
  //   - the heraldic fills are the Wikimedia source colours
  //   - the renderer keeps the simple 3:2 viewBox shape
  //   - we never sneak a coat of arms onto the standard flag
  assert.match(
    badgeSrc,
    /Flag of Italy\.svg/,
    "source note must name the Wikimedia Italy file",
  );
  assert.match(
    badgeSrcCode,
    /viewBox="0 0 3 2"/,
    "Italy renderer must keep the 3:2 viewBox",
  );
  // The three fills from the Wikimedia source.
  assert.ok(
    badgeSrc.toUpperCase().includes("#009246"),
    "Italy green must come from the Wikimedia source",
  );
  assert.ok(
    badgeSrc.toUpperCase().includes("#CE2B37"),
    "Italy red must come from the Wikimedia source",
  );
  // Belt-and-suspenders: nothing in the Italy SOURCE_SVG entry can
  // mention coats of arms — the standard national flag has none.
  // We capture only the italy entry so we don't accidentally
  // restrict any future Italy-specific civil/state flag stored
  // elsewhere in the file.
  const italyEntryMatch = badgeSrc.match(/italy:\s*"[^"]*"/);
  assert.ok(italyEntryMatch, "italy SOURCE_SVG entry must exist");
  const italyEntry = italyEntryMatch![0];
  assert.ok(
    !/coat\s+of\s+arms/i.test(italyEntry),
    "Italy SOURCE_SVG must not embed a coat of arms",
  );
  assert.ok(
    !/escudo/i.test(italyEntry),
    "Italy SOURCE_SVG must not embed an escudo",
  );
});

test("United Kingdom renderer embeds the Wikimedia 3-5 source structure", () => {
  assert.match(
    badgeSrc,
    /Flag of the United Kingdom\s*\(3-5\)\.svg/,
    "source note must name the Wikimedia UK 3-5 file",
  );
  assert.match(
    badgeSrcCode,
    /viewBox="0 0 50 30"/,
    "UK renderer must keep the Wikimedia 3-5 source viewBox",
  );
  assert.match(
    badgeSrcCode,
    /<clipPath id=\\"t\\">/,
    "UK source must include the original source clipPath",
  );
  assert.match(
    badgeSrcCode,
    /clip-path=\\"url\(#t\)\\"/,
    "UK source must reference the original source clipPath",
  );
});

test("German and Brazilian Portuguese cards use real YoLanguageBadge flags", () => {
  assert.equal(yoPublicCatalog.find(course => course.slug === "allemand")?.badge, "de");
  assert.equal(yoPublicCatalog.find(course => course.slug === "portugais-bresil")?.badge, "pt-br");
  assert.match(pageSrc, /<YoLanguageBadge language=\{item.badge\}/);
  assert.doesNotMatch(pageSrc, />DE<\/span>/);
  assert.doesNotMatch(pageSrc, />BR<\/span>/);
});

test("Germany and Brazil render distinctive inline national flag geometry", () => {
  assert.match(badgeSrcCode, /function FlagGermany/);
  assert.match(badgeSrcCode, /#000000/);
  assert.match(badgeSrcCode, /#DD0000/);
  assert.match(badgeSrcCode, /#FFCE00/);
  assert.match(badgeSrcCode, /function FlagBrazil/);
  assert.match(badgeSrcCode, /#009C3B/);
  assert.match(badgeSrcCode, /#FFDF00/);
  assert.match(badgeSrcCode, /#002776/);
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

test("French card copy preserves the francisation and Quebec scope", () => {
  // The FR blurb is the source of truth for the launch positioning.
  assert.match(catalogSrc, /[Ff]rancisation/);
  assert.match(catalogSrc, /Qu[eé]bec/);
  // EN equivalent must also be scoped.
  assert.match(catalogSrc, /Francization/);
  // (The earlier "À venir / Coming soon" assertions were retired
  // when Japanese moved out of `coming_soon`. The francisation FR
  // card now opens to a real route with a `"Nouveau."` marker
  // matching the rest of the launch lineup; broken-link guarding
  // happens in the disk-route test below.)
});

// ─── 3. Launch scope ───────────────────────────────────────────────
test("all live language tiles point to real lessons or course dashboards", () => {
  const paths = getYoPublicLanguages().map(course => course.path);
  assert.deepEqual([...paths].sort(), ["/yo/langues/italien/parcours","/yo/langues/japonais/demarrer","/yo/langues/espagnol/demarrer","/yo/langues/anglais/demarrer","/yo/langues/francais-quebec/demarrer","/yo/langues/allemand/demarrer","/yo/langues/portugais-bresil/demarrer","/yo/langues/mandarin/demarrer"].sort());
  for(const destination of paths) assert.ok(catalogRouteExists(destination), destination);
  assert.match(catalogSrc, /isAccessibleForFree/);
});
test("Italian and Japanese describe their complete courses; English remains an introduction", () => {
  assert.match(catalogSrc, /12 unités/);
  assert.match(catalogSrc, /8 modules/);
  assert.match(catalogSrc, /Oser parler · introduction/);
  assert.doesNotMatch(pageCopySrc, /status:\s*"coming_soon"|Nouveau\./);
});

test("Mandarin uses the shared Chinese flag instead of a character placeholder", () => {
  const card = getYoPublicLanguages().find(course => course.slug === "mandarin");
  assert.equal(card?.path, "/yo/langues/mandarin/demarrer");
  assert.equal(card?.badge, "zh");
  assert.match(pageSrc, /ariaLabel=\{t\(item.name, locale\)\}/);
  assert.doesNotMatch(pageSrc, />\s*(?:中|ZH|CN)\s*<\/span>/);
  assert.ok(exists("app/yo/langues/mandarin/parcours/page.tsx"));
});

test("Chinese flag support is registered with five self-contained stars", () => {
  assert.match(badgeSrcCode, /YoLanguageBadgeId\s*=[^;]*\|\s*"zh"/);
  assert.match(badgeSrcCode, /zh:\s*FlagChina/);
  const start = badgeSrcCode.indexOf("function FlagChina(): ReactElement {");
  const end = badgeSrcCode.indexOf("function FlagDominicanRepublic", start);
  assert.ok(start >= 0 && end > start);
  const flag = badgeSrcCode.slice(start, end);
  assert.match(flag, /viewBox="0 0 30 20"/);
  assert.match(flag, /fill="#DE2910"/);
  assert.match(flag, /fill="#FFDE00"/);
  const stars = [...flag.matchAll(/<polygon points="([^"]+)"/g)];
  assert.equal(stars.length, 5, "one large and four small stars");
  for (const [, points] of stars) assert.equal(points.trim().split(/\s+/).length, 10);
  assert.doesNotMatch(flag, /<image\b|<img\b|<text\b|href=/);
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
  console.log(`[yo:languages] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
