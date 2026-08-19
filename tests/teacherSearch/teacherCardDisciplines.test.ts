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
  formatTeacherDisciplineLabel,
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
    name: "Éloïse D.",
    discipline: "—",
    category: "Scolaire",
    rating: 5,
    reviews: 2,
    distance: 0,
    pricePerLesson: 45,
    bio: "Professeure de photographie et de français.",
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

test("Éloïse shows Photographie and Français from teacher_disciplines, not dash", () => {
  const merged = applyAdditionalDisciplines(baseTeacher({ discipline: "—" }), [
    row("photographie"),
    row("francais"),
  ]);
  assert.equal(merged.discipline, "Photographie");
  assert.deepEqual(merged.disciplineDisplay?.map((d) => d.label), ["Photographie", "Français"]);
  assert.equal(formatTeacherCardDisciplines(merged), "Photographie · Français");
  assert.notEqual(formatTeacherCardDisciplines(merged), "—");
});

test("one teacher_disciplines row displays taxonomy label instead of dash", () => {
  const merged = applyAdditionalDisciplines(baseTeacher({ discipline: "—" }), [row("photographie", null)]);
  assert.equal(merged.discipline, "Photographie");
  assert.equal(merged.disciplineDisplay?.length, 1);
  assert.equal(merged.disciplineDisplay?.[0]?.label, "Photographie");
  assert.equal(formatTeacherCardDisciplines(merged), "Photographie");
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

test("search matches Photographie and Français for Éloïse-style profile", () => {
  const merged = applyAdditionalDisciplines(baseTeacher({ discipline: "—" }), [
    row("photographie"),
    row("francais"),
  ]);
  assert.equal(teacherMatchesExploreSearch(merged, "photographie"), true);
  assert.equal(teacherMatchesExploreSearch(merged, "français"), true);
  assert.equal(teacherMatchesExploreSearch(merged, "francais"), true);
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

test("formatTeacherDisciplineLabel capitalizes the first character only", () => {
  assert.equal(formatTeacherDisciplineLabel("chant populaire"), "Chant populaire");
  assert.equal(formatTeacherDisciplineLabel("aide aux devoirs"), "Aide aux devoirs");
  assert.equal(formatTeacherDisciplineLabel("Français"), "Français");
  assert.equal(formatTeacherDisciplineLabel("Aide aux devoirs"), "Aide aux devoirs");
});

test("card summary capitalizes custom labels without inventing disciplines", () => {
  const custom = applyAdditionalDisciplines(
    baseTeacher({ discipline: "chant populaire", category: "Musique" }),
    [],
  );
  assert.equal(formatTeacherCardDisciplines(custom), "Chant populaire");

  const mixed = applyAdditionalDisciplines(baseTeacher({ discipline: "français" }), [
    row("francais"),
    row("aide_aux_devoirs"),
    row("photographie"),
  ]);
  assert.equal(formatTeacherCardDisciplines(mixed), "Français · Aide aux devoirs · Photographie");
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
