// Regression suite for D1 — teacher public-read isolation.
//
// Verifies migration 070 + companion code changes:
//   1. Base public.teachers RLS no longer allows broad anon/authenticated SELECT
//      (only owner + history paths remain).
//   2. public.teachers_public is rebuilt as SECURITY DEFINER (security_invoker = false)
//      so anon/authenticated can still read it after the base-table RLS lockdown.
//   3. The public view's column list excludes Stripe Connect/Identity internals,
//      diploma_url, phone_verified, identity_status, stripe_identity_status, and
//      the location/cv verification workflow enums.
//   4. The public view filters out failed Stripe Identity verifications at the
//      view level so the raw enum does not need to be exposed.
//   5. Grants on the public view stay open to anon/authenticated/service_role.
//   6. lib/supabase/queries.ts TEACHERS_LIST_SELECT no longer requests the
//      removed sensitive columns.
//   7. Public/pre-booking SEO server pages read through teachers_public, not
//      base teachers, and do not request the sensitive columns.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import assert from "node:assert/strict";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 1. Migration 070 RLS shape
// ---------------------------------------------------------------------------

const migration070 = read("supabase/migrations/070_teachers_public_read_isolation.sql");

test("migration 070: drops the broad teachers_select_public policy", () => {
  assert.match(migration070, /DROP POLICY IF EXISTS "teachers_select_public" ON public\.teachers/);
});

test("migration 070: replaces it with owner-or-history only SELECT policy", () => {
  assert.match(
    migration070,
    /CREATE POLICY "teachers_select_owner_or_history"\s+ON public\.teachers FOR SELECT/,
  );
  // The new policy USING clause must be owner OR has_history only.
  // It MUST NOT re-introduce a broad COALESCE(is_public, true) public-read path.
  const policyBlock =
    migration070.match(/CREATE POLICY "teachers_select_owner_or_history"[\s\S]*?\);\n/)?.[0] ?? "";
  assert.notEqual(policyBlock, "", "owner-or-history policy block must exist");
  assert.match(policyBlock, /auth\.uid\(\) = user_id/);
  assert.match(policyBlock, /public\.user_has_teacher_history\(teachers\.id, auth\.uid\(\)\)/);
  assert.doesNotMatch(policyBlock, /COALESCE\(is_public, true\)/i);
  assert.doesNotMatch(policyBlock, /deactivated_at IS NULL/i);
  assert.doesNotMatch(policyBlock, /\bUSING\s*\(\s*true\s*\)/i);
});

// ---------------------------------------------------------------------------
// 2. Migration 070 view definition
// ---------------------------------------------------------------------------

test("migration 070: rebuilds teachers_public with security_invoker = false", () => {
  assert.match(migration070, /DROP VIEW IF EXISTS public\.teachers_public/);
  assert.match(
    migration070,
    /CREATE VIEW public\.teachers_public\s+WITH \(security_invoker = false\)/,
  );
});

test("migration 070: view exposes a known-safe column set", () => {
  // Spot-check columns that MUST stay public.
  for (const col of [
    "t.id",
    "t.user_id",
    "t.name",
    "t.discipline",
    "t.rating",
    "t.reviews",
    "t.price_per_lesson",
    "t.bio",
    "t.image_url",
    "t.is_verified",
    "t.verification_level",
    "t.identity_verified",
    "t.diploma_verified",
    "t.cv_summary",
  ]) {
    assert.match(migration070, new RegExp(col.replace(/\./g, "\\.")));
  }
  // Location must have its 'private' JSON sub-object stripped.
  assert.match(migration070, /\(t\.location - 'private'::text\) AS location/);
});

test("migration 070: view OMITS sensitive columns from its SELECT list", () => {
  // Extract just the SELECT column projection (between the SELECT keyword and
  // the FROM clause). The WHERE clause intentionally references identity_status
  // to filter failed verifications, and comments may mention sensitive columns
  // to explain WHY they were removed — both must be ignored by this scan.
  const viewSelectBlock =
    migration070.match(
      /CREATE VIEW public\.teachers_public[\s\S]*?\nAS\s*\nSELECT([\s\S]*?)\nFROM public\.teachers t/,
    )?.[1] ?? "";
  assert.notEqual(viewSelectBlock, "", "view SELECT block must be parseable from migration 070");

  // Strip SQL line comments (-- ...) so a "do not expose X" comment does not
  // false-positive the regex below.
  const selectNoComments = viewSelectBlock
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");

  for (const sensitiveCol of [
    "t.phone_verified",
    "t.identity_status",
    "t.stripe_identity_status",
    "t.diploma_url",
    "t.location_verification_status",
    "t.location_verified_at",
    "t.location_verification_method",
    "t.cv_verification_status",
    "t.stripe_account_id",
    "t.stripe_connect_charges_enabled",
    "t.stripe_connect_payouts_enabled",
    "t.stripe_identity_session_id",
    "t.stripe_identity_verified_at",
    "t.stripe_identity_failed_reason",
  ]) {
    assert.doesNotMatch(
      selectNoComments,
      new RegExp(`\\b${sensitiveCol.replace(/\./g, "\\.")}\\b`),
      `Sensitive column ${sensitiveCol} must not be selected in teachers_public`,
    );
  }
});

test("migration 070: view WHERE filters out failed identity verifications", () => {
  assert.match(
    migration070,
    /COALESCE\(t\.identity_status, 'none'\)\s*<>\s*'failed'/,
  );
});

test("migration 070: view re-grants SELECT to anon/authenticated/service_role", () => {
  assert.match(migration070, /GRANT SELECT ON public\.teachers_public TO anon/);
  assert.match(migration070, /GRANT SELECT ON public\.teachers_public TO authenticated/);
  assert.match(migration070, /GRANT SELECT ON public\.teachers_public TO service_role/);
});

// ---------------------------------------------------------------------------
// 3. Migration 057 must allow the new state (NOTICE, not EXCEPTION)
// ---------------------------------------------------------------------------

test("migration 057: guard is downgraded to NOTICE so 057 -> 070 chain applies", () => {
  const migration057 = read(
    "supabase/migrations/057_restore_stripe_identity_status_to_teachers_public.sql",
  );
  // Strip SQL comments — the explanatory header legitimately mentions the
  // historical RAISE EXCEPTION behavior, which is now removed from real SQL.
  const sqlOnly = migration057
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  assert.doesNotMatch(sqlOnly, /RAISE EXCEPTION/);
  assert.match(sqlOnly, /RAISE NOTICE/);
});

// ---------------------------------------------------------------------------
// 4. lib/supabase/queries.ts public select must not request sensitive columns
// ---------------------------------------------------------------------------

test("TEACHERS_LIST_SELECT omits sensitive workflow columns", () => {
  const src = read("lib/supabase/queries.ts");
  const listSelect = src.match(/TEACHERS_LIST_SELECT\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(listSelect, "TEACHERS_LIST_SELECT must be a string literal");
  const cols = new Set(listSelect.split(",").map((c) => c.trim()));
  for (const banned of [
    "phone_verified",
    "identity_status",
    "stripe_identity_status",
    "diploma_url",
    "location_verification_status",
    "location_verified_at",
    "location_verification_method",
    "cv_verification_status",
    "stripe_account_id",
  ]) {
    assert.equal(
      cols.has(banned),
      false,
      `TEACHERS_LIST_SELECT must not request "${banned}" from the public view`,
    );
  }
  // Sanity: the public-safe trust booleans MUST still be present.
  for (const required of [
    "id",
    "user_id",
    "name",
    "identity_verified",
    "diploma_verified",
    "verification_level",
  ]) {
    assert.equal(
      cols.has(required),
      true,
      `TEACHERS_LIST_SELECT is missing required public column "${required}"`,
    );
  }
});

test("TEACHERS_LIST_SELECT_LEGACY_PUBLIC is an alias of TEACHERS_LIST_SELECT (no extra columns)", () => {
  const src = read("lib/supabase/queries.ts");
  // The legacy export must not reintroduce sensitive columns as a string literal.
  // Either it is a direct re-export of TEACHERS_LIST_SELECT, or it is a string
  // literal with the same safe column set.
  const literal = src.match(/TEACHERS_LIST_SELECT_LEGACY_PUBLIC\s*=\s*"([^"]+)"/)?.[1];
  if (literal) {
    const cols = new Set(literal.split(",").map((c) => c.trim()));
    for (const banned of [
      "phone_verified",
      "identity_status",
      "stripe_identity_status",
      "diploma_url",
      "location_verification_status",
      "cv_verification_status",
    ]) {
      assert.equal(
        cols.has(banned),
        false,
        `TEACHERS_LIST_SELECT_LEGACY_PUBLIC must not request "${banned}"`,
      );
    }
  } else {
    // Re-exported as an alias — pattern must show explicit identity.
    assert.match(
      src,
      /TEACHERS_LIST_SELECT_LEGACY_PUBLIC\s*=\s*TEACHERS_LIST_SELECT\s*;/,
      "TEACHERS_LIST_SELECT_LEGACY_PUBLIC must alias TEACHERS_LIST_SELECT or repeat the safe column list",
    );
  }
});

// ---------------------------------------------------------------------------
// 5. Source-scan: SEO and pre-booking public surfaces use teachers_public
// ---------------------------------------------------------------------------

const PUBLIC_PAGE_FILES = [
  "app/clases/montevideo/[barrioSlug]/page.tsx",
];

const LOCAL_DISCOVERY_FILES = [
  "app/cours/[disciplineSlug]/[citySlug]/page.tsx",
  "app/tuteurs/[citySlug]/page.tsx",
  "lib/seo/localTeacherDiscoveryPages.ts",
];

test("public SEO pages read through teachers_public, not base teachers", () => {
  for (const rel of PUBLIC_PAGE_FILES) {
    const src = read(rel);
    assert.doesNotMatch(
      src,
      /\.from\(\s*["']teachers["']\s*\)/,
      `${rel} must not query base public.teachers directly; use TEACHERS_PUBLIC_TABLE`,
    );
    assert.match(
      src,
      /TEACHERS_PUBLIC_TABLE/,
      `${rel} must read through teachers_public`,
    );
  }
});

test("local discovery pages use admin indexable teacher fetch without sensitive workflow columns", () => {
  for (const rel of LOCAL_DISCOVERY_FILES) {
    const src = read(rel);
    assert.doesNotMatch(src, /diploma_url|identity_status|stripe_account_id|stripe_connect_/);
    assert.match(
      src,
      /localTeacherDiscoveryPages|resolveSubjectCityDiscoveryPage|resolveCityHubDiscoveryPage|isTeacherPublicProfileIndexable/,
      `${rel} must use the local discovery eligibility helper`,
    );
  }
});

test("public SEO pages do not select sensitive workflow columns", () => {
  for (const rel of PUBLIC_PAGE_FILES) {
    const src = read(rel);
    // Extract every string literal that looks like a Supabase select list
    // (TEACHER_SELECT constant assignments + inline .select("..") arguments).
    // We deliberately ignore code comments / JSX text, which often legitimately
    // mention the field names while explaining the removal.
    const selectLiterals: string[] = [];
    const selectConst = src.match(/const\s+TEACHER_SELECT\s*=\s*"([^"]+)"/);
    if (selectConst) selectLiterals.push(selectConst[1]);
    const inlineSelects = src.matchAll(/\.select\(\s*"([^"]+)"\s*\)/g);
    for (const m of inlineSelects) selectLiterals.push(m[1]);

    assert.ok(
      selectLiterals.length > 0,
      `${rel} should contain at least one select literal — refactor likely changed the shape, update test`,
    );

    for (const literal of selectLiterals) {
      const cols = new Set(literal.split(",").map((c) => c.trim()));
      for (const banned of [
        "phone_verified",
        "identity_status",
        "stripe_identity_status",
        "diploma_url",
        "location_verification_status",
        "cv_verification_status",
      ]) {
        assert.equal(
          cols.has(banned),
          false,
          `${rel} must not request sensitive column "${banned}" in its SELECT list`,
        );
      }
    }
  }
});

// ---------------------------------------------------------------------------
// 6. Source-scan: pre-booking client surfaces that already use TEACHERS_PUBLIC_TABLE
//    must keep doing so. Catch regressions like a future refactor that swaps
//    them to base "teachers".
// ---------------------------------------------------------------------------

const CLIENT_PREBOOKING_FILES = [
  "app/LandingPageClient.tsx",
  "app/(app)/booking/page.tsx",
  "app/(app)/student/search/page.tsx",
  "app/teacher/profile/page.tsx",
  "app/teacher/profile/[id]/page.tsx",
  "app/teacher/profile/[id]/TeacherProfileClient.tsx",
  "components/Explore.tsx",
  "components/marketing/TeacherQuiz.tsx",
  "components/blog/RelatedTeachersWidget.tsx",
];

test("pre-booking surfaces query teachers_public via TEACHERS_PUBLIC_TABLE", () => {
  for (const rel of CLIENT_PREBOOKING_FILES) {
    const src = read(rel);
    assert.match(
      src,
      /TEACHERS_PUBLIC_TABLE|teachers_public/,
      `${rel} must read through teachers_public`,
    );
  }
});

test("TeacherQuiz drops the .neq(identity_status, failed) filter (view handles it)", () => {
  // read() already normalizes CRLF -> LF so the per-line strip works on Windows.
  const src = read("components/marketing/TeacherQuiz.tsx");
  // Strip // ... line comments and /* ... */ block comments so the changelog
  // note explaining the removal does not false-positive the regex.
  const codeOnly = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
  assert.doesNotMatch(
    codeOnly,
    /\.neq\(\s*["']identity_status["']\s*,\s*["']failed["']\s*\)/,
    "TeacherQuiz must not filter identity_status client-side now that the public view does it",
  );
});

// ---------------------------------------------------------------------------
// 7. Broad source-scan: no other client/server code re-introduces a public
//    SELECT of the sensitive columns over the wire.
// ---------------------------------------------------------------------------

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkSourceFiles(full, acc);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

test("no public-facing supabase select re-requests sensitive teacher columns", () => {
  const roots = ["app", "components"].map((r) => join(REPO_ROOT, r));
  const files = roots.flatMap((root) => walkSourceFiles(root));

  // Allowlist of files that legitimately read sensitive teacher columns.
  // These are either:
  //   - the teacher's own dashboard / verification / onboarding (own row only,
  //     gated by auth.uid() = user_id on the base table policy);
  //   - admin/support flows (admin auth + service-role access);
  //   - Stripe webhook + Stripe Identity callback handlers (service-role,
  //     server-side only, no browser exposure);
  //   - server-side data lifecycle helpers (cron / account deletion / etc.)
  //     that run with service-role and do not stream sensitive fields to a
  //     browser.
  const allowList = new Set(
    [
      "app/(app)/teacher/verification/page.tsx",
      "app/(app)/teacher/verification/components/CredentialsStep.tsx",
      "app/(app)/teacher/onboarding/page.tsx",
      "app/(app)/onboarding/teacher/page.tsx",
      "app/(app)/admin/review/page.tsx",
      "app/api/admin/review/route.ts",
      "app/api/stripe/webhook/route.ts",
      "app/api/stripe/identity/verify/route.ts",
      "app/api/stripe/connect/route.ts",
      "components/teacher/TeacherAccountView.tsx",
    ].map((p) => p.replace(/\//g, sep)),
  );

  function stripJsComments(src: string): string {
    // Normalize CRLF -> LF first so per-line `// ... $` strip works on
    // Windows checkouts (where lines end with `\r` and `.` would not match
    // the carriage return, leaving the comment intact).
    return src
      .replace(/\r\n/g, "\n")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .join("\n");
  }

  const violations: { file: string; column: string; literal: string }[] = [];
  for (const abs of files) {
    const rel = relative(REPO_ROOT, abs);
    if (allowList.has(rel)) continue;

    const src = stripJsComments(readFileSync(abs, "utf8"));

    // Pull every string literal that is passed to .select(), .neq(), .eq(),
    // .order(), or .filter(). These are the only places that can leak a
    // sensitive column over the wire to the browser (for client components)
    // or into the rendered HTML payload (for server components).
    const literals: string[] = [];
    const callRegex = /\.(select|neq|eq|order|filter)\(\s*["']([^"']+)["']/g;
    for (const m of src.matchAll(callRegex)) {
      literals.push(m[2]);
    }
    // Also include TEACHER_SELECT-style constants used to build a select list.
    const constLiterals = src.matchAll(/const\s+\w*SELECT\w*\s*=\s*"([^"]+)"/g);
    for (const m of constLiterals) literals.push(m[1]);

    for (const literal of literals) {
      const tokens = new Set(literal.split(/[,\s]+/).map((c) => c.trim()).filter(Boolean));
      for (const banned of [
        "phone_verified",
        "identity_status",
        "stripe_identity_status",
        "diploma_url",
        "location_verification_status",
        "location_verified_at",
        "location_verification_method",
        "cv_verification_status",
      ]) {
        if (tokens.has(banned)) {
          violations.push({ file: rel, column: banned, literal });
        }
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found public-facing selects requesting sensitive teacher columns:\n${violations
      .map((v) => `  - ${v.file}: ${v.column}  (literal: "${v.literal}")`)
      .join("\n")}`,
  );
});
