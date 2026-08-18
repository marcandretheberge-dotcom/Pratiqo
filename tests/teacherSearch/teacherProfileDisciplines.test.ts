/**
 * Teacher profile modal must show the same selected disciplines as search cards.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Teacher } from "../../types";
import {
  applyAdditionalDisciplines,
  formatTeacherCardDisciplines,
  getTeacherDisciplineDisplayLabels,
  getTeacherProfileDisciplineChips,
  type TeacherDisciplineRow,
} from "../../lib/teacherMapper";

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
    discipline: "Français",
    category: "Langues",
    rating: 5,
    reviews: 2,
    distance: 0,
    pricePerLesson: 45,
    bio: "Professeure.",
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

test("TeacherProfile uses shared disciplineDisplay chips helper", () => {
  const src = read("components/TeacherProfile.tsx");
  assert.match(src, /getTeacherProfileDisciplineChips/);
  assert.doesNotMatch(src, /if \(!spec\) continue/);
  assert.doesNotMatch(src, /getAllDisciplines\(\)/);
  assert.doesNotMatch(src, /teacher\.additionalDisciplines/);
});

test("profile chips use teacher.disciplineDisplay when available", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [
    row("francais"),
    row("aide_aux_devoirs"),
    row("photographie"),
    row("mathematiques"),
    row("soutien_scolaire"),
  ]);
  const chips = getTeacherProfileDisciplineChips(teacher);
  assert.deepEqual(
    chips.map((c) => c.label),
    ["Français", "Aide aux devoirs", "Photographie", "Mathématiques", "Soutien scolaire"],
  );
  assert.equal(formatTeacherCardDisciplines(teacher), "Français · Aide aux devoirs · Photographie +2");
});

test("profile shows taxonomy label when specialite is empty", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [row("photographie", null)]);
  const chips = getTeacherProfileDisciplineChips(teacher);
  assert.equal(chips.length, 1);
  assert.equal(chips[0]?.label, "Photographie");
});

test("profile shows multiple disciplines, not only legacy primary", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher({ discipline: "Français" }), [
    row("francais"),
    row("photographie"),
  ]);
  const chips = getTeacherProfileDisciplineChips(teacher);
  assert.equal(chips.length, 2);
  assert.ok(chips.some((c) => c.label === "Français"));
  assert.ok(chips.some((c) => c.label === "Photographie"));
});

test("profile does not show dash when disciplineDisplay has valid labels", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher({ discipline: "—" }), [
    row("francais"),
    row("photographie"),
  ]);
  const labels = getTeacherDisciplineDisplayLabels(teacher);
  assert.ok(!labels.includes("—"));
  assert.deepEqual(labels, ["Français", "Photographie"]);
});

test("card and modal use the same display helper source", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [
    row("francais"),
    row("aide_aux_devoirs"),
    row("photographie"),
  ]);
  const cardLabels = getTeacherDisciplineDisplayLabels(teacher);
  const modalLabels = getTeacherProfileDisciplineChips(teacher).map((c) => c.label);
  assert.deepEqual(modalLabels, cardLabels);
});

test("legacy teacher without disciplineDisplay still displays teacher.discipline", () => {
  const teacher = applyAdditionalDisciplines(
    baseTeacher({ discipline: "Piano", category: "Musique" }),
    [],
  );
  const chips = getTeacherProfileDisciplineChips(teacher);
  assert.equal(chips.length, 1);
  assert.equal(chips[0]?.label, "Piano");
});

test("teacher with Français and Photographie displays both in modal chips", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [row("francais"), row("photographie")]);
  const chips = getTeacherProfileDisciplineChips(teacher);
  assert.deepEqual(chips.map((c) => c.label), ["Français", "Photographie"]);
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[teacher-profile-disciplines] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
