/**
 * Premium teacher-profile modal polish: bio lists, header vs trust box,
 * booking duration copy, calm discipline chips.
 * Display only — no Stripe, payments, teacher_offers, or visibility changes.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sanitizePublicTeacherBio } from "@/lib/teacherProfile/sanitizePublicBio";
import {
  parseTeacherProfileBio,
  parseTeacherProfileBioListItem,
} from "@/lib/teachers/profileBio";
import { PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS } from "@/lib/teachers/display";

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
const BIO_COMPONENT = read("components/teachers/TeacherProfileBio.tsx");
const BIO_HELPER = read("lib/teachers/profileBio.ts");
const DISPLAY = read("lib/teachers/display.ts");
const PRICE = read("components/PriceDisplay.tsx");
const SEARCH = read("app/(app)/student/search/page.tsx");
const TEACHER_CARD = SEARCH.slice(SEARCH.indexOf("function TeacherCard({"));
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
const FR = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
const EN = JSON.parse(read("lib/i18n/locales/en.json")) as Record<string, string>;
const ES = JSON.parse(read("lib/i18n/locales/es.json")) as Record<string, string>;

const HEADER = PROFILE.slice(
  PROFILE.indexOf("Compact header"),
  PROFILE.indexOf("Full selected disciplines"),
);
const TRUST = PROFILE.slice(PROFILE.indexOf("Public trust card"));
const BOOKING = PROFILE.slice(
  PROFILE.indexOf("Booking widget"),
  PROFILE.indexOf("Public trust card"),
);

test("profile bio converts leading dash lines into list items", () => {
  const blocks = parseTeacherProfileBio(
    "-Enseignante avec plus de dix ans d'expérience en enseignement du français.\n\n-Ayant enseigné au primaire, au secondaire, au collégial...\n\n-Pratique professionnelle de la photographie depuis plus de dix ans...",
  );
  assert.deepEqual(blocks, [
    {
      type: "list",
      items: [
        "Enseignante avec plus de dix ans d'expérience en enseignement du français.",
        "Ayant enseigné au primaire, au secondaire, au collégial...",
        "Pratique professionnelle de la photographie depuis plus de dix ans...",
      ],
    },
  ]);
});

test("profile bio converts bullet and asterisk lines into list items", () => {
  assert.equal(parseTeacherProfileBioListItem("• Professeur passionné de piano."), "Professeur passionné de piano.");
  assert.equal(parseTeacherProfileBioListItem("* Cours adaptés à chaque élève."), "Cours adaptés à chaque élève.");
  assert.equal(parseTeacherProfileBioListItem("– Disponible en semaine."), "Disponible en semaine.");
  assert.equal(parseTeacherProfileBioListItem("— Cours en ligne."), "Cours en ligne.");
  assert.equal(parseTeacherProfileBioListItem("· Photo et français."), "Photo et français.");
  assert.equal(parseTeacherProfileBioListItem("Marc-André enseigne le piano."), null);
});

test("profile bio preserves normal paragraphs", () => {
  assert.deepEqual(parseTeacherProfileBio("Professeure de piano depuis 12 ans à Montréal."), [
    { type: "paragraph", text: "Professeure de piano depuis 12 ans à Montréal." },
  ]);
  assert.deepEqual(
    parseTeacherProfileBio("Premier paragraphe.\n\nDeuxième paragraphe."),
    [
      { type: "paragraph", text: "Premier paragraphe." },
      { type: "paragraph", text: "Deuxième paragraphe." },
    ],
  );
});

test("profile bio handles mixed paragraph and list content in order", () => {
  const blocks = parseTeacherProfileBio(
    "J'enseigne à Montréal.\n\n- Français langue seconde\n- Photographie\n\nLes cours sont bienveillants.",
  );
  assert.deepEqual(blocks, [
    { type: "paragraph", text: "J'enseigne à Montréal." },
    { type: "list", items: ["Français langue seconde", "Photographie"] },
    { type: "paragraph", text: "Les cours sont bienveillants." },
  ]);
});

test("profile bio does not render raw HTML and does not use dangerouslySetInnerHTML", () => {
  const blocks = parseTeacherProfileBio("<b>Hello</b>\n\n<script>alert(1)</script>");
  assert.deepEqual(blocks, [
    { type: "paragraph", text: "<b>Hello</b>" },
    { type: "paragraph", text: "<script>alert(1)</script>" },
  ]);
  assert.doesNotMatch(BIO_COMPONENT, /dangerouslySetInnerHTML\s*=/);
  assert.doesNotMatch(PROFILE, /dangerouslySetInnerHTML\s*=/);
  assert.match(BIO_COMPONENT, /\{block\.text\}/);
  assert.match(BIO_COMPONENT, /\{item\}/);
});

test("profile sanitizes then parses bio for display", () => {
  const sanitized = sanitizePublicTeacherBio(
    "-Écrivez-moi à elena.dance@example.com\n-Disponible en semaine.",
    "fr",
  );
  const blocks = parseTeacherProfileBio(sanitized.content);
  assert.equal(sanitized.masked, true);
  assert.equal(blocks[0]?.type, "list");
  assert.doesNotMatch(JSON.stringify(blocks), /@/);
  assert.match(PROFILE, /parseTeacherProfileBio\(sanitizedBio\.content\)/);
  assert.match(PROFILE, /<TeacherProfileBio/);
});

test("profile header does not show detailed trust or Nouveau pills", () => {
  assert.doesNotMatch(HEADER, /<TeacherBadgePill\b/);
  assert.doesNotMatch(HEADER, /teacherBadgeVerifiedExperience/);
  assert.doesNotMatch(HEADER, /teacherBadgeDiplomaVerified/);
  assert.doesNotMatch(HEADER, /teacherBadgeNewTeacher/);
  assert.doesNotMatch(HEADER, /Nouveau sur Pratiqo/);
  assert.doesNotMatch(PROFILE, /teacherBadgeNewTeacher/);
  assert.match(HEADER, /<TeacherCardIdentityCheck/);
  assert.match(HEADER, /teacherNoReviewsYet/);
});

test("right-side trust box still shows detailed public trust outcomes", () => {
  assert.match(TRUST, /data-testid="teacher-profile-trust-box"/);
  assert.match(TRUST, /teacherTrustTitle/);
  assert.match(TRUST, /teacherBadgeIdentityVerified/);
  assert.match(TRUST, /teacherBadgeVerifiedExperience/);
  assert.match(TRUST, /teacherBadgeDiplomaVerified/);
  assert.match(TRUST, /teacherTrustPaymentProtected/);
  assert.match(TRUST, /teacherTrustContactProtected/);
  assert.match(TRUST, /teacherTrustIdentityNotVerifiedTitle/);
  assert.doesNotMatch(TRUST, /identityVerifiedManually/);
  assert.doesNotMatch(TRUST, /identity_verified_manually/);
  assert.doesNotMatch(TRUST, /identity_manual_verification_note/);
});

test("booking price explanation appears only once and amount stays hourly display", () => {
  assert.match(BOOKING, /publicTeacherProfileFinalPriceDependsOnDuration/);
  assert.doesNotMatch(BOOKING, /bookingNoHiddenFees/);
  assert.equal((BOOKING.match(/publicTeacherProfileFinalPriceDependsOnDuration/g) ?? []).length, 1);
  assert.match(BOOKING, /amount=\{Number\(teacher\.pricePerLesson\)\}/);
  assert.match(BOOKING, /perHour/);
  assert.match(PRICE, /text-sm font-normal text-slate-400">\/h</);
  assert.match(FR.publicTeacherProfileFinalPriceDependsOnDuration, /durée/i);
  assert.match(EN.publicTeacherProfileFinalPriceDependsOnDuration, /duration/i);
  assert.match(ES.publicTeacherProfileFinalPriceDependsOnDuration, /duración/i);
});

test("discipline pills use one subtle non-clickable style and wrap", () => {
  assert.match(DISPLAY, /PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS/);
  assert.match(PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS, /bg-slate-50/);
  assert.match(PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS, /border-slate-200/);
  assert.match(PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS, /rounded-full/);
  assert.doesNotMatch(PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS, /hover:/);
  assert.doesNotMatch(PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS, /bg-teal-/);
  assert.match(PROFILE, /teacher-profile-discipline-chips/);
  assert.match(PROFILE, /flex flex-wrap gap-2/);
  assert.match(PROFILE, /PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS/);
});

test("cards do not regress and no payment or checkout offer wiring is added", () => {
  assert.doesNotMatch(TEACHER_CARD, /<TeacherBadgePill\b/);
  assert.match(TEACHER_CARD, /<TeacherCardIdentityCheck/);
  assert.doesNotMatch(PROFILE, /from ["']stripe["']/);
  assert.doesNotMatch(PROFILE, /from ["']@stripe\//);
  assert.doesNotMatch(PROFILE, /teacherOffersClient|teacher_offer_id/);
  assert.doesNotMatch(BIO_HELPER, /from ["']stripe["']/);
  assert.doesNotMatch(PROFILE, /Mes formules|teacher_offers/);
});

test("this contract is wired into npm run test:taxonomy and test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:taxonomy"] ?? "",
    /tests\/teachers\/teacherProfileModalPremium\.test\.ts/,
  );
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/teachers\/teacherProfileModalPremium\.test\.ts/,
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
  console.log(`[teachers:teacherProfileModalPremium] ${passed} tests passed`);
}
