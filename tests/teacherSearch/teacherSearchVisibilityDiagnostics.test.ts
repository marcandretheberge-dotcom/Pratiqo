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

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
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
  bio: "Enseignante expérimentée avec une approche claire et bienveillante.",
  availability: ["Lun soir"],
  price_per_lesson: 45,
  teaching_mode: "both",
  city: "Montreal",
  region: "QC",
  country_code: "CA",
  location: {},
  is_public: true,
  is_demo: false,
  deactivated_at: null,
  deleted_at: null,
  identity_status: "verified",
  identity_verified: true,
  stripe_identity_failed_reason: null,
  intro_session_enabled: true,
  intro_session_price_cents: 1500,
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
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.deepEqual(result.warningReasonCodes, []);
});

test("teachers_public membership no longer depends on publication flag", () => {
  const result = diagnose({
    inTeachersPublicView: true,
    teacher: { ...teacher, is_public: null },
  });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.ok(result.warningReasonCodes.includes("WARNING_PROFILE_NOT_PUBLISHED"));
});

test("teachers.is_public null is warning-only by TypeScript policy", () => {
  const result = diagnose({ teacher: { ...teacher, is_public: null } });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.ok(result.warningReasonCodes.includes("WARNING_PROFILE_NOT_PUBLISHED"));
});

test("valid teacher can be policy-visible without relying on teachers_public as authority", () => {
  const result = diagnose({ inTeachersPublicView: false });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
});

test("admin completed teacher can be discoverable while unpublished warning is shown", () => {
  const result = diagnose({ teacher: { ...teacher, is_public: false } });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.ok(result.warningReasonCodes.includes("WARNING_PROFILE_NOT_PUBLISHED"));
});

test("teacher missing subject is excluded with reason", () => {
  const result = diagnose({
    teacher: { ...teacher, discipline: "", category: "" },
    disciplineCount: 0,
  });
  assert.equal(result.visibleInSearch, false);
  assert.ok(result.blockingReasonCodes.includes("BLOCKER_MISSING_SUBJECT"));
});

test("teacher missing rate is warning-only, not a search exclusion reason", () => {
  const result = diagnose({ teacher: { ...teacher, price_per_lesson: null } });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.ok(result.warningReasonCodes.includes("WARNING_MISSING_BASE_RATE"));
});

test("teacher missing public location is allowed when online format exists", () => {
  const result = diagnose({
    teacher: { ...teacher, teaching_mode: "online", city: null, region: null, location: {} },
  });
  assert.equal(result.blockingReasonCodes.includes("BLOCKER_MISSING_PUBLIC_LOCATION_OR_ONLINE"), false);
});

test("teacher missing public location is warning-only for in-person-only format", () => {
  const result = diagnose({
    teacher: { ...teacher, teaching_mode: "person", city: null, region: null, location: {} },
  });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.ok(result.warningReasonCodes.includes("WARNING_MISSING_PUBLIC_LOCATION_OR_ONLINE"));
});

test("intro session disabled and null intro price are not search exclusion reasons", () => {
  const result = diagnose({
    teacher: { ...teacher, intro_session_enabled: false, intro_session_price_cents: null },
  });
  assert.equal(result.visibleInSearch, true);
  assert.doesNotMatch(result.blockingReasonCodes.join(","), /intro/i);
  assert.ok(result.warningReasonCodes.includes("WARNING_NO_INTRO_LESSON"));
});

test("Stripe Connect readiness is not a TypeScript search visibility blocker", () => {
  const stripeIncompleteTeacher = {
    ...teacher,
    stripe_account_id: null,
    stripe_connect_onboarding_complete: false,
    stripe_connect_charges_enabled: false,
    stripe_connect_payouts_enabled: false,
  } as typeof teacher & Record<string, unknown>;
  const result = diagnose({
    teacher: stripeIncompleteTeacher,
    inTeachersPublicView: true,
  });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
});

test("missing availability is warning-only, not a search exclusion reason", () => {
  const result = diagnose({ teacher: { ...teacher, availability: [] } });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.ok(result.warningReasonCodes.includes("WARNING_NO_AVAILABILITY"));
});

test("private or incomplete teacher is not exposed", () => {
  const missingTeacher = diagnose({ teacher: null });
  assert.equal(missingTeacher.visibleInSearch, false);
  assert.ok(missingTeacher.blockingReasonCodes.includes("BLOCKER_TEACHER_ROW_MISSING"));

  const blockedProfile = diagnose({
    profile: { ...profile, is_active: false },
  });
  assert.equal(blockedProfile.visibleInSearch, false);
  assert.ok(blockedProfile.blockingReasonCodes.includes("BLOCKER_PROFILE_INACTIVE"));
});

test("identity not verified is warning unless failed identity actually blocks search", () => {
  const unverified = diagnose({
    teacher: { ...teacher, identity_status: "none", identity_verified: false, stripe_identity_failed_reason: null },
  });
  assert.ok(unverified.warningReasonCodes.includes("WARNING_IDENTITY_NOT_VERIFIED"));
  assert.equal(
    unverified.blockingReasonCodes.includes("BLOCKER_FAILED_IDENTITY_IF_SEARCH_BLOCKING"),
    false,
  );

  const failed = diagnose({
    teacher: { ...teacher, identity_status: "failed", identity_verified: false },
  });
  assert.ok(failed.blockingReasonCodes.includes("BLOCKER_FAILED_IDENTITY_IF_SEARCH_BLOCKING"));
});

test("visible teacher can still carry warning status without blocker labels", () => {
  const result = diagnose({
    teacher: { ...teacher, identity_status: "none", identity_verified: false, stripe_identity_failed_reason: null },
    inTeachersPublicView: true,
  });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.ok(result.warningReasonCodes.includes("WARNING_IDENTITY_NOT_VERIFIED"));
});

test("unsupported teacher country is warning-only for discovery", () => {
  const result = diagnose({ teacher: { ...teacher, country_code: "UY" } });
  assert.equal(result.visibleInSearch, true);
  assert.deepEqual(result.blockingReasonCodes, []);
  assert.ok(result.warningReasonCodes.includes("WARNING_UNSUPPORTED_COUNTRY"));
});

test("125 migration makes discovery independent from publication flag", () => {
  const migration = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));
  assert.match(migration, /CREATE FUNCTION public\.list_public_teachers\(\)/i);
  assert.doesNotMatch(migration, /WHERE[\s\S]*t\.is_public\s*=\s*true/i);
  assert.doesNotMatch(migration, /COALESCE\(t\.is_public,\s*true\)\s*=\s*true/i);
});

test("125 migration enforces minimal SQL blockers that match discovery-first policy", () => {
  const migration = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));
  assert.match(migration, /p\.role\s*=\s*'teacher'/i);
  assert.doesNotMatch(migration, /NULLIF\(BTRIM\(t\.bio\), ''\) IS NOT NULL/i);
  assert.doesNotMatch(migration, /UPPER\(BTRIM\(COALESCE\(t\.country_code, ''\)\)\)\s*=\s*'CA'/i);
  assert.doesNotMatch(migration, /t\.price_per_lesson\s+IS NOT NULL/i);
  assert.doesNotMatch(migration, /t\.price_per_lesson\s*>\s*0/i);
  assert.match(migration, /FROM public\.teacher_disciplines td/i);
  assert.doesNotMatch(migration, /NULLIF\(BTRIM\(t\.teaching_mode\), ''\) IS NOT NULL/i);
});

test("125 migration does not require public location for discovery", () => {
  const migration = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));
  assert.doesNotMatch(migration, /LOWER\(BTRIM\(t\.teaching_mode\)\)\s+IN\s+\('online', 'both', 'all'\)[\s\S]*NULLIF\(BTRIM\(COALESCE\(t\.city, ''\)\), ''\) IS NOT NULL/i);
  assert.doesNotMatch(migration, /t\.location -> 'public' -> 'lat'[\s\S]*IS NOT NULL/i);
  assert.doesNotMatch(migration, /t\.location -> 'public' -> 'lng'[\s\S]*IS NOT NULL/i);
});

test("125 migration does not enforce warning-only fields", () => {
  const migration = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));
  assert.doesNotMatch(migration, /intro_session_enabled\s*=\s*true/i);
  assert.doesNotMatch(migration, /intro_session_price_cents\s*>\s*0/i);
  assert.doesNotMatch(migration, /availability\s+IS NOT NULL/i);
  assert.doesNotMatch(migration, /stripe_account_id|stripe_connect_/i);
  assert.doesNotMatch(migration, /AND\s+t\.identity_verified\s*=\s*true/i);
  assert.match(migration, /COALESCE\(t\.identity_status, 'none'\) <> 'failed'/i);
  assert.match(migration, /NULLIF\(BTRIM\(COALESCE\(t\.stripe_identity_failed_reason, ''\)\), ''\) IS NULL/i);
});

test("125 migration keeps private location stripped from public projection", () => {
  const migration = stripSqlComments(read("supabase/migrations/125_teacher_discovery_first_visibility.sql"));
  const selectBlock = migration.match(/AS \$\$\s+SELECT([\s\S]*?)FROM public\.teachers t/i)?.[1] ?? "";
  assert.match(selectBlock, /COALESCE\(t\.location, '\{\}'::jsonb\) - 'private'::text AS location/i);
  assert.doesNotMatch(selectBlock, /t\.location\s+AS location/i);
});

test("admin users API enriches teacher rows with search visibility diagnostics", () => {
  const route = read("app/api/admin/users/route.ts");
  assert.match(route, /diagnoseTeacherSearchVisibility/);
  assert.match(route, /teacher_search_visible/);
  assert.match(route, /teacher_search_visibility_reasons/);
  assert.match(route, /teacher_search_visibility_blockers/);
  assert.match(route, /teacher_search_visibility_warnings/);
  assert.match(route, /teachers_public/);
  assert.match(route, /teacher_disciplines/);
});

test("admin users page distinguishes onboarding complete from search visibility", () => {
  const page = read("app/(app)/admin/users/page.tsx");
  assert.match(page, /Onboarding complet/);
  assert.match(page, /Visible en recherche/);
  assert.match(page, /Non visible en recherche/);
  assert.match(page, /Blocages/);
  assert.match(page, /À surveiller/);
  assert.match(page, /admin-users-teacher-search-hidden/);
});

test("diagnostic script compares admin, onboarding, eligibility, and search counts", () => {
  const script = read("scripts/diagnose_teacher_search_visibility.ts");
  assert.match(script, /adminTeachers/);
  assert.match(script, /onboardingCompletedTeachers/);
  assert.match(script, /searchEligibleTeachers/);
  assert.match(script, /searchReturnedTeachers/);
  assert.match(script, /rpcReturnedTeachers/);
  assert.match(script, /sqlTsVisibilityMismatches/);
  assert.match(script, /MISMATCH_SQL_TS_VISIBILITY/);
  assert.match(script, /blockerReasonBreakdown/);
  assert.match(script, /warningReasonBreakdown/);
  assert.match(script, /blockingReasonCodes/);
  assert.match(script, /warningReasonCodes/);
});

test("diagnostic script compares TypeScript policy against both view and RPC", () => {
  const script = read("scripts/diagnose_teacher_search_visibility.ts");
  assert.match(script, /supabase\.from\("teachers_public"\)\.select\("id, user_id"\)/);
  assert.match(script, /supabase\.rpc\("list_public_teachers"\)\.select\("id, user_id"\)/);
  assert.match(script, /expectedVisibleByTypeScript/);
  assert.match(script, /actualInTeachersPublic/);
  assert.match(script, /actualInListPublicTeachersRpc/);
});

test("diagnostic script does not print raw private location or address fields", () => {
  const script = read("scripts/diagnose_teacher_search_visibility.ts");
  const outputMap = script.slice(script.indexOf("teachers: rows.map"));
  assert.doesNotMatch(outputMap, /location/);
  assert.doesNotMatch(outputMap, /address/i);
});

test("admin users payload does not return raw private location or address fields", () => {
  const route = read("app/api/admin/users/route.ts");
  const payloadMap = route.slice(route.indexOf("const rows: AdminUserRow[]"));
  assert.doesNotMatch(payloadMap, /location:/);
  assert.doesNotMatch(payloadMap, /address/i);
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
