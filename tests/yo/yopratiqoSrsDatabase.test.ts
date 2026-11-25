import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = "supabase/migrations/20261124155352_yo_srs_server_state.sql";
async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
    `);
    const sql = await readFile(migration, "utf8");
    await db.exec(sql);
    await db.exec(sql);
    const dailySql = await readFile("supabase/migrations/20261124200500_yo_daily_loop.sql", "utf8");
    await db.exec(dailySql);
    await db.exec(dailySql);
    const user = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    await db.query("INSERT INTO auth.users VALUES ($1), ($2)", [user, other]);
    const privileges = await db.query<{can_write:boolean; can_read:boolean; can_call:boolean}>(
      `SELECT has_table_privilege('authenticated', 'public.yo_learning_events', 'INSERT') AS can_write,
        has_table_privilege('anon', 'public.yo_srs_items', 'SELECT') AS can_read,
        has_function_privilege('authenticated', 'public.yo_srs_commit_attempt(uuid,uuid,uuid,jsonb,jsonb)', 'EXECUTE') AS can_call`);
    assert.deepEqual(privileges.rows, [{ can_write: false, can_read: false, can_call: false }]);
    const dailyPrivileges = await db.query<{ allowed: boolean }>(
      `SELECT has_function_privilege('authenticated', 'public.yo_daily_read(uuid,text)', 'EXECUTE') OR
        has_function_privilege('anon', 'public.yo_daily_award(uuid,text,date,text,text,text)', 'EXECUTE') OR
        has_table_privilege('authenticated', 'public.yo_daily_artifacts', 'SELECT') OR
        has_table_privilege('authenticated', 'public.yo_daily_preferences', 'UPDATE') AS allowed`,
    );
    assert.equal(dailyPrivileges.rows[0].allowed, false);
    await db.exec("SET ROLE service_role");
    const attempt = "00000000-0000-4000-8000-000000000003";
    const item = {item_id:"lesson", language:"it",course_id:"italian-course-a1",attempts:1,streak:1, completed:true, independent:true,last_at:100,next_review_at:86400100};
    const events = [{event_type:"srs_practice",xp:5}];
    const record = async (id:string, revision:string|null, state=item, xp=events) => (await db.query<{status:string}>(
      "SELECT public.yo_srs_commit_attempt($1,$2,$3,$4,$5) AS status", [user,id,revision,JSON.stringify(state),JSON.stringify(xp)])).rows[0].status;
    const imports = async (u:string, rows:object[]) => (await db.query<{count:number}>(
      "SELECT public.yo_srs_import_records($1,$2,$3) AS count", [u,JSON.stringify(rows),0])).rows[0].count;
    assert.equal(await imports(user, []), 0);
    assert.equal(await record(attempt,null), "recorded");
    assert.equal(await record(attempt,null), "duplicate");
    assert.equal(await record(other,null), "conflict");
    assert.equal(await imports(user,[{...item,attempts:9}]), 0);
    assert.equal(await imports(user,[item]), -1);
    const state = async () => (await db.query<{revision:string; attempts:number}>("SELECT revision, attempts FROM public.yo_srs_items WHERE user_id = $1", [user])).rows[0];
    const before = await state();
    assert.equal(before.attempts, 1, "server wins ties");
    await assert.rejects(record(other,before.revision,{...item,attempts:2},[{event_type:"srs_practice",xp:-1}]));
    assert.deepEqual(await state(), before, "state and XP roll back together");
    assert.equal(await record(other,before.revision,{...item,attempts:2}), "recorded");
    assert.equal((await state()).attempts, 2);
    assert.equal(await imports(other,[item]), 1);
    assert.equal((await db.query("SELECT id FROM public.yo_learning_events WHERE user_id = $1",[user])).rows.length, 2);
    const today = async (id: string, tz = "America/Toronto") => (await db.query<{
      summary: { today: string; exercises: number; xpToday: number; goal: number | null; completed: Record<string,string>; earned: string[] };
    }>("SELECT public.yo_daily_read($1,$2) AS summary", [id,tz])).rows[0].summary;
    const owner = await today(user);
    assert.deepEqual(owner, { today: owner.today, exercises: 1, xpToday: 10, goal: null, completed: {}, earned: [] });
    const untouched = await today(other);
    assert.deepEqual(untouched, { today: untouched.today, exercises: 0, xpToday: 0, goal: null, completed: {}, earned: [] });
    assert.deepEqual(await today(user, "invalid"), owner);

    const award = async (day: string, kind = "mission", item = "daily-mission-it-u01", artifact: string | null = "artifact-it-u01") =>
      (await db.query<{ status: string }>("SELECT public.yo_daily_award($1,$2,$3,$4,$5,$6) AS status",
        [user,"America/Toronto",day,kind,item,artifact])).rows[0].status;
    assert.equal(await award("2000-01-01"), "expired");
    await assert.rejects(award(owner.today, "trivia", "test", "artifact-it-u02"));

    // Inject a database constraint fault on the final write: the receipt
    // and XP must roll back too so the same claim can be retried honestly.
    await db.exec("RESET ROLE; ALTER TABLE public.yo_daily_artifacts ADD CONSTRAINT simulated_fault CHECK (artifact_id <> 'artifact-it-u01'); SET ROLE service_role");
    await assert.rejects(award(owner.today));
    assert.deepEqual(await today(user), owner);
    await db.exec("RESET ROLE; ALTER TABLE public.yo_daily_artifacts DROP CONSTRAINT simulated_fault; SET ROLE service_role");

    assert.deepEqual((await Promise.all([award(owner.today), award(owner.today)])).sort(), ["awarded", "duplicate"]);
    assert.equal(await award(owner.today, "trivia", "test", null), "awarded");
    assert.equal(await award(owner.today, "trivia", "test", null), "duplicate");
    await db.query("SELECT public.yo_daily_set_goal($1,$2,$3)", [user,"Pacific/Auckland",5]);
    assert.deepEqual(await today(user, "Pacific/Auckland"), { today: owner.today, exercises: 1, xpToday: 60, goal: 5,
      completed: { mission: "daily-mission-it-u01", trivia: "test" }, earned: ["artifact-it-u01"] });
    const zone = await db.query<{ zone: string }>("SELECT public.yo_daily_zone($1,$2) AS zone", [user,"Pacific/Auckland"]);
    assert.equal(zone.rows[0].zone, "America/Toronto");
    await db.query("SELECT public.yo_daily_set_goal($1,$2,NULL)", [user,"America/Toronto"]);
    assert.equal((await today(user)).goal, null);
    assert.deepEqual(await today(other), untouched);
    console.log("SRS and daily transactions, reward replays, rollback and account isolation passed");

  } finally {
    await db.close();
  }
}
void main();
