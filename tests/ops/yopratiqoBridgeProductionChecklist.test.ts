/**
 * tests/ops/yopratiqoBridgeProductionChecklist.test.ts
 *
 * Defends the YoPratiqo bridge production deploy checklist
 * (`docs/YOPRATIQO_BRIDGE_PRODUCTION_DEPLOY_CHECKLIST.md`). The
 * checklist is a human-run runbook; this file makes sure a future
 * doc edit cannot silently drop a required section.
 *
 * Assertions
 * ----------
 *   1.  Checklist exists at the expected path.
 *   2.  Checklist names both required migrations (077 + 078) with
 *       their exact filenames.
 *   3.  Checklist includes a "tables exist" verification query.
 *   4.  Checklist includes an RLS-enabled verification query.
 *   5.  Checklist includes an anon-revoked verification query.
 *   6.  Checklist includes a Vercel deploy verification section.
 *   7.  Checklist includes the manual student-flow QA.
 *   8.  Checklist includes the manual booking consent QA.
 *   9.  Checklist includes the manual teacher insight QA.
 *  10.  Checklist includes the mobile checks.
 *  11.  Checklist includes the privacy checks.
 *  12.  Checklist includes rollback notes.
 *  13.  Checklist includes a sign-off table.
 *  14.  No restricted system (Stripe / payments / tax / legal / RLS
 *       migrations / Membre Pro / audio / SEO) touched by this PR.
 *  15.  Paid YoPratiqo checkout remains disabled in product config
 *       (defense against an accidental flip in this deploy window).
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

const CHECKLIST_PATH = "docs/YOPRATIQO_BRIDGE_PRODUCTION_DEPLOY_CHECKLIST.md";
const PRODUCT_CONFIG_PATH = "lib/yo/yopratiqoProductConfig.ts";
const MIGRATION_077_PATH =
  "supabase/migrations/077_booking_yopratiqo_learning_summaries.sql";
const MIGRATION_078_PATH = "supabase/migrations/078_yopratiqo_progress_snapshots.sql";

// ─────────────────────────────────────────────────────────────────────────
// 1. Checklist exists
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, CHECKLIST_PATH)),
  `production checklist must exist at ${CHECKLIST_PATH}`,
);
const doc = read(CHECKLIST_PATH);
ok("1) production deploy checklist exists at docs/YOPRATIQO_BRIDGE_PRODUCTION_DEPLOY_CHECKLIST.md");

// ─────────────────────────────────────────────────────────────────────────
// 2. Mentions migrations 077 and 078 by their exact filenames
// ─────────────────────────────────────────────────────────────────────────

assert.ok(
  existsSync(path.join(root, MIGRATION_077_PATH)),
  "migration 077 must still exist at the path the checklist references",
);
assert.ok(
  existsSync(path.join(root, MIGRATION_078_PATH)),
  "migration 078 must still exist at the path the checklist references",
);

assert.ok(
  doc.includes("077_booking_yopratiqo_learning_summaries.sql"),
  "checklist must name migration 077 by its exact filename",
);
assert.ok(
  doc.includes("078_yopratiqo_progress_snapshots.sql"),
  "checklist must name migration 078 by its exact filename",
);
assert.ok(
  doc.includes("public.booking_yopratiqo_learning_summaries"),
  "checklist must name the bridge consent table",
);
assert.ok(
  doc.includes("public.yopratiqo_progress_snapshots"),
  "checklist must name the snapshot table",
);
ok("2) checklist names both required migrations (077 + 078) with their exact filenames");

// ─────────────────────────────────────────────────────────────────────────
// 3. "Tables exist" verification query
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /information_schema\.tables[\s\S]*?booking_yopratiqo_learning_summaries[\s\S]*?yopratiqo_progress_snapshots/,
  "checklist must include an information_schema.tables existence query",
);
ok("3) checklist includes a 'tables exist' verification query");

// ─────────────────────────────────────────────────────────────────────────
// 4. RLS-enabled verification query
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /relrowsecurity/,
  "checklist must include an RLS verification query (pg_class.relrowsecurity)",
);
assert.match(
  doc,
  /rls_enabled\s*=\s*true/i,
  "checklist must state the expected RLS-enabled outcome",
);
ok("4) checklist includes RLS verification");

// ─────────────────────────────────────────────────────────────────────────
// 5. Anon-revoked verification query
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /information_schema\.role_table_grants/,
  "checklist must include a role_table_grants query",
);
assert.match(
  doc,
  /\bNo\s+`?anon`?\s+rows\b/i,
  "checklist must state the expected anon-revoked outcome",
);
assert.match(
  doc,
  /curl[\s\S]*?yopratiqo_progress_snapshots[\s\S]*?apikey:\s*\$NEXT_PUBLIC_SUPABASE_ANON_KEY/,
  "checklist must include a live anon-rejection curl smoke",
);
ok("5) checklist includes anon-revoked verification (SQL + live curl smoke)");

// ─────────────────────────────────────────────────────────────────────────
// 6. Vercel deploy verification
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /##\s*2\.\s*Vercel deploy verification/i,
  "checklist must include a Vercel deploy verification section",
);
assert.match(
  doc,
  /vercel\s+promote|Promote to production/i,
  "checklist must instruct how to promote the production build",
);
assert.match(
  doc,
  /SUPABASE_SERVICE_ROLE_KEY/,
  "checklist must list the service-role env var as a precondition (server-only)",
);
ok("6) checklist includes a Vercel deploy verification section");

// ─────────────────────────────────────────────────────────────────────────
// 7. Student flow QA
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /##\s*3\.\s*Manual QA\s*[—-]\s*Student progress flow/i,
  "checklist must include a manual student-flow QA section",
);
assert.match(
  doc,
  /republique-dominicaine\/module-2/,
  "checklist must walk through Module 2",
);
assert.match(
  doc,
  /POST \/api\/yo\/progress/,
  "checklist must verify the progress POST",
);
ok("7) checklist includes the manual student-flow QA");

// ─────────────────────────────────────────────────────────────────────────
// 8. Booking consent flow QA
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /##\s*4\.\s*Manual QA\s*[—-]\s*Booking consent flow/i,
  "checklist must include a manual booking-consent QA section",
);
assert.match(
  doc,
  /unchecked\s+by\s+default/i,
  "checklist must assert the consent checkbox is unchecked by default",
);
assert.match(
  doc,
  /POST \/api\/bookings\/<bookingId>\/yopratiqo-bridge/,
  "checklist must show the bridge POST endpoint",
);
ok("8) checklist includes the manual booking consent QA");

// ─────────────────────────────────────────────────────────────────────────
// 9. Teacher insight flow QA
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /##\s*5\.\s*Manual QA\s*[—-]\s*Teacher insight flow/i,
  "checklist must include a manual teacher-flow QA section",
);
assert.match(
  doc,
  /TeacherLearningInsightCard/,
  "checklist must name the teacher insight card",
);
assert.match(
  doc,
  /booking_yopratiqo_learning_summaries[\s\S]*?NEVER[\s\S]*?yopratiqo_progress_snapshots/i,
  "checklist must assert teacher reads the consent table, never the snapshot table",
);
ok("9) checklist includes the manual teacher insight QA");

// ─────────────────────────────────────────────────────────────────────────
// 10. Mobile checks
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /##\s*6\.\s*Mobile QA/i,
  "checklist must include a mobile QA section",
);
assert.match(doc, /≤\s*414\s*px/);
assert.match(
  doc,
  /No broken companion images/i,
  "checklist must include a broken-image guard",
);
ok("10) checklist includes mobile checks");

// ─────────────────────────────────────────────────────────────────────────
// 11. Privacy checks
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /##\s*7\.\s*Privacy checks/i,
  "checklist must include a privacy checks section",
);
for (const term of [
  "rawQuiz",
  "quiz_answers",
  "selectedOption",
  "correctOptionId",
  "answerLog",
  "keystrokeHistory",
]) {
  assert.ok(
    doc.includes(term),
    `checklist must explicitly mention ${term} as a forbidden field`,
  );
}
ok("11) checklist includes privacy checks with explicit raw-quiz field denylist");

// ─────────────────────────────────────────────────────────────────────────
// 12. Rollback notes
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /##\s*8\.\s*Rollback notes/i,
  "checklist must include a rollback notes section",
);
assert.match(
  doc,
  /vercel rollback/i,
  "checklist must include the Vercel rollback command",
);
assert.match(
  doc,
  /Application rollback/i,
  "checklist must distinguish application-level rollback",
);
assert.match(
  doc,
  /Migration rollback/i,
  "checklist must distinguish migration-level rollback",
);
assert.match(
  doc,
  /Data-loss notice|permanently deletes/i,
  "checklist must warn that a migration rollback is destructive",
);
ok("12) checklist includes rollback notes (application + migration + data-loss warning)");

// ─────────────────────────────────────────────────────────────────────────
// 13. Sign-off table
// ─────────────────────────────────────────────────────────────────────────

assert.match(
  doc,
  /##\s*10\.\s*Sign-off/i,
  "checklist must include a sign-off section",
);
for (const reviewer of [
  "Release engineer",
  "QA",
  "Product",
  "On-call engineering",
]) {
  assert.ok(
    doc.includes(reviewer),
    `sign-off table must include the "${reviewer}" reviewer row`,
  );
}
ok("13) checklist includes a sign-off table with all reviewer rows");

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
      assert.fail(
        `restricted system touched by ops deploy-checklist PR: ${file}`,
      );
    }
  }
}
ok("14) no restricted system touched by this PR");

// ─────────────────────────────────────────────────────────────────────────
// 15. Paid YoPratiqo checkout still disabled
// ─────────────────────────────────────────────────────────────────────────

const productConfigSrc = read(PRODUCT_CONFIG_PATH);
assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
ok("15) paid YoPratiqo checkout remains disabled");

console.log(`\n${pass} bridge production checklist assertions passed`);
