import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const SEARCH_PAGE = read("app/(app)/student/search/page.tsx");
const PROFILE_SRC = read("components/TeacherProfile.tsx");
const CARD_START = SEARCH_PAGE.indexOf("function TeacherCard({");
assert.ok(CARD_START >= 0, "expected inline TeacherCard in student search page");
const TEACHER_CARD = SEARCH_PAGE.slice(CARD_START);

test("public bio rendering splits sanitized content into paragraphs", () => {
  assert.match(PROFILE_SRC, /splitPublicBioParagraphs\(sanitizedBio\.content\)/);
  assert.match(PROFILE_SRC, /bioParagraphs\.map\(/);
  assert.match(PROFILE_SRC, /max-w-prose space-y-3/);
  assert.doesNotMatch(
    PROFILE_SRC,
    /\{sanitizedBio\.content\s*\|\|/,
    "profile must not render the full bio as one giant fallback expression",
  );
});

test("public bio rendering preserves sanitizer output and contact-hidden notice", () => {
  assert.match(PROFILE_SRC, /sanitizePublicTeacherBio\(\s*teacher\.bio\s*,\s*locale\s*\)/);
  assert.match(PROFILE_SRC, /sanitizedBio\.masked[\s\S]{0,400}teacherBioContactHiddenNotice/);
});

test("card bio snippet collapses line breaks before line-clamp", () => {
  assert.match(TEACHER_CARD, /formatTeacherCardBioSnippet\(sanitizedBio\.content\)/);
  assert.match(TEACHER_CARD, /sanitizePublicTeacherBio\(teacher\.bio,\s*locale\)/);
  assert.match(TEACHER_CARD, /line-clamp-2/);
  assert.doesNotMatch(TEACHER_CARD, /whitespace-pre-line/);
  assert.doesNotMatch(TEACHER_CARD, /whitespace-pre-wrap/);
});

test("search card shows discipline summary via formatTeacherCardDisciplines", () => {
  assert.match(TEACHER_CARD, /formatTeacherCardDisciplines\(teacher\)/);
});

test("search card reserves rating/new slot", () => {
  assert.match(TEACHER_CARD, /hasPublicTeacherReviews\(/);
  assert.match(TEACHER_CARD, /teacherCardNew/);
  assert.match(TEACHER_CARD, /teacher\.reviews/);
  assert.match(TEACHER_CARD, /teacher\.rating/);
});

test("search card footer uses mt-auto for aligned layout", () => {
  assert.match(TEACHER_CARD, /mt-auto flex flex-col/);
  assert.match(TEACHER_CARD, /flex h-full/);
});

test("search card does not show loud uppercase availability copy", () => {
  assert.doesNotMatch(TEACHER_CARD, /uppercase tracking-wide text-teal-800/);
  assert.doesNotMatch(TEACHER_CARD, /font-bold uppercase tracking-wide/);
  assert.match(TEACHER_CARD, /availableThisWeekMatch/);
  assert.match(TEACHER_CARD, /rounded-full bg-emerald-600/);
});

test("search card shows distance when distanceKm is available and hides private address", () => {
  assert.match(TEACHER_CARD, /formatApproxDistanceKm\(distanceKm\)/);
  assert.match(TEACHER_CARD, /studentApproxDistanceFromYou/);
  assert.doesNotMatch(TEACHER_CARD, /location\?\.address/);
  assert.doesNotMatch(TEACHER_CARD, /teacher\.location\.address/);
});

test("teacher name stays in its own truncated row away from badges", () => {
  const nameIdx = TEACHER_CARD.indexOf("formatPublicTeacherDisplayName(teacher.name)");
  assert.ok(nameIdx >= 0);
  const nameRow = TEACHER_CARD.slice(nameIdx, nameIdx + TEACHER_CARD.slice(nameIdx).indexOf("</p>"));
  assert.doesNotMatch(nameRow, /<TeacherBadgePill\b/);
  assert.match(TEACHER_CARD, /<span className="truncate">\{formatPublicTeacherDisplayName\(teacher\.name\)\}<\/span>/);
});

test("search card uses a compact identity checkmark instead of trust badge pills", () => {
  assert.match(TEACHER_CARD, /isPublicTeacherIdentityVerified\(/);
  assert.match(TEACHER_CARD, /<TeacherCardIdentityCheck verified=\{identityVerified\}/);
  assert.match(TEACHER_CARD, /teacherBadgeIdentityVerified/);
  assert.doesNotMatch(TEACHER_CARD, /<TeacherBadgePill\b/);
  assert.doesNotMatch(TEACHER_CARD, /getSearchCardTeacherBadges\(/);
  assert.doesNotMatch(TEACHER_CARD, /teacherBadgeNewTeacher/);
});

test("no nested interactive controls are introduced", () => {
  const innerButtons = [...TEACHER_CARD.matchAll(/<button\b/g)];
  assert.equal(innerButtons.length, 1, "the card itself is the only button");
  assert.doesNotMatch(TEACHER_CARD, /<Link\b/);
  assert.doesNotMatch(TEACHER_CARD, /<a\b/);
  assert.match(TEACHER_CARD, /PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS/);
  assert.match(read("lib/teachers/display.ts"), /focus-visible:ring-2/);
});

test("price copy does not use starting-from i18n keys before teacher_offers pricing exists", () => {
  assert.doesNotMatch(TEACHER_CARD, /t\(["']teacherPriceFrom["']\)/);
  assert.doesNotMatch(TEACHER_CARD, /t\(["']publicTeacherCardFromPerHour["']\)/);
  assert.match(TEACHER_CARD, /When teacher_offers launches/);
  assert.match(TEACHER_CARD, /PriceDisplay/);
});

test("no teacher_offers runtime behavior added", () => {
  assert.doesNotMatch(SEARCH_PAGE, /from ["']@\/lib\/offers/);
  assert.match(TEACHER_CARD, /teacher\.pricePerLesson/);
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
  console.log(`[teacherSearch:teacherCardBioReadability] ${passed} tests passed`);
}
