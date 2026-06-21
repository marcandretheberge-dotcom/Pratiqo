/**
 * RLS coverage regression test.
 *
 * Source-scan check (no live DB needed) that enforces three invariants for
 * the `supabase/migrations/` folder, so a future migration that introduces a
 * new public table without RLS protection fails CI before it can ship:
 *
 *   1. Every `CREATE TABLE [IF NOT EXISTS] public.<name>` (or unqualified
 *      `CREATE TABLE <name>` where the file otherwise scopes to public) has
 *      at least one `ENABLE ROW LEVEL SECURITY` statement somewhere across
 *      the full migration history.
 *
 *   2. The hardening migration `074_enable_rls_security_hardening.sql`
 *      exists, embeds the audit queries, runs the drift-catcher loop, and
 *      ends with the assertion that fails if any public ordinary table is
 *      still RLS-disabled.
 *
 *   3. The hardening migrations explicitly reference every table that
 *      `CREATE TABLE` appears for. This is what prevents drift from
 *      silently sneaking past the explicit-enable list, while still allowing
 *      forward-only hardening migrations for tables added after 074.
 *
 * This file complements `tests/security/rlsPolicyShape.test.ts` (which
 * locks down the *policy shape* on sensitive tables) and
 * `tests/security/productionAccessAudit.test.ts` (which checks app code
 * boundaries).
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const HARDENING_FILE = "074_enable_rls_security_hardening.sql";
const EXPLICIT_RLS_HARDENING_FILES = [
  HARDENING_FILE,
  "085_harden_student_onboarding_consents_rls.sql",
];

const POSTGIS_RLS_HARDENING_FILES = [
  "086_harden_spatial_ref_sys_rls.sql",
];

function readMigration(file: string): string {
  return readFileSync(join(MIGRATIONS_DIR, file), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const allMigrationsText = migrationFiles
  .map((f) => readMigration(f))
  .join("\n");

// Strip `-- ...` line comments and `/* ... */` block comments so an audit
// query embedded in a comment (e.g. inside 074) does not get mis-parsed as
// a real CREATE TABLE / ALTER TABLE statement.
function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

const allMigrationsCode = stripSqlComments(allMigrationsText);

// Collect every table the migrations create in the public schema. We accept
// both `public.foo` and bare `foo` because migration 019_blog_posts.sql
// uses an unqualified form and the file otherwise operates against public.
function collectCreatedPublicTables(): Set<string> {
  const out = new Set<string>();
  const pattern =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(allMigrationsCode)) !== null) {
    out.add(m[1].toLowerCase());
  }
  return out;
}

const CREATED_TABLES = collectCreatedPublicTables();

// ─────────────────────────────────────────────────────────────────────────
// Invariant 1 — every created table has an ENABLE ROW LEVEL SECURITY
// statement somewhere in the migration history.
// ─────────────────────────────────────────────────────────────────────────

test("every CREATE TABLE in public is matched by ENABLE ROW LEVEL SECURITY", () => {
  assert.ok(
    CREATED_TABLES.size > 0,
    "expected to find at least one CREATE TABLE in supabase/migrations",
  );

  const missing: string[] = [];
  for (const table of CREATED_TABLES) {
    const pattern = new RegExp(
      `alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`,
      "i",
    );
    if (!pattern.test(allMigrationsCode)) {
      missing.push(table);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `tables created without a matching ENABLE ROW LEVEL SECURITY: ${missing.join(", ")}`,
  );
});

// ─────────────────────────────────────────────────────────────────────────
// Invariant 2 — the hardening migration exists and has the expected shape.
// ─────────────────────────────────────────────────────────────────────────

test("074 hardening migration exists with audit queries, drift loop, and final assertion", () => {
  assert.ok(
    migrationFiles.includes(HARDENING_FILE),
    `missing ${HARDENING_FILE}`,
  );

  const hardening = readMigration(HARDENING_FILE);

  // Audit queries are referenced in the comment block.
  assert.match(
    hardening,
    /from\s+pg_tables[\s\S]*?where\s+schemaname\s*=\s*'public'/i,
    "hardening migration should embed the pg_tables audit query",
  );
  assert.match(
    hardening,
    /from\s+pg_policies[\s\S]*?where\s+schemaname\s*=\s*'public'/i,
    "hardening migration should embed the pg_policies audit query",
  );

  // Drift catcher: a DO block that loops pg_class to enable RLS where off.
  assert.match(
    hardening,
    /pg_class[\s\S]*?relrowsecurity\s*=\s*false[\s\S]*?execute\s+format\(\s*'ALTER TABLE[\s\S]*?ENABLE ROW LEVEL SECURITY'/i,
    "hardening migration should contain a drift-catcher DO block",
  );

  // Extension-owned tables must be excluded so we never break PostGIS etc.
  assert.match(
    hardening,
    /pg_depend[\s\S]*?pg_extension/i,
    "drift catcher must exclude extension-owned tables",
  );

  // Final assertion: must RAISE EXCEPTION if any table is still off.
  assert.match(
    hardening,
    /raise\s+exception[\s\S]*?rls/i,
    "hardening migration should RAISE EXCEPTION on leftover RLS-disabled tables",
  );

  // No new permissive USING (true) policies on sensitive tables.
  assert.doesNotMatch(
    hardening,
    /create\s+policy[\s\S]*?on\s+public\.(profiles|teachers|bookings|booking_payments|messages|chats|notifications|credit_transactions|student_private_locations|learner_profiles|teacher_credentials|review_reports)\b[\s\S]*?using\s*\(\s*true\s*\)/i,
    "hardening migration must not add `USING (true)` policies to sensitive tables",
  );

  // No service_role policies (service role bypasses RLS by design; an
  // explicit policy here would be a footgun).
  assert.doesNotMatch(
    hardening,
    /to\s+service_role/i,
    "hardening migration must not create service_role policies",
  );

  // No DISABLE statements anywhere in the file.
  assert.doesNotMatch(
    hardening,
    /disable\s+row\s+level\s+security/i,
    "hardening migration must never disable RLS",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// Invariant 3 — every created table is in an explicit hardening migration's
// ENABLE list, so the explicit list never drifts behind reality.
// ─────────────────────────────────────────────────────────────────────────

test("hardening migrations explicitly enable RLS for every created table", () => {
  const hardening = EXPLICIT_RLS_HARDENING_FILES.map((file) => {
    assert.ok(migrationFiles.includes(file), `missing ${file}`);
    return stripSqlComments(readMigration(file));
  }).join("\n");

  const missing: string[] = [];
  for (const table of CREATED_TABLES) {
    const pattern = new RegExp(
      `alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
      "i",
    );
    if (!pattern.test(hardening)) {
      missing.push(table);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `RLS hardening migrations are missing explicit ENABLE ROW LEVEL SECURITY for: ${missing.join(", ")}`,
  );
});

// ─────────────────────────────────────────────────────────────────────────
// Invariant 4 — the read-only audit helper file exists and stays read-only.
// ─────────────────────────────────────────────────────────────────────────

test("supabase/scripts/rls_audit.sql exists and is read-only", () => {
  const audit = readFileSync(
    join(process.cwd(), "supabase", "scripts", "rls_audit.sql"),
    "utf8",
  ).replace(/\r\n/g, "\n");

  assert.match(audit, /from\s+pg_tables/i, "audit must inspect pg_tables");
  assert.match(audit, /from\s+pg_policies/i, "audit must inspect pg_policies");

  const code = stripSqlComments(audit);
  assert.doesNotMatch(
    code,
    /\b(alter|drop|create|insert|update|delete|truncate|grant|revoke)\b/i,
    "audit helper must contain only read-only SELECT queries",
  );
});

test("086 hardening migration explicitly enables RLS on PostGIS spatial_ref_sys", () => {
  for (const file of POSTGIS_RLS_HARDENING_FILES) {
    assert.ok(migrationFiles.includes(file), `missing ${file}`);
    const sql = stripSqlComments(readMigration(file));
    assert.match(
      sql,
      /alter\s+table\s+if\s+exists\s+public\.spatial_ref_sys\s+enable\s+row\s+level\s+security/i,
      `${file} must enable RLS on public.spatial_ref_sys`,
    );
    assert.match(
      sql,
      /create\s+policy\s+"spatial_ref_sys read"[\s\S]*?on\s+public\.spatial_ref_sys[\s\S]*?for\s+select[\s\S]*?to\s+anon\s*,\s*authenticated/i,
      `${file} must create read-only policy for anon/authenticated`,
    );
    assert.match(
      sql,
      /revoke\s+insert\s*,\s*update\s*,\s*delete\s+on\s+public\.spatial_ref_sys\s+from\s+anon\s*,\s*authenticated/i,
      `${file} must revoke writes from web roles`,
    );
  }
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

console.log(`[security:rlsCoverage] ${passed} tests passed`);
