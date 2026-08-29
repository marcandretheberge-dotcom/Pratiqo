/**
 * Public search ranking quality: photo-first, founder within groups, completeness.
 * Visibility gates are intentionally unchanged.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Teacher } from "@/types";
import {
  compareTeachersBySearchQuality,
  computeTeacherProfileCompletenessScore,
  teacherHasUsableProfilePhoto,
  teacherMatchesExactNameQuery,
} from "@/lib/teachers/searchRanking";
import { sortRows, buildTeacherSearchRows } from "@/lib/teacherSearchEngine";
import { isTeacherMarketplaceVisibleRow } from "@/lib/teachers/marketplaceVisibility";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function baseTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Teacher A",
    discipline: "Langues",
    category: "Langues",
    rating: 4,
    reviews: 1,
    distance: 0,
    pricePerLesson: 45,
    bio: "Professeure expérimentée de langues avec une approche claire et motivante.",
    imageUrl: "https://cdn.example.com/a.webp",
    availability: ["Lun Matin"],
    location: { lat: 45.5, lng: -73.5 },
    city: "Montréal",
    region: "QC",
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: ["débutant"],
    ...overrides,
  };
}

const founders = new Set(["founder-with-photo", "founder-no-photo", "founder-incomplete"]);

test("picsum / empty image is not a usable profile photo", () => {
  assert.equal(teacherHasUsableProfilePhoto(""), false);
  assert.equal(teacherHasUsableProfilePhoto("https://picsum.photos/seed/teacher/400/400"), false);
  assert.equal(teacherHasUsableProfilePhoto("https://cdn.example.com/real.webp"), true);
});

test("teacher with photo ranks before teacher without photo", () => {
  const withPhoto = baseTeacher({
    id: "with-photo",
    imageUrl: "https://cdn.example.com/real.webp",
  });
  const noPhoto = baseTeacher({
    id: "no-photo",
    imageUrl: "https://picsum.photos/seed/x/400/400",
    bio: withPhoto.bio,
    pricePerLesson: 90,
    rating: 5,
  });
  assert.ok(compareTeachersBySearchQuality(withPhoto, noPhoto) < 0);
});

test("non-founder with photo ranks before founder without photo", () => {
  const nonFounderPhoto = baseTeacher({
    id: "regular-photo",
    imageUrl: "https://cdn.example.com/regular.webp",
  });
  const founderNoPhoto = baseTeacher({
    id: "founder-no-photo",
    imageUrl: "",
    bio: nonFounderPhoto.bio,
  });
  assert.ok(
    compareTeachersBySearchQuality(nonFounderPhoto, founderNoPhoto, {
      isFounder: (id) => founders.has(id),
    }) < 0,
  );
});

test("founder with photo ranks before non-founder with photo when quality is similar", () => {
  const founder = baseTeacher({
    id: "founder-with-photo",
    imageUrl: "https://cdn.example.com/f.webp",
  });
  const regular = baseTeacher({
    id: "regular-with-photo",
    imageUrl: "https://cdn.example.com/r.webp",
  });
  assert.ok(
    compareTeachersBySearchQuality(founder, regular, {
      isFounder: (id) => founders.has(id),
    }) < 0,
  );
});

test("among founders, more complete profile ranks above incomplete", () => {
  const complete = baseTeacher({
    id: "founder-with-photo",
    imageUrl: "https://cdn.example.com/c.webp",
    bio: "Bio complète et détaillée pour le classement qualité fondateur.",
    availability: ["Lun"],
    pricePerLesson: 50,
  });
  const incomplete = baseTeacher({
    id: "founder-incomplete",
    imageUrl: "https://cdn.example.com/i.webp",
    bio: "",
    availability: [],
    pricePerLesson: 20,
    city: null,
    region: null,
    location: { lat: 0, lng: 0 },
    teachingMode: "person",
  });
  assert.ok(computeTeacherProfileCompletenessScore(complete) > computeTeacherProfileCompletenessScore(incomplete));
  assert.ok(
    compareTeachersBySearchQuality(complete, incomplete, {
      isFounder: (id) => founders.has(id),
    }) < 0,
  );
});

test("no-photo teachers remain marketplace-visible (ranking only)", () => {
  assert.equal(
    isTeacherMarketplaceVisibleRow({
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      is_public: true,
      discipline: "Langues",
      category: "Langues",
      discipline_count: 1,
      deactivated_at: null,
      deleted_at: null,
    }),
    true,
  );
  const src = read("lib/teachers/marketplaceVisibility.ts");
  assert.doesNotMatch(src, /image_url|photo|picsum/);
});

test("exact name query can surface a no-photo teacher above a photo non-match", () => {
  const named = baseTeacher({
    id: "named-no-photo",
    name: "Camille Dupont",
    imageUrl: "",
  });
  const other = baseTeacher({
    id: "other-photo",
    name: "Sam Other",
    imageUrl: "https://cdn.example.com/sam.webp",
  });
  assert.equal(teacherMatchesExactNameQuery(named, "Camille Dupont"), true);
  assert.ok(
    compareTeachersBySearchQuality(named, other, { searchQuery: "Camille Dupont" }) < 0,
  );
});

test("sortRows relevance applies photo-first quality ordering", () => {
  const teachers = [
    baseTeacher({
      id: "z-no-photo",
      name: "Zed",
      imageUrl: "https://picsum.photos/seed/z/400/400",
      rating: 5,
    }),
    baseTeacher({
      id: "a-photo",
      name: "Ann",
      imageUrl: "https://cdn.example.com/ann.webp",
      rating: 3,
    }),
  ];
  const rows = buildTeacherSearchRows(teachers, { geo: null });
  const sorted = sortRows(rows, { sortMode: "relevance", searchQuery: "" });
  assert.equal(sorted[0]?.teacher.id, "a-photo");
  assert.equal(sorted[1]?.teacher.id, "z-no-photo");
});

test("search surfaces wire searchQuery into sortRows", () => {
  const searchPage = read("app/(app)/student/search/page.tsx");
  assert.match(searchPage, /sortRows\(filtered,\s*\{\s*sortMode,\s*searchQuery,\s*studentPrefs\s*\}\)/);
  const landing = read("app/LandingPageClient.tsx");
  assert.match(landing, /searchQuery/);
  assert.match(landing, /sortRows\(/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacherSearch:teacherSearchRankingQuality] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
