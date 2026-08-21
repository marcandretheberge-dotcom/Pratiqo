/**
 * Precise schedule activation + booking source-of-truth flags (PR 17A-CORE).
 *
 * Timezone assumption: interval start/end are local wall-clock times on the
 * booking calendar date (same as formatLocalISODate / "9h00" labels). No UTC
 * conversion in this layer.
 */

import {
  isTeacherScheduleIntervalsEnabled,
  validateWeeklyIntervalSet,
  type NormalizedWeeklyInterval,
  type WeeklyIntervalInput,
} from "@/lib/schedule/weeklyIntervals";

export const TEACHER_PRECISE_SCHEDULE_BOOKING_FLAG = "ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING";
export const TEACHER_PRECISE_SCHEDULE_BOOKING_UI_FLAG =
  "NEXT_PUBLIC_ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING";

export type TeacherScheduleMode = "legacy_blocks" | "precise_intervals";

export type PreciseScheduleUiStatus = "general" | "ready" | "active";

/** Server: when ON, booking uses per-teacher schedule_mode (not global force). */
export function isTeacherPreciseScheduleBookingEnabled(): boolean {
  return process.env.ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING === "true";
}

/** Client: show activate / status controls on Horaire. */
export function isTeacherPreciseScheduleBookingUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEACHER_PRECISE_SCHEDULE_BOOKING === "true";
}

export function normalizeTeacherScheduleMode(raw: unknown): TeacherScheduleMode {
  return raw === "precise_intervals" ? "precise_intervals" : "legacy_blocks";
}

/**
 * Decide whether booking / slot generation must use precise weekly intervals.
 *
 * - Precise-booking flag OFF → preserve prior global intervals flag behavior.
 * - Precise-booking flag ON → only teachers with schedule_mode=precise_intervals.
 */
export function shouldUsePreciseIntervalsForBooking(args: {
  scheduleMode: TeacherScheduleMode | string | null | undefined;
  preciseBookingEnabled?: boolean;
  intervalsServerEnabled?: boolean;
}): boolean {
  const preciseBooking =
    args.preciseBookingEnabled ?? isTeacherPreciseScheduleBookingEnabled();
  const intervalsServer = args.intervalsServerEnabled ?? isTeacherScheduleIntervalsEnabled();
  const mode = normalizeTeacherScheduleMode(args.scheduleMode);

  if (preciseBooking) {
    return mode === "precise_intervals";
  }
  return intervalsServer;
}

export function resolvePreciseScheduleUiStatus(args: {
  scheduleMode: TeacherScheduleMode | string | null | undefined;
  preciseIntervalCount: number;
  preciseBookingUiEnabled?: boolean;
}): PreciseScheduleUiStatus {
  const mode = normalizeTeacherScheduleMode(args.scheduleMode);
  if (mode === "precise_intervals") return "active";
  const ui = args.preciseBookingUiEnabled ?? isTeacherPreciseScheduleBookingUiEnabled();
  if (ui && args.preciseIntervalCount > 0) return "ready";
  return "general";
}

export type ActivatePreciseScheduleResult =
  | { ok: true; scheduleMode: "precise_intervals" }
  | {
      ok: false;
      error:
        | "precise_schedule_disabled"
        | "no_precise_intervals"
        | "invalid_precise_intervals"
        | "overlapping_precise_intervals";
    };

/**
 * Server-side gate before flipping schedule_mode to precise_intervals.
 */
export function evaluatePreciseScheduleActivation(args: {
  intervals: WeeklyIntervalInput[] | NormalizedWeeklyInterval[];
  preciseBookingEnabled?: boolean;
}): ActivatePreciseScheduleResult {
  const enabled = args.preciseBookingEnabled ?? isTeacherPreciseScheduleBookingEnabled();
  if (!enabled) {
    return { ok: false, error: "precise_schedule_disabled" };
  }
  if (!args.intervals.length) {
    return { ok: false, error: "no_precise_intervals" };
  }

  const asInputs: WeeklyIntervalInput[] = args.intervals.map((iv) => ({
    dayOfWeek: "dayOfWeek" in iv ? iv.dayOfWeek : (iv as NormalizedWeeklyInterval).dayOfWeek,
    startTime:
      "startTime" in iv && typeof iv.startTime === "string"
        ? iv.startTime
        : (iv as NormalizedWeeklyInterval).startTime,
    endTime:
      "endTime" in iv && typeof iv.endTime === "string"
        ? iv.endTime
        : (iv as NormalizedWeeklyInterval).endTime,
  }));

  const validated = validateWeeklyIntervalSet(asInputs);
  if (!validated.ok) {
    if (validated.error === "overlapping_intervals" || validated.error === "duplicate_interval") {
      return { ok: false, error: "overlapping_precise_intervals" };
    }
    return { ok: false, error: "invalid_precise_intervals" };
  }
  return { ok: true, scheduleMode: "precise_intervals" };
}
