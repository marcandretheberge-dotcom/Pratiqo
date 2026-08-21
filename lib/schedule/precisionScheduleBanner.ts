/**
 * Teacher-facing precision schedule guidance (PR 17A-UX-2).
 * Pure state helpers — no booking / payment side effects.
 */

import { isTeacherScheduleInteractiveCellsUiEnabled } from "@/lib/schedule/interactiveCells";
import {
  isTeacherScheduleIntervalsEnabled,
  isTeacherScheduleIntervalsUiEnabled,
} from "@/lib/schedule/weeklyIntervals";

export const SCHEDULE_PRECISION_BANNER_SNOOZE_KEY = "pratiqo.teacher.schedulePrecisionBanner.snoozeUntil";

/** Default snooze duration (3 days). */
export const SCHEDULE_PRECISION_BANNER_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export type PrecisionBannerVariant = "hidden" | "informational" | "warning";

export type PrecisionBannerInput = {
  legacyBlockCount: number;
  preciseIntervalCount: number;
  configuredDayCount?: number;
  /** Server booking uses precise intervals. */
  intervalsServerEnabled?: boolean;
  intervalsUiEnabled?: boolean;
  interactiveCellsUiEnabled?: boolean;
  snoozed?: boolean;
};

export type PrecisionBannerState = {
  variant: PrecisionBannerVariant;
  showLargeBanner: boolean;
  showCompactReminder: boolean;
  configuredDayCount: number;
  needsPrecision: boolean;
};

export function countConfiguredWeekdays(
  intervals: Array<{ dayOfWeek: number }>,
): number {
  const days = new Set<number>();
  for (const iv of intervals) {
    if (Number.isInteger(iv.dayOfWeek) && iv.dayOfWeek >= 0 && iv.dayOfWeek <= 6) {
      days.add(iv.dayOfWeek);
    }
  }
  return days.size;
}

/**
 * Resolve banner visibility from schedule data + flags.
 *
 * - hidden: precise intervals already configured
 * - warning: precise booking mode ON but no intervals (students can't book accurately / blocked)
 * - informational: broad Matin/Après-midi/Soir still what teachers manage / students may see
 */
export function resolvePrecisionBannerState(input: PrecisionBannerInput): PrecisionBannerState {
  const preciseIntervalCount = Math.max(0, Math.floor(input.preciseIntervalCount) || 0);
  const legacyBlockCount = Math.max(0, Math.floor(input.legacyBlockCount) || 0);
  const configuredDayCount = Math.max(
    0,
    Math.floor(input.configuredDayCount ?? (preciseIntervalCount > 0 ? 1 : 0)) || 0,
  );
  const intervalsServerEnabled =
    input.intervalsServerEnabled ?? isTeacherScheduleIntervalsEnabled();
  const intervalsUiEnabled = input.intervalsUiEnabled ?? isTeacherScheduleIntervalsUiEnabled();
  const interactiveCellsUiEnabled =
    input.interactiveCellsUiEnabled ?? isTeacherScheduleInteractiveCellsUiEnabled();
  const snoozed = Boolean(input.snoozed);

  if (preciseIntervalCount > 0) {
    return {
      variant: "hidden",
      showLargeBanner: false,
      showCompactReminder: false,
      configuredDayCount,
      needsPrecision: false,
    };
  }

  const relevantSurface =
    intervalsUiEnabled || interactiveCellsUiEnabled || legacyBlockCount > 0 || intervalsServerEnabled;

  if (!relevantSurface) {
    return {
      variant: "hidden",
      showLargeBanner: false,
      showCompactReminder: false,
      configuredDayCount: 0,
      needsPrecision: false,
    };
  }

  const variant: PrecisionBannerVariant =
    intervalsServerEnabled && preciseIntervalCount === 0 ? "warning" : "informational";

  const needsPrecision = true;

  if (snoozed) {
    return {
      variant,
      showLargeBanner: false,
      // Keep a compact reminder while precision is still missing (including after snooze).
      showCompactReminder: true,
      configuredDayCount,
      needsPrecision,
    };
  }

  return {
    variant,
    showLargeBanner: true,
    showCompactReminder: false,
    configuredDayCount,
    needsPrecision,
  };
}

export function readPrecisionBannerSnoozed(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null,
  nowMs: number = Date.now(),
): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(SCHEDULE_PRECISION_BANNER_SNOOZE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    return until > nowMs;
  } catch {
    return false;
  }
}

export function writePrecisionBannerSnooze(
  storage: Pick<Storage, "setItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null,
  nowMs: number = Date.now(),
  durationMs: number = SCHEDULE_PRECISION_BANNER_SNOOZE_MS,
): void {
  if (!storage) return;
  try {
    storage.setItem(SCHEDULE_PRECISION_BANNER_SNOOZE_KEY, String(nowMs + durationMs));
  } catch {
    // ignore quota / private mode
  }
}

export function clearPrecisionBannerSnooze(
  storage: Pick<Storage, "removeItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.removeItem(SCHEDULE_PRECISION_BANNER_SNOOZE_KEY);
  } catch {
    // ignore
  }
}

/** Custom event: interactive grid should open first editable cell. */
export const SCHEDULE_CONFIGURE_PRECISION_EVENT = "pratiqo:schedule-configure-precision";

export function dispatchConfigurePrecision(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCHEDULE_CONFIGURE_PRECISION_EVENT));
}
