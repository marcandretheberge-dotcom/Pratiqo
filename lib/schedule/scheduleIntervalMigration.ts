/**
 * Progressive UX for migrating from coarse Matin/Après-midi/Soir blocks
 * to precise weekly intervals (PR 17A addendum).
 *
 * Never blocks dashboard access. Modal only on Horaire first visit.
 */

import { isTeacherScheduleIntervalsUiEnabled } from "@/lib/schedule/weeklyIntervals";

/** localStorage: user dismissed the Horaire first-visit migration modal. */
export const SCHEDULE_INTERVALS_MIGRATION_MODAL_DISMISSED_KEY =
  "pratiqo.teacher.scheduleIntervalsMigrationModal.dismissed";

export type ScheduleIntervalMigrationState = {
  uiEnabled: boolean;
  legacyBlockCount: number;
  preciseIntervalCount: number;
};

export function buildScheduleIntervalMigrationState(args: {
  legacyBlockCount: number;
  preciseIntervalCount: number;
  uiEnabled?: boolean;
}): ScheduleIntervalMigrationState {
  return {
    uiEnabled: args.uiEnabled ?? isTeacherScheduleIntervalsUiEnabled(),
    legacyBlockCount: Math.max(0, Math.floor(args.legacyBlockCount) || 0),
    preciseIntervalCount: Math.max(0, Math.floor(args.preciseIntervalCount) || 0),
  };
}

/** Teacher has legacy blocks but no precise intervals while interval UI is ON. */
export function needsLegacyScheduleIntervalMigration(state: ScheduleIntervalMigrationState): boolean {
  return state.uiEnabled && state.legacyBlockCount > 0 && state.preciseIntervalCount === 0;
}

/**
 * Teacher cannot receive bookings under interval mode until they save at least
 * one precise interval (legacy blocks are not used silently).
 */
export function needsPreciseScheduleIntervals(state: ScheduleIntervalMigrationState): boolean {
  return state.uiEnabled && state.preciseIntervalCount === 0;
}

/** Dashboard action card — only when legacy schedule must be converted. */
export function shouldShowScheduleIntervalDashboardAction(
  state: ScheduleIntervalMigrationState,
): boolean {
  return needsLegacyScheduleIntervalMigration(state);
}

/** Strong Horaire banner until precise intervals exist. */
export function shouldShowScheduleIntervalHoraireBanner(
  state: ScheduleIntervalMigrationState,
): boolean {
  return needsPreciseScheduleIntervals(state);
}

/**
 * Optional first-visit modal on Horaire only (never on dashboard login).
 * Shown when precise intervals are still missing and not yet dismissed.
 */
export function shouldShowScheduleIntervalMigrationModal(args: {
  state: ScheduleIntervalMigrationState;
  dismissed: boolean;
  onHorairePage: boolean;
}): boolean {
  if (!args.onHorairePage) return false;
  if (args.dismissed) return false;
  return needsPreciseScheduleIntervals(args.state);
}

export function readScheduleIntervalMigrationModalDismissed(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null,
): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(SCHEDULE_INTERVALS_MIGRATION_MODAL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeScheduleIntervalMigrationModalDismissed(
  storage: Pick<Storage, "setItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(SCHEDULE_INTERVALS_MIGRATION_MODAL_DISMISSED_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}
