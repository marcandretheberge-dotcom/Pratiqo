/**
 * PR 17C / 17C-FIX — schedule save UX flags.
 *
 * Sticky save defaults ON (schedule reliability).
 * Auto-save defaults OFF (opt-in only).
 */

export const TEACHER_SCHEDULE_STICKY_SAVE_FLAG = "ENABLE_TEACHER_SCHEDULE_STICKY_SAVE";
export const TEACHER_SCHEDULE_STICKY_SAVE_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_STICKY_SAVE";
export const TEACHER_SCHEDULE_AUTOSAVE_FLAG = "ENABLE_TEACHER_SCHEDULE_AUTOSAVE";
export const TEACHER_SCHEDULE_AUTOSAVE_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_AUTOSAVE";

/**
 * Sticky save bar / unsaved warnings.
 * Explicit false disables; otherwise ON (including when interval/exception UI flags are off).
 */
export function isTeacherScheduleStickySaveEnabled(): boolean {
  const explicit = process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_STICKY_SAVE;
  if (explicit === "false") return false;
  return true;
}

/** Lightweight debounced auto-save — OFF unless explicitly enabled. */
export function isTeacherScheduleAutosaveEnabled(): boolean {
  return (
    process.env.ENABLE_TEACHER_SCHEDULE_AUTOSAVE === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_AUTOSAVE === "true"
  );
}

export const SCHEDULE_AUTOSAVE_DEBOUNCE_MS = 2000;
