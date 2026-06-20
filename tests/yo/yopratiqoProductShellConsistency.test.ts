/**
 * tests/yo/yopratiqoProductShellConsistency.test.ts
 *
 * Static contract test for the YoPratiqo product shell consistency
 * pass. Locks in that:
 *
 *   • the authenticated YoPratiqo hub (`/student/yopratiqo`) exists
 *     and renders the YoPratiqo logo + companion + course links
 *     above the fold,
 *   • every YoPratiqo-originating login CTA deep-links to
 *     `/login?next=/student/yopratiqo` so the OAuth round-trip
 *     preserves the YoPratiqo product context,
 *   • the auth callback / login forwarding helper still respects a
 *     sanitized `next=` param,
 *   • the main + student headers expose a YoPratiqo entry using the
 *     official "YoPratiqo" wordmark (never "Yo" alone),
 *   • the desktop layouts have dedicated breakpoints (not just
 *     stretched mobile),
 *   • the existing deck routes (Intro + Modules 2–5) still mount
 *     `YoLessonDeck`,
 *   • paid YoPratiqo checkout stays disabled,
 *   • no new raw-quiz field names slip into any new surface, and
 *   • no restricted system path is touched by this PR.
 *
 * All assertions are static (file system + string reads). No runtime
 * server, no Supabase, no browser.
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
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Strip JS block and line comments before grepping. Avoids false
 * positives from privacy / brand-policy docstrings that legitimately
 * contain words like "Stripe" or "Yo" inside explanatory copy.
 */
function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// ─────────────────────────────────────────────────────────────────────────
// Paths under contract
// ─────────────────────────────────────────────────────────────────────────

const HUB_ROUTE_PATH = "app/(app)/student/yopratiqo/page.tsx";
const HUB_CONTENT_PATH = "components/yo/YoStudentHubContent.tsx";
const YO_NAV_BUTTON_PATH = "components/yo/YoNavButton.tsx";
const APP_SHELL_PATH = "components/AppShell.tsx";
const APP_HERO_PATH = "components/yo/YoAppHeroCard.tsx";
const PUBLIC_CARD_PATH = "components/yo/YoPublicCompanionOnboardingCard.tsx";
const COURSE_COMPANION_PATH = "components/yo/YoCourseCompanionPanel.tsx";
const LOGIN_PAGE_PATH = "app/login/page.tsx";
const AUTH_CALLBACK_PATH = "app/auth/callback/route.ts";
const AUTH_ADMIN_PATH = "lib/auth/admin.ts";
const REDIRECTS_PATH = "lib/auth/redirects.ts";
const STUDENT_PROGRESS_PATH = "app/(app)/student/progress/page.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

const DECK_ROUTES: readonly string[] = [
  "app/yo/langues/espagnol/pays/republique-dominicaine/intro/page.tsx",
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx",
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx",
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx",
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx",
];

// ─────────────────────────────────────────────────────────────────────────
// 1. /student/yopratiqo route exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, HUB_ROUTE_PATH)),
  "the new YoPratiqo hub route must exist at app/(app)/student/yopratiqo/page.tsx",
);
const hubRouteSrc = read(HUB_ROUTE_PATH);
assert.match(
  hubRouteSrc,
  /export\s+default\s+function\s+\w+/,
  "hub route must export a default page component",
);
// The route is authenticated — make sure we don't accidentally let
// search engines crawl it.
assert.match(
  hubRouteSrc,
  /robots\s*:\s*\{\s*index\s*:\s*false/,
  "hub route metadata must set robots: { index: false } (it's an authenticated page)",
);
ok("1) /student/yopratiqo route exists with default export + noindex metadata");

// ─────────────────────────────────────────────────────────────────────────
// 2. /student/yopratiqo uses YoPratiqo branding/logo
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, HUB_CONTENT_PATH)),
  "the hub client body must exist at components/yo/YoStudentHubContent.tsx",
);
const hubContentSrc = read(HUB_CONTENT_PATH);
assert.match(
  hubContentSrc,
  /import\s*\{\s*YoPratiqoLogo\s*\}\s*from\s*["']@\/components\/yo\/YoPratiqoLogo["']/,
  "hub must import YoPratiqoLogo for branded header",
);
assert.match(
  hubContentSrc,
  /<YoPratiqoLogo\b/,
  "hub must mount <YoPratiqoLogo /> in its header",
);
// And the route must wire the body in.
assert.match(
  hubRouteSrc,
  /import\s*\{\s*YoStudentHubContent\s*\}\s*from\s*["']@\/components\/yo\/YoStudentHubContent["']/,
  "hub route must mount the YoStudentHubContent body",
);
ok("2) /student/yopratiqo renders YoPratiqo branding via <YoPratiqoLogo />");

// ─────────────────────────────────────────────────────────────────────────
// 3. /student/yopratiqo renders the YoPratiqo companion above the fold
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  hubContentSrc,
  /import\s*\{\s*YoStudentCompanionCard\s*\}\s*from\s*["']@\/components\/yo\/YoStudentCompanionCard["']/,
  "hub must import YoStudentCompanionCard (the same card used on /student/progress)",
);
assert.match(
  hubContentSrc,
  /<YoStudentCompanionCard\b/,
  "hub must mount <YoStudentCompanionCard /> in the primary content area",
);
// Companion must render BEFORE the path/bridge sections so it sits
// above the fold on a mobile viewport.
const companionIdx = hubContentSrc.indexOf("<YoStudentCompanionCard");
const pathSectionIdx = hubContentSrc.indexOf('data-testid="yo-student-hub-path"');
assert.ok(
  companionIdx > 0 && pathSectionIdx > companionIdx,
  `companion card must render before the lesson-path section (got companion=${companionIdx}, path=${pathSectionIdx})`,
);
ok("3) /student/yopratiqo renders the YoPratiqo companion above the lesson path");

// ─────────────────────────────────────────────────────────────────────────
// 4. /student/yopratiqo links to the Dominican Republic Course Home
// ─────────────────────────────────────────────────────────────────────────

const DR_COURSE_HOME = "/yo/langues/espagnol/pays/republique-dominicaine";
assert.ok(
  hubContentSrc.includes(`"${DR_COURSE_HOME}"`),
  "hub must link to the Dominican Republic Course Home",
);
ok("4) /student/yopratiqo links to the Dominican Republic Course Home");

// ─────────────────────────────────────────────────────────────────────────
// 5. /student/yopratiqo links to continue learning (Intro / Modules)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  hubContentSrc,
  /data-testid=["']yo-student-hub-continue-cta["']/,
  "hub must expose a stable continue-learning CTA via data-testid",
);
// Each of the five deck routes (Intro + Modules 2–5) must be linked
// from the hub's lesson-path rail.
for (const deckPath of [
  `${DR_COURSE_HOME}/intro`,
  `${DR_COURSE_HOME}/module-2`,
  `${DR_COURSE_HOME}/module-3`,
  `${DR_COURSE_HOME}/module-4`,
  `${DR_COURSE_HOME}/module-5`,
]) {
  assert.ok(
    hubContentSrc.includes(`"${deckPath}"`),
    `hub lesson path must link to ${deckPath}`,
  );
}
ok("5) /student/yopratiqo links to Intro + Modules 2–5 deck routes for continue-learning");

// ─────────────────────────────────────────────────────────────────────────
// 6. YoPratiqo login CTAs point to /login?next=/student/yopratiqo
// ─────────────────────────────────────────────────────────────────────────

const appHeroSrc = read(APP_HERO_PATH);
const publicCardSrc = read(PUBLIC_CARD_PATH);
const courseCompanionSrc = read(COURSE_COMPANION_PATH);

for (const [label, src] of [
  ["YoAppHeroCard", appHeroSrc],
  ["YoPublicCompanionOnboardingCard", publicCardSrc],
  ["YoCourseCompanionPanel", courseCompanionSrc],
] as const) {
  assert.match(
    src,
    /["']\/login\?next=\/student\/yopratiqo["']/,
    `${label} must wire its login CTA to /login?next=/student/yopratiqo`,
  );
}
ok("6) all YoPratiqo-originating login CTAs deep-link to /login?next=/student/yopratiqo");

// ─────────────────────────────────────────────────────────────────────────
// 7. Auth next= redirect behavior is preserved
// ─────────────────────────────────────────────────────────────────────────

const callbackSrc = read(AUTH_CALLBACK_PATH);
const loginPageSrc = read(LOGIN_PAGE_PATH);
const authAdminSrc = read(AUTH_ADMIN_PATH);
// The login page must sanitize `next=` so we can't open-redirect.
assert.match(
  loginPageSrc,
  /sanitizeRelativeRedirectPath\(searchParams\.get\(["']next["']\)\)/,
  "login page must sanitize ?next= via sanitizeRelativeRedirectPath",
);
// The auth callback must read `next` and forward it through resolveOAuthCallbackRedirect.
assert.match(
  callbackSrc,
  /resolveAuthCallbackParams/,
  "auth callback must resolve next/intent via resolveAuthCallbackParams",
);
assert.match(
  callbackSrc,
  /resolveOAuthCallbackRedirect\(/,
  "auth callback must call resolveOAuthCallbackRedirect(...) so /student/yopratiqo is honored after OAuth",
);
// resolvePostAuthRedirect must accept a nextPath argument.
assert.match(
  authAdminSrc,
  /resolvePostAuthRedirect[\s\S]{0,400}nextPath/,
  "resolvePostAuthRedirect must accept a nextPath argument",
);
// And the sanitizer must live where the tests can reach it.
assert.ok(
  existsSync(path.join(root, REDIRECTS_PATH)),
  "lib/auth/redirects.ts must still ship sanitizeRelativeRedirectPath",
);
ok("7) auth callback + login page still respect a sanitized next= redirect");

// ─────────────────────────────────────────────────────────────────────────
// 8. Main public header exposes a YoPratiqo entry
// ─────────────────────────────────────────────────────────────────────────

const appShellSrc = read(APP_SHELL_PATH);
const yoNavSrc = read(YO_NAV_BUTTON_PATH);
// AppShell mounts YoNavButton in BOTH the public/logged-out header
// and the student headers (desktop + mobile). YoNavButton always
// renders the brand label "YoPratiqo".
assert.match(
  appShellSrc,
  /import\s*\{\s*YoNavButton\s*\}\s*from\s*["']@\/components\/yo\/YoNavButton["']/,
  "AppShell must import YoNavButton",
);
assert.match(
  appShellSrc,
  /<YoNavButton\b/,
  "AppShell must render <YoNavButton /> in its headers",
);
assert.match(
  yoNavSrc,
  /YoPratiqo\s*<\/Link>/,
  "YoNavButton must render the full 'YoPratiqo' brand label inside the <Link>",
);
ok("8) main + AppShell headers expose a YoPratiqo entry using the official wordmark");

// ─────────────────────────────────────────────────────────────────────────
// 9. Student header/nav exposes a YoPratiqo entry linking to /student/yopratiqo
// ─────────────────────────────────────────────────────────────────────────

// Both the desktop tab strip and the mobile bottom nav include a
// dedicated YoPratiqo entry that links to /student/yopratiqo. The
// data-testids are owned by AppShell and the href is shared via the
// STUDENT_NAV array + the bottom-nav literal.
assert.match(
  appShellSrc,
  /["']student-nav-yopratiqo["']/,
  "AppShell must mark the desktop YoPratiqo entry with data-testid='student-nav-yopratiqo'",
);
assert.match(
  appShellSrc,
  /["']student-bottom-nav-yopratiqo["']/,
  "AppShell must mark the mobile YoPratiqo bottom-nav entry with data-testid='student-bottom-nav-yopratiqo'",
);
// And the href must literally point at the YoPratiqo hub. We count
// the references — both the desktop STUDENT_NAV entry AND the mobile
// bottom-nav entry should mention the route.
const yopratiqoHrefCount = (
  appShellSrc.match(/["']\/student\/yopratiqo["']/g) ?? []
).length;
assert.ok(
  yopratiqoHrefCount >= 2,
  `AppShell must reference /student/yopratiqo in BOTH the desktop tab strip and the mobile bottom nav (got ${yopratiqoHrefCount} occurrence(s))`,
);
// YoNavButton auth-aware destination: for an authenticated student
// it must route to /student/yopratiqo, for everyone else to /yo.
assert.match(
  yoNavSrc,
  /["']\/student\/yopratiqo["']/,
  "YoNavButton must route authenticated students to /student/yopratiqo",
);
assert.match(
  yoNavSrc,
  /["']\/yo["']/,
  "YoNavButton must keep /yo as the default destination for anonymous visitors",
);
ok("9) student nav (desktop + mobile) and YoNavButton expose a YoPratiqo entry linking to /student/yopratiqo");

// ─────────────────────────────────────────────────────────────────────────
// 10. No "Yo" standalone product label is introduced
// ─────────────────────────────────────────────────────────────────────────

// We only check files this PR creates or substantively touches.
// A bare ">Yo<" between JSX tags would mean the brand was rendered
// as just "Yo" instead of "YoPratiqo". Comments are stripped first
// so docstrings using the literal "Yo" word for explanation don't
// trip the assertion.
const STANDALONE_YO_PATTERN = />\s*Yo\s*</;
for (const [label, rel] of [
  ["YoStudentHubContent", HUB_CONTENT_PATH],
  ["YoNavButton", YO_NAV_BUTTON_PATH],
  ["AppShell (student nav additions)", APP_SHELL_PATH],
  ["YoAppHeroCard", APP_HERO_PATH],
  ["YoPublicCompanionOnboardingCard", PUBLIC_CARD_PATH],
  ["YoCourseCompanionPanel", COURSE_COMPANION_PATH],
] as const) {
  const cleaned = stripJsComments(read(rel));
  assert.doesNotMatch(
    cleaned,
    STANDALONE_YO_PATTERN,
    `${label} must NOT render a standalone "Yo" label between JSX tags (the brand is "YoPratiqo")`,
  );
}
ok("10) no standalone 'Yo' label is introduced in any new or touched surface");

// ─────────────────────────────────────────────────────────────────────────
// 11. Desktop layout has dedicated responsive behavior
// ─────────────────────────────────────────────────────────────────────────

// The new YoPratiqo hub uses lg:grid-cols-* so desktop is NOT just
// the mobile layout stretched. We also verify the deck visual
// contract still caps content at 640px so desktop deck routes
// remain centered (i.e. the lesson interaction stays mobile-app
// sized even on a wide monitor).
assert.match(
  hubContentSrc,
  /lg:grid-cols-/,
  "hub must use an lg:grid-cols-* layout for desktop (not just stretched mobile)",
);
const deckContractSrc = read("lib/yo/lessonDeckVisualContract.ts");
assert.match(
  deckContractSrc,
  /DECK_CONTENT_MAX_WIDTH_PX\s*=\s*640/,
  "deck visual contract must keep content centered at 640px on desktop (no stretched-phone layout)",
);
ok("11) desktop layout has dedicated responsive behavior (hub uses lg:grid-cols, decks centered at 640px)");

// ─────────────────────────────────────────────────────────────────────────
// 12. Deck routes still use YoLessonDeck
// ─────────────────────────────────────────────────────────────────────────

// Each deck route imports a `*Content` composer; each composer must
// mount the shared <YoLessonDeck />. We follow the import to the
// composer source to assert the actual mount, since the page file
// itself only mounts the composer.
for (const routePath of DECK_ROUTES) {
  const routeSrc = read(routePath);
  const importMatch = routeSrc.match(
    /import\s*\{\s*([A-Z][A-Za-z0-9]+(?:Content))\s*\}\s*from\s*["']@\/components\/yo\/([A-Z][A-Za-z0-9]+(?:Content))["']/,
  );
  assert.ok(
    importMatch,
    `${routePath} must import a YoPratiqo *Content composer from @/components/yo/*`,
  );
  const composerRel = `components/yo/${importMatch![2]}.tsx`;
  const composerSrc = read(composerRel);
  assert.match(
    composerSrc,
    /<YoLessonDeck\b/,
    `${composerRel} must still mount the shared <YoLessonDeck />`,
  );
}
ok("12) every deck route (Intro + Modules 2–5) still mounts the shared YoLessonDeck");

// ─────────────────────────────────────────────────────────────────────────
// 13. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [label, rel] of [
  ["YoStudentHubContent", HUB_CONTENT_PATH],
  ["hub route", HUB_ROUTE_PATH],
  ["YoNavButton", YO_NAV_BUTTON_PATH],
  ["AppShell", APP_SHELL_PATH],
] as const) {
  const cleaned = stripJsComments(read(rel));
  assert.doesNotMatch(
    cleaned,
    STRIPE_PATTERN,
    `${label} must not introduce Stripe / price_id references`,
  );
}
ok("13) paid YoPratiqo checkout remains disabled and no Stripe references added");

// ─────────────────────────────────────────────────────────────────────────
// 14. No raw quiz fields introduced
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, rel] of [
  ["YoStudentHubContent", HUB_CONTENT_PATH],
  ["hub route", HUB_ROUTE_PATH],
  ["YoNavButton", YO_NAV_BUTTON_PATH],
  ["AppShell", APP_SHELL_PATH],
  ["YoAppHeroCard", APP_HERO_PATH],
  ["YoPublicCompanionOnboardingCard", PUBLIC_CARD_PATH],
  ["YoCourseCompanionPanel", COURSE_COMPANION_PATH],
] as const) {
  const cleaned = stripJsComments(read(rel));
  assert.doesNotMatch(
    cleaned,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("14) no raw quiz fields introduced in any new or touched surface");

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
  if (file.startsWith(".next/")) continue;
  for (const re of restrictedPathPatterns) {
    if (re.test(file)) {
      assert.fail(`restricted system touched by product-shell PR: ${file}`);
    }
  }
}
ok("15) no restricted system (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO) touched");

console.log(`\n${pass} product-shell-consistency assertions passed`);
