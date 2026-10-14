import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
const url = process.env.LEARNER_LOCAL_PG_URL;
if (!url) throw Error("Local test PostgreSQL URL required");
const parsed = new URL(url);
assert.ok(["localhost", "127.0.0.1"].includes(parsed.hostname));
assert.equal(parsed.port, "55439"); assert.equal(parsed.pathname, "/postgres");
const db = `pratiqo_facts_${process.pid}`;
const target = new URL(url); target.pathname = `/${db}`;
const run = promisify(execFile);
async function sql(query: string, connection = target.toString()) {
  return (await run(process.env.PSQL_PATH ?? "psql", [connection, "-X", "-qAt", "-w", "-v", "ON_ERROR_STOP=1", "-c", query])).stdout.trim();
}
async function main() {
  await sql(`CREATE DATABASE ${db}`, url);
  try {
    await sql(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE bookings(id uuid PRIMARY KEY, student_id uuid, status text, completion_outcome text, completed_at timestamptz DEFAULT now());
      CREATE TABLE booking_payments(booking_id uuid PRIMARY KEY, payment_status text, refunded_cents integer, paid_at timestamptz DEFAULT now());
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');`);
    await sql(readFileSync("supabase/migrations/089_learner_demand_funnel.sql", "utf8"));
    await sql(readFileSync("supabase/migrations/129_learner_demand_consent.sql", "utf8"));
    await sql(readFileSync("supabase/migrations/131_learner_funnel_measurement.sql", "utf8"));
    await sql(`INSERT INTO bookings VALUES ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','confirmed',null);
      INSERT INTO booking_payments VALUES ('22222222-2222-4222-8222-222222222222','unpaid',0)`);
    await Promise.all([
      sql("BEGIN; UPDATE bookings SET status='completed',completion_outcome='held'; SELECT pg_sleep(0.1); COMMIT"),
      sql("UPDATE booking_payments SET payment_status='paid'"),
    ]);
    await sql("UPDATE booking_payments SET payment_status='paid'; UPDATE bookings SET status='completed'");
    assert.equal(await sql("SELECT count(*) FROM learner_funnel_facts WHERE event_name='booking_confirmed'"), "1");
    assert.equal(await sql("SELECT count(*) FROM learner_funnel_facts WHERE event_name='lesson_completed_paid'"), "1");
    await sql("UPDATE booking_payments SET payment_status='disputed'");
    assert.equal(await sql("SELECT count(*) FROM learner_funnel_facts WHERE event_name='booking_disputed'"), "1");
    assert.equal(await sql("SELECT count(*) FROM learner_funnel_facts WHERE event_name='booking_refunded'"), "0");
    await sql("UPDATE booking_payments SET payment_status='partially_refunded',refunded_cents=100");
    assert.equal(await sql("SELECT count(*) FROM learner_funnel_facts WHERE event_name='booking_refunded'"), "1");
    const insert = `INSERT INTO learner_demand_leads(email,email_normalized,subject,subject_normalized,city,city_normalized,alert_consent_at,adult_contact_confirmed)
      VALUES ('fixture@example.test','fixture@example.test','Piano','piano','Quebec','quebec',now(),true)
      ON CONFLICT (email_normalized,subject_normalized,city_normalized,accepts_online,requested_format) DO UPDATE SET updated_at=now()`;
    await Promise.all([sql(insert), sql(insert)]);
    assert.equal(await sql("SELECT count(*) FROM learner_funnel_facts WHERE event_name='waitlist_submitted'"), "1");
    await sql("INSERT INTO learner_waitlist_booking_links SELECT id,'22222222-2222-4222-8222-222222222222' FROM learner_demand_leads ON CONFLICT DO NOTHING");
    assert.equal(await sql("SELECT qualified_requests || ':' || requests_with_completed_paid_lesson FROM learner_waitlist_conversion_totals"),'1:0');
    await sql("UPDATE booking_payments SET payment_status='paid',refunded_cents=0");
    assert.equal(await sql("SELECT qualified_requests || ':' || requests_with_completed_paid_lesson FROM learner_waitlist_conversion_totals"),'1:1');
    assert.equal(await sql("SELECT count(*) FROM learner_first_paid_lessons"),'1');
    await sql("INSERT INTO bookings VALUES('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','completed','held','2020-01-01'); INSERT INTO booking_payments VALUES('44444444-4444-4444-8444-444444444444','paid',0,'2020-01-01')");
    assert.equal(await sql("SELECT first_paid_lesson_at::date FROM learner_first_paid_lessons"),'2020-01-01');
    for (const role of ["anon", "authenticated"]) {
      await assert.rejects(sql(`SET ROLE ${role}; SELECT * FROM learner_funnel_totals`));
      await assert.rejects(sql(`SET ROLE ${role}; SELECT * FROM learner_waitlist_conversion_totals`));
      await assert.rejects(sql(`SET ROLE ${role}; SELECT * FROM learner_first_paid_lessons`));
      assert.equal(await sql(`SELECT has_table_privilege('${role}','learner_funnel_facts','INSERT,UPDATE,DELETE')`), "f");
    }
    assert.doesNotMatch(await sql("SELECT string_agg(column_name,',') FROM information_schema.columns WHERE table_name='learner_funnel_facts'"), /email|name(?!$)|address|body/);
    console.log("PASS durable lifecycle facts: concurrent completion/payment, retries, refunds distinct, waitlist dedup, private grants");
  } finally { await sql(`DROP DATABASE ${db}`, url); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "facts_test_failed"); process.exitCode = 1; });
