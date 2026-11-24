import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const host = "11111111-1111-4111-8111-111111111111";
const learner = "22222222-2222-4222-8222-222222222222";
const visitor = "33333333-3333-4333-8333-333333333333";
const session = "44444444-4444-4444-8444-444444444444";
const cancelled = "55555555-5555-4555-8555-555555555555";
async function as(role, user, callback) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  await db.exec("set role " + role);
  try { await callback(); } finally { await db.exec("reset role"); }
}
const migration = path => readFile(new URL("../../supabase/migrations/" + path, import.meta.url), "utf8");
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    create table public.teachers(id text primary key,user_id uuid, name text, image_url text, bio text);
    create view public.teachers_public as select id,name,image_url,bio from public.teachers;
    grant select on public.teachers,public.teachers_public to anon,authenticated,service_role;
  `);
  await db.exec(await migration("007_group_sessions.sql"));
  await db.exec("grant all on public.group_sessions,public.group_registrations to anon,authenticated,service_role");
  await db.query("insert into auth.users values ($1),($2),($3)", [host, learner, visitor]);
  await db.query("insert into public.teachers(id,user_id,name) values ('teacher', $1, 'Teacher')", [host]);
  await db.query(`insert into public.group_sessions(id,teacher_id,title,discipline,price_per_person,date,time,status,location,online_link)
    values ($1,'teacher','Class','music',40,'2026-12-01','10:00','open','Private venue','private-room'),
           ($2,'teacher','Cancelled','music',40,'2026-12-01','11:00','cancelled','Private venue','private-room')`, [session,cancelled]);
  await db.query(`insert into public.group_registrations(session_id,student_id,stripe_payment_intent_id,price_paid)
    values ($1,$3,'test-payment',40),($2,$3,'another-payment',40)`, [session,cancelled,learner]);
  await db.exec(await migration("20261124132614_group_session_listing_access.sql"));
  for (const role of ["anon", "authenticated"]) {
    const { rows: [rights] } = await db.query(`select
      has_column_privilege($1,'public.group_sessions','online_link','select') as link,
      has_column_privilege($1,'public.group_sessions','location','select') as venue,
      has_table_privilege($1,'public.group_registrations','insert,update,delete,truncate') as registration_writes`, [role]);
    assert.deepEqual(rights,{link:false, venue:false, registration_writes:false});
  }
  await as("anon", null, async () => {
    const { rows } = await db.query("select * from public.group_sessions_public");
    assert.deepEqual(rows.map(s => s.id),[session]);
    assert.equal(rows[0].online_link, undefined);
    assert.equal(rows[0].location, undefined);
    assert.equal(rows[0].teachers.name,"Teacher");
  });
  const details = async () => (await db.query("select * from public.group_session_join_details($1::uuid[])", [[session,cancelled]])).rows;
  await as("authenticated", visitor, async () => assert.equal((await details()).length,0));
  await as("authenticated", learner, async () => {
    assert.deepEqual((await details()).map(s => s.id),[session]);
    assert.equal((await db.query("select id from public.group_sessions")).rows.length,2);
  });
  await as("authenticated", host, async () => {
    assert.equal((await details()).length,2);
    assert.equal((await db.query("select id from public.group_registrations")).rows.length,2);
  });
  await db.query("update public.group_registrations set status='cancelled' where session_id=$1",[session]);
  await as("authenticated", learner, async () => assert.equal((await details()).length,0));
  console.log("Group session projections, registration ownership, host access and cancellation passed.");
} finally { await db.close(); }
