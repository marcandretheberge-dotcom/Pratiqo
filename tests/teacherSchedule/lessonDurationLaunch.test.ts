/**
 * Teacher lesson duration — schedule owns editing; profile summarizes and links.
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
const verificationSrc = read("app/(app)/teacher/verification/page.tsx");
const bookingModalSrc = read("components/BookingModal.tsx");
const slotQueriesSrc = read("lib/teacherSlotQueries.ts");
const slotsRouteSrc = read("app/api/teachers/[id]/slots/route.ts");
const onboardingSrc = read("app/(app)/onboarding/teacher/page.tsx");

test("schedule page exposes lesson duration selector card", () => {
  assert.match(scheduleSrc, /lessonDurationTitle/);
  assert.match(scheduleSrc, /default_lesson_duration_minutes/);
  assert.match(scheduleSrc, /data-testid="teacher-schedule-lesson-duration-card"/);
  assert.match(scheduleSrc, /data-testid="teacher-schedule-lesson-duration-select"/);
  assert.match(scheduleSrc, /LESSON_DURATION_OPTIONS/);
});

test("verification availability card summarizes duration and links to schedule", () => {
  assert.match(verificationSrc, /lessonDurationSummaryText/);
  assert.match(verificationSrc, /editScheduleAndDuration/);
  assert.match(verificationSrc, /ctaHref="\/teacher\/schedule"/);
  assert.match(verificationSrc, /default_lesson_duration_minutes/);
});

test("verification: duration useMemo is before loading guards (Rules of Hooks)", () => {
  const descIdx = verificationSrc.indexOf("const availabilityDescription = useMemo");
  // Guard may include teacherRowLoading in addition to the base loading + user checks.
  const guardIdx = Math.max(
    verificationSrc.indexOf("if (loading || !user)"),
    verificationSrc.indexOf("if (loading || !user ||"),
  );

  assert.ok(descIdx >= 0, "availabilityDescription useMemo missing");
  assert.ok(guardIdx >= 0, "loading guard missing");
  assert.ok(descIdx < guardIdx, "availabilityDescription useMemo must run before early returns");
});

test("verification: normalizes missing duration safely via optional teacherRow", () => {
  assert.match(verificationSrc, /teacherRow\?\.default_lesson_duration_minutes/);
  assert.match(
    verificationSrc,
    /normalizeLessonDurationMinutes\([\s\S]*?teacherRow\?\.default_lesson_duration_minutes/,
  );
});

test("BookingModal uses teacher defaultLessonDurationMinutes for studio/online", () => {
  assert.match(bookingModalSrc, /defaultLessonDurationMinutes/);
  assert.match(bookingModalSrc, /sessionDurationLabel/);
});

test("slot generation uses teacher default_lesson_duration_minutes", () => {
  assert.match(slotQueriesSrc, /default_lesson_duration_minutes/);
  assert.doesNotMatch(slotQueriesSrc, /home_lesson_min_duration/);
  assert.match(slotsRouteSrc, /default_lesson_duration_minutes/);
});

test("minimal teacher onboarding does not collect initial lesson duration", () => {
  assert.doesNotMatch(onboardingSrc, /teacher-onboarding-lesson-duration-select/);
  assert.doesNotMatch(onboardingSrc, /default_lesson_duration_minutes\s*:/);
  assert.match(onboardingSrc, /\/teacher\/verification\?setup=1/);
});

console.log("[teacherSchedule:lessonDuration] tests passed");
