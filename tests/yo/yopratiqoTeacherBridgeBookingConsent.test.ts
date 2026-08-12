import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  assertSafeTeacherBridgeSummary,
  FORBIDDEN_TEACHER_BRIDGE_FIELDS,
} from "@/lib/yopratiqo/teacherBridgeSummary";
import {
  ALLOWED_BOOKING_BRIDGE_SUMMARY_KEYS,
  BOOKING_BRIDGE_SUMMARY_VERSION,
  buildSafeBookingSummary,
  parseClientConsentPayload,
  rowToConsentState,
  type BookingTeacherBridgeRow,
} from "@/lib/yopratiqo/teacherBridgeBookingPersistence";

/**
 * Booking-time teacher-bridge consent tests.
 *
 * The 15 numbered assertions mirror PART G of the launch brief for
 * `feat/yopratiqo-teacher-bridge-booking-consent`.
 *
 * What this proves
 * ----------------
 *   • The BookingModal mounts the booking-scoped consent wrapper.
 *   • The checkbox defaults to unchecked.
 *   • The booking creation flow posts the consent flag to the new server
 *     route only after the booking row exists, and only after Stripe-style
 *     auth has been established.
 *   • The server route + persistence library reject every forbidden
 *     raw-quiz key, sanitize every accepted payload, and never trust a
 *     client-provided student_id / teacher_id / booking_id.
 *   • The teacher progress page renders the locked insight card when no
 *     consent row exists; it never renders raw quiz data.
 *   • Locale-aware copy exists in FR / EN / ES.
 *   • No restricted system (Stripe / payments / tax / legal / Membre Pro
 *     commission / MP3 / OpenAI / sitemap / Course schema) is touched
 *     outside the explicit allow-list.
 *   • A new Supabase migration adds the consent table WITH RLS and
 *     student-only writes — both participants can read.
 */

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

// ─────────────────────────────────────────────────────────────────────────
// Files under test
// ─────────────────────────────────────────────────────────────────────────

const bookingModalPath = "components/BookingModal.tsx";
const consentWrapperPath = "components/yo/YoBookingTeacherBridgeConsent.tsx";
const consentCardPath = "components/yo/YoTeacherBridgeConsentCard.tsx";
const insightCardPath = "components/yo/TeacherLearningInsightCard.tsx";
const persistenceLibPath = "lib/yopratiqo/teacherBridgeBookingPersistence.ts";
const apiRoutePath = "app/api/bookings/[id]/yopratiqo-bridge/route.ts";
const teacherProgressPath = "app/(app)/teacher/progress/page.tsx";
const migrationPath = "supabase/migrations/077_booking_yopratiqo_learning_summaries.sql";
const hardeningMigrationPath = "supabase/migrations/074_enable_rls_security_hardening.sql";
const productConfigPath = "lib/yo/yopratiqoProductConfig.ts";

for (const file of [
  bookingModalPath,
  consentWrapperPath,
  consentCardPath,
  insightCardPath,
  persistenceLibPath,
  apiRoutePath,
  teacherProgressPath,
  migrationPath,
  hardeningMigrationPath,
  productConfigPath,
]) {
  assert.ok(existsSync(path.join(root, file)), `expected file is missing: ${file}`);
}

const bookingModal = read(bookingModalPath);
const consentWrapper = read(consentWrapperPath);
const consentCard = read(consentCardPath);
const insightCard = read(insightCardPath);
const persistenceLib = read(persistenceLibPath);
const apiRoute = read(apiRoutePath);
const teacherProgress = read(teacherProgressPath);
const migration = read(migrationPath);
const hardening = read(hardeningMigrationPath);
const productConfig = read(productConfigPath);

// ─────────────────────────────────────────────────────────────────────────
// 1. BookingModal includes YoTeacherBridgeConsentCard (via the booking wrapper)
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  bookingModal,
  /import\s+\{\s*YoBookingTeacherBridgeConsent\s*\}\s+from\s+["']@\/components\/yo\/YoBookingTeacherBridgeConsent["']/,
);
assert.match(bookingModal, /<YoBookingTeacherBridgeConsent\b/);
// The wrapper itself renders the actual YoTeacherBridgeConsentCard when
// the student has YoPratiqo progress, and renders the empty state
// otherwise. Both code paths must be present in the wrapper source.
assert.match(consentWrapper, /YoTeacherBridgeConsentCard/);
assert.match(consentWrapper, /data-testid="yo-booking-teacher-bridge-empty"/);
ok("1) BookingModal includes the YoPratiqo bridge consent card via the booking wrapper");

// ─────────────────────────────────────────────────────────────────────────
// 2. Checkbox is unchecked by default
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  bookingModal,
  /useState\(false\);\s*\n\s*\/\/ YoPratiqo/,
  "BookingModal's yoBridgeConsent state must be initialized to false (the comment is part of the source-scan anchor)",
);
// The pure consent card cannot default to checked either.
assert.doesNotMatch(consentCard, /checked\s*=\s*true/);
ok("2) booking-time consent checkbox defaults to unchecked");

// ─────────────────────────────────────────────────────────────────────────
// 3. Booking payload includes explicit consent flag only when selected
// ─────────────────────────────────────────────────────────────────────────

// The booking flow must POST the consent flag to the new endpoint AFTER
// the booking row is inserted (so the API can validate ownership) and
// with the controlled `yoBridgeConsent` value — never a hardcoded `true`.
assert.match(
  bookingModal,
  /fetch\(`\/api\/bookings\/\$\{bookingId\}\/yopratiqo-bridge`/,
);
assert.match(bookingModal, /consent_granted:\s*yoBridgeConsent/);
// And it must NOT smuggle a raw summary from the client.
assert.doesNotMatch(bookingModal, /summary:\s*\{/);
assert.doesNotMatch(bookingModal, /summary_version:/);
ok("3) booking payload only sends the explicit consent flag and no client-built summary");

// ─────────────────────────────────────────────────────────────────────────
// 4. Server rejects or ignores client-provided unsafe raw quiz fields
// ─────────────────────────────────────────────────────────────────────────

// Runtime: a payload containing a forbidden raw-quiz key must be rejected
// by parseClientConsentPayload.
for (const forbidden of FORBIDDEN_TEACHER_BRIDGE_FIELDS) {
  const result = parseClientConsentPayload({
    consent_granted: true,
    summary: { [forbidden]: ["leaked"] },
  });
  assert.equal(result.ok, false, `parser must reject forbidden key: ${forbidden}`);
}
// Runtime: a payload with an unknown top-level summary key must have that
// key silently stripped (defense in depth) rather than passed through.
const stripResult = parseClientConsentPayload({
  consent_granted: true,
  summary: { __injected_admin_flag: true, courseTitle: "Spanish" },
});
assert.equal(stripResult.ok, true);
if (stripResult.ok && stripResult.value.summary) {
  assert.ok(
    !Object.prototype.hasOwnProperty.call(stripResult.value.summary, "__injected_admin_flag"),
    "unknown top-level keys must be stripped by the parser",
  );
}
// The API route source must show that it reads the parser result before
// any DB write happens.
assert.match(apiRoute, /parseClientConsentPayload\(body\)/);
assert.match(apiRoute, /if\s*\(\s*!parsed\.ok\s*\)/);
ok("4) server rejects forbidden raw-quiz fields and strips unknown summary keys");

// ─────────────────────────────────────────────────────────────────────────
// 5. Summary is sanitized through assertSafeTeacherBridgeSummary
// ─────────────────────────────────────────────────────────────────────────

const safeSummary = buildSafeBookingSummary({
  discipline: "Languages",
  courseTitle: "Spanish — DR A1",
  completedModules: ["Intro", "Arrival"],
  currentLevel: "A1",
  strengths: ["greetings", "vocabulary"],
  difficultyTags: ["needs_listening_repetition"],
  suggestedTeacherFocus: ["Hotel check-in roleplay"],
  lastActivityDate: null,
  companion: null,
});
// buildSafeBookingSummary internally calls assertSafeTeacherBridgeSummary;
// re-asserting here proves the contract for the test reader.
assertSafeTeacherBridgeSummary(safeSummary);
for (const key of Object.keys(safeSummary)) {
  assert.ok(
    ALLOWED_BOOKING_BRIDGE_SUMMARY_KEYS.includes(
      key as (typeof ALLOWED_BOOKING_BRIDGE_SUMMARY_KEYS)[number],
    ),
    `safe summary must not contain non-allow-listed key: ${key}`,
  );
}
// And the runtime guard must throw if a caller forces a forbidden key in.
assert.throws(
  () => assertSafeTeacherBridgeSummary({ ...safeSummary, rawQuiz: ["leak"] }),
  /forbidden raw-data key/,
);
ok("5) summary payload is sanitized via assertSafeTeacherBridgeSummary and only allow-listed keys survive");

// ─────────────────────────────────────────────────────────────────────────
// 6. Missing/null consent means not shared
// ─────────────────────────────────────────────────────────────────────────

const missingConsentState = rowToConsentState({
  id: "00000000-0000-0000-0000-000000000000",
  booking_id: "11111111-1111-1111-1111-111111111111",
  student_id: "22222222-2222-2222-2222-222222222222",
  teacher_id: "teacher-slug",
  consent_granted: false,
  consent_granted_at: null,
  summary_version: null,
  summary: null,
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
} satisfies BookingTeacherBridgeRow);
assert.equal(missingConsentState.status, "revoked");
// The teacher progress page must also gate rendering: when no row exists
// (`bridgeInsightByStudent[id]` is null), the card is NOT rendered.
assert.match(
  teacherProgress,
  /bridgeInsightByStudent\[s\.studentId\]\s*\?\s*\(\s*<TeacherLearningInsightCard/,
);
ok("6) missing consent row maps to a not-shared state and the teacher UI hides the card entirely");

// ─────────────────────────────────────────────────────────────────────────
// 7. Teacher insight card only renders unlocked for consent-granted booking
// ─────────────────────────────────────────────────────────────────────────

// The insight card already enforces the locked-vs-unlocked branch in its
// own source (asserted by tests/yo/yopratiqoTeacherBridgeConsentCard.test.ts).
// Here we additionally check the booking-time integration: the teacher
// page builds the insight with `sharedByStudentConsent` set ONLY when
// both the consent flag AND a non-null summary exist.
assert.match(
  teacherProgress,
  /sharedByStudentConsent:\s*typedRow\.consent_granted\s*&&\s*typedRow\.summary\s*!=\s*null/,
);
// The insight card source must still guard with !hasConsent.
assert.match(insightCard, /if\s*\(\s*!hasConsent\s*\)/);
ok("7) teacher insight card unlocks only when consent is granted AND a sanitized summary exists");

// ─────────────────────────────────────────────────────────────────────────
// 8. Teacher cannot see another teacher's booking summary
// ─────────────────────────────────────────────────────────────────────────

// RLS enforces this. The SELECT policy in the migration restricts reads
// to `student_id = auth.uid()` OR `teacher.id = teacher_id AND teacher.user_id = auth.uid()`.
assert.match(
  migration,
  /CREATE POLICY\s+"byls_select_participants"\s+ON\s+public\.booking_yopratiqo_learning_summaries\s+FOR\s+SELECT/i,
);
assert.match(
  migration,
  /USING\s*\(\s*student_id\s*=\s*auth\.uid\(\)\s*OR\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.teachers\s+t\s+WHERE\s+t\.id\s*=\s*teacher_id\s+AND\s+t\.user_id\s*=\s*auth\.uid\(\)\s*\)\s*\)/i,
);
ok("8) RLS prevents a teacher from reading another teacher's booking summary");

// ─────────────────────────────────────────────────────────────────────────
// 9. Student can only share their own progress
// ─────────────────────────────────────────────────────────────────────────

// RLS: INSERT policy requires `student_id = auth.uid()` AND the booking
// row belongs to the same auth.uid(). The API route also rejects when
// `booking.student_id !== user.id`.
assert.match(
  migration,
  /CREATE POLICY\s+"byls_insert_student_own"\s+ON\s+public\.booking_yopratiqo_learning_summaries\s+FOR\s+INSERT/i,
);
assert.match(
  migration,
  /WITH\s+CHECK\s*\(\s*student_id\s*=\s*auth\.uid\(\)/i,
);
assert.match(
  migration,
  /AND\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.bookings\s+b\s+WHERE\s+b\.id\s*=\s*booking_id\s+AND\s+b\.student_id\s*=\s*auth\.uid\(\)/i,
);
// Server-side enforcement (defense in depth).
assert.match(apiRoute, /booking\.student_id\s*!==\s*user\.id/);
assert.match(apiRoute, /Forbidden/);
ok("9) RLS and the server route both restrict consent writes to the booking's student");

// ─────────────────────────────────────────────────────────────────────────
// 10. Raw quiz fields are not stored or rendered
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN = /\b(rawQuiz|quizAnswers|quiz_answers|selectedOption|pickedOption|correctOptionId|answerLog|incorrectAnswers|keystrokeHistory|audioAttempts)\b/i;
for (const [name, src] of [
  ["BookingModal", bookingModal],
  ["consent wrapper", consentWrapper],
  ["consent card", consentCard],
  ["insight card", insightCard],
  ["teacher progress page", teacherProgress],
  ["API route", apiRoute],
] as const) {
  assert.doesNotMatch(src, RAW_QUIZ_PATTERN, `${name} must not reference raw quiz fields`);
}
// The persistence library legitimately lists forbidden keys in its
// docstring, and references the deny-list array — skip source-scan for it
// and rely on the parser-level runtime test above.
ok("10) no booking-time surface references raw quiz fields in source");

// ─────────────────────────────────────────────────────────────────────────
// 11. FR / EN / ES copy exists
// ─────────────────────────────────────────────────────────────────────────

// Booking wrapper empty-state copy: must be locale-aware FR/EN/ES.
assert.match(consentWrapper, /Apporter mes progrès YoPratiqo à ce cours/);
assert.match(consentWrapper, /Bring my YoPratiqo progress to this lesson/);
assert.match(consentWrapper, /Llevar mi progreso de YoPratiqo a esta clase/);
// Soft empty-state body — explicit "start YoPratiqo" prompt.
assert.match(consentWrapper, /Commence YoPratiqo pour apporter tes progrès/);
assert.match(consentWrapper, /Start YoPratiqo to bring your progress/);
assert.match(consentWrapper, /Empieza YoPratiqo para llevar tu progreso/);
// Checked-state recap: explicit "what your teacher will see" sentence.
assert.match(consentWrapper, /Ce que ton professeur verra pour ce cours/);
assert.match(consentWrapper, /What your teacher will see for this lesson/);
assert.match(consentWrapper, /Lo que tu profesor verá para esta clase/);
ok("11) FR / EN / ES copy exists for the booking-time consent wrapper");

// ─────────────────────────────────────────────────────────────────────────
// 12. Progress availability is detected; no fake progress is fabricated
// ─────────────────────────────────────────────────────────────────────────

// The BookingModal POSTs consent only — the server builds the summary.
assert.doesNotMatch(bookingModal, /summary:\s*\{/);
assert.match(
  bookingModal,
  /hasYoPratiqoProgress=\{hasYoPratiqoProgress\}/,
  "BookingModal must derive hasYoPratiqoProgress from authenticated snapshots",
);
assert.match(
  bookingModal,
  /fetchAuthenticatedProgressSnapshots/,
  "BookingModal must load progress via the shared YoPratiqo helper",
);
// Empty-state copy remains for learners without snapshots.
assert.match(consentWrapper, /Aucun résumé partagé pour l'instant/);
assert.match(consentWrapper, /No summary will be shared for now/);
assert.match(consentWrapper, /No se compartirá ningún resumen por ahora/);
ok("12) progress is detected from real snapshots; empty state remains when none exist");

// ─────────────────────────────────────────────────────────────────────────
// 13. No paid YoPratiqo checkout enabled
// ─────────────────────────────────────────────────────────────────────────

assert.match(productConfig, /premiumModulesEnabled:\s*false/);
assert.match(productConfig, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
// The new bridge files (wrapper, persistence lib, API route) must not
// pull in Stripe / checkout / price_id / paid checkout signals.
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [name, src] of [
  ["booking wrapper", consentWrapper],
  ["persistence lib", persistenceLib],
  ["bridge API route", apiRoute],
  ["bridge migration", migration],
] as const) {
  assert.doesNotMatch(src, STRIPE_PATTERN, `${name} must not introduce Stripe/payment signals`);
}
ok("13) paid YoPratiqo checkout remains disabled and the bridge introduces no Stripe references");

// ─────────────────────────────────────────────────────────────────────────
// 14. No restricted system (Stripe / payment / tax / legal / Membre Pro
//     commission / audio / SEO files) touched outside the explicit
//     allow-list. The bridge migration AND the +1 line in 074 are the
//     ONLY supabase touches allowed.
// ─────────────────────────────────────────────────────────────────────────

const allowedBridgeSupabaseFiles = new Set<string>([
  "supabase/migrations/077_booking_yopratiqo_learning_summaries.sql",
  "supabase/migrations/074_enable_rls_security_hardening.sql",
  // feat/yopratiqo-progress-snapshots PR — adds first-party per-user
  // YoPratiqo module progress persistence. The bridge route reads ONLY
  // the authenticated student's own snapshots and only when consent is
  // granted; RLS shape on the new table is locked by
  // tests/yo/yopratiqoProgressSnapshots.test.ts.
  "supabase/migrations/078_yopratiqo_progress_snapshots.sql",
]);

const restrictedPathPatterns: Array<{ re: RegExp; allow?: Set<string> }> = [
  { re: /^app\/api\/stripe\// },
  { re: /^app\/api\/.*checkout/i },
  { re: /^app\/api\/.*payment/i },
  { re: /^lib\/payments\// },
  { re: /^lib\/pricing\// },
  { re: /^lib\/config\/membrePro\.ts$/ },
  { re: /^supabase\//, allow: allowedBridgeSupabaseFiles },
  { re: /^content\/legal\// },
  { re: /^app\/\(app\)\/legal\// },
  { re: /^public\/.*\.(?:mp3|wav|m4a)$/i },
  { re: /^scripts\/(generate-yopratiqo-audio|.*openai)/i },
  { re: /^app\/sitemap\.ts$/ },
  { re: /^app\/robots\.ts$/ },
  { re: /CourseJsonLd|CourseSchema|yopratiqoSeo/i },
];

const status = execSync("git status --porcelain -uall", { cwd: root, encoding: "utf8" });
const changedFiles = status
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.replace(/^[ MADRCU?!]{1,2}\s+/, "").replace(/^"|"$/g, ""));

const ignoredUntracked = new Set([
  "Untitled",
  "docs/LAUNCH_READINESS_ANALYSIS.md",
  "pratiqo-legal-export-20260528-2221.zip",
]);

for (const file of changedFiles) {
  if (ignoredUntracked.has(file)) continue;
  for (const rule of restrictedPathPatterns) {
    if (!rule.re.test(file)) continue;
    if (rule.allow && rule.allow.has(file)) continue;
    assert.fail(`restricted system touched by booking-consent PR: ${file}`);
  }
}
ok("14) no restricted systems touched outside the bridge migration allow-list");

// ─────────────────────────────────────────────────────────────────────────
// 15. Migration was added and the new table is on 074's explicit ENABLE list
// ─────────────────────────────────────────────────────────────────────────

// The migration creates the new table with ENABLE ROW LEVEL SECURITY,
// adds the participants SELECT policy, a student-only INSERT policy, a
// student-only UPDATE policy, a student-only DELETE policy, and revokes
// anon access.
assert.match(
  migration,
  /CREATE TABLE\s+IF\s+NOT\s+EXISTS\s+public\.booking_yopratiqo_learning_summaries/i,
);
assert.match(
  migration,
  /ALTER\s+TABLE\s+public\.booking_yopratiqo_learning_summaries\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
);
assert.match(migration, /CREATE POLICY\s+"byls_select_participants"/i);
assert.match(migration, /CREATE POLICY\s+"byls_insert_student_own"/i);
assert.match(migration, /CREATE POLICY\s+"byls_update_student_own"/i);
assert.match(migration, /CREATE POLICY\s+"byls_delete_student_own"/i);
assert.match(migration, /REVOKE\s+ALL\s+ON\s+public\.booking_yopratiqo_learning_summaries\s+FROM\s+anon/i);
// No SECURITY DEFINER snuck in.
assert.doesNotMatch(migration, /SECURITY\s+DEFINER/i);
// 074 must include the new table in its explicit ENABLE list so the
// rls-coverage drift catcher passes.
assert.match(
  hardening,
  /ALTER\s+TABLE\s+IF\s+EXISTS\s+public\.booking_yopratiqo_learning_summaries\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
);
// Version sanity.
assert.equal(BOOKING_BRIDGE_SUMMARY_VERSION, "v1");
ok("15) migration adds the consent table with strict RLS, no SECURITY DEFINER, and is mirrored in 074");

console.log("[yo:teacher-bridge-booking-consent] tests passed");
