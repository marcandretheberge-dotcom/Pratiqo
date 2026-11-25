// In-memory PostgreSQL only. No DATABASE_URL, network or production credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text NOT NULL);
      INSERT INTO profiles VALUES
        ('00000000-0000-4000-8000-000000000001', 'student'),
        ('00000000-0000-4000-8000-000000000002', 'student'),
        ('00000000-0000-4000-8000-000000000003', 'student'),
        ('00000000-0000-4000-8000-000000000004', 'teacher');
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY self_read ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
      GRANT SELECT ON profiles TO authenticated, service_role;
      CREATE TABLE bookings (id integer PRIMARY KEY, status text);
      CREATE TABLE booking_payments (id integer PRIMARY KEY, amount integer);
      INSERT INTO bookings VALUES (1, 'confirmed'); INSERT INTO booking_payments VALUES (1, 3500);
    `);
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/135_student_learning_projects.sql",
        "utf8",
      ),
    );
    const asUser = async (n) =>
      db.exec(
        `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-${String(n).padStart(12, "0")}', false);`,
      );
    const row = async (sql) => (await db.query(sql)).rows[0];
    await asUser(1);
    await db.query(
      "SELECT save_student_learning_project('save','Espagnol','self','in_person','Saint-Georges, QC')",
    );
    const original = await row("SELECT * FROM student_learning_projects");
    await db.query("SELECT save_student_learning_project('dismiss')");
    assert.deepEqual(
      await row("SELECT * FROM student_learning_projects"),
      original,
      "late dismissal preserves completed project",
    );
    await db.query(
      "SELECT save_student_learning_project('save','Piano','child','online','private address')",
    );
    assert.equal(
      (await row("SELECT * FROM student_learning_projects")).city,
      "",
    );
    assert.equal(
      (
        await row(
          "SELECT count(*)::int AS count FROM student_learning_projects",
        )
      ).count,
      1,
    );
    await assert.rejects(
      db.query(
        "SELECT save_student_learning_project('save','','self','online','')",
      ),
    );
    await assert.rejects(
      db.query(
        "SELECT save_student_learning_project('save','Piano','self','in_person','')",
      ),
    );
    await assert.rejects(
      db.query(
        "SELECT save_student_learning_project('save','Piano','other','online','')",
      ),
    );
    await assert.rejects(
      db.query("SELECT student_learning_project_overview()"),
      /permission denied/,
    );
    await asUser(2);
    assert.equal(
      (await db.query("SELECT * FROM student_learning_projects")).rows.length,
      0,
      "cannot read another student",
    );
    await assert.rejects(
      db.query(
        "INSERT INTO student_learning_projects(user_id) VALUES ('00000000-0000-4000-8000-000000000003')",
      ),
      /row-level security/,
    );
    await db.query(
      "UPDATE student_learning_projects SET subject='overwrite' WHERE user_id='00000000-0000-4000-8000-000000000001'",
    );
    await db.query(
      "DELETE FROM student_learning_projects WHERE user_id='00000000-0000-4000-8000-000000000001'",
    );
    await db.query("SELECT save_student_learning_project('dismiss')");
    await asUser(4);
    await assert.rejects(
      db.query(
        "SELECT save_student_learning_project('save','Piano','self','online','')",
      ),
      /row-level security/,
    );
    await db.exec("RESET ROLE; SET ROLE anon;");
    await assert.rejects(
      db.query("SELECT * FROM student_learning_projects"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("SELECT save_student_learning_project('dismiss')"),
      /permission denied/,
    );
    await db.exec("RESET ROLE; SET ROLE service_role;");
    const overview = (
      await row("SELECT student_learning_project_overview() AS data")
    ).data;
    assert.deepEqual(
      [
        overview.totalAccounts,
        overview.declaredAccounts,
        overview.deferredAccounts,
        overview.unansweredAccounts,
      ],
      [3, 1, 1, 1],
    );
    assert.equal(overview.groups[0].subject, "Piano");
    await asUser(2);
    await db.query(
      "SELECT save_student_learning_project('save','Espagnol','self','in_person','Saint-Georges, QC')",
    );
    assert.equal(
      (await row("SELECT dismissed_at FROM student_learning_projects"))
        .dismissed_at,
      null,
    );
    await db.exec("RESET ROLE;");
    assert.deepEqual((await db.query("SELECT * FROM bookings")).rows, [
      { id: 1, status: "confirmed" },
    ]);
    assert.deepEqual((await db.query("SELECT * FROM booking_payments")).rows, [
      { id: 1, amount: 3500 },
    ]);
    await db.exec(
      "BEGIN; UPDATE student_learning_projects SET subject = 'rollback'; ROLLBACK;",
    );
    assert.equal(
      (
        await row(
          "SELECT subject FROM student_learning_projects WHERE user_id='00000000-0000-4000-8000-000000000001'",
        )
      ).subject,
      "Piano",
    );
    console.log(
      "PASS PostgreSQL: owner isolation, anonymous/teacher denial, atomic save/defer, account totals, rollback, booking/payment fixtures preserved",
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
