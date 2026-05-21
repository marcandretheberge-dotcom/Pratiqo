import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/065_rls_p0_policy_hardening.sql"),
  "utf8",
);

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("drops risky booking update/delete policies", () => {
  assert.match(migration, /DROP POLICY IF EXISTS "bookings_update_participants"/);
  assert.match(migration, /DROP POLICY IF EXISTS "bookings_delete_participants"/);
  assert.doesNotMatch(migration, /CREATE POLICY "bookings_update_participants"/);
  assert.doesNotMatch(migration, /CREATE POLICY "bookings_delete_participants"/);
});

test("keeps booking insert limited to student pending_payment rows", () => {
  assert.match(migration, /CREATE POLICY "bookings_insert_participants"/);
  const insertPolicy = migration.match(
    /CREATE POLICY "bookings_insert_participants"[\s\S]*?;\n\n-- ---------------------------------------------------------------------------/,
  )?.[0] ?? "";
  assert.match(insertPolicy, /student_id = auth\.uid\(\)/);
  assert.match(insertPolicy, /status = 'pending_payment'/);
  assert.doesNotMatch(insertPolicy, /OR EXISTS\s*\(\s*SELECT 1\s+FROM public\.teachers/i);
});

test("drops risky chat write policies", () => {
  assert.match(migration, /DROP POLICY IF EXISTS "chats_insert_participant"/);
  assert.match(migration, /DROP POLICY IF EXISTS "chats_update_participant"/);
  assert.doesNotMatch(migration, /CREATE POLICY "chats_insert_participant"/);
  assert.doesNotMatch(migration, /CREATE POLICY "chats_update_participant"/);
});

test("removes client credit transaction insert policy", () => {
  assert.match(migration, /DROP POLICY IF EXISTS "Service role writes credit transactions"/);
  assert.doesNotMatch(migration, /CREATE POLICY "Service role writes credit transactions"/);
  assert.match(migration, /FOR SELECT\s+TO authenticated\s+USING \(auth\.uid\(\) = user_id\)/);
});

test("profiles sensitive-field trigger exists and service role bypass is narrow", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.profiles_preserve_sensitive_client_fields/);
  assert.match(migration, /jwt_role = 'service_role'/);
  assert.match(migration, /NEW\.role := OLD\.role/);
  assert.match(migration, /NEW\.credit_balance := OLD\.credit_balance/);
  assert.match(migration, /NEW\.stripe_customer_id := OLD\.stripe_customer_id/);
  assert.match(migration, /NEW\.teacher_onboarding_complete := OLD\.teacher_onboarding_complete/);
});

console.log("[security:rlsPolicyShape] 5 tests passed");
