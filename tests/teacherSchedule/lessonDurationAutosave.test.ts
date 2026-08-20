/**
 * Teacher lesson duration autosave — schedule card + dedicated API route.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const scheduleSrc = read("app/(app)/teacher/schedule/page.tsx");
const routeSrc = read("app/api/teacher/lesson-duration/route.ts");
const verificationSrc = read("app/(app)/teacher/verification/page.tsx");
const checkoutSrc = read("app/api/stripe/checkout/route.ts");

test("schedule: duration card shows autosave state text", () => {
  assert.match(scheduleSrc, /lessonDurationSaving/);
  assert.match(scheduleSrc, /lessonDurationSaved/);
  assert.match(scheduleSrc, /lessonDurationSaveError/);
  assert.match(scheduleSrc, /lessonDurationAutosaveHelp/);
  assert.match(scheduleSrc, /teacher-schedule-lesson-duration-saving/);
  assert.match(scheduleSrc, /teacher-schedule-lesson-duration-saved/);
  assert.match(scheduleSrc, /teacher-schedule-lesson-duration-error/);
});

test("schedule: duration autosaves via dedicated route, not main save button", () => {
  assert.match(scheduleSrc, /\/api\/teacher\/lesson-duration/);
  assert.match(scheduleSrc, /saveLessonDuration/);
  const saveAllBlock = scheduleSrc.slice(scheduleSrc.indexOf("const saveAll"), scheduleSrc.indexOf("const addBlocked"));
  assert.doesNotMatch(saveAllBlock, /default_lesson_duration_minutes/);
});

test("lesson-duration route: auth required and teacher resolved server-side", () => {
  assert.match(routeSrc, /getAuthenticatedTeacher/);
  assert.match(routeSrc, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(routeSrc, /teacherId.*req\.|body\.teacherId|teacher_id.*body/);
});

test("lesson-duration route: rejects invalid duration and updates only default_lesson_duration_minutes", () => {
  assert.match(routeSrc, /isValidLessonDurationMinutes/);
  assert.match(routeSrc, /normalizeLessonDurationMinutes/);
  assert.match(routeSrc, /default_lesson_duration_minutes: normalized/);
  assert.doesNotMatch(routeSrc, /availability/);
  assert.doesNotMatch(routeSrc, /price_per_lesson/);
});

test("verification remains summary + link only (no duration editor)", () => {
  assert.match(verificationSrc, /lessonDurationSummaryText/);
  assert.match(verificationSrc, /editScheduleAndDuration/);
  assert.match(verificationSrc, /ctaHref="\/teacher\/schedule"/);
  assert.doesNotMatch(verificationSrc, /LESSON_DURATION_OPTIONS/);
});

test("checkout still uses resolveBookingCheckoutPrice and rejects client price trust", () => {
  assert.match(checkoutSrc, /resolveBookingCheckoutPrice\(/);
  assert.match(checkoutSrc, /isValidLessonDurationMinutes/);
  assert.doesNotMatch(checkoutSrc, /Number\(b\.price\)/);
  assert.doesNotMatch(checkoutSrc, /bookingPriceDollars/);
});

console.log("[teacherSchedule:lessonDurationAutosave] tests passed");
