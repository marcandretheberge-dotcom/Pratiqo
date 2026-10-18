// Isolated PostgreSQL container only. No network connection strings or secrets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const snapshot = require('./fixtures/learning-project-schema.json');
const migration = fs.readFileSync('supabase/migrations/136_learning_project_save_and_directory.sql','utf8');
const container = process.env.TEST_POSTGRES_CONTAINER;
assert.match(container || '', /^[a-f0-9]{12,64}$/, 'Requires an explicitly selected local test container');
function start() {
  const proc = spawn('docker',['exec','-i',container,'psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose']);
  let out='', err='';
  proc.stdout.on('data', x=>out+=x); proc.stderr.on('data',x=>err+=x);
  const done = new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('close',code=>resolve({code,out,err}));});
  return {proc,done,out:()=>out};
}
async function sql(query, fails=false) {
  const p=start(); p.proc.stdin.end(query+'\n'); const r=await p.done;
  if(!fails)assert.equal(r.code,0,r.err); return r;
}
const ident=x=>'"'+x.replaceAll('"','""')+'"';
(async()=>{
  assert.equal(snapshot.rows,0);
  await sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE profiles (id uuid PRIMARY KEY,role text,name text,email text,city text,created_at timestamptz DEFAULT now(),is_active boolean DEFAULT true,deactivated_at timestamptz,deleted_at timestamptz,anonymized_at timestamptz);
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_profile ON profiles FOR SELECT TO authenticated USING(id=auth.uid());
    GRANT SELECT ON profiles TO authenticated,service_role;`);
  const columns=snapshot.columns.map(c=>ident(c.name)+' '+c.type+(c.default?' DEFAULT '+c.default:'')+(c.notnull?' NOT NULL':''));
  const constraints=snapshot.constraints.map(c=>'CONSTRAINT '+ident(c.name)+' '+c.ddl);
  await sql('CREATE TABLE student_learning_projects('+[...columns,...constraints].join(',')+'); ALTER TABLE student_learning_projects ENABLE ROW LEVEL SECURITY; REVOKE ALL ON student_learning_projects FROM PUBLIC,anon,authenticated;');
  for(const g of snapshot.grants)await sql('GRANT '+g.privilege_type+' ON student_learning_projects TO '+ident(g.grantee)+';');
  for(const p of snapshot.policies)await sql('CREATE POLICY '+ident(p.policyname)+' ON student_learning_projects AS '+p.permissive+' FOR '+p.cmd+' TO '+p.roles.map(ident).join(',')+' USING ('+p.qual+') WITH CHECK ('+p.with_check+');');
  for(const f of snapshot.functions)await sql(f.ddl);
  await sql('REVOKE ALL ON FUNCTION save_student_learning_project(text,text,text,text,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION save_student_learning_project(text,text,text,text,text) TO authenticated,service_role;');
  assert.equal((await sql("SELECT pg_get_functiondef('save_student_learning_project(text,text,text,text,text)'::regprocedure);")).out.trim(),snapshot.functions[0].ddl.trim());
  const rollback=await sql('BEGIN;'+migration+'SELECT 1/0;COMMIT;',true);
  assert.notEqual(rollback.code,0); assert.match(rollback.err,/22012/);
  assert.equal((await sql("SELECT to_regclass('student_learning_project_write_limits') IS NULL;")).out.trim(),'t');
  await sql('BEGIN; SET LOCAL lock_timeout=\'2s\';'+migration+'COMMIT;');
  const id='00000000-0000-4000-8000-000000000136';
  await sql(`INSERT INTO profiles(id,role,name,city) VALUES('${id}','student','Synthetic 136','Québec');
    INSERT INTO student_learning_projects(user_id,subject,city,completed_at) VALUES('${id}','Espagnol','St-Georges',now());
    INSERT INTO student_learning_project_write_limits VALUES('${id}',date_trunc('minute',now())+interval '1 minute',29);`);
  const login=`SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',true);`;
  const a=start();
  a.proc.stdin.write("BEGIN;"+login+"SELECT save_student_learning_project_v2('save','Espagnol A','self','in_person','St-Georges'); SELECT 'A_LOCK_HELD';\n");
  for(let i=0;i<100&&!a.out().includes('A_LOCK_HELD');i++)await new Promise(r=>setTimeout(r,30));
  assert.ok(a.out().includes('A_LOCK_HELD'));
  const b=start(); b.proc.stdin.end("BEGIN; SET application_name='quota136_b';"+login+"SELECT save_student_learning_project_v2('save','Espagnol B','self','in_person','St-Georges'); COMMIT;\n");
  let blocked=false;
  for(let i=0;i<20;i++){
    const r=await sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='quota136_b' AND wait_event_type='Lock';");
    if(r.out.trim()==='1'){blocked=true;break;}
    await new Promise(r=>setTimeout(r,50));
  }
  a.proc.stdin.end('COMMIT;\n');
  const [ar,br]=await Promise.all([a.done,b.done]);
  assert.equal(blocked,true);assert.equal(ar.code,0,ar.err);assert.notEqual(br.code,0);assert.match(br.err,/PT429/);
  assert.equal((await sql('SELECT write_count FROM student_learning_project_write_limits;')).out.trim(),'30');
  assert.equal((await sql('SELECT subject FROM student_learning_projects;')).out.trim(),'Espagnol A');
  for(const query of ['SELECT * FROM student_learning_project_write_limits;','SELECT admin_student_learning_project_directory();']){
    const r=await sql('BEGIN;'+login+query,true);assert.notEqual(r.code,0);assert.match(r.err,/42501/);
  }
  const directory=await sql("SET ROLE service_role; SELECT admin_student_learning_project_directory();");
  const d=JSON.parse(directory.out.trim().split('\n').at(-1));
  assert.equal(d.total,1);assert.equal(d.students[0].profile_city,'Québec');assert.equal(d.students[0].project_city,'St-Georges');
  console.log('PASS: PostgreSQL17.6 affected-schema restore, DDL rollback, two-session final quota slot, private permissions and distinct cities.');
  console.log('Scope: real project schema and save function, synthetic profiles. Not a full production backup restore.');
})().catch(e=>{console.error(e);process.exitCode=1});
