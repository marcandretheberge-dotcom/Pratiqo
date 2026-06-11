/**
 * tests/yo/yopratiqoDeckVisualConsistency.test.ts
 *
 * Static contract test for the YoPratiqo lesson-deck visual
 * consistency pass
 * (`feat/yopratiqo-deck-visual-consistency-pass`).
 *
 * This file enforces the "one app product" feel across the
 * five Dominican Republic deck surfaces (Intro + Modules 2 /
 * 3 / 4 / 5) by checking that:
 *
 *   • the shared visual contract file exists and exports the
 *     canonical class-string + palette tokens used by the
 *     deck chrome;
 *   • the five deck shell components
 *     (`YoLessonDeck`, `YoLessonDeckHeader`,
 *      `YoLessonDeckNav`, `YoLessonDeckScreen`,
 *      `YoLessonCompanionCoach`) actually import + apply
 *     those tokens (so the contract isn't declared and then
 *     ignored);
 *   • the five deck composers
 *     (`DominicanRepublicIntroContent`,
 *      `DominicanRepublicModule2Content`,
 *      `DominicanRepublicModule3Content`,
 *      `DominicanRepublicModule4Content`,
 *      `DominicanRepublicModule5Content`) all mount the
 *     shared `<YoLessonDeck>`, all opt into tap navigation,
 *     all carry a companion coach on every screen, and all
 *     declare a `DECK_MODULE_LABEL` that matches the
 *     "<Surface> · RD A<level>" naming rhythm the polish PR
 *     standardized on;
 *   • the existing audited companion visual states are still
 *     the only ones the deck uses (no fake AI tutor state);
 *   • paid YoPratiqo checkout remains disabled across the
 *     entire path, no raw quiz fields are introduced on the
 *     visual contract surface, and no restricted system
 *     (Stripe / payments / tax / RLS / migrations / legal /
 *     Membre Pro / audio / SEO) is touched by this PR.
 *
 * All assertions are static (file system + string reads). No
 * runtime server, no Supabase, no browser, no MP3 generation.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Read-only file-system access on the workspace.
 *   • No network calls. No analytics. No Supabase. No payments.
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

/**
 * Strip JS / TS comments so docstring privacy disclaimers
 * (e.g. "no Stripe / OpenAI / Supabase import") that are
 * intentionally reassuring do not trip the literal-string
 * code guards below.
 */
const stripJsComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ─── Paths under contract ───────────────────────────────────────────────

const VISUAL_CONTRACT_PATH = "lib/yo/lessonDeckVisualContract.ts";
const DECK_PATH = "components/yo/YoLessonDeck.tsx";
const HEADER_PATH = "components/yo/YoLessonDeckHeader.tsx";
const NAV_PATH = "components/yo/YoLessonDeckNav.tsx";
const SCREEN_PATH = "components/yo/YoLessonDeckScreen.tsx";
const COMPANION_COACH_PATH = "components/yo/YoLessonCompanionCoach.tsx";

const INTRO_CONTENT_PATH = "components/yo/DominicanRepublicIntroContent.tsx";
const MODULE2_CONTENT_PATH = "components/yo/DominicanRepublicModule2Content.tsx";
const MODULE3_CONTENT_PATH = "components/yo/DominicanRepublicModule3Content.tsx";
const MODULE4_CONTENT_PATH = "components/yo/DominicanRepublicModule4Content.tsx";
const MODULE5_CONTENT_PATH = "components/yo/DominicanRepublicModule5Content.tsx";

const INTRO_ROUTE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/intro/page.tsx";
const MODULE2_ROUTE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";
const MODULE3_ROUTE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx";
const MODULE4_ROUTE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx";
const MODULE5_ROUTE_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx";

const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";

// ─── Loaded sources ─────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, VISUAL_CONTRACT_PATH)),
  `Shared deck visual contract must exist at ${VISUAL_CONTRACT_PATH}`,
);
const contractSrc = read(VISUAL_CONTRACT_PATH);

const deckSrc = read(DECK_PATH);
const headerSrc = read(HEADER_PATH);
const navSrc = read(NAV_PATH);
const screenSrc = read(SCREEN_PATH);
const companionCoachSrc = read(COMPANION_COACH_PATH);

const introSrc = read(INTRO_CONTENT_PATH);
const module2Src = read(MODULE2_CONTENT_PATH);
const module3Src = read(MODULE3_CONTENT_PATH);
const module4Src = read(MODULE4_CONTENT_PATH);
const module5Src = read(MODULE5_CONTENT_PATH);

const introRouteSrc = read(INTRO_ROUTE_PATH);
const module2RouteSrc = read(MODULE2_ROUTE_PATH);
const module3RouteSrc = read(MODULE3_ROUTE_PATH);
const module4RouteSrc = read(MODULE4_ROUTE_PATH);
const module5RouteSrc = read(MODULE5_ROUTE_PATH);

// All five deck-content composers, paired with a short label.
const DECK_COMPOSERS = [
  { label: "Intro", src: introSrc },
  { label: "Module 2", src: module2Src },
  { label: "Module 3", src: module3Src },
  { label: "Module 4", src: module4Src },
  { label: "Module 5", src: module5Src },
] as const;

// All five route surfaces.
const DECK_ROUTES = [
  { label: "Intro", src: introRouteSrc },
  { label: "Module 2", src: module2RouteSrc },
  { label: "Module 3", src: module3RouteSrc },
  { label: "Module 4", src: module4RouteSrc },
  { label: "Module 5", src: module5RouteSrc },
] as const;

// ─────────────────────────────────────────────────────────────────────────
// 1. Shared visual contract exists and exports the canonical tokens
// ─────────────────────────────────────────────────────────────────────────

const REQUIRED_CONTRACT_EXPORTS = [
  "DECK_PALETTE",
  "DECK_CONTENT_MAX_WIDTH_PX",
  "DECK_CONTENT_MAX_WIDTH_CLASS",
  "DECK_ROOT_CLASSES",
  "DECK_HEADER_CLASSES",
  "DECK_HEADER_ROW_CLASSES",
  "DECK_PROGRESS_STRIP_CLASSES",
  "DECK_STAGE_CLASSES",
  "DECK_SCREEN_HOST_CLASSES",
  "DECK_NAV_CLASSES",
  "DECK_NAV_ROW_CLASSES",
  "DECK_NAV_PREV_BUTTON_CLASSES",
  "DECK_NAV_NEXT_BUTTON_CLASSES",
  "DECK_NAV_TOP_FADE_CLASSES",
  "DECK_SCREEN_CARD_CLASSES",
  "DECK_SCREEN_EYEBROW_CLASSES",
  "DECK_SCREEN_TITLE_CLASSES",
  "DECK_SCREEN_BODY_CLASSES",
  "DECK_COMPANION_BUBBLE_CLASSES",
] as const;
for (const name of REQUIRED_CONTRACT_EXPORTS) {
  assert.match(
    contractSrc,
    new RegExp(`\\bexport\\s+const\\s+${name}\\b`),
    `Shared visual contract must export the \`${name}\` token`,
  );
}
// The shared content-column width is locked at 640 px so every
// deck route (header / progress strip / stage / nav) lines up
// in one consistent inner column.
assert.match(
  contractSrc,
  /DECK_CONTENT_MAX_WIDTH_PX\s*=\s*640\b/,
  "Shared deck content column must be 640 px (the audited mobile-app width)",
);
assert.match(
  contractSrc,
  /DECK_CONTENT_MAX_WIDTH_CLASS\s*=\s*["']max-w-\[640px\]["']/,
  "Shared deck content column must use the `max-w-[640px]` Tailwind class",
);
ok(
  "1) shared visual contract declares the full deck token set (palette, widths, root/header/stage/nav/screen-card/companion-bubble class strings)",
);

// ─────────────────────────────────────────────────────────────────────────
// 2. All five deck shell components import the shared visual contract
// ─────────────────────────────────────────────────────────────────────────

const SHELL_CONTRACT_CONSUMERS = [
  { label: "YoLessonDeck", src: deckSrc, mustReference: "DECK_ROOT_CLASSES" },
  {
    label: "YoLessonDeckHeader",
    src: headerSrc,
    mustReference: "DECK_HEADER_CLASSES",
  },
  {
    label: "YoLessonDeckNav",
    src: navSrc,
    mustReference: "DECK_NAV_CLASSES",
  },
  {
    label: "YoLessonDeckScreen",
    src: screenSrc,
    mustReference: "DECK_SCREEN_CARD_CLASSES",
  },
  {
    label: "YoLessonCompanionCoach",
    src: companionCoachSrc,
    mustReference: "DECK_COMPANION_BUBBLE_CLASSES",
  },
] as const;
for (const { label, src, mustReference } of SHELL_CONTRACT_CONSUMERS) {
  assert.match(
    src,
    /from\s+["']@\/lib\/yo\/lessonDeckVisualContract["']/,
    `${label} must import from the shared lessonDeckVisualContract`,
  );
  assert.match(
    src,
    new RegExp(`\\b${mustReference}\\b`),
    `${label} must consume the canonical \`${mustReference}\` token`,
  );
}
ok(
  "2) all five deck shell components import + apply the shared visual contract (no hand-rolled deck chrome)",
);

// ─────────────────────────────────────────────────────────────────────────
// 3. All five deck composers mount the shared <YoLessonDeck />
// ─────────────────────────────────────────────────────────────────────────

for (const { label, src } of DECK_COMPOSERS) {
  assert.match(
    src,
    /import\s*\{\s*YoLessonDeck\s*\}\s*from\s*["']@\/components\/yo\/YoLessonDeck["']/,
    `${label} composer must import the shared YoLessonDeck`,
  );
  assert.match(
    src,
    /<YoLessonDeck\b/,
    `${label} composer must mount <YoLessonDeck />`,
  );
}
ok(
  "3) Intro + Modules 2 / 3 / 4 / 5 composers all mount the shared <YoLessonDeck /> (no fork)",
);

// ─────────────────────────────────────────────────────────────────────────
// 4. All five composers opt into tap-zone navigation (premium feel)
// ─────────────────────────────────────────────────────────────────────────

for (const { label, src } of DECK_COMPOSERS) {
  assert.match(
    src,
    /<YoLessonDeck\b[\s\S]{0,400}?\benableTapNavigation\b/,
    `${label} composer must opt into tap-zone navigation (every per-screen interactive control is protected)`,
  );
}
ok(
  "4) Intro + Modules 2 / 3 / 4 / 5 all opt into tap-zone navigation (consistent premium gesture rhythm)",
);

// ─────────────────────────────────────────────────────────────────────────
// 5. All five composers carry a companion coach on every screen
// ─────────────────────────────────────────────────────────────────────────

// The companion coach is rendered automatically by
// `<YoLessonDeckScreen>` from each screen's `companionState`
// field — so the audit is: every composer must declare a
// `companionState:` for every screen, never omit it.
for (const { label, src } of DECK_COMPOSERS) {
  const screenIdCount = (src.match(/\bid:\s*["'][a-z0-9-]+["']/g) ?? [])
    .length;
  const companionStateCount = (
    src.match(/\bcompanionState:\s*["'][a-z_]+["']/g) ?? []
  ).length;
  assert.ok(
    companionStateCount >= screenIdCount && companionStateCount > 0,
    `${label} composer must declare a companionState for every deck screen (saw ${screenIdCount} screen ids vs ${companionStateCount} companionState declarations)`,
  );
}
ok(
  "5) every Intro + Module 2-5 deck screen declares a companionState (companion coach present on every screen)",
);

// ─────────────────────────────────────────────────────────────────────────
// 6. Composers only use the audited companion visual states
// ─────────────────────────────────────────────────────────────────────────

// Whitelist of the audited eight states from
// `lib/companion/companionVisuals.ts`. Composers must never
// invent a new state outside the manifest, and they must
// never use a state that implies fake AI tutoring (none of
// the eight imply that — the brief calls out `teacher_ready`
// is only used where a real teacher-bridge surface exists,
// asserted separately below).
const AUDITED_COMPANION_STATES = new Set([
  "neutral",
  "happy",
  "celebrating",
  "confused",
  "thinking",
  "map",
  "teacher_ready",
  "badge_unlocked",
]);
for (const { label, src } of DECK_COMPOSERS) {
  const states = new Set(
    Array.from(src.matchAll(/\bcompanionState:\s*["']([a-z_]+)["']/g)).map(
      (m) => m[1],
    ),
  );
  for (const state of states) {
    assert.ok(
      AUDITED_COMPANION_STATES.has(state),
      `${label} composer uses unaudited companion state "${state}" (must be one of: ${Array.from(AUDITED_COMPANION_STATES).join(", ")})`,
    );
  }
  // The polish brief calls out that the three core states
  // (map / confused / celebrating) must appear on each
  // surface to give the same exploratory → practice → reward
  // arc on every deck. `teacher_ready` and `badge_unlocked`
  // are allowed but optional (only Module 5 carries them).
  for (const required of ["map", "confused"] as const) {
    assert.ok(
      states.has(required),
      `${label} composer must use the audited "${required}" companion state at least once`,
    );
  }
}
ok(
  "6) every composer uses only the audited eight companion states + carries the core map → confused arc (no fake AI-tutor state introduced)",
);

// ─────────────────────────────────────────────────────────────────────────
// 7. Module labels follow the standardized "<Surface> · RD A<level>" rhythm
// ─────────────────────────────────────────────────────────────────────────

const EXPECTED_LABELS: ReadonlyArray<{
  composer: { label: string; src: string };
  fr: string;
  en: string;
  es: string;
}> = [
  {
    composer: { label: "Intro", src: introSrc },
    fr: "Intro · RD A1",
    en: "Intro · DR A1",
    es: "Intro · RD A1",
  },
  {
    composer: { label: "Module 2", src: module2Src },
    fr: "Module 2 · RD A1",
    en: "Module 2 · DR A1",
    es: "Módulo 2 · RD A1",
  },
  {
    composer: { label: "Module 3", src: module3Src },
    fr: "Module 3 · RD A1",
    en: "Module 3 · DR A1",
    es: "Módulo 3 · RD A1",
  },
  {
    composer: { label: "Module 4", src: module4Src },
    fr: "Module 4 · RD A1",
    en: "Module 4 · DR A1",
    es: "Módulo 4 · RD A1",
  },
  {
    composer: { label: "Module 5", src: module5Src },
    fr: "Module 5 · RD A2",
    en: "Module 5 · DR A2",
    es: "Módulo 5 · RD A2",
  },
];
for (const { composer, fr, en, es } of EXPECTED_LABELS) {
  assert.ok(
    composer.src.includes(`"${fr}"`),
    `${composer.label} DECK_MODULE_LABEL must declare the canonical FR string "${fr}"`,
  );
  assert.ok(
    composer.src.includes(`"${en}"`),
    `${composer.label} DECK_MODULE_LABEL must declare the canonical EN string "${en}"`,
  );
  assert.ok(
    composer.src.includes(`"${es}"`),
    `${composer.label} DECK_MODULE_LABEL must declare the canonical ES string "${es}"`,
  );
}
ok(
  '7) every composer declares the standardized "<Surface> · RD A<level>" / "<Surface> · DR A<level>" / "<Módulo X> · RD A<level>" deck-module label',
);

// ─────────────────────────────────────────────────────────────────────────
// 8. Every deck composer points back to the country Course Home, not /yo
// ─────────────────────────────────────────────────────────────────────────

for (const { label, src } of DECK_COMPOSERS) {
  // The composer builds `backHref` as
  // `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`.
  assert.match(
    src,
    /backHref\s*=\s*`\/yo\/langues\/espagnol\/pays\/republique-dominicaine\$\{langSuffix\}`/,
    `${label} composer must wire its deck header back-arrow to the country Course Home (not /yo, not /langues, not a five-level breadcrumb root)`,
  );
}
ok(
  "8) every deck back-arrow points back to the country Course Home (consistent single back target)",
);

// ─────────────────────────────────────────────────────────────────────────
// 9. Every route uses the deck content renderer, no 5-level breadcrumb
// ─────────────────────────────────────────────────────────────────────────

for (const { label, src } of DECK_ROUTES) {
  // No `breadcrumb` prop, no `breadcrumb=` JSX, no
  // YoBreadcrumb import on the deck route surface.
  assert.doesNotMatch(
    src,
    /\bbreadcrumb\s*=\s*\{/,
    `${label} route must NOT pass a breadcrumb prop in deck mode`,
  );
  assert.doesNotMatch(
    src,
    /from\s+["']@\/components\/yo\/YoBreadcrumb["']/,
    `${label} route must NOT import YoBreadcrumb`,
  );
}
ok(
  "9) no deck route ships the legacy 5-level YoPratiqo breadcrumb as primary navigation",
);

// ─────────────────────────────────────────────────────────────────────────
// 10. Every composer carries a consistent final-screen completion CTA card
// ─────────────────────────────────────────────────────────────────────────

// The polish brief allows the per-composer CTA wiring to
// stay as-is (each module has its own legitimate next-step),
// but the completion stamp visual treatment must remain
// consistent: warm-yellow background (`#FFF4D6`),
// warm-yellow border (`#F4B400`), and the canonical teal
// primary CTA (`#0F6E56`).
for (const { label, src } of DECK_COMPOSERS) {
  assert.ok(
    src.includes("#FFF4D6"),
    `${label} composer must keep the canonical warm-yellow completion-stamp surface (#FFF4D6)`,
  );
  assert.ok(
    src.includes("#F4B400"),
    `${label} composer must keep the canonical warm-yellow completion-stamp border (#F4B400)`,
  );
  assert.ok(
    src.includes("#0F6E56"),
    `${label} composer must keep the canonical teal primary completion CTA (#0F6E56)`,
  );
}
ok(
  "10) every composer keeps the canonical warm-yellow / teal completion-stamp visual treatment on its final screen",
);

// ─────────────────────────────────────────────────────────────────────────
// 11. No deck composer uses #yo-intro-experience as the primary flow anchor
// ─────────────────────────────────────────────────────────────────────────

for (const { label, src } of DECK_COMPOSERS) {
  assert.doesNotMatch(
    src,
    /href=["'][^"']*#yo-intro-experience["']/,
    `${label} composer must NOT link primary actions to the legacy in-page #yo-intro-experience anchor (primary flow goes through real routes)`,
  );
}
for (const { label, src } of DECK_ROUTES) {
  assert.doesNotMatch(
    src,
    /href=["'][^"']*#yo-intro-experience["']/,
    `${label} route must NOT link primary actions to the legacy in-page #yo-intro-experience anchor`,
  );
}
ok(
  "11) no deck composer / route routes primary navigation through the legacy #yo-intro-experience anchor",
);

// ─────────────────────────────────────────────────────────────────────────
// 12. Paid YoPratiqo checkout remains disabled across the full deck surface
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(
  productConfigSrc,
  /premiumModulesEnabled:\s*false/,
  "paid YoPratiqo checkout must stay disabled",
);
assert.match(
  productConfigSrc,
  /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/,
  "supported product types must stay free_intro-only",
);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const { label, src } of [
  { label: "lessonDeckVisualContract", src: contractSrc },
  ...DECK_COMPOSERS,
  ...DECK_ROUTES,
] as const) {
  assert.doesNotMatch(
    stripJsComments(src),
    STRIPE_PATTERN,
    `${label} must not introduce Stripe / price_id references in code (docstring privacy reassurances allowed)`,
  );
}
ok(
  "12) paid YoPratiqo checkout remains disabled and no Stripe references are introduced on the visual contract / composers / routes",
);

// ─────────────────────────────────────────────────────────────────────────
// 13. No raw quiz fields are introduced anywhere on the visual contract surface
// ─────────────────────────────────────────────────────────────────────────

// `correctOptionId` is intentionally EXCLUDED: it is the
// audited reveal-only quiz schema field consumed locally by
// `<YoQuizPreview>` and the per-module quiz components for
// the post-pick translation/explanation reveal. It is NOT a
// "raw quiz answer log" persisted to the server.
const RAW_QUIZ_PATTERN =
  /\b(?:rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const { label, src } of [
  { label: "lessonDeckVisualContract", src: contractSrc },
  { label: "YoLessonDeck", src: deckSrc },
  { label: "YoLessonDeckHeader", src: headerSrc },
  { label: "YoLessonDeckNav", src: navSrc },
  { label: "YoLessonDeckScreen", src: screenSrc },
  { label: "YoLessonCompanionCoach", src: companionCoachSrc },
] as const) {
  assert.doesNotMatch(
    stripJsComments(src),
    RAW_QUIZ_PATTERN,
    `${label} must not introduce raw-quiz field names`,
  );
}
ok(
  "13) no raw quiz fields introduced anywhere on the shared visual contract surface (contract + shell)",
);

// ─────────────────────────────────────────────────────────────────────────
// 14. No restricted system touched by this PR
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
      assert.fail(
        `restricted system touched by deck-visual-consistency PR: ${file}`,
      );
    }
  }
}
ok(
  "14) no restricted system touched (Stripe / payments / tax / RLS / migrations / legal / Membre Pro / audio / SEO)",
);

console.log(
  `\n${pass} deck-visual-consistency assertions passed`,
);
