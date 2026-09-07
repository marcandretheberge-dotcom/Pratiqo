/**
 * Coach sportif parent/group search must expand to fitness specialties.
 */
import assert from "node:assert/strict";
import type { Teacher } from "@/types";
import {
  DISCIPLINE_SEARCH_GROUP_EXPANSIONS,
  getExpandedDisciplineSearchIds,
  resolveDisciplineId,
  resolveDisciplineSearchIntent,
} from "@/lib/taxonomy/disciplines";
import { teacherMatchesExploreSearch } from "@/lib/teacherDisciplines";
import { applyAdditionalDisciplines, type TeacherDisciplineRow } from "@/lib/teacherMapper";
import { computeTeacherSearchMatchScore } from "@/lib/teachers/searchRanking";
import { searchSubjectBuckets } from "@/lib/search/subjectBuckets";
import { filterTeacherPool } from "@/lib/teacherSearchEngine";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function baseTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Alex Fitness",
    discipline: "—",
    category: "Sports",
    rating: 4,
    reviews: 2,
    distance: 0,
    pricePerLesson: 55,
    bio: "Entraînement privé et musculation avec une approche progressive.",
    imageUrl: "https://cdn.example.com/fit.webp",
    availability: ["Mer"],
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

function rows(...ids: string[]): TeacherDisciplineRow[] {
  return ids.map((discipline_id) => ({
    teacher_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    discipline_id,
    specialite: null,
  }));
}

test("coach_sportif expands to musculation, PT, cardio, aquatic, yoga, pilates, zumba", () => {
  const expanded = getExpandedDisciplineSearchIds("coach_sportif");
  for (const id of [
    "coach_sportif",
    "musculation",
    "entrainement_prive",
    "conditionnement_physique",
    "cardio",
    "yoga",
    "pilates",
    "natation",
    "aquaforme",
    "zumba",
  ]) {
    assert.ok(expanded.has(id), `missing ${id}`);
  }
  assert.deepEqual(
    [...(DISCIPLINE_SEARCH_GROUP_EXPANSIONS.coach_sportif ?? [])].sort(),
    [...expanded].sort(),
  );
});

test("aliases fitness / sport / coach sportif resolve to coach_sportif intent", () => {
  assert.equal(resolveDisciplineId("Coach sportif"), "coach_sportif");
  assert.equal(resolveDisciplineId("fitness"), "coach_sportif");
  assert.equal(resolveDisciplineId("sport"), "coach_sportif");
  assert.equal(resolveDisciplineId("sports"), "coach_sportif");
  assert.equal(resolveDisciplineSearchIntent("fitness").primaryId, "coach_sportif");
});

test("teacher with musculation + entrainement_prive matches Coach sportif", () => {
  const teacher = applyAdditionalDisciplines(
    baseTeacher(),
    rows("musculation", "entrainement_prive"),
  );
  assert.equal(teacherMatchesExploreSearch(teacher, "Coach sportif"), true);
  assert.equal(teacherMatchesExploreSearch(teacher, "coach_sportif"), true);
  assert.equal(teacherMatchesExploreSearch(teacher, "fitness"), true);

  const pool = filterTeacherPool([teacher], { searchQuery: "Coach sportif" });
  assert.equal(pool.length, 1);
});

test("specific specialty searches still match and outrank parent expansion", () => {
  const muscu = applyAdditionalDisciplines(baseTeacher({ id: "muscu-1", name: "Muscu Pro" }), rows("musculation"));
  const onlyYoga = applyAdditionalDisciplines(baseTeacher({ id: "yoga-1", name: "Yoga Pro" }), rows("yoga"));
  const pt = applyAdditionalDisciplines(
    baseTeacher({ id: "pt-1", name: "PT Pro" }),
    rows("entrainement_prive"),
  );
  const conditioning = applyAdditionalDisciplines(
    baseTeacher({ id: "cond-1", name: "Cond Pro" }),
    rows("conditionnement_physique"),
  );

  assert.equal(teacherMatchesExploreSearch(muscu, "Musculation"), true);
  assert.equal(teacherMatchesExploreSearch(pt, "Entraînement privé"), true);
  assert.equal(teacherMatchesExploreSearch(pt, "personal training"), true);
  assert.equal(teacherMatchesExploreSearch(conditioning, "Conditionnement physique"), true);

  // Exact musculation score > coach_sportif parent expansion on yoga teacher.
  assert.ok(
    computeTeacherSearchMatchScore(muscu, "musculation") >
      computeTeacherSearchMatchScore(onlyYoga, "coach sportif"),
  );
  assert.equal(computeTeacherSearchMatchScore(muscu, "musculation"), 250);
  assert.equal(computeTeacherSearchMatchScore(onlyYoga, "Coach sportif"), 170);
});

test("leaf specialty does not expand to whole coach_sportif group", () => {
  const expanded = getExpandedDisciplineSearchIds("musculation");
  assert.equal(expanded.size, 1);
  assert.ok(expanded.has("musculation"));
  assert.equal(expanded.has("yoga"), false);
});

test("fitness aliases aquagym / personal training still resolve", () => {
  assert.equal(resolveDisciplineId("aquagym"), "aquaforme");
  assert.equal(resolveDisciplineId("aquafitness"), "aquaforme");
  assert.equal(resolveDisciplineId("personal trainer"), "entrainement_prive");
  const aqua = applyAdditionalDisciplines(baseTeacher(), rows("aquaforme"));
  assert.equal(teacherMatchesExploreSearch(aqua, "Coach sportif"), true);
  assert.equal(teacherMatchesExploreSearch(aqua, "aquagym"), true);
});

test("quoi autosuggest: muscu / entraînement / coach sportif are useful", () => {
  const muscu = searchSubjectBuckets("muscu", { locale: "fr", limit: 8 });
  assert.ok(muscu.some((m) => m.bucket.canonicalId === "strength_training"));
  assert.equal(muscu[0]?.bucket.canonicalId, "strength_training");

  const entrain = searchSubjectBuckets("entraînement", { locale: "fr", limit: 8 });
  assert.ok(entrain.some((m) => m.bucket.canonicalId === "personal_training"));

  const cond = searchSubjectBuckets("conditionnement", { locale: "fr", limit: 8 });
  assert.ok(cond.some((m) => m.bucket.canonicalId === "conditioning"));

  const coach = searchSubjectBuckets("coach sportif", { locale: "fr", limit: 8 });
  assert.ok(coach.some((m) => m.bucket.canonicalId === "coach_trainer"));
});

test("existing categories do not regress to Musique", () => {
  assert.equal(resolveDisciplineId("espagnol"), "espagnol");
  assert.equal(resolveDisciplineId("piano"), "piano");
  assert.equal(resolveDisciplineId("guitare"), "guitare");
  assert.equal(resolveDisciplineId("tutorat"), "tuteurs");
  const piano = applyAdditionalDisciplines(baseTeacher({ category: "Musique" }), rows("piano"));
  assert.equal(teacherMatchesExploreSearch(piano, "Coach sportif"), false);
  assert.equal(teacherMatchesExploreSearch(piano, "Piano"), true);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacherSearch:teacherSportGroupSearchExpansion] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
