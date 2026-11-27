/**
 * Source-scan for migration 134: YoPratiqo tables are server-only for writes.
 *
 * Invariants
 * ----------
 *   1. Learner INSERT/UPDATE policies on both YoPratiqo tables are dropped and
 *      never re-created; INSERT/UPDATE grants to `authenticated` are revoked.
 *   2. Owner SELECT/DELETE remain (not dropped by 134).
 *   3. The bridge SELECT policy binds the row's teacher_id to the teacher on
 *      the linked booking, with table-qualified outer columns.
 *   4. Summary jsonb is bounded (object + size cap).
 *   5. No SECURITY DEFINER, no anon grants, no DISABLE RLS, no touches to
 *      payment tables.
 *   6. No app code writes either table with a user-scoped client — every
 *      write goes through a service-role route that sanitizes first.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
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

const MIGRATION = "supabase/migrations/134_yopratiqo_server_only_writes.sql";
const migration = read(MIGRATION);
// Negative checks run on executable SQL only, so explanatory comments can
// name the things the migration deliberately avoids.
const sqlOnly = migration.replace(/--.*$/gm, "");
const BRIDGE = "public\\.booking_yopratiqo_learning_summaries";
const SNAP = "public\\.yopratiqo_progress_snapshots";

test("learner INSERT/UPDATE policies are dropped on both tables", () => {
  for (const [policy, table] of [
    ["byls_insert_student_own", BRIDGE],
    ["byls_update_student_own", BRIDGE],
    ["ypps_insert_owner", SNAP],
    ["ypps_update_owner", SNAP],
  ] as const) {
    assert.match(
      migration,
      new RegExp(`DROP POLICY IF EXISTS "${policy}"\\s+ON\\s+${table}`, "i"),
      `${policy} must be dropped`,
    );
    assert.doesNotMatch(
      migration,
      new RegExp(`CREATE POLICY\\s+"${policy}"`, "i"),
      `${policy} must not be re-created`,
    );
  }
  assert.doesNotMatch(migration, /CREATE POLICY[^;]*FOR\s+(INSERT|UPDATE|ALL)/i);
});

test("INSERT/UPDATE grants are revoked from authenticated on both tables", () => {
  assert.match(migration, new RegExp(`REVOKE INSERT, UPDATE ON ${BRIDGE} FROM authenticated`, "i"));
  assert.match(migration, new RegExp(`REVOKE INSERT, UPDATE ON ${SNAP} FROM authenticated`, "i"));
});

test("owner SELECT and DELETE paths are kept", () => {
  for (const policy of ["byls_delete_student_own", "ypps_select_owner", "ypps_delete_owner"]) {
    assert.doesNotMatch(migration, new RegExp(`DROP POLICY IF EXISTS "${policy}"`, "i"));
  }
  assert.doesNotMatch(migration, /REVOKE[^;]*(SELECT|DELETE)[^;]*FROM authenticated/i);
});

test("bridge SELECT binds teacher_id to the booking's teacher", () => {
  const select = migration.match(
    /CREATE POLICY\s+"byls_select_participants"[\s\S]*?FOR SELECT TO authenticated\s+USING\s*\(([\s\S]*?)\n\s*\);/i,
  )?.[1];
  assert.ok(select, "byls_select_participants must be re-created");
  assert.match(select!, /booking_yopratiqo_learning_summaries\.student_id\s*=\s*auth\.uid\(\)/);
  assert.match(select!, /FROM public\.bookings b\s+JOIN public\.teachers t ON t\.id = b\.teacher_id/);
  assert.match(select!, /b\.id = booking_yopratiqo_learning_summaries\.booking_id/);
  assert.match(select!, /b\.teacher_id = booking_yopratiqo_learning_summaries\.teacher_id/);
  assert.match(select!, /t\.user_id = auth\.uid\(\)/);
});

test("summary jsonb is bounded", () => {
  assert.match(migration, /jsonb_typeof\(summary\) = 'object'/);
  assert.match(migration, /pg_column_size\(summary\) <= 8192/);
});

test("no privilege widening or unrelated table changes", () => {
  assert.doesNotMatch(sqlOnly, /SECURITY\s+DEFINER/i);
  assert.doesNotMatch(sqlOnly, /DISABLE ROW LEVEL SECURITY/i);
  assert.doesNotMatch(sqlOnly, /\bGRANT\b/i);
  assert.doesNotMatch(sqlOnly, /\banon\b/i);
  assert.doesNotMatch(
    sqlOnly,
    /(ALTER TABLE|UPDATE|DELETE FROM|INSERT INTO)\s+public\.(bookings|booking_payments|teachers|profiles)\b/i,
  );
});

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(relative(root, full).replace(/\\/g, "/"));
  }
}

test("app code writes YoPratiqo tables only from service-role routes", () => {
  const files: string[] = [];
  for (const dir of ["app", "components", "lib", "hooks"]) walk(join(root, dir), files);
  const allowedWriters = new Set([
    "app/api/yo/progress/route.ts",
    "app/api/bookings/[id]/yopratiqo-bridge/route.ts",
  ]);
  const writePattern =
    /\.from\(\s*["'](?:booking_yopratiqo_learning_summaries|yopratiqo_progress_snapshots)["']\s*\)\s*\.(?:insert|upsert|update)\(/;
  const offenders = files.filter((f) => !allowedWriters.has(f) && writePattern.test(read(f)));
  assert.deepEqual(offenders, []);
  for (const f of allowedWriters) {
    assert.match(read(f), /getSupabaseAdmin\(\)/, `${f} must write via the service-role client`);
  }
});
