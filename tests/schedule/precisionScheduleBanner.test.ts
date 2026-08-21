/**
 * PR 17A-UX-2 — teacher-friendly precision schedule banner.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clearPrecisionBannerSnooze,
  countConfiguredWeekdays,
  readPrecisionBannerSnoozed,
  resolvePrecisionBannerState,
  SCHEDULE_PRECISION_BANNER_SNOOZE_KEY,
  writePrecisionBannerSnooze,
} from "../../lib/schedule/precisionScheduleBanner";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test("banner hidden when precise intervals configured", () => {
  const state = resolvePrecisionBannerState({
    legacyBlockCount: 5,
    preciseIntervalCount: 2,
    intervalsServerEnabled: true,
    intervalsUiEnabled: true,
  });
  assert.equal(state.variant, "hidden");
  assert.equal(state.showLargeBanner, false);
  assert.equal(state.needsPrecision, false);
});

test("informational banner when broad schedule and server intervals off", () => {
  const state = resolvePrecisionBannerState({
    legacyBlockCount: 3,
    preciseIntervalCount: 0,
    intervalsServerEnabled: false,
    intervalsUiEnabled: false,
    interactiveCellsUiEnabled: false,
  });
  assert.equal(state.variant, "informational");
  assert.equal(state.showLargeBanner, true);
});

test("warning banner when server intervals on without precise data", () => {
  const state = resolvePrecisionBannerState({
    legacyBlockCount: 0,
    preciseIntervalCount: 0,
    intervalsServerEnabled: true,
    intervalsUiEnabled: true,
  });
  assert.equal(state.variant, "warning");
  assert.equal(state.showLargeBanner, true);
});

test("snooze hides large banner but keeps compact reminder", () => {
  const state = resolvePrecisionBannerState({
    legacyBlockCount: 4,
    preciseIntervalCount: 0,
    intervalsServerEnabled: true,
    snoozed: true,
  });
  assert.equal(state.showLargeBanner, false);
  assert.equal(state.showCompactReminder, true);
  assert.equal(state.needsPrecision, true);
});

test("localStorage snooze read/write", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  const now = 1_700_000_000_000;
  assert.equal(readPrecisionBannerSnoozed(storage, now), false);
  writePrecisionBannerSnooze(storage, now, 60_000);
  assert.equal(store.get(SCHEDULE_PRECISION_BANNER_SNOOZE_KEY), String(now + 60_000));
  assert.equal(readPrecisionBannerSnoozed(storage, now + 1_000), true);
  assert.equal(readPrecisionBannerSnoozed(storage, now + 120_000), false);
  clearPrecisionBannerSnooze(storage);
  assert.equal(readPrecisionBannerSnoozed(storage, now), false);
});

test("countConfiguredWeekdays uses unique day_of_week", () => {
  assert.equal(
    countConfiguredWeekdays([
      { dayOfWeek: 1 },
      { dayOfWeek: 1 },
      { dayOfWeek: 3 },
    ]),
    2,
  );
});

test("page wires precision banner and removes héritées/legacy banner markup", () => {
  const page = read("app/(app)/teacher/schedule/page.tsx");
  assert.match(page, /TeacherSchedulePrecisionBanner/);
  assert.match(page, /dispatchConfigurePrecision/);
  assert.doesNotMatch(page, /teacher-schedule-legacy-mode-banner/);
  assert.doesNotMatch(page, /TeacherScheduleIntervalMigrationBanner/);
  assert.doesNotMatch(page, /scheduleLegacyModeTitle/);
});

test("banner component has CTA, snooze, compact reminder, a11y", () => {
  const banner = read("components/teacher/TeacherSchedulePrecisionBanner.tsx");
  assert.match(banner, /teacher-schedule-precision-banner-cta/);
  assert.match(banner, /teacher-schedule-precision-banner-snooze/);
  assert.match(banner, /teacher-schedule-precision-compact/);
  assert.match(banner, /aria-labelledby/);
  assert.match(banner, /schedulePrecisionInfoTitle/);
  assert.match(banner, /schedulePrecisionWarningTitle/);
  assert.doesNotMatch(banner, /Mode grilles|héritées/);
});

test("interactive grid listens for configure precision event", () => {
  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  assert.match(grid, /SCHEDULE_CONFIGURE_PRECISION_EVENT/);
  assert.match(grid, /openFirstEditableCell/);
});

test("i18n teacher-friendly copy FR/EN/ES without héritées/legacy titles", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const json = read(`lib/i18n/locales/${locale}.json`);
    assert.match(json, /"schedulePrecisionInfoTitle"/);
    assert.match(json, /"schedulePrecisionCta"/);
    assert.match(json, /"schedulePrecisionSnooze"/);
    assert.match(json, /"schedulePrecisionCompactTitle"/);
  }
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Passez à l’horaire précis/);
  assert.match(fr, /Configurer mes heures précises/);
  assert.match(fr, /Rappeler plus tard/);
  assert.doesNotMatch(fr, /Mode grilles héritées/);
  assert.doesNotMatch(fr, /"scheduleLegacyModeTitle": "Mode grilles/);
  assert.doesNotMatch(fr, /Salaire|Employé/);
});

test("no Stripe/checkout/commission/package mutation in precision banner files", () => {
  for (const file of [
    "lib/schedule/precisionScheduleBanner.ts",
    "components/teacher/TeacherSchedulePrecisionBanner.tsx",
  ]) {
    assert.equal(existsSync(join(ROOT, file)), true);
    const src = read(file);
    assert.doesNotMatch(src, /stripe|checkout|commission|payout|refund|packageEntitlement|packageRedemption/i);
  }
});

for (const { name, fn } of tests) {
  fn();
  console.log(`✓ ${name}`);
}
console.log(`\n[schedule:precision-banner] ${tests.length} assertions passed.`);
