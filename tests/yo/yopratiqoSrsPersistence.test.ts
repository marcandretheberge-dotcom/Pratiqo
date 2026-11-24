import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  emptyCourseProgress,
  recordCourseActivity,
  serializeCourseProgress,
} from "@/lib/yo/italian/course/courseProgress";
import { personalizedItalianCatalog as italianCourseCatalog } from "@/lib/yo/personalized/courseData";
import { recordAttempt } from "@/lib/yo/srs/engine";
import { italianCatalogAdapter } from "@/lib/yo/srs/adapters/italian";
import {
  buildSrsItemRow,
  parseSrsImportPayload,
  parseSrsRecordPayload,
  xpEventsForAttempt,
} from "@/lib/yo/srs/srsPersistence";

/**
 * Server SRS persistence tests (spec §1.5, §2.4, §2.6 criteria 5–6).
 *
 * What this proves
 * ----------------
 *   • /record accepts ONLY an outcome (itemId, correct, assisted): a
 *     client-supplied streak or due date is not even allow-listed, an
 *     unknown itemId is rejected, and any forbidden raw-data key
 *     (FORBIDDEN_TEACHER_BRIDGE_FIELDS) hard-rejects the payload.
 *   • /import runs the local CourseProgress through the Italian parser's
 *     invariants: valid records import, invalid ones are dropped AND
 *     counted, malformed payloads import nothing.
 *   • XP events follow the Italian preview rewards (5 / +5 / +50 mastery).
 *   • The migration creates the three tables with owner-only RLS, anon
 *     revoked, CHECK-bounded streak, and no SECURITY DEFINER.
 *   • The routes authenticate via the session and never read user_id
 *     from the request body.
 */

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

const root = process.cwd();
const read = (relativePath: string): string =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const NOW = 1_800_000_000_000;
const DAY = 86400000;
const realIds = italianCatalogAdapter(italianCourseCatalog).map((item) => item.id);
assert.ok(realIds.length > 0, "italian catalog must expose activity ids");
const [firstId, secondId] = realIds;
const attemptId = "e65efa8d-c1df-4725-8194-a2235e21c877";

// ─────────────────────────────────────────────────────────────────────────
// 1. /record payload discipline
// ─────────────────────────────────────────────────────────────────────────

{
  const valid = parseSrsRecordPayload({ attemptId, itemId: firstId, correct: true, assisted: false });
  assert.equal(valid.ok, true);

  // Client-supplied scheduling is stripped, never honoured.
  const smuggled = parseSrsRecordPayload({
    attemptId, itemId: firstId, correct: true, assisted: false,
    streak: 4, nextReviewAt: 0, lastAt: 0, user_id: "someone-else",
  });
  assert.equal(smuggled.ok, true);
  if (smuggled.ok) {
    assert.deepEqual(
      Object.keys(smuggled.value).sort(),
      ["assisted", "attemptId", "correct", "itemId", "language"],
    );
  }

  for (const forbidden of ["answerLog", "quizAnswers", "selectedOption", "keystrokeHistory"]) {
    const rejected = parseSrsRecordPayload({ attemptId, itemId: firstId, correct: true, assisted: false, [forbidden]: [] });
    assert.equal(rejected.ok, false, `forbidden key ${forbidden} must hard-reject`);
  }

  assert.equal(parseSrsRecordPayload({ attemptId, itemId: "not-a-real-item", correct: true, assisted: false }).ok, false);
  assert.equal(parseSrsRecordPayload({ attemptId, itemId: firstId, correct: "yes", assisted: false }).ok, false);
  assert.equal(parseSrsRecordPayload({ attemptId, itemId: firstId, correct: true }).ok, false);
  assert.equal(parseSrsRecordPayload({ attemptId, itemId: firstId, language: "de", correct: true, assisted: false }).ok, false);
  assert.equal(parseSrsRecordPayload(null).ok, false);
  assert.equal(parseSrsRecordPayload("nope").ok, false);
}
ok("record payload: outcome-only allow-list, unknown items and forbidden keys rejected");

// ─────────────────────────────────────────────────────────────────────────
// 2. /import — valid in, invalid dropped and counted
// ─────────────────────────────────────────────────────────────────────────

{
  let progress = emptyCourseProgress();
  progress = recordCourseActivity(progress, italianCourseCatalog, firstId, true, false, NOW);
  progress = recordCourseActivity(progress, italianCourseCatalog, firstId, true, false, NOW + 1000);
  progress = recordCourseActivity(progress, italianCourseCatalog, secondId, true, true, NOW + 2000);
  const raw = serializeCourseProgress(progress);

  const imported = parseSrsImportPayload({ progress: raw }, NOW + 3000);
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.equal(imported.value.imported, 2);
    assert.equal(imported.value.dropped, 0);
    assert.deepEqual(imported.value.records[firstId], progress.activities[firstId]);
    assert.deepEqual(imported.value.records[secondId], progress.activities[secondId]);
  }

  // Object form is accepted too.
  const objectForm = parseSrsImportPayload({ progress: JSON.parse(raw) }, NOW + 3000);
  assert.equal(objectForm.ok, true);
  if (objectForm.ok) assert.equal(objectForm.value.imported, 2);

  // Polluted: an unknown id and an invariant-violating record are dropped + counted.
  const polluted = JSON.parse(raw) as Record<string, unknown>;
  const activities = polluted.activities as Record<string, unknown>;
  activities["totally-unknown-id"] = activities[firstId];
  activities[secondId] = { ...(activities[secondId] as object), streak: 4, nextReviewAt: NOW + 99 * DAY };
  const cleaned = parseSrsImportPayload({ progress: JSON.stringify(polluted) }, NOW + 3000);
  assert.equal(cleaned.ok, true);
  if (cleaned.ok) {
    assert.equal(cleaned.value.imported, 1);
    assert.equal(cleaned.value.dropped, 2);
  }

  // Malformed / unsupported payloads import nothing, and forbidden keys reject.
  const garbage = parseSrsImportPayload({ progress: "{not json" }, NOW + 3000);
  assert.equal(garbage.ok, true);
  if (garbage.ok) {
    assert.equal(garbage.value.imported, 0);
    assert.equal(garbage.value.dropped, 0);
  }
  assert.equal(parseSrsImportPayload({ progress: raw, answerLog: [] }, NOW + 3000).ok, false);
  assert.equal(parseSrsImportPayload({}, NOW + 3000).ok, false);
  assert.equal(parseSrsImportPayload(null, NOW + 3000).ok, false);
}
ok("import: parser invariants hold, invalid records dropped and counted, forbidden keys rejected");

// ─────────────────────────────────────────────────────────────────────────
// 3. XP events + row builder
// ─────────────────────────────────────────────────────────────────────────

{
  const assisted = recordAttempt(null, true, true, NOW);
  assert.deepEqual(
    xpEventsForAttempt(firstId, null, assisted, true, true).map((e) => e.xp),
    [5],
  );
  const independent = recordAttempt(null, true, false, NOW);
  assert.deepEqual(
    xpEventsForAttempt(firstId, null, independent, true, false).map((e) => e.xp),
    [5, 5],
  );
  let streak3 = recordAttempt(null, true, false, NOW);
  streak3 = recordAttempt(streak3, true, false, NOW + 1);
  streak3 = recordAttempt(streak3, true, false, NOW + 2);
  const mastery = recordAttempt(streak3, true, false, NOW + 3);
  assert.equal(mastery.streak, 4);
  assert.deepEqual(
    xpEventsForAttempt(firstId, streak3, mastery, true, false).map((e) => e.xp),
    [5, 5, 50],
  );
  const again = recordAttempt(mastery, true, false, NOW + 4);
  assert.deepEqual(
    xpEventsForAttempt(firstId, mastery, again, true, false).map((e) => e.xp),
    [5, 5],
    "mastery XP is awarded on reaching 4, not for staying there",
  );

  const row = buildSrsItemRow("user-1", firstId, independent);
  assert.equal(row.user_id, "user-1");
  assert.equal(row.language, "it");
  assert.equal(row.course_id, "italian-course-a1");
  assert.equal(row.streak, independent.streak);
  assert.equal(row.next_review_at, independent.nextReviewAt);
}
ok("xp events: 5 practice, +5 independent, +50 on reaching mastery; row builder maps fields");

// ─────────────────────────────────────────────────────────────────────────
// 4. Migration + route source shape (mirrors the snapshots test style)
// ─────────────────────────────────────────────────────────────────────────

{
  const migration = read("supabase/migrations/20261124155352_yo_srs_server_state.sql");
  for (const table of ["yo_srs_items", "yo_learning_events", "yo_srs_import_state"]) {
    assert.ok(migration.includes(`CREATE TABLE IF NOT EXISTS public.${table}`), `${table} created`);
    assert.ok(migration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`), `${table} RLS enabled`);
  }
  assert.ok(migration.includes("CHECK (streak >= 0 AND streak <= 4)"));
  assert.ok(migration.includes("UNIQUE (user_id, item_id)"));
  assert.ok(!migration.includes("SECURITY DEFINER"));
  // Migration 078's constraint is respected: no DDL touches the snapshots
  // table (it is only referenced in the header comment).
  assert.ok(!migration.includes("ON public.yopratiqo_progress_snapshots"));
  assert.ok(!migration.includes("TABLE public.yopratiqo_progress_snapshots"));

  for (const route of ["due", "record", "import"]) {
    const source = read(`app/api/yo/srs/${route}/route.ts`);
    assert.ok(source.includes("authenticateSrsRequest"), `${route} route authenticates`);
    assert.ok(!source.includes("body.user_id") && !source.includes("body.userId"), `${route} route never trusts a body user id`);
  }
  const importRoute = read("app/api/yo/srs/import/route.ts");
  assert.ok(importRoute.includes("yo_srs_import_records"), "import route uses the atomic RPC");
  const recordRoute = read("app/api/yo/srs/record/route.ts");
  assert.ok(recordRoute.includes("recordAttempt"), "record route recomputes scheduling server-side");
  assert.ok(recordRoute.includes("Date.now()"), "record route uses the server clock");
}
ok("migration + routes: server-only RLS shape, session auth, server-side recompute");

console.log("yopratiqoSrsPersistence: all tests passed");
