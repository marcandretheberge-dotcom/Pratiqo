/**
 * Final teacher-card micro-polish: bio markers, /h weight, location row.
 * Display only. No Stripe, payments, teacher_offers, or visibility changes.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatTeacherCardBioSnippet, splitPublicBioParagraphs } from "@/lib/teacherProfile/formatPublicBio";

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
const LOCAL = read("components/seo/LocalTeacherDiscoveryCards.tsx");
const PRICE = read("components/PriceDisplay.tsx");
const DISPLAY = read("lib/teachers/display.ts");
const PROFILE = read("components/TeacherProfile.tsx");
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

test("card bio snippet strips first-line and later-line list markers", () => {
  assert.equal(formatTeacherCardBioSnippet("-Enseignante avec plus de dix ans..."), "Enseignante avec plus de dix ans...");
  assert.equal(formatTeacherCardBioSnippet("Français.\n-Ayant enseigné..."), "Français. Ayant enseigné...");
  assert.equal(formatTeacherCardBioSnippet("Français. -Ayant enseigné..."), "Français. Ayant enseigné...");
  assert.equal(formatTeacherCardBioSnippet("• Professeur passionné..."), "Professeur passionné...");
  assert.equal(formatTeacherCardBioSnippet("* Cours adaptés..."), "Cours adaptés...");
});

test("card bio snippet preserves hyphenated names and phrases", () => {
  assert.equal(formatTeacherCardBioSnippet("Marc-André enseigne..."), "Marc-André enseigne...");
  assert.equal(formatTeacherCardBioSnippet("Cours parent-enfant"), "Cours parent-enfant");
});

test("profile paragraph splitting is unchanged by card snippet cleanup", () => {
  const bio = "Premier paragraphe.\n\n- Deuxième paragraphe.";
  assert.deepEqual(splitPublicBioParagraphs(bio), [
    "Premier paragraphe.",
    "- Deuxième paragraphe.",
  ]);
  assert.match(PROFILE, /parseTeacherProfileBio\(sanitizedBio\.content\)/);
});

test("PriceDisplay keeps /h visually secondary to amount and currency", () => {
  assert.match(PRICE, /\{primary\}/);
  assert.match(PRICE, /perHour \? <span className="text-sm font-normal text-slate-400">\/h<\/span>/);
  assert.match(TEACHER_CARD, /<PriceDisplay/);
  assert.match(TEACHER_CARD, /perHour/);
  assert.match(LANDING, /perHour/);
  assert.match(LOCAL, /text-sm font-normal text-slate-400">\/h</);
});

test("cards keep legacy price copy without À partir de or teacher_offers", () => {
  assert.match(TEACHER_CARD, /When teacher_offers launches/);
  assert.doesNotMatch(TEACHER_CARD, /t\(["']teacherPriceFrom["']\)/);
  assert.doesNotMatch(LANDING, /t\(["']teacherPriceFrom["']\)/);
  assert.doesNotMatch(TEACHER_CARD, /from ["']@\/lib\/offers/);
  assert.doesNotMatch(LANDING, /from ["']@\/lib\/offers/);
  assert.doesNotMatch(PRICE, /from ["']stripe["']/);
});

test("cards do not render noisy pills or Nouveau sur Pratiqo", () => {
  assert.doesNotMatch(TEACHER_CARD, /<TeacherBadgePill\b/);
  assert.doesNotMatch(LANDING, /<TeacherBadgePill\b/);
  assert.doesNotMatch(TEACHER_CARD, /teacherBadgeNewTeacher/);
  assert.doesNotMatch(LANDING, /Nouveau sur Pratiqo/);
  assert.doesNotMatch(TEACHER_CARD, /teacherBadgeIdentityVerified[\s\S]{0,40}TeacherBadgePill/);
});

test("location row is compact, aligned, and hides private address", () => {
  assert.match(DISPLAY, /PUBLIC_TEACHER_CARD_LOCATION_CLASS/);
  assert.match(DISPLAY, /items-center gap-1/);
  assert.match(DISPLAY, /text-xs leading-tight text-slate-500/);
  assert.match(TEACHER_CARD, /PUBLIC_TEACHER_CARD_LOCATION_CLASS/);
  assert.match(LANDING, /PUBLIC_TEACHER_CARD_LOCATION_CLASS/);
  assert.doesNotMatch(TEACHER_CARD, /location\?\.address/);
  assert.doesNotMatch(LANDING, /teacher\.location\.address/);
});

test("hover stays subtle and cards remain a single click target", () => {
  assert.match(DISPLAY, /hover:border-emerald-200/);
  assert.match(DISPLAY, /motion-safe:hover:-translate-y-0\.5/);
  assert.match(DISPLAY, /focus-visible:ring-2/);
  const innerButtons = [...TEACHER_CARD.matchAll(/<button\b/g)];
  assert.equal(innerButtons.length, 1);
});

test("this contract is wired into npm run test:taxonomy and test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:taxonomy"] ?? "",
    /tests\/teachers\/teacherCardMicroPolish\.test\.ts/,
  );
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/teachers\/teacherCardMicroPolish\.test\.ts/,
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
  console.log(`[teachers:teacherCardMicroPolish] ${passed} tests passed`);
}
