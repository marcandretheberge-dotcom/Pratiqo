import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
const url = new URL(process.env.LEARNER_LOCAL_PG_URL ?? "");
assert.ok(["localhost","127.0.0.1"].includes(url.hostname));
assert.equal(url.port,"55439"); assert.equal(url.pathname,"/postgres");
const db = `claims_${process.pid}`; const target = new URL(url); target.pathname=`/${db}`;
const run=promisify(execFile);
async function sql(query:string, connection=target.toString()) {
  return (await run(process.env.PSQL_PATH ?? "psql",[connection,"-X","-qAt","-w","-v","ON_ERROR_STOP=1","-c",query])).stdout.trim();
}
const order="11111111-1111-4111-8111-111111111111";
const hold="22222222-2222-4222-8222-222222222222";
const book="33333333-3333-4333-8333-333333333333";
const addHold=`INSERT INTO planned_package_session_holds VALUES('${hold}','${order}','teacher',1,'2026-11-02 14:00Z','2026-11-02 15:00Z','active',now()+interval '1 hour')`;
const addBooking=(conversion=false)=>`INSERT INTO bookings VALUES('${book}','teacher','2026-11-02','9h30',60,'confirmed',${conversion ? `'${order}',1` : 'null,null'})`;
async function main(){
 await sql(`CREATE DATABASE ${db}`,url.toString());
 try {
  await sql(`CREATE TABLE teachers(id text PRIMARY KEY,timezone text,booking_buffer_before_minutes integer,booking_buffer_after_minutes integer);
    INSERT INTO teachers VALUES('teacher','America/Toronto',0,0);
    CREATE TABLE bookings(id uuid PRIMARY KEY,teacher_id text,slot_date date,time_slot text,duration_minutes integer,status text,planned_package_order_id uuid,planned_package_session_index integer);
    CREATE TABLE planned_package_pending_orders(id uuid PRIMARY KEY,status text,hold_expires_at timestamptz);
    CREATE TABLE planned_package_session_holds(id uuid PRIMARY KEY,pending_order_id uuid,teacher_id text,session_index integer,starts_at timestamptz,ends_at timestamptz,status text,expires_at timestamptz);
    INSERT INTO planned_package_pending_orders VALUES('${order}','pending_payment',now()+interval '1 hour')`);
  for(const migration of ['130_booking_interval_exclusion','132_shared_teacher_slot_claims']) await sql(readFileSync(`supabase/migrations/${migration}.sql`,'utf8'));
  for(const isolation of ['READ COMMITTED','REPEATABLE READ']) {
    await sql('DELETE FROM bookings; DELETE FROM planned_package_session_holds');
    const results=await Promise.allSettled([sql(`BEGIN ISOLATION LEVEL ${isolation}; ${addHold}; SELECT pg_sleep(0.1); COMMIT`),sql(`BEGIN ISOLATION LEVEL ${isolation}; ${addBooking()}; COMMIT`)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(await sql('SELECT count(*) FROM teacher_slot_claims'),'1');
  }
  await sql('DELETE FROM bookings; DELETE FROM planned_package_session_holds');
  await sql(addHold);
  await sql(`UPDATE planned_package_pending_orders SET status='payment_confirmed'; UPDATE planned_package_session_holds SET expires_at=now()-interval '1 minute'`);
  await assert.rejects(sql(addBooking())); // Paid holds never silently expire.
  await sql(`BEGIN; ${addBooking(true).replace("'9h30'","'9h00'")}; UPDATE planned_package_session_holds SET status='converted'; UPDATE planned_package_pending_orders SET status='fulfilled'; COMMIT`);
  assert.equal(await sql("SELECT source_kind FROM teacher_slot_claims"),'booking');
  await sql('DELETE FROM bookings; DELETE FROM planned_package_session_holds');
  await sql(`UPDATE planned_package_pending_orders SET status='pending_payment',hold_expires_at=now()+interval '1 hour'; ${addHold}; UPDATE planned_package_pending_orders SET hold_expires_at=now()-interval '1 second'`);
  await sql(addBooking());
  assert.equal(await sql('SELECT count(*) FROM teacher_slot_claims'),'1');
  await assert.rejects(sql("UPDATE planned_package_pending_orders SET status='payment_confirmed'"));
  assert.equal(await sql('SELECT status FROM planned_package_pending_orders'),'pending_payment');
  await sql('DELETE FROM planned_package_session_holds');
  await sql("UPDATE teachers SET booking_buffer_before_minutes=10; UPDATE planned_package_pending_orders SET hold_expires_at=now()+interval '1 hour'");
  await assert.rejects(sql(addHold.replace('14:00Z','15:35Z').replace('15:00Z','16:35Z')));
  for(const role of ['anon','authenticated']) await assert.rejects(sql(`SET ROLE ${role}; SELECT * FROM teacher_slot_claims`));
  // Exercise the repository's real fulfillment function, not a replacement.
  await sql(`DELETE FROM bookings; DELETE FROM planned_package_session_holds;
    UPDATE teachers SET booking_buffer_before_minutes=0;
    ALTER TABLE bookings ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE bookings ADD COLUMN student_id uuid, ADD COLUMN date text, ADD COLUMN time text,
      ADD COLUMN teaching_mode text, ADD COLUMN lesson_type text, ADD COLUMN price numeric,
      ADD COLUMN teacher_offer_id uuid, ADD COLUMN teacher_offer_title_snapshot text,
      ADD COLUMN teacher_offer_type_snapshot text, ADD COLUMN teacher_offer_format_snapshot text,
      ADD COLUMN teacher_offer_price_cents_snapshot integer, ADD COLUMN teacher_offer_currency_snapshot text,
      ADD COLUMN teacher_offer_duration_minutes_snapshot integer, ADD COLUMN teacher_offer_session_count_snapshot integer,
      ADD COLUMN teacher_offer_snapshot_version integer, ADD COLUMN booking_payment_source text, ADD COLUMN booking_source text;
    ALTER TABLE planned_package_pending_orders ADD COLUMN student_id uuid, ADD COLUMN teacher_id text,
      ADD COLUMN teacher_offer_id uuid, ADD COLUMN session_count integer, ADD COLUMN duration_minutes integer,
      ADD COLUMN price_cents_snapshot integer, ADD COLUMN currency_snapshot text, ADD COLUMN title_snapshot text,
      ADD COLUMN payment_confirmed_at timestamptz, ADD COLUMN payment_reference text,
      ADD COLUMN fulfillment_error text, ADD COLUMN fulfillment_idempotency_key text,
      ADD COLUMN fulfilled_at timestamptz, ADD COLUMN updated_at timestamptz;
    ALTER TABLE planned_package_session_holds ADD COLUMN updated_at timestamptz;
    UPDATE planned_package_pending_orders SET status='pending_payment',hold_expires_at=now()+interval '1 hour',
      student_id='${book}',teacher_id='teacher',teacher_offer_id='${book}',session_count=2,duration_minutes=60,
      price_cents_snapshot=4500,currency_snapshot='CAD',title_snapshot='Fixture',payment_confirmed_at=now();
    ${addHold};
    INSERT INTO planned_package_session_holds(id,pending_order_id,teacher_id,session_index,starts_at,ends_at,status,expires_at)
      VALUES('44444444-4444-4444-8444-444444444444','${order}','teacher',2,'2026-11-02 15:00Z','2026-11-02 16:00Z','active',now()+interval '1 hour');
    UPDATE planned_package_pending_orders SET status='payment_confirmed'`);
  const fulfillment=readFileSync('supabase/migrations/116_planned_package_fulfillment_engine.sql','utf8');
  await sql(fulfillment.slice(fulfillment.indexOf('CREATE OR REPLACE FUNCTION public.fulfill_planned_package_order(')));
  await sql(readFileSync('supabase/migrations/133_package_fulfillment_slot_date_cast.sql','utf8'));
  const call=`SELECT public.fulfill_planned_package_order('${order}','fixture-reference','fixture-idempotency',
    '[{"session_index":1,"slot_date":"2026-11-02","time_slot":"9h00","price_cents":2250,"duration_minutes":60},
      {"session_index":2,"slot_date":"2026-11-02","time_slot":"10h00","price_cents":2250,"duration_minutes":60}]'::jsonb)`;
  const fulfilled=JSON.parse(await sql(call));assert.equal(fulfilled.ok,true,JSON.stringify(fulfilled));
  assert.equal(JSON.parse(await sql(call)).idempotent,true);
  assert.equal(await sql('SELECT count(*) FROM bookings'),'2');
  console.log('PASS cross-table concurrency at two isolation levels, paid hold retention, atomic conversion, expiry, private grants');
 } finally { await sql(`DROP DATABASE ${db}`,url.toString()); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
