/**
 * Search card / profile / booking trust-display contract.
 *
 * Card = compact identity checkmark
 * Profile = full trust explanation
 * Booking = caution before commitment
 *
 * UI/copy only. Payment, visibility, and teacher_offers stay untouched.
 */

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
const CARD_START = SEARCH_PAGE.indexOf("function TeacherCard({");
assert.ok(CARD_START >= 0, "expected inline TeacherCard in student search page");
const TEACHER_CARD = SEARCH_PAGE.slice(CARD_START);
const PROFILE_SRC = read("components/TeacherProfile.tsx");
const BOOKING_SRC = read("components/BookingModal.tsx");
const AVATAR_SRC = read("components/TeacherAvatar.tsx");
const FR = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
const EN = JSON.parse(read("lib/i18n/locales/en.json")) as Record<string, string>;
const ES = JSON.parse(read("lib/i18n/locales/es.json")) as Record<string, string>;
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

test("search card does not render identity/experience/diploma badge pills", () => {
  assert.doesNotMatch(TEACHER_CARD, /<TeacherBadgePill\b/);
  assert.doesNotMatch(TEACHER_CARD, /getSearchCardTeacherBadges\(/);
  assert.doesNotMatch(TEACHER_CARD, /teacherBadgeVerifiedExperience/);
  assert.doesNotMatch(TEACHER_CARD, /teacherBadgeDiplomaVerified/);
  assert.doesNotMatch(TEACHER_CARD, /teacherBadgeNewTeacher/);
});

test("search card shows a compact identity checkmark only when verified", () => {
  assert.match(TEACHER_CARD, /isPublicTeacherIdentityVerified\(/);
  assert.match(TEACHER_CARD, /<TeacherCardIdentityCheck verified=\{identityVerified\}/);
  assert.match(TEACHER_CARD, /teacherBadgeIdentityVerified/);
  assert.doesNotMatch(TEACHER_CARD, /teacherTrustIdentityNotVerifiedTitle/);
  assert.doesNotMatch(TEACHER_CARD, /bookingIdentityCautionTitle/);
  assert.match(AVATAR_SRC, /ring-1 ring-\[#E8E6DF\]/);
});

test("search card shows compact rating when reviews exist, otherwise an empty top-right slot", () => {
  assert.match(TEACHER_CARD, /hasPublicTeacherReviews\(/);
  assert.match(TEACHER_CARD, /teacher\.reviews/);
  assert.match(TEACHER_CARD, /teacher\.rating/);
  assert.doesNotMatch(TEACHER_CARD, /teacherCardNew/);
  assert.doesNotMatch(TEACHER_CARD, /Nouveau sur Pratiqo/);
});

test("search card name stays truncated and is not nested in extra controls", () => {
  assert.match(
    TEACHER_CARD,
    /<span className="truncate">\{formatPublicTeacherDisplayName\(teacher\.name\)\}<\/span>/,
  );
  const innerButtons = [...TEACHER_CARD.matchAll(/<button\b/g)];
  assert.equal(innerButtons.length, 1, "the card itself is the only button");
  assert.doesNotMatch(TEACHER_CARD, /<Link\b/);
  assert.doesNotMatch(TEACHER_CARD, /<a\b/);
});

test("search card keeps legacy price display without À partir de", () => {
  assert.match(TEACHER_CARD, /When teacher_offers launches/);
  assert.match(TEACHER_CARD, /teacher\.pricePerLesson/);
  assert.doesNotMatch(TEACHER_CARD, /t\(["']teacherPriceFrom["']\)/);
  assert.doesNotMatch(TEACHER_CARD, /t\(["']publicTeacherCardFromPerHour["']\)/);
  assert.doesNotMatch(SEARCH_PAGE, /from ["']@\/lib\/offers/);
});

test("search card avatar is larger on desktop and still reasonable on mobile", () => {
  assert.match(TEACHER_CARD, /size=\{PUBLIC_TEACHER_CARD_AVATAR_SIZE_DESKTOP\}/);
  assert.match(TEACHER_CARD, /className=\{PUBLIC_TEACHER_CARD_AVATAR_SIZE_CLASS\}/);
});

test("public trust surfaces use collapsed identityVerified only, not manual source", () => {
  assert.match(TEACHER_CARD, /identityVerified:\s*teacher\.identityVerified/);
  assert.doesNotMatch(TEACHER_CARD, /identityVerifiedManually/);
  assert.match(BOOKING_SRC, /identityVerified:\s*teacher\.identityVerified/);
  assert.doesNotMatch(BOOKING_SRC, /identityVerifiedManually/);
  assert.doesNotMatch(PROFILE_SRC, /identityVerifiedManually/);
});

test("teacher profile still shows detailed trust badges", () => {
  assert.match(PROFILE_SRC, /<TeacherCardIdentityCheck/);
  assert.doesNotMatch(PROFILE_SRC, /getCompactTeacherBadges\(/);
  assert.doesNotMatch(PROFILE_SRC, /<TeacherBadgePill\b/);
  assert.match(PROFILE_SRC, /teacherBadgeIdentityVerified/);
  assert.match(PROFILE_SRC, /teacherTrustPaymentProtected/);
  assert.match(PROFILE_SRC, /teacherTrustContactProtected/);
  assert.match(PROFILE_SRC, /data-testid="teacher-profile-trust-box"/);
});

test("teacher profile shows a neutral non-verified identity note", () => {
  assert.match(PROFILE_SRC, /identityVerifiedForTrustBox \?/);
  assert.match(PROFILE_SRC, /teacherTrustIdentityNotVerifiedTitle/);
  assert.match(PROFILE_SRC, /teacherTrustIdentityNotVerifiedDescription/);
  assert.match(PROFILE_SRC, /data-testid="teacher-profile-identity-unverified"/);
  assert.doesNotMatch(
    PROFILE_SRC.slice(PROFILE_SRC.indexOf("teacher-profile-identity-unverified"), PROFILE_SRC.indexOf("teacher-profile-identity-unverified") + 800),
    /text-rose-/,
    "non-verified identity note must stay neutral, not alarming",
  );
});

test("profile modal avatar is larger than the search card avatar", () => {
  assert.match(PROFILE_SRC, /size=\{112\}/);
  assert.match(PROFILE_SRC, /sm:!h-32 sm:!w-32/);
  assert.match(TEACHER_CARD, /PUBLIC_TEACHER_CARD_AVATAR_SIZE_DESKTOP/);
  assert.match(AVATAR_SRC, /object-cover/);
  assert.doesNotMatch(PROFILE_SRC, /photoLightboxOpen/);
  assert.doesNotMatch(PROFILE_SRC, /teacherProfileEnlargePhoto/);
});

test("booking modal shows identity caution only for non-verified teachers", () => {
  assert.match(BOOKING_SRC, /isPublicTeacherIdentityVerified\(/);
  assert.match(BOOKING_SRC, /identityCautionAcknowledged/);
  assert.match(BOOKING_SRC, /!teacherIdentityVerified && !identityCautionAcknowledged/);
  assert.match(BOOKING_SRC, /data-testid="booking-identity-caution"/);
  assert.match(BOOKING_SRC, /bookingIdentityCautionTitle/);
  assert.match(BOOKING_SRC, /bookingIdentityCautionBody/);
  assert.match(BOOKING_SRC, /bookingIdentityCautionContinue/);
  assert.match(BOOKING_SRC, /setIdentityCautionAcknowledged\(true\)/);
  assert.match(BOOKING_SRC, /setStep\("preferences"\)/);
});

test("booking identity caution is client-side only and does not change payment logic", () => {
  assert.match(BOOKING_SRC, /const \[identityCautionAcknowledged, setIdentityCautionAcknowledged\] = useState\(false\)/);
  assert.match(BOOKING_SRC, /payableAmountCents/);
  assert.match(BOOKING_SRC, /handleConfirmAndPay/);
  assert.match(BOOKING_SRC, /\/api\/bookings/);
  assert.doesNotMatch(BOOKING_SRC, /identity_caution/);
  assert.doesNotMatch(BOOKING_SRC, /from\s+["']stripe["']/);
  assert.doesNotMatch(BOOKING_SRC, /from\s+["']@stripe\//);
  assert.doesNotMatch(BOOKING_SRC, /from\s+["']@\/lib\/payments/);
  assert.doesNotMatch(BOOKING_SRC, /from ["']@\/lib\/offers/);
});

test("no private address is exposed on search card, profile, or booking caution", () => {
  assert.doesNotMatch(TEACHER_CARD, /location\?\.address/);
  assert.doesNotMatch(TEACHER_CARD, /teacher\.location\.address/);
  assert.doesNotMatch(PROFILE_SRC, /teacher\.location\.address/);
  const cautionIdx = BOOKING_SRC.indexOf("booking-identity-caution");
  assert.ok(cautionIdx >= 0);
  const cautionBlock = BOOKING_SRC.slice(cautionIdx, cautionIdx + 900);
  assert.doesNotMatch(cautionBlock, /studentAddress/);
  assert.doesNotMatch(cautionBlock, /location\.address/);
});

test("i18n copy matches the agreed FR/EN/ES trust and booking caution strings", () => {
  assert.equal(FR.teacherTrustIdentityNotVerifiedTitle, "Identité non vérifiée par Pratiqo");
  assert.equal(EN.teacherTrustIdentityNotVerifiedTitle, "Identity not verified by Pratiqo");
  assert.equal(ES.teacherTrustIdentityNotVerifiedTitle, "Identidad no verificada por Pratiqo");
  assert.equal(FR.bookingIdentityCautionTitle, "Identité non vérifiée");
  assert.equal(EN.bookingIdentityCautionTitle, "Identity not verified");
  assert.equal(ES.bookingIdentityCautionTitle, "Identidad no verificada");
  assert.equal(FR.bookingIdentityCautionContinue, "Je comprends et je veux continuer");
  assert.equal(EN.bookingIdentityCautionContinue, "I understand and want to continue");
  assert.equal(ES.bookingIdentityCautionContinue, "Entiendo y quiero continuar");
  assert.match(FR.bookingIdentityCautionBody, /cours en ligne ou un lieu public/);
  assert.match(EN.bookingIdentityCautionBody, /online lesson or a public place/);
  assert.match(ES.bookingIdentityCautionBody, /clase en línea o un lugar público/);
});

test("this contract is wired into npm run test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/teacherSearch\/teacherTrustDisplay\.test\.ts/,
    "teacherTrustDisplay tests must run in the launch-critical suite",
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
  console.log(`[teacherSearch:teacherTrustDisplay] ${passed} tests passed`);
}
