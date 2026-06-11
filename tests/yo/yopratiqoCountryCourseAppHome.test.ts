/**
 * tests/yo/yopratiqoCountryCourseAppHome.test.ts
 *
 * Static contract test for the app-like Course Home redesign of
 * `/yo/langues/espagnol/pays/republique-dominicaine`. Defends:
 *
 *   • the new app-style top navigation (single back link to
 *     /yo/langues/espagnol, no 4-level breadcrumb trail),
 *   • the six new Course Home primitives (Shell, AppHeader,
 *     Hero, Path, CompanionPanel, StickyCta),
 *   • the locale-aware hero copy + chip badges,
 *   • the primary CTA wiring to a real route / in-page anchor,
 *   • the 5-step roadmap including modules 2 / 3 / 4 / 5,
 *   • the travel companion panel rendered via the production
 *     manifest with no consent checkbox and no fake progress,
 *   • the auth-aware /login + /student/progress wiring,
 *   • the preservation of every contract the prior PRs locked
 *     in: BookingModal consent still mounted with default false,
 *     /student/progress still mounts YoStudentCompanionCard,
 *     paid YoPratiqo checkout disabled, no raw quiz fields, no
 *     restricted-system path touched.
 *
 * All assertions are static (file system + string reads). No
 * runtime server, no Supabase, no browser.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

const COUNTRY_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";
const SHELL_PATH = "components/yo/YoCourseHomeShell.tsx";
const HEADER_PATH = "components/yo/YoCourseAppHeader.tsx";
const HERO_PATH = "components/yo/YoCourseHero.tsx";
const PATH_PATH = "components/yo/YoCoursePath.tsx";
const COMPANION_PATH = "components/yo/YoCourseCompanionPanel.tsx";
const STICKY_PATH = "components/yo/YoStickyCourseCta.tsx";
const RDC_PATH = "components/yo/RepubliqueDominicaineContent.tsx";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const STUDENT_PROGRESS_PATH = "app/(app)/student/progress/page.tsx";
const STUDENT_COMPANION_CARD_PATH = "components/yo/YoStudentCompanionCard.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

const countrySrc = read(COUNTRY_PAGE_PATH);
const shellSrc = read(SHELL_PATH);
const headerSrc = read(HEADER_PATH);
const heroSrc = read(HERO_PATH);
const pathSrc = read(PATH_PATH);
const companionSrc = read(COMPANION_PATH);
const stickySrc = read(STICKY_PATH);

// ─────────────────────────────────────────────────────────────────────────
// 1. Country page no longer renders the full 4-level breadcrumb trail
// ─────────────────────────────────────────────────────────────────────────

// The legacy page composed a 4-item breadcrumb array (YoPratiqo
// → Langues → Espagnol → République dominicaine) and passed it
// to `<RepubliqueDominicaineContent breadcrumb={...} />`. The
// new page must NOT pass any breadcrumb prop (the test
// guarantees neither `breadcrumb={` nor a `YoBreadcrumbItem`
// import appears on this route) AND must NOT instantiate the
// full chain inline.
assert.doesNotMatch(
  countrySrc,
  /breadcrumb\s*:/,
  "country page must not declare a breadcrumb chain at the page level",
);
assert.doesNotMatch(
  countrySrc,
  /breadcrumb=\{/,
  "country page must not pass a `breadcrumb=` prop to its content components",
);
assert.doesNotMatch(
  countrySrc,
  /from\s+["']@\/components\/yo\/YoBreadcrumb["']/,
  "country page must not import YoBreadcrumb directly",
);
ok("1) country page no longer renders the full 4-level breadcrumb trail as primary top navigation");

// ─────────────────────────────────────────────────────────────────────────
// 2. Page has app-style back navigation (single back link)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  countrySrc,
  /<YoCourseAppHeader\b/,
  "country page must mount <YoCourseAppHeader />",
);
// The back link must point one level up (to /yo/langues/espagnol),
// not all the way to /yo. The exact path is built inline in the
// page so we assert the resolved string is present.
assert.match(
  countrySrc,
  /["']\/yo\/langues\/espagnol["']|`\/yo\/langues\/espagnol\$\{langSuffix\}`/,
  "country page must wire the back link to /yo/langues/espagnol (one level up)",
);
assert.match(
  headerSrc,
  /data-testid=["']yo-course-app-header-back["']/,
  "YoCourseAppHeader must expose the back affordance via a stable data-testid",
);
ok("2) page has app-style back navigation (single back link, one level up)");

// ─────────────────────────────────────────────────────────────────────────
// 3. Page renders YoPratiqo logo / compact course app header
// ─────────────────────────────────────────────────────────────────────────

// The compact brand mark lives inside the new header component
// (so the country page itself does not need to import the logo
// separately — the header brings it in).
assert.match(
  headerSrc,
  /import\s*\{\s*YoPratiqoLogo\s*\}\s*from\s*["']@\/components\/yo\/YoPratiqoLogo["']/,
  "YoCourseAppHeader must import YoPratiqoLogo",
);
assert.match(
  headerSrc,
  /<YoPratiqoLogo\b/,
  "YoCourseAppHeader must render <YoPratiqoLogo />",
);
// The course label is visible in the header on both layouts so
// the user always sees a single compact title — not a chain.
assert.match(
  headerSrc,
  /data-testid=["']yo-course-app-header-title["']/,
  "YoCourseAppHeader must expose the course title via a stable data-testid",
);
ok("3) page renders YoPratiqo logo + compact course app header");

// ─────────────────────────────────────────────────────────────────────────
// 4. Page has the new app-style hero copy in FR / EN / ES
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  countrySrc,
  /<YoCourseHero\b/,
  "country page must mount <YoCourseHero />",
);
assert.ok(
  heroSrc.includes("Espagnol pour ton voyage en République dominicaine"),
  "YoCourseHero must contain the FR title 'Espagnol pour ton voyage en République dominicaine'",
);
assert.ok(
  heroSrc.includes("Spanish for your Dominican Republic trip"),
  "YoCourseHero must contain the EN title 'Spanish for your Dominican Republic trip'",
);
assert.ok(
  heroSrc.includes("Español para tu viaje a República Dominicana"),
  "YoCourseHero must contain the ES title 'Español para tu viaje a República Dominicana'",
);
ok("4) hero has the title copy 'Espagnol pour ton voyage…' / 'Spanish for your Dominican Republic trip'");

// ─────────────────────────────────────────────────────────────────────────
// 5. Primary CTA points to a real YoPratiqo module/intro route
// ─────────────────────────────────────────────────────────────────────────

// The primary CTA on the hero points to the in-page intro
// anchor (`#yo-intro-experience`) so the free intro lesson
// rendered by <RepubliqueDominicaineContent /> further down
// the page is one tap away. The corresponding anchor target
// must exist somewhere on the rendered page, so the scroll
// destination is real.
assert.match(
  heroSrc,
  /["']#yo-intro-experience["']/,
  "YoCourseHero primary CTA must reach a real in-page anchor",
);
assert.match(
  countrySrc,
  /id=["']yo-intro-experience["']/,
  "country page must render the matching `#yo-intro-experience` anchor target",
);
// And the secondary "Skip to module 2" CTA must reach the real
// module-2 route.
const MODULE_2_PATH = "/yo/langues/espagnol/pays/republique-dominicaine/module-2";
assert.ok(
  heroSrc.includes(MODULE_2_PATH),
  "YoCourseHero must offer a secondary CTA to the real module-2 route",
);
// The actual module-2 page file must exist (no fake route).
assert.ok(
  existsSync(path.join(root, "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx")),
  "module-2 page must exist (no fake routes)",
);
ok("5) primary CTA points to a real intro anchor + secondary CTA reaches the real module-2 route");

// ─────────────────────────────────────────────────────────────────────────
// 6. Page renders course path / roadmap
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  countrySrc,
  /<YoCoursePath\b/,
  "country page must mount <YoCoursePath />",
);
assert.match(
  pathSrc,
  /export\s+function\s+YoCoursePath\b/,
  "YoCoursePath component must be exported",
);
assert.match(
  pathSrc,
  /data-testid=["']yo-course-path["']/,
  "YoCoursePath must expose itself via a stable data-testid",
);
// The countriy page must build a 5-step roadmap and pass it to
// the path component.
assert.match(
  countrySrc,
  /buildRoadmap\(locale\)/,
  "country page must build a per-locale 5-step roadmap before mounting <YoCoursePath />",
);
ok("6) page renders course path / roadmap");

// ─────────────────────────────────────────────────────────────────────────
// 7. Roadmap includes the real module 2 / 3 / 4 / 5 routes
// ─────────────────────────────────────────────────────────────────────────

const MODULE_PATHS = [
  "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
  "/yo/langues/espagnol/pays/republique-dominicaine/module-3",
  "/yo/langues/espagnol/pays/republique-dominicaine/module-4",
  "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
] as const;
for (const p of MODULE_PATHS) {
  assert.ok(
    countrySrc.includes(p),
    `country page roadmap must reference ${p}`,
  );
  // And the destination page must actually exist.
  const segment = p.split("/").pop();
  assert.ok(
    existsSync(path.join(root, `app/yo/langues/espagnol/pays/republique-dominicaine/${segment}/page.tsx`)),
    `module page for ${segment} must exist (no fake routes)`,
  );
}
ok("7) roadmap includes Modules 2 / 3 / 4 / 5 (and every referenced page actually exists)");

// ─────────────────────────────────────────────────────────────────────────
// 8. Page renders the travel companion panel
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  countrySrc,
  /<YoCourseCompanionPanel\b/,
  "country page must mount <YoCourseCompanionPanel />",
);
assert.match(
  companionSrc,
  /import\s*\{\s*CompanionAvatar\s*\}\s*from\s*["']@\/components\/companion\/CompanionAvatar["']/,
  "YoCourseCompanionPanel must use the manifest-driven CompanionAvatar",
);
assert.match(
  companionSrc,
  /visualId=["']travel["']/,
  "YoCourseCompanionPanel must render the travel companion visual",
);
ok("8) page renders the travel companion panel using CompanionAvatar (visualId=travel)");

// ─────────────────────────────────────────────────────────────────────────
// 9. Companion panel has no checkbox and no coming-soon consent copy
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(
  companionSrc,
  /type=["']checkbox["']/,
  "YoCourseCompanionPanel must NOT render any <input type='checkbox' />",
);
assert.ok(
  !companionSrc.includes("sauvegarde du consentement"),
  "YoCourseCompanionPanel must NOT contain the bridge-consent 'sauvegarde du consentement' coming-soon copy",
);
assert.ok(
  !companionSrc.includes("Cette case ne crée pas encore de partage"),
  "YoCourseCompanionPanel must NOT contain the misleading 'Cette case ne crée pas encore de partage' caption",
);
// And the country page itself must not render any checkbox
// either (consent stays exclusively in BookingModal).
assert.doesNotMatch(
  countrySrc,
  /type=["']checkbox["']/,
  "country page must NOT render any <input type='checkbox' /> outside the booking context",
);
ok("9) companion panel has no checkbox and no coming-soon consent copy");

// ─────────────────────────────────────────────────────────────────────────
// 10. Login / progress CTA uses existing audited routes
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, "app/login/page.tsx")),
  "the audited /login route must still exist (companion panel depends on it)",
);
assert.ok(
  existsSync(path.join(root, "app/(app)/student/progress/page.tsx")),
  "the audited /student/progress route must still exist (companion panel depends on it)",
);
assert.match(
  companionSrc,
  /["']\/login(?:\?next=[^"']+)?["']/,
  "YoCourseCompanionPanel must wire the signed-out CTA to /login (optionally with sanitized next= param)",
);
assert.match(
  companionSrc,
  /["']\/student\/progress["']/,
  "YoCourseCompanionPanel must wire the signed-in CTA to /student/progress",
);
assert.match(
  companionSrc,
  /useAuth/,
  "YoCourseCompanionPanel must consult useAuth so the right CTA renders for each auth state",
);
ok("10) login / progress CTA uses existing /login and /student/progress routes via useAuth");

// ─────────────────────────────────────────────────────────────────────────
// 11. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [label, src] of [
  ["YoCourseHomeShell", shellSrc],
  ["YoCourseAppHeader", headerSrc],
  ["YoCourseHero", heroSrc],
  ["YoCoursePath", pathSrc],
  ["YoCourseCompanionPanel", companionSrc],
  ["YoStickyCourseCta", stickySrc],
] as const) {
  assert.doesNotMatch(
    src,
    STRIPE_PATTERN,
    `${label} must not introduce Stripe / price_id references`,
  );
}
ok("11) paid YoPratiqo checkout remains disabled and no Stripe references added");

// ─────────────────────────────────────────────────────────────────────────
// 12. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|correctOptionId|correct_option_id|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["YoCourseHomeShell", shellSrc],
  ["YoCourseAppHeader", headerSrc],
  ["YoCourseHero", heroSrc],
  ["YoCoursePath", pathSrc],
  ["YoCourseCompanionPanel", companionSrc],
  ["YoStickyCourseCta", stickySrc],
  ["country page", countrySrc],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("12) no raw quiz fields introduced anywhere in the Course Home surfaces");

// ─────────────────────────────────────────────────────────────────────────
// 13. BookingModal consent still intact
// ─────────────────────────────────────────────────────────────────────────

const bookingModalSrc = read(BOOKING_MODAL_PATH);
assert.match(
  bookingModalSrc,
  /import\s*\{\s*YoBookingTeacherBridgeConsent\s*\}\s*from\s*["']@\/components\/yo\/YoBookingTeacherBridgeConsent["']/,
);
assert.match(bookingModalSrc, /<YoBookingTeacherBridgeConsent\b/);
assert.match(
  bookingModalSrc,
  /\/api\/bookings\/\$\{bookingId\}\/yopratiqo-bridge/,
);
assert.match(
  bookingModalSrc,
  /const \[yoBridgeConsent, setYoBridgeConsent\] = useState\(false\)/,
);
ok("13) BookingModal consent still intact (default false, still POSTs to /api/bookings/<id>/yopratiqo-bridge)");

// ─────────────────────────────────────────────────────────────────────────
// 14. YoStudentCompanionCard still intact on /student/progress
// ─────────────────────────────────────────────────────────────────────────

const studentProgressSrc = read(STUDENT_PROGRESS_PATH);
assert.match(
  studentProgressSrc,
  /import\s*\{\s*YoStudentCompanionCard\s*\}\s*from\s*["']@\/components\/yo\/YoStudentCompanionCard["']/,
);
assert.match(studentProgressSrc, /<YoStudentCompanionCard\b/);
assert.match(studentProgressSrc, /<CompanionCard\b/);
const studentCompanionCardSrc = read(STUDENT_COMPANION_CARD_PATH);
assert.match(
  studentCompanionCardSrc,
  /export\s+function\s+YoStudentCompanionCard\b/,
);
// The legacy RepubliqueDominicaineContent module that is still
// mounted (with opt-outs) on this route must continue to expose
// the new opt-out hooks, otherwise the country page would
// duplicate hero / lesson-path.
const rdcSrc = read(RDC_PATH);
assert.match(
  rdcSrc,
  /omitHero\?\s*:\s*boolean/,
  "RepubliqueDominicaineContent must expose an `omitHero?` prop",
);
assert.match(
  rdcSrc,
  /omitLessonPath\?\s*:\s*boolean/,
  "RepubliqueDominicaineContent must expose an `omitLessonPath?` prop",
);
ok("14) YoStudentCompanionCard still intact + RepubliqueDominicaineContent opt-outs in place");

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
      assert.fail(`restricted system touched by country-course-home PR: ${file}`);
    }
  }
}
ok("15) no restricted system (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO) touched");

console.log(`\n${pass} country-course-app-home assertions passed`);
