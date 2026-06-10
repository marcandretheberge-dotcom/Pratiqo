/**
 * tests/yo/yopratiqoTeacherBridgeE2eSmoke.test.ts
 *
 * Static end-to-end smoke for the full YoPratiqo → teacher bridge
 * flow. Companion to docs/YOPRATIQO_TEACHER_BRIDGE_E2E_QA.md.
 *
 * What this test does
 * -------------------
 * The runtime end-to-end runbook lives in
 * docs/YOPRATIQO_TEACHER_BRIDGE_E2E_QA.md and is executed by a human
 * QA engineer. This file defends the **static contracts** that the
 * runbook relies on, so a future refactor cannot silently break the
 * flow it documents (e.g. by deleting a mount point or by leaking a
 * raw-quiz field into a teacher-visible surface).
 *
 * Assertions
 * ----------
 *   1.  QA runbook exists at the expected path.
 *   2.  QA runbook covers Sections A → G.
 *   3.  Runbook covers the student progress flow (Section B).
 *   4.  Runbook covers the booking consent flow (Section C).
 *   5.  Runbook covers the teacher insight flow (Section D).
 *   6.  Runbook covers mobile checks (Section F).
 *   7.  Runbook covers failure cases (Section G).
 *   8.  /student/progress page mounts YoStudentCompanionCard and keeps
 *       the legacy CompanionCard mounted next to it.
 *   9.  Dominican Republic Modules 2, 3, 4, 5 all mount
 *       YoMarkModuleCompletedButton.
 *  10.  BookingModal mounts YoBookingTeacherBridgeConsent, defaults the
 *       checkbox to false, and POSTs to /api/bookings/:id/yopratiqo-bridge.
 *  11.  Teacher progress page mounts TeacherLearningInsightCard.
 *  12.  Teacher progress page does NOT query yopratiqo_progress_snapshots
 *       directly — it only reads booking_yopratiqo_learning_summaries.
 *  13.  No raw-quiz field name appears in any bridge surface, the new
 *       student companion card, the booking modal, or the teacher
 *       progress page.
 *  14.  Companion production assets are only referenced via the
 *       manifest in lib/companion/companionVisuals.ts — no React
 *       component hardcodes a `public/companion/...` path.
 *  15.  Paid YoPratiqo checkout remains disabled (no Stripe / price_id
 *       reference added to the bridge or progress surfaces).
 *  16.  No restricted system (Stripe / payments / tax / legal / RLS /
 *       migrations / Membre Pro / audio / SEO) touched by this PR.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
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

const RUNBOOK_PATH = "docs/YOPRATIQO_TEACHER_BRIDGE_E2E_QA.md";
const STUDENT_PROGRESS_PATH = "app/(app)/student/progress/page.tsx";
const TEACHER_PROGRESS_PATH = "app/(app)/teacher/progress/page.tsx";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const STUDENT_COMPANION_CARD_PATH = "components/yo/YoStudentCompanionCard.tsx";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";
const COMPANION_MANIFEST_PATH = "lib/companion/companionVisuals.ts";
const COMPANION_AVATAR_PATH = "components/companion/CompanionAvatar.tsx";
const COMPANION_BRIDGE_CARD_PATH = "components/companion/CompanionBridgeCard.tsx";

const RD_MODULE_CONTENT_PATHS: ReadonlyArray<readonly [string, string]> = [
  ["module-2", "components/yo/DominicanRepublicModule2Content.tsx"],
  ["module-3", "components/yo/DominicanRepublicModule3Content.tsx"],
  ["module-4", "components/yo/DominicanRepublicModule4Content.tsx"],
  ["module-5", "components/yo/DominicanRepublicModule5Content.tsx"],
];

// ─────────────────────────────────────────────────────────────────────────
// 1-2. Runbook exists and covers Sections A → G
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, RUNBOOK_PATH)),
  `QA runbook must exist at ${RUNBOOK_PATH}`,
);
const runbook = read(RUNBOOK_PATH);
ok("1) QA runbook exists at docs/YOPRATIQO_TEACHER_BRIDGE_E2E_QA.md");

for (const section of [
  "## Section A — Preconditions",
  "## Section B — Student progress flow",
  "## Section C — Booking consent flow",
  "## Section D — Teacher insight flow",
  "## Section E — Privacy checks",
  "## Section F — Mobile checks",
  "## Section G — Failure cases",
]) {
  assert.ok(
    runbook.includes(section),
    `runbook missing top-level section "${section}"`,
  );
}
ok("2) runbook covers Sections A → G");

// ─────────────────────────────────────────────────────────────────────────
// 3-7. Runbook content checks (student / booking / teacher / mobile / failures)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  runbook,
  /Open Module 2 and save progress/i,
  "runbook must walk through saving Module 2 progress",
);
assert.match(
  runbook,
  /Repeat for Modules 3, 4, and 5/i,
  "runbook must instruct the QA to repeat for Modules 3, 4, 5",
);
assert.match(
  runbook,
  /YoStudentCompanionCard|YoPratiqo Companion/i,
  "runbook must verify the YoPratiqo Companion card",
);
ok("3) runbook covers the student progress flow");

assert.match(
  runbook,
  /unchecked by default/i,
  "runbook must assert the booking consent checkbox is unchecked by default",
);
assert.match(
  runbook,
  /POST \/api\/bookings\/\{booking_id\}\/yopratiqo-bridge/i,
  "runbook must show the exact bridge API endpoint",
);
assert.match(
  runbook,
  /consent_granted\s*=\s*true/i,
  "runbook must show the persisted consent contract",
);
ok("4) runbook covers the booking consent flow");

assert.match(
  runbook,
  /TeacherLearningInsightCard/,
  "runbook must verify the teacher insight card",
);
assert.match(
  runbook,
  /\*\*unlocked\*\*\s+state/i,
  "runbook must distinguish the unlocked teacher card state",
);
assert.match(
  runbook,
  /\*\*locked\*\*\s+state/i,
  "runbook must distinguish the locked teacher card state",
);
ok("5) runbook covers the teacher insight flow");

assert.match(runbook, /≤ 414 px/);
assert.match(runbook, /Booking modal/i);
assert.match(runbook, /Teacher progress page/i);
assert.match(runbook, /No broken companion images/i);
ok("6) runbook covers mobile checks");

for (const failureLabel of [
  "Unauthenticated progress save",
  "Progress API failure",
  "Booking created but bridge POST fails",
  "No YoPratiqo progress",
  "Consent true but `summary` null",
  "Teacher not owner of booking",
]) {
  assert.ok(
    runbook.includes(failureLabel),
    `runbook missing failure case: ${failureLabel}`,
  );
}
ok("7) runbook covers all 6 documented failure cases");

// ─────────────────────────────────────────────────────────────────────────
// 8. Student progress page wiring
// ─────────────────────────────────────────────────────────────────────────

const studentProgressSrc = read(STUDENT_PROGRESS_PATH);
assert.match(
  studentProgressSrc,
  /import\s*\{\s*YoStudentCompanionCard\s*\}\s*from\s*["']@\/components\/yo\/YoStudentCompanionCard["']/,
  "student progress page must import YoStudentCompanionCard",
);
assert.match(
  studentProgressSrc,
  /<YoStudentCompanionCard\b/,
  "student progress page must mount <YoStudentCompanionCard />",
);
assert.match(
  studentProgressSrc,
  /<CompanionCard\b/,
  "student progress page must still mount the legacy CompanionCard",
);
ok("8) /student/progress mounts YoStudentCompanionCard next to the legacy CompanionCard");

// ─────────────────────────────────────────────────────────────────────────
// 9. Dominican Republic Modules 2-5 mount YoMarkModuleCompletedButton
// ─────────────────────────────────────────────────────────────────────────

for (const [moduleId, filePath] of RD_MODULE_CONTENT_PATHS) {
  const src = read(filePath);
  assert.match(
    src,
    /import\s*\{\s*YoMarkModuleCompletedButton\s*\}\s*from\s*["']@\/components\/yo\/YoMarkModuleCompletedButton["']/,
    `${moduleId} content must import YoMarkModuleCompletedButton`,
  );
  assert.match(
    src,
    /<YoMarkModuleCompletedButton\b/,
    `${moduleId} content must render <YoMarkModuleCompletedButton />`,
  );
}
ok("9) RD Modules 2, 3, 4, 5 all mount YoMarkModuleCompletedButton");

// ─────────────────────────────────────────────────────────────────────────
// 10. BookingModal wiring
// ─────────────────────────────────────────────────────────────────────────

const bookingModalSrc = read(BOOKING_MODAL_PATH);
assert.match(
  bookingModalSrc,
  /import\s*\{\s*YoBookingTeacherBridgeConsent\s*\}\s*from\s*["']@\/components\/yo\/YoBookingTeacherBridgeConsent["']/,
  "BookingModal must import YoBookingTeacherBridgeConsent",
);
assert.match(
  bookingModalSrc,
  /<YoBookingTeacherBridgeConsent\b/,
  "BookingModal must render <YoBookingTeacherBridgeConsent />",
);
assert.match(
  bookingModalSrc,
  /const \[yoBridgeConsent, setYoBridgeConsent\] = useState\(false\)/,
  "BookingModal must initialize the consent checkbox to false (default off)",
);
assert.match(
  bookingModalSrc,
  /\/api\/bookings\/\$\{bookingId\}\/yopratiqo-bridge/,
  "BookingModal must POST to /api/bookings/<id>/yopratiqo-bridge",
);
ok("10) BookingModal mounts the consent surface, defaults to false, and POSTs to the bridge route");

// ─────────────────────────────────────────────────────────────────────────
// 11-12. Teacher progress page wiring + privacy contract
// ─────────────────────────────────────────────────────────────────────────

const teacherProgressSrc = read(TEACHER_PROGRESS_PATH);
assert.match(
  teacherProgressSrc,
  /import\s*\{\s*TeacherLearningInsightCard\s*\}\s*from\s*["']@\/components\/yo\/TeacherLearningInsightCard["']/,
  "teacher progress page must import TeacherLearningInsightCard",
);
assert.match(
  teacherProgressSrc,
  /<TeacherLearningInsightCard\b/,
  "teacher progress page must render <TeacherLearningInsightCard />",
);
ok("11) /teacher/progress mounts TeacherLearningInsightCard");

assert.match(
  teacherProgressSrc,
  /\.from\("booking_yopratiqo_learning_summaries"\)/,
  "teacher progress page must read the consent-gated summaries table",
);
assert.doesNotMatch(
  teacherProgressSrc,
  /yopratiqo_progress_snapshots/,
  "teacher progress page MUST NOT query yopratiqo_progress_snapshots directly",
);
ok("12) /teacher/progress never reads yopratiqo_progress_snapshots directly — only the consent-gated summaries");

// ─────────────────────────────────────────────────────────────────────────
// 13. Raw-quiz fields are not present in bridge surfaces
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|correctOptionId|correct_option_id|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;

const SURFACES_TO_SCAN: ReadonlyArray<readonly [string, string]> = [
  ["student companion card", STUDENT_COMPANION_CARD_PATH],
  ["booking modal", BOOKING_MODAL_PATH],
  ["teacher progress page", TEACHER_PROGRESS_PATH],
  ["companion bridge card", COMPANION_BRIDGE_CARD_PATH],
  ["companion avatar", COMPANION_AVATAR_PATH],
  ["teacher learning insight card", "components/yo/TeacherLearningInsightCard.tsx"],
  ["booking bridge consent surface", "components/yo/YoBookingTeacherBridgeConsent.tsx"],
];
for (const [label, p] of SURFACES_TO_SCAN) {
  const src = read(p);
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} (${p}) must not reference raw-quiz field names`,
  );
}
ok("13) no raw-quiz field name appears in any bridge / progress surface");

// ─────────────────────────────────────────────────────────────────────────
// 14. Companion assets are referenced only through the manifest
// ─────────────────────────────────────────────────────────────────────────

const HARDCODED_COMPANION_PATH = /["'`]\/?(?:public\/)?companion\/travel\//;
const ALLOWED_MANIFEST_REFERENCES = new Set<string>([
  COMPANION_MANIFEST_PATH,
  // The asset-plan doc lists the filenames — that's documentation, not code.
  "docs/COMPANION_BRIDGE_ASSET_PLAN.md",
  // The runbook references the public path in a QA instruction — that's a
  // human checklist, not a runtime reference.
  RUNBOOK_PATH,
]);

const codeFilesToScan = [
  STUDENT_PROGRESS_PATH,
  TEACHER_PROGRESS_PATH,
  BOOKING_MODAL_PATH,
  STUDENT_COMPANION_CARD_PATH,
  COMPANION_AVATAR_PATH,
  COMPANION_BRIDGE_CARD_PATH,
  "components/yo/TeacherLearningInsightCard.tsx",
  "components/yo/YoBookingTeacherBridgeConsent.tsx",
  ...RD_MODULE_CONTENT_PATHS.map(([, p]) => p),
];
for (const file of codeFilesToScan) {
  if (ALLOWED_MANIFEST_REFERENCES.has(file)) continue;
  const src = read(file);
  assert.doesNotMatch(
    src,
    HARDCODED_COMPANION_PATH,
    `${file} must not hardcode a /companion/travel/... path — go through CompanionAvatar / getCompanionVisualAsset`,
  );
}

// And confirm the manifest itself is the central source of truth.
const manifestSrc = read(COMPANION_MANIFEST_PATH);
assert.match(
  manifestSrc,
  /SHIPPED_ASSETS/,
  "companion manifest must keep an explicit SHIPPED_ASSETS allow-list",
);
assert.match(
  manifestSrc,
  /export function getCompanionVisualAsset\(/,
  "companion manifest must expose getCompanionVisualAsset as the lookup API",
);
ok("14) all companion assets are referenced via the manifest — no hardcoded paths");

// ─────────────────────────────────────────────────────────────────────────
// 15. Paid YoPratiqo checkout remains disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);

const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [label, p] of [
  ["student companion card", STUDENT_COMPANION_CARD_PATH],
  ["booking consent surface", "components/yo/YoBookingTeacherBridgeConsent.tsx"],
  ["teacher learning insight card", "components/yo/TeacherLearningInsightCard.tsx"],
  ["runbook", RUNBOOK_PATH],
] as const) {
  const src = read(p);
  // The runbook explicitly mentions "no Stripe price ID" as a precondition,
  // so allow that exact reassuring phrase but not any Stripe wiring.
  if (label === "runbook") {
    assert.ok(
      !/stripe\.checkout|stripe\.subscriptions|stripeClient|stripe\.invoices/i.test(src),
      "runbook must not introduce Stripe API references",
    );
    continue;
  }
  assert.doesNotMatch(
    src,
    STRIPE_PATTERN,
    `${label} must not introduce Stripe / price_id references`,
  );
}
ok("15) paid YoPratiqo checkout remains disabled and no Stripe references added to bridge surfaces");

// ─────────────────────────────────────────────────────────────────────────
// 16. No restricted system touched
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
      assert.fail(`restricted system touched by QA smoke PR: ${file}`);
    }
  }
}
ok("16) no restricted system touched by this PR");

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────

console.log(`\n${pass} teacher-bridge end-to-end smoke assertions passed`);
