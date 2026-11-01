import { fileURLToPath } from "node:url";
// Real PostgreSQL execution in PGlite; synthetic records only, no network clients.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const migrationName = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .find(n => n.endsWith('_restrict_admin_student_credit_rpc_execution.sql'));
assert.ok(migrationName);
const migration = read('supabase/migrations/' + migrationName);
const db = new PGlite();
const student = '10000000-0000-4000-8000-000000000001';
const actor = '10000000-0000-4000-8000-000000000002';
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log('PASS ' + name); }
async function snapshot() {
  return (await db.query(`SELECT json_build_object(
    'profiles',(SELECT json_agg(p ORDER BY id) FROM profiles p),
    'credits',(SELECT json_agg(c ORDER BY id) FROM student_credits c),
    'ledger',(SELECT json_agg(l ORDER BY id) FROM student_credit_ledger l),
    'transactions',(SELECT json_agg(t ORDER BY id) FROM credit_transactions t),
    'audit',(SELECT json_agg(a ORDER BY id) FROM admin_audit_log a)) AS data`)).rows[0].data;
}
const acl = async () => (await db.query(`SELECT proname, proacl::text, md5(pg_get_functiondef(oid)) AS definition
 FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('admin_grant_student_credit','admin_void_student_credit','untouched_rpc') ORDER BY proname`)).rows;
const nullCalls = [
  "SELECT public.admin_grant_student_credit(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)",
  "SELECT public.admin_void_student_credit(NULL,NULL,NULL,NULL)"
];
async function denied(role, query, code) {
  await db.exec('SET ROLE ' + role);
  try { await assert.rejects(db.query(query), e => e.code === code); }
  finally { await db.exec('RESET ROLE'); }
}
(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text, credit_balance numeric DEFAULT 0, updated_at timestamptz);
    CREATE TABLE public.credit_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, amount numeric,
      type text, description text, reference_id text, status text, expires_at timestamptz, created_at timestamptz);
    CREATE FUNCTION public.untouched_rpc() RETURNS int LANGUAGE sql AS 'SELECT 1';
    INSERT INTO profiles(id,role) VALUES ('${student}','student'), ('${actor}','admin');`);
  await db.exec(read('supabase/migrations/087_admin_promotions_student_credits.sql'));
  await db.exec(read('supabase/migrations/088_admin_student_credits_spendable.sql'));
  await check('reproduces explicit anon/authenticated grants surviving migration 088', async () => {
    for (const role of ['anon','authenticated']) for (const call of nullCalls) await denied(role, call, 'P0001');
  });
  const beforeAcl = await acl();
  const beforeData = await snapshot();
  await check('transaction rollback restores every ACL', async () => {
    await db.exec('BEGIN'); await db.exec(migration); await db.exec('ROLLBACK');
    assert.deepEqual(await acl(), beforeAcl);
  });
  await db.exec('BEGIN'); await db.exec(migration); await db.exec('COMMIT');
  await check('only target ACLs change; definitions and unrelated ACL unchanged', async () => {
    const after = await acl();
    assert.deepEqual(after.map(r => r.definition), beforeAcl.map(r => r.definition));
    assert.deepEqual(after.find(r => r.proname === 'untouched_rpc'), beforeAcl.find(r => r.proname === 'untouched_rpc'));
    assert.deepEqual(await snapshot(), beforeData);
  });
  await check('anonymous and authenticated calls denied before function execution', async () => {
    for (const role of ['anon','authenticated']) for (const call of nullCalls) await denied(role, call, '42501');
  });
  await check('forged admin JWT claims do not restore direct RPC access', async () => {
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({role:'authenticated',sub:actor,user_metadata:{role:'admin'}})]);
    for (const call of nullCalls) await denied('authenticated', call, '42501');
  });
  await check('service role grant and unused-credit void remain functional', async () => {
    await db.exec('SET ROLE service_role');
    const granted = (await db.query(`SELECT public.admin_grant_student_credit($1,2500,'CAD','support_compensation','Synthetic local test',NULL,$2,'synthetic@example.invalid') AS credit`, [student,actor])).rows[0].credit;
    assert.equal(granted.new_credit_balance,25);
    const voided = (await db.query("SELECT public.admin_void_student_credit($1,'Synthetic local reversal',$2,'synthetic@example.invalid') AS credit", [granted.id,actor])).rows[0].credit;
    assert.equal(voided.new_credit_balance,0);
    assert.equal(voided.status,'voided');
    await db.exec('RESET ROLE');
  });
  await check('migration is idempotent', async () => {
    const before = await acl(); const data = await snapshot();
    await db.exec('BEGIN'); await db.exec(migration); await db.exec('COMMIT');
    assert.deepEqual(await acl(), before); assert.deepEqual(await snapshot(), data);
  });
  console.log(checks + ' checks passed');
})().catch(e => { console.error(e); process.exitCode=1; }).finally(() => db.close());

