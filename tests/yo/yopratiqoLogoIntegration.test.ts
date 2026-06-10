/**
 * tests/yo/yopratiqoLogoIntegration.test.ts
 *
 * Defends the YoPratiqo logo integration on /yo and re-asserts the
 * /yo public-bridge UX contract shipped in PR #153. A single PR
 * touching /yo can silently regress either the brand split (using
 * the global PratiqoLogo on a YoPratiqo surface) or the consent /
 * CTA contract — this file enforces both at once.
 *
 * Assertions
 * ----------
 *   1.  YoPratiqoLogo component file exists and exports the component.
 *   2.  YoPratiqoLogo renders /brand/yopratiqo-logo.png through
 *       next/image. The PNG asset also exists at that path and is
 *       a valid transparent RGBA PNG.
 *   3.  YoPratiqoLogo preserves the source aspect ratio (intrinsic
 *       1000×250, `h-auto`, no hardcoded fixed-height CSS) — i.e.
 *       the logo is never stretched.
 *   4.  /yo imports and renders <YoPratiqoLogo /> and no longer
 *       renders the global <PratiqoLogo /> in its header.
 *   5.  /yo no longer renders the bridge-consent coming-soon copy
 *       (`Bientôt disponible : la sauvegarde du consentement…` /
 *       `Cette case ne crée pas encore de partage`).
 *   6.  /yo no longer renders a consent checkbox outside the booking
 *       context (no `<YoTeacherBridgeConsentSection />`).
 *   7.  /yo has a CTA to the Dominican Republic intro route.
 *   8.  /yo has a sign-in CTA wired to the audited /login route.
 *   9.  /student/progress still mounts <YoStudentCompanionCard />.
 *  10.  BookingModal still mounts <YoBookingTeacherBridgeConsent />.
 *  11.  BookingModal consent still defaults to useState(false).
 *  12.  Paid YoPratiqo checkout remains disabled.
 *  13.  No raw quiz fields introduced in the new logo component or
 *       on /yo.
 *  14.  No restricted system (Stripe / payments / tax / RLS /
 *       migrations / legal / Membre Pro / audio / SEO) touched.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
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

const LOGO_COMPONENT_PATH = "components/yo/YoPratiqoLogo.tsx";
const LOGO_ASSET_PATH = "public/brand/yopratiqo-logo.png";
const YO_PAGE_PATH = "app/yo/page.tsx";
const PUBLIC_CARD_PATH = "components/yo/YoPublicCompanionOnboardingCard.tsx";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const STUDENT_PROGRESS_PATH = "app/(app)/student/progress/page.tsx";
const STUDENT_COMPANION_CARD_PATH = "components/yo/YoStudentCompanionCard.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

// ─────────────────────────────────────────────────────────────────────────
// 1. YoPratiqoLogo exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, LOGO_COMPONENT_PATH)),
  `${LOGO_COMPONENT_PATH} must exist`,
);
const logoSrc = read(LOGO_COMPONENT_PATH);
assert.match(
  logoSrc,
  /export\s+function\s+YoPratiqoLogo\b/,
  "YoPratiqoLogo must be exported",
);
ok("1) YoPratiqoLogo component exists and is exported");

// ─────────────────────────────────────────────────────────────────────────
// 2. Renders the production logo PNG through next/image
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  logoSrc,
  /import\s+Image\s+from\s+["']next\/image["']/,
  "YoPratiqoLogo must use next/image",
);
assert.match(
  logoSrc,
  /["']\/brand\/yopratiqo-logo\.png["']/,
  "YoPratiqoLogo must reference /brand/yopratiqo-logo.png",
);
assert.match(
  logoSrc,
  /alt="YoPratiqo"/,
  "YoPratiqoLogo must use alt='YoPratiqo'",
);

const assetAbs = path.join(root, LOGO_ASSET_PATH);
assert.ok(existsSync(assetAbs), `${LOGO_ASSET_PATH} must exist on disk`);
const assetStat = statSync(assetAbs);
assert.ok(
  assetStat.size >= 4096,
  `${LOGO_ASSET_PATH} must be a real PNG (saw ${assetStat.size} bytes)`,
);

const assetBytes = readFileSync(assetAbs);
// PNG file signature: 89 50 4E 47 0D 0A 1A 0A
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
assert.ok(
  assetBytes.subarray(0, 8).equals(PNG_SIG),
  `${LOGO_ASSET_PATH} must start with the PNG file signature`,
);
// Color type lives at byte 25 of the IHDR chunk. 6 = RGBA (true transparency).
const colorType = assetBytes[25];
assert.equal(
  colorType,
  6,
  `${LOGO_ASSET_PATH} must be RGBA (transparent background); got color type ${colorType}`,
);
ok("2) YoPratiqoLogo uses /brand/yopratiqo-logo.png and the asset is a real transparent RGBA PNG");

// ─────────────────────────────────────────────────────────────────────────
// 3. Preserves aspect ratio (no stretching)
// ─────────────────────────────────────────────────────────────────────────

// The intrinsic width/height passed to next/image must keep the
// source PNG's 4:1 aspect ratio (1000×250 in this repo).
assert.match(
  logoSrc,
  /width=\{?\s*1000\s*\}?/,
  "YoPratiqoLogo must declare the intrinsic 1000px width of the source PNG",
);
assert.match(
  logoSrc,
  /height=\{?\s*250\s*\}?/,
  "YoPratiqoLogo must declare the intrinsic 250px height of the source PNG",
);
assert.match(
  logoSrc,
  /\bh-auto\b/,
  "YoPratiqoLogo must use Tailwind `h-auto` so the height scales with the width (no stretching)",
);
assert.match(
  logoSrc,
  /object-contain/,
  "YoPratiqoLogo must use `object-contain` as a defensive guard against parent height clamps",
);
// And explicitly forbid any hardcoded fixed-height CSS that would
// stretch the logo (e.g. `style={{ height: 80 }}` or `h-[80px]`).
assert.doesNotMatch(
  logoSrc,
  /style=\{\s*\{[^}]*\bheight\s*:/,
  "YoPratiqoLogo must NOT set an inline style.height (would stretch the logo)",
);
assert.doesNotMatch(
  logoSrc,
  /\bh-\[\d+px\]/,
  "YoPratiqoLogo must NOT clamp height with Tailwind h-[Npx] utilities",
);
ok("3) YoPratiqoLogo preserves the source aspect ratio (no stretching)");

// ─────────────────────────────────────────────────────────────────────────
// 4. /yo imports and renders YoPratiqoLogo, no longer renders PratiqoLogo
// ─────────────────────────────────────────────────────────────────────────

const yoSrc = read(YO_PAGE_PATH);
assert.match(
  yoSrc,
  /import\s*\{\s*YoPratiqoLogo\s*\}\s*from\s*["']@\/components\/yo\/YoPratiqoLogo["']/,
  "/yo must import YoPratiqoLogo from @/components/yo/YoPratiqoLogo",
);
assert.match(
  yoSrc,
  /<YoPratiqoLogo\b/,
  "/yo must render <YoPratiqoLogo />",
);
// The global PratiqoLogo must no longer be used on /yo. The audit
// rule is intentionally about the JSX usage, not the file existing —
// PratiqoLogo continues to power the marketplace header.
assert.doesNotMatch(
  yoSrc,
  /<PratiqoLogo\b/,
  "/yo must NOT render <PratiqoLogo /> (use YoPratiqoLogo on YoPratiqo-specific surfaces)",
);
assert.doesNotMatch(
  yoSrc,
  /from\s+["']@\/components\/PratiqoLogo["']/,
  "/yo must NOT import the global PratiqoLogo",
);
ok("4) /yo imports + renders YoPratiqoLogo and no longer renders the global PratiqoLogo");

// ─────────────────────────────────────────────────────────────────────────
// 5. /yo no longer renders the bridge-consent coming-soon copy
// ─────────────────────────────────────────────────────────────────────────

// We assert the *specific* bridge-consent copy from
// STUDENT_CONSENT_COMING_SOON_NOTE — not the generic "Bientôt disponible"
// phrase, which /yo legitimately uses for the Music + Academic-support
// placeholder discipline cards.
assert.ok(
  !yoSrc.includes("sauvegarde du consentement"),
  "/yo must NOT contain the bridge-consent 'sauvegarde du consentement' coming-soon copy",
);
assert.ok(
  !yoSrc.includes("Cette case ne crée pas encore de partage"),
  "/yo must NOT contain the misleading 'Cette case ne crée pas encore de partage' caption",
);
ok("5) /yo no longer renders the bridge-consent coming-soon copy");

// ─────────────────────────────────────────────────────────────────────────
// 6. /yo no longer renders a consent checkbox outside booking context
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(
  yoSrc,
  /<YoTeacherBridgeConsentSection\b/,
  "/yo must NOT mount the public consent-checkbox preview",
);
assert.doesNotMatch(
  yoSrc,
  /from\s+["']@\/components\/yo\/YoTeacherBridgeConsentSection["']/,
  "/yo must NOT import YoTeacherBridgeConsentSection",
);
// Defense-in-depth: /yo must not mount the bare consent card either.
assert.doesNotMatch(
  yoSrc,
  /<YoTeacherBridgeConsentCard\b/,
  "/yo must NOT mount the bare YoTeacherBridgeConsentCard outside booking context",
);
// The new public card must NOT introduce a checkbox itself.
const publicCardSrc = read(PUBLIC_CARD_PATH);
assert.doesNotMatch(
  publicCardSrc,
  /type=["']checkbox["']/,
  "the new public companion card must NOT render any <input type='checkbox' />",
);
ok("6) /yo no longer renders a consent checkbox outside the booking context");

// ─────────────────────────────────────────────────────────────────────────
// 7. /yo has a CTA to the Dominican Republic intro route
// ─────────────────────────────────────────────────────────────────────────

// The DR course path is reachable EITHER directly from /yo (existing
// hero CTA) OR via the new public companion card. Both paths are
// acceptable — what matters is that a user clicking somewhere on /yo
// reaches the DR module.
const DR_COURSE_PATH = "/yo/langues/espagnol/pays/republique-dominicaine";
const reachesDr =
  yoSrc.includes(DR_COURSE_PATH) || publicCardSrc.includes(DR_COURSE_PATH);
assert.ok(
  reachesDr,
  "/yo (page or public companion card) must link to the Dominican Republic intro route",
);
ok("7) /yo links to the Dominican Republic intro route");

// ─────────────────────────────────────────────────────────────────────────
// 8. /yo has a login/sign-in CTA wired to the audited /login route
// ─────────────────────────────────────────────────────────────────────────

// /login must still exist where we deep-link to.
assert.ok(
  existsSync(path.join(root, "app/login/page.tsx")),
  "the audited /login route must still exist",
);
// The sign-in CTA lives on the new public companion card (so a future
// /yo refactor cannot break it without touching the card too).
assert.match(
  publicCardSrc,
  /["']\/login(?:\?next=[^"']+)?["']/,
  "public companion card must deep-link a sign-in CTA to /login (optionally with a sanitized next= redirect)",
);
assert.match(
  publicCardSrc,
  /useAuth/,
  "public companion card must consult useAuth so the sign-in CTA appears for signed-out users",
);
ok("8) /yo public companion card has a sign-in CTA wired to /login");

// ─────────────────────────────────────────────────────────────────────────
// 9. /student/progress still mounts YoStudentCompanionCard
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
ok("9) /student/progress still mounts YoStudentCompanionCard next to the legacy CompanionCard");

// ─────────────────────────────────────────────────────────────────────────
// 10. BookingModal still mounts YoBookingTeacherBridgeConsent
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
ok("10) BookingModal still mounts YoBookingTeacherBridgeConsent and still POSTs to the bridge API");

// ─────────────────────────────────────────────────────────────────────────
// 11. BookingModal consent still defaults to false
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  bookingModalSrc,
  /const \[yoBridgeConsent, setYoBridgeConsent\] = useState\(false\)/,
  "BookingModal must keep the consent checkbox initialized to useState(false)",
);
ok("11) BookingModal consent checkbox still defaults to false");

// ─────────────────────────────────────────────────────────────────────────
// 12. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [label, src] of [
  ["YoPratiqoLogo", logoSrc],
  ["public companion card", publicCardSrc],
] as const) {
  assert.doesNotMatch(
    src,
    STRIPE_PATTERN,
    `${label} must not introduce Stripe / price_id references`,
  );
}
ok("12) paid YoPratiqo checkout remains disabled and no Stripe references added");

// ─────────────────────────────────────────────────────────────────────────
// 13. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|correctOptionId|correct_option_id|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["YoPratiqoLogo", logoSrc],
  ["/yo page", yoSrc],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("13) no raw quiz fields introduced in the new logo component or on /yo");

// ─────────────────────────────────────────────────────────────────────────
// 14. No restricted system touched
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
      assert.fail(`restricted system touched by logo-integration PR: ${file}`);
    }
  }
}
ok("14) no restricted system (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO) touched");

console.log(`\n${pass} logo-integration assertions passed`);
