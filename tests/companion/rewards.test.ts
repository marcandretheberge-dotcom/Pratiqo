import assert from "node:assert/strict";
import {
  COMPLETED_LESSON_FOR_COMPANION_FILTER,
  getCompanionMilestoneForCompletedLesson,
  isCompletedLessonForCompanion,
} from "@/lib/companion/rewards";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("only completed lessons count toward companion rewards", () => {
  for (const status of [
    "pending_payment",
    "pending_teacher",
    "pending",
    "confirmed",
    "cancelled",
    "refunded",
    "disputed",
  ]) {
    assert.equal(isCompletedLessonForCompanion({ status, completed_at: null }), false, status);
  }

  assert.equal(isCompletedLessonForCompanion({ status: "completed", completed_at: null }), true);
  assert.equal(isCompletedLessonForCompanion({ status: "confirmed", completed_at: "2026-06-04T15:00:00Z" }), true);
});

test("two completed lessons and many pending bookings do not trigger six-lesson reward", () => {
  const completed = [
    { status: "completed", completed_at: "2026-06-01T15:00:00Z" },
    { status: "completed", completed_at: "2026-06-02T15:00:00Z" },
  ];
  const future = Array.from({ length: 10 }, () => ({ status: "confirmed", completed_at: null }));
  const completedCount = [...completed, ...future].filter(isCompletedLessonForCompanion).length;

  assert.equal(completedCount, 2);
  assert.equal(getCompanionMilestoneForCompletedLesson("dragon", completedCount), null);
});

test("sixth completed lesson triggers the stage-two reward", () => {
  const milestone = getCompanionMilestoneForCompletedLesson("dragon", 6);

  assert.equal(milestone?.nextStageName, "Lézard");
  assert.equal(milestone?.amount, 5);
});

test("companion count filter does not include confirmed status", () => {
  assert.equal(COMPLETED_LESSON_FOR_COMPANION_FILTER.includes("status.eq.confirmed"), false);
  assert.equal(COMPLETED_LESSON_FOR_COMPANION_FILTER.includes("status.eq.completed"), true);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[companion:rewards] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
