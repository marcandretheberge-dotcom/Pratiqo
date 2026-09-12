import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

const migration = stripSqlComments(read("supabase/migrations/128_teacher_teaching_zones.sql"));

test("raw zone table has RLS enabled", () => {
  assert.match(migration, /ALTER TABLE public\.teacher_teaching_zones ENABLE ROW LEVEL SECURITY/i);
});

test("authenticated teachers can manage only their own zones", () => {
  for (const action of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.match(migration, new RegExp(`FOR ${action}`, "i"));
  }
  assert.match(
    migration,
    /FROM public\.teachers t[\s\S]*t\.id = teacher_teaching_zones\.teacher_id[\s\S]*t\.user_id = \(SELECT auth\.uid\(\)\)/i,
  );
});

test("anonymous users cannot mutate raw zone state", () => {
  assert.match(migration, /REVOKE ALL ON public\.teacher_teaching_zones FROM PUBLIC/i);
  assert.doesNotMatch(migration, /GRANT (INSERT|UPDATE|DELETE|ALL) ON public\.teacher_teaching_zones TO anon/i);
});

test("public view is read-only safe and server replacement function is service-role only", () => {
  assert.match(migration, /GRANT SELECT ON public\.teacher_teaching_zones_public TO anon/i);
  assert.match(migration, /GRANT SELECT ON public\.teacher_teaching_zones_public TO authenticated/i);
  assert.match(migration, /GRANT SELECT ON public\.teacher_teaching_zones_public TO service_role/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.replace_teacher_teaching_zones\(text, jsonb\) FROM PUBLIC/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.replace_teacher_teaching_zones\(text, jsonb\) TO service_role/i);
  assert.match(migration, /SECURITY DEFINER/i);
  assert.match(migration, /SET search_path = public/i);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log(`[teacherZones:rls] ${tests.length} tests passed`);
