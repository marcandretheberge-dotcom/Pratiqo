import assert from "node:assert/strict";
import type { Teacher } from "@/types";
import {
  attachPublicTeachingZones,
  fetchTeacherTeachingZonesForTeachers,
} from "@/lib/teacherTeachingZones";
import { applyRadiusFilter, buildTeacherSearchRows } from "@/lib/teacherSearchEngine";
import { hasDeclaredLocalSupply } from "@/lib/teachers/localSupply";

type TestFn = () => void | Promise<void>;
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
  rating: 4.9,
  reviews: 12,
  distance: 0,
  pricePerLesson: 45,
  currency: "CAD",
  availability: ["Lun soir"],
  languages: ["fr"],
  levels: [],
  teachingMode: "person",
  location: { lat: 46.8139, lng: -71.208, neighborhood: "Québec" },
  city: "Québec",
  region: "QC",
  countryCode: "CA",
  isVerified: true,
  verificationLevel: 1,
  introSessionEnabled: false,
  introSessionPriceCents: null,
  introSessionDurationMinutes: 45,
  introSessionDiscountPercent: undefined,
  homeLessonEnabled: false,
  homeLessonRadiusKm: undefined,
  homeLessonPrice: undefined,
};

function makeSupabaseResponse(response: { data?: unknown[] | null; error?: { code?: string; message?: string } | null }) {
  return {
    from(table: string) {
      assert.equal(table, "teacher_teaching_zones_public");
      let orderCount = 0;
      const chain = {
        select() {
          return chain;
        },
        in() {
          return chain;
        },
        order() {
          orderCount += 1;
          return orderCount >= 2 ? Promise.resolve({ data: response.data ?? null, error: response.error ?? null }) : chain;
        },
      };
      return chain;
    },
  };
}

async function withWarnMuted(fn: () => Promise<void>) {
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  try {
    await fn();
  } finally {
    console.warn = originalWarn;
  }
  return warnings;
}

test("missing public zones relation returns base teachers without throwing", async () => {
  const supabase = makeSupabaseResponse({
    error: {
      code: "42P01",
      message: 'relation "public.teacher_teaching_zones_public" does not exist',
    },
  });
  let fetched: unknown[] | null = null;
  let attached: Teacher[] | null = null;
  const warnings = await withWarnMuted(async () => {
    fetched = await fetchTeacherTeachingZonesForTeachers(supabase as never, [baseTeacher.id]);
    attached = await attachPublicTeachingZones(supabase as never, [baseTeacher]);
  });

  assert.deepEqual(fetched, []);
  assert.equal(attached?.[0], baseTeacher);
  assert.ok(warnings.length >= 1);
});

test("permission denied on public zones returns base teachers without throwing", async () => {
  const supabase = makeSupabaseResponse({
    error: {
      code: "42501",
      message: "permission denied for relation teacher_teaching_zones_public",
    },
  });
  const result: { attached?: Teacher[] } = {};
  await withWarnMuted(async () => {
    result.attached = await attachPublicTeachingZones(supabase as never, [baseTeacher]);
  });

  assert.equal(result.attached?.[0], baseTeacher);
  assert.equal(result.attached?.[0]?.teachingZones, undefined);
});

test("schema-cache miss on public zones returns base teachers without throwing", async () => {
  const supabase = makeSupabaseResponse({
    error: {
      message: "Could not find the table teacher_teaching_zones_public in the schema cache",
    },
  });
  let attached: Teacher[] | null = null;
  await withWarnMuted(async () => {
    attached = await attachPublicTeachingZones(supabase as never, [baseTeacher]);
  });

  assert.equal(attached?.[0], baseTeacher);
});

test("malformed zone rows are skipped and base teacher still returns", async () => {
  const supabase = makeSupabaseResponse({
    data: [
      {
        id: "zone-bad",
        teacher_id: baseTeacher.id,
        label_public: "Québec",
        city: "",
        region: "QC",
        country_code: "CA",
        lat_public: "not-a-number",
        lng_public: null,
        radius_km: 10,
        zone_kind: "service_area",
        is_primary: true,
        sort_order: 0,
        availability_note_public: null,
        supports_at_teacher_place: false,
        supports_at_student_place: true,
        supports_public_place: false,
      },
    ],
  });

  const attached = await attachPublicTeachingZones(supabase as never, [baseTeacher]);
  assert.equal(attached.length, 1);
  assert.equal(attached[0]?.id, baseTeacher.id);
  assert.equal(attached[0]?.teachingZones, undefined);
});

test("search falls back to legacy teacher location when no zones exist", () => {
  const rows = buildTeacherSearchRows([baseTeacher], {
    geo: { lat: 46.82, lng: -71.21 },
    locationText: { city: "Québec", region: "QC" },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.teacher.id, baseTeacher.id);
  assert.equal(rows[0]?.matchedTeachingZone, null);
  assert.ok((rows[0]?.distanceKm ?? 999) < 2);

  const nearbyRows = applyRadiusFilter(rows, 5);
  assert.equal(nearbyRows.length, 1);
  assert.equal(nearbyRows[0]?.teacher.id, baseTeacher.id);
});

test("existing but empty zones view preserves declared local supply without inventing coordinates", async () => {
  const original: Teacher = { ...baseTeacher };
  const client = makeSupabaseResponse({ data: [], error: null });
  const attached = await attachPublicTeachingZones(client as never, [original]);
  assert.equal(attached[0], original);
  assert.equal(attached[0].location, original.location);
  const city = { name: "Québec", lat: 46.8139, lng: -71.208 };
  assert.equal(hasDeclaredLocalSupply({ city: original.city, teaching_mode: "person", teachingZones: [] }, city), true);
  assert.equal(hasDeclaredLocalSupply({ city: original.city, teaching_mode: "both", teachingZones: [] }, city), true);
  assert.equal(hasDeclaredLocalSupply({ city: original.city, teaching_mode: "online", teachingZones: [] }, city), false);
  assert.equal(hasDeclaredLocalSupply({ city: "Lévis", teaching_mode: "person", teachingZones: [] }, city), false);
  assert.equal(hasDeclaredLocalSupply({ teaching_mode: "person", teachingZones: [] }, city), false);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }

  console.log(`[teacherZones:fallback] ${tests.length} tests passed`);
}

void run();
