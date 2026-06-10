/**
 * tests/yo/yopratiqoPublicBridgeUx.test.ts
 *
 * Defends the /yo public-bridge UX fix:
 *
 *   • the misleading "coming-soon" consent checkbox + fake demo
 *     summary no longer mount on /yo;
 *   • the real travel companion visual is shown on /yo;
 *   • honest auth-aware CTAs (sign-in / progress / RD module /
 *     find-a-teacher) are wired with the routes audited from the
 *     existing app (no invented paths);
 *   • the *real* booking consent flow and the student progress
 *     companion card are still in place — this PR does not regress
 *     PR #145 or the student-companion-card PR.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

let pass = 0;
const ok = (label: string) => {
  pass += 1;
  console.log(`  ok  ${label}`);
};

// ─────────────────────────────────────────────────────────────────────────
// Paths under contract
// ─────────────────────────────────────────────────────────────────────────

const YO_PAGE_PATH = "app/yo/page.tsx";
const PUBLIC_CARD_PATH = "components/yo/YoPublicCompanionOnboardingCard.tsx";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const STUDENT_PROGRESS_PATH = "app/(app)/student/progress/page.tsx";
const STUDENT_COMPANION_CARD_PATH = "components/yo/YoStudentCompanionCard.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";
const COMPANION_AVATAR_PATH = "components/companion/CompanionAvatar.tsx";
const COMPANION_MANIFEST_PATH = "lib/companion/companionVisuals.ts";
const LOGIN_PAGE_PATH = "app/login/page.tsx";
const FIND_TEACHER_PAGE_PATH = "app/(marketing)/trouver-un-prof/page.tsx";
const RD_HUB_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";

const yoSrc = read(YO_PAGE_PATH);
const cardSrc = read(PUBLIC_CARD_PATH);
const bookingModalSrc = read(BOOKING_MODAL_PATH);
const studentProgressSrc = read(STUDENT_PROGRESS_PATH);
const studentCompanionCardSrc = read(STUDENT_COMPANION_CARD_PATH);
const productConfigSrc = read(PRODUCT_CONFIG_PATH);

// ─────────────────────────────────────────────────────────────────────────
// 1. /yo no longer mounts a consent-checkbox section in comingSoon mode
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(
  yoSrc,
  /<YoTeacherBridgeConsentSection\b/,
  "/yo must NOT mount <YoTeacherBridgeConsentSection /> (the coming-soon checkbox preview)",
);
assert.doesNotMatch(
  yoSrc,
  /from\s+["']@\/components\/yo\/YoTeacherBridgeConsentSection["']/,
  "/yo must NOT import YoTeacherBridgeConsentSection",
);
assert.doesNotMatch(
  yoSrc,
  /<YoTeacherBridgeTeaser\b/,
  "/yo must NOT mount the legacy <YoTeacherBridgeTeaser /> (which renders the 'Bientôt' badge)",
);
ok("1) /yo no longer mounts the coming-soon consent checkbox section or the teaser");

// ─────────────────────────────────────────────────────────────────────────
// 2. /yo no longer contains "Cette case ne crée pas encore de partage"
// ─────────────────────────────────────────────────────────────────────────

const FAKE_DISCLAIMER = "Cette case ne crée pas encore de partage";
assert.ok(
  !yoSrc.includes(FAKE_DISCLAIMER),
  `/yo must NOT contain the misleading caption "${FAKE_DISCLAIMER}"`,
);
assert.ok(
  !cardSrc.includes(FAKE_DISCLAIMER),
  `the new public card must NOT contain the misleading caption "${FAKE_DISCLAIMER}"`,
);
ok("2) /yo no longer contains 'Cette case ne crée pas encore de partage'");

// ─────────────────────────────────────────────────────────────────────────
// 3. /yo no longer contains "Bientôt disponible : la sauvegarde du consentement"
// ─────────────────────────────────────────────────────────────────────────

// Match the *specific* bridge-consent coming-soon copy from
// `STUDENT_CONSENT_COMING_SOON_NOTE` in lib/yopratiqo/teacherBridgeCopy.ts.
// We intentionally do NOT forbid the generic phrase "Bientôt disponible"
// because /yo legitimately uses it for the Music + Academic-support
// placeholder discipline cards.
const FAKE_STATUS = "sauvegarde du consentement";
assert.ok(
  !yoSrc.includes(FAKE_STATUS),
  `/yo must NOT contain the misleading "Bientôt disponible : la ${FAKE_STATUS}…" status pill`,
);
assert.ok(
  !cardSrc.includes(FAKE_STATUS),
  "the new public card must NOT contain the bridge-consent 'sauvegarde du consentement' coming-soon copy",
);
ok("3) /yo no longer contains the misleading 'Bientôt disponible : la sauvegarde du consentement' status pill");

// ─────────────────────────────────────────────────────────────────────────
// 4. /yo public bridge card uses CompanionAvatar / travel visual system
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  cardSrc,
  /import\s*\{\s*CompanionAvatar\s*\}\s*from\s*["']@\/components\/companion\/CompanionAvatar["']/,
  "new public card must import CompanionAvatar",
);
assert.match(
  cardSrc,
  /<CompanionAvatar[\s\S]*?visualId="travel"/,
  "new public card must request the travel visualId",
);
assert.match(
  yoSrc,
  /<YoPublicCompanionOnboardingCard\b/,
  "/yo must mount <YoPublicCompanionOnboardingCard />",
);
ok("4) /yo public bridge card uses CompanionAvatar with the travel visual system");

// ─────────────────────────────────────────────────────────────────────────
// 5. /yo has a sign-in CTA wired to the audited /login route
// ─────────────────────────────────────────────────────────────────────────

// The login route must still exist where we deep-link to.
read(LOGIN_PAGE_PATH);
// Accept either an inline href= literal or a centralized hrefs constant
// (the card uses a HREFS object so the same string can be greppable
// from a single place).
assert.match(
  cardSrc,
  /["']\/login\?next=\/student\/progress["']/,
  "card must deep-link sign-in CTA to /login with a sanitized next= back to /student/progress",
);
assert.match(
  cardSrc,
  /Se connecter pour sauvegarder mes progrès/,
  "FR sign-in CTA copy must match the brief verbatim",
);
assert.match(
  cardSrc,
  /Sign in to save my progress/,
  "EN sign-in CTA copy must match the brief verbatim",
);
assert.match(
  cardSrc,
  /Inicia sesión para guardar mi progreso/,
  "ES sign-in CTA copy must be present",
);
ok("5) /yo has an audited sign-in CTA wired to /login?next=/student/progress");

// ─────────────────────────────────────────────────────────────────────────
// 6. /yo links to the Dominican Republic module path
// ─────────────────────────────────────────────────────────────────────────

// The RD hub must still exist where we deep-link to.
read(RD_HUB_PAGE_PATH);
assert.match(
  cardSrc,
  /["']\/yo\/langues\/espagnol\/pays\/republique-dominicaine["']/,
  "card must link to the Dominican Republic course path",
);
assert.match(
  cardSrc,
  /Commencer République dominicaine/,
  "FR RD CTA copy must match the brief verbatim",
);
ok("6) /yo card links to the Dominican Republic Spanish course path");

// ─────────────────────────────────────────────────────────────────────────
// 7. /yo links to /student/progress for authenticated follow-up
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  cardSrc,
  /["']\/student\/progress["']/,
  "card must deep-link authenticated users to /student/progress",
);
assert.match(
  cardSrc,
  /Voir mon compagnon YoPratiqo/,
  "FR progress CTA copy must match the brief verbatim",
);
assert.match(
  cardSrc,
  /useAuth/,
  "card must consult useAuth to switch the primary CTA between sign-in and progress",
);
// Also verify the find-a-teacher CTA still uses the audited route.
read(FIND_TEACHER_PAGE_PATH);
assert.match(
  cardSrc,
  /["']\/trouver-un-prof["']/,
  "card must keep the audited /trouver-un-prof link as the tertiary CTA",
);
ok("7) /yo card links to /student/progress for authenticated users (auth-aware via useAuth)");

// ─────────────────────────────────────────────────────────────────────────
// 8. BookingModal still mounts YoBookingTeacherBridgeConsent
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  bookingModalSrc,
  /import\s*\{\s*YoBookingTeacherBridgeConsent\s*\}\s*from\s*["']@\/components\/yo\/YoBookingTeacherBridgeConsent["']/,
  "BookingModal must still import YoBookingTeacherBridgeConsent",
);
assert.match(
  bookingModalSrc,
  /<YoBookingTeacherBridgeConsent\b/,
  "BookingModal must still render <YoBookingTeacherBridgeConsent />",
);
assert.match(
  bookingModalSrc,
  /\/api\/bookings\/\$\{bookingId\}\/yopratiqo-bridge/,
  "BookingModal must still POST to /api/bookings/<id>/yopratiqo-bridge",
);
ok("8) BookingModal still mounts YoBookingTeacherBridgeConsent and still POSTs to the bridge API");

// ─────────────────────────────────────────────────────────────────────────
// 9. BookingModal consent still defaults to false
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  bookingModalSrc,
  /const \[yoBridgeConsent, setYoBridgeConsent\] = useState\(false\)/,
  "BookingModal must keep the consent checkbox initialized to useState(false)",
);
ok("9) BookingModal consent checkbox still defaults to false (PR #145 not regressed)");

// ─────────────────────────────────────────────────────────────────────────
// 10. Student progress page still mounts YoStudentCompanionCard
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  studentProgressSrc,
  /import\s*\{\s*YoStudentCompanionCard\s*\}\s*from\s*["']@\/components\/yo\/YoStudentCompanionCard["']/,
  "student progress page must still import YoStudentCompanionCard",
);
assert.match(
  studentProgressSrc,
  /<YoStudentCompanionCard\b/,
  "student progress page must still mount <YoStudentCompanionCard />",
);
assert.match(
  studentProgressSrc,
  /<CompanionCard\b/,
  "student progress page must still mount the legacy <CompanionCard />",
);
assert.match(
  studentCompanionCardSrc,
  /export\s+function\s+YoStudentCompanionCard\b/,
  "YoStudentCompanionCard component must still be exported",
);
ok("10) student progress page still mounts YoStudentCompanionCard next to the legacy CompanionCard");

// ─────────────────────────────────────────────────────────────────────────
// 11. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|correctOptionId|correct_option_id|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["new public card", cardSrc],
  ["/yo page", yoSrc],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("11) no raw quiz fields introduced in the new public card or /yo page");

// ─────────────────────────────────────────────────────────────────────────
// 12. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
assert.doesNotMatch(
  cardSrc,
  STRIPE_PATTERN,
  "the new public card must not introduce Stripe / price_id references",
);
ok("12) paid YoPratiqo checkout remains disabled and no Stripe references added");

// ─────────────────────────────────────────────────────────────────────────
// 13. No restricted system touched
// ─────────────────────────────────────────────────────────────────────────

const restrictedPathPatterns: RegExp[] = [
  /^app\/api\/stripe\//,
  /^app\/api\/.*checkout/i,
  /^app\/api\/.*payment/i,
  /^lib\/payments\//,
  /^lib\/pricing\//,
  /^lib\/config\/membrePro\.ts$/,
  /^lib\/commissions\//,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^public\/.*\.(?:mp3|wav|m4a)$/i,
  /^public\/audio\//,
  /^scripts\/(?:generate-yopratiqo-audio|.*openai)/i,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /^lib\/seo\//,
];
const status = execSync("git status --porcelain -uall", { cwd: root, encoding: "utf8" });
const changedFiles = status
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) =>
    line
      .replace(/^[ MADRCU?!]{1,2}\s+/, "")
      .replace(/^"|"$/g, "")
      .replace(/\\/g, "/"),
  );
const ignoredUntracked = new Set([
  "Untitled",
  "docs/LAUNCH_READINESS_ANALYSIS.md",
  "pratiqo-legal-export-20260528-2221.zip",
]);
for (const file of changedFiles) {
  if (ignoredUntracked.has(file)) continue;
  for (const re of restrictedPathPatterns) {
    if (re.test(file)) {
      assert.fail(`restricted system touched by public-bridge-ux fix: ${file}`);
    }
  }
}
ok("13) no restricted system (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO) touched");

// Cross-check that the companion manifest is the single source of truth
// (defense against an accidental hardcoded path slipping into the new card).
const HARDCODED_COMPANION_PATH = /["'`]\/?(?:public\/)?companion\/travel\//;
assert.doesNotMatch(
  cardSrc,
  HARDCODED_COMPANION_PATH,
  "new public card must not hardcode a /companion/travel/... path — go through CompanionAvatar / getCompanionVisualAsset",
);
read(COMPANION_AVATAR_PATH);
read(COMPANION_MANIFEST_PATH);

console.log(`\n${pass} public-bridge-ux assertions passed`);
