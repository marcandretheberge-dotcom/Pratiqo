/**
 * tests/yo/yopratiqoModuleLessonDeck.test.ts
 *
 * Static contract test for the app-like lesson deck applied to
 * the YoPratiqo Dominican Republic Module 2. Defends:
 *
 *   • the five new deck primitives (Deck, Header, Nav, Screen,
 *     CompanionCoach) and the typed deck model
 *     (`lib/yo/lessonDeckTypes.ts`);
 *   • the `mode="deck"` opt-in on `<DominicanRepublicModule2Content />`
 *     and the rewired Module 2 page that consumes it;
 *   • the multi-screen composition (≥ 5 focused screens, real
 *     Back/Next navigation, no breadcrumb-style primary nav);
 *   • preservation of the existing audited completion button
 *     (`<YoMarkModuleCompletedButton />`), the
 *     `data-yo-module2-progress-complete` marker, and every
 *     `data-yo-module2-*` source token the prior PRs locked in;
 *   • the inline travel-companion presence on every screen via
 *     the production manifest (8 visual states, no fake AI
 *     tutoring);
 *   • Modules 3–5 still routed to their existing premium
 *     content (no half-conversion);
 *   • paid YoPratiqo checkout still disabled, no raw quiz
 *     fields introduced anywhere on the deck surface, no
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

const TYPES_PATH = "lib/yo/lessonDeckTypes.ts";
const DECK_PATH = "components/yo/YoLessonDeck.tsx";
const SCREEN_PATH = "components/yo/YoLessonDeckScreen.tsx";
const HEADER_PATH = "components/yo/YoLessonDeckHeader.tsx";
const NAV_PATH = "components/yo/YoLessonDeckNav.tsx";
const COACH_PATH = "components/yo/YoLessonCompanionCoach.tsx";
const MODULE2_CONTENT_PATH = "components/yo/DominicanRepublicModule2Content.tsx";
const MODULE2_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";
const MODULE3_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx";
const MODULE4_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx";
const MODULE5_PAGE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx";
const COMPANION_VISUALS_PATH = "lib/companion/companionVisuals.ts";
const COMPANION_AVATAR_PATH = "components/companion/CompanionAvatar.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

const typesSrc = read(TYPES_PATH);
const deckSrc = read(DECK_PATH);
const screenSrc = read(SCREEN_PATH);
const headerSrc = read(HEADER_PATH);
const navSrc = read(NAV_PATH);
const coachSrc = read(COACH_PATH);
const module2Src = read(MODULE2_CONTENT_PATH);
const module2PageSrc = read(MODULE2_PAGE_PATH);

// ─────────────────────────────────────────────────────────────────────────
// 1. YoLessonDeck exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, DECK_PATH)),
  "YoLessonDeck.tsx must exist at components/yo/YoLessonDeck.tsx",
);
assert.match(
  deckSrc,
  /^["']use client["'];?/m,
  "YoLessonDeck must be a client component (uses useState for navigation)",
);
assert.match(
  deckSrc,
  /export\s+(?:function|const)\s+YoLessonDeck\b/,
  "YoLessonDeck must export a YoLessonDeck symbol",
);
assert.match(
  deckSrc,
  /useState\b/,
  "YoLessonDeck must hold the current screen index in component state",
);
ok("1) YoLessonDeck exists as a client component with useState-driven state");

// ─────────────────────────────────────────────────────────────────────────
// 2. YoLessonDeckHeader exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, HEADER_PATH)),
  "YoLessonDeckHeader.tsx must exist at components/yo/YoLessonDeckHeader.tsx",
);
assert.match(
  headerSrc,
  /export\s+(?:function|const)\s+YoLessonDeckHeader\b/,
  "YoLessonDeckHeader must export a YoLessonDeckHeader symbol",
);
assert.match(
  headerSrc,
  /import\s+Link\s+from\s+["']next\/link["']/,
  "YoLessonDeckHeader must use next/link for the back arrow / language toggle",
);
assert.match(
  headerSrc,
  /<YoPratiqoLogo\b/,
  "YoLessonDeckHeader must render the YoPratiqo brand mark",
);
ok("2) YoLessonDeckHeader exists with next/link back arrow + YoPratiqo brand mark");

// ─────────────────────────────────────────────────────────────────────────
// 3. YoLessonDeckNav exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, NAV_PATH)),
  "YoLessonDeckNav.tsx must exist at components/yo/YoLessonDeckNav.tsx",
);
assert.match(
  navSrc,
  /^["']use client["'];?/m,
  "YoLessonDeckNav must be a client component (handles button onClick)",
);
assert.match(
  navSrc,
  /export\s+(?:function|const)\s+YoLessonDeckNav\b/,
  "YoLessonDeckNav must export a YoLessonDeckNav symbol",
);
assert.match(
  navSrc,
  /onPrev\b/,
  "YoLessonDeckNav must accept an onPrev callback",
);
assert.match(
  navSrc,
  /onNext\b/,
  "YoLessonDeckNav must accept an onNext callback",
);
assert.match(
  navSrc,
  /env\(safe-area-inset-bottom\)/,
  "YoLessonDeckNav must respect the iOS safe-area at the bottom of the viewport",
);
ok("3) YoLessonDeckNav exists with onPrev/onNext + iOS safe-area padding");

// ─────────────────────────────────────────────────────────────────────────
// 4. YoLessonCompanionCoach exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, COACH_PATH)),
  "YoLessonCompanionCoach.tsx must exist at components/yo/YoLessonCompanionCoach.tsx",
);
assert.match(
  coachSrc,
  /export\s+(?:function|const)\s+YoLessonCompanionCoach\b/,
  "YoLessonCompanionCoach must export a YoLessonCompanionCoach symbol",
);
assert.match(
  coachSrc,
  /<CompanionAvatar\b/,
  "YoLessonCompanionCoach must render the audited <CompanionAvatar /> from the production manifest",
);
assert.match(
  coachSrc,
  /visualId="travel"/,
  "YoLessonCompanionCoach must use the audited 'travel' companion visual id",
);
ok("4) YoLessonCompanionCoach exists and renders CompanionAvatar with the audited travel visual id");

// ─────────────────────────────────────────────────────────────────────────
// 5. Lesson deck type model exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, TYPES_PATH)),
  "lib/yo/lessonDeckTypes.ts must exist",
);
assert.match(
  typesSrc,
  /export\s+type\s+YoLessonDeckScreenKind\b/,
  "lessonDeckTypes must export YoLessonDeckScreenKind",
);
assert.match(
  typesSrc,
  /"mission"\s*\|\s*"phrase"\s*\|\s*"dialogue"\s*\|\s*"culture"\s*\|\s*"practice"\s*\|\s*"quiz"\s*\|\s*"summary"\s*\|\s*"completion"/,
  "YoLessonDeckScreenKind must include the eight pedagogical kinds the brief locks in",
);
assert.match(
  typesSrc,
  /export\s+(?:interface|type)\s+YoLessonDeckScreen\b/,
  "lessonDeckTypes must export the YoLessonDeckScreen shape",
);
assert.match(
  typesSrc,
  /companionState:\s*YoLessonDeckCompanionState/,
  "Each YoLessonDeckScreen must carry a companionState field driven by the visual manifest",
);
assert.match(
  typesSrc,
  /import\s+type\s+\{\s*CompanionVisualState\s*\}\s+from\s+["']@\/lib\/companion\/companionVisuals["']/,
  "YoLessonDeckCompanionState must reuse the production CompanionVisualState (no new fake states)",
);
ok("5) lib/yo/lessonDeckTypes.ts exports the typed model + reuses CompanionVisualState from the manifest");

// ─────────────────────────────────────────────────────────────────────────
// 6. Module 2 uses YoLessonDeck
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module2Src,
  /import\s*\{\s*YoLessonDeck\s*\}\s*from\s*["']@\/components\/yo\/YoLessonDeck["']/,
  "Module 2 content must import YoLessonDeck",
);
assert.match(
  module2Src,
  /<YoLessonDeck\b/,
  "Module 2 content must mount <YoLessonDeck /> in deck mode",
);
assert.match(
  module2Src,
  /import\s+type\s+\{\s*YoLessonDeckScreen\s*\}\s+from\s+["']@\/lib\/yo\/lessonDeckTypes["']/,
  "Module 2 content must import the typed YoLessonDeckScreen model",
);
assert.match(
  module2Src,
  /mode\s*\?\s*:\s*DominicanRepublicModule2ContentMode/,
  "Module 2 content must expose a `mode?` prop on DominicanRepublicModule2ContentProps",
);
assert.match(
  module2PageSrc,
  /<DominicanRepublicModule2Content\b[^>]*mode=["']deck["']/,
  "Module 2 page must opt the renderer into deck mode (mode=\"deck\")",
);
ok("6) Module 2 imports + mounts YoLessonDeck and the page opts in via mode=\"deck\"");

// ─────────────────────────────────────────────────────────────────────────
// 7. Module 2 has multiple focused lesson screens
// ─────────────────────────────────────────────────────────────────────────

const SCREEN_IDS_REQUIRED = [
  "mission",
  "phrases",
  "airport",
  "hotel",
  "problems",
  "culture",
  "grammar",
  "flashcards",
  "quiz",
  "mini-mission",
  "completion",
];
for (const screenId of SCREEN_IDS_REQUIRED) {
  assert.match(
    module2Src,
    new RegExp(`id:\\s*["']${screenId}["']`),
    `Module 2 deck must expose a focused lesson screen with id="${screenId}"`,
  );
  assert.match(
    module2Src,
    new RegExp(`data-yo-module2-deck-screen=["']${screenId}["']`),
    `Module 2 deck screen "${screenId}" must mark its rendered content with the data-yo-module2-deck-screen marker`,
  );
}
const distinctScreenIds = new Set(
  Array.from(
    module2Src.matchAll(
      /id:\s*["'](mission|phrases|airport|hotel|problems|culture|grammar|flashcards|quiz|mini-mission|completion)["']/g,
    ),
  ).map((m) => m[1]),
);
assert.ok(
  distinctScreenIds.size >= 9,
  `Module 2 deck must have at least 9 distinct focused lesson screens (got ${distinctScreenIds.size})`,
);
ok(`7) Module 2 deck has ${distinctScreenIds.size} distinct focused lesson screens (mission → completion)`);

// ─────────────────────────────────────────────────────────────────────────
// 8. Module 2 still mounts YoMarkModuleCompletedButton
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  module2Src,
  /import\s*\{\s*YoMarkModuleCompletedButton\s*\}\s*from\s*["']@\/components\/yo\/YoMarkModuleCompletedButton["']/,
  "Module 2 must still import the audited completion button",
);
assert.match(
  module2Src,
  /<YoMarkModuleCompletedButton\b/,
  "Module 2 must still mount <YoMarkModuleCompletedButton />",
);
assert.match(
  module2Src,
  /payload=\{dominicanRdModuleProgressPayload\(["']module-2["']/,
  "Module 2 must keep using the audited dominicanRdModuleProgressPayload helper for its completion payload",
);
assert.match(
  module2Src,
  /data-yo-module2-progress-complete/,
  "Module 2 must keep the data-yo-module2-progress-complete marker the prior progress test relies on",
);
ok("8) Module 2 still mounts YoMarkModuleCompletedButton with its audited payload + progress-complete marker");

// ─────────────────────────────────────────────────────────────────────────
// 9. Module 2 uses CompanionAvatar / companion visual states
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckSrc,
  /<YoLessonDeckScreen\b/,
  "YoLessonDeck must render its <YoLessonDeckScreen /> frame on each step",
);
assert.match(
  screenSrc,
  /<YoLessonCompanionCoach\b/,
  "<YoLessonDeckScreen /> must mount <YoLessonCompanionCoach /> so every screen shows the travel companion",
);
const VISUAL_STATES_USED = [
  "map",
  "confused",
  "celebrating",
];
for (const stateName of VISUAL_STATES_USED) {
  assert.match(
    module2Src,
    new RegExp(`companionState:\\s*["']${stateName}["']`),
    `Module 2 deck must use the audited "${stateName}" companion visual state on at least one screen`,
  );
}
const companionVisualsSrc = read(COMPANION_VISUALS_PATH);
assert.match(
  companionVisualsSrc,
  /["']map["']/,
  "the companion visuals manifest must still ship the 'map' state",
);
assert.match(
  companionVisualsSrc,
  /["']celebrating["']/,
  "the companion visuals manifest must still ship the 'celebrating' state",
);
const companionAvatarSrc = read(COMPANION_AVATAR_PATH);
assert.match(
  companionAvatarSrc,
  /export\s+function\s+CompanionAvatar\b/,
  "the audited <CompanionAvatar /> component must still be exported",
);
ok("9) Module 2 surfaces the travel companion via CompanionAvatar + audited visual states (map / confused / celebrating)");

// ─────────────────────────────────────────────────────────────────────────
// 10. Module 2 has Back / Next navigation
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  deckSrc,
  /<YoLessonDeckNav\b/,
  "YoLessonDeck must mount <YoLessonDeckNav /> for Back / Next controls",
);
assert.match(
  deckSrc,
  /goPrev\b/,
  "YoLessonDeck must wire a goPrev handler",
);
assert.match(
  deckSrc,
  /goNext\b/,
  "YoLessonDeck must wire a goNext handler",
);
assert.match(
  navSrc,
  /data-testid=["']yo-lesson-deck-nav-prev["']/,
  "YoLessonDeckNav must expose a stable Prev button test id",
);
assert.match(
  navSrc,
  /data-testid=["']yo-lesson-deck-nav-next["']/,
  "YoLessonDeckNav must expose a stable Next button test id",
);
assert.match(
  deckSrc,
  /ArrowLeft|ArrowRight/,
  "YoLessonDeck must support keyboard navigation (ArrowLeft / ArrowRight)",
);
ok("10) Module 2 has Back / Next navigation (sticky bottom buttons + keyboard arrows)");

// ─────────────────────────────────────────────────────────────────────────
// 11. Module 2 does not use breadcrumb-style primary navigation
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(
  module2PageSrc,
  /<YoBreadcrumb\b/,
  "Module 2 page must not render a 5-level breadcrumb in deck mode",
);
assert.doesNotMatch(
  module2PageSrc,
  /YoBreadcrumbItem\b/,
  "Module 2 page must drop the YoBreadcrumbItem import in deck mode",
);
assert.doesNotMatch(
  module2PageSrc,
  /breadcrumb\s*=\s*\[/,
  "Module 2 page must not build a breadcrumb array",
);
assert.doesNotMatch(
  module2PageSrc,
  /breadcrumb\s*=\s*\{breadcrumb\}/,
  "Module 2 page must not pass a breadcrumb prop in deck mode",
);
// The header is no longer page-`sticky` — the deck now wraps
// everything inside a `h-[100dvh]` flex column so the header
// sits at the top of the viewport by layout, not by sticky
// positioning. We instead assert the header is a `shrink-0`
// flex item with high `z-40` so it cannot be covered by
// in-stage content. Both classes live in `DECK_HEADER_CLASSES`
// inside the shared visual contract since the
// `feat/yopratiqo-deck-visual-consistency-pass` PR; the header
// file imports + applies that token.
const visualContractSrc = read("lib/yo/lessonDeckVisualContract.ts");
const headerShellSrc = `${headerSrc}\n${visualContractSrc}`;
assert.match(
  headerShellSrc,
  /\bshrink-0\b/,
  "the deck header must be a shrink-0 flex item inside the viewport-locked deck column",
);
assert.match(
  headerShellSrc,
  /\bz-40\b/,
  "the deck header must stay above stage content (z-40)",
);
ok("11) Module 2 dropped breadcrumb-style primary navigation in favour of the viewport-locked deck header");

// ─────────────────────────────────────────────────────────────────────────
// 12. Modules 3–5 remain routed and not broken
// ─────────────────────────────────────────────────────────────────────────

for (const [label, p] of [
  ["module-3", MODULE3_PAGE_PATH],
  ["module-4", MODULE4_PAGE_PATH],
  ["module-5", MODULE5_PAGE_PATH],
] as const) {
  assert.ok(
    existsSync(path.join(root, p)),
    `${label} page must still exist at ${p}`,
  );
  const src = read(p);
  assert.match(
    src,
    /export\s+default\s+(?:async\s+)?function\b/,
    `${label} page must still export a default page function`,
  );
  assert.match(
    src,
    /DominicanRepublicModule[345]Content\b/,
    `${label} page must still mount its premium DominicanRepublicModule[3-5]Content renderer`,
  );
}
ok("12) Modules 3–5 still routed and not broken (deck pattern intentionally not applied yet — TODO follow-up)");

// ─────────────────────────────────────────────────────────────────────────
// 13. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(
  productConfigSrc,
  /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/,
);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [label, src] of [
  ["YoLessonDeck", deckSrc],
  ["YoLessonDeckHeader", headerSrc],
  ["YoLessonDeckNav", navSrc],
  ["YoLessonDeckScreen", screenSrc],
  ["YoLessonCompanionCoach", coachSrc],
  ["lessonDeckTypes", typesSrc],
  ["module-2 page", module2PageSrc],
] as const) {
  assert.doesNotMatch(
    src,
    STRIPE_PATTERN,
    `${label} must not introduce Stripe / price_id references`,
  );
}
ok("13) paid YoPratiqo checkout remains disabled and no Stripe references added on the deck surface");

// ─────────────────────────────────────────────────────────────────────────
// 14. No raw quiz fields introduced on the deck surface
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["YoLessonDeck", deckSrc],
  ["YoLessonDeckHeader", headerSrc],
  ["YoLessonDeckNav", navSrc],
  ["YoLessonDeckScreen", screenSrc],
  ["YoLessonCompanionCoach", coachSrc],
  ["lessonDeckTypes", typesSrc],
  ["module-2 page", module2PageSrc],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok("14) no raw quiz fields introduced on the deck surface");

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
  /\.mp3$/i,
  /^scripts\/(?:generate-yopratiqo-audio|.*openai)/i,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /^lib\/seo\//,
];
const arrivalAudioRoot = "public/audio/yo/es/do/module-2/arrival-v1";
const allowedArrivalPublicClips = new Set([
  ...Array.from({ length: 5 }, (_, index) => `${arrivalAudioRoot}/airport-${String(index + 1).padStart(2, "0")}.mp3`),
  ...Array.from({ length: 8 }, (_, index) => `${arrivalAudioRoot}/hotel-${String(index + 1).padStart(2, "0")}.mp3`),
  `${arrivalAudioRoot}/hotel-repeat.mp3`,
]);
// Preserve only the two approved original takes outside public/. These
// provenance masters are never served as additional lesson audio paths.
const allowedArrivalSourceMasters = new Set([
  "docs/yopratiqo/audio/arrival-v1/masters/staff-original.mp3",
  "docs/yopratiqo/audio/arrival-v1/masters/traveler-original.mp3",
]);
function isRestrictedChange(file: string): boolean {
  if (allowedArrivalPublicClips.has(file) || allowedArrivalSourceMasters.has(file)) return false;
  return restrictedPathPatterns.some((pattern) => pattern.test(file));
}
assert.equal(allowedArrivalPublicClips.size, 14);
assert.equal(allowedArrivalSourceMasters.size, 2);
for (const file of [...allowedArrivalPublicClips, ...allowedArrivalSourceMasters]) {
  assert.equal(isRestrictedChange(file), false, `Approved arrival recording rejected: ${file}`);
}
for (const file of [
  `${arrivalAudioRoot}/airport-06.mp3`,
  `${arrivalAudioRoot}/hotel-09.mp3`,
  `${arrivalAudioRoot}/hotel-01.wav`,
  `${arrivalAudioRoot}/staff-original.mp3`,
  "public/audio/yo/es/do/module-2/arrival-v2/hotel-01.mp3",
  "docs/yopratiqo/audio/arrival-v1/masters/extra.mp3",
  "docs/yopratiqo/audio/arrival-v1/masters/staff-original-2.mp3",
  "docs/yopratiqo/audio/arrival-v2/masters/staff-original.mp3",
  "docs/unrelated.mp3",
  "lib/payments/checkout.ts",
  "supabase/migrations/example.sql",
]) {
  assert.equal(isRestrictedChange(file), true, `Scope guard must reject ${file}`);
}
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
  assert.equal(isRestrictedChange(file), false, `restricted system touched by lesson-deck PR: ${file}`);
}
ok("15) restricted systems unchanged; only 14 arrival clips and two approved source takes allowed");

console.log(`\n${pass} module-lesson-deck assertions passed`);
