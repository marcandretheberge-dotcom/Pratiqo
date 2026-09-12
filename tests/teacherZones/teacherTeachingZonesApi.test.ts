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

const route = read("app/api/teacher/teaching-zones/route.ts");
const teacherUi = read("app/(app)/teacher/verification/page.tsx");

test("teacher-owned API requires bearer auth and resolves teacher from current user", () => {
  assert.match(route, /authorization/i);
  assert.match(route, /Bearer /);
  assert.match(route, /auth\.getUser\(token\)/);
  assert.match(route, /\.from\("teachers"\)[\s\S]*\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(route, /teacherId\s*=\s*.*body/i);
});

test("API caps zones at three and keeps exactly one primary", () => {
  assert.match(route, /z\.array\(zoneSchema\)\.max\(3\)/);
  assert.match(route, /too_many_active_zones/);
  assert.match(route, /multiple_primary_zones/);
  assert.match(route, /primaryCount === 0/);
});

test("API uses atomic service-role replacement function", () => {
  assert.match(route, /getSupabaseAdmin/);
  assert.match(route, /\.rpc\("replace_teacher_teaching_zones"/);
  assert.match(route, /p_teacher_id: teacherId/);
  assert.match(route, /p_zones: normalized\.zones/);
});

test("API validation includes public fields and never models online as a zone", () => {
  assert.match(route, /labelPublic/);
  assert.match(route, /supportsAtTeacherPlace/);
  assert.match(route, /supportsAtStudentPlace/);
  assert.match(route, /supportsPublicPlace/);
  assert.doesNotMatch(route, /zoneKind[\s\S]*online/i);
});

test("teacher profile management UI uses the teacher zones API", () => {
  assert.match(teacherUi, /\/api\/teacher\/teaching-zones/);
  assert.match(teacherUi, /teachingZonesManagerTitle/);
  assert.match(teacherUi, /teachingZonesMaxThreeError/);
  assert.match(teacherUi, /makeTeachingZonePrimary/);
  assert.match(teacherUi, /deleteTeachingZone/);
  assert.doesNotMatch(teacherUi, /\/api\/stripe|commission|Membre Pro|YoPratiqo/i);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log(`[teacherZones:api] ${tests.length} tests passed`);
