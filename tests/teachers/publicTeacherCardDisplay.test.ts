/**
 * Platform-wide public teacher card display contract.
 *
 * UI/copy only. Identity is a compact checkmark, not trust pills.
 * Does not change visibility, payments, teacher_offers, or stored teacher rows.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatPublicTeacherDisplayName } from "@/lib/identity/displayName";
import { formatTeacherCardBioSnippet } from "@/lib/teacherProfile/formatPublicBio";
import { formatTeacherDisciplineLabel } from "@/lib/teacherMapper";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const CARD_FILES = [
  "app/(app)/student/search/page.tsx",
  "components/marketing/LandingTeacherListingCard.tsx",
  "components/marketing/HeroTeacherPreviewCards.tsx",
  "components/marketing/TeacherQuiz.tsx",
  "components/blog/RelatedTeachersWidget.tsx",
  "components/seo/LocalTeacherDiscoveryCards.tsx",
  "components/SearchMapView.tsx",
] as const;

const SEARCH_CARD = read("app/(app)/student/search/page.tsx").slice(
  read("app/(app)/student/search/page.tsx").indexOf("function TeacherCard({"),
);
const LANDING = read("components/marketing/LandingTeacherListingCard.tsx");
const HERO = read("components/marketing/HeroTeacherPreviewCards.tsx");
const RELATED = read("components/blog/RelatedTeachersWidget.tsx");
const QUIZ = read("components/marketing/TeacherQuiz.tsx");
const LOCAL = read("components/seo/LocalTeacherDiscoveryCards.tsx");
const MAP = read("components/SearchMapView.tsx");
const PROFILE = read("components/TeacherProfile.tsx");
const IDENTITY_CHECK = read("components/teachers/TeacherCardIdentityCheck.tsx");
const AVATAR = read("components/TeacherAvatar.tsx");
const DISPLAY = read("lib/teachers/display.ts");
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

const CARD_SOURCES = {
  search: SEARCH_CARD,
  landing: LANDING,
  hero: HERO,
  related: RELATED,
  quiz: QUIZ,
  local: LOCAL,
  map: MAP,
} as const;

test("public teacher cards share the same display helpers", () => {
  for (const src of [SEARCH_CARD, LANDING, HERO, RELATED, QUIZ, LOCAL, MAP]) {
    assert.match(src, /formatPublicTeacherDisplayName/);
    assert.match(src, /TeacherCardIdentityCheck/);
    assert.doesNotMatch(src, /<TeacherBadgePill\b/);
    assert.doesNotMatch(src, /getCompactTeacherBadges/);
    assert.doesNotMatch(src, /getSearchCardTeacherBadges/);
  }
  assert.match(SEARCH_CARD, /formatTeacherCardDisciplines\(teacher\)/);
  assert.match(LANDING, /formatTeacherCardDisciplines\(teacher\)/);
  assert.match(HERO, /formatTeacherCardDisciplines\(teacher\)/);
  assert.match(SEARCH_CARD, /formatTeacherCardBioSnippet/);
  assert.match(LANDING, /formatTeacherCardBioSnippet/);
});

test("cards do not render bulky identity/experience/diploma/new pills", () => {
  for (const [name, src] of Object.entries(CARD_SOURCES)) {
    assert.doesNotMatch(src, /teacherBadgeVerifiedExperience/, `${name} must not show Expérience vérifiée`);
    assert.doesNotMatch(src, /teacherBadgeDiplomaVerified/, `${name} must not show Diplôme vérifié`);
    assert.doesNotMatch(src, /teacherBadgeNewTeacher/, `${name} must not show Nouveau sur Pratiqo`);
    assert.doesNotMatch(src, /Nouveau sur Pratiqo/, `${name} must not show Nouveau sur Pratiqo copy`);
  }
});

test("identity checkmark appears only when verified", () => {
  assert.match(IDENTITY_CHECK, /if \(!verified\) return null/);
  assert.match(IDENTITY_CHECK, /data-testid="teacher-card-identity-verified"/);
  assert.match(IDENTITY_CHECK, /<CheckCircle2\b/);
  for (const src of [SEARCH_CARD, LANDING, HERO, RELATED, QUIZ, MAP]) {
    assert.match(src, /isPublicTeacherIdentityVerified\(/);
    assert.match(src, /<TeacherCardIdentityCheck verified=\{identityVerified\}/);
  }
  assert.match(LOCAL, /<TeacherCardIdentityCheck verified=\{teacher\.identityVerified\}/);
});

test("public cards do not inspect manual identity verification source", () => {
  for (const [name, src] of Object.entries(CARD_SOURCES)) {
    assert.doesNotMatch(src, /identityVerifiedManually/, `${name} must not read identityVerifiedManually`);
    assert.doesNotMatch(src, /identity_verified_manually/, `${name} must not read identity_verified_manually`);
  }
  assert.doesNotMatch(PROFILE, /identityVerifiedManually/);
});

test("compact rating appears when reviews exist; unrated cards leave the slot empty", () => {
  for (const src of [SEARCH_CARD, LANDING, HERO, RELATED, QUIZ]) {
    assert.match(src, /hasPublicTeacherReviews\(/);
    assert.doesNotMatch(src, /teacherCardNew/);
  }
  assert.doesNotMatch(LOCAL, />Nouveau</);
  assert.doesNotMatch(MAP, /teacherCardNew/);
});

test("cards keep legacy price display without À partir de", () => {
  for (const [name, src] of Object.entries(CARD_SOURCES)) {
    assert.doesNotMatch(src, /t\(["']teacherPriceFrom["']\)/, `${name} must not use teacherPriceFrom`);
    assert.doesNotMatch(src, /t\(["']publicTeacherCardFromPerHour["']\)/, `${name} must not use starting-from copy`);
  }
  assert.match(SEARCH_CARD, /When teacher_offers launches/);
  assert.match(LANDING, /When teacher_offers launches/);
});

test("cards do not invent response-time claims", () => {
  for (const [name, src] of Object.entries(CARD_SOURCES)) {
    assert.doesNotMatch(src, /Répond en 1h/, `${name} must not claim Répond en 1h`);
    assert.doesNotMatch(src, /respondsIn1h/i, `${name} must not invent response-time copy`);
    assert.doesNotMatch(src, /responseTimeBadge/i, `${name} must not add a response-time badge`);
  }
});

test("cards do not expose a private address", () => {
  for (const [name, src] of Object.entries(CARD_SOURCES)) {
    assert.doesNotMatch(src, /location\?\.address/, `${name} must not read location.address`);
    assert.doesNotMatch(src, /teacher\.location\.address/, `${name} must not render teacher.location.address`);
  }
});

test("cards do not add teacher_offers runtime or payment imports", () => {
  for (const rel of CARD_FILES) {
    const src = read(rel);
    assert.doesNotMatch(src, /from ["']@\/lib\/offers/);
    assert.doesNotMatch(src, /from ["']stripe["']/i);
    assert.doesNotMatch(src, /from ["']@stripe\//);
    assert.doesNotMatch(src, /from ["']@\/lib\/payments/);
  }
});

test("clickable cards share subtle hover without layout-breaking scale", () => {
  assert.match(DISPLAY, /PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS/);
  assert.match(DISPLAY, /motion-safe:hover:-translate-y-0\.5/);
  assert.match(DISPLAY, /hover:border-emerald-200/);
  assert.match(DISPLAY, /focus-visible:ring-2/);
  assert.match(SEARCH_CARD, /PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS/);
  assert.match(LANDING, /PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS/);
  assert.match(HERO, /PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS/);
  assert.match(RELATED, /PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS/);
  assert.match(LOCAL, /PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS/);
  assert.doesNotMatch(SEARCH_CARD, /hover:scale-\[1/);
  assert.doesNotMatch(LANDING, /hover:scale-\[1/);
});

test("avatars keep a subtle ring and cover crop", () => {
  assert.match(AVATAR, /ringClassName = "ring-1 ring-\[#E8E6DF\]"/);
  assert.match(AVATAR, /object-cover/);
  assert.match(AVATAR, /nudge teachers toward clear real-life headshots/);
});

test("teacher profile still keeps detailed trust explanation and formatted bios", () => {
  assert.match(PROFILE, /<TeacherCardIdentityCheck/);
  assert.match(PROFILE, /data-testid="teacher-profile-trust-box"/);
  assert.doesNotMatch(PROFILE, /<TeacherBadgePill\b/);
  assert.match(PROFILE, /parseTeacherProfileBio\(sanitizedBio\.content\)/);
});

test("display helpers stay display-only", () => {
  assert.equal(formatPublicTeacherDisplayName("bektache K."), "Bektache K.");
  assert.equal(formatPublicTeacherDisplayName("CRESCENCE G."), "Crescence G.");
  assert.equal(formatTeacherDisciplineLabel("chant populaire"), "Chant populaire");
  assert.equal(
    formatTeacherCardBioSnippet("-Enseignante avec plus de dix ans d'expérience."),
    "Enseignante avec plus de dix ans d'expérience.",
  );
});

test("this contract is wired into npm run test:taxonomy and test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:taxonomy"] ?? "",
    /tests\/teachers\/publicTeacherCardDisplay\.test\.ts/,
  );
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/teachers\/publicTeacherCardDisplay\.test\.ts/,
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
  console.log(`[teachers:publicTeacherCardDisplay] ${passed} tests passed`);
}
