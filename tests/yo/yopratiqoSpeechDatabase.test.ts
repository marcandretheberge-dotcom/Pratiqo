import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { recordAttempt } from "../../lib/yo/srs/engine";

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, is_anonymous boolean DEFAULT false, deleted_at timestamptz, banned_until timestamptz);
      CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, is_active boolean DEFAULT true, deleted_at timestamptz, deletion_requested_at timestamptz);
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      GRANT USAGE ON SCHEMA public, auth TO service_role;
      GRANT SELECT ON public.profiles TO service_role;`);
    const sql = await readFile("supabase/migrations/20261125020143_yo_speech_bounded_practice.sql", "utf8");
    await db.exec(sql); await db.exec(sql);
    const users = Array.from({ length: 55 }, () => randomUUID());
    for (const id of users) {
      await db.query("INSERT INTO auth.users(id) VALUES ($1)", [id]);
      await db.query("INSERT INTO public.profiles(id) VALUES ($1)", [id]);
    }
    const tables = ["yo_speech_budget", "yo_speech_usage", "yo_error_events", "yo_speech_review_receipts"];
    for (const table of tables) {
      const permissions = await db.query<{ readable: boolean; writable: boolean; rls: boolean }>(`SELECT
        has_table_privilege('anon',$1,'SELECT') OR has_table_privilege('authenticated',$1,'SELECT') AS readable,
        has_table_privilege('authenticated',$1,'INSERT,UPDATE,DELETE') AS writable,
        (SELECT relrowsecurity FROM pg_class WHERE oid = $1::regclass) AS rls`, [`public.${table}`]);
      assert.deepEqual(permissions.rows[0], { readable: false, writable: false, rls: true });
    }
    for (const name of ["yo_speech_account_available(uuid)", "yo_speech_status(uuid)", "yo_speech_reserve(uuid,uuid,text,text,text,boolean)", "yo_speech_finish(uuid,uuid,boolean,bigint,jsonb,boolean)", "yo_speech_review(uuid,uuid,uuid,bigint,jsonb)"]) {
      const result = await db.query<{ forbidden: boolean }>("SELECT has_function_privilege('anon',$1,'EXECUTE') OR has_function_privilege('authenticated',$1,'EXECUTE') AS forbidden", [`public.${name}`]);
      assert.equal(result.rows[0].forbidden, false);
    }
    await db.exec("SET ROLE service_role");
    await assert.rejects(db.exec("SELECT id FROM auth.users"), /permission denied/, "production service role cannot read auth rows directly");
    const call = async (query: string, args: unknown[]) => (await db.query<{ result: string }>(`SELECT ${query} AS result`, args)).rows[0].result;
    const reserve = (user: string, id = randomUUID(), remember = false) => call("public.yo_speech_reserve($1,$2,'it','cafe','yo-voice-2026-11-24',$3)", [user, id, remember]);
    const finish = (user: string, id: string, success = false, correction: unknown = null, cost: number | null = null, block = false) => call("public.yo_speech_finish($1,$2,$3,$4,$5,$6)", [user, id, success, cost, correction, block]);
    const budget = async () => Number((await db.query<{ reserved_micro_usd: number }>("SELECT reserved_micro_usd FROM public.yo_speech_budget")).rows[0].reserved_micro_usd);
    const a = users[0], b = users[1], request = randomUUID();
    assert.deepEqual((await Promise.all([reserve(a, request, true), reserve(a, request, true)])).sort(), ["duplicate", "reserved"]);
    assert.equal(await budget(), 200_000, "a replay cannot reserve twice");
    assert.equal(await reserve(a), "busy", "one active provider turn per account");
    assert.equal(await finish(b, request), "missing", "another account cannot finish or persist a correction");
    const initial = recordAttempt(null, false, false, 1_000);
    const correction = { locale: "fr", target: "Vorrei un caffè.", hint: "Une demande polie.", srs: initial, dueAt: initial.nextReviewAt };
    await assert.rejects(finish(a, request, true, { ...correction, target: "" }, 1_000));
    assert.equal((await db.query<{ state: string }>("SELECT state FROM public.yo_speech_usage WHERE user_id=$1 AND request_id=$2", [a, request])).rows[0].state, "pending", "a failed correction insert rolls back completion");
    assert.equal(await finish(a, request, true, correction, 1_000), "saved");
    assert.equal(await finish(a, request, true, correction, 1_000), "duplicate");
    assert.equal(await budget(), 200_000, "successful cheap turns do not refund the hard reserve");

    const attempt = randomUUID(), next = recordAttempt(initial, true, false, 2_000);
    const review = (user: string, id: string, revision: number, state = next) => call("public.yo_speech_review($1,$2,$3,$4,$5)", [user, request, id, revision, state]);
    assert.equal(await review(b, attempt, 1), "missing");
    assert.equal(await review(a, attempt, 1), "reviewed");
    assert.equal(await review(a, attempt, 1), "duplicate");
    assert.equal(await review(a, randomUUID(), 1), "conflict", "stale browser cannot overwrite a newer SRS schedule");
    const saved = (await db.query<{ srs: typeof next; revision: number }>("SELECT srs,revision FROM public.yo_error_events WHERE user_id=$1", [a])).rows[0];
    assert.deepEqual(saved.srs, next); assert.equal(Number(saved.revision), 2);

    const failed = randomUUID(); assert.equal(await reserve(a, failed), "reserved");
    assert.equal(await finish(a, failed), "finished");
    assert.equal(await budget(), 400_000, "uncertain failures keep their reservation");
    const noSave = randomUUID(); assert.equal(await reserve(a, noSave, false), "reserved");
    assert.equal(await finish(a, noSave, true, correction, 2000), "finished", "the DB enforces the optional consent to save corrections");
    assert.equal(await reserve(a), "rate_limit");
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.yo_speech_usage SET created_at=now()-interval '2 minutes' WHERE user_id=$1", [a]);
    await db.exec("SET ROLE service_role");
    for (let i = 3; i < 10; i++) {
      const id = randomUUID(); assert.equal(await reserve(a, id), "reserved"); await finish(a, id);
      await db.exec("RESET ROLE");
      await db.query("UPDATE public.yo_speech_usage SET created_at=now()-interval '2 minutes' WHERE user_id=$1", [a]);
      await db.exec("SET ROLE service_role");
    }
    assert.equal(await reserve(a), "trial_complete", "DB enforces 300 seconds independently of browser/env");
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.profiles SET is_active=false WHERE id=$1", [users[2]]);
    await db.exec("SET ROLE service_role");
    assert.equal(await reserve(users[2]), "unavailable");

    // Fill to the penultimate global slot, then race two different owners.
    for (let i = 3; i < 42; i++) assert.equal(await reserve(users[i]), "reserved");
    assert.equal(await budget(), 9_800_000);
    assert.deepEqual((await Promise.all([reserve(users[43]), reserve(users[44])])).sort(), ["pilot_complete", "reserved"]);
    assert.equal(await budget(), 10_000_000);
    assert.equal(await reserve(users[45]), "pilot_complete");
    await db.exec("RESET ROLE");
    await db.query("DELETE FROM auth.users WHERE id=$1", [a]);
    await db.exec("SET ROLE service_role");
    assert.equal(await budget(), 10_000_000, "account deletion never replenishes the shared pilot budget");
    assert.equal((await db.query("SELECT * FROM public.yo_error_events WHERE user_id=$1", [a])).rows.length, 0);
    assert.equal(await reserve(users[46]), "pilot_complete");
    await assert.rejects(db.exec("UPDATE public.yo_speech_budget SET cap_micro_usd=10000001"));
    console.log("Speech DB: RLS/service permissions, replay, reservation races, hard $10 cap, trial/rate limits, rollback, opt-in corrections and SRS account isolation passed");
  } finally { await db.close(); }
}
void main();
