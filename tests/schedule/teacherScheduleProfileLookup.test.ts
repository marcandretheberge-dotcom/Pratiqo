/**
 * Recovery: teacher schedule profile lookup + load states after migration 112.
 * Preserves precise interactive cell editor direction (no broad-only rollback).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadCurrentTeacherForSchedule,
  TEACHER_SCHEDULE_SELECT,
} from "../../lib/teachers/currentTeacher";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

test("canonical select includes migration 112 schedule_mode", () => {
  assert.match(TEACHER_SCHEDULE_SELECT, /\bid\b/);
  assert.match(TEACHER_SCHEDULE_SELECT, /availability/);
  assert.match(TEACHER_SCHEDULE_SELECT, /schedule_mode/);
  assert.match(TEACHER_SCHEDULE_SELECT, /available_from_date/);
});

test("migration 112 defines schedule_mode and precise_schedule_activated_at", () => {
  const sql = read("supabase/migrations/112_teacher_schedule_mode.sql");
  assert.match(sql, /schedule_mode/);
  assert.match(sql, /precise_schedule_activated_at/);
  assert.match(sql, /legacy_blocks/);
  assert.match(sql, /precise_intervals/);
});

test("loadCurrentTeacherForSchedule returns found teacher with schedule_mode", async () => {
  const supabase = {
    from: (table: string) => {
      assert.equal(table, "teachers");
      return {
        select: (columns: string) => {
          assert.equal(columns, TEACHER_SCHEDULE_SELECT);
          return {
            eq: (col: string, value: string) => {
              assert.equal(col, "user_id");
              assert.equal(value, "user-1");
              return {
                maybeSingle: async () => ({
                  data: {
                    id: "teacher-1",
                    availability: ["Lun Matin"],
                    default_lesson_duration_minutes: 60,
                    available_from_date: null,
                    teaching_mode: "both",
                    booking_buffer_before_minutes: 0,
                    booking_buffer_after_minutes: 0,
                    schedule_mode: "precise_intervals",
                  },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };

  const result = await loadCurrentTeacherForSchedule(supabase as never, "user-1");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.teacher.id, "teacher-1");
    assert.equal(result.teacher.scheduleMode, "precise_intervals");
  }
});

test("empty availability still returns found teacher (not missing)", async () => {
  const supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "teacher-empty",
              availability: [],
              default_lesson_duration_minutes: 60,
              available_from_date: null,
              teaching_mode: "both",
              booking_buffer_before_minutes: 0,
              booking_buffer_after_minutes: 0,
              schedule_mode: "legacy_blocks",
            },
            error: null,
          }),
        }),
      }),
    }),
  };
  const result = await loadCurrentTeacherForSchedule(supabase as never, "user-1");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.teacher.id, "teacher-empty");
});

test("loadCurrentTeacherForSchedule returns not_found when no teacher row", async () => {
  const supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  };
  const result = await loadCurrentTeacherForSchedule(supabase as never, "user-1");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "not_found");
});

test("query failure is query_error, never not_found", async () => {
  const prevError = console.error;
  console.error = () => {};
  try {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: null,
              error: { message: "column teachers.schedule_mode does not exist" },
            }),
          }),
        }),
      }),
    };
    const result = await loadCurrentTeacherForSchedule(supabase as never, "user-1");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "query_error");
      assert.match(result.message || "", /schedule_mode/);
    }
  } finally {
    console.error = prevError;
  }
});

test("schedule page uses canonical helper and separates load/missing/error states", () => {
  const page = read("app/(app)/teacher/schedule/page.tsx");
  assert.match(page, /loadCurrentTeacherForSchedule/);
  assert.match(page, /scheduleLoadingTeacher/);
  assert.match(page, /scheduleNoTeacherTitle/);
  assert.match(page, /scheduleLoadErrorBody/);
  assert.match(page, /teacher-schedule-no-profile/);
  assert.match(page, /teacher-schedule-load-error/);
  assert.match(page, /teacherLookupState/);
  assert.match(page, /TeacherScheduleInteractiveGrid/);
  assert.match(page, /TeacherScheduleCellEditor|TeacherScheduleInteractiveGrid/);
  assert.match(page, /TeacherScheduleSaveBar/);
  assert.doesNotMatch(page, /t\("noTeacherProfile"\)/);
  assert.doesNotMatch(page, /Mode grilles|héritées/);
});

test("precise interactive cell editor and sticky save remain in the product", () => {
  const grid = read("components/teacher/TeacherScheduleInteractiveGrid.tsx");
  const editor = read("components/teacher/TeacherScheduleCellEditor.tsx");
  assert.match(grid, /TeacherScheduleCellEditor/);
  assert.match(grid, /TeacherScheduleSaveBar/);
  assert.match(editor, /scheduleCellApply|Appliquer|onApply/);
  assert.match(editor, /scheduleCellAddInterval|Ajouter un autre/);
  assert.doesNotMatch(grid, /Mode grilles|héritées/);
  assert.doesNotMatch(editor, /Mode grilles|héritées/);
});

test("precision banner copy stays outcome-based (no legacy mode wording)", () => {
  const banner = read("components/teacher/TeacherSchedulePrecisionBanner.tsx");
  const fr = read("lib/i18n/locales/fr.json");
  assert.doesNotMatch(banner, /Mode grilles|héritées/);
  assert.doesNotMatch(fr, /Mode grilles héritées/);
  assert.match(fr, /Horaire précis actif/);
  assert.match(fr, /"schedulePrecisionCta"/);
});

test("i18n loading / load-error / no-teacher copy FR/EN/ES", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const json = read(`lib/i18n/locales/${locale}.json`);
    assert.match(json, /"scheduleLoadingTeacher"/);
    assert.match(json, /"scheduleNoTeacherTitle"/);
    assert.match(json, /"scheduleNoTeacherCta"/);
    assert.match(json, /"scheduleLoadErrorBody"/);
  }
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Chargement de votre horaire/);
  assert.match(fr, /Aucune fiche professeur trouvée/);
  assert.match(fr, /Impossible de charger l.horaire pour le moment/);
  const en = read("lib/i18n/locales/en.json");
  assert.match(en, /Could not load your schedule right now/);
  const es = read("lib/i18n/locales/es.json");
  assert.match(es, /No se pudo cargar tu horario en este momento/);
});

test("no Stripe/checkout/package mutation in recovery files", () => {
  for (const file of [
    "lib/teachers/currentTeacher.ts",
    "app/(app)/teacher/schedule/page.tsx",
  ]) {
    assert.equal(existsSync(join(ROOT, file)), true);
    const src = read(file);
    assert.doesNotMatch(
      src,
      /checkout\.sessions|commission_rate|payout_reversal|package_entitlement_balance|package_redemptions/,
    );
  }
});

async function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
    } catch (e) {
      failed += 1;
      console.error(`✗ ${t.name}`);
      console.error(e);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log(`\n[schedule:teacher-profile-lookup] ${tests.length} assertions passed.`);
}

void run();
