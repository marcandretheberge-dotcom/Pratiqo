/**
 * Interactive schedule cell feature flags (PR 17A-UX).
 * Defaults OFF. Booking still depends on ENABLE_TEACHER_SCHEDULE_INTERVALS (server).
 */

export const TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG = "ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS";
export const TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS";

/** Client UI: Matin/Après-midi/Soir grid with precise interval popover. */
export function isTeacherScheduleInteractiveCellsUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS === "true";
}

/**
 * Server-side: allow interactive-cells schedule PUT path to use intervals API.
 * Prefer ENABLE_TEACHER_SCHEDULE_INTERVALS (existing) — interactive cells do not
 * introduce a separate booking source of truth.
 */
export function isTeacherScheduleInteractiveCellsEnabled(): boolean {
  return (
    process.env.ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS === "true" ||
    process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS === "true"
  );
}
