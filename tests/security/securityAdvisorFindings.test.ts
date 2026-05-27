/**
 * Security Advisor findings regression test.
 *
 * Source-scan check (no live DB) that locks in the fixes from migration
 * `075_fix_security_definer_views_and_spatial_ref_sys.sql` for the four
 * findings flagged by Supabase Security Advisor:
 *
 *   1. security_definer_view on public.teachers_public
 *   2. security_definer_view on public.teacher_revenue
 *   3. security_definer_view on public.revenue_daily
 *   4. rls_disabled_in_public on public.spatial_ref_sys
 *
 * Complements:
 *   - tests/security/rlsPolicyShape.test.ts        (sensitive table policies)
 *   - tests/security/productionAccessAudit.test.ts (app boundary checks)
 *   - tests/security/teacherPublicReadIsolation.test.ts (070 view shape)
 *   - tests/security/rlsCoverage.test.ts          (RLS coverage + 074 shape)
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const MIGRATION_FILE = "supabase/migrations/075_fix_security_definer_views_and_spatial_ref_sys.sql";
const MIGRATION_076_FILE = "supabase/migrations/076_spatial_ref_sys_rls_policy.sql";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

const migration = read(MIGRATION_FILE);
const migration076 = read(MIGRATION_076_FILE);

// Strip SQL comments so commentary that legitimately mentions a banned
// pattern (e.g. "Do NOT add `USING (true)`") does not false-positive the
// regex scans below.
const code = stripSqlComments(migration);
const code076 = stripSqlComments(migration076);

// ─────────────────────────────────────────────────────────────────────────
// 1. teachers_public: rebuilt with security_invoker = true, backed by a
//    SECURITY DEFINER helper function that itself fixes search_path and is
//    granted only EXECUTE (not table-level RLS bypass on the base table).
// ─────────────────────────────────────────────────────────────────────────

test("075: teachers_public view is rebuilt with security_invoker = true", () => {
  assert.match(code, /DROP VIEW IF EXISTS public\.teachers_public/i);
  assert.match(
    code,
    /CREATE VIEW public\.teachers_public[\s\S]*?WITH\s*\(\s*security_invoker\s*=\s*true\s*\)/i,
    "teachers_public must be recreated with security_invoker = true",
  );
});

test("075: teachers_public is sourced from list_public_teachers() (no direct base-table SELECT)", () => {
  const viewBlock =
    code.match(
      /CREATE VIEW public\.teachers_public[\s\S]*?WITH\s*\([^)]*\)[\s\S]*?;\s*/i,
    )?.[0] ?? "";
  assert.notEqual(viewBlock, "", "teachers_public CREATE VIEW block must be parseable");
  assert.match(
    viewBlock,
    /SELECT \* FROM public\.list_public_teachers\(\)/i,
    "teachers_public must read through public.list_public_teachers(); never directly from public.teachers / public.profiles",
  );
  assert.doesNotMatch(
    viewBlock,
    /FROM public\.teachers\b/i,
    "teachers_public must not query public.teachers directly under security_invoker = true",
  );
  assert.doesNotMatch(
    viewBlock,
    /JOIN public\.profiles\b/i,
    "teachers_public must not JOIN public.profiles directly under security_invoker = true",
  );
});

test("075: list_public_teachers() is SECURITY DEFINER with fixed search_path", () => {
  const fnBlock =
    code.match(
      /CREATE OR REPLACE FUNCTION public\.list_public_teachers\([\s\S]*?\$\$;/i,
    )?.[0] ?? "";
  assert.notEqual(fnBlock, "", "list_public_teachers function body must be parseable");
  assert.match(fnBlock, /LANGUAGE sql/i, "function must be SQL language");
  assert.match(fnBlock, /STABLE/i, "function must be STABLE");
  assert.match(fnBlock, /SECURITY DEFINER/i, "function must be SECURITY DEFINER");
  assert.match(
    fnBlock,
    /SET search_path = public/i,
    "function must pin search_path to defeat search-path attacks",
  );
});

test("075: list_public_teachers() does not return sensitive columns", () => {
  const fnBlock =
    code.match(
      /CREATE OR REPLACE FUNCTION public\.list_public_teachers\([\s\S]*?\$\$;/i,
    )?.[0] ?? "";
  for (const banned of [
    "stripe_account_id",
    "stripe_connect_charges_enabled",
    "stripe_connect_payouts_enabled",
    "stripe_connect_disabled_reason",
    "stripe_identity_status",
    "stripe_identity_session_id",
    "stripe_identity_verified_at",
    "stripe_identity_failed_reason",
    "phone_verified",
    "diploma_url",
    "location_verification_status",
    "location_verified_at",
    "location_verification_method",
    "cv_verification_status",
  ]) {
    assert.doesNotMatch(
      fnBlock,
      new RegExp(`\\bt\\.${banned}\\b`),
      `list_public_teachers must not project t.${banned}`,
    );
  }
});

test("075: list_public_teachers() preserves the marketplace WHERE filters", () => {
  const fnBlock =
    code.match(
      /CREATE OR REPLACE FUNCTION public\.list_public_teachers\([\s\S]*?\$\$;/i,
    )?.[0] ?? "";
  assert.match(fnBlock, /COALESCE\(t\.is_public, true\) = true/i);
  assert.match(fnBlock, /t\.deactivated_at IS NULL/i);
  assert.match(fnBlock, /t\.deleted_at IS NULL/i);
  assert.match(fnBlock, /COALESCE\(t\.identity_status, 'none'\)\s*<>\s*'failed'/i);
  assert.match(fnBlock, /COALESCE\(t\.is_demo, false\) = false/i);
  assert.match(fnBlock, /p\.deactivated_at IS NULL/i);
  assert.match(fnBlock, /p\.deleted_at IS NULL/i);
  assert.match(fnBlock, /p\.anonymized_at IS NULL/i);
});

test("075: function execute is granted to anon, authenticated, service_role; PUBLIC is revoked", () => {
  assert.match(code, /REVOKE ALL ON FUNCTION public\.list_public_teachers\(\) FROM PUBLIC/i);
  assert.match(code, /GRANT EXECUTE ON FUNCTION public\.list_public_teachers\(\) TO anon/i);
  assert.match(code, /GRANT EXECUTE ON FUNCTION public\.list_public_teachers\(\) TO authenticated/i);
  assert.match(code, /GRANT EXECUTE ON FUNCTION public\.list_public_teachers\(\) TO service_role/i);
});

test("075: teachers_public SELECT is re-granted to anon/authenticated/service_role", () => {
  assert.match(code, /GRANT SELECT ON public\.teachers_public TO anon/i);
  assert.match(code, /GRANT SELECT ON public\.teachers_public TO authenticated/i);
  assert.match(code, /GRANT SELECT ON public\.teachers_public TO service_role/i);
});

// ─────────────────────────────────────────────────────────────────────────
// 2. teacher_revenue and revenue_daily are not in this repo. The migration
//    must flip them to security_invoker = true if they exist (IF EXISTS
//    no-op otherwise) and revoke anon/authenticated/PUBLIC access guarded
//    by undefined_table EXCEPTION handling.
// ─────────────────────────────────────────────────────────────────────────

test("075: teacher_revenue is flipped to security_invoker = true (IF EXISTS)", () => {
  assert.match(
    code,
    /ALTER VIEW IF EXISTS public\.teacher_revenue\s+SET\s*\(\s*security_invoker\s*=\s*true\s*\)/i,
  );
});

test("075: revenue_daily is flipped to security_invoker = true (IF EXISTS)", () => {
  assert.match(
    code,
    /ALTER VIEW IF EXISTS public\.revenue_daily\s+SET\s*\(\s*security_invoker\s*=\s*true\s*\)/i,
  );
});

test("075: anon/authenticated/PUBLIC access on revenue views is revoked (with undefined_table guard)", () => {
  for (const view of ["teacher_revenue", "revenue_daily"]) {
    assert.match(
      code,
      new RegExp(`REVOKE ALL ON public\\.${view} FROM anon`, "i"),
      `must revoke anon SELECT on public.${view}`,
    );
    assert.match(
      code,
      new RegExp(`REVOKE ALL ON public\\.${view} FROM authenticated`, "i"),
      `must revoke authenticated SELECT on public.${view}`,
    );
    assert.match(
      code,
      new RegExp(`REVOKE ALL ON public\\.${view} FROM PUBLIC`, "i"),
      `must revoke PUBLIC access on public.${view}`,
    );
  }
  // The revoke blocks must be wrapped in DO/EXCEPTION so applying the
  // migration on a fresh dev DB (where the views don't exist) is a clean
  // no-op rather than a hard failure.
  assert.match(code, /EXCEPTION\s+WHEN\s+undefined_table\s+THEN/i);
});

// ─────────────────────────────────────────────────────────────────────────
// 3. spatial_ref_sys: try-enable RLS in a DO block that gracefully catches
//    insufficient_privilege when PostGIS owns the table.
// ─────────────────────────────────────────────────────────────────────────

test("075: spatial_ref_sys RLS is enabled with a graceful insufficient_privilege fallback", () => {
  const spatialBlock =
    code.match(/DO \$\$[\s\S]*?spatial_ref_sys[\s\S]*?END \$\$;/i)?.[0] ?? "";
  assert.notEqual(spatialBlock, "", "spatial_ref_sys DO block must be parseable");
  assert.match(
    spatialBlock,
    /ALTER TABLE IF EXISTS public\.spatial_ref_sys ENABLE ROW LEVEL SECURITY/i,
  );
  assert.match(
    spatialBlock,
    /WHEN\s+insufficient_privilege\s+THEN/i,
    "spatial_ref_sys handler must catch insufficient_privilege",
  );
  assert.match(
    spatialBlock,
    /WHEN\s+undefined_table\s+THEN/i,
    "spatial_ref_sys handler must also catch undefined_table",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Strict invariants: no permissive / service_role policies, no DISABLE,
//    no Stripe/payment-side regressions.
// ─────────────────────────────────────────────────────────────────────────

test("075: does not introduce permissive USING (true) on sensitive tables", () => {
  assert.doesNotMatch(
    code,
    /create\s+policy[\s\S]*?on\s+public\.(profiles|teachers|bookings|booking_payments|messages|chats|notifications|credit_transactions|student_private_locations|learner_profiles|teacher_credentials|review_reports|teacher_revenue|revenue_daily)\b[\s\S]*?using\s*\(\s*true\s*\)/i,
    "075 must not add USING (true) policies to sensitive tables / revenue views",
  );
});

test("075: does not create service_role policies", () => {
  assert.doesNotMatch(
    code,
    /create\s+policy[\s\S]*?to\s+service_role/i,
    "075 must not create explicit service_role policies (service_role bypasses RLS by design)",
  );
});

test("075: does not disable RLS anywhere", () => {
  assert.doesNotMatch(code, /disable\s+row\s+level\s+security/i);
});

test("075: does not reference support@pratiqo.ca", () => {
  assert.doesNotMatch(code, /support@pratiqo\.ca/i);
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Existing 070 invariants stay intact: the base public.teachers table
//    is NOT re-opened to broad public reads by this migration. Migration
//    070's owner-or-history-only SELECT policy on public.teachers must
//    remain the sole SELECT path for the base table.
// ─────────────────────────────────────────────────────────────────────────

test("075: does not add any new SELECT policy on public.teachers", () => {
  assert.doesNotMatch(
    code,
    /create\s+policy[\s\S]*?on\s+public\.teachers\s+for\s+select/i,
    "075 must not add a new SELECT policy on public.teachers; the SECURITY DEFINER helper is the only public read path",
  );
});

test("075: does not REVOKE the owner/history SELECT policy on public.teachers", () => {
  assert.doesNotMatch(code, /drop\s+policy[\s\S]*?teachers_select_owner_or_history/i);
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Migration 076 — final RLS + SELECT-only policy on spatial_ref_sys.
//    Locks in the exact pattern requested: SELECT-only policy granted to
//    anon/authenticated (NOT PUBLIC), no INSERT/UPDATE/DELETE policies,
//    insufficient_privilege/undefined_table/duplicate_object fallbacks, no
//    PostGIS extension churn.
// ─────────────────────────────────────────────────────────────────────────

test("076: migration file exists and targets only public.spatial_ref_sys", () => {
  assert.ok(migration076.length > 0, "migration 076 must exist");
  // The migration must not touch any other table or view.
  const tableTouchPattern =
    /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+public\.([a-z_][a-z0-9_]*)/gi;
  const tablesTouched = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = tableTouchPattern.exec(code076)) !== null) {
    tablesTouched.add(m[1].toLowerCase());
  }
  assert.deepEqual(
    [...tablesTouched].sort(),
    ["spatial_ref_sys"],
    `076 must only ALTER public.spatial_ref_sys, got: ${[...tablesTouched].join(", ") || "<none>"}`,
  );

  const policyTouchPattern =
    /(?:DROP|CREATE)\s+POLICY[\s\S]*?ON\s+public\.([a-z_][a-z0-9_]*)/gi;
  const policyTables = new Set<string>();
  while ((m = policyTouchPattern.exec(code076)) !== null) {
    policyTables.add(m[1].toLowerCase());
  }
  assert.deepEqual(
    [...policyTables].sort(),
    ["spatial_ref_sys"],
    `076 policy ops must only target public.spatial_ref_sys, got: ${[...policyTables].join(", ") || "<none>"}`,
  );
});

test("076: enables RLS on spatial_ref_sys", () => {
  assert.match(
    code076,
    /ALTER TABLE IF EXISTS public\.spatial_ref_sys ENABLE ROW LEVEL SECURITY/i,
  );
});

test("076: creates exactly one SELECT-only policy granted to anon, authenticated", () => {
  // DROP IF EXISTS pair must be present (idempotency).
  assert.match(
    code076,
    /DROP POLICY IF EXISTS "spatial_ref_sys_select_public" ON public\.spatial_ref_sys/i,
  );

  // Find every CREATE POLICY block in 076 and validate them.
  const policyBlocks = Array.from(
    code076.matchAll(/CREATE\s+POLICY[\s\S]*?;\s*/gi),
  ).map((mm) => mm[0]);
  assert.equal(
    policyBlocks.length,
    1,
    `076 must create exactly one policy on spatial_ref_sys, found ${policyBlocks.length}`,
  );

  const policyBlock = policyBlocks[0];
  assert.match(
    policyBlock,
    /CREATE POLICY "spatial_ref_sys_select_public"\s+ON public\.spatial_ref_sys/i,
  );
  assert.match(policyBlock, /\bFOR\s+SELECT\b/i, "policy must be FOR SELECT");
  assert.match(
    policyBlock,
    /\bTO\s+anon\s*,\s*authenticated\b/i,
    "policy must be TO anon, authenticated",
  );
  assert.match(policyBlock, /\bUSING\s*\(\s*true\s*\)/i);
});

test("076: does NOT grant TO PUBLIC", () => {
  assert.doesNotMatch(
    code076,
    /CREATE\s+POLICY[\s\S]*?\bTO\s+PUBLIC\b/i,
    "076 must not grant any policy TO PUBLIC",
  );
});

test("076: does NOT create INSERT, UPDATE, DELETE, or ALL policies", () => {
  for (const cmd of ["INSERT", "UPDATE", "DELETE", "ALL"]) {
    assert.doesNotMatch(
      code076,
      new RegExp(`CREATE\\s+POLICY[\\s\\S]*?\\bFOR\\s+${cmd}\\b`, "i"),
      `076 must not create a FOR ${cmd} policy on spatial_ref_sys`,
    );
  }
});

test("076: does not GRANT or REVOKE writes on spatial_ref_sys", () => {
  // Allow zero GRANT/REVOKE statements at all in this migration — the table
  // is extension-owned and the existing PostGIS defaults are sufficient.
  assert.doesNotMatch(
    code076,
    /\bGRANT\s+(INSERT|UPDATE|DELETE|ALL|TRUNCATE|REFERENCES|TRIGGER)\b/i,
    "076 must not GRANT writes on spatial_ref_sys",
  );
  assert.doesNotMatch(
    code076,
    /\bGRANT\b[\s\S]*?ON\s+public\.spatial_ref_sys/i,
    "076 must not add any GRANT on spatial_ref_sys",
  );
  assert.doesNotMatch(
    code076,
    /\bREVOKE\b[\s\S]*?ON\s+public\.spatial_ref_sys/i,
    "076 must not REVOKE on spatial_ref_sys",
  );
});

test("076: gracefully handles insufficient_privilege, undefined_table, duplicate_object", () => {
  const block = code076.match(/DO \$\$[\s\S]*?END \$\$;/i)?.[0] ?? "";
  assert.notEqual(block, "", "076 must wrap the work in a DO block");
  assert.match(block, /WHEN\s+insufficient_privilege\s+THEN/i);
  assert.match(block, /WHEN\s+undefined_table\s+THEN/i);
  assert.match(block, /WHEN\s+duplicate_object\s+THEN/i);
});

test("076: does NOT drop, recreate, or move the PostGIS extension", () => {
  assert.doesNotMatch(
    code076,
    /\bDROP\s+EXTENSION\b/i,
    "076 must not DROP EXTENSION postgis (or any extension)",
  );
  assert.doesNotMatch(
    code076,
    /\bCREATE\s+EXTENSION\b/i,
    "076 must not CREATE EXTENSION",
  );
  assert.doesNotMatch(
    code076,
    /\bALTER\s+EXTENSION\b/i,
    "076 must not ALTER EXTENSION postgis (no schema moves)",
  );
});

test("076: does not disable RLS, does not reference support@pratiqo.ca", () => {
  assert.doesNotMatch(code076, /disable\s+row\s+level\s+security/i);
  assert.doesNotMatch(code076, /support@pratiqo\.ca/i);
});

// ─────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────

let passed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`ok - ${t.name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${t.name}`);
    throw error;
  }
}

console.log(`[security:securityAdvisorFindings] ${passed} tests passed`);
