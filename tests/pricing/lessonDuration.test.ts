import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_LESSON_DURATION_MINUTES,
  isValidLessonDurationMinutes,
  normalizeLessonDurationMinutes,
} from "../../lib/pricing/lessonDuration";
import { computeBookingChargeCents } from "../../lib/pricing/bookingCharge";
import { teacherRowToTeacher } from "../../lib/teacherMapper";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("isValidLessonDurationMinutes accepts 30, 60, and 180", () => {
  assert.equal(isValidLessonDurationMinutes(30), true);
  assert.equal(isValidLessonDurationMinutes(60), true);
  assert.equal(isValidLessonDurationMinutes(180), true);
});

test("isValidLessonDurationMinutes rejects below 30, above 180, and non-15-minute increments", () => {
  assert.equal(isValidLessonDurationMinutes(29), false);
  assert.equal(isValidLessonDurationMinutes(181), false);
  assert.equal(isValidLessonDurationMinutes(45.5), false);
  assert.equal(isValidLessonDurationMinutes(50), false);
  assert.equal(isValidLessonDurationMinutes("abc"), false);
});

test("normalizeLessonDurationMinutes defaults invalid values to 60", () => {
  assert.equal(normalizeLessonDurationMinutes(undefined), DEFAULT_LESSON_DURATION_MINUTES);
  assert.equal(normalizeLessonDurationMinutes(null), DEFAULT_LESSON_DURATION_MINUTES);
  assert.equal(normalizeLessonDurationMinutes(50), DEFAULT_LESSON_DURATION_MINUTES);
  assert.equal(normalizeLessonDurationMinutes(200), DEFAULT_LESSON_DURATION_MINUTES);
});

test("migration 072: existing teachers default to 60 minutes", () => {
  const sql = readFileSync("supabase/migrations/072_teacher_default_lesson_duration.sql", "utf8");

  assert.match(sql, /default_lesson_duration_minutes integer NOT NULL DEFAULT 60/i);
  assert.match(sql, /default_lesson_duration_minutes >= 30/);
  assert.match(sql, /default_lesson_duration_minutes <= 180/);
  assert.match(sql, /default_lesson_duration_minutes % 15 = 0/);
});

test("computeBookingChargeCents returns 0 for invalid regular lesson duration", () => {
  const teacher = { price_per_lesson: 60 };

  assert.equal(
    computeBookingChargeCents(teacher, {
      lesson_type: "regular",
      teaching_mode: "person",
      duration_minutes: 50,
    }),
    0,
  );

  assert.equal(
    computeBookingChargeCents(teacher, {
      lesson_type: "regular",
      teaching_mode: "person",
      duration_minutes: 200,
    }),
    0,
  );
});

test("computeBookingChargeCents applies duration multiplier for standard studio lessons", () => {
  assert.equal(
    computeBookingChargeCents(
      { price_per_lesson: 40 },
      {
        lesson_type: "regular",
        teaching_mode: "online",
        duration_minutes: 120,
      },
    ),
    8000,
  );
});

test("checkout route rejects invalid duration_minutes before charging", () => {
  const src = readFileSync("app/api/stripe/checkout/route.ts", "utf8");

  assert.match(src, /isValidLessonDurationMinutes/);
  assert.match(src, /Durée de cours invalide/);
  assert.match(src, /computeBookingChargeCents\(/);
  assert.doesNotMatch(src, /Number\(b\.price\)/);
  assert.doesNotMatch(src, /bookingPriceDollars/);
});

test("teacherMapper defaults missing default_lesson_duration_minutes to 60", () => {
  const baseRow = {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: "00000000-0000-4000-8000-000000000002",
    name: "Test",
    discipline: "Piano",
    category: "Musique",
    rating: 0,
    reviews: 0,
    price_per_lesson: 50,
    monthly_subscription: null,
    bio: "Bio",
    image_url: null,
    availability: [],
    location: { lat: 0, lng: 0 },
    is_verified: false,
    teaching_mode: "both",
    languages: [],
    levels: [],
  };

  const withNull = teacherRowToTeacher({
    ...baseRow,
    default_lesson_duration_minutes: null,
  });

  const withMissing = teacherRowToTeacher({
    ...baseRow,
  });

  assert.equal(withNull.defaultLessonDurationMinutes, 60);
  assert.equal(withMissing.defaultLessonDurationMinutes, 60);
});

test("i18n: duration keys exist in fr / en / es", () => {
  for (const path of ["lib/i18n/locales/fr.json", "lib/i18n/locales/en.json", "lib/i18n/locales/es.json"]) {
    const dict = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;

    for (const key of [
      "lessonDurationTitle",
      "lessonDurationDescription",
      "lessonDurationLabel",
      "lessonDurationSummary",
      "editScheduleAndDuration",
      "invalidLessonDuration",
      "lessonDurationOneHour",
      "lessonDurationHours",
      "lessonDurationHoursMinutes",
      "lessonDurationMinutesShort",
    ]) {
      assert.ok(dict[key]?.trim(), `${path} missing ${key}`);
    }
  }
});

console.log("[pricing:lessonDuration] tests passed");
