import assert from "node:assert/strict";
import type { Teacher, TeacherTeachingZone } from "@/types";
import { buildTeacherSearchRows } from "@/lib/teacherSearchEngine";
import { getTeacherMapCoords } from "@/lib/teacherTeachingZones";
import { diagnoseTeacherSearchVisibility } from "@/lib/teachers/searchVisibilityDiagnostics";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const baseTeacher: Teacher = {
  id: "teacher-1",
  userId: "user-1",
  name: "Marie D.",
  discipline: "Piano",
  category: "Musique",
  bio: "Cours clairs.",
  imageUrl: "",
  rating: 0,
  reviews: 0,
  pricePerLesson: 45,
  currency: "CAD",
  availability: ["Lun soir"],
  languages: ["fr"],
  levels: [],
  teachingMode: "person",
  location: { lat: 45.5017, lng: -73.5673, neighborhood: "Montréal" },
  city: "Montréal",
  region: "QC",
  countryCode: "CA",
  isVerified: false,
  verificationLevel: 0,
  introSessionEnabled: false,
  introSessionPriceCents: null,
  introSessionDurationMinutes: 45,
  introSessionDiscountPercent: null,
  homeLessonEnabled: false,
  homeLessonRadiusKm: null,
  homeLessonPrice: null,
};

const zones: TeacherTeachingZone[] = [
  {
    id: "zone-mtl",
    teacherId: "teacher-1",
    labelPublic: "Montréal centre",
    city: "Montréal",
    region: "QC",
    countryCode: "CA",
    lat: 45.5017,
    lng: -73.5673,
    radiusKm: 10,
    zoneKind: "primary_base",
    isPrimary: true,
    isActive: true,
    sortOrder: 0,
    availabilityNotePublic: null,
    supportsAtTeacherPlace: false,
    supportsAtStudentPlace: true,
    supportsPublicPlace: false,
  },
  {
    id: "zone-qc",
    teacherId: "teacher-1",
    labelPublic: "Québec fin de semaine",
    city: "Québec",
    region: "QC",
    countryCode: "CA",
    lat: 46.8139,
    lng: -71.208,
    radiusKm: 15,
    zoneKind: "weekend_city",
    isPrimary: false,
    isActive: true,
    sortOrder: 1,
    availabilityNotePublic: "Fins de semaine",
    supportsAtTeacherPlace: false,
    supportsAtStudentPlace: true,
    supportsPublicPlace: true,
  },
];

test("search matches nearest teaching zone instead of legacy single location", () => {
  const teacher = { ...baseTeacher, teachingZones: zones };
  const [row] = buildTeacherSearchRows([teacher], { geo: { lat: 46.8, lng: -71.2 } });
  assert.equal(row.matchedTeachingZone?.id, "zone-qc");
  assert.equal(row.teacher.matchedTeachingZone?.id, "zone-qc");
  assert.ok(row.distanceKm != null && row.distanceKm < 5);
});

test("map coords prefer matched zone then primary zone then legacy location", () => {
  const teacher = { ...baseTeacher, teachingZones: zones, matchedTeachingZone: zones[1] };
  assert.deepEqual(getTeacherMapCoords(teacher), { lat: 46.8139, lng: -71.208 });
  assert.deepEqual(getTeacherMapCoords({ ...teacher, matchedTeachingZone: null }), { lat: 45.5017, lng: -73.5673 });
  assert.deepEqual(getTeacherMapCoords({ ...baseTeacher, teachingZones: [] }), { lat: 45.5017, lng: -73.5673 });
});

test("location text can match a secondary teaching zone", () => {
  const teacher = { ...baseTeacher, teachingZones: zones };
  const [row] = buildTeacherSearchRows([teacher], {
    geo: null,
    locationText: { city: "Québec", region: "QC" },
  });
  assert.equal(row.matchedTeachingZone?.id, "zone-qc");
});

test("diagnostic treats public teaching zone as public location signal", () => {
  const result = diagnoseTeacherSearchVisibility({
    profile: { id: "user-1", role: "teacher", is_active: true },
    teacher: {
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      name: "Marie D.",
      discipline: "Piano",
      category: "Musique",
      bio: "Cours clairs.",
      availability: ["Lun soir"],
      price_per_lesson: 45,
      teaching_mode: "person",
      city: null,
      region: null,
      country_code: "CA",
      location: {},
      is_public: true,
      marketplace_discovery_opt_out: false,
      publicTeachingZones: [{ city: "Québec", labelPublic: "Québec fin de semaine" }],
    },
    disciplineCount: 1,
  });
  assert.equal(result.visibleInSearch, true);
  assert.equal(result.warningReasonCodes.includes("WARNING_MISSING_PUBLIC_LOCATION_OR_ONLINE"), false);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log(`[teacherSearch:multiZone] ${tests.length} tests passed`);
