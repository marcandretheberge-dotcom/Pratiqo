/**
 * Central booking schedule eligibility helpers (PR 17A-CORE).
 *
 * Ordering for create/redeem flows (callers still own Stripe / package gates):
 * 1. teacher exists / bookable under existing rules
 * 2. available_from_date
 * 3. date exceptions (when enabled)
 * 4. precise intervals OR legacy blocks (via shouldUsePreciseIntervalsForBooking)
 * 5. existing conflict checks elsewhere
 *
 * Timezone: compares local calendar date + wall-clock slot labels ("9h00")
 * against interval times stored as local time-of-day.
 */

import {
  normalizeTeacherScheduleMode,
  shouldUsePreciseIntervalsForBooking,
  type TeacherScheduleMode,
} from "@/lib/schedule/preciseScheduleActivation";
import {
  dayOfWeekForISODate,
  mapDbRowsToNormalized,
  slotFitsWeeklyIntervals,
  type NormalizedWeeklyInterval,
} from "@/lib/schedule/weeklyIntervals";
import { slotStartMinutes } from "@/lib/slots";

export type ScheduleEligibilityResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "slot_outside_teacher_availability" | "server_error";
    };

export function evaluatePreciseIntervalSlotFit(args: {
  slotDate: string;
  timeSlot: string;
  durationMinutes: number;
  intervals: NormalizedWeeklyInterval[];
}): ScheduleEligibilityResult {
  const dayOfWeek = dayOfWeekForISODate(args.slotDate);
  const startMin = slotStartMinutes(args.timeSlot);
  if (dayOfWeek == null || startMin < 0) {
    return { allowed: false, reason: "slot_outside_teacher_availability" };
  }
  if (args.intervals.length === 0) {
    return { allowed: false, reason: "slot_outside_teacher_availability" };
  }
  if (!slotFitsWeeklyIntervals(dayOfWeek, startMin, args.durationMinutes, args.intervals)) {
    return { allowed: false, reason: "slot_outside_teacher_availability" };
  }
  return { allowed: true };
}

export function resolveBookingScheduleSource(args: {
  scheduleMode: TeacherScheduleMode | string | null | undefined;
}): "precise_intervals" | "legacy_blocks" {
  return shouldUsePreciseIntervalsForBooking({ scheduleMode: args.scheduleMode })
    ? "precise_intervals"
    : "legacy_blocks";
}

export { normalizeTeacherScheduleMode, shouldUsePreciseIntervalsForBooking, mapDbRowsToNormalized };
