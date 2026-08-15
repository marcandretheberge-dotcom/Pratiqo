/**
 * Flat expanded teacher disciplines taxonomy.
 *
 * Pins:
 *   - catalog includes required searchable disciplines
 *   - no required subcategory UX in teacher editor/onboarding
 *   - old Music / Languages / Academic ids still resolve
 *   - invalid ids are rejected on write
 *   - search buckets accept the new subjects
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_TEACHER_DISCIPLINES,
  getDisciplineById,
  getEnabledDisciplines,
  resolveDisciplineId,
} from "@/lib/disciplines";
import {
  PRATIQO_DISCIPLINES,
  getTaxonomyDisciplineById,
  isActiveDisciplineId,
  requiredDisciplineIds,
} from "@/lib/taxonomy/disciplines";
import { searchSubjectBuckets } from "@/lib/search/subjectBuckets";
import { diagnoseTeacherSearchVisibility } from "@/lib/teachers/searchVisibilityDiagnostics";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("taxonomy includes all required flat disciplines", () => {
  for (const id of requiredDisciplineIds()) {
    const d = getTaxonomyDisciplineById(id);
    assert.ok(d, `missing ${id}`);
    assert.equal(d!.isActive, true);
    assert.equal(d!.searchable, true);
  }
  assert.ok(PRATIQO_DISCIPLINES.length >= 80);
  assert.equal(MAX_TEACHER_DISCIPLINES, 5);
});

test("no required subcategory structure is introduced", () => {
  const editor = read("components/teacher/TeacherDisciplinesEditor.tsx");
  const onboarding = read("app/onboarding/page.tsx");
  assert.match(editor, /flatDisciplineHint/);
  assert.match(editor, /whatDoYouTeach/);
  assert.doesNotMatch(editor, /Arts → Photographie|category-first|required subcategory/i);
  assert.match(onboarding, /whatDoYouTeach/);
  assert.doesNotMatch(onboarding, /D'autres disciplines seront bientôt disponibles/);
  assert.match(editor, /disciplineApproachOptional/);
});

test("teacher onboarding and profile management render expanded flat disciplines", () => {
  const onboarding = read("app/onboarding/page.tsx");
  const editor = read("components/teacher/TeacherDisciplinesEditor.tsx");
  const verification = read("app/(app)/teacher/verification/page.tsx");
  assert.match(onboarding, /getEnabledDisciplines/);
  assert.match(onboarding, /MAX_TEACHER_DISCIPLINES/);
  assert.match(editor, /getEnabledDisciplines/);
  assert.match(verification, /MAX_TEACHER_DISCIPLINES/);
  const enabled = getEnabledDisciplines();
  for (const id of ["photographie", "cuisine", "coach_sportif", "danse", "francisation", "piano", "espagnol", "mathematiques"]) {
    assert.ok(enabled.some((d) => d.id === id), `enabled catalog missing ${id}`);
  }
});

test("old music/language/academic values map backward-compatibly", () => {
  assert.equal(resolveDisciplineId("music"), "musique");
  assert.equal(resolveDisciplineId("musique"), "musique");
  assert.equal(resolveDisciplineId("language"), "langues");
  assert.equal(resolveDisciplineId("languages"), "langues");
  assert.equal(resolveDisciplineId("langues"), "langues");
  assert.equal(resolveDisciplineId("academic"), "tuteurs");
  assert.equal(resolveDisciplineId("academique"), "tuteurs");
  assert.equal(resolveDisciplineId("tutoring"), "tuteurs");
  assert.equal(resolveDisciplineId("tutorat"), "tuteurs");
  assert.equal(getDisciplineById("musique")?.label, "Musique");
  assert.equal(getDisciplineById("langues")?.label, "Langues");
  assert.ok(getDisciplineById("tuteurs")?.label);
  assert.equal(isActiveDisciplineId("musique"), true);
  assert.equal(isActiveDisciplineId("not_a_real_discipline"), false);
});

test("invalid discipline is rejected by helpers", () => {
  assert.equal(resolveDisciplineId("bien-etre-leger"), null);
  assert.equal(getDisciplineById("bien-etre-leger"), undefined);
  const complete = read("app/api/onboarding/complete/route.ts");
  assert.match(complete, /filter\(\(x\) => x\.known\)/);
});

test("search accepts new discipline queries without exposing private data", () => {
  const cases: Array<[string, string]> = [
    ["photographie", "photography"],
    ["cuisine", "cooking"],
    ["coach sportif", "coach_trainer"],
    ["danse", "dance"],
    ["francisation", "francisation"],
    ["piano", "piano"],
    ["espagnol", "spanish"],
    ["mathematiques", "math"],
    ["yoga", "yoga"],
    ["excel", "excel"],
  ];
  for (const [q, id] of cases) {
    const hits = searchSubjectBuckets(q, { locale: "fr", limit: 12 });
    assert.ok(
      hits.some((h) => h.bucket.canonicalId === id),
      `search "${q}" should hit ${id}`,
    );
  }
  const searchSrc = read("lib/search/subjectBuckets.ts");
  assert.doesNotMatch(searchSrc, /home_address|stripe_account_id|email/);
});

test("visibility diagnostics still pass for Music/Language/Academic teachers", () => {
  const profile = {
    id: "22222222-2222-4222-8222-222222222222",
    role: "teacher",
    teacher_onboarding_complete: true,
    is_active: true,
  };
  const base = {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: profile.id,
    name: "Marie",
    bio: "Professeure de piano.",
    country_code: "CA",
    teaching_mode: "online",
    price_per_lesson: 45,
    is_public: true,
    identity_verified: true,
  };
  for (const category of ["Musique", "Langues", "Scolaire"]) {
    const result = diagnoseTeacherSearchVisibility({
      profile,
      teacher: { ...base, category, discipline: "—" },
      disciplineCount: 1,
      inTeachersPublicView: true,
    });
    assert.equal(result.visibleInSearch, true, `${category} should remain visible`);
    assert.ok(!result.blockingReasonCodes.includes("BLOCKER_MISSING_SUBJECT"));
  }
  const photo = diagnoseTeacherSearchVisibility({
    profile,
    teacher: { ...base, category: "Photographie", discipline: "Photographie" },
    disciplineCount: 1,
    inTeachersPublicView: true,
  });
  assert.equal(photo.visibleInSearch, true);
});

test("admin Teacher 360 still labels disciplines from the catalog", () => {
  const src = read("lib/admin/teacher360.ts");
  assert.match(src, /getDisciplineById/);
  assert.match(src, /teacher_disciplines/);
  assert.equal(getDisciplineById("photographie")?.label, "Photographie");
  assert.equal(getDisciplineById("cuisine")?.label, "Cuisine");
});

test("onboarding complete does not change checkout or booking math", () => {
  const complete = read("app/api/onboarding/complete/route.ts");
  assert.doesNotMatch(complete, /stripe\.|webhook|platform_fee/);
  const taxonomy = read("lib/taxonomy/disciplines.ts");
  assert.doesNotMatch(taxonomy, /internalGroup.*=.*required/);
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[taxonomy:flat-disciplines] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
