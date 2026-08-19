/**
 * Teacher profile lower-section polish: wrapping En bref facts, no duplicate
 * formats/disciplines/rate, warmer reviews empty state.
 * Display only — no Stripe, payments, teacher_offers, or visibility changes.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Teacher } from "@/types";
import { applyAdditionalDisciplines, getTeacherProfileDisciplineChips, type TeacherDisciplineRow } from "@/lib/teacherMapper";
import {
  getTeacherAvailabilitySummary,
  getTeacherProfileInBriefCardIds,
  getTeacherProfileSummaryCardIds,
  PUBLIC_TEACHER_PROFILE_IN_BRIEF_VALUE_CLASS,
} from "@/lib/teachers/display";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const PROFILE = read("components/TeacherProfile.tsx");
const SEARCH = read("app/(app)/student/search/page.tsx");
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
const FR = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
const EN = JSON.parse(read("lib/i18n/locales/en.json")) as Record<string, string>;
const ES = JSON.parse(read("lib/i18n/locales/es.json")) as Record<string, string>;

function baseTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Éloïse D.",
    discipline: "Français",
    category: "Langues",
    rating: 5,
    reviews: 2,
    distance: 1.4,
    pricePerLesson: 70,
    bio: "Professeure.",
    imageUrl: "https://cdn.example.com/eloise.webp",
    availability: ["Lun. AM", "Mar. PM", "Mer. AM"],
    location: { lat: 45.5, lng: -73.6 },
    isVerified: true,
    teachingMode: "both",
    languages: ["fr", "en"],
    levels: ["Débutant", "Intermédiaire", "Avancé"],
    identityVerified: true,
    defaultLessonDurationMinutes: 60,
    ...overrides,
  };
}

function row(discipline_id: string): TeacherDisciplineRow {
  return { teacher_id: "11111111-1111-4111-8111-111111111111", discipline_id, specialite: null };
}

const QUICKSTAT = PROFILE.slice(PROFILE.indexOf("function QuickStat("), PROFILE.indexOf("function StarDisplay("));
const SUMMARY = PROFILE.slice(PROFILE.indexOf("teacher-profile-summary"), PROFILE.indexOf("teacher-profile-course-options"));
const OPTIONS = PROFILE.slice(PROFILE.indexOf("teacher-profile-course-options"), PROFILE.indexOf("Enterprise studio map"));
const EMPTY_REVIEWS = PROFILE.slice(PROFILE.indexOf("teacher-profile-reviews-empty"), PROFILE.indexOf("reviews.map"));

test("En bref values wrap instead of using truncate or line-clamp", () => {
  assert.match(PUBLIC_TEACHER_PROFILE_IN_BRIEF_VALUE_CLASS, /whitespace-normal/);
  assert.match(PUBLIC_TEACHER_PROFILE_IN_BRIEF_VALUE_CLASS, /break-words/);
  assert.doesNotMatch(PUBLIC_TEACHER_PROFILE_IN_BRIEF_VALUE_CLASS, /truncate|line-clamp/);
  assert.doesNotMatch(QUICKSTAT, /\btruncate\b/);
  assert.doesNotMatch(QUICKSTAT, /line-clamp/);
  assert.match(PROFILE, /PUBLIC_TEACHER_PROFILE_IN_BRIEF_VALUE_CLASS/);
  assert.match(PROFILE, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.doesNotMatch(SUMMARY, /sm:grid-cols-4/);
});

test("En bref omits FORMATS when course options are shown", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [row("francais")]);
  const chips = getTeacherProfileDisciplineChips(teacher);
  const ids = getTeacherProfileInBriefCardIds(teacher, {
    hasDisciplineChips: chips.length > 0,
    hasCourseOptions: true,
  });
  assert.ok(!ids.includes("formats"));
  assert.ok(!ids.includes("disciplines"));
  assert.match(PROFILE, /hasCourseOptions: teachingModes\.length > 0/);
  assert.match(PROFILE, /teacher-profile-course-options/);
  assert.match(PROFILE, /label: t\("filterInPerson"\)/);
  assert.match(PROFILE, /label: t\("filterOnline"\)/);
  assert.doesNotMatch(OPTIONS, /<button/);
});

test("En bref keeps unique facts and hides rate on desktop", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher({ introSessionEnabled: true }), [row("francais")]);
  const ids = getTeacherProfileInBriefCardIds(teacher, {
    hasDisciplineChips: true,
    hasCourseOptions: true,
  });
  assert.ok(ids.includes("availability"));
  assert.ok(ids.includes("languages"));
  assert.ok(ids.includes("levels"));
  assert.ok(ids.includes("discovery"));
  assert.ok(ids.includes("duration"));
  assert.ok(ids.includes("rate"));
  assert.match(PROFILE, /desktopSummaryCardIds\.length === 0 && "lg:hidden"/);
  assert.match(PROFILE, /id !== "rate"/);
  assert.match(SUMMARY, /lg:hidden/);
});

test("availability in the profile lists every slot instead of +N", () => {
  const teacher = baseTeacher();
  assert.equal(getTeacherAvailabilitySummary(teacher), "Lun. AM · Mar. PM +1");
  assert.equal(
    getTeacherAvailabilitySummary(teacher, Number.POSITIVE_INFINITY),
    "Lun. AM · Mar. PM · Mer. AM",
  );
  assert.match(PROFILE, /getTeacherAvailabilitySummary\(teacher, Number\.POSITIVE_INFINITY\)/);
});

test("canonical summary helper still lists all card types for data presence", () => {
  const teacher = applyAdditionalDisciplines(baseTeacher(), [row("francais")]);
  const all = getTeacherProfileSummaryCardIds(teacher);
  assert.ok(all.includes("disciplines"));
  assert.ok(all.includes("formats"));
  assert.ok(all.includes("rate"));
});

test("reviews empty state is warmer and does not fake a rating", () => {
  assert.match(FR.reviewsEmptyState, /n'a pas encore reçu d'avis/);
  assert.match(EN.reviewsEmptyState, /has not received reviews yet/);
  assert.match(ES.reviewsEmptyState, /todavía no recibió reseñas/);
  assert.match(EMPTY_REVIEWS, /reviewsEmptyState/);
  assert.match(EMPTY_REVIEWS, /role="status"/);
  assert.doesNotMatch(EMPTY_REVIEWS, /StarDisplay/);
  assert.doesNotMatch(EMPTY_REVIEWS, /hasReviews/);
  assert.doesNotMatch(EMPTY_REVIEWS, /teacher\.rating/);
});

test("course options stay display-only and booking/trust files stay untouched", () => {
  assert.match(PROFILE, /onBook\("standard"\)/);
  assert.doesNotMatch(PROFILE, /from ["']stripe["']/);
  assert.doesNotMatch(PROFILE, /from ["']@\/lib\/offers/);
  assert.doesNotMatch(PROFILE, /teacher\.location\.address/);
  assert.doesNotMatch(SEARCH.slice(SEARCH.indexOf("function TeacherCard({")), /teacher-profile-summary/);
});

test("this contract is wired into npm run test:taxonomy and test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:taxonomy"] ?? "",
    /tests\/teachers\/teacherProfileLowerSections\.test\.ts/,
  );
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/teachers\/teacherProfileLowerSections\.test\.ts/,
  );
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[teachers:teacherProfileLowerSections] ${passed} tests passed`);
}
