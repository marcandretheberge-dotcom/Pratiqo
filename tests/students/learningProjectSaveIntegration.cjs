// Real handlers + real PostgreSQL SQL/RLS, synthetic identity only. No network.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");
require("tsx/cjs");
const { NextResponse } = require("next/server");

function loadRoute(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(name => {
    if (name === "next/server") return { NextResponse };
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

(async () => {
  const db = new PGlite();
  const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const result = async (sql, args) => (await db.query(sql, args)).rows;
  let currentId = uid(1), sqlWrites = 0;
  const asUser = async n => {
    currentId = uid(n);
    await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub = '${currentId}';`);
  };
  const asServer = () => db.exec("RESET ROLE; SET ROLE service_role; SET request.jwt.claim.sub = '';");
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: currentId } }, error: null }) },
    from(table) {
      let columns, owner;
      const query = {
        select(value) { columns = value; return query; },
        eq(column, value) {
          assert.equal(column, table === "profiles" ? "id" : "user_id"); owner = value; return query;
        },
        async maybeSingle() {
          assert.ok(["profiles", "student_learning_projects"].includes(table));
          const expected = table === "profiles" ? "role" : "subject,audience,format,city,completed_at,dismissed_at,updated_at";
          assert.equal(columns, expected);
          const rows = await result(`SELECT ${expected} FROM ${table} WHERE ${table === "profiles" ? "id" : "user_id"}=$1`, [owner]);
          return { data: rows[0] ?? null, error: null };
        },
        async single() { return query.maybeSingle(); },
      };
      return query;
    },
    async rpc(name, args) {
      assert.equal(name, "save_student_learning_project_v2");
      sqlWrites++;
      try {
        const rows = await result("SELECT public.save_student_learning_project_v2($1,$2,$3,$4,$5)",
          [args.p_action, args.p_subject ?? "", args.p_audience ?? "self", args.p_format ?? "in_person", args.p_city ?? ""]);
        return { data: rows, error: null };
      } catch (error) { return { data: null, error: { code: error.code } }; }
    },
  };
  const request = body => new Request("https://pratiqo.test/api/student/learning-project", {
    method: body ? "PUT" : "GET", headers: { Authorization: "Bearer synthetic-only", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = { action: "save", subject: "Espagnol", audience: "self", format: "in_person", city: "St-Georges" };
  const savedEnv = { NODE_ENV: process.env.NODE_ENV, VERCEL_ENV: process.env.VERCEL_ENV,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN };
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      CREATE TABLE profiles (id uuid PRIMARY KEY, role text, name text, email text, city text,
        created_at timestamptz DEFAULT now(), is_active boolean DEFAULT true,
        deactivated_at timestamptz, deleted_at timestamptz, anonymized_at timestamptz);
      INSERT INTO profiles(id,role,name,email,city) VALUES
        ('${uid(1)}','student','Élève Alpha','alpha@example.test','Québec'),
        ('${uid(2)}','student','Élève Beta','beta@example.test',NULL),
        ('${uid(3)}','student','Élève Gamma',NULL,'Montréal'),
        ('${uid(4)}','teacher','Professeur',NULL,'Québec');
      INSERT INTO profiles(id,role,name) SELECT
        ('00000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,'student','Élève ' || i
        FROM generate_series(5,30) i;
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY own_profile ON profiles FOR SELECT TO authenticated USING (id=auth.uid());
      GRANT SELECT ON profiles TO authenticated, service_role;
      CREATE TABLE bookings(id integer, status text); INSERT INTO bookings VALUES(1,'confirmed');
      CREATE TABLE booking_payments(id integer, amount integer); INSERT INTO booking_payments VALUES(1,3500);
    `);
    const baseline = await result("SELECT (SELECT jsonb_agg(p) FROM profiles p) AS profiles, (SELECT jsonb_agg(b) FROM bookings b) AS bookings, (SELECT jsonb_agg(p) FROM booking_payments p) AS payments");
    await db.exec(fs.readFileSync("supabase/migrations/135_student_learning_projects.sql", "utf8"));

    process.env.NODE_ENV = "production"; process.env.VERCEL_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
    // Reproduce the exact production failure with the real shared limiter.
    const { rateLimitByIp, rateLimitGuardResponse } = require(path.resolve("lib/rateLimit.ts"));
    const denial = rateLimitGuardResponse(await rateLimitByIp(request(payload), "student-learning-project", {
      limit: 30, windowSeconds: 60, identifier: currentId,
    }));
    assert.equal(denial.status, 503);
    assert.equal(sqlWrites, 0);
    const route = loadRoute("app/api/student/learning-project/route.ts", {
      "@/lib/auth/supabaseRouteClient": { getSupabaseForRequest: async () => client },
      "@/lib/studentLearningProject": require(path.resolve("lib/studentLearningProject.ts")),
    });
    await asUser(1);
    assert.equal((await route.PUT(request(payload))).status, 503, "before 136 the versioned RPC fails closed");
    await db.exec("RESET ROLE; SET request.jwt.claim.sub = '';");
    await db.exec(fs.readFileSync("supabase/migrations/136_learning_project_save_and_directory.sql", "utf8"));
    await asUser(1);
    const save = await route.PUT(request(payload));
    assert.equal(save.status, 200, "production-mode save succeeds with no Redis");
    assert.equal((await save.json()).project.city, "St-Georges");
    const reload = await route.GET(request());
    assert.equal((await reload.json()).project.subject, "Espagnol");
    const first = await result("SELECT * FROM student_learning_projects");
    await route.PUT(request({ action: "dismiss" }));
    assert.deepEqual(await result("SELECT * FROM student_learning_projects"), first, "late dismissal preserves the project");
    await assert.rejects(result("SELECT * FROM student_learning_project_write_limits"), /permission denied/);
    await assert.rejects(result("DELETE FROM student_learning_project_write_limits"), /permission denied/);
    await assert.rejects(result("SELECT admin_student_learning_project_directory()"), /permission denied/);
    // Counter only counts the final upsert result, not both INSERT and UPDATE.
    await db.exec("RESET ROLE;");
    assert.equal((await result("SELECT write_count FROM student_learning_project_write_limits"))[0].write_count, 2);
    await db.exec(`UPDATE student_learning_project_write_limits SET write_count=29,
      window_start=date_trunc('minute',statement_timestamp()) WHERE user_id='${uid(1)}';`);
    await asUser(1);
    assert.equal((await route.PUT(request(payload))).status, 200);
    const exhausted = await route.PUT(request({ ...payload, subject: "Blocked change" }));
    assert.equal(exhausted.status, 429);
    assert.equal(exhausted.headers.get("Retry-After"), "60");
    assert.equal((await result("SELECT subject FROM student_learning_projects"))[0].subject, "Espagnol");
    await assert.rejects(result("SELECT save_student_learning_project('dismiss')"), error => error.code === "PT429");
    await assert.rejects(result("UPDATE student_learning_projects SET subject='Direct bypass'"), error => error.code === "PT429");
    await db.exec("BEGIN; DELETE FROM student_learning_projects;");
    await assert.rejects(result("INSERT INTO student_learning_projects(user_id) VALUES(auth.uid())"), error => error.code === "PT429");
    await db.exec("ROLLBACK;");
    await db.exec("RESET ROLE;");
    assert.equal((await result("SELECT write_count FROM student_learning_project_write_limits"))[0].write_count, 30);
    await db.exec("UPDATE student_learning_project_write_limits SET window_start=statement_timestamp()-interval '2 minutes'");
    await asUser(1);
    assert.equal((await route.PUT(request(payload))).status, 200, "new minute restores the quota");
    await asUser(2);
    assert.equal((await route.GET(request())).status, 200);
    assert.equal((await result("SELECT * FROM student_learning_projects")).length, 0, "other student cannot read the answer");
    assert.equal((await route.PUT(request({ action: "dismiss" }))).status, 200);
    await asUser(4);
    assert.equal((await route.PUT(request(payload))).status, 403);
    await assert.rejects(result("SELECT save_student_learning_project_v2('save','Piano','self','online','')"), /row-level security/);
    await assert.rejects(result("SELECT admin_student_learning_project_directory()"), /permission denied/);
    await db.exec("RESET ROLE; SET ROLE anon; SET request.jwt.claim.sub = '';");
    await assert.rejects(result("SELECT save_student_learning_project_v2('dismiss')"), /permission denied/);
    await assert.rejects(result("SELECT admin_student_learning_project_directory()"), /permission denied/);
    await asServer();
    const directory = async (query="",status="all",page=1) =>
      (await result("SELECT admin_student_learning_project_directory($1,$2,$3) AS data", [query,status,page]))[0].data;
    const page1 = await directory();
    assert.equal(page1.total, 29);
    assert.equal(page1.students.length, 25);
    const page2 = await directory("","all",2);
    assert.equal(page2.students.length, 4);
    assert.equal(new Set([...page1.students,...page2.students].map(row=>row.id)).size, 29);
    const declared = await directory("St-Georges","declared");
    assert.equal(declared.total, 1);
    assert.equal(declared.students[0].profile_city, "Québec");
    assert.equal(declared.students[0].project_city, "St-Georges");
    assert.equal(declared.students[0].subject, "Espagnol");
    assert.equal((await directory("","deferred")).total, 1);
    assert.equal((await directory("","unanswered")).total, 27);
    assert.equal((await directory("%,),name.eq.anything")).total, 0, "search input is literal SQL data");
    assert.equal((await directory("alpha@example.test")).total, 1);
    assert.equal((await directory("","all",100)).students.length, 0);
    await assert.rejects(directory("","invalid"), error=>error.code === "22023");
    await assert.rejects(directory("","all",0), error=>error.code === "22023");
    await db.exec("RESET ROLE; SET request.jwt.claim.sub='';");
    assert.deepEqual(await result("SELECT (SELECT jsonb_agg(p) FROM profiles p) AS profiles, (SELECT jsonb_agg(b) FROM bookings b) AS bookings, (SELECT jsonb_agg(p) FROM booking_payments p) AS payments"), baseline);
    const counters = await result("SELECT * FROM student_learning_project_write_limits ORDER BY user_id");
    await asUser(1);
    await db.exec("BEGIN;");
    await result("SELECT save_student_learning_project_v2('save','Rollback','self','online','')");
    await db.exec("ROLLBACK; RESET ROLE; SET request.jwt.claim.sub='';");
    assert.deepEqual(await result("SELECT * FROM student_learning_project_write_limits ORDER BY user_id"), counters);
    assert.equal((await result("SELECT subject FROM student_learning_projects WHERE completed_at IS NOT NULL"))[0].subject, "Espagnol");
    await db.exec(`BEGIN; DELETE FROM profiles WHERE id='${uid(1)}';`);
    assert.equal((await result("SELECT * FROM student_learning_projects WHERE user_id=$1", [uid(1)])).length, 0);
    assert.equal((await result("SELECT * FROM student_learning_project_write_limits WHERE user_id=$1", [uid(1)])).length, 0);
    await db.exec("ROLLBACK;");
    console.log("PASS real handler + SQL: production missing-Redis regression, save/readback, quota/reset/rollback, direct-write protection, owner RLS, private directory search/filter/pagination, existing data preserved");
  } finally {
    for (const [key,value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key]=value; }
    await db.close();
  }
})().catch(error => { console.error(error); process.exitCode=1; });
