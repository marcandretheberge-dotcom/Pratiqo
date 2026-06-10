/**
 * tests/yo/yopratiqoAppLikeLanding.test.ts
 *
 * Static contract test for the app-like /yo onboarding redesign.
 * Locks in:
 *   • the three new design primitives (YoAppLandingShell,
 *     YoAppHeroCard, YoAppValueStrip),
 *   • the safe asset import path (`public/images/yo/app/*.png`,
 *     each a real transparent RGBA PNG with a valid PNG signature),
 *   • the app-style hero copy in FR / EN / ES,
 *   • the primary CTA to the Dominican Republic intro route,
 *   • the login CTA wired to the audited `/login` route,
 *   • the free-introduction note,
 *   • the removal of the misleading public-bridge consent surfaces
 *     (no checkbox on /yo, no "coming-soon" consent copy), AND
 *   • the preservation of every contract the prior PRs locked in:
 *     the public companion onboarding card still mounts lower on
 *     /yo, BookingModal still mounts the booking-time consent,
 *     /student/progress still mounts the YoPratiqo companion card,
 *     paid YoPratiqo checkout stays disabled, no raw quiz fields
 *     leak, and no restricted system path is touched.
 *
 * All assertions are static (file system + string reads). No
 * runtime server, no Supabase, no browser.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
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
const SHELL_PATH = "components/yo/YoAppLandingShell.tsx";
const HERO_PATH = "components/yo/YoAppHeroCard.tsx";
const STRIP_PATH = "components/yo/YoAppValueStrip.tsx";
const FONTS_PATH = "lib/yo/appLandingFonts.ts";
const PUBLIC_CARD_PATH = "components/yo/YoPublicCompanionOnboardingCard.tsx";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const STUDENT_PROGRESS_PATH = "app/(app)/student/progress/page.tsx";
const STUDENT_COMPANION_CARD_PATH = "components/yo/YoStudentCompanionCard.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

// Prototype assets we imported.
const APP_ASSETS: readonly string[] = [
  "public/images/yo/app/hero.png",
  "public/images/yo/app/cat-travel.png",
  "public/images/yo/app/cat-culture.png",
  "public/images/yo/app/cat-talk.png",
  "public/images/yo/app/cat-explore.png",
];

// ─────────────────────────────────────────────────────────────────────────
// 1. /yo renders YoPratiqoLogo (carried from PR #154's contract)
// ─────────────────────────────────────────────────────────────────────────

const yoSrc = read(YO_PAGE_PATH);
assert.match(
  yoSrc,
  /import\s*\{\s*YoPratiqoLogo\s*\}\s*from\s*["']@\/components\/yo\/YoPratiqoLogo["']/,
  "/yo must still import YoPratiqoLogo",
);
assert.match(yoSrc, /<YoPratiqoLogo\b/, "/yo must still render <YoPratiqoLogo />");
// And critically: the global Pratiqo brand must NOT be used on /yo.
assert.doesNotMatch(
  yoSrc,
  /<PratiqoLogo\b/,
  "/yo must NOT render the global <PratiqoLogo /> (use YoPratiqoLogo on YoPratiqo surfaces)",
);
ok("1) /yo renders <YoPratiqoLogo /> (and not the global <PratiqoLogo />)");

// ─────────────────────────────────────────────────────────────────────────
// 2. /yo uses the new app-like landing primitives
// ─────────────────────────────────────────────────────────────────────────

for (const file of [SHELL_PATH, HERO_PATH, STRIP_PATH]) {
  assert.ok(existsSync(path.join(root, file)), `${file} must exist`);
}
const shellSrc = read(SHELL_PATH);
const heroSrc = read(HERO_PATH);
const stripSrc = read(STRIP_PATH);

assert.match(shellSrc, /export\s+function\s+YoAppLandingShell\b/);
assert.match(heroSrc, /export\s+function\s+YoAppHeroCard\b/);
assert.match(stripSrc, /export\s+function\s+YoAppValueStrip\b/);

assert.match(
  yoSrc,
  /import\s*\{\s*YoAppHeroCard\s*\}\s*from\s*["']@\/components\/yo\/YoAppHeroCard["']/,
  "/yo must import YoAppHeroCard",
);
assert.match(
  yoSrc,
  /import\s*\{\s*YoAppLandingShell\s*\}\s*from\s*["']@\/components\/yo\/YoAppLandingShell["']/,
  "/yo must import YoAppLandingShell",
);
assert.match(
  yoSrc,
  /import\s*\{\s*YoAppValueStrip\s*\}\s*from\s*["']@\/components\/yo\/YoAppValueStrip["']/,
  "/yo must import YoAppValueStrip",
);
assert.match(yoSrc, /<YoAppLandingShell\b/, "/yo must mount <YoAppLandingShell />");
assert.match(yoSrc, /<YoAppHeroCard\b/, "/yo must mount <YoAppHeroCard />");
assert.match(yoSrc, /<YoAppValueStrip\b/, "/yo must mount <YoAppValueStrip />");
ok("2) /yo uses the new app-like landing primitives (Shell + Hero + ValueStrip)");

// ─────────────────────────────────────────────────────────────────────────
// 3. /yo references the imported app hero asset (and asset is a real PNG)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  heroSrc,
  /["']\/images\/yo\/app\/hero\.png["']/,
  "YoAppHeroCard must reference /images/yo/app/hero.png",
);
// And every imported prototype asset must exist on disk and be a
// valid transparent RGBA PNG. The PNG file signature is `89 50 4E
// 47 0D 0A 1A 0A`, and color type 6 in the IHDR chunk (byte 25)
// means RGBA — no opaque-only assets, no JPEGs masquerading as
// PNG.
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const asset of APP_ASSETS) {
  const abs = path.join(root, asset);
  assert.ok(existsSync(abs), `${asset} must exist on disk`);
  const stat = statSync(abs);
  assert.ok(stat.size >= 4096, `${asset} must be a real PNG (got ${stat.size} bytes)`);
  const bytes = readFileSync(abs);
  assert.ok(
    bytes.subarray(0, 8).equals(PNG_SIG),
    `${asset} must start with the PNG file signature`,
  );
  assert.equal(
    bytes[25],
    6,
    `${asset} must be RGBA (color type 6); got ${bytes[25]}`,
  );
}
ok("3) /yo references /images/yo/app/hero.png and all 5 imported PNGs are real transparent RGBA PNGs");

// ─────────────────────────────────────────────────────────────────────────
// 4. /yo contains the app-style headline copy in FR / EN / ES
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  heroSrc.includes("Ton prochain voyage commence aujourd’hui."),
  "YoAppHeroCard must contain the FR headline",
);
assert.ok(
  heroSrc.includes("Your next trip starts today."),
  "YoAppHeroCard must contain the EN headline",
);
assert.ok(
  heroSrc.includes("Tu próximo viaje empieza hoy."),
  "YoAppHeroCard must contain the ES headline",
);
ok("4) hero contains the app-style headline copy in FR / EN / ES");

// ─────────────────────────────────────────────────────────────────────────
// 5. /yo contains a primary CTA to the Dominican Republic intro route
// ─────────────────────────────────────────────────────────────────────────

const DR_PATH = "/yo/langues/espagnol/pays/republique-dominicaine";
// The primary CTA lives on the hero card. /yo also continues to
// link to the DR module from the existing featured course card.
// Either reachability path is acceptable, but the hero card is
// the contract under test for the new app-like flow.
assert.ok(
  heroSrc.includes(DR_PATH),
  "YoAppHeroCard must wire the primary CTA to the Dominican Republic intro route",
);
assert.match(
  heroSrc,
  /data-testid=["']yo-app-hero-primary-cta["']/,
  "YoAppHeroCard must expose the primary CTA via a stable data-testid",
);
ok("5) /yo primary CTA links to the Dominican Republic intro route");

// ─────────────────────────────────────────────────────────────────────────
// 6. /yo contains a login CTA using the existing audited /login route
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, "app/login/page.tsx")),
  "the audited /login route must still exist (login CTA depends on it)",
);
assert.match(
  heroSrc,
  /["']\/login(?:\?next=[^"']+)?["']/,
  "YoAppHeroCard must link the login CTA to /login (optionally with a sanitized next= param)",
);
assert.match(
  heroSrc,
  /data-testid=["']yo-app-hero-login-link["']/,
  "YoAppHeroCard must expose the login link via a stable data-testid",
);
ok("6) /yo login CTA uses the existing /login route");

// ─────────────────────────────────────────────────────────────────────────
// 7. /yo contains the free-introduction note in FR / EN / ES
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  heroSrc.includes("Free introductions — no card needed"),
  "YoAppHeroCard must contain the EN free-introduction note",
);
assert.ok(
  heroSrc.includes("Introductions gratuites — aucune carte requise"),
  "YoAppHeroCard must contain the FR free-introduction note",
);
assert.ok(
  heroSrc.includes("Introducciones gratis — sin tarjeta"),
  "YoAppHeroCard must contain the ES free-introduction note",
);
ok("7) hero contains the free-introduction note in FR / EN / ES");

// ─────────────────────────────────────────────────────────────────────────
// 8. /yo no longer renders the public consent checkbox
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(
  yoSrc,
  /<YoTeacherBridgeConsentSection\b/,
  "/yo must NOT mount the public consent-checkbox preview",
);
assert.doesNotMatch(
  yoSrc,
  /<YoTeacherBridgeConsentCard\b/,
  "/yo must NOT mount the bare consent card outside booking context",
);
// And none of the three new app-like primitives may introduce a
// checkbox of their own.
for (const [label, src] of [
  ["YoAppLandingShell", shellSrc],
  ["YoAppHeroCard", heroSrc],
  ["YoAppValueStrip", stripSrc],
] as const) {
  assert.doesNotMatch(
    src,
    /type=["']checkbox["']/,
    `${label} must NOT render any <input type='checkbox' />`,
  );
}
ok("8) /yo no longer renders a public consent checkbox (no checkbox in any new primitive)");

// ─────────────────────────────────────────────────────────────────────────
// 9. /yo does not render coming-soon consent copy
// ─────────────────────────────────────────────────────────────────────────

// We assert the *specific* bridge-consent copy from the old
// teaser, not the generic "Bientôt disponible" wording which /yo
// legitimately uses for the Music + Academic-support placeholder
// discipline cards lower down.
assert.ok(
  !yoSrc.includes("sauvegarde du consentement"),
  "/yo must NOT contain the bridge-consent 'sauvegarde du consentement' coming-soon copy",
);
assert.ok(
  !yoSrc.includes("Cette case ne crée pas encore de partage"),
  "/yo must NOT contain the misleading 'Cette case ne crée pas encore de partage' caption",
);
ok("9) /yo does not render the coming-soon consent copy");

// ─────────────────────────────────────────────────────────────────────────
// 10. /yo still renders the public companion onboarding lower on page
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  yoSrc,
  /import\s*\{\s*YoPublicCompanionOnboardingCard\s*\}\s*from\s*["']@\/components\/yo\/YoPublicCompanionOnboardingCard["']/,
  "/yo must still import YoPublicCompanionOnboardingCard",
);
assert.match(
  yoSrc,
  /<YoPublicCompanionOnboardingCard\b/,
  "/yo must still mount <YoPublicCompanionOnboardingCard />",
);
// Placement check: the public companion onboarding card must
// render BELOW the app-like hero card on the page (otherwise the
// onboarding hierarchy is wrong — the bridge is supposed to sit
// lower as a "what happens next" explainer).
const heroIdx = yoSrc.indexOf("<YoAppHeroCard");
const companionIdx = yoSrc.indexOf("<YoPublicCompanionOnboardingCard");
assert.ok(
  heroIdx >= 0 && companionIdx > heroIdx,
  `<YoPublicCompanionOnboardingCard /> must be mounted after <YoAppHeroCard /> on /yo (got hero=${heroIdx}, companion=${companionIdx})`,
);
// And the underlying card must still render the real travel
// companion PNG via the manifest.
const publicCardSrc = read(PUBLIC_CARD_PATH);
assert.match(
  publicCardSrc,
  /visualId=["']travel["']/,
  "public companion onboarding card must still render the travel companion visual",
);
ok("10) /yo still renders the public companion onboarding card, mounted lower on page");

// ─────────────────────────────────────────────────────────────────────────
// 11. BookingModal still mounts YoBookingTeacherBridgeConsent
// ─────────────────────────────────────────────────────────────────────────

const bookingModalSrc = read(BOOKING_MODAL_PATH);
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
// Consent still defaults to false (no opt-in by surprise).
assert.match(
  bookingModalSrc,
  /const \[yoBridgeConsent, setYoBridgeConsent\] = useState\(false\)/,
  "BookingModal must keep the consent checkbox initialized to useState(false)",
);
ok("11) BookingModal still mounts YoBookingTeacherBridgeConsent (default false, POST intact)");

// ─────────────────────────────────────────────────────────────────────────
// 12. /student/progress still mounts YoStudentCompanionCard
// ─────────────────────────────────────────────────────────────────────────

const studentProgressSrc = read(STUDENT_PROGRESS_PATH);
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
const studentCompanionCardSrc = read(STUDENT_COMPANION_CARD_PATH);
assert.match(
  studentCompanionCardSrc,
  /export\s+function\s+YoStudentCompanionCard\b/,
  "YoStudentCompanionCard component must still be exported",
);
ok("12) /student/progress still mounts YoStudentCompanionCard (next to the legacy CompanionCard)");

// ─────────────────────────────────────────────────────────────────────────
// 13. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [label, src] of [
  ["YoAppLandingShell", shellSrc],
  ["YoAppHeroCard", heroSrc],
  ["YoAppValueStrip", stripSrc],
  ["lib/yo/appLandingFonts.ts", read(FONTS_PATH)],
] as const) {
  assert.doesNotMatch(
    src,
    STRIPE_PATTERN,
    `${label} must not introduce Stripe / price_id references`,
  );
}
ok("13) paid YoPratiqo checkout remains disabled and no Stripe references added");

// ─────────────────────────────────────────────────────────────────────────
// 14. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|correctOptionId|correct_option_id|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["YoAppLandingShell", shellSrc],
  ["YoAppHeroCard", heroSrc],
  ["YoAppValueStrip", stripSrc],
  ["lib/yo/appLandingFonts.ts", read(FONTS_PATH)],
  ["/yo page", yoSrc],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("14) no raw quiz fields introduced in any of the new app-like surfaces");

// ─────────────────────────────────────────────────────────────────────────
// 15. No restricted system touched
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
const status = execSync("git status --porcelain -uall", {
  cwd: root,
  encoding: "utf8",
});
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
      assert.fail(`restricted system touched by app-like-landing PR: ${file}`);
    }
  }
}
ok("15) no restricted system (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO) touched");

console.log(`\n${pass} app-like-landing assertions passed`);
