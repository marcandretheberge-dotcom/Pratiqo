/**
 * Premium teacher-card hierarchy polish (avatars, discipline vs bio, Nouveau).
 * UI/display only — no Stripe, payments, teacher_offers, or visibility changes.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyAdditionalDisciplines, formatTeacherCardDisciplines, type TeacherDisciplineRow } from "@/lib/teacherMapper";
import { formatTeacherCardBioSnippet } from "@/lib/teacherProfile/formatPublicBio";
import {
  PUBLIC_TEACHER_CARD_AVATAR_SIZE_CLASS,
  PUBLIC_TEACHER_CARD_AVATAR_SIZE_COMPACT,
  PUBLIC_TEACHER_CARD_AVATAR_SIZE_DESKTOP,
  PUBLIC_TEACHER_CARD_AVATAR_SIZE_MOBILE,
  PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS,
  PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS,
} from "@/lib/teachers/display";
import type { Teacher } from "@/types";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const SEARCH = read("app/(app)/student/search/page.tsx");
const TEACHER_CARD = SEARCH.slice(SEARCH.indexOf("function TeacherCard({"));
const LANDING = read("components/marketing/LandingTeacherListingCard.tsx");
const HERO = read("components/marketing/HeroTeacherPreviewCards.tsx");
const RELATED = read("components/blog/RelatedTeachersWidget.tsx");
const QUIZ = read("components/marketing/TeacherQuiz.tsx");
const LOCAL = read("components/seo/LocalTeacherDiscoveryCards.tsx");
const MAP = read("components/SearchMapView.tsx");
const PROFILE = read("components/TeacherProfile.tsx");
const BIO = read("components/teachers/TeacherCardBioSnippet.tsx");
const CHIPS = read("components/marketing/LandingNeighborhoodSignals.tsx");
const DISPLAY = read("lib/teachers/display.ts");
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

const CARD_SOURCES = [TEACHER_CARD, LANDING, HERO, RELATED, QUIZ, LOCAL, MAP];

function sampleTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Marie D.",
    discipline: "Français",
    category: "Langues",
    rating: 5,
    reviews: 12,
    pricePerLesson: 70,
    monthlySubscription: 0,
    bio: "- Enseignante avec plus de dix ans d'expérience.",
    imageUrl: null,
    availability: [],
    location: {},
    isVerified: true,
    teachingMode: "online",
    languages: ["fr"],
    levels: [],
    ...overrides,
  };
}

test("cards do not show Nouveau for unrated teachers", () => {
  for (const src of CARD_SOURCES) {
    assert.doesNotMatch(src, /teacherCardNew/);
    assert.doesNotMatch(src, /Nouveau sur Pratiqo/);
  }
  assert.doesNotMatch(LOCAL, />Nouveau</);
});

test("rating markup remains when public reviews exist", () => {
  assert.match(TEACHER_CARD, /hasPublicTeacherReviews\(/);
  assert.match(TEACHER_CARD, /teacher\.rating\)\.toFixed\(1\)/);
  assert.match(TEACHER_CARD, /teacher\.reviews/);
  assert.match(TEACHER_CARD, /\{hasReviews \? \(/);
  assert.match(TEACHER_CARD, /\) : null\}/);
});

test("discipline helper still renders multiple labels with +N", () => {
  const rows: TeacherDisciplineRow[] = [
    "francais",
    "aide_aux_devoirs",
    "photographie",
    "mise_en_forme",
    "theatre",
  ].map((discipline_id) => ({
    teacher_id: "11111111-1111-4111-8111-111111111111",
    discipline_id,
    specialite: null,
  }));
  const teacher = applyAdditionalDisciplines(sampleTeacher({ discipline: "—" }), rows);
  assert.equal(formatTeacherCardDisciplines(teacher), "Français · Aide aux devoirs · Photographie +2");
});

test("discipline row is stronger than the bio snippet", () => {
  assert.match(DISPLAY, /font-semibold leading-snug text-slate-950/);
  assert.match(TEACHER_CARD, /PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS/);
  assert.match(LANDING, /PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS/);
  assert.match(BIO, /text-\[13px\] leading-relaxed text-slate-500/);
  assert.doesNotMatch(PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS, /rounded-full/);
});

test("bio snippet strips leading bullets and stays secondary", () => {
  assert.equal(
    formatTeacherCardBioSnippet("- Enseignante avec plus de dix ans d'expérience."),
    "Enseignante avec plus de dix ans d'expérience.",
  );
  assert.match(BIO, /line-clamp-2/);
  assert.doesNotMatch(BIO, /whitespace-pre-line/);
  assert.doesNotMatch(BIO, /whitespace-pre-wrap/);
  assert.match(PROFILE, /parseTeacherProfileBio\(sanitizedBio\.content\)/);
});

test("desktop card avatars are 72–88px with a 56–64px mobile class", () => {
  assert.equal(PUBLIC_TEACHER_CARD_AVATAR_SIZE_DESKTOP, 80);
  assert.equal(PUBLIC_TEACHER_CARD_AVATAR_SIZE_MOBILE, 56);
  assert.equal(PUBLIC_TEACHER_CARD_AVATAR_SIZE_COMPACT, 56);
  assert.match(PUBLIC_TEACHER_CARD_AVATAR_SIZE_CLASS, /!h-14/);
  assert.match(PUBLIC_TEACHER_CARD_AVATAR_SIZE_CLASS, /sm:!h-20/);
  assert.match(TEACHER_CARD, /PUBLIC_TEACHER_CARD_AVATAR_SIZE_DESKTOP/);
  assert.match(LANDING, /PUBLIC_TEACHER_CARD_AVATAR_SIZE_DESKTOP/);
  assert.match(MAP, /PUBLIC_TEACHER_CARD_AVATAR_SIZE_COMPACT/);
});

test("search card footer stays anchored after avatar size change", () => {
  assert.match(TEACHER_CARD, /mt-auto flex flex-col/);
  assert.match(TEACHER_CARD, /flex h-full/);
  assert.match(LANDING, /mt-auto flex flex-col/);
});

test("clickable cards keep subtle hover and focus without layout jump", () => {
  assert.match(PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS, /motion-safe:hover:-translate-y-0\.5/);
  assert.match(PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS, /hover:shadow-md/);
  assert.match(PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS, /hover:border-emerald-200/);
  assert.match(PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS, /focus-visible:ring-2/);
  assert.doesNotMatch(PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS, /hover:scale-/);
});

test("landing neighborhood chips are static trust chips, not filter dropdowns", () => {
  assert.match(CHIPS, /Static neighborhood\/trust chips/);
  assert.match(CHIPS, /<li/);
  assert.doesNotMatch(CHIPS, /<button/);
  assert.doesNotMatch(CHIPS, /ChevronDown|chevron/i);
  assert.match(CHIPS, /cursor-default/);
});

test("cards keep legacy price copy and do not invent response time or private address", () => {
  for (const src of CARD_SOURCES) {
    assert.doesNotMatch(src, /t\(["']teacherPriceFrom["']\)/);
    assert.doesNotMatch(src, /t\(["']publicTeacherCardFromPerHour["']\)/);
    assert.doesNotMatch(src, /Répond en 1h/);
    assert.doesNotMatch(src, /location\?\.address/);
    assert.doesNotMatch(src, /from ["']@\/lib\/offers/);
    assert.doesNotMatch(src, /from ["']stripe["']/);
  }
  assert.match(TEACHER_CARD, /When teacher_offers launches/);
});

test("this contract is wired into npm run test:taxonomy and test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:taxonomy"] ?? "",
    /tests\/teachers\/premiumTeacherCardHierarchy\.test\.ts/,
  );
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/teachers\/premiumTeacherCardHierarchy\.test\.ts/,
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
  console.log(`[teachers:premiumTeacherCardHierarchy] ${passed} tests passed`);
}
