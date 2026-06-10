import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  ALLOWED_PROGRESS_SNAPSHOT_KEYS,
  PROGRESS_SNAPSHOT_VERSION,
  PROGRESS_STATES,
  buildSnapshotInsert,
  parseProgressSnapshotPayload,
  summarizeSnapshotsForBridge,
  type ProgressSnapshotRow,
} from "@/lib/yopratiqo/progressSnapshotPersistence";
import { FORBIDDEN_TEACHER_BRIDGE_FIELDS } from "@/lib/yopratiqo/teacherBridgeSummary";
import { ALLOWED_BOOKING_BRIDGE_SUMMARY_KEYS } from "@/lib/yopratiqo/teacherBridgeBookingPersistence";

/**
 * Per-user YoPratiqo progress snapshot tests.
 *
 * The 15 numbered assertions mirror PART H of the launch brief for
 * `feat/yopratiqo-progress-snapshots`.
 *
 * What this proves
 * ----------------
 *   • Migration 078 creates `yopratiqo_progress_snapshots` with strict
 *     owner-only RLS, no SECURITY DEFINER, anon revoked, and is mirrored
 *     in migration 074's explicit ENABLE list.
 *   • The progress table is forbidden from carrying raw quiz answers,
 *     attempt logs, keystroke history, or any free-form metadata blob.
 *   • The `/api/yo/progress` route always uses the authenticated user's
 *     id, silently strips a client-provided `user_id`, hard-rejects any
 *     forbidden raw-quiz key, and only upserts allow-listed fields.
 *   • Teachers do NOT read this table directly. The only consent-gated
 *     teacher surface remains `booking_yopratiqo_learning_summaries`.
 *   • The booking bridge route opportunistically derives a SAFE summary
 *     from the student's own snapshots after explicit consent. When the
 *     student has no snapshots, the summary stays null and no fake
 *     progress is fabricated.
 *   • No restricted system (Stripe / payments / tax / legal / Membre Pro
 *     commission / MP3 / OpenAI / sitemap / Course schema) is touched
 *     outside the explicit allow-list.
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

const migrationPath = "supabase/migrations/078_yopratiqo_progress_snapshots.sql";
const hardeningMigrationPath = "supabase/migrations/074_enable_rls_security_hardening.sql";
const persistenceLibPath = "lib/yopratiqo/progressSnapshotPersistence.ts";
const progressApiRoutePath = "app/api/yo/progress/route.ts";
const bridgeApiRoutePath = "app/api/bookings/[id]/yopratiqo-bridge/route.ts";
const teacherProgressPath = "app/(app)/teacher/progress/page.tsx";
const markCompletedButtonPath = "components/yo/YoMarkModuleCompletedButton.tsx";
const productConfigPath = "lib/yo/yopratiqoProductConfig.ts";

for (const file of [
  migrationPath,
  hardeningMigrationPath,
  persistenceLibPath,
  progressApiRoutePath,
  bridgeApiRoutePath,
  teacherProgressPath,
  markCompletedButtonPath,
  productConfigPath,
]) {
  assert.ok(existsSync(path.join(root, file)), `expected file is missing: ${file}`);
}

const migration = read(migrationPath);
const hardening = read(hardeningMigrationPath);
const persistenceLib = read(persistenceLibPath);
const progressApiRoute = read(progressApiRoutePath);
const bridgeApiRoute = read(bridgeApiRoutePath);
const teacherProgress = read(teacherProgressPath);
const markCompletedButton = read(markCompletedButtonPath);
const productConfig = read(productConfigPath);

// ─────────────────────────────────────────────────────────────────────────
// 1. Migration / table exists with the expected shape
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  migration,
  /CREATE TABLE\s+IF\s+NOT\s+EXISTS\s+public\.yopratiqo_progress_snapshots/i,
);
assert.match(migration, /user_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+auth\.users\(id\)/i);
assert.match(migration, /course_id\s+text\s+NOT\s+NULL/i);
assert.match(migration, /module_id\s+text\s+NOT\s+NULL/i);
assert.match(migration, /progress_state\s+text\s+NOT\s+NULL\s+DEFAULT\s+'started'/i);
assert.match(
  migration,
  /CHECK\s*\(\s*progress_state\s+IN\s*\(\s*'started',\s*'completed',\s*'reviewed'\s*\)\s*\)/i,
);
assert.match(
  migration,
  /UNIQUE\s*\(\s*user_id,\s*course_id,\s*module_id\s*\)/i,
);
// Hardening migration must list the new table in its explicit ENABLE list.
assert.match(
  hardening,
  /ALTER\s+TABLE\s+IF\s+EXISTS\s+public\.yopratiqo_progress_snapshots\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
);
ok("1) migration 078 creates yopratiqo_progress_snapshots and is mirrored in 074");

// ─────────────────────────────────────────────────────────────────────────
// 2. RLS enabled on the new table
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  migration,
  /ALTER\s+TABLE\s+public\.yopratiqo_progress_snapshots\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
);
ok("2) RLS is enabled on yopratiqo_progress_snapshots");

// ─────────────────────────────────────────────────────────────────────────
// 3. anon role has zero access
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  migration,
  /REVOKE\s+ALL\s+ON\s+public\.yopratiqo_progress_snapshots\s+FROM\s+anon/i,
);
// authenticated + service_role grants exist (policies handle row-scoping).
assert.match(
  migration,
  /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.yopratiqo_progress_snapshots\s+TO\s+authenticated/i,
);
assert.match(
  migration,
  /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.yopratiqo_progress_snapshots\s+TO\s+service_role/i,
);
ok("3) anon is revoked; authenticated + service_role are granted on the new table");

// ─────────────────────────────────────────────────────────────────────────
// 4. No SECURITY DEFINER function in the new migration
// ─────────────────────────────────────────────────────────────────────────

assert.doesNotMatch(migration, /SECURITY\s+DEFINER/i);
ok("4) no SECURITY DEFINER function exists in migration 078");

// ─────────────────────────────────────────────────────────────────────────
// 5. Progress table does not include raw quiz answer fields
// ─────────────────────────────────────────────────────────────────────────

const RAW_QUIZ_PATTERN = /\b(rawQuiz|raw_quiz|quizAnswers|quiz_answers|selectedOption|selected_option|pickedOption|picked_option|correctOptionId|correct_option_id|answerLog|answer_log|incorrectAnswers|incorrect_answers|keystrokeHistory|keystroke_history|audioAttempts|audio_attempts)\b/i;
assert.doesNotMatch(migration, RAW_QUIZ_PATTERN);
// And the table must not have a generic "metadata jsonb" / "raw_data" /
// "summary jsonb" column either — those are the smuggling vectors.
assert.doesNotMatch(migration, /\bmetadata\s+jsonb\b/i);
assert.doesNotMatch(migration, /\braw_data\b/i);
assert.doesNotMatch(migration, /\bsummary\s+jsonb\b/i);
ok("5) progress table has no raw-quiz columns and no free-form metadata column");

// ─────────────────────────────────────────────────────────────────────────
// 6. Users can only access their own progress
// ─────────────────────────────────────────────────────────────────────────

// SELECT / INSERT / UPDATE / DELETE policies must all be `user_id = auth.uid()`.
for (const policy of [
  "ypps_select_owner",
  "ypps_insert_owner",
  "ypps_update_owner",
  "ypps_delete_owner",
]) {
  assert.match(
    migration,
    new RegExp(`CREATE POLICY\\s+"${policy}"\\s+ON\\s+public\\.yopratiqo_progress_snapshots`, "i"),
    `policy ${policy} is missing`,
  );
}
// Each policy must restrict to `user_id = auth.uid()`. The UPDATE policy
// also needs WITH CHECK to block repointing the row to someone else.
assert.match(
  migration,
  /CREATE POLICY\s+"ypps_select_owner"[\s\S]*?USING\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s*\)/i,
);
assert.match(
  migration,
  /CREATE POLICY\s+"ypps_insert_owner"[\s\S]*?WITH\s+CHECK\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s*\)/i,
);
assert.match(
  migration,
  /CREATE POLICY\s+"ypps_update_owner"[\s\S]*?USING\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s*\)\s*WITH\s+CHECK\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s*\)/i,
);
assert.match(
  migration,
  /CREATE POLICY\s+"ypps_delete_owner"[\s\S]*?USING\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s*\)/i,
);
ok("6) every RLS policy on the new table restricts access to user_id = auth.uid()");

// ─────────────────────────────────────────────────────────────────────────
// 7. Teachers cannot directly read raw progress snapshots
// ─────────────────────────────────────────────────────────────────────────

// No policy grants any teacher path on the progress table. The migration
// also must not reference `public.teachers` at all (which would imply a
// teacher-aware SELECT/USING clause).
assert.doesNotMatch(migration, /public\.teachers/i);
// The teacher-facing progress page must not read this table directly —
// the only consent-gated teacher surface is booking_yopratiqo_learning_summaries.
assert.doesNotMatch(teacherProgress, /yopratiqo_progress_snapshots/i);
assert.match(
  teacherProgress,
  /booking_yopratiqo_learning_summaries/i,
);
// And the bridge migration / route stays the consent-gated surface.
ok("7) teachers cannot read yopratiqo_progress_snapshots directly");

// ─────────────────────────────────────────────────────────────────────────
// 8. Progress API ignores client-provided user_id
// ─────────────────────────────────────────────────────────────────────────

// The allow-list explicitly excludes `user_id`.
assert.ok(
  !(ALLOWED_PROGRESS_SNAPSHOT_KEYS as readonly string[]).includes("user_id"),
  "allow-list must not include user_id",
);
// The parser silently strips a client `user_id`, so the parsed payload
// type cannot leak it forward.
const stripped = parseProgressSnapshotPayload({
  user_id: "00000000-0000-0000-0000-000000000abc",
  course_id: "yopratiqo:es:dr",
  module_id: "module-5",
  module_title: "Module 5",
  discipline: "Languages",
});
assert.equal(stripped.ok, true);
if (stripped.ok) {
  assert.ok(
    !Object.prototype.hasOwnProperty.call(stripped.value, "user_id"),
    "parsed payload must not carry user_id forward",
  );
}
// The route source must build the insert with the AUTHENTICATED user id,
// not a body-derived id.
assert.match(
  progressApiRoute,
  /buildSnapshotInsert\(\s*parsed\.value\s*,\s*auth\.user\.id\s*\)/,
);
// And the route must use auth.getUser() (not trust the body).
assert.match(progressApiRoute, /supabase\.auth\.getUser\(\)|getUser\(\)/);
ok("8) progress API silently strips client user_id and forces the authenticated user id");

// ─────────────────────────────────────────────────────────────────────────
// 9. Progress API rejects forbidden raw quiz fields
// ─────────────────────────────────────────────────────────────────────────

for (const forbidden of FORBIDDEN_TEACHER_BRIDGE_FIELDS) {
  const result = parseProgressSnapshotPayload({
    course_id: "yopratiqo:es:dr",
    module_id: "module-5",
    module_title: "Module 5",
    discipline: "Languages",
    [forbidden]: ["leaked"],
  });
  assert.equal(
    result.ok,
    false,
    `parser must reject forbidden key on progress API: ${forbidden}`,
  );
}
ok("9) progress API parser rejects every forbidden raw-quiz key");

// ─────────────────────────────────────────────────────────────────────────
// 10. Progress API upserts safe module snapshot fields only
// ─────────────────────────────────────────────────────────────────────────

const parsed = parseProgressSnapshotPayload({
  course_id: "yopratiqo:es:dr",
  module_id: "module-5",
  module_title: "Module 5",
  discipline: "Languages",
  level_label: "A2",
  progress_state: "completed",
  skill_tags: ["vocabulary", "listening", "definitely-not-allowed"],
  difficulty_tags: ["needs_listening_repetition", "made-up"],
  score_band: "developing",
  companion_stage: "teacher-ready",
  __secret_admin_flag: true,
});
assert.equal(parsed.ok, true);
if (parsed.ok) {
  // Unknown top-level keys are stripped.
  assert.ok(
    !Object.prototype.hasOwnProperty.call(parsed.value, "__secret_admin_flag"),
    "unknown top-level keys must be stripped",
  );
  // Unknown tag values are filtered out by the enum guards.
  assert.deepEqual(parsed.value.skillTags, ["vocabulary", "listening"]);
  assert.deepEqual(parsed.value.difficultyTags, ["needs_listening_repetition"]);
  assert.equal(parsed.value.scoreBand, "developing");
  assert.equal(parsed.value.progressState, "completed");

  // buildSnapshotInsert must NEVER let an arbitrary user_id leak in: the
  // userId argument is the only authority.
  const insert = buildSnapshotInsert(parsed.value, "auth-user-uuid");
  assert.equal(insert.user_id, "auth-user-uuid");
  assert.equal(insert.summary_version, PROGRESS_SNAPSHOT_VERSION);
  // Lifecycle is one of the allow-listed states.
  assert.ok((PROGRESS_STATES as readonly string[]).includes(insert.progress_state));
  // Insert shape contains only allow-listed fields + the system columns
  // (user_id, completed_at, last_activity_at, summary_version).
  const insertKeys = new Set(Object.keys(insert));
  for (const k of insertKeys) {
    const expected = new Set<string>([
      "user_id",
      "course_id",
      "module_id",
      "module_title",
      "discipline",
      "level_label",
      "completed_at",
      "last_activity_at",
      "progress_state",
      "skill_tags",
      "difficulty_tags",
      "score_band",
      "companion_stage",
      "summary_version",
    ]);
    assert.ok(expected.has(k), `insert payload must not contain non-allow-listed key: ${k}`);
  }
}
ok("10) progress API upserts only allow-listed snapshot fields");

// ─────────────────────────────────────────────────────────────────────────
// 11. Booking bridge summary is generated from snapshots only after explicit consent
// ─────────────────────────────────────────────────────────────────────────

// Source-scan the bridge route: the snapshot read MUST be guarded by
// `parsed.value.consentGranted && summary == null`. Without the consent
// flag, no SELECT against yopratiqo_progress_snapshots can happen.
assert.match(
  bridgeApiRoute,
  /if\s*\(\s*parsed\.value\.consentGranted\s*&&\s*summary\s*==\s*null\s*\)\s*\{[\s\S]*?from\(\s*["']yopratiqo_progress_snapshots["']\s*\)/i,
);
// And the SELECT is scoped to the AUTHENTICATED user, never to a
// teacher / arbitrary id.
assert.match(
  bridgeApiRoute,
  /from\(\s*["']yopratiqo_progress_snapshots["']\s*\)[\s\S]*?\.eq\(\s*["']user_id["']\s*,\s*user\.id\s*\)/,
);
// Behavioural unit test of the projector: a populated snapshot list
// produces a safe BookingBridgeSummaryJson, and an empty list yields null.
const populatedSummary = summarizeSnapshotsForBridge(
  [
    {
      id: "00000000-0000-0000-0000-000000000001",
      user_id: "auth-user",
      course_id: "yopratiqo:es:dr",
      module_id: "module-1",
      module_title: "Intro",
      discipline: "Languages",
      level_label: "A1",
      completed_at: "2026-06-01T12:00:00.000Z",
      last_activity_at: "2026-06-01T12:00:00.000Z",
      progress_state: "completed",
      skill_tags: ["greetings", "vocabulary"],
      difficulty_tags: ["needs_pronunciation_support"],
      score_band: "developing",
      companion_stage: "teacher-ready",
      summary_version: PROGRESS_SNAPSHOT_VERSION,
      created_at: "2026-06-01T12:00:00.000Z",
      updated_at: "2026-06-01T12:00:00.000Z",
    },
  ] satisfies ProgressSnapshotRow[],
);
assert.ok(populatedSummary, "non-empty snapshot list must produce a summary");
if (populatedSummary) {
  for (const k of Object.keys(populatedSummary)) {
    assert.ok(
      (ALLOWED_BOOKING_BRIDGE_SUMMARY_KEYS as readonly string[]).includes(k),
      `bridge summary must not contain non-allow-listed key: ${k}`,
    );
  }
}
ok("11) booking bridge summary is built from snapshots only after explicit consent");

// ─────────────────────────────────────────────────────────────────────────
// 12. Booking bridge stores null summary when no progress exists
// ─────────────────────────────────────────────────────────────────────────

const emptySummary = summarizeSnapshotsForBridge([]);
assert.equal(emptySummary, null, "empty snapshot list must yield null summary");
// And the bridge route preserves null as the persisted value (the
// upsert payload uses `summary`, which stays null if neither client nor
// snapshot-projection produced one).
assert.match(bridgeApiRoute, /summary,\s*\n/);
assert.match(
  bridgeApiRoute,
  /let\s+summary:\s*BookingBridgeSummaryJson\s*\|\s*null\s*=\s*parsed\.value\.summary/,
);
ok("12) booking bridge stores null summary when the student has no progress yet");

// ─────────────────────────────────────────────────────────────────────────
// 13. Teacher insight card still reads only booking summary, not raw progress table
// ─────────────────────────────────────────────────────────────────────────

// teacher progress page must not import / query the raw progress table.
assert.doesNotMatch(teacherProgress, /yopratiqo_progress_snapshots/i);
// It must still query the booking-scoped summary table.
assert.match(teacherProgress, /booking_yopratiqo_learning_summaries/i);
// And the bridge route must NOT expose the raw snapshot back to the
// teacher in its response — the JSON payload returned on success
// contains only the summary-present boolean + the version, no raw rows.
const finalResponseMatch = bridgeApiRoute.match(
  /return\s+NextResponse\.json\(\{([^}]*)\}\);\s*\n\}\s*$/,
);
assert.ok(
  finalResponseMatch,
  "the bridge route must end with a NextResponse.json success payload",
);
const finalResponseBody = finalResponseMatch![1];
assert.doesNotMatch(
  finalResponseBody,
  /snapshotRows|snapshot_rows/,
  "the bridge success response must not leak any snapshot rows",
);
// And no raw snapshot row shape (anything with `progress_state`, the
// distinctive snapshot column) can be inlined into a response payload.
assert.doesNotMatch(finalResponseBody, /progress_state/);
ok("13) teacher insight card reads only the consent-gated booking summary, not the raw progress table");

// ─────────────────────────────────────────────────────────────────────────
// 14. No paid YoPratiqo checkout enabled
// ─────────────────────────────────────────────────────────────────────────

assert.match(productConfig, /premiumModulesEnabled:\s*false/);
assert.match(productConfig, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
const STRIPE_PATTERN = /\bstripe\b|\bprice_id\b|STRIPE_/i;
for (const [name, src] of [
  ["progress API route", progressApiRoute],
  ["persistence library", persistenceLib],
  ["progress migration", migration],
  ["mark-completed button", markCompletedButton],
] as const) {
  assert.doesNotMatch(src, STRIPE_PATTERN, `${name} must not introduce Stripe/payment signals`);
}
ok("14) paid YoPratiqo checkout remains disabled and the progress surface introduces no Stripe references");

// ─────────────────────────────────────────────────────────────────────────
// 15. No restricted system (Stripe / payments / tax / legal / Membre Pro
//     commission / MP3 / OpenAI / sitemap / Course schema) touched outside
//     the explicit allow-list. The TWO new supabase migration touches —
//     creating 078 and +1 line in 074 — are the ONLY supabase touches.
// ─────────────────────────────────────────────────────────────────────────

const allowedProgressSupabaseFiles = new Set<string>([
  "supabase/migrations/078_yopratiqo_progress_snapshots.sql",
  "supabase/migrations/074_enable_rls_security_hardening.sql",
]);

const restrictedPathPatterns: Array<{ re: RegExp; allow?: Set<string> }> = [
  { re: /^app\/api\/stripe\// },
  { re: /^app\/api\/.*checkout/i },
  { re: /^app\/api\/.*payment/i },
  { re: /^lib\/payments\// },
  { re: /^lib\/pricing\// },
  { re: /^lib\/config\/membrePro\.ts$/ },
  { re: /^supabase\//, allow: allowedProgressSupabaseFiles },
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
    assert.fail(`restricted system touched by progress-snapshots PR: ${file}`);
  }
}
ok("15) no restricted systems touched outside the progress-migration allow-list");

console.log("[yo:progress-snapshots] tests passed");
