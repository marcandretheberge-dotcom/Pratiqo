/**
 * PR 17C — schedule sticky save / dirty state / optional autosave.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isTeacherScheduleAutosaveEnabled,
  isTeacherScheduleStickySaveEnabled,
  SCHEDULE_AUTOSAVE_DEBOUNCE_MS,
  TEACHER_SCHEDULE_AUTOSAVE_FLAG,
  TEACHER_SCHEDULE_AUTOSAVE_UI_FLAG,
  TEACHER_SCHEDULE_STICKY_SAVE_FLAG,
  TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG,
} from "../../lib/schedule/scheduleSaveFlags";
import {
  scheduleSaveStatusFrom,
  scheduleSaveStatusKey,
  stableScheduleSnapshot,
} from "../../lib/schedule/scheduleSaveState";
import { validateWeeklyIntervalSet } from "../../lib/schedule/weeklyIntervals";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const stickyFlag = process.env[TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG];
const autosaveFlag = process.env[TEACHER_SCHEDULE_AUTOSAVE_UI_FLAG];
const autosaveServer = process.env[TEACHER_SCHEDULE_AUTOSAVE_FLAG];

test("autosave defaults OFF", () => {
  delete process.env[TEACHER_SCHEDULE_AUTOSAVE_FLAG];
  delete process.env[TEACHER_SCHEDULE_AUTOSAVE_UI_FLAG];
  assert.equal(isTeacherScheduleAutosaveEnabled(), false);
});

test("sticky save defaults ON", () => {
  delete process.env[TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG];
  assert.equal(isTeacherScheduleStickySaveEnabled(), true);
});

test("sticky save can be explicitly disabled", () => {
  process.env[TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG] = "false";
  assert.equal(isTeacherScheduleStickySaveEnabled(), false);
});

test("save status machine maps dirty/saving/error", () => {
  assert.equal(scheduleSaveStatusFrom({ dirty: false, saving: false, error: false }), "saved");
  assert.equal(scheduleSaveStatusFrom({ dirty: true, saving: false, error: false }), "unsaved");
  assert.equal(scheduleSaveStatusFrom({ dirty: true, saving: true, error: false }), "saving");
  assert.equal(scheduleSaveStatusFrom({ dirty: true, saving: false, error: true }), "error");
  assert.equal(scheduleSaveStatusKey("unsaved"), "scheduleSaveStatusUnsaved");
  assert.equal(scheduleSaveStatusKey("saving"), "scheduleSaveStatusSaving");
});

test("stable snapshot detects dirty vs clean settings", () => {
  const a = stableScheduleSnapshot({ availability: ["lun-matin"], teachingMode: "both", bufferBefore: 0, bufferAfter: 0 });
  const b = stableScheduleSnapshot({ availability: ["lun-matin"], teachingMode: "both", bufferBefore: 0, bufferAfter: 0 });
  const c = stableScheduleSnapshot({ availability: ["lun-matin"], teachingMode: "online", bufferBefore: 0, bufferAfter: 0 });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("invalid intervals prevent save (validation gate)", () => {
  const invalid = validateWeeklyIntervalSet([{ dayOfWeek: 1, startTime: "11:00", endTime: "10:00" }]);
  assert.equal(invalid.ok, false);
  const valid = validateWeeklyIntervalSet([{ dayOfWeek: 1, startTime: "09:00", endTime: "11:30" }]);
  assert.equal(valid.ok, true);
});

test("autosave debounce constant is in safe range", () => {
  assert.ok(SCHEDULE_AUTOSAVE_DEBOUNCE_MS >= 1500 && SCHEDULE_AUTOSAVE_DEBOUNCE_MS <= 3000);
});

test("useUnsavedChangesWarning registers beforeunload only when dirty", () => {
  const hook = read("hooks/useUnsavedChangesWarning.ts");
  assert.match(hook, /beforeunload/);
  assert.match(hook, /if \(!enabled \|\| !dirty\) return/);
});

test("intervals editor wires dirty callback, discard, sticky bar, and gated autosave", () => {
  const editor = read("components/teacher/TeacherWeeklyIntervalsEditor.tsx");
  assert.match(editor, /onDirtyChange/);
  assert.match(editor, /useUnsavedChangesWarning/);
  assert.match(editor, /TeacherScheduleSaveBar/);
  assert.match(editor, /isTeacherScheduleAutosaveEnabled/);
  assert.match(editor, /fromAutosave/);
  assert.match(editor, /discard/);
  assert.match(editor, /teacher-weekly-intervals-save-bar/);
});

test("exceptions editor tracks panel dirty without marking open-only dirty", () => {
  const editor = read("components/teacher/TeacherScheduleExceptionsEditor.tsx");
  assert.match(editor, /onDirtyChange/);
  assert.match(editor, /panelBaseline/);
  assert.match(editor, /useUnsavedChangesWarning/);
  assert.match(editor, /setDirty\(false\)/);
  assert.match(editor, /onDirtyChange\?\.\(false\)/);
});

test("schedule page coordinates dirty state and sticky settings bar", () => {
  const page = read("app/(app)/teacher/schedule/page.tsx");
  assert.match(page, /useUnsavedChangesWarning\(pageDirty/);
  assert.match(page, /TeacherScheduleSaveStatusBadge/);
  assert.match(page, /TeacherScheduleSaveBar/);
  assert.match(page, /onDirtyChange=\{setIntervalsDirty\}/);
  assert.match(page, /onDirtyChange=\{setExceptionsDirty\}/);
  assert.match(page, /settingsDirty/);
  assert.match(page, /discardSettings/);
  assert.match(page, /defaultLessonDuration/);
  assert.match(page, /availableFromDate/);
  assert.match(page, /forcePersist:\s*true/);
  assert.match(page, /TeacherSchedulePrecisionBanner/);
  assert.match(page, /dispatchConfigurePrecision/);
  assert.doesNotMatch(page, /teacher-schedule-legacy-mode-banner/);
});

test("teacher shell places topbar inside main column after sidebar", () => {
  const shell = read("components/AppShell.tsx");
  assert.match(shell, /data-testid="teacher-app-shell"/);
  assert.match(shell, /data-testid="teacher-main-shell"/);
  assert.match(shell, /TeacherSidebarNav[\s\S]*TeacherTopNav[\s\S]*teacher-main-content/);
  assert.match(shell, /h-\[100dvh\]/);
  assert.doesNotMatch(shell, /w-screen/);
});

test("i18n includes sticky save copy FR/EN/ES", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const json = read(`lib/i18n/locales/${locale}.json`);
    assert.match(json, /"scheduleSaveUnsaved"/);
    assert.match(json, /"scheduleSaveCta"/);
    assert.match(json, /"scheduleSaveDiscard"/);
    assert.match(json, /"scheduleSaveSaving"/);
    assert.match(json, /"scheduleSaveSuccess"/);
    assert.match(json, /"scheduleSaveError"/);
    assert.match(json, /"scheduleSavePartialError"/);
    assert.match(json, /"scheduleSaveStatusSaved"/);
    assert.match(json, /"scheduleSaveStatusUnsaved"/);
    assert.match(json, /"scheduleSaveAutosaving"/);
    assert.match(json, /"scheduleSaveAutosaved"/);
    assert.match(json, /"scheduleSaveLeaveTitle"/);
    assert.match(json, /"scheduleSaveConflict"/);
  }
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Modifications non enregistrées/);
  assert.match(fr, /Enregistrer les disponibilités/);
  assert.match(fr, /Annuler les changements/);
  assert.doesNotMatch(fr, /Horaire imposé par Pratiqo/);
  assert.doesNotMatch(fr, /Salaire|Employé/);
});

test("env example documents sticky save and autosave flags", () => {
  const env = read(".env.example");
  assert.match(env, new RegExp(TEACHER_SCHEDULE_STICKY_SAVE_FLAG));
  assert.match(env, new RegExp(TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG));
  assert.match(env, new RegExp(TEACHER_SCHEDULE_AUTOSAVE_FLAG));
  assert.match(env, new RegExp(TEACHER_SCHEDULE_AUTOSAVE_UI_FLAG));
});

test("no Stripe/checkout/commission/payout/refund files changed by save UX helpers", () => {
  for (const file of [
    "lib/schedule/scheduleSaveFlags.ts",
    "lib/schedule/scheduleSaveState.ts",
    "hooks/useUnsavedChangesWarning.ts",
    "components/teacher/TeacherScheduleSaveBar.tsx",
  ]) {
    assert.equal(existsSync(join(ROOT, file)), true);
    const src = read(file);
    assert.doesNotMatch(src, /stripe|checkout|commission|payout|refund|packageEntitlement|packageRedemption/i);
  }
});

test("marketplace-safe copy in save bar component", () => {
  const bar = read("components/teacher/TeacherScheduleSaveBar.tsx");
  assert.doesNotMatch(bar, /Salaire|Employé|Wage|Employee|Employer|Nos professeurs/i);
  assert.match(bar, /role="region"/);
  assert.match(bar, /aria-live="polite"/);
});

(async () => {
  let passed = 0;
  try {
    for (const { name, fn } of tests) {
      await fn();
      passed += 1;
      console.log(`✓ ${name}`);
    }
    console.log(`\n[schedule:save-experience] ${passed} assertions passed.`);
  } finally {
    if (stickyFlag === undefined) delete process.env[TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG];
    else process.env[TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG] = stickyFlag;
    if (autosaveFlag === undefined) delete process.env[TEACHER_SCHEDULE_AUTOSAVE_UI_FLAG];
    else process.env[TEACHER_SCHEDULE_AUTOSAVE_UI_FLAG] = autosaveFlag;
    if (autosaveServer === undefined) delete process.env[TEACHER_SCHEDULE_AUTOSAVE_FLAG];
    else process.env[TEACHER_SCHEDULE_AUTOSAVE_FLAG] = autosaveServer;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
