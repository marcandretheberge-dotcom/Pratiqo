/**
 * tests/yo/yopratiqoPratiqoBridgeConsistency.test.ts
 *
 * Static contract test for the YoPratiqo ↔ Pratiqo cross-product
 * bridge. Locks in that the product-shell PR did NOT regress either
 * direction of the bridge:
 *
 *   • Pratiqo → YoPratiqo
 *       - `/student/progress` still mounts <YoStudentCompanionCard />,
 *       - the YoPratiqo companion section has its own clear heading,
 *       - the page exposes a CTA back to `/student/yopratiqo`.
 *
 *   • YoPratiqo → Pratiqo
 *       - `/student/yopratiqo` (the new hub) keeps `/student/progress`
 *         reachable as the "full Pratiqo progress" link.
 *
 *   • Teacher bridge (privacy-safe)
 *       - `TeacherLearningInsightCard` still exists and its copy
 *         clearly conveys the summary is shared with student consent,
 *       - `BookingModal` still mounts `YoBookingTeacherBridgeConsent`
 *         and the consent state still defaults to `useState(false)`,
 *       - `/api/bookings/[id]/yopratiqo-bridge` still exists and only
 *         accepts a student writing for their OWN booking,
 *       - teachers cannot read another student's raw progress
 *         snapshots via the public app,
 *       - no raw quiz field names slip into the teacher-side card,
 *       - the progress snapshots API stays owner-only,
 *       - booking-level consent behavior was not weakened,
 *       - no restricted system path is touched.
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

function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// ─────────────────────────────────────────────────────────────────────────
// Paths under contract
// ─────────────────────────────────────────────────────────────────────────

const HUB_CONTENT_PATH = "components/yo/YoStudentHubContent.tsx";
const STUDENT_PROGRESS_PATH = "app/(app)/student/progress/page.tsx";
const STUDENT_COMPANION_CARD_PATH = "components/yo/YoStudentCompanionCard.tsx";
const TEACHER_INSIGHT_CARD_PATH = "components/yo/TeacherLearningInsightCard.tsx";
const TEACHER_BRIDGE_COPY_PATH = "lib/yopratiqo/teacherBridgeCopy.ts";
const TEACHER_BRIDGE_RUNTIME_PATH = "lib/yopratiqo/teacherBridge.ts";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const BOOKING_BRIDGE_CONSENT_PATH = "components/yo/YoBookingTeacherBridgeConsent.tsx";
const BOOKING_BRIDGE_ROUTE_PATH = "app/api/bookings/[id]/yopratiqo-bridge/route.ts";
const PROGRESS_SNAPSHOTS_ROUTE_PATH = "app/api/yo/progress/route.ts";

// ─────────────────────────────────────────────────────────────────────────
// 1. /student/progress still mounts YoStudentCompanionCard
// ─────────────────────────────────────────────────────────────────────────

const progressSrc = read(STUDENT_PROGRESS_PATH);
assert.match(
  progressSrc,
  /import\s*\{\s*YoStudentCompanionCard\s*\}\s*from\s*["']@\/components\/yo\/YoStudentCompanionCard["']/,
  "/student/progress must still import YoStudentCompanionCard",
);
assert.match(
  progressSrc,
  /<YoStudentCompanionCard\b/,
  "/student/progress must still mount <YoStudentCompanionCard />",
);
// Legacy companion card stays too.
assert.match(
  progressSrc,
  /<CompanionCard\b/,
  "/student/progress must still mount the legacy <CompanionCard /> alongside YoStudentCompanionCard",
);
// YoStudentCompanionCard is the same component exported by its file.
const companionCardSrc = read(STUDENT_COMPANION_CARD_PATH);
assert.match(
  companionCardSrc,
  /export\s+function\s+YoStudentCompanionCard\b/,
  "YoStudentCompanionCard must still be exported",
);
ok("1) /student/progress still mounts YoStudentCompanionCard next to the legacy CompanionCard");

// ─────────────────────────────────────────────────────────────────────────
// 2. /student/progress includes a clear YoPratiqo companion section
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  progressSrc,
  /data-testid=["']yo-progress-bridge-section["']/,
  "/student/progress must expose the YoPratiqo bridge section via data-testid",
);
assert.match(
  progressSrc,
  /data-testid=["']yo-progress-bridge-heading["']/,
  "/student/progress must expose the YoPratiqo bridge section heading",
);
// Heading text in FR / EN / ES — the YoPratiqo companion is now
// officially named "Yoppo". The student-facing heading keeps the
// "compagnon YoPratiqo" / "YoPratiqo companion" disambiguator so the
// learner knows which product the mascot belongs to, while the new
// Yoppo prefix makes the mascot recognizable across surfaces. The
// brief is explicit: do not rename YoPratiqo to Yoppo — both names
// must coexist in the section heading.
assert.ok(
  progressSrc.includes("Yoppo") &&
    progressSrc.includes("compagnon YoPratiqo"),
  "/student/progress must surface the FR Yoppo · compagnon YoPratiqo heading",
);
assert.ok(
  progressSrc.includes("Yoppo") &&
    progressSrc.includes("YoPratiqo companion"),
  "/student/progress must surface the EN Yoppo · YoPratiqo companion heading",
);
assert.ok(
  progressSrc.includes("Yoppo") &&
    progressSrc.includes("compañero YoPratiqo"),
  "/student/progress must surface the ES Yoppo · compañero YoPratiqo heading",
);
ok("2) /student/progress includes a clear, localized Yoppo · YoPratiqo companion section");

// ─────────────────────────────────────────────────────────────────────────
// 3. /student/progress links to /student/yopratiqo
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  progressSrc,
  /data-testid=["']yo-progress-bridge-cta["']/,
  "/student/progress must expose the YoPratiqo CTA via data-testid",
);
assert.match(
  progressSrc,
  /href=["']\/student\/yopratiqo["']/,
  "/student/progress must link to /student/yopratiqo so YoPratiqo is one click away",
);
// CTA label, FR / EN / ES — verbatim from the brief.
assert.ok(progressSrc.includes("Ouvrir YoPratiqo"));
assert.ok(progressSrc.includes("Open YoPratiqo"));
assert.ok(progressSrc.includes("Abrir YoPratiqo"));
ok("3) /student/progress links to /student/yopratiqo with localized 'Open YoPratiqo' CTA");

// ─────────────────────────────────────────────────────────────────────────
// 4. /student/yopratiqo links back to /student/progress
// ─────────────────────────────────────────────────────────────────────────

const hubSrc = read(HUB_CONTENT_PATH);
assert.match(
  hubSrc,
  /["']\/student\/progress["']/,
  "/student/yopratiqo must link back to /student/progress (the full-Pratiqo-progress bridge)",
);
assert.match(
  hubSrc,
  /data-testid=["']yo-student-hub-full-progress-link["']/,
  "/student/yopratiqo must expose the full-Pratiqo-progress link via data-testid",
);
// Localized CTA text — verbatim from the brief.
assert.ok(hubSrc.includes("Voir toute ma progression Pratiqo"));
assert.ok(hubSrc.includes("View my full Pratiqo progress"));
assert.ok(hubSrc.includes("Ver todo mi progreso Pratiqo"));
ok("4) /student/yopratiqo links back to /student/progress as 'View my full Pratiqo progress'");

// ─────────────────────────────────────────────────────────────────────────
// 5. TeacherLearningInsightCard still exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, TEACHER_INSIGHT_CARD_PATH)),
  "TeacherLearningInsightCard.tsx must still exist",
);
const insightCardSrc = read(TEACHER_INSIGHT_CARD_PATH);
assert.match(
  insightCardSrc,
  /export\s+function\s+TeacherLearningInsightCard\b/,
  "TeacherLearningInsightCard must still be exported",
);
ok("5) TeacherLearningInsightCard still exists and is still exported");

// ─────────────────────────────────────────────────────────────────────────
// 6. TeacherLearningInsightCard copy says summary is shared by consent
// ─────────────────────────────────────────────────────────────────────────

// The card consumes copy from teacherBridgeCopy.ts + teacherBridge.ts.
// We assert the canonical strings live there (single source of truth)
// AND that the card actually renders them.
const teacherCopySrc = read(TEACHER_BRIDGE_COPY_PATH);
const teacherRuntimeSrc = read(TEACHER_BRIDGE_RUNTIME_PATH);
// Canonical title clearly attributes the summary to student consent.
assert.ok(
  teacherCopySrc.includes("YoPratiqo summary shared by the student"),
  "teacherBridgeCopy.ts must keep the EN 'YoPratiqo summary shared by the student' wording",
);
assert.ok(
  teacherCopySrc.includes("Résumé YoPratiqo partagé par l'élève") ||
    teacherCopySrc.includes("Résumé YoPratiqo partagé par l’élève"),
  "teacherBridgeCopy.ts must keep the FR 'Résumé YoPratiqo partagé par l'élève' wording",
);
// Safe-summary notice explicitly says raw quiz answers are not shared.
assert.match(
  teacherRuntimeSrc,
  /TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE/,
  "teacherBridge.ts must export TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE",
);
assert.ok(
  teacherRuntimeSrc.includes("consent-based") ||
    teacherRuntimeSrc.includes("résumé pédagogique consenti") ||
    teacherRuntimeSrc.includes("autorizado"),
  "TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE must clearly say the summary is consent-based",
);
assert.ok(
  teacherRuntimeSrc.includes("never detailed quiz responses") ||
    teacherRuntimeSrc.includes("jamais les réponses détaillées") ||
    teacherRuntimeSrc.includes("nunca respuestas detalladas"),
  "TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE must say detailed quiz responses are never shared",
);
// The card actually uses both the title and the notice.
assert.match(
  insightCardSrc,
  /TEACHER_INSIGHT_TITLE_LOCALIZED/,
  "TeacherLearningInsightCard must render the canonical TEACHER_INSIGHT_TITLE_LOCALIZED",
);
assert.match(
  insightCardSrc,
  /TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE/,
  "TeacherLearningInsightCard must render the safe-summary notice",
);
ok("6) TeacherLearningInsightCard copy clearly conveys student-consent + no detailed quiz answers");

// ─────────────────────────────────────────────────────────────────────────
// 7. BookingModal still mounts YoBookingTeacherBridgeConsent
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
assert.ok(
  existsSync(path.join(root, BOOKING_BRIDGE_CONSENT_PATH)),
  "YoBookingTeacherBridgeConsent.tsx must still exist",
);
ok("7) BookingModal still mounts <YoBookingTeacherBridgeConsent />");

// ─────────────────────────────────────────────────────────────────────────
// 8. BookingModal consent default remains false
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  bookingModalSrc,
  /const \[yoBridgeConsent, setYoBridgeConsent\] = useState\(false\)/,
  "BookingModal must keep the consent checkbox initialized to useState(false)",
);
ok("8) BookingModal consent checkbox still defaults to useState(false)");

// ─────────────────────────────────────────────────────────────────────────
// 9. /api/bookings/[id]/yopratiqo-bridge still exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, BOOKING_BRIDGE_ROUTE_PATH)),
  "/api/bookings/[id]/yopratiqo-bridge route must still exist",
);
const bridgeRouteSrc = read(BOOKING_BRIDGE_ROUTE_PATH);
assert.match(
  bridgeRouteSrc,
  /export\s+async\s+function\s+POST\(/,
  "bridge route must still export POST",
);
ok("9) /api/bookings/[id]/yopratiqo-bridge still exists and exports POST");

// ─────────────────────────────────────────────────────────────────────────
// 10. Teachers cannot read another user's raw progress snapshots
// ─────────────────────────────────────────────────────────────────────────

// The bridge route only writes consent for the AUTHENTICATED student
// (booking.student_id === user.id). Teachers (or any other caller)
// hit the 403 branch.
assert.match(
  bridgeRouteSrc,
  /booking\.student_id\s*!==\s*user\.id/,
  "bridge route must reject callers whose user.id ≠ booking.student_id",
);
assert.match(
  bridgeRouteSrc,
  /status:\s*403/,
  "bridge route must respond 403 for non-owner callers",
);
// Snapshot reads in the bridge are scoped to `user_id = user.id`.
assert.match(
  bridgeRouteSrc,
  /\.eq\(["']user_id["'],\s*user\.id\)/,
  "bridge route must only read snapshots scoped to the authenticated user's user_id",
);
ok("10) bridge route enforces student-owns-booking and only reads the caller's own snapshots");

// ─────────────────────────────────────────────────────────────────────────
// 11. No raw quiz answers are exposed to teachers
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
for (const [label, src] of [
  ["TeacherLearningInsightCard", stripJsComments(insightCardSrc)],
  ["teacherBridgeCopy", stripJsComments(teacherCopySrc)],
  ["teacherBridge", stripJsComments(teacherRuntimeSrc)],
  ["bridge route", stripJsComments(bridgeRouteSrc)],
] as const) {
  assert.doesNotMatch(
    src,
    RAW_QUIZ_PATTERN,
    `${label} must not expose any raw-quiz field name`,
  );
}
ok("11) no raw quiz field names appear in teacher-side or bridge surfaces");

// ─────────────────────────────────────────────────────────────────────────
// 12. Progress snapshots API remains owner-only
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, PROGRESS_SNAPSHOTS_ROUTE_PATH)),
  "/api/yo/progress route must still exist",
);
const snapshotsRouteSrc = read(PROGRESS_SNAPSHOTS_ROUTE_PATH);
assert.match(
  snapshotsRouteSrc,
  /Authorization/,
  "progress snapshots route must require an Authorization header",
);
assert.match(
  snapshotsRouteSrc,
  /auth\.getUser\(\)/,
  "progress snapshots route must resolve the caller via supabase.auth.getUser()",
);
// Snapshot reads/writes are scoped to the caller's own user id.
// The route uses an `auth` helper that returns `{ ok, user }`, so
// the references can read as either `user.id` or `auth.user.id`.
assert.match(
  snapshotsRouteSrc,
  /\.eq\(["']user_id["'],\s*(?:auth\.)?user\.id\)/,
  "progress snapshots route must read rows scoped to the caller's own user_id only",
);
// And the writer must derive the user_id from the authenticated
// session — never from the client payload.
assert.match(
  snapshotsRouteSrc,
  /buildSnapshotInsert\([^,]+,\s*(?:auth\.)?user\.id\)|user_id\s*:\s*(?:auth\.)?user\.id/,
  "progress snapshots route must derive user_id from auth.user.id on writes (never from the client body)",
);
ok("12) /api/yo/progress remains owner-only (auth-required + user_id scoping intact)");

// ─────────────────────────────────────────────────────────────────────────
// 13. Booking-level consent behavior was not weakened
// ─────────────────────────────────────────────────────────────────────────

// The booking-modal consent default false was asserted in #8. Here
// we also check the wrapper component still ships a soft empty state
// (so an empty consent click doesn't pretend to share progress).
const bridgeConsentSrc = read(BOOKING_BRIDGE_CONSENT_PATH);
assert.match(
  bridgeConsentSrc,
  /hasYoPratiqoProgress\?:\s*boolean/,
  "YoBookingTeacherBridgeConsent must still accept a hasYoPratiqoProgress flag for the empty state",
);
assert.match(
  bridgeConsentSrc,
  /data-testid=["']yo-booking-teacher-bridge-empty["']/,
  "YoBookingTeacherBridgeConsent must still render the soft empty state when no progress exists",
);
// Booking modal still POSTs with the consent flag.
assert.match(
  bookingModalSrc,
  /consent_granted:\s*yoBridgeConsent/,
  "BookingModal must still POST `consent_granted: yoBridgeConsent` to the bridge route",
);
ok("13) booking-level consent default + empty state + POST contract are unchanged");

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
  // Bridge API + RLS migrations are also under contract — we must
  // never touch them in a product-shell PR.
  /^app\/api\/bookings\/\[id\]\/yopratiqo-bridge\/route\.ts$/,
  /^app\/api\/yo\/progress\/route\.ts$/,
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
      assert.fail(`restricted system touched by bridge-consistency PR: ${file}`);
    }
  }
}
ok("14) no restricted system touched (Stripe / payments / RLS / migrations / legal / SEO / bridge API / progress API)");

console.log(`\n${pass} bridge-consistency assertions passed`);
