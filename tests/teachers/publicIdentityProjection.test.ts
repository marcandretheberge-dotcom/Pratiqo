/**
 * Public teachers_public identity projection (migration 098).
 *
 * Public users see only identity_verified = true/false.
 * Manual verification source must not be inferable from teachers_public.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { isPublicTeacherIdentityVerified } from "@/lib/teachers/badges";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const MIGRATION098 = read("supabase/migrations/098_hide_manual_identity_source_from_public_projection.sql");
const QUERIES = read("lib/supabase/queries.ts");
const SEARCH = read("app/(app)/student/search/page.tsx");
const BOOKING = read("components/BookingModal.tsx");
const PROFILE = read("components/TeacherProfile.tsx");
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

function publicRow(overrides: Partial<TeacherRow> = {}): TeacherRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "22222222-2222-4222-8222-222222222222",
    name: "Marie Dubois",
    discipline: "Français",
    category: "Langues",
    rating: 5,
    reviews: 2,
    price_per_lesson: 70,
    monthly_subscription: null,
    bio: "Professeure.",
    image_url: null,
    availability: [],
    location: {},
    is_verified: true,
    teaching_mode: "online",
    languages: ["fr"],
    levels: [],
    identity_verified: false,
    diploma_verified: false,
    ...overrides,
  };
}

test("migration 098 does not expose identity_verified_manually in RETURNS TABLE", () => {
  const fnBlock = MIGRATION098.match(/CREATE FUNCTION public\.list_public_teachers\([\s\S]*?\$\$;/i)?.[0] ?? "";
  const returnsBlock = fnBlock.match(/RETURNS TABLE \(([\s\S]*?)\)/)?.[1] ?? "";
  assert.doesNotMatch(returnsBlock, /identity_verified_manually\s+boolean/);
  assert.doesNotMatch(returnsBlock, /identity_verified_manually_at/);
  assert.doesNotMatch(returnsBlock, /identity_verified_manually_by/);
  assert.doesNotMatch(returnsBlock, /identity_manual_verification_note/);
  assert.match(returnsBlock, /identity_verified\s+boolean/);
});

test("migration 098 projects effective identity_verified boolean", () => {
  const fnBlock = MIGRATION098.match(/CREATE FUNCTION public\.list_public_teachers\([\s\S]*?\$\$;/i)?.[0] ?? "";
  assert.match(
    fnBlock,
    /COALESCE\(t\.identity_verified,\s*false\)\s+OR COALESCE\(t\.identity_verified_manually,\s*false\)/,
  );
  assert.match(fnBlock, /AS identity_verified/);
  const outputSelect = fnBlock.match(/SELECT([\s\S]*?)\n\s+FROM public\.teachers t/i)?.[1] ?? "";
  assert.doesNotMatch(outputSelect, /,\s*t\.identity_verified_manually/);
});

test("TEACHERS_LIST_SELECT does not request manual identity source from teachers_public", () => {
  const listSelect = QUERIES.match(/TEACHERS_LIST_SELECT\s*=\s*"([^"]+)"/)?.[1] ?? "";
  assert.doesNotMatch(listSelect, /identity_verified_manually/);
  assert.match(listSelect, /identity_verified/);
});

test("teacherRowToTeacher maps collapsed identity_verified to teacher.identityVerified", () => {
  const teacher = teacherRowToTeacher(publicRow({ identity_verified: true }));
  assert.equal(teacher.identityVerified, true);
  assert.equal(teacher.identityVerifiedManually, undefined);
});

test("public identity checkmark uses collapsed identityVerified only", () => {
  assert.equal(isPublicTeacherIdentityVerified({ identityVerified: true }), true);
  assert.equal(isPublicTeacherIdentityVerified({ identityVerified: false }), false);
});

test("public search card does not inspect manual verification source", () => {
  const card = SEARCH.slice(SEARCH.indexOf("function TeacherCard({"));
  assert.match(card, /identityVerified:\s*teacher\.identityVerified/);
  assert.doesNotMatch(card, /identityVerifiedManually/);
  assert.doesNotMatch(card, /identity_verified_manually/);
  assert.doesNotMatch(card, /vérifiée manuellement/i);
});

test("booking modal does not inspect manual verification source on public teacher data", () => {
  assert.match(BOOKING, /identityVerified:\s*teacher\.identityVerified/);
  assert.doesNotMatch(BOOKING, /identityVerifiedManually/);
});

test("public TeacherProfile does not expose manual verification source", () => {
  assert.doesNotMatch(PROFILE, /identityVerifiedManually/);
  assert.doesNotMatch(PROFILE, /identity_verified_manually/);
  assert.doesNotMatch(PROFILE, /identity_manual_verification_note/);
  assert.doesNotMatch(PROFILE, /vérifiée manuellement/i);
});

test("this contract is wired into npm run test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/teachers\/publicIdentityProjection\.test\.ts/,
  );
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[teachers:publicIdentityProjection] ${passed} tests passed`);
}
