import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  collectDominicanRdCompletedModules,
  deriveDominicanRdCourseProgress,
  DOMINICAN_RD_ROUTES,
} from "@/lib/yopratiqo/dominicanRepublicCourseProgress";
import { DOMINICAN_RD_COURSE_ID } from "@/lib/yo/dominicanRepublicProgressPayloads";

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

function snapshot(
  moduleId: string,
  progressState: "completed" | "reviewed" | "started" = "completed",
) {
  return {
    course_id: DOMINICAN_RD_COURSE_ID,
    module_id: moduleId,
    progress_state: progressState,
  };
}

// Case 1 — no snapshots → Intro/default entry
{
  const progress = deriveDominicanRdCourseProgress([]);
  assert.equal(progress.nextStepId, "intro");
  assert.equal(progress.continueHref, DOMINICAN_RD_ROUTES.intro);
  assert.equal(progress.courseComplete, false);
  assert.equal(progress.roadmapStatuses.intro, "next");
  assert.equal(progress.roadmapStatuses["module-2"], "available");
  ok("1) no snapshots → Intro is next");
}

{
  const progress = deriveDominicanRdCourseProgress(null);
  assert.equal(progress.continueHref, DOMINICAN_RD_ROUTES.intro);
  ok("1b) null snapshots (anonymous) → Intro default");
}

// Case 2 — Module 2 complete → next = Module 3
{
  const progress = deriveDominicanRdCourseProgress([snapshot("module-2")]);
  assert.deepEqual(progress.completedModuleIds, ["module-2"]);
  assert.equal(progress.nextStepId, "module-3");
  assert.equal(progress.continueHref, DOMINICAN_RD_ROUTES["module-3"]);
  assert.equal(progress.roadmapStatuses["module-2"], "completed");
  assert.equal(progress.roadmapStatuses["module-3"], "next");
  ok("2) module 2 complete → next is module 3");
}

// Case 3 — Modules 2 + 3 complete → next = Module 4
{
  const progress = deriveDominicanRdCourseProgress([
    snapshot("module-2"),
    snapshot("module-3"),
  ]);
  assert.equal(progress.nextStepId, "module-4");
  assert.equal(progress.continueHref, DOMINICAN_RD_ROUTES["module-4"]);
  ok("3) modules 2+3 complete → next is module 4");
}

// Case 4 — Modules 2 + 3 + 4 complete → next = Module 5
{
  const progress = deriveDominicanRdCourseProgress([
    snapshot("module-4"),
    snapshot("module-2"),
    snapshot("module-3"),
  ]);
  assert.equal(progress.nextStepId, "module-5");
  assert.equal(progress.continueHref, DOMINICAN_RD_ROUTES["module-5"]);
  ok("4) modules 2+3+4 complete → next is module 5");
}

// Case 5 — Modules 2–5 complete → course complete
{
  const progress = deriveDominicanRdCourseProgress([
    snapshot("module-5"),
    snapshot("module-4"),
    snapshot("module-3"),
    snapshot("module-2"),
  ]);
  assert.equal(progress.courseComplete, true);
  assert.equal(progress.nextStepId, "course-complete");
  assert.equal(progress.continueHref, DOMINICAN_RD_ROUTES.courseHome);
  assert.equal(progress.roadmapStatuses["module-5"], "completed");
  assert.equal(progress.roadmapStatuses.intro, "available");
  assert.ok(
    !Object.values(progress.roadmapStatuses).includes("next"),
    "completed course should not mark any step as next",
  );
  ok("5) modules 2–5 complete → course complete (Course Home, not Intro)");
}

// Case 6 — unordered snapshots → correct result
{
  const completed = collectDominicanRdCompletedModules([
    snapshot("module-4"),
    snapshot("module-2"),
  ]);
  assert.deepEqual(completed, ["module-2", "module-4"]);
  const progress = deriveDominicanRdCourseProgress([
    snapshot("module-4"),
    snapshot("module-2"),
  ]);
  assert.equal(progress.nextStepId, "module-3");
  ok("6) unordered snapshots → first incomplete module in canonical order");
}

// Case 7 — duplicate snapshot/module → correct result
{
  const progress = deriveDominicanRdCourseProgress([
    snapshot("module-2", "started"),
    snapshot("module-2", "completed"),
    snapshot("module-2", "reviewed"),
  ]);
  assert.equal(progress.nextStepId, "module-3");
  assert.deepEqual(progress.completedModuleIds, ["module-2"]);
  ok("7) duplicate module rows collapse to one completion");
}

// Case 8 — unknown module ID ignored
{
  const progress = deriveDominicanRdCourseProgress([
    snapshot("module-2"),
    {
      course_id: DOMINICAN_RD_COURSE_ID,
      module_id: "module-99-future",
      progress_state: "completed",
    },
    {
      course_id: "yopratiqo:es:other-country",
      module_id: "module-3",
      progress_state: "completed",
    },
  ]);
  assert.deepEqual(progress.completedModuleIds, ["module-2"]);
  assert.equal(progress.nextStepId, "module-3");
  ok("8) unknown / foreign snapshots are ignored safely");
}

// Module 2 incomplete (started only) → continue Module 2
{
  const progress = deriveDominicanRdCourseProgress([
    snapshot("module-2", "started"),
  ]);
  assert.equal(progress.nextStepId, "intro");
  assert.equal(progress.continueHref, DOMINICAN_RD_ROUTES.intro);
  ok("started-only snapshot does not count as complete → Intro");
}

{
  const progress = deriveDominicanRdCourseProgress([], { langSuffix: "?lang=en" });
  assert.equal(progress.continueHref, `${DOMINICAN_RD_ROUTES.intro}?lang=en`);
  ok("lang suffix is appended to continue href");
}

console.log("\nAll dominicanRepublicCourseProgress resolver tests passed.");
