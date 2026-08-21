/**
 * Interactive schedule cell feature flags (PR 17A-UX / blocker fix).
 *
 * Defaults ON so teachers get clickable cells → precise ranges → sticky save
 * without a hidden OFF flag looking like a product bug.
 * Set NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS=false to force legacy
 * broad Matin/Après-midi/Soir toggles only.
 *
 * Booking eligibility remains separately gated by:
 * - ENABLE_TEACHER_SCHEDULE_INTERVALS (global precise slots), and/or
 * - ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING + teachers.schedule_mode (migration 112).
 */

export const TEACHER_SCHEDULE_INTERACTIVE_CELLS_FLAG = "ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS";
export const TEACHER_SCHEDULE_INTERACTIVE_CELLS_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS";

/**
 * Client UI: Matin/Après-midi/Soir grid with precise interval editor.
 * Explicit "false" disables; otherwise ON (including unset).
 */
export function isTeacherScheduleInteractiveCellsUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS !== "false";
}

/**
 * Server: allow interactive-cell / weekly-interval PUT persistence.
 * Explicit ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS=false disables unless
 * ENABLE_TEACHER_SCHEDULE_INTERVALS=true (legacy intervals server path).
 * Default ON so Apply → Save persists without requiring a second env toggle.
 */
export function isTeacherScheduleInteractiveCellsEnabled(): boolean {
  if (process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS === "true") return true;
  return process.env.ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS !== "false";
}
