/**
 * PR 17C — schedule save UX flags.
 *
 * Sticky save defaults ON when precise schedule UI (intervals or exceptions) is enabled.
 * Auto-save defaults OFF (opt-in only).
 */

import { isTeacherScheduleExceptionsUiEnabled } from "@/lib/schedule/dateExceptions";
import { isTeacherScheduleIntervalsUiEnabled } from "@/lib/schedule/weeklyIntervals";

export const TEACHER_SCHEDULE_STICKY_SAVE_FLAG = "ENABLE_TEACHER_SCHEDULE_STICKY_SAVE";
export const TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_STICKY_SAVE";
export const TEACHER_SCHEDULE_AUTOSAVE_FLAG = "ENABLE_TEACHER_SCHEDULE_AUTOSAVE";
export const TEACHER_SCHEDULE_AUTOSAVE_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_AUTOSAVE";

/**
 * Sticky save bar / unsaved warnings.
 * Explicit false disables; explicit true enables; otherwise ON when schedule interval/exception UI is on.
 */
export function isTeacherScheduleStickySaveEnabled(): boolean {
  const explicit = process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_STICKY_SAVE;
  if (explicit === "false") return false;
  if (explicit === "true") return true;
  return isTeacherScheduleIntervalsUiEnabled() || isTeacherScheduleExceptionsUiEnabled();
}

/** Lightweight debounced auto-save — OFF unless explicitly enabled. */
export function isTeacherScheduleAutosaveEnabled(): boolean {
  return (
    process.env.ENABLE_TEACHER_SCHEDULE_AUTOSAVE === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_AUTOSAVE === "true"
  );
}

export const SCHEDULE_AUTOSAVE_DEBOUNCE_MS = 2000;
