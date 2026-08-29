/**
 * Fitness / aquatic flat disciplines + search aliases.
 */
import assert from "node:assert/strict";
import type { Teacher } from "@/types";
import {
  getDisciplineLabel,
  getTaxonomyDisciplineById,
  resolveDisciplineId,
} from "@/lib/taxonomy/disciplines";
import { getDisciplineById, getEnabledDisciplines } from "@/lib/disciplines";
import { teacherMatchesExploreSearch } from "@/lib/teacherDisciplines";
import { applyAdditionalDisciplines, type TeacherDisciplineRow } from "@/lib/teacherMapper";
import {
  isAdminTeacherDisciplineId,
  resolveAdminDisciplineUpdate,
} from "@/lib/teachers/adminDiscipline";
import { searchSubjectBuckets } from "@/lib/search/subjectBuckets";
import { displayTeacherMarketplaceCategory } from "@/lib/disciplines";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function baseTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Fitness Coach",
    discipline: "—",
    category: "Sports",
    rating: 4,
    reviews: 1,
    distance: 0,
    pricePerLesson: 50,
    bio: "Coach sportif avec une approche progressive et motivante pour tous les niveaux.",
    imageUrl: "https://cdn.example.com/fit.webp",
    availability: ["Mar"],
    location: { lat: 45.5, lng: -73.5 },
    city: "Montréal",
    region: "QC",
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: [],
    ...overrides,
  };
}

function row(discipline_id: string): TeacherDisciplineRow {
  return {
    teacher_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    discipline_id,
    specialite: null,
  };
}

test("taxonomy includes Zumba, Natation, Aquaforme and related fitness ids", () => {
  for (const id of [
    "zumba",
    "natation",
    "aquaforme",
    "yoga",
    "pilates",
    "entrainement_prive",
    "conditionnement_physique",
    "musculation",
    "cardio",
    "coach_sportif",
  ]) {
    const d = getTaxonomyDisciplineById(id);
    assert.ok(d, `missing ${id}`);
    assert.equal(d!.isActive, true);
    assert.equal(d!.searchable, true);
    assert.ok(getEnabledDisciplines().some((x) => x.id === id), `${id} not enabled`);
  }
});

test("FR EN ES labels render for new fitness terms", () => {
  assert.equal(getDisciplineLabel("zumba", "fr"), "Zumba");
  assert.equal(getDisciplineLabel("zumba", "en"), "Zumba");
  assert.equal(getDisciplineLabel("zumba", "es"), "Zumba");
  assert.equal(getDisciplineLabel("natation", "fr"), "Natation");
  assert.equal(getDisciplineLabel("natation", "en"), "Swimming");
  assert.equal(getDisciplineLabel("natation", "es"), "Natación");
  assert.equal(getDisciplineLabel("aquaforme", "fr"), "Aquaforme");
  assert.equal(getDisciplineLabel("aquaforme", "en"), "Aquafitness");
  assert.equal(getDisciplineLabel("aquaforme", "es"), "Aqua fitness");
  assert.equal(getDisciplineLabel("entrainement_prive", "fr"), "Entraînement privé");
  assert.equal(getDisciplineLabel("entrainement_prive", "en"), "Personal training");
  assert.equal(getDisciplineLabel("conditionnement_physique", "fr"), "Conditionnement physique");
});

test("aliases resolve to canonical fitness/aquatic ids", () => {
  assert.equal(resolveDisciplineId("swimming"), "natation");
  assert.equal(resolveDisciplineId("aquagym"), "aquaforme");
  assert.equal(resolveDisciplineId("aquafitness"), "aquaforme");
  assert.equal(resolveDisciplineId("personal_training"), "entrainement_prive");
  assert.equal(resolveDisciplineId("Zumba"), "zumba");
  assert.equal(resolveDisciplineId("Natation"), "natation");
});

test("search for Zumba / Natation / Aquaforme matches teachers", () => {
  const zumba = applyAdditionalDisciplines(baseTeacher({ name: "Zumba Pro" }), [row("zumba")]);
  const swim = applyAdditionalDisciplines(baseTeacher({ name: "Swim Pro" }), [row("natation")]);
  const aqua = applyAdditionalDisciplines(baseTeacher({ name: "Aqua Pro" }), [row("aquaforme")]);

  assert.equal(teacherMatchesExploreSearch(zumba, "Zumba"), true);
  assert.equal(teacherMatchesExploreSearch(swim, "Natation"), true);
  assert.equal(teacherMatchesExploreSearch(swim, "Swimming"), true);
  assert.equal(teacherMatchesExploreSearch(aqua, "Aquaforme"), true);
  assert.equal(teacherMatchesExploreSearch(aqua, "aquagym"), true);
  assert.equal(teacherMatchesExploreSearch(aqua, "aquafitness"), true);
  assert.equal(teacherMatchesExploreSearch(zumba, "Natation"), false);
});

test("yoga / pilates / entraînement privé remain searchable", () => {
  const yoga = applyAdditionalDisciplines(baseTeacher(), [row("yoga")]);
  const pilates = applyAdditionalDisciplines(baseTeacher(), [row("pilates")]);
  const pt = applyAdditionalDisciplines(baseTeacher(), [row("entrainement_prive")]);
  assert.equal(teacherMatchesExploreSearch(yoga, "Yoga"), true);
  assert.equal(teacherMatchesExploreSearch(pilates, "Pilates"), true);
  assert.equal(teacherMatchesExploreSearch(pt, "Entraînement privé"), true);
  assert.equal(teacherMatchesExploreSearch(pt, "personal training"), true);
});

test("language and music existing values still work", () => {
  assert.equal(resolveDisciplineId("langues"), "langues");
  assert.equal(resolveDisciplineId("musique"), "musique");
  assert.equal(getDisciplineById("espagnol")?.label, "Espagnol");
  assert.equal(getDisciplineById("piano")?.label, "Piano");
  assert.notEqual(displayTeacherMarketplaceCategory(""), "Musique");
});

test("admin can assign Zumba / Natation / Aquaforme", () => {
  assert.equal(isAdminTeacherDisciplineId("zumba"), true);
  assert.equal(isAdminTeacherDisciplineId("natation"), true);
  assert.equal(isAdminTeacherDisciplineId("aquaforme"), true);
  const zumba = resolveAdminDisciplineUpdate("zumba");
  assert.ok(zumba);
  assert.equal(zumba!.disciplineId, "zumba");
  assert.equal(zumba!.disciplineLabel, "Zumba");
  assert.equal(zumba!.category, "Danse");
  const aqua = resolveAdminDisciplineUpdate("aquaforme");
  assert.ok(aqua);
  assert.equal(aqua!.category, "Sports");
  assert.equal(resolveAdminDisciplineUpdate("not-real"), null);
});

test("quoi autosuggest buckets include Zumba Natation Aquaforme", () => {
  assert.ok(searchSubjectBuckets("zumba", { locale: "fr" }).some((b) => b.bucket.canonicalId === "zumba"));
  assert.ok(searchSubjectBuckets("natation", { locale: "fr" }).some((b) => b.bucket.canonicalId === "swimming"));
  assert.ok(searchSubjectBuckets("aquaforme", { locale: "fr" }).some((b) => b.bucket.canonicalId === "aquafitness"));
  assert.ok(searchSubjectBuckets("aquagym", { locale: "fr" }).some((b) => b.bucket.canonicalId === "aquafitness"));
  assert.ok(searchSubjectBuckets("pilates", { locale: "fr" }).some((b) => b.bucket.canonicalId === "pilates"));
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacherSearch:teacherFitnessAquaticSearch] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
