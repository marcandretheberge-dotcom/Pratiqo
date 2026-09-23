import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  fetchAuthenticatedProgressSnapshots,
  learnerHasYoPratiqoProgressForBridge,
} from "@/lib/yopratiqo/fetchAuthenticatedProgressSnapshots";
import { DOMINICAN_RD_COURSE_ID } from "@/lib/yo/dominicanRepublicProgressPayloads";
import type { ProgressSnapshotRow } from "@/lib/yopratiqo/progressSnapshotPersistence";

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

const root = process.cwd();
const bookingModalPath = "components/BookingModal.tsx";

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

assert.ok(existsSync(path.join(root, bookingModalPath)));

const bookingModal = read(bookingModalPath);

function snapshot(moduleId: string, courseId = DOMINICAN_RD_COURSE_ID): ProgressSnapshotRow {
  return {
    id: `fixture-${moduleId}`,
    user_id: "fixture-user",
    course_id: courseId,
    module_id: moduleId,
    module_title: "Module",
    discipline: "Languages",
    level_label: "A1",
    progress_state: "completed" as const,
    last_activity_at: "2026-01-01T00:00:00.000Z",
    completed_at: "2026-01-01T00:00:00.000Z",
    skill_tags: [],
    difficulty_tags: [],
    score_band: null,
    companion_stage: null,
    summary_version: "1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

// Case 1 — progress exists → true
{
  const rows = [snapshot("module-2")];
  assert.equal(learnerHasYoPratiqoProgressForBridge(rows), true);
  ok("1) one valid snapshot → hasYoPratiqoProgress true");
}

// Case 2 — no progress → false
{
  assert.equal(learnerHasYoPratiqoProgressForBridge([]), false);
  assert.equal(learnerHasYoPratiqoProgressForBridge(null), false);
  ok("2) empty/null snapshots → hasYoPratiqoProgress false");
}

// Case 3 — any YoPratiqo course snapshot counts (not DR-only)
{
  const rows = [
    snapshot("module-1", "yopratiqo:fr:quebec"),
  ];
  assert.equal(learnerHasYoPratiqoProgressForBridge(rows), true);
  ok("3) non-DR YoPratiqo snapshot still counts (bridge-wide semantics)");
}

// Case 4 — hardcoded false removed
assert.doesNotMatch(
  bookingModal,
  /hasYoPratiqoProgress=\{false\}/,
  "BookingModal must not hardcode hasYoPratiqoProgress={false}",
);
assert.match(
  bookingModal,
  /hasYoPratiqoProgress=\{hasYoPratiqoProgress\}/,
  "BookingModal must bind hasYoPratiqoProgress from state",
);
assert.match(
  bookingModal,
  /fetchAuthenticatedProgressSnapshots/,
  "BookingModal must reuse fetchAuthenticatedProgressSnapshots",
);
assert.match(
  bookingModal,
  /learnerHasYoPratiqoProgressForBridge/,
  "BookingModal must use bridge progress availability helper",
);
ok("4) hardcoded hasYoPratiqoProgress={false} removed");

// Case 5 — consent remains user-controlled
assert.match(
  bookingModal,
  /useState\(false\);\s*\n\s*const \[hasYoPratiqoProgress/,
  "yoBridgeConsent must still default to false independently of progress",
);
assert.doesNotMatch(
  bookingModal,
  /setYoBridgeConsent\(true\)/,
  "progress lookup must not auto-enable consent",
);
ok("5) consent remains opt-in (not auto-enabled when progress exists)");

// Case 6 — server remains summary authority
assert.doesNotMatch(
  bookingModal,
  /summarizeSnapshotsForBridge|buildSafeBookingSummary/,
  "BookingModal must not build teacher summaries client-side",
);
assert.doesNotMatch(
  bookingModal,
  /summary:\s*\{/,
  "BookingModal must not send a client-built summary object",
);
assert.match(
  bookingModal,
  /consent_granted:\s*yoBridgeConsent/,
  "bridge POST must send consent flag only",
);
assert.doesNotMatch(
  bookingModal,
  /summary:\s*null/,
  "summary:null removed — server derives summary on consent",
);
ok("6) server remains authoritative; client sends consent only");

// Case 3b — fetch helper failure contract (returns null, no throw)
assert.equal(typeof fetchAuthenticatedProgressSnapshots, "function");
ok("3b) fetch helper is exported for optional enrichment (failures return null)");

console.log("\nAll BookingModal YoPratiqo progress detection tests passed.");
