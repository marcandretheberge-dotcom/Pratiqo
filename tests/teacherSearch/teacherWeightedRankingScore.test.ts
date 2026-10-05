/**
 * Weighted teacher search ranking: trust + distance + photo quality + bio.
 * Visibility gates are intentionally unchanged.
 */
import assert from "node:assert/strict";
import type { Teacher } from "@/types";
import {
  compareTeachersBySearchQuality,
  computeTeacherBioScore,
  computeTeacherPhotoScore,
  computeTeacherProximityScore,
  computeTeacherSearchScore,
  computeTeacherTrustScore,
  teacherHasUsableProfilePhoto,
} from "@/lib/teachers/searchRanking";
import { getTeacherPhotoQualityKind } from "@/lib/teacherPhoto";
import { isTeacherMarketplaceVisibleRow } from "@/lib/teachers/marketplaceVisibility";
import { sortRows, buildTeacherSearchRows, filterTeacherPool, applyRadiusFilter } from "@/lib/teacherSearchEngine";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function baseTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Teacher A",
    discipline: "Langues",
    category: "Langues",
    rating: 0,
    reviews: 0,
    distance: 0,
    pricePerLesson: 45,
    bio: "Professeure expérimentée de langues avec une approche claire et motivante pour tous les niveaux.",
    imageUrl: "https://xyz.supabase.co/storage/v1/object/public/avatars/teacher-a.webp",
    availability: ["Lun Matin"],
    location: { lat: 45.5, lng: -73.5 },
    city: "Montréal",
    region: "QC",
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: ["débutant"],
    identityVerified: false,
    diplomaVerified: false,
    verifiedExperience: false,
    verificationLevel: 1,
    ...overrides,
  };
}

const founders = new Set(["founder-weak", "founder-strong"]);

test("photo quality: uploaded > Google OAuth > none/picsum", () => {
  const uploaded = "https://abc.supabase.co/storage/v1/object/public/avatars/x.webp";
  const google = "https://lh3.googleusercontent.com/a/photo=s96-c";
  assert.equal(getTeacherPhotoQualityKind(uploaded), "uploaded");
  assert.equal(getTeacherPhotoQualityKind(google), "google_oauth");
  assert.equal(getTeacherPhotoQualityKind("https://picsum.photos/seed/x/400/400"), "placeholder");
  assert.equal(getTeacherPhotoQualityKind(""), "none");
  assert.ok(computeTeacherPhotoScore(uploaded) > computeTeacherPhotoScore(google));
  assert.ok(computeTeacherPhotoScore(google) > computeTeacherPhotoScore(""));
  assert.equal(computeTeacherPhotoScore("https://picsum.photos/seed/x/400/400"), 0);
  assert.equal(teacherHasUsableProfilePhoto("https://picsum.photos/seed/x/400/400"), false);
});

test("bio quality scores length buckets and rejects placeholders", () => {
  assert.equal(computeTeacherBioScore(""), 0);
  assert.equal(computeTeacherBioScore("n/a"), 0);
  assert.equal(computeTeacherBioScore("trop court"), 10);
  assert.ok(computeTeacherBioScore("Bio assez longue pour compter dans le classement qualité.") >= 45);
  assert.ok(
    computeTeacherBioScore(
      "Bio assez longue pour compter dans le classement qualité avec encore plus de détails pédagogiques pour dépasser cent caractères facilement.",
    ) >= 70,
  );
});

test("identity verified outranks unverified when other fields similar", () => {
  const verified = baseTeacher({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    identityVerified: true,
    verificationLevel: 2,
  });
  const unverified = baseTeacher({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    identityVerified: false,
    verificationLevel: 1,
  });
  assert.ok(computeTeacherTrustScore(verified) > computeTeacherTrustScore(unverified));
  assert.ok(compareTeachersBySearchQuality(verified, unverified) < 0);
});

test("diploma and verified experience boost trust ranking", () => {
  const diploma = baseTeacher({
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    diplomaVerified: true,
  });
  const experience = baseTeacher({
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    verifiedExperience: true,
  });
  const plain = baseTeacher({
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  });
  assert.ok(compareTeachersBySearchQuality(diploma, plain) < 0);
  assert.ok(compareTeachersBySearchQuality(experience, plain) < 0);
});

test("uploaded photo + bio + trust outranks Google avatar + weak bio + unverified", () => {
  const strong = baseTeacher({
    id: "11111111-1111-4111-8111-111111111111",
    identityVerified: true,
    verifiedExperience: true,
    imageUrl: "https://abc.supabase.co/storage/v1/object/public/avatars/strong.webp",
    bio: "Professeure expérimentée avec une bio complète et détaillée pour le classement.",
  });
  const weak = baseTeacher({
    id: "22222222-2222-4222-8222-222222222222",
    identityVerified: false,
    verifiedExperience: false,
    imageUrl: "https://lh3.googleusercontent.com/a/weak=s96-c",
    bio: "",
  });
  assert.ok(compareTeachersBySearchQuality(strong, weak) < 0);
});

test("nearby teacher outranks far teacher when quality is similar", () => {
  const near = baseTeacher({ id: "33333333-3333-4333-8333-333333333333" });
  const far = baseTeacher({ id: "44444444-4444-4444-8444-444444444444" });
  assert.ok(
    compareTeachersBySearchQuality(near, far, {
      distanceKmA: 3,
      distanceKmB: 80,
      hasLocationContext: true,
      onlineSearch: false,
    }) < 0,
  );
});

test("online search does not over-prioritize nearby distance", () => {
  const near = baseTeacher({ id: "55555555-5555-4555-8555-555555555555" });
  const far = baseTeacher({
    id: "66666666-6666-4666-8666-666666666666",
    identityVerified: true,
    diplomaVerified: true,
  });
  // Without proximity (online), trust should still let far+trusted win.
  assert.ok(
    compareTeachersBySearchQuality(far, near, {
      distanceKmA: 90,
      distanceKmB: 2,
      onlineSearch: true,
      hasLocationContext: true,
    }) < 0,
  );
  assert.equal(computeTeacherProximityScore(2, { onlineSearch: true }), 0);
});

test("founder boost cannot beat materially stronger trust/quality", () => {
  const founderWeak = baseTeacher({
    id: "founder-weak",
    identityVerified: false,
    imageUrl: "https://lh3.googleusercontent.com/a/f=s96-c",
    bio: "",
  });
  const nonFounderStrong = baseTeacher({
    id: "77777777-7777-4777-8777-777777777777",
    identityVerified: true,
    diplomaVerified: true,
    verifiedExperience: true,
    imageUrl: "https://abc.supabase.co/storage/v1/object/public/avatars/s.webp",
    bio: "Bio complète et détaillée pour le classement qualité fondateur concurrent.",
  });
  assert.ok(
    compareTeachersBySearchQuality(nonFounderStrong, founderWeak, {
      isFounder: (id) => founders.has(id),
    }) < 0,
  );
  assert.equal(computeTeacherSearchScore(founderWeak, { isFounder: (id) => founders.has(id) }).founderScore, 25);
});

test("exact name match dominates strong non-matching peer", () => {
  const named = baseTeacher({
    id: "88888888-8888-4888-8888-888888888888",
    name: "Camille Dupont",
    identityVerified: false,
    imageUrl: "",
    bio: "",
  });
  const other = baseTeacher({
    id: "99999999-9999-4999-8999-999999999999",
    name: "Sam Other",
    identityVerified: true,
    diplomaVerified: true,
  });
  const namedScore = computeTeacherSearchScore(named, { searchQuery: "Camille Dupont" });
  const otherScore = computeTeacherSearchScore(other, { searchQuery: "Camille Dupont" });
  assert.equal(namedScore.searchMatchScore, 400);
  assert.equal(otherScore.searchMatchScore, 0);
  assert.ok(namedScore.total > otherScore.total);
  assert.ok(
    compareTeachersBySearchQuality(named, other, { searchQuery: "Camille Dupont" }) < 0,
  );
});

test("verification level does not overtake exact discipline match alone", () => {
  const disciplineMatch = baseTeacher({
    id: "aaaaaaaa-1111-4111-8111-111111111111",
    name: "Low Trust Yoga",
    discipline: "Yoga",
    identityVerified: false,
    verificationLevel: 0,
  });
  const highTrustOther = baseTeacher({
    id: "bbbbbbbb-2222-4222-8222-222222222222",
    name: "High Trust Piano",
    discipline: "Piano",
    identityVerified: true,
    diplomaVerified: true,
    verifiedExperience: true,
    verificationLevel: 3,
  });
  assert.ok(
    compareTeachersBySearchQuality(disciplineMatch, highTrustOther, { searchQuery: "Yoga" }) < 0,
  );
});

test("UUID is only final tie-breaker when scores equal", () => {
  const a = baseTeacher({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  const b = baseTeacher({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
  const scoreA = computeTeacherSearchScore(a);
  const scoreB = computeTeacherSearchScore(b);
  assert.equal(scoreA.total, scoreB.total);
  assert.ok(compareTeachersBySearchQuality(a, b) < 0);
});

test("sortRows relevance uses weighted score with distance context", () => {
  const teachers = [
    baseTeacher({
      id: "far-unverified",
      identityVerified: false,
      imageUrl: "https://lh3.googleusercontent.com/a/x=s96-c",
      bio: "",
      location: { lat: 45.6, lng: -73.6 },
    }),
    baseTeacher({
      id: "near-verified",
      identityVerified: true,
      verifiedExperience: true,
      location: { lat: 45.501, lng: -73.501 },
    }),
  ];
  const rows = buildTeacherSearchRows(teachers, { geo: { lat: 45.5, lng: -73.5 } });
  const sorted = sortRows(rows, {
    sortMode: "relevance",
    searchQuery: "",
    hasLocationContext: true,
    format: "in_person",
  });
  assert.equal(sorted[0]?.teacher.id, "near-verified");
});

test("no-photo/no-bio/unverified teachers remain marketplace-visible", () => {
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
});

test("bookability outranks a higher score in every sort mode, including unknown readiness", () => {
  const ready = baseTeacher({ id: "ready", bookingReady: true, imageUrl: "", bio: "", verificationLevel: 0 });
  const unavailable = baseTeacher({ id: "unavailable", bookingReady: false, identityVerified: true, diplomaVerified: true, verifiedExperience: true });
  const unknown = { ...unavailable, id: "unknown", bookingReady: null };
  assert.ok(computeTeacherSearchScore(unavailable).total > computeTeacherSearchScore(ready).total);
  assert.ok(compareTeachersBySearchQuality(ready, unavailable) < 0);
  for (const sortMode of ["relevance", "nearest", "trusted"] as const) {
    const sorted = sortRows([{ teacher: unavailable, distanceKm: 1 }, { teacher: unknown, distanceKm: 1 }, { teacher: ready, distanceKm: 90 }], { sortMode });
    assert.equal(sorted[0].teacher.id, "ready");
    assert.equal(sorted.length, 3);
  }
});

test("no-filter bookable ranking remains cumulative, deterministic and does not require reviews", () => {
  const newcomer = baseTeacher({ id: "new", bookingReady: true, reviews: 0, identityVerified: true, diplomaVerified: true });
  const reviewed = baseTeacher({ id: "old", bookingReady: true, rating: 5, reviews: 100, imageUrl: "", bio: "" });
  const twin = { ...newcomer, id: "aaa" };
  const order = (teachers: Teacher[]) => sortRows(buildTeacherSearchRows(teachers, { geo: null }), { sortMode: "relevance" }).map((row) => row.teacher.id);
  assert.ok(computeTeacherSearchScore(newcomer).total > computeTeacherSearchScore(reviewed).total);
  assert.deepEqual(order([reviewed, newcomer, twin]), ["aaa", "new", "old"]);
  assert.deepEqual(order([twin, newcomer, reviewed]), ["aaa", "new", "old"]);
});

test("booking priority cannot bypass discipline, format or radius filters", () => {
  const match = baseTeacher({ id: "match", discipline: "Piano", teachingMode: "person", bookingReady: false });
  const wrongDiscipline = { ...match, id: "guitar", discipline: "Guitare", bookingReady: true };
  const wrongFormat = { ...match, id: "online", teachingMode: "online" as const, bookingReady: true };
  const far = { ...match, id: "far", bookingReady: true };
  const filtered = filterTeacherPool([match, wrongDiscipline, wrongFormat, far], { searchQuery: "piano", format: "in_person" });
  const rows = applyRadiusFilter(filtered.map((teacher) => ({ teacher, distanceKm: teacher.id === "far" ? 100 : 2 })), 5);
  assert.deepEqual(sortRows(rows, { sortMode: "relevance" }).map((row) => row.teacher.id), ["match"]);
});

test("online ignores distance even in nearest mode; explicit local format overrides saved online preference", () => {
  const strong = baseTeacher({ id: "far", bookingReady: true, identityVerified: true });
  const weak = baseTeacher({ id: "near", bookingReady: true });
  const rows = [{ teacher: weak, distanceKm: 1 }, { teacher: strong, distanceKm: 500 }];
  assert.equal(sortRows(rows, { sortMode: "nearest", format: "online" })[0].teacher.id, "far");
  const prefs = { country_code: null, timezone: null, currency: null, city: null, region: null, preferred_learning_format: "online" };
  assert.equal(sortRows(rows, { sortMode: "nearest", format: "in_person", studentPrefs: prefs })[0].teacher.id, "near");
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[teacherSearch:teacherWeightedRankingScore] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
