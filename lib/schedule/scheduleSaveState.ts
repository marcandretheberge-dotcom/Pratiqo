/**
 * Schedule page save-status helpers (PR 17C).
 * Pure state machine — no booking / payment side effects.
 */

export type ScheduleSaveStatus = "saved" | "unsaved" | "saving" | "error";

export function scheduleSaveStatusFrom(args: {
  dirty: boolean;
  saving: boolean;
  error: boolean;
  justSaved?: boolean;
}): ScheduleSaveStatus {
  if (args.saving) return "saving";
  if (args.error) return "error";
  if (args.dirty) return "unsaved";
  if (args.justSaved) return "saved";
  return "saved";
}

export type ScheduleSaveStatusKey =
  | "scheduleSaveStatusSaved"
  | "scheduleSaveStatusUnsaved"
  | "scheduleSaveStatusSaving"
  | "scheduleSaveStatusError";

export function scheduleSaveStatusKey(status: ScheduleSaveStatus): ScheduleSaveStatusKey {
  switch (status) {
    case "saving":
      return "scheduleSaveStatusSaving";
    case "error":
      return "scheduleSaveStatusError";
    case "unsaved":
      return "scheduleSaveStatusUnsaved";
    case "saved":
    default:
      return "scheduleSaveStatusSaved";
  }
}

/** Snapshot string for dirty comparison (stable JSON). */
export function stableScheduleSnapshot(value: unknown): string {
  return JSON.stringify(value);
}
