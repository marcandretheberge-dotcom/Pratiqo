// Integration test against an explicitly isolated, restored local container only.
const {spawn,spawnSync}=require('node:child_process');
const {readFileSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {build}=require('../../scripts/prepare_teaching_zones_install.cjs');
const container=process.env.ZONES_TEST_CONTAINER;
if(!container)throw Error('ZONES_TEST_CONTAINER required; no production connection supported');
assert.equal(spawnSync('docker',['inspect',container,'--format','{{.HostConfig.NetworkMode}} {{json .HostConfig.PortBindings}}'],{encoding:'utf8'}).stdout.trim(),'none {}');
const database='zones_fixed_'+Date.now();
const root=path.resolve(__dirname,'../..');
const evidence={database,production:false,checks:[]};
function sql(q,db=database){return new Promise((resolve,reject)=>{const p=spawn('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1']);let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('close',code=>code?reject(Error(err)):resolve(out.trim()));p.on('error',reject);p.stdin.end(q);});}
const zone=n=>`INSERT INTO public.teacher_teaching_zones(teacher_id,label_public,city) VALUES('hardening-fixture','Zone ${n}','Fixture');`;
const owner="SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);";
const rpc=zones=>`SELECT count(*) FROM public.replace_teacher_teaching_zones('hardening-fixture','${JSON.stringify(zones)}'::jsonb);`;
const item=n=>({label_public:'Zone '+n,city:'Fixture',is_active:true,is_primary:false});
async function main(){
 await sql(`CREATE DATABASE ${database} TEMPLATE backup_atomic_success;`,'postgres');
 const fingerprint=`SELECT md5(jsonb_build_object('t',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM teachers t),'b',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM bookings t),'p',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM booking_payments t),'c',(SELECT jsonb_agg(to_jsonb(t) ORDER BY source_kind,source_id) FROM teacher_slot_claims t))::text);`;
 const before=await sql(fingerprint);
 await assert.rejects(sql(build().replace("NOTIFY pgrst,'reload schema'; COMMIT;",'SELECT 1/0; COMMIT;')),/division by zero/);
 assert.equal(await sql("SELECT to_regclass('teacher_teaching_zones') IS NULL;"),'t');
 await sql(build());assert.equal(await sql(fingerprint),before);
 assert.equal(await sql('SELECT count(*) FROM teacher_teaching_zones;'),'0');
 assert.equal(await sql("SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('128','129','130','131','132','133','134');"),'7');
 evidence.checks.push('Fresh128+134 atomic install/rollback; existing sources and129-133 preserved; zero unverified backfill');
 for(const role of ['anon','authenticated']){
  await assert.rejects(sql(`BEGIN; SET LOCAL ROLE ${role}; ${rpc([])} COMMIT;`),/permission denied/);
 }
 evidence.checks.push('Actual anon/authenticated RPC execution denied');
 await sql(`INSERT INTO auth.users(id) VALUES('44444444-4444-4444-8444-444444444444'); INSERT INTO teachers(id,user_id,name,discipline,category,price_per_lesson,image_url,teaching_mode) VALUES('hardening-fixture','44444444-4444-4444-8444-444444444444','Synthetic','French','language',60,'https://example.invalid/image','online');`);
 await sql(`BEGIN; ${owner} ${zone('own')} COMMIT;`);
 await assert.rejects(sql(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true); ${zone('foreign')} COMMIT;`),/row-level security/);
 await sql(`BEGIN; SET LOCAL ROLE service_role; ${rpc([{...item('inactive'),is_active:false,is_primary:true}])} COMMIT;`);
 assert.equal(await sql("SELECT is_active=false AND is_primary=false AND active_slot IS NULL FROM teacher_teaching_zones WHERE teacher_id='hardening-fixture';"),'t');
 evidence.checks.push('Own row allowed/foreign denied; service RPC allowed; inactive remains inactive and non-primary');
 for(const isolation of ['READ COMMITTED','REPEATABLE READ']){
  await sql(rpc([item('one'),item('two')]));
  const results=await Promise.allSettled([sql(`BEGIN ISOLATION LEVEL ${isolation}; ${owner} ${zone('A')} SELECT pg_sleep(0.7); COMMIT;`),sql(`BEGIN ISOLATION LEVEL ${isolation}; ${owner} SELECT pg_sleep(0.15); ${zone('B')} COMMIT;`)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.match(results.find(r=>r.status==='rejected').reason.message,/unique constraint|serialization|max_active_exceeded/);
  assert.equal(await sql("SELECT count(*) FROM teacher_teaching_zones WHERE teacher_id='hardening-fixture' AND is_active;"),'3');
  await assert.rejects(sql(zone('four')),/max_active_exceeded/);
  evidence.checks.push('Concurrent owner INSERT limit under '+isolation);
  await sql(rpc([item('base')]));
  const repl=await Promise.allSettled([sql(`BEGIN ISOLATION LEVEL ${isolation}; SET LOCAL ROLE service_role; ${rpc([item('left')])} SELECT pg_sleep(0.5); COMMIT;`),sql(`BEGIN ISOLATION LEVEL ${isolation}; SET LOCAL ROLE service_role; ${rpc([item('right')])} COMMIT;`)]);
  assert.ok(repl.some(r=>r.status==='fulfilled'));
  assert.equal(await sql("SELECT count(*) FROM teacher_teaching_zones WHERE teacher_id='hardening-fixture';"),'1');
  evidence.checks.push('Concurrent replacement has one complete final set under '+isolation);
 }
 await sql(rpc([{...item('off'),is_active:false},item('on1'),item('on2')]));
 await sql(zone('on3'));
 await assert.rejects(sql("UPDATE teacher_teaching_zones SET is_active=true WHERE teacher_id='hardening-fixture' AND label_public='Zone off';"),/max_active_exceeded/);
 try { await sql("UPDATE teacher_teaching_zones SET active_slot=99 WHERE teacher_id='hardening-fixture';"); }
 catch (error) { assert.match(error.message,/unique constraint|check constraint/); }
 // Normalizing the forged slot is also safe, but the invariant must always hold.
 assert.equal(await sql("SELECT count(*) FROM teacher_teaching_zones WHERE active_slot NOT BETWEEN 1 AND 3;"),'0');
 evidence.checks.push('Inactive activation cannot exceed limit; forged capacity normalized/rejected');
 const upgrade=database+'_upgrade';await sql(`CREATE DATABASE ${upgrade} TEMPLATE backup_atomic_success;`,'postgres');
 await sql('BEGIN;'+readFileSync(path.join(root,'supabase/migrations/128_teacher_teaching_zones.sql'),'utf8')+'COMMIT;',upgrade);
 const old=await sql("SELECT md5(jsonb_agg(to_jsonb(z) ORDER BY id)::text) FROM teacher_teaching_zones z;",upgrade);
 await sql(readFileSync(path.join(root,'supabase/migrations/134_harden_teacher_teaching_zones.sql'),'utf8'),upgrade);
 assert.equal(await sql("SELECT md5(jsonb_agg(to_jsonb(z)-'active_slot' ORDER BY id)::text) FROM teacher_teaching_zones z;",upgrade),old);
 evidence.checks.push('Existing128 upgrade preserves all existing zone fields/timestamps; legacy provenance still requires review');
 evidence.result='PASS';
}
main().catch(e=>{evidence.result='FAIL';evidence.error=e.message;process.exitCode=1;}).finally(()=>{if(process.env.ZONES_TEST_EVIDENCE)writeFileSync(process.env.ZONES_TEST_EVIDENCE,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));});
