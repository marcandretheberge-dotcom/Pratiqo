import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";

const adminUrl = process.env.LEARNER_LOCAL_PG_URL;
if (!adminUrl) throw Error("LEARNER_LOCAL_PG_URL required; disposable local PostgreSQL only");
const url = new URL(adminUrl);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
assert.equal(url.port, "55439");
assert.equal(url.pathname, "/postgres");
const run = promisify(execFile);
const binary = process.env.PSQL_PATH ?? "psql";
const database = `pratiqo_learner_test_${process.pid}`;
const dbUrl = new URL(adminUrl); dbUrl.pathname = `/${database}`;
async function sql(text: string, target = dbUrl.toString()) {
  const { stdout } = await run(binary, [target, "-X", "-qAt", "-w", "-v", "ON_ERROR_STOP=1", "-c", text]);
  return stdout.trim();
}
const upsert = (format = "in_person", availability = "any") => `INSERT INTO public.learner_demand_leads
  (email,email_normalized,subject,subject_normalized,city,city_normalized,accepts_online,requested_format,
   availability_preference,discipline_id,alert_consent_at,adult_contact_confirmed)
  VALUES ('adult@example.test','adult@example.test','Francais','francais','Saint-Georges','saint-georges',false,
    '${format}','${availability}','francais',now(),true)
  ON CONFLICT (email_normalized,subject_normalized,city_normalized,accepts_online,requested_format)
  DO UPDATE SET availability_preference=excluded.availability_preference,status='open',alert_consent_at=excluded.alert_consent_at;`;
async function main() {
  await sql(`CREATE DATABASE ${database}`, adminUrl);
  try {
    await sql(`DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
    END $$;`);
    await sql(readFileSync("supabase/migrations/089_learner_demand_funnel.sql", "utf8"));
    // Historical rows must not acquire fictitious consent during migration.
    await sql(`INSERT INTO public.learner_demand_leads(email,email_normalized,subject,subject_normalized,city,city_normalized)
      VALUES ('legacy@example.test','legacy@example.test','Piano','piano','Quebec','quebec')`);
    await sql(readFileSync("supabase/migrations/129_learner_demand_consent.sql", "utf8"));
    assert.equal(await sql("SELECT count(*) FROM learner_demand_leads WHERE alert_consent_at IS NOT NULL"), "0");
    await Promise.all(Array.from({length: 6}, () => sql(upsert())));
    assert.equal(await sql("SELECT count(*) FROM learner_demand_leads WHERE discipline_id='francais'"), "1");
    await sql(upsert("online"));
    assert.equal(await sql("SELECT count(*) FROM learner_demand_leads WHERE discipline_id='francais'"), "2");
    await sql(upsert("in_person", "weekend"));
    assert.equal(await sql("SELECT availability_preference FROM learner_demand_leads WHERE requested_format='in_person' AND discipline_id='francais'"), "weekend");
    await sql("UPDATE learner_demand_leads SET status='closed' WHERE discipline_id='francais'");
    await Promise.all([sql(upsert()), sql(upsert())]);
    assert.equal(await sql("SELECT count(*) FROM learner_demand_leads WHERE status='closed' AND discipline_id='francais'"), "2");
    assert.equal(await sql("SELECT availability_preference FROM learner_demand_leads WHERE requested_format='in_person' AND discipline_id='francais'"), "weekend");
    assert.equal(await sql("SELECT count(*) FROM learner_unmet_demand_summary"), "0");
    for (const role of ["anon", "authenticated"]) {
      assert.equal(await sql(`SELECT has_table_privilege('${role}','learner_demand_leads','SELECT,INSERT,UPDATE,DELETE')`), "f");
      assert.equal(await sql(`SELECT has_table_privilege('${role}','learner_unmet_demand_summary','SELECT')`), "f");
      await assert.rejects(sql(`SET ROLE ${role}; SELECT * FROM learner_demand_leads`));
    }
    const columns = await sql("SELECT string_agg(column_name,',') FROM information_schema.columns WHERE table_name='learner_unmet_demand_summary'");
    assert.doesNotMatch(columns, /email|name|user_id/);
    assert.equal(await sql("SELECT relrowsecurity FROM pg_class WHERE oid='public.learner_demand_leads'::regclass"), "t");
    console.log("PASS actual migrations 089/129: historical consent, concurrent dedup, formats, preference update, withdrawal immutability, RLS/grants, aggregate privacy");
  } finally {
    await sql(`DROP DATABASE ${database}`, adminUrl);
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "local_postgres_test_failed"); process.exitCode = 1; });
