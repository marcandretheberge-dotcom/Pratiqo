import assert from "node:assert/strict";
import { applyMapBoundsFilter } from "@/features/marketplace/searchRows";
import { computeMarketplaceResults } from "@/features/marketplace/utils/computeMarketplaceResults";
import { createDefaultMarketplaceAdvancedFilters } from "@/features/marketplace/types";
import type { Teacher } from "@/types";
import type { TeacherSearchRow } from "@/lib/teacherSearchEngine";

function row(id: string, lat: number | null, lng: number | null): TeacherSearchRow {
  return {
    teacher: {
      id,
      location:
        typeof lat === "number" && typeof lng === "number"
          ? { lat, lng }
          : null,
    } as Teacher,
    distanceKm: null,
  };
}

const rows = [
  row("inside", 45.5, -73.6),
  row("north", 46.1, -73.6),
  row("west", 45.5, -74.2),
  row("missing", null, null),
];

const montrealBounds = {
  ne: { lat: 45.7, lng: -73.3 },
  sw: { lat: 45.3, lng: -73.9 },
};

assert.deepEqual(
  applyMapBoundsFilter(rows, montrealBounds).map((x) => x.teacher.id),
  ["inside"],
);

const antimeridianRows = [
  row("east", 0, 179.5),
  row("west", 0, -179.5),
  row("outside", 0, 170),
];

const antimeridianBounds = {
  ne: { lat: 1, lng: -178 },
  sw: { lat: -1, lng: 178 },
};

assert.deepEqual(
  applyMapBoundsFilter(antimeridianRows, antimeridianBounds).map((x) => x.teacher.id),
  ["east", "west"],
);

assert.equal(applyMapBoundsFilter(rows, null), rows);

function teacher(overrides: Partial<Teacher> & Pick<Teacher, "id" | "name" | "discipline">): Teacher {
  return {
    category: "Musique",
    teachingMode: "person",
    pricePerLesson: 50,
    rating: 4.5,
    reviews: 0,
    availability: [],
    location: { lat: 45.5, lng: -73.6 },
    isVerified: false,
    identityVerified: false,
    verificationLevel: 0,
    ...overrides,
  } as Teacher;
}

const pianoTeacher = teacher({
  id: "piano",
  name: "Alice Piano",
  discipline: "Piano",
  teachingMode: "online",
  pricePerLesson: 45,
  rating: 4.9,
  isVerified: true,
  identityVerified: true,
  verificationLevel: 2,
});
const guitarTeacher = teacher({
  id: "guitar",
  name: "Bruno Guitare",
  discipline: "Guitare",
  teachingMode: "person",
  pricePerLesson: 70,
  rating: 4.1,
  location: { lat: 46.8, lng: -71.2 },
});
const mathTeacher = teacher({
  id: "math",
  name: "Carla Maths",
  discipline: "Mathématiques",
  category: "Tuteurs académiques",
  teachingMode: "person",
  pricePerLesson: 35,
  rating: 4.7,
  location: { lat: 45.55, lng: -73.7 },
});
const marketplaceTeachers = [pianoTeacher, guitarTeacher, mathTeacher];

function computeIds(patch: Parameters<typeof computeMarketplaceResults>[0]) {
  return computeMarketplaceResults(patch).map((x) => x.teacher.id);
}

const baseState = {
  teachers: marketplaceTeachers,
  searchQuery: "",
  activeCat: "All",
  geo: null,
  sortMode: "relevance" as const,
  mapBounds: null,
  formatFilter: "all" as const,
  advancedFilters: createDefaultMarketplaceAdvancedFilters(),
};

assert.deepEqual(
  computeIds({ ...baseState, searchQuery: "piano" }),
  ["piano"],
  "query filtering should match teacher disciplines",
);

assert.deepEqual(
  computeIds({ ...baseState, activeCat: "Tuteurs académiques" }),
  ["math"],
  "category filtering should match teacher category/discipline groups",
);

assert.deepEqual(
  computeIds({ ...baseState, formatFilter: "online" }),
  ["piano"],
  "format filtering should keep only online-compatible teachers",
);

assert.deepEqual(
  computeIds({
    ...baseState,
    advancedFilters: { ...baseState.advancedFilters, verifiedOnly: true },
  }),
  ["piano"],
  "verified filtering should keep Pratiqo-verified teachers",
);

assert.deepEqual(
  computeIds({
    ...baseState,
    advancedFilters: { ...baseState.advancedFilters, minRating: "4.8", maxPrice: "50" },
  }),
  ["piano"],
  "rating and price filters should apply together",
);

assert.deepEqual(
  computeIds({
    ...baseState,
    mapBounds: montrealBounds,
  }),
  ["piano", "math"],
  "map bounds filtering should keep teachers inside the selected viewport",
);

console.log("[marketplace:test] ok - filters teacher rows and computes marketplace results");
