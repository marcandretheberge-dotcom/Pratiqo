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

test("migration creates dedicated teacher_teaching_zones table", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.teacher_teaching_zones/i);
  assert.match(migration, /teacher_id text NOT NULL REFERENCES public\.teachers\(id\) ON DELETE CASCADE/i);
  for (const column of [
    "label_public",
    "city",
    "region",
    "country_code",
    "lat_public",
    "lng_public",
    "radius_km",
    "zone_kind",
    "is_primary",
    "is_active",
    "availability_note_public",
    "supports_at_teacher_place",
    "supports_at_student_place",
    "supports_public_place",
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, "i"));
  }
});

test("migration limits active zones and primary zone", () => {
  assert.match(migration, /teacher_teaching_zones_one_active_primary_idx/i);
  assert.match(migration, /enforce_teacher_teaching_zones_limit/i);
  assert.match(migration, /teacher_teaching_zones_max_active_exceeded/i);
  assert.match(migration, /count\(\*\)[\s\S]*is_active = true/i);
  assert.match(migration, />= 3/i);
});

test("migration keeps online out of zone kinds", () => {
  assert.match(migration, /primary_base/i);
  assert.match(migration, /work_study_city/i);
  assert.match(migration, /weekend_city/i);
  assert.match(migration, /service_area/i);
  assert.match(migration, /temporary/i);
  assert.doesNotMatch(migration, /'online'/i);
});

test("public projection exposes only safe public zone fields", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.list_public_teacher_teaching_zones\(\)/i);
  assert.match(migration, /teacher_teaching_zones_public/i);
  assert.match(migration, /EXISTS \([\s\S]*public\.teachers_public/i);
  assert.doesNotMatch(migration, /address_line|postal_code/i);
});

test("migration backfills from public or fuzzed location only", () => {
  assert.match(migration, /INSERT INTO public\.teacher_teaching_zones/i);
  assert.match(migration, /location->'public'/i);
  assert.match(migration, /fuzzed_lat|fuzzed_lng/i);
  assert.doesNotMatch(migration, /location->'private'/i);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log(`[teacherZones:schema] ${tests.length} tests passed`);
