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
    const user = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    await db.query("INSERT INTO auth.users VALUES ($1), ($2)", [user, other]);
    const privileges = await db.query<{can_write:boolean; can_read:boolean; can_call:boolean}>(
      `SELECT has_table_privilege('authenticated', 'public.yo_learning_events', 'INSERT') AS can_write,
        has_table_privilege('anon', 'public.yo_srs_items', 'SELECT') AS can_read,
        has_function_privilege('authenticated', 'public.yo_srs_commit_attempt(uuid,uuid,uuid,jsonb,jsonb)', 'EXECUTE') AS can_call`);
    assert.deepEqual(privileges.rows, [{ can_write: false, can_read: false, can_call: false }]);
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
  } finally {
    await db.close();
  }
}
void main();
