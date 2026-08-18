/**
 * Teacher search cards must show selected teacher_disciplines rows,
 * including the first row, instead of a stale teachers.discipline "—".
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Teacher } from "../../types";
import {
  applyAdditionalDisciplines,
  formatTeacherCardDisciplines,
  type TeacherDisciplineRow,
} from "../../lib/teacherMapper";
import { teacherMatchesExploreSearch } from "../../lib/teacherDisciplines";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function baseTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Éloïse Dufour",
    discipline: "—",
    category: "Scolaire",
    rating: 5,
    reviews: 2,
    distance: 0,
    pricePerLesson: 45,
    bio: "Orthopédagogue.",
    imageUrl: "https://cdn.example.com/eloise.webp",
    availability: [],
    location: { lat: 0, lng: 0 },
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: [],
    ...overrides,
  };
}

function row(discipline_id: string, specialite: string | null = null): TeacherDisciplineRow {
  return {
    teacher_id: "11111111-1111-4111-8111-111111111111",
    discipline_id,
    specialite,
  };
}

test("one teacher_disciplines row displays taxonomy label instead of dash", () => {
  const merged = applyAdditionalDisciplines(baseTeacher({ discipline: "—" }), [row("orthopedagogue", null)]);
  assert.equal(merged.discipline, "Orthopédagogue");
  assert.equal(merged.disciplineDisplay?.length, 1);
  assert.equal(merged.disciplineDisplay?.[0]?.label, "Orthopédagogue");
  assert.equal(formatTeacherCardDisciplines(merged), "Orthopédagogue");
  assert.notEqual(formatTeacherCardDisciplines(merged), "—");
});

test("multiple teacher_disciplines rows display all in order", () => {
  const merged = applyAdditionalDisciplines(baseTeacher(), [
    row("francais"),
    row("orthopedagogue"),
    row("aide_aux_devoirs"),
  ]);
  assert.deepEqual(
    merged.disciplineDisplay?.map((d) => d.label),
    ["Français", "Orthopédagogue", "Aide aux devoirs"],
  );
  assert.equal(merged.discipline, "Français");
  assert.equal(formatTeacherCardDisciplines(merged), "Français · Orthopédagogue · Aide aux devoirs");
});

test("specialite overrides taxonomy label when present", () => {
  const merged = applyAdditionalDisciplines(baseTeacher(), [row("orthopedagogue", "TDA/H")]);
  assert.equal(merged.discipline, "TDA/H");
  assert.equal(merged.disciplineDisplay?.[0]?.specialite, "TDA/H");
  assert.equal(merged.disciplineDisplay?.[0]?.label, "TDA/H");
});

test("empty or dash specialite falls back to taxonomy label", () => {
  const empty = applyAdditionalDisciplines(baseTeacher(), [row("orthopedagogue", "")]);
  const dash = applyAdditionalDisciplines(baseTeacher(), [row("soutien_scolaire", "—")]);
  assert.equal(empty.discipline, "Orthopédagogue");
  assert.equal(dash.discipline, "Soutien scolaire");
});

test("duplicate labels are removed", () => {
  const merged = applyAdditionalDisciplines(baseTeacher(), [
    row("orthopedagogue"),
    row("orthopedagogue", "Orthopédagogue"),
    row("lecture_ecriture"),
  ]);
  assert.deepEqual(
    merged.disciplineDisplay?.map((d) => d.label),
    ["Orthopédagogue", "Lecture et écriture"],
  );
});

test("TeacherCard shows first 3 disciplines plus +N", () => {
  const merged = applyAdditionalDisciplines(baseTeacher(), [
    row("orthopedagogue"),
    row("francais"),
    row("aide_aux_devoirs"),
    row("mathematiques"),
    row("soutien_scolaire"),
  ]);
  assert.equal(
    formatTeacherCardDisciplines(merged),
    "Orthopédagogue · Français · Aide aux devoirs +2",
  );
  const searchPage = read("app/(app)/student/search/page.tsx");
  assert.match(searchPage, /formatTeacherCardDisciplines\(teacher\)/);
  assert.doesNotMatch(searchPage, /\{teacher\.discipline\}/);
});

test("search matches additional and new disciplines", () => {
  const merged = applyAdditionalDisciplines(baseTeacher({ discipline: "—" }), [
    row("orthopedagogue"),
    row("lecture_ecriture"),
  ]);
  assert.equal(teacherMatchesExploreSearch(merged, "orthopédagogue"), true);
  assert.equal(teacherMatchesExploreSearch(merged, "orthopedagogue"), true);
  assert.equal(teacherMatchesExploreSearch(merged, "lecture"), true);
  assert.equal(teacherMatchesExploreSearch(merged, "photographie"), false);
});

test("legacy teachers without teacher_disciplines still display legacy discipline", () => {
  const piano = applyAdditionalDisciplines(baseTeacher({ discipline: "Piano", category: "Musique" }), []);
  assert.equal(piano.discipline, "Piano");
  assert.equal(formatTeacherCardDisciplines(piano), "Piano");
  assert.equal(teacherMatchesExploreSearch(piano, "piano"), true);

  const stale = applyAdditionalDisciplines(baseTeacher({ discipline: "—", category: "Scolaire" }), []);
  assert.notEqual(stale.discipline, "—");
  assert.equal(formatTeacherCardDisciplines(stale), "Tuteurs académiques");
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[teacher-card-disciplines] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
