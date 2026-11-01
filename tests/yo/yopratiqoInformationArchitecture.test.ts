/**
 * YoPratiqo — information-architecture regression suite.
 *
 * Pins the canonical YoPratiqo IA so a future contributor can't
 * silently reframe the product taxonomy:
 *
 *   YoPratiqo
 *     → Langues          (live)
 *     → Musique          (planned, no fake routes)
 *     → Soutien scolaire (planned, no fake routes)
 *
 * Francisation is intentionally NOT a fourth top-level discipline —
 * it lives UNDER Langues → Français québécois / Francisation, and is
 * surfaced on the home page as a smaller "Featured program / Programme
 * en vedette" shortcut. The /francisation marketing page remains a
 * marketing/SEO bridge that links to the YoPratiqo program AND to the
 * teacher search; it must not duplicate the YoPratiqo IA.
 *
 * Static-source assertions only — no browser, no live network, no
 * Stripe / Supabase / RLS / migration / booking / Membre Pro /
 * commission / OpenAI / audio-generation / live-legal-page coupling.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { YO_PRODUCT_FAMILIES } from "@/lib/yo/yopratiqoLandingContent";

// ─── Test harness (mirrors the Yo premium-shell test pattern) ──────

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  const source = readFileSync(join(REPO_ROOT, relativePath), "utf8")
    + (relativePath === "app/yo/langues/page.tsx" ? readFileSync(join(REPO_ROOT, "components/yo/YoLanguageQuickStart.tsx"), "utf8") : "");
  return source.replace(
    /\r\n/g,
    "\n",
  );
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

/**
 * Strip JS comments (block + line) so structural assertions only run
 * against shipped UI source, not against documentation that may
 * legitimately reference the historical taxonomy.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ─── Files under audit ─────────────────────────────────────────────

const HUB_FILE = "app/yo/page.tsx";
const LANGUES_FILE = "app/yo/langues/page.tsx";
const FR_QUEBEC_LANDING_FILE = "app/yo/langues/francais-quebec/page.tsx";
const FRANCISATION_MARKETING_FILE = "app/(marketing)/francisation/page.tsx";

// Canonical labels — pinned by the spec.
const CANONICAL_FR_LABEL = "Français québécois / Francisation";
const CANONICAL_EN_LABEL = "Quebec French / Francization";
const CANONICAL_ES_LABEL = "Francés quebequense / Francización";

const APPROVED_FAMILY_TITLES_FR: ReadonlySet<string> = new Set([
  "Langues",
  "Musique",
  "Soutien scolaire",
]);

const APPROVED_FAMILY_TITLES_EN: ReadonlySet<string> = new Set([
  "Languages",
  "Music",
  "Academic support",
]);

// ─── 1. Top-level families resolve to exactly the three approved ───

test("YO_PRODUCT_FAMILIES exposes exactly Langues / Musique / Soutien scolaire (FR side)", () => {
  const titlesFr = YO_PRODUCT_FAMILIES.map((family) => family.title.fr);
  assert.deepEqual(
    titlesFr,
    ["Langues", "Musique", "Soutien scolaire"],
    "YO_PRODUCT_FAMILIES FR titles must be exactly these three, in order",
  );
  // English mirror — keeps the bilingual surface consistent.
  const titlesEn = YO_PRODUCT_FAMILIES.map((family) => family.title.en);
  assert.deepEqual(
    titlesEn,
    ["Languages", "Music", "Academic support"],
    "YO_PRODUCT_FAMILIES EN titles must mirror the canonical three",
  );
  // Status invariants: only Langues is live, the rest are planned.
  const langues = YO_PRODUCT_FAMILIES.find((f) => f.id === "langues");
  assert.ok(langues, "YO_PRODUCT_FAMILIES must include Langues");
  assert.equal(langues!.status, "available");
  assert.equal(langues!.href, "/yo/langues");
  for (const planned of YO_PRODUCT_FAMILIES.filter(
    (f) => f.status === "planned",
  )) {
    assert.equal(
      planned.href,
      null,
      `${planned.id} is planned and must carry href: null (no fake routes)`,
    );
  }
});

// ─── 2. Francisation is NOT a top-level discipline ─────────────────

test("Francisation, Voyage, and other unapproved labels never appear as a top-level family", () => {
  const forbiddenTitles: readonly string[] = [
    "Francisation",
    "Francization",
    "Francización",
    "Voyage",
    "Travel",
    "Voyages",
  ];
  for (const family of YO_PRODUCT_FAMILIES) {
    assert.ok(
      APPROVED_FAMILY_TITLES_FR.has(family.title.fr),
      `Family "${family.title.fr}" is not in the approved FR set { Langues, Musique, Soutien scolaire }`,
    );
    assert.ok(
      APPROVED_FAMILY_TITLES_EN.has(family.title.en),
      `Family "${family.title.en}" is not in the approved EN set { Languages, Music, Academic support }`,
    );
    for (const banned of forbiddenTitles) {
      assert.notEqual(
        family.title.fr,
        banned,
        `top-level FR family must not be "${banned}"`,
      );
      assert.notEqual(
        family.title.en,
        banned,
        `top-level EN family must not be "${banned}"`,
      );
    }
  }
  // Belt-and-suspenders: scan the rendered hub markup and confirm
  // there isn't a fourth productLine entry with one of the banned
  // titles. We strip comments first so historical doc-comments naming
  // the concept can't false-positive.
  const stripped = stripComments(read(HUB_FILE));
  // Within the productLines literal block specifically, look for any
  // banned title as a `title:` field value.
  const productLinesMatch = stripped.match(
    /const\s+productLines\s*=\s*\[([\s\S]*?)\n\];/,
  );
  assert.ok(
    productLinesMatch,
    "app/yo/page.tsx must declare a productLines array literal",
  );
  const productLinesBody = productLinesMatch![1]!;
  for (const banned of ["Francisation", "Voyage", "Travel"]) {
    assert.ok(
      !new RegExp(`title:\\s*\\{[^}]*\\b${banned}\\b`).test(productLinesBody),
      `productLines must not declare a top-level family titled "${banned}"`,
    );
  }
});

// ─── 3. Francisation appears as a featured program shortcut ────────

test("Francisation appears as a featured program shortcut on the YoPratiqo home, linking to /yo/langues/francais-quebec", () => {
  const src = read(HUB_FILE);
  // The shortcut must mention Francisation in user-facing text.
  assert.ok(
    /Francisation|Francization/i.test(src),
    "app/yo/page.tsx must surface Francisation somewhere as a featured-program callout",
  );
  // It must link to the canonical landing page route.
  assert.ok(
    /\/yo\/langues\/francais-quebec/.test(src),
    "app/yo/page.tsx must link to /yo/langues/francais-quebec from the featured-program shortcut",
  );
  // The shortcut must be framed as a "Featured program" / "Programme
  // en vedette" — both the FR and EN eyebrows are required so the
  // pill reads as a sub-callout, not a peer family.
  assert.ok(
    /Programme\s+en\s+vedette/i.test(src),
    "app/yo/page.tsx must include the FR eyebrow « Programme en vedette »",
  );
  assert.ok(
    /Featured\s+program/i.test(src),
    "app/yo/page.tsx must include the EN eyebrow « Featured program »",
  );
});

// ─── 4. Quebec French canonical FR copy ────────────────────────────

test("Quebec French language card / page renders the canonical FR copy `Français québécois / Francisation`", () => {
  const langues = read(LANGUES_FILE);
  assert.ok(
    langues.includes(CANONICAL_FR_LABEL),
    `${LANGUES_FILE} must surface the canonical FR label "${CANONICAL_FR_LABEL}"`,
  );
});

// ─── 5. Quebec French canonical EN copy ────────────────────────────

test("Quebec French language card / page renders the canonical EN copy `Quebec French / Francization`", () => {
  const langues = read(LANGUES_FILE);
  assert.ok(
    langues.includes(CANONICAL_EN_LABEL),
    `${LANGUES_FILE} must surface the canonical EN label "${CANONICAL_EN_LABEL}"`,
  );
});

// ─── 6. Quebec French canonical ES copy ────────────────────────────

test("Quebec French language card / page renders the canonical ES copy `Francés quebequense / Francización`", () => {
  const langues = read(LANGUES_FILE);
  assert.ok(
    langues.includes(CANONICAL_ES_LABEL),
    `${LANGUES_FILE} must surface the canonical ES label "${CANONICAL_ES_LABEL}"`,
  );
});

// ─── 7. /francisation links to /yo/langues/francais-quebec ─────────

test("/francisation links to /yo/langues/francais-quebec (or the route does not exist)", () => {
  if (!exists(FRANCISATION_MARKETING_FILE)) {
    console.log(
      `skip - ${FRANCISATION_MARKETING_FILE} does not exist on disk; nothing to assert`,
    );
    return;
  }
  const src = read(FRANCISATION_MARKETING_FILE);
  assert.ok(
    /\/yo\/langues\/francais-quebec/.test(src),
    `${FRANCISATION_MARKETING_FILE} must link to /yo/langues/francais-quebec (marketing bridge to YoPratiqo)`,
  );
});

// ─── 8. /francisation links to /trouver-un-prof?q=francais ─────────

test("/francisation links to /trouver-un-prof?q=francais (or the route does not exist)", () => {
  if (!exists(FRANCISATION_MARKETING_FILE)) {
    console.log(
      `skip - ${FRANCISATION_MARKETING_FILE} does not exist on disk; nothing to assert`,
    );
    return;
  }
  const src = read(FRANCISATION_MARKETING_FILE);
  assert.ok(
    /\/trouver-un-prof\?q=francais/.test(src),
    `${FRANCISATION_MARKETING_FILE} must link to /trouver-un-prof?q=francais (teacher bridge)`,
  );
});

// ─── 9. No bare "Yo" as a product name in user-facing JSX ──────────

test("modified IA files never use the bare word 'Yo' as a product name in user-facing UI text", () => {
  // Allow:
  //   · "YoPratiqo" (the canonical brand)
  //   · `Yo[A-Z]…` identifiers (component / type names like
  //     YoLocaleSwitcher, YoPratiqoModuleConfig)
  //   · comments / JSDoc that legitimately discuss the historical
  //     bare-Yo framing
  // Disallow:
  //   · standalone "Yo" appearing as a word boundary inside JSX text
  //     or string literals that look like UI copy.
  for (const file of [
    HUB_FILE,
    LANGUES_FILE,
    FR_QUEBEC_LANDING_FILE,
    ...(exists(FRANCISATION_MARKETING_FILE) ? [FRANCISATION_MARKETING_FILE] : []),
  ]) {
    const stripped = stripComments(read(file));
    // Match every "Yo" occurrence with word boundaries; we'll then
    // filter out the legitimate forms.
    const hits = stripped.match(/\bYo\b/g) ?? [];
    // The naive `\bYo\b` regex doesn't allow look-behinds, so we
    // re-scan around each hit and check the context.
    let foundIdx = 0;
    for (const _hit of hits) {
      const idx = stripped.indexOf("Yo", foundIdx);
      foundIdx = idx + 2;
      if (idx < 0) continue;
      const before = stripped.slice(Math.max(0, idx - 1), idx);
      const after = stripped.slice(idx + 2, idx + 3);
      // Reject when the preceding char is a JS identifier char
      // (handled by `\b`), but accept when followed by an uppercase
      // letter or by "Pratiqo" (i.e. allow "YoPratiqo" /
      // "YoLocaleSwitcher" / etc.).
      const followedByIdentifier = /[A-Za-z0-9_]/.test(after);
      const precededByIdentifier = /[A-Za-z0-9_]/.test(before);
      if (followedByIdentifier || precededByIdentifier) continue;
      assert.fail(
        `${file} must not use the bare word "Yo" as a product name (found at index ${idx})`,
      );
    }
  }
});

// ─── 10. No bare "Voyage" as a product name in user-facing JSX ─────

test("modified IA files never use the bare word 'Voyage' as a top-level product family name", () => {
  for (const file of [
    HUB_FILE,
    LANGUES_FILE,
    FR_QUEBEC_LANDING_FILE,
    ...(exists(FRANCISATION_MARKETING_FILE) ? [FRANCISATION_MARKETING_FILE] : []),
  ]) {
    const stripped = stripComments(read(file));
    // We scan only inside string literals and JSX text — comments
    // are already stripped. The bare word must not appear as a
    // top-level product family name. Internal taxonomy keys like
    // `productLine: "voyage"` are intentionally lowercase and would
    // not match `\bVoyage\b`.
    assert.ok(
      !/\bVoyage\b/.test(stripped),
      `${file} must not use the bare word "Voyage" as a product family name`,
    );
    // English equivalent — "Travel" is allowed as a word inside
    // generic copy (e.g. "travel phrases"), but NOT as a standalone
    // top-level family label. We focus the assertion on the literal
    // "Travel section" / "Travel" framing that historically
    // identified Voyage as a family. Acceptable lowercase usage like
    // "travel phrases" is unaffected.
    assert.ok(
      !/\bTravel\s+section\b/i.test(stripped),
      `${file} must not frame YoPratiqo as having a "Travel section" anymore`,
    );
  }
});

// ─── 11. None of the modified files import restricted systems ──────

test("modified IA files never import payments / Stripe / Supabase / RLS / migrations / booking / Membre Pro / commission / OpenAI / audio-gen / live-legal-page code", () => {
  // Mirrors the forbidden-imports regex set used by the existing
  // premium-shell test, plus the OpenAI / audio-generation /
  // live-legal-page additions called out in the IA spec.
  const forbidden: ReadonlyArray<[RegExp, string]> = [
    [/\bstripe\b/i, "Stripe"],
    [/@\/lib\/payments/, "payments lib"],
    [/getSupabaseClient|getSupabaseAdmin|@\/lib\/supabase/, "Supabase"],
    [/supabase\/migrations/, "Supabase migrations"],
    [/\bRLS\b/, "RLS reference"],
    [/@\/components\/BookingModal|@\/lib\/booking/, "Booking modal/lib"],
    [/\bmembrePro\b|\bMembrePro\b|\bmembre_pro\b/, "Membre Pro config"],
    [/\bcommission\b/i, "commission math"],
    [/yopratiqoAudio|YOPRATIQO_AUDIO_MANIFEST/, "YoPratiqo audio manifest"],
    [/generate-yopratiqo-audio/, "YoPratiqo audio generator script"],
    [/\bcheckout\b/i, "checkout"],
    [/\bpaywall\b/i, "paywall"],
    [/\bpaid_module\b/i, "paid_module identifier"],
    [/\bopenai\b/i, "OpenAI"],
    [/from\s*["']openai["']/i, "openai package import"],
    // The teacher-dashboard tree and the live legal pages are out of
    // scope for IA edits.
    [/@\/app\/teacher-dashboard|@\/components\/teacher-dashboard/, "teacher dashboard"],
    [/from\s*["']@\/app\/legal\//, "live legal page import"],
  ];
  for (const file of [
    HUB_FILE,
    LANGUES_FILE,
    FR_QUEBEC_LANDING_FILE,
    ...(exists(FRANCISATION_MARKETING_FILE) ? [FRANCISATION_MARKETING_FILE] : []),
  ]) {
    const src = stripComments(read(file));
    for (const [re, label] of forbidden) {
      assert.ok(
        !re.test(src),
        `${file} must not reference ${label} (${re}) — out of scope for the IA cleanup`,
      );
    }
  }
});

// ─── Run ───────────────────────────────────────────────────────────

(async () => {
  let passed = 0;
  for (const entry of tests) {
    try {
      await entry.fn();
      passed += 1;
      console.log(`ok - ${entry.name}`);
    } catch (error) {
      console.error(`not ok - ${entry.name}`);
      throw error;
    }
  }
  console.log(
    `\n${passed} YoPratiqo information-architecture assertions passed.`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
