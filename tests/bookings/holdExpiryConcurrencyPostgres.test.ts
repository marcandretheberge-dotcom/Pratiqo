import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expireStalePlannedPackageHolds } from "@/lib/offers/plannedPackageHoldQueries";

// Opt-in integration test: a disposable local database ONLY, never linked Supabase.
const url = process.env.SEO_LOCAL_PG_URL;
if (!url) throw Error("SEO_LOCAL_PG_URL required for isolated PostgreSQL concurrency test");
const parsed = new URL(url);
assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname));
assert.equal(parsed.pathname, "/pratiqo_seo_test");
const run = promisify(execFile);
const psql = process.env.PSQL_PATH ?? "psql";
const schema = `seo_expiry_${process.pid}`;
async function sql(statement: string) {
  const { stdout } = await run(psql, [url!, "-X", "-qAt", "--no-password", "-v", "ON_ERROR_STOP=1", "-c", statement]);
  return stdout.replace(/\r\n/g, "\n").trim();
}
const literal = (value: unknown) => `'${String(value).replaceAll("'", "''")}'`;
const ident = (name: string) => { assert.match(name, /^[a-z_]+$/); return `"${name}"`; };
// Execute the actual expiration helper against PostgreSQL; only its small
// Supabase query-builder surface is adapted, not its business predicates.
const admin = { from(table: string) {
  assert.ok(["planned_package_pending_orders", "planned_package_session_holds"].includes(table));
  let patch: Record<string, unknown> = {};
  const filters: string[] = [];
  const query = {
    update(value: Record<string, unknown>) { patch = value; return query; },
    select() { return query; },
    eq(key: string, value: unknown) { filters.push(`${ident(key)} = ${literal(value)}`); return query; },
    lte(key: string, value: unknown) { filters.push(`${ident(key)} <= ${literal(value)}`); return query; },
    in(key: string, values: unknown[]) { filters.push(`${ident(key)} IN (${values.map(literal).join(",")})`); return query; },
    async then(resolve: (result: unknown) => unknown) {
      const result = await sql(`WITH changed AS (UPDATE ${schema}.${table} SET ${Object.entries(patch).map(([k, v]) => `${ident(k)} = ${literal(v)}`).join(",")} WHERE ${filters.join(" AND ")} RETURNING id) SELECT COALESCE(json_agg(changed), '[]') FROM changed`);
      return resolve({ data: JSON.parse(result), error: null });
    },
  };
  return query;
} } as unknown as SupabaseClient;

async function main() {
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  const now = new Date("2026-10-12T12:00:00Z");
  await sql(`CREATE SCHEMA ${schema};
    CREATE TABLE ${schema}.planned_package_pending_orders(id text PRIMARY KEY, status text, hold_expires_at timestamptz);
    CREATE TABLE ${schema}.planned_package_session_holds(id text PRIMARY KEY, pending_order_id text, status text, expires_at timestamptz);
    INSERT INTO ${schema}.planned_package_pending_orders VALUES
      ('valid','pending_payment','2026-10-12T12:15:00Z'), ('old','pending_payment','2026-10-12T11:59:00Z'), ('paid','payment_confirmed','2026-10-12T11:59:00Z');
    INSERT INTO ${schema}.planned_package_session_holds SELECT id,id,'active',hold_expires_at FROM ${schema}.planned_package_pending_orders;`);
  try {
    const claim = (id: string) => sql(`BEGIN;
      UPDATE ${schema}.planned_package_pending_orders SET status='payment_confirmed'
      WHERE id=${literal(id)} AND status='pending_payment' AND hold_expires_at > '${now.toISOString()}';
      SELECT pg_sleep(0.1); COMMIT;`);
    await Promise.all([
      claim("valid"), claim("old"),
      expireStalePlannedPackageHolds(admin, now),
      expireStalePlannedPackageHolds(admin, now),
    ]);
    const state = await sql(`SELECT id||':'||status FROM ${schema}.planned_package_pending_orders ORDER BY id`);
    assert.equal(state, "old:expired\npaid:payment_confirmed\nvalid:payment_confirmed");
    assert.equal(await sql(`SELECT id||':'||status FROM ${schema}.planned_package_session_holds ORDER BY id`), "old:expired\npaid:active\nvalid:active");
    await expireStalePlannedPackageHolds(admin, now);
    assert.equal(await sql(`SELECT id||':'||status FROM ${schema}.planned_package_pending_orders ORDER BY id`), state);
    console.log("PASS actual expiry helper: concurrent valid/expired claims, confirmed protection, duplicate expiry, PostgreSQL row locks");
  } finally {
    // Only this test's private schema in the explicitly isolated local database.
    await sql(`DROP SCHEMA ${schema} CASCADE`);
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "concurrency_test_failed"); process.exitCode = 1; });
