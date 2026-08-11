/**
 * Tests for the centralized public display-name policy.
 *
 * Two layers:
 *
 *   1. Unit tests for `publicFirstNameWithInitial` covering every shape
 *      documented in `lib/identity/displayName.ts`:
 *        - "Marie Dubois" → "Marie D."
 *        - "Carlos da Silva" → "Carlos D." (first initial of next token)
 *        - "Marc-André Théberge" → "Marc-André T."
 *        - "Madonna" → "Madonna" (mononyms unchanged)
 *        - Unicode + whitespace + null/undefined edge cases.
 *
 *   2. Source-scan regression tests asserting the public SEO / JSON-LD
 *      surfaces never feed `teacher.name` (or `initialTeacher.name`) raw
 *      into a meta description, OpenGraph title, Twitter title, or
 *      schema.org Person.name. They MUST be routed through
 *      `publicFirstNameWithInitial(...)` first.
 *
 *   3. Source-scan invariants on the central helper itself:
 *      - no Stripe / payment / receipt imports,
 *      - pure (no Date.now / fetch / I/O),
 *      - exposes the exact name required by the spec.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { publicFirstNameWithInitial } from "@/lib/identity/displayName";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

// ---------------------------------------------------------------------------
// 1. Documented examples from the spec
// ---------------------------------------------------------------------------

test("spec example: 'Marie Dubois' → 'Marie D.'", () => {
  assert.equal(publicFirstNameWithInitial("Marie Dubois"), "Marie D.");
});

test("spec example: 'Carlos da Silva' → 'Carlos D.' (first initial of next token, not last)", () => {
  // The spec deliberately takes the initial of the SECOND token (the
  // particle "da"), not the last token "Silva". This protects the rarer,
  // more identifying surname from public exposure.
  assert.equal(publicFirstNameWithInitial("Carlos da Silva"), "Carlos D.");
});

test("spec example: 'Madonna' → 'Madonna' (mononym unchanged)", () => {
  assert.equal(publicFirstNameWithInitial("Madonna"), "Madonna");
});

// ---------------------------------------------------------------------------
// 2. Hyphenated and accented first names
// ---------------------------------------------------------------------------

test("hyphenated first name is preserved: 'Marc-André Théberge' → 'Marc-André T.'", () => {
  assert.equal(publicFirstNameWithInitial("Marc-André Théberge"), "Marc-André T.");
});

test("accented Unicode initial is preserved: 'Łukasz Nowak' → 'Łukasz N.'", () => {
  assert.equal(publicFirstNameWithInitial("Łukasz Nowak"), "Łukasz N.");
});

test("multi-token initial token: 'Élise Müller-Schmidt' → 'Élise M.'", () => {
  assert.equal(publicFirstNameWithInitial("Élise Müller-Schmidt"), "Élise M.");
});

// ---------------------------------------------------------------------------
// 3. Whitespace, case, null/undefined hygiene
// ---------------------------------------------------------------------------

test("internal whitespace is collapsed: '  Marie   Dubois  ' → 'Marie D.'", () => {
  assert.equal(publicFirstNameWithInitial("  Marie   Dubois  "), "Marie D.");
});

test("lowercase second token is uppercased in the initial: 'marie dubois' → 'marie D.'", () => {
  // The first-name token is preserved as-is — we never re-case the first
  // name. Only the initial is uppercased so the output is visually clean.
  assert.equal(publicFirstNameWithInitial("marie dubois"), "marie D.");
});

test("null returns empty string", () => {
  assert.equal(publicFirstNameWithInitial(null), "");
});

test("undefined returns empty string", () => {
  assert.equal(publicFirstNameWithInitial(undefined), "");
});

test("empty string returns empty string", () => {
  assert.equal(publicFirstNameWithInitial(""), "");
});

test("whitespace-only string returns empty string", () => {
  assert.equal(publicFirstNameWithInitial("   "), "");
});

test("non-string (cast at API edge) returns empty string", () => {
  // Defensive: callers sometimes pass values from JSON that are typed as
  // string but could be null at runtime. The helper must never throw.
  assert.equal(publicFirstNameWithInitial(42 as unknown as string), "");
  assert.equal(publicFirstNameWithInitial({} as unknown as string), "");
});

// ---------------------------------------------------------------------------
// 4. Three+ token full names — confirm second-token rule, not last-token
// ---------------------------------------------------------------------------

test("four tokens (FR particles): 'Jean-Pierre de la Fontaine' → 'Jean-Pierre D.'", () => {
  assert.equal(publicFirstNameWithInitial("Jean-Pierre de la Fontaine"), "Jean-Pierre D.");
});

test("two given names + family: 'Maria Elena Garcia' → 'Maria E.' (second token wins)", () => {
  // A simple, predictable rule — we don't try to detect "given names" vs
  // "family names" because that's culturally fraught. The first token
  // stays, the second token's initial appears.
  assert.equal(publicFirstNameWithInitial("Maria Elena Garcia"), "Maria E.");
});

// ---------------------------------------------------------------------------
// 5. Algorithmic invariants
// ---------------------------------------------------------------------------

test("output never contains the second token in full (only its initial)", () => {
  for (const input of [
    "Marie Dubois",
    "Carlos da Silva",
    "Marc-André Théberge",
    "Jean-Pierre de la Fontaine",
    "Maria Elena Garcia",
  ]) {
    const out = publicFirstNameWithInitial(input);
    const tokens = input.trim().split(/\s+/);
    const secondToken = tokens[1];
    if (!secondToken) continue;
    // The output must not contain the full second token (more than 1 char).
    // We use a word-boundary regex to avoid false positives on substring
    // overlap with the first name.
    if (secondToken.length > 1) {
      const tokenRe = new RegExp(`\\b${secondToken}\\b`);
      assert.doesNotMatch(out, tokenRe, `output "${out}" leaked full token "${secondToken}"`);
    }
  }
});

// ---------------------------------------------------------------------------
// 6. Source-scan: SEO page must mask before SEO/OG/JSON-LD
// ---------------------------------------------------------------------------

const SEO_PAGE_SRC = readFileSync(
  join(process.cwd(), "app", "teacher", "profile", "[id]", "page.tsx"),
  "utf8",
);

test("SEO page imports publicFirstNameWithInitial", () => {
  assert.match(
    SEO_PAGE_SRC,
    /from\s+["']@\/lib\/identity\/displayName["']/,
    "SEO page must import the centralized helper",
  );
});

test("SEO title is built from publicTeacherName, not raw teacher.name", () => {
  assert.match(
    SEO_PAGE_SRC,
    /buildTeacherSeoTitle\(\s*publicTeacherName/,
    "buildTeacherSeoTitle must receive the masked publicTeacherName",
  );
  assert.doesNotMatch(
    SEO_PAGE_SRC,
    /buildTeacherSeoTitle\(\s*teacher\.name/,
    "buildTeacherSeoTitle must NOT receive raw teacher.name",
  );
});

test("SEO description is built from publicTeacherName, not raw teacher.name", () => {
  assert.match(
    SEO_PAGE_SRC,
    /buildTeacherSeoDescription\(\s*publicTeacherName/,
    "buildTeacherSeoDescription must receive the masked publicTeacherName",
  );
  assert.doesNotMatch(
    SEO_PAGE_SRC,
    /buildTeacherSeoDescription\(\s*teacher\.name/,
    "buildTeacherSeoDescription must NOT receive raw teacher.name",
  );
});

test("JSON-LD Person.name uses publicFirstNameWithInitial(initialTeacher.name)", () => {
  assert.match(
    SEO_PAGE_SRC,
    /name:\s*publicFirstNameWithInitial\(\s*initialTeacher\.name\s*\)/,
    "JSON-LD `name` must be the masked variant",
  );
  // And the legacy raw `name: initialTeacher.name,` form must not return.
  assert.doesNotMatch(
    SEO_PAGE_SRC,
    /\bname:\s*initialTeacher\.name\b/,
    "JSON-LD must not use raw initialTeacher.name",
  );
});

// ---------------------------------------------------------------------------
// 7. Source-scan: every public render surface routes through the helper
// ---------------------------------------------------------------------------

const PUBLIC_FILES = [
  "components/TeacherProfile.tsx",
  "components/BookingModal.tsx",
  "components/Explore.tsx",
  "components/SearchMapView.tsx",
  "components/SmartSearchInput.tsx",
  "components/marketing/LandingTeacherListingCard.tsx",
  "components/marketing/HeroTeacherPreviewCards.tsx",
  "components/marketing/TeacherQuiz.tsx",
  "components/blog/RelatedTeachersWidget.tsx",
  "app/(app)/student/search/page.tsx",
  "app/(app)/booking/page.tsx",
  "app/teacher/profile/page.tsx",
  "components/seo/LocalTeacherDiscoveryCards.tsx",
] as const;

const LEGACY_REDIRECT_ONLY_FILES = [
  "app/clases/montevideo/[barrioSlug]/page.tsx",
] as const;

test("every public render surface imports publicFirstNameWithInitial", () => {
  for (const rel of PUBLIC_FILES) {
    const src = readFileSync(join(process.cwd(), ...rel.split("/")), "utf8");
    assert.match(
      src,
      /publicFirstNameWithInitial/,
      `${rel} must reference publicFirstNameWithInitial`,
    );
  }
});

test("public render surfaces no longer print raw {teacher.name} as a visible label", () => {
  // Detects the most common regression: someone writing
  //   <p>{teacher.name}</p>
  // again. The pattern below matches text-style JSX children
  // (`>{teacher.name}<` between two angle brackets) but not prop usages
  // like `name={teacher.name}` or `alt={teacher.name}` which are
  // intentionally left alone (those feed initials / a11y, not visible
  // public labels and they don't reach SEO/JSON-LD).
  const VISIBLE_LABEL_RE = />\s*\{\s*teacher\.name\s*\}\s*</;
  for (const rel of PUBLIC_FILES) {
    const src = readFileSync(join(process.cwd(), ...rel.split("/")), "utf8");
    assert.doesNotMatch(
      src,
      VISIBLE_LABEL_RE,
      `${rel} still renders {teacher.name} as a visible label — wrap it with publicFirstNameWithInitial(...)`,
    );
  }
});

test("legacy redirect-only market routes do not render teacher names", () => {
  for (const rel of LEGACY_REDIRECT_ONLY_FILES) {
    const src = readFileSync(join(process.cwd(), ...rel.split("/")), "utf8");
    assert.match(src, /permanentRedirect\("\/uy"\)/, `${rel} must redirect to /uy`);
    assert.doesNotMatch(src, /\bteacher\.name\b/, `${rel} must not render teacher.name`);
  }
});

// ---------------------------------------------------------------------------
// 8. Source-scan: the helper itself must remain pure and side-effect-free
// ---------------------------------------------------------------------------

const HELPER_SRC = readFileSync(
  join(process.cwd(), "lib", "identity", "displayName.ts"),
  "utf8",
);

test("displayName helper exports the spec-mandated function name", () => {
  assert.match(
    HELPER_SRC,
    /export\s+function\s+publicFirstNameWithInitial\s*\(/,
    "spec requires the export name 'publicFirstNameWithInitial'",
  );
});

test("displayName helper is pure — no Date.now / fetch / Stripe / Supabase / network imports", () => {
  // Strip line + block comments first so the docstring doesn't trigger
  // false positives.
  const codeOnly = HELPER_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(
    /^[ \t]*\/\/.*$/gm,
    "",
  );
  assert.ok(!/Date\.now\(/.test(codeOnly), "helper must not call Date.now() (purity)");
  assert.ok(!/\bfetch\(/.test(codeOnly), "helper must not perform network I/O");
  assert.ok(!/from\s+["']stripe["']/i.test(codeOnly), "helper must not import Stripe");
  assert.ok(
    !/from\s+["']@\/lib\/supabase/i.test(codeOnly),
    "helper must not import Supabase",
  );
});

// ---------------------------------------------------------------------------
// 9. Source-scan: receipts / payments / webhook surfaces still use the
//    FULL name — we must not regress and accidentally mask receipts.
// ---------------------------------------------------------------------------

test("payments page does NOT route the receipt teacher name through publicFirstNameWithInitial", () => {
  const src = readFileSync(
    join(process.cwd(), "app", "(app)", "student", "payments", "page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    src,
    /publicFirstNameWithInitial/,
    "receipts page must keep the full teacher name (legal/accounting)",
  );
});

test("review-published webhook does NOT route the teacher email name through the masker", () => {
  const src = readFileSync(
    join(process.cwd(), "app", "api", "webhooks", "review-published", "route.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    src,
    /publicFirstNameWithInitial/,
    "teacher-bound webhook must keep the full name (we are emailing the teacher themselves)",
  );
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  let passed = 0;
  const failed: Array<{ name: string; err: unknown }> = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ok  ${name}`);
    } catch (err) {
      failed.push({ name, err });
      console.log(`  FAIL ${name}`);
    }
  }

  console.log(`\n${passed}/${tests.length} passed`);

  if (failed.length > 0) {
    for (const { name, err } of failed) {
      console.error(`\n--- ${name} ---`);
      console.error(err);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
