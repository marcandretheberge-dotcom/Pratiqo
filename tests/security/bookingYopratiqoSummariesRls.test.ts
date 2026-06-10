/**
 * RLS source-scan for the booking-time YoPratiqo teacher-bridge consent
 * table introduced by migration 077.
 *
 * This is a no-DB-required check (mirrors `tests/security/rlsPolicyShape.test.ts`)
 * that locks in the exact policy shape we want for
 * `public.booking_yopratiqo_learning_summaries`. A future migration that
 * accidentally widens any of these policies will trip this test in CI
 * before it can ship.
 *
 * Invariants
 * ----------
 *   1. RLS is ENABLED on the new table.
 *   2. SELECT is restricted to either the booking's student or the
 *      booking's teacher (joined through `public.teachers`).
 *   3. INSERT is restricted to the booking's student AND the linked
 *      booking must belong to the same student. No teacher INSERT path.
 *   4. UPDATE / DELETE are student-only.
 *   5. There is NO SECURITY DEFINER function anywhere in the migration.
 *   6. The `anon` role has zero access (REVOKE ALL).
 *   7. The 074 hardening migration explicitly lists the new table so the
 *      drift catcher in `tests/security/rlsCoverage.test.ts` never silently
 *      regresses.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

const migration = read("supabase/migrations/077_booking_yopratiqo_learning_summaries.sql");
const hardening = read("supabase/migrations/074_enable_rls_security_hardening.sql");

test("new table has RLS enabled", () => {
  assert.match(
    migration,
    /ALTER\s+TABLE\s+public\.booking_yopratiqo_learning_summaries\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
  );
});

test("SELECT policy is restricted to the booking's student or teacher", () => {
  const selectPolicy = migration.match(
    /CREATE POLICY\s+"byls_select_participants"[\s\S]*?USING\s*\(([\s\S]*?)\);/i,
  )?.[1];
  assert.ok(selectPolicy, "byls_select_participants policy missing");
  assert.match(selectPolicy!, /student_id\s*=\s*auth\.uid\(\)/);
  assert.match(selectPolicy!, /FROM\s+public\.teachers\s+t/i);
  assert.match(selectPolicy!, /t\.id\s*=\s*teacher_id\s+AND\s+t\.user_id\s*=\s*auth\.uid\(\)/);
});

test("INSERT policy is student-only and requires booking ownership", () => {
  const insertPolicy = migration.match(
    /CREATE POLICY\s+"byls_insert_student_own"[\s\S]*?WITH\s+CHECK\s*\(([\s\S]*?)\);/i,
  )?.[1];
  assert.ok(insertPolicy, "byls_insert_student_own policy missing");
  assert.match(insertPolicy!, /student_id\s*=\s*auth\.uid\(\)/);
  assert.match(insertPolicy!, /FROM\s+public\.bookings\s+b/i);
  assert.match(insertPolicy!, /b\.id\s*=\s*booking_id\s+AND\s+b\.student_id\s*=\s*auth\.uid\(\)/);
  // Critical: no teacher can INSERT via this policy.
  assert.doesNotMatch(insertPolicy!, /FROM\s+public\.teachers/i);
});

test("UPDATE policy is student-only with matching WITH CHECK", () => {
  const updatePolicy = migration.match(
    /CREATE POLICY\s+"byls_update_student_own"[\s\S]*?WITH\s+CHECK\s*\(\s*student_id\s*=\s*auth\.uid\(\)\s*\)\s*;/i,
  );
  assert.ok(updatePolicy, "byls_update_student_own policy missing or wrong shape");
  // USING clause must also be student-only.
  const updateUsing = migration.match(
    /CREATE POLICY\s+"byls_update_student_own"[\s\S]*?USING\s*\(\s*student_id\s*=\s*auth\.uid\(\)\s*\)/i,
  );
  assert.ok(updateUsing, "byls_update_student_own USING clause must be student-only");
});

test("DELETE policy is student-only", () => {
  assert.match(
    migration,
    /CREATE POLICY\s+"byls_delete_student_own"\s+ON\s+public\.booking_yopratiqo_learning_summaries\s+FOR\s+DELETE\s+TO\s+authenticated\s+USING\s*\(\s*student_id\s*=\s*auth\.uid\(\)\s*\)/i,
  );
});

test("no SECURITY DEFINER function exists in the bridge migration", () => {
  assert.doesNotMatch(migration, /SECURITY\s+DEFINER/i);
});

test("anon role has no access to the consent table", () => {
  assert.match(
    migration,
    /REVOKE\s+ALL\s+ON\s+public\.booking_yopratiqo_learning_summaries\s+FROM\s+anon/i,
  );
  // Authenticated grants are present (the policies handle row-level
  // restriction, the grants just open the table to the role).
  assert.match(
    migration,
    /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.booking_yopratiqo_learning_summaries\s+TO\s+authenticated/i,
  );
});

test("074 hardening migration explicitly enables RLS on the new table", () => {
  assert.match(
    hardening,
    /ALTER\s+TABLE\s+IF\s+EXISTS\s+public\.booking_yopratiqo_learning_summaries\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
  );
});

console.log("[security:bookingYopratiqoSummariesRls] tests passed");
