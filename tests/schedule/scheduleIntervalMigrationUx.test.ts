/**
 * PR 17A addendum — progressive schedule interval migration UX.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildScheduleIntervalMigrationState,
  needsLegacyScheduleIntervalMigration,
  needsPreciseScheduleIntervals,
  readScheduleIntervalMigrationModalDismissed,
  SCHEDULE_INTERVALS_MIGRATION_MODAL_DISMISSED_KEY,
  shouldShowScheduleIntervalDashboardAction,
  shouldShowScheduleIntervalHoraireBanner,
  shouldShowScheduleIntervalMigrationModal,
  writeScheduleIntervalMigrationModalDismissed,
} from "../../lib/schedule/scheduleIntervalMigration";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test("no dashboard login modal wiring exists for schedule intervals", () => {
  const dash = read("components/Dashboard.tsx");
  assert.doesNotMatch(dash, /TeacherScheduleIntervalMigrationModal/);
  assert.match(dash, /shouldShowScheduleIntervalDashboardAction/);
  assert.match(dash, /teacher-dash-action-schedule-intervals|schedule-intervals/);
  // Teachers keep access to messages / students / revenue / offers without configuring intervals.
  assert.match(dash, /\/messages/);
  assert.match(dash, /TeacherDashboardStats/);
});

test("dashboard action only when legacy blocks need conversion", () => {
  const off = buildScheduleIntervalMigrationState({
    uiEnabled: false,
    legacyBlockCount: 5,
    preciseIntervalCount: 0,
  });
  assert.equal(shouldShowScheduleIntervalDashboardAction(off), false);

  const noLegacy = buildScheduleIntervalMigrationState({
    uiEnabled: true,
    legacyBlockCount: 0,
    preciseIntervalCount: 0,
  });
  assert.equal(shouldShowScheduleIntervalDashboardAction(noLegacy), false);
  assert.equal(needsPreciseScheduleIntervals(noLegacy), true);

  const needs = buildScheduleIntervalMigrationState({
    uiEnabled: true,
    legacyBlockCount: 3,
    preciseIntervalCount: 0,
  });
  assert.equal(needsLegacyScheduleIntervalMigration(needs), true);
  assert.equal(shouldShowScheduleIntervalDashboardAction(needs), true);

  const done = buildScheduleIntervalMigrationState({
    uiEnabled: true,
    legacyBlockCount: 3,
    preciseIntervalCount: 2,
  });
  assert.equal(shouldShowScheduleIntervalDashboardAction(done), false);
});

test("Horaire shows teacher-friendly precision banner until precise intervals exist", () => {
  const needs = buildScheduleIntervalMigrationState({
    uiEnabled: true,
    legacyBlockCount: 2,
    preciseIntervalCount: 0,
  });
  assert.equal(shouldShowScheduleIntervalHoraireBanner(needs), true);

  const page = read("app/(app)/teacher/schedule/page.tsx");
  assert.match(page, /TeacherSchedulePrecisionBanner/);
  assert.match(page, /TeacherScheduleIntervalMigrationModal/);
  assert.doesNotMatch(page, /TeacherScheduleIntervalMigrationBanner/);
  assert.doesNotMatch(page, /Mode grilles|héritées|teacher-schedule-legacy-mode-banner/);

  const banner = read("components/teacher/TeacherSchedulePrecisionBanner.tsx");
  assert.match(banner, /schedulePrecisionInfoTitle|schedulePrecisionWarningTitle/);
  assert.match(banner, /schedulePrecisionCta/);
  assert.doesNotMatch(banner, /héritées|Legacy/);
});

test("optional Horaire first-visit modal can be dismissed and does not repeat", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
  };
  const state = buildScheduleIntervalMigrationState({
    uiEnabled: true,
    legacyBlockCount: 1,
    preciseIntervalCount: 0,
  });

  assert.equal(
    shouldShowScheduleIntervalMigrationModal({ state, dismissed: false, onHorairePage: true }),
    true,
  );
  assert.equal(
    shouldShowScheduleIntervalMigrationModal({ state, dismissed: false, onHorairePage: false }),
    false,
  );

  assert.equal(readScheduleIntervalMigrationModalDismissed(storage), false);
  writeScheduleIntervalMigrationModalDismissed(storage);
  assert.equal(storage.getItem(SCHEDULE_INTERVALS_MIGRATION_MODAL_DISMISSED_KEY), "1");
  assert.equal(readScheduleIntervalMigrationModalDismissed(storage), true);
  assert.equal(
    shouldShowScheduleIntervalMigrationModal({ state, dismissed: true, onHorairePage: true }),
    false,
  );

  const modal = read("components/teacher/TeacherScheduleIntervalMigrationModal.tsx");
  assert.match(modal, /writeScheduleIntervalMigrationModalDismissed/);
  assert.match(modal, /teacher-schedule-interval-migration-modal-later/);
});

test("booking path still refuses legacy blocks when interval mode ON with no intervals", () => {
  const guard = read("lib/bookings/weeklyIntervalGuard.ts");
  assert.match(guard, /slot_outside_teacher_availability/);
  assert.match(guard, /loaded\.intervals\.length === 0/);

  const slots = read("app/api/teachers/[id]/slots/route.ts");
  assert.match(slots, /generateSlotsFromWeeklyIntervals/);
  assert.match(slots, /hasWeeklyIntervals/);
});

test("i18n migration copy avoids employer wording", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const dict = JSON.parse(read(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    const blob = [
      dict.teacherDashActionScheduleIntervalsLabel,
      dict.teacherDashActionScheduleIntervalsDescription,
      dict.weeklyIntervalsMigrationModalBody,
      dict.weeklyIntervalsMigrationBannerLegacyNote,
    ].join("\n");
    assert.doesNotMatch(blob, /Nos professeurs|Salaire|Employé|employee|wage/i);
    assert.doesNotMatch(blob, /Pratiqo vous assigne|Horaire imposé/i);
  }
});

let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`ok - ${t.name}`);
  } catch (e) {
    failed += 1;
    console.error(`not ok - ${t.name}`);
    console.error(e);
  }
}
if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log(`\n${tests.length} test(s) passed`);
