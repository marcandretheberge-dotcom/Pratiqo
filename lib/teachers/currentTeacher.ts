/**
 * Canonical authenticated teacher lookup for teacher-dashboard client pages.
 *
 * Always resolve by teachers.user_id = auth user id (never client-supplied teacher_id).
 * Requires migration 112 columns (schedule_mode). A query failure must surface as
 * query_error — never as a false "no teacher profile" for a real teacher row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeTeacherScheduleMode,
  type TeacherScheduleMode,
} from "@/lib/schedule/preciseScheduleActivation";

/** Core teacher columns for /teacher/schedule (includes migration 112 schedule_mode). */
export const TEACHER_SCHEDULE_SELECT =
  "id, availability, default_lesson_duration_minutes, available_from_date, teaching_mode, booking_buffer_before_minutes, booking_buffer_after_minutes, schedule_mode";

/** @deprecated Prefer TEACHER_SCHEDULE_SELECT — kept for tests that assert the canonical select string. */
export const TEACHER_SCHEDULE_CORE_SELECT = TEACHER_SCHEDULE_SELECT;

export type CurrentTeacherScheduleRow = {
  id: string;
  availability: unknown;
  default_lesson_duration_minutes: number | null;
  available_from_date: string | null;
  teaching_mode: string | null;
  booking_buffer_before_minutes: number | null;
  booking_buffer_after_minutes: number | null;
  scheduleMode: TeacherScheduleMode;
};

export type LoadCurrentTeacherResult =
  | { ok: true; teacher: CurrentTeacherScheduleRow }
  | { ok: false; reason: "not_found" | "query_error"; message?: string };

function asTeacherRow(data: Record<string, unknown> | null | undefined): CurrentTeacherScheduleRow | null {
  if (!data || typeof data.id !== "string" || !data.id) return null;
  return {
    id: data.id,
    availability: data.availability,
    default_lesson_duration_minutes:
      (data.default_lesson_duration_minutes as number | null | undefined) ?? null,
    available_from_date: (data.available_from_date as string | null | undefined) ?? null,
    teaching_mode: (data.teaching_mode as string | null | undefined) ?? null,
    booking_buffer_before_minutes:
      (data.booking_buffer_before_minutes as number | null | undefined) ?? null,
    booking_buffer_after_minutes:
      (data.booking_buffer_after_minutes as number | null | undefined) ?? null,
    scheduleMode: normalizeTeacherScheduleMode(
      data.schedule_mode as string | null | undefined,
    ),
  };
}

/**
 * Load the authenticated user's teacher row for schedule UI.
 * Does not create a teacher profile.
 */
export async function loadCurrentTeacherForSchedule(
  supabase: Pick<SupabaseClient, "from">,
  userId: string,
): Promise<LoadCurrentTeacherResult> {
  if (!userId) {
    return { ok: false, reason: "not_found" };
  }

  const primary = await supabase
    .from("teachers")
    .select(TEACHER_SCHEDULE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (primary.error) {
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error("[teacher-schedule] teacher lookup query_error", primary.error.message);
    }
    return {
      ok: false,
      reason: "query_error",
      message: primary.error.message,
    };
  }

  const teacher = asTeacherRow(primary.data as Record<string, unknown> | null);
  if (!teacher) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true, teacher };
}
