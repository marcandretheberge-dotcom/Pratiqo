import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  diagnoseTeacherSearchVisibility,
  type TeacherSearchVisibilityDiagnosisInput,
} from "@/lib/teachers/searchVisibilityDiagnostics";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const profile = {
  id: "0bbed16d-e677-47b3-9c87-03fca0109704",
  role: "teacher",
  teacher_onboarding_complete: true,
  is_active: true,
  deactivated_at: null,
  deleted_at: null,
  anonymized_at: null,
};

const teacher: NonNullable<TeacherSearchVisibilityDiagnosisInput["teacher"]> = {
  id: "afe6eab4-f40d-4d84-add9-8e061184ef6f",
  user_id: profile.id,
  name: "Marie Dubois",
  discipline: "Francais",
  category: "Langues",
  price_per_lesson: 45,
  teaching_mode: "both",
  city: "Montreal",
  region: "QC",
  location: {},
  is_public: true,
  is_demo: false,
  deactivated_at: null,
  deleted_at: null,
  identity_status: "verified",
  identity_verified: true,
  stripe_identity_failed_reason: null,
};

function diagnose(overrides: Partial<TeacherSearchVisibilityDiagnosisInput> = {}) {
  return diagnoseTeacherSearchVisibility({
    profile,
    teacher,
    disciplineCount: 1,
    inTeachersPublicView: false,
    ...overrides,
  });
}

test("search-visible teacher appears in search when teachers_public contains the row", () => {
  const result = diagnose({ inTeachersPublicView: true });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.reasonCodes, ["VISIBLE_IN_SEARCH"]);
});

test("admin completed teacher can differ from search-visible with explicit public flag reason", () => {
  const result = diagnose({ teacher: { ...teacher, is_public: false } });
  assert.equal(result.visibleInSearch, false);
  assert.ok(result.reasonCodes.includes("MISSING_PUBLIC_FLAG"));
});

test("teacher missing subject is excluded with reason", () => {
  const result = diagnose({
    teacher: { ...teacher, discipline: "", category: "" },
    disciplineCount: 0,
  });
  assert.equal(result.visibleInSearch, false);
  assert.ok(result.reasonCodes.includes("MISSING_SUBJECT"));
});

test("teacher missing rate is excluded with reason", () => {
  const result = diagnose({ teacher: { ...teacher, price_per_lesson: null } });
  assert.equal(result.visibleInSearch, false);
  assert.ok(result.reasonCodes.includes("MISSING_RATE"));
});

test("teacher missing public location is allowed when online format exists", () => {
  const result = diagnose({
    teacher: { ...teacher, teaching_mode: "online", city: null, region: null, location: {} },
  });
  assert.equal(result.reasonCodes.includes("MISSING_LOCATION_POINT"), false);
});

test("teacher missing public location is flagged for in-person-only format", () => {
  const result = diagnose({
    teacher: { ...teacher, teaching_mode: "person", city: null, region: null, location: {} },
  });
  assert.ok(result.reasonCodes.includes("MISSING_LOCATION_POINT"));
});

test("intro session disabled and null intro price are not search exclusion reasons", () => {
  const result = diagnose({ teacher: { ...teacher, is_public: false } });
  assert.ok(result.reasonCodes.includes("MISSING_PUBLIC_FLAG"));
  assert.doesNotMatch(result.reasonCodes.join(","), /intro/i);
});

test("private or incomplete teacher is not exposed", () => {
  const missingTeacher = diagnose({ teacher: null });
  assert.equal(missingTeacher.visibleInSearch, false);
  assert.ok(missingTeacher.reasonCodes.includes("MISSING_TEACHER_ROW"));

  const blockedProfile = diagnose({
    profile: { ...profile, is_active: false },
  });
  assert.equal(blockedProfile.visibleInSearch, false);
  assert.ok(blockedProfile.reasonCodes.includes("MISSING_PROFILE_STATUS"));
});

test("admin users API enriches teacher rows with search visibility diagnostics", () => {
  const route = read("app/api/admin/users/route.ts");
  assert.match(route, /diagnoseTeacherSearchVisibility/);
  assert.match(route, /teacher_search_visible/);
  assert.match(route, /teacher_search_visibility_reasons/);
  assert.match(route, /teachers_public/);
  assert.match(route, /teacher_disciplines/);
});

test("admin users page distinguishes onboarding complete from search visibility", () => {
  const page = read("app/(app)/admin/users/page.tsx");
  assert.match(page, /Onboarding complet/);
  assert.match(page, /Visible en recherche/);
  assert.match(page, /Non visible en recherche/);
  assert.match(page, /admin-users-teacher-search-hidden/);
});

test("diagnostic script compares admin, onboarding, eligibility, and search counts", () => {
  const script = read("scripts/diagnose_teacher_search_visibility.ts");
  assert.match(script, /adminTeachers/);
  assert.match(script, /onboardingCompletedTeachers/);
  assert.match(script, /searchEligibleTeachers/);
  assert.match(script, /searchReturnedTeachers/);
  assert.match(script, /reasonBreakdown/);
});

test("diagnostic script does not print raw private location or address fields", () => {
  const script = read("scripts/diagnose_teacher_search_visibility.ts");
  const outputMap = script.slice(script.indexOf("teachers: rows.map"));
  assert.doesNotMatch(outputMap, /location/);
  assert.doesNotMatch(outputMap, /address/i);
});

test("restricted systems are not touched by the visibility diagnostic helper", () => {
  const helper = read("lib/teachers/searchVisibilityDiagnostics.ts");
  assert.doesNotMatch(helper, /stripe\/checkout|commission|Membre Pro|YoPratiqo|SUPABASE_SERVICE_ROLE_KEY/i);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log(`[teacherSearch:visibilityDiagnostics] ${tests.length} tests passed`);
