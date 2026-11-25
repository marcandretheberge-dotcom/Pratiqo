import assert from "node:assert/strict";

import {
  emptyCourseProgress,
  getDueActivityIds,
  recordCourseActivity,
  type CourseProgress,
} from "@/lib/yo/italian/course/courseProgress";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import {
  dueItems,
  isValidSrsRecord,
  nextReviewAt,
  parseRecords,
  recordAttempt,
  type SrsActivityRecord,
} from "@/lib/yo/srs/engine";
import { REVIEW_INTERVAL_DAYS } from "@/lib/yo/srs/intervals";
import {
  italianCatalogAdapter,
  italianLanguageConfig,
} from "@/lib/yo/srs/adapters/italian";

/**
 * Shared SRS engine tests (spec §2.6).
 *
 * The headline test is acceptance criterion #1 — ITALIAN PARITY: identical
 * inputs replayed through the shared engine and through the current
 * Italian localStorage engine must produce identical records (streak,
 * nextReviewAt, attempts, flags) at every step.
 */

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

const t = { fr: "Exemple", en: "Example", es: "Ejemplo" };
const catalog: CourseCatalog = {
  units: [
    { id: "u1", number: 1, title: t, subtitle: t, objectives: [t], lessons: [{ id: "l1", title: t, activityIds: ["a1", "a2"] }, { id: "l2", title: t, activityIds: ["a3"] }], activityIds: ["a1", "a2", "a3"], quizId: "q1", productionId: "p1", phraseCount: 10 },
    { id: "u2", number: 2, title: t, subtitle: t, objectives: [t], lessons: [{ id: "l3", title: t, activityIds: ["a4"] }], activityIds: ["a4"], quizId: "q2", productionId: "p2", phraseCount: 8 },
  ],
  assessments: [{ id: "q1", title: t, unitIds: ["u1"], questionCount: 5, passPercent: 80 }],
};

const DAY = 86400000;
const NOW = 1_800_000_000_000;

// ─────────────────────────────────────────────────────────────────────────
// 1. Italian parity — replay identical sequences through both engines
// ─────────────────────────────────────────────────────────────────────────

type Step = { id: string; correct: boolean; assisted: boolean };
const sequences: Step[][] = [
  // Independent streak climbing to the cap, then a failure.
  [
    { id: "a1", correct: true, assisted: false },
    { id: "a1", correct: true, assisted: false },
    { id: "a1", correct: true, assisted: false },
    { id: "a1", correct: true, assisted: false },
    { id: "a1", correct: true, assisted: false },
    { id: "a1", correct: false, assisted: false },
  ],
  // Assisted correct answers never build a streak.
  [
    { id: "a2", correct: true, assisted: true },
    { id: "a2", correct: true, assisted: true },
    { id: "a2", correct: true, assisted: false },
  ],
  // Mixed items interleaved.
  [
    { id: "a3", correct: false, assisted: false },
    { id: "a4", correct: true, assisted: false },
    { id: "a3", correct: true, assisted: false },
    { id: "a4", correct: false, assisted: true },
    { id: "a4", correct: true, assisted: true },
  ],
];

for (const [index, steps] of sequences.entries()) {
  let progress: CourseProgress = emptyCourseProgress();
  const shared: Record<string, SrsActivityRecord> = {};
  steps.forEach((step, stepIndex) => {
    const at = NOW + stepIndex * 1000;
    progress = recordCourseActivity(progress, catalog, step.id, step.correct, step.assisted, at);
    shared[step.id] = recordAttempt(shared[step.id] ?? null, step.correct, step.assisted, at);
    assert.deepEqual(
      shared[step.id],
      progress.activities[step.id],
      `sequence ${index} step ${stepIndex} diverged`,
    );
  });
}
ok("italian parity: shared engine records are identical to the Italian engine at every step");

// Due queues agree too, at several points in time.
{
  let progress: CourseProgress = emptyCourseProgress();
  const shared: Record<string, SrsActivityRecord> = {};
  const ids = ["a1", "a2", "a3", "a4"];
  const steps: Step[] = [
    { id: "a1", correct: true, assisted: false },
    { id: "a2", correct: true, assisted: true },
    { id: "a3", correct: false, assisted: false },
    { id: "a4", correct: true, assisted: false },
  ];
  steps.forEach((step, i) => {
    const at = NOW + i * 1000;
    progress = recordCourseActivity(progress, catalog, step.id, step.correct, step.assisted, at);
    shared[step.id] = recordAttempt(shared[step.id] ?? null, step.correct, step.assisted, at);
  });
  for (const at of [NOW, NOW + DAY, NOW + 3 * DAY, NOW + 14 * DAY, NOW + 30 * DAY]) {
    assert.deepEqual(dueItems(shared, ids, at), getDueActivityIds(progress, catalog, at));
  }
}
ok("italian parity: due queues are identical (order: nextReviewAt, then item id)");

// ─────────────────────────────────────────────────────────────────────────
// 2. Acceptance criterion 4 — streak rules
// ─────────────────────────────────────────────────────────────────────────

{
  let record = recordAttempt(null, true, true, NOW);
  assert.equal(record.streak, 0);
  assert.equal(record.nextReviewAt, NOW + DAY, "assisted correct is due tomorrow");
  record = recordAttempt(record, true, false, NOW + DAY);
  assert.equal(record.streak, 1);
  assert.equal(record.nextReviewAt, NOW + DAY + 1 * DAY);
  record = recordAttempt(record, true, false, NOW + 2 * DAY);
  record = recordAttempt(record, true, false, NOW + 3 * DAY);
  record = recordAttempt(record, true, false, NOW + 4 * DAY);
  assert.equal(record.streak, 4, "streak caps at 4");
  assert.equal(record.nextReviewAt, NOW + 4 * DAY + 14 * DAY);
  record = recordAttempt(record, false, false, NOW + 5 * DAY);
  assert.equal(record.streak, 0);
  assert.equal(record.nextReviewAt, NOW + 5 * DAY, "incorrect is due immediately");
  assert.equal(nextReviewAt(0, NOW, false), NOW);
  assert.equal(nextReviewAt(0, NOW, true), NOW + DAY);
  assert.deepEqual([...REVIEW_INTERVAL_DAYS], [1, 3, 7, 14]);
}
ok("streak rules: assisted never increments, independent caps at 4, failure resets to due-now");

// ─────────────────────────────────────────────────────────────────────────
// 3. parseRecords — the Italian parser invariants, shared form
// ─────────────────────────────────────────────────────────────────────────

{
  const ids = new Set(["a1", "a2"]);
  const valid: SrsActivityRecord = {
    attempts: 2, completed: true, independent: true,
    lastAt: NOW, nextReviewAt: NOW + 3 * DAY, streak: 2,
  };
  const parsed = parseRecords(
    {
      a1: valid,
      a2: { ...valid, streak: 5 },
      unknown: valid,
      constructor: valid,
    },
    ids,
  );
  assert.deepEqual(Object.keys(parsed), ["a1"]);
  assert.deepEqual(parsed.a1, valid);

  const invalidVariants: unknown[] = [
    { ...valid, streak: 3, attempts: 2 }, // streak > attempts
    { ...valid, nextReviewAt: NOW + 2 * DAY }, // inconsistent with interval rule
    { ...valid, independent: true, completed: false }, // independent ⇒ completed
    { ...valid, streak: 1, independent: false }, // streak > 0 ⇒ independent
    { ...valid, attempts: 0 },
    { ...valid, nextReviewAt: NOW + 15 * DAY, streak: 4 }, // beyond the 14d window
    "not a record",
    null,
  ];
  for (const variant of invalidVariants) {
    assert.equal(isValidSrsRecord(variant), false);
    assert.deepEqual(parseRecords({ a1: variant }, ids), {});
  }
  assert.deepEqual(parseRecords(null, ids), {});
  assert.deepEqual(parseRecords([], ids), {});
}
ok("parseRecords: valid records survive verbatim, every invariant violation is dropped");

// ─────────────────────────────────────────────────────────────────────────
// 4. Italian adapter + config
// ─────────────────────────────────────────────────────────────────────────

{
  const items = italianCatalogAdapter(catalog);
  assert.deepEqual(items.map((item) => item.id), ["a1", "a2", "a3", "a4"]);
  assert.equal(items[0].language, "it");
  assert.equal(items[0].unitId, "u1");
  assert.equal(items[0].lessonId, "l1");
  assert.deepEqual(italianCatalogAdapter(null), []);
  assert.deepEqual(italianCatalogAdapter({}), []);
  assert.equal(italianLanguageConfig.language, "it");
  assert.deepEqual([...italianLanguageConfig.reviewIntervalsDays], [1, 3, 7, 14]);
  assert.equal(italianLanguageConfig.speechEnabled, false);
}
ok("italian adapter: catalog is the authority; config carries the shared [1,3,7,14] default");

console.log("yopratiqoSrsEngine: all tests passed");
