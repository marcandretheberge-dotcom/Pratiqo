import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

const STRIP = read("components/TeacherRecruitStrip.tsx");
const ROOT_LAYOUT = read("app/layout.tsx");
const APP_LAYOUT = read("app/(app)/layout.tsx");
const SEARCH_PAGE = read("app/(app)/student/search/page.tsx");

test("teacher recruitment strip is gated off", () => {
  assert.match(STRIP, /const SHOW_TEACHER_RECRUITMENT_STRIP = false/);
  assert.match(STRIP, /SHOW_TEACHER_RECRUITMENT_STRIP && visible && !suppressed/);
});

test("student search page does not render the recruitment strip", () => {
  assert.doesNotMatch(SEARCH_PAGE, /TeacherRecruitStrip/);
  assert.doesNotMatch(SEARCH_PAGE, /bannerAreYouTeacher/);
  assert.doesNotMatch(SEARCH_PAGE, /bannerJoinCta/);
  assert.doesNotMatch(SEARCH_PAGE, /href=["']\/devenir-enseignant["']/);
  assert.doesNotMatch(SEARCH_PAGE, /href=["']\/devenir-professeur["']/);
});

test("app student layout does not mount the recruitment strip", () => {
  assert.doesNotMatch(APP_LAYOUT, /TeacherRecruitStrip/);
  assert.doesNotMatch(APP_LAYOUT, /bannerAreYouTeacher/);
});

test("root layout still mounts TeacherRecruitStrip for ambassador claim, but banner is off", () => {
  assert.match(ROOT_LAYOUT, /<TeacherRecruitStrip\s*\/>/);
  assert.match(STRIP, /<AmbassadorReferralClaim\s*\/>/);
});

test("dedicated teacher recruitment routes still exist", () => {
  assert.ok(existsSync(join(ROOT, "app", "devenir-professeur", "page.tsx")));
  assert.ok(existsSync(join(ROOT, "app", "become-teacher", "page.tsx")));
  assert.ok(existsSync(join(ROOT, "app", "(marketing)", "devenir-enseignant", "page.tsx")));
  const professeur = read("app/devenir-professeur/page.tsx");
  assert.match(professeur, /TeacherRecruitmentCtaLink/);
});

test("no teacher_offers runtime behavior added", () => {
  assert.doesNotMatch(STRIP, /teacher_offers/);
  assert.doesNotMatch(STRIP, /from ["']@\/lib\/offers/);
  assert.doesNotMatch(SEARCH_PAGE, /from ["']@\/lib\/offers/);
});

test("no booking/checkout/payment imports in the strip module", () => {
  assert.doesNotMatch(STRIP, /from ["']@\/lib\/stripe/);
  assert.doesNotMatch(STRIP, /from ["']stripe["']/);
  assert.doesNotMatch(STRIP, /\/api\/stripe\/checkout/);
  assert.doesNotMatch(STRIP, /calculateBookingAmounts/);
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
  console.log(`[teacherRecruitment:inAppStripDisabled] ${passed} tests passed`);
}
