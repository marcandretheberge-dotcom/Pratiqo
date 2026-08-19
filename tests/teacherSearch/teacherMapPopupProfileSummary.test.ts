/**
 * Map popup + profile "En bref" summary must use real teacher data:
 * full discipline list, conditional cards, no placeholder dashes.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Teacher } from "../../types";
import {
  applyAdditionalDisciplines,
  type TeacherDisciplineRow,
} from "../../lib/teacherMapper";
import {
  getTeacherCompactFormatLabel,
  getTeacherDisciplineDisplayItems,
  getTeacherDisciplineSummary,
  getTeacherPrimaryPriceLabel,
  getTeacherProfileSummaryCardIds,
  getTeacherSpokenLanguageLabels,
  teacherShowsDiscoveryLesson,
} from "../../lib/teachers/display";

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
    category: "Langues",
    rating: 5,
    reviews: 2,
    distance: 1.4,
    pricePerLesson: 70,
    bio: "Professeure.",
    imageUrl: "https://cdn.example.com/eloise.webp",
    availability: ["Lun. AM"],
    location: { lat: 45.5, lng: -73.6 },
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: [],
    identityVerified: true,
    diplomaVerified: true,
    verifiedExperience: true,
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

const MAP_SRC = read("components/SearchMapView.tsx");
const PROFILE_SRC = read("components/TeacherProfile.tsx");

test("map popup uses full discipline summary, not only teacher.discipline", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [
    row("francais"),
    row("aide_aux_devoirs"),
    row("photographie"),
  ]);
  assert.equal(getTeacherDisciplineSummary(teacher), "Français · Aide aux devoirs · Photographie");
  assert.match(MAP_SRC, /getTeacherDisciplineSummary\(teacher\)/);
  assert.doesNotMatch(MAP_SRC, /selectedTeacher\.discipline/);
  assert.doesNotMatch(MAP_SRC, /\{teacher\.discipline\}/);
});

test("map popup shows +N when more than 3 disciplines", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [
    row("francais"),
    row("aide_aux_devoirs"),
    row("photographie"),
    row("mise_en_forme"),
    row("theatre"),
  ]);
  assert.equal(
    getTeacherDisciplineSummary(teacher),
    "Français · Aide aux devoirs · Photographie +2",
  );
});

test("map popup shows a compact identity checkmark instead of trust pills", () => {
  assert.doesNotMatch(MAP_SRC, /getCompactTeacherBadges/);
  assert.doesNotMatch(MAP_SRC, /<TeacherBadgePill/);
  assert.match(MAP_SRC, /<TeacherCardIdentityCheck verified=\{identityVerified\}/);
  assert.match(MAP_SRC, /teacherCardNew/);
  assert.doesNotMatch(MAP_SRC, /teacherBadgeNewTeacher/);
  assert.doesNotMatch(MAP_SRC, /t\(["']teacherPriceFrom["']\)/);
});

test("map popup does not expose private address", () => {
  assert.doesNotMatch(MAP_SRC, /location\.address/);
  assert.doesNotMatch(MAP_SRC, /teacher\.location\.address/);
  assert.doesNotMatch(MAP_SRC, /neighborhood/);
});

test("profile summary does not show trial lesson when introSessionEnabled is false", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher({ introSessionEnabled: false }), [
    row("francais"),
  ]);
  assert.equal(teacherShowsDiscoveryLesson(teacher), false);
  assert.ok(!getTeacherProfileSummaryCardIds(teacher).includes("discovery"));
  assert.match(PROFILE_SRC, /summaryCardIds\.includes\("discovery"\)/);
  assert.doesNotMatch(PROFILE_SRC, /t\("trialLesson"\)/);
});

test("profile summary shows Cours découverte when introSessionEnabled is true", () => {
  const teacher = applyAdditionalDisciplines(
    baseTeacher({ introSessionEnabled: true, introSessionDurationMinutes: 45 }),
    [row("francais")],
  );
  assert.ok(getTeacherProfileSummaryCardIds(teacher).includes("discovery"));
  assert.match(PROFILE_SRC, /discoveryLessonLabel/);
});

test("profile summary does not show Languages card when teacher.languages is empty", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher({ languages: [] }), [row("francais")]);
  assert.equal(getTeacherSpokenLanguageLabels(teacher).length, 0);
  assert.ok(!getTeacherProfileSummaryCardIds(teacher).includes("languages"));
  const dashed = applyAdditionalDisciplines(baseTeacher({ languages: ["—", ""] }), [row("francais")]);
  assert.ok(!getTeacherProfileSummaryCardIds(dashed).includes("languages"));
});

test("profile summary does not show Levels card when teacher.levels is empty", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher({ levels: [] }), [row("francais")]);
  assert.ok(!getTeacherProfileSummaryCardIds(teacher).includes("levels"));
  const dashed = applyAdditionalDisciplines(baseTeacher({ levels: ["-"] }), [row("francais")]);
  assert.ok(!getTeacherProfileSummaryCardIds(dashed).includes("levels"));
});

test("profile summary shows Disciplines using teacher.disciplineDisplay", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [
    row("francais"),
    row("aide_aux_devoirs"),
    row("photographie"),
  ]);
  assert.deepEqual(
    getTeacherDisciplineDisplayItems(teacher).map((d) => d.label),
    ["Français", "Aide aux devoirs", "Photographie"],
  );
  assert.ok(getTeacherProfileSummaryCardIds(teacher).includes("disciplines"));
  assert.match(PROFILE_SRC, /getTeacherDisciplineSummary\(teacher\)/);
  assert.match(PROFILE_SRC, /getTeacherProfileDisciplineChips/);
  assert.doesNotMatch(
    PROFILE_SRC,
    /uppercase tracking-widest rounded-full[\s\S]{0,80}\{teacher\.category\}/,
  );
});

test("profile summary does not display dash placeholder", () => {
  assert.doesNotMatch(PROFILE_SRC, /\|\| "—"/);
  assert.doesNotMatch(PROFILE_SRC, /\?\? "—"/);
  const teacher = applyAdditionalDisciplines(baseTeacher({ discipline: "—", languages: ["—"], levels: ["—"] }), [
    row("francais"),
    row("photographie"),
  ]);
  const labels = getTeacherDisciplineDisplayItems(teacher).map((d) => d.label);
  assert.ok(!labels.includes("—"));
  assert.ok(!getTeacherProfileSummaryCardIds(teacher).includes("languages"));
  assert.ok(!getTeacherProfileSummaryCardIds(teacher).includes("levels"));
});

test("legacy teacher without disciplineDisplay still displays a useful discipline fallback", () => {
  const teacher = applyAdditionalDisciplines(
    baseTeacher({ discipline: "Piano", category: "Musique", teachingMode: "online" }),
    [],
  );
  assert.equal(getTeacherDisciplineSummary(teacher), "Piano");
  assert.equal(getTeacherDisciplineDisplayItems(teacher)[0]?.label, "Piano");

  const stale = applyAdditionalDisciplines(
    baseTeacher({ discipline: "—", category: "Scolaire" }),
    [],
  );
  assert.notEqual(getTeacherDisciplineSummary(stale), "—");
  assert.equal(getTeacherDisciplineSummary(stale), "Tuteurs académiques");
});

test("format helper returns compact hybrid label for both+home teachers", () => {
  const teacher = baseTeacher({ teachingMode: "both", homeLessonEnabled: true });
  assert.equal(
    getTeacherCompactFormatLabel(teacher, {
      online: "En ligne",
      inPerson: "Présentiel",
      home: "À domicile",
      hybrid: "Hybride",
    }),
    "Hybride",
  );
});

test("price helper uses legacy hourly rate until offers launch", () => {
  const teacher = baseTeacher({ pricePerLesson: 70 });
  assert.equal(
    getTeacherPrimaryPriceLabel(teacher, {
      formattedPrice: "70 CAD",
      fromTemplate: "À partir de {price}",
    }),
    "À partir de 70 CAD",
  );
});

test("map popup keeps Voir le profil CTA and close control", () => {
  assert.match(MAP_SRC, /t\("viewProfile"\)/);
  assert.match(MAP_SRC, /accessibilityCloseDialog/);
  assert.match(MAP_SRC, /pointer-events-none fixed/);
  assert.match(MAP_SRC, /pointer-events-auto/);
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[teacher-map-popup-profile-summary] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
