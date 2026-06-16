import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTeacherPublicPhoto, isPublicAvatarPhotoUrl, normalizeTeacherImageUrl } from "../../lib/teacherPhoto";
import { applyTeacherListingMetadata } from "../../lib/teacherListingMetadata";
import { getTeacherImageUrl } from "../../lib/images";
import { isLaunchEligibleTeacherRow, teacherRowToTeacher, type TeacherRow } from "../../lib/teacherMapper";
import type { Teacher } from "../../types";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const REAL_TEACHER_ID = "afe6eab4-f40d-4d84-add9-8e061184ef6f";
const REAL_USER_ID = "0bbed16d-e677-47b3-9c87-03fca0109704";
const REAL_AVATAR_URL =
  "https://jwlbwmxoradmbuvqfkhe.supabase.co/storage/v1/object/public/avatars/0bbed16d-e677-47b3-9c87-03fca0109704/1779594944501-20240220_183240.jpg";

function teacherRow(overrides: Partial<TeacherRow> = {}): TeacherRow {
  return {
    id: REAL_TEACHER_ID,
    user_id: REAL_USER_ID,
    name: "Marc-Andre Theberge",
    discipline: "Piano",
    category: "Musique",
    rating: 0,
    reviews: 0,
    price_per_lesson: 45,
    monthly_subscription: null,
    bio: "Professeur de musique.",
    image_url: "https://picsum.photos/seed/teacher/400/400",
    availability: [],
    location: {},
    is_verified: false,
    teaching_mode: "both",
    languages: [],
    levels: [],
    ...overrides,
  };
}

function teacherEntity(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: REAL_TEACHER_ID,
    name: "Marc-Andre Theberge",
    discipline: "Piano",
    category: "Musique",
    rating: 0,
    reviews: 0,
    distance: 0,
    pricePerLesson: 45,
    bio: "Bio",
    imageUrl: "https://cdn.example.com/from-view.webp",
    availability: [],
    location: { lat: 0, lng: 0 },
    isVerified: false,
    teachingMode: "both",
    languages: [],
    levels: [],
    ...overrides,
  };
}

test("resolveTeacherPublicPhoto prefers profiles.photo_url over teachers.image_url", () => {
  const url = resolveTeacherPublicPhoto(
    "https://example.supabase.co/storage/v1/object/public/avatars/u/photo.webp",
    "https://picsum.photos/seed/teacher/400/400",
  );
  assert.match(url, /avatars\/u\/photo\.webp/);
});

test("resolveTeacherPublicPhoto keeps teachers.image_url when profile photo is empty", () => {
  assert.equal(
    resolveTeacherPublicPhoto(null, "https://cdn.example.com/legacy.webp"),
    "https://cdn.example.com/legacy.webp",
  );
});

test("resolveTeacherPublicPhoto returns empty string when no photo exists (initials fallback in UI)", () => {
  assert.equal(resolveTeacherPublicPhoto(null, null), "");
  assert.equal(resolveTeacherPublicPhoto("  ", ""), "");
});

test("teacherRowToTeacher maps profile_photo_url before image_url", () => {
  const teacher = teacherRowToTeacher(
    teacherRow({
      profile_photo_url: "https://cdn.example.com/uploaded.webp",
      image_url: "https://picsum.photos/seed/teacher/400/400",
    }),
  );
  assert.equal(teacher.imageUrl, "https://cdn.example.com/uploaded.webp");
});

test("student search card passes teacher.imageUrl into TeacherAvatar", () => {
  const src = readFileSync("app/(app)/student/search/page.tsx", "utf8");
  assert.match(src, /TeacherAvatar[\s\S]*imageUrl=\{teacher\.imageUrl\}/);
});

test("student search detail modal passes teacher.imageUrl into TeacherAvatar", () => {
  const src = readFileSync("components/TeacherProfile.tsx", "utf8");
  assert.match(src, /TeacherAvatar[\s\S]*imageUrl=\{teacher\.imageUrl\}/);
});

test("getTeacherImageUrl keeps avatars bucket on object/public (no render rewrite)", () => {
  const optimized = getTeacherImageUrl(REAL_AVATAR_URL, { width: 128, height: 128, format: "webp" });
  assert.equal(optimized, REAL_AVATAR_URL);
  assert.doesNotMatch(optimized, /render\/image/);
});

test("valid teacher.imageUrl survives applyTeacherListingMetadata", () => {
  const merged = applyTeacherListingMetadata([teacherEntity({ imageUrl: REAL_AVATAR_URL })], {
    photos: {},
    plans: { [REAL_TEACHER_ID]: "free" },
    eligibleTeacherIds: [REAL_TEACHER_ID],
  });
  assert.equal(merged[0]?.imageUrl, REAL_AVATAR_URL);
});

test("null/empty plans photo does not erase teacher.imageUrl", () => {
  const merged = applyTeacherListingMetadata([teacherEntity({ imageUrl: REAL_AVATAR_URL })], {
    photos: { [REAL_TEACHER_ID]: "" },
    eligibleTeacherIds: [REAL_TEACHER_ID],
  });
  assert.equal(merged[0]?.imageUrl, REAL_AVATAR_URL);
});

test("normalizeTeacherImageUrl prefers profile_photo_url over imageUrl alias fields", () => {
  assert.equal(
    normalizeTeacherImageUrl({
      imageUrl: "https://cdn.example.com/stale.webp",
      profile_photo_url: REAL_AVATAR_URL,
    }),
    REAL_AVATAR_URL,
  );
});

test("TeacherAvatar falls back to initials only when imageUrl is empty", () => {
  const src = readFileSync("components/TeacherAvatar.tsx", "utf8");
  assert.match(src, /url && !imageFailed/);
  assert.match(src, /initialsFor\(name\)/);
  assert.match(src, /setImageFailed\(true\)/);
});

test("public profile preview still uses raw image_url or photoUrl (direct route)", () => {
  const src = readFileSync("components/teacher/TeacherPublicProfilePreview.tsx", "utf8");
  assert.match(src, /teacher\?\.image_url \|\| photoUrl/);
});

test("founder teacher row maps production avatar URL through teacherRowToTeacher", () => {
  const teacher = teacherRowToTeacher(
    teacherRow({
      profile_photo_url: REAL_AVATAR_URL,
      image_url: REAL_AVATAR_URL,
    }),
  );
  assert.equal(teacher.imageUrl, REAL_AVATAR_URL);
});
  
test("applyTeacherListingMetadata does not replace a profile photo with an empty plans payload", () => {
  const merged = applyTeacherListingMetadata([teacherEntity()], {
    photos: { [REAL_TEACHER_ID]: null },
    plans: { [REAL_TEACHER_ID]: "free" },
    eligibleTeacherIds: [REAL_TEACHER_ID],
  });
  assert.equal(merged[0]?.imageUrl, "https://cdn.example.com/from-view.webp");
});

test("applyTeacherListingMetadata overlays a newer profile photo from /api/teachers/plans", () => {
  const merged = applyTeacherListingMetadata([teacherEntity({ imageUrl: "" })], {
    photos: { [REAL_TEACHER_ID]: "https://cdn.example.com/fresh.webp" },
    eligibleTeacherIds: [REAL_TEACHER_ID],
  });
  assert.equal(merged[0]?.imageUrl, "https://cdn.example.com/fresh.webp");
});

test("launch eligibility keeps real user-linked UUID teachers (founder profile safe)", () => {
  assert.equal(isLaunchEligibleTeacherRow(teacherRow()), true);
});

test("launch eligibility rejects seed/demo rows without a real linked profile", () => {
  assert.equal(isLaunchEligibleTeacherRow(teacherRow({ user_id: null })), false);
  assert.equal(isLaunchEligibleTeacherRow(teacherRow({ id: "1" })), false);
});

test("/student/search reads teachers_public and merges plans metadata safely", () => {
  const src = readFileSync("app/(app)/student/search/page.tsx", "utf8");
  assert.match(src, /TEACHERS_PUBLIC_TABLE/);
  assert.match(src, /TEACHERS_LIST_SELECT/);
  assert.match(src, /applyTeacherListingMetadata/);
  assert.doesNotMatch(src, /photos\[x\.id\] \|\| x\.imageUrl/);
});

test("TEACHERS_LIST_SELECT requests profile_photo_url from teachers_public", () => {
  const src = readFileSync("lib/supabase/queries.ts", "utf8");
  assert.match(src, /profile_photo_url/);
});

test("migration 071 exposes profile_photo_url and filters is_demo rows in teachers_public", () => {
  const migration = readFileSync("supabase/migrations/071_student_search_visibility_photo.sql", "utf8");
  assert.match(migration, /profile_photo_url/);
  assert.match(migration, /is_demo/);
  assert.match(migration, /INNER JOIN public\.profiles p ON p\.id = t\.user_id/);
  assert.match(migration, /COALESCE\(t\.is_demo, false\) = false/);
});

test("plans API excludes is_demo teachers from eligibleTeacherIds", () => {
  const src = readFileSync("app/api/teachers/plans/route.ts", "utf8");
  assert.match(src, /is_demo/);
  assert.match(src, /isTeacherMarketplaceVisibleRow/);
});

test("no name-based or avatar-style fake filtering in student search", () => {
  const src = readFileSync("app/(app)/student/search/page.tsx", "utf8");
  assert.doesNotMatch(src, /\.filter\([^)]*name/i);
  assert.doesNotMatch(src, /\.filter\([^)]*picsum/i);
  assert.doesNotMatch(src, /isLaunchEligibleTeacherRow\([^)]*name/i);
});

test("public name masking still used on student search cards", () => {
  const src = readFileSync("app/(app)/student/search/page.tsx", "utf8");
  assert.match(src, /publicFirstNameWithInitial/);
});

test("student search cards still use PriceDisplay for selected currency", () => {
  const src = readFileSync("app/(app)/student/search/page.tsx", "utf8");
  assert.match(src, /<PriceDisplay/);
});

test("diagnostic SQL lists visibility fields for production triage", () => {
  const sql = readFileSync("scripts/sql/diagnostic_visible_search_teachers.sql", "utf8");
  assert.match(sql, /teacher_id/);
  assert.match(sql, /profiles_photo_url/);
  assert.match(sql, /is_demo/);
  assert.match(sql, /appears_in_search_v071/);
});

test("isPublicAvatarPhotoUrl recognizes avatars bucket URLs", () => {
  assert.equal(
    isPublicAvatarPhotoUrl("https://x.supabase.co/storage/v1/object/public/avatars/u/a.webp"),
    true,
  );
  assert.equal(isPublicAvatarPhotoUrl("https://picsum.photos/seed/x/400/400"), false);
});

test("student search patch does not touch Stripe/payment/guarantee/cron files", () => {
  const forbidden = [
    "lib/payments/commission.ts",
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "app/api/cron/bookings/complete/route.ts",
    "app/api/support/cases/first-lesson-guarantee/route.ts",
  ];
  for (const file of forbidden) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /profile_photo_url|applyTeacherListingMetadata/);
  }
});

console.log("[teacherSearch:visibilityPhoto] tests passed");
