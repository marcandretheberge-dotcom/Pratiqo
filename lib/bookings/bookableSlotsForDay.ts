/**
 * Shared bookable-slot generation for learner BookingModal / slots API
 * and teacher availability preview.
 *
 * Timezone: uses local calendar date (YYYY-MM-DD) + wall-clock slot labels
 * ("9h00") — same convention as createPendingPaymentBooking / slots route.
 * Does not introduce a separate timezone system.
 */

import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";
import {
  normalizeTeacherScheduleMode,
  shouldUsePreciseIntervalsForBooking,
  type TeacherScheduleMode,
} from "@/lib/schedule/preciseScheduleActivation";
import {
  findExceptionForDate,
  generateSlotsFromDateException,
  isTeacherScheduleExceptionsEnabled,
  mapDbRowsToExceptions,
  resolveExceptionOverride,
  type NormalizedScheduleException,
} from "@/lib/schedule/dateExceptions";
import {
  dayOfWeekForISODate,
  generateSlotsFromWeeklyIntervals,
  mapDbRowsToNormalized,
  type NormalizedWeeklyInterval,
} from "@/lib/schedule/weeklyIntervals";
import { canBookTeacherOnDate, normalizeAvailableFromDate } from "@/lib/teachers/availabilityStartDate";
import {
  type BookedSlotInterval,
  type DayAvailability,
  blockedPeriodsFromRows,
  blockedTimeRangesFromRows,
  dayShortKeyForISODate,
  formatLocalISODate,
  generateSlots,
  slotStartMinutes,
  weeklyAvailabilityFromTeacherRows,
} from "@/lib/slots";
import { normalizeTeacherBufferSettings } from "@/lib/teacherSlotQueries";

export type BookableSlotSource =
  | "legacy_blocks"
  | "precise_intervals"
  | "exception_custom_hours"
  | "none";

export type BookableDayBlockedReason =
  | "before_available_from"
  | "exception_blocked"
  | "outside_precise_hours"
  | "precise_not_active"
  | "already_booked"
  | "locked_next_24h"
  | "no_availability";

export type BookableSlotsForDayInput = {
  date: string;
  durationMinutes: number;
  teacher: {
    availability?: unknown;
    available_from_date?: string | null;
    schedule_mode?: string | null;
    booking_buffer_before_minutes?: number | null;
    booking_buffer_after_minutes?: number | null;
  };
  /** Active weekly intervals (already filtered is_active). */
  weeklyIntervals: NormalizedWeeklyInterval[];
  /** Exceptions for this date only (notes stripped). */
  exceptions: NormalizedScheduleException[];
  bookedSlots: string[];
  bookedIntervals: BookedSlotInterval[];
  blockedDayRows: Array<{
    period: string | null;
    start_time?: string | null;
    end_time?: string | null;
  }>;
  now?: Date;
  /** When precise booking is ON and mode is legacy, surface precise_not_active. */
  preciseBookingEnabled?: boolean;
};

export type BookableSlotsForDayResult = {
  date: string;
  durationMinutes: number;
  slots: string[];
  source: BookableSlotSource;
  scheduleMode: TeacherScheduleMode;
  availableFromDate: string | null;
  exceptionType?: "unavailable_full_day" | "available_custom_hours";
  blockedReasons: BookableDayBlockedReason[];
  /** Slot count before 24h filter (after availability / conflict filtering). */
  slotCountBefore24hFilter: number;
};

function buildBookedIntervals(
  bookedRaw: Array<{ time_slot: string; duration_minutes?: number | null }>,
): BookedSlotInterval[] {
  const bookedIntervals: BookedSlotInterval[] = [];
  for (const r of bookedRaw) {
    const startMin = slotStartMinutes(r.time_slot);
    if (startMin < 0) continue;
    const rawDur = Number(r.duration_minutes);
    const durMin = Number.isFinite(rawDur) && rawDur > 0 ? Math.round(rawDur) : 60;
    bookedIntervals.push({ startMin, durationMin: durMin });
  }
  return bookedIntervals;
}

export function bookedIntervalsFromRows(
  bookedRaw: Array<{ time_slot?: string | null; duration_minutes?: number | null }>,
): { bookedSlots: string[]; bookedIntervals: BookedSlotInterval[] } {
  const cleaned = bookedRaw.filter(
    (r): r is { time_slot: string; duration_minutes?: number | null } => Boolean(r.time_slot),
  );
  return {
    bookedSlots: cleaned.map((r) => r.time_slot),
    bookedIntervals: buildBookedIntervals(cleaned),
  };
}

/**
 * Generate learner-visible bookable slots for one local calendar day.
 * Mirrors GET /api/teachers/[id]/slots (without HTTP / auth).
 */
export function generateBookableSlotsForTeacherDay(
  input: BookableSlotsForDayInput,
): BookableSlotsForDayResult {
  const now = input.now ?? new Date();
  const scheduleMode = normalizeTeacherScheduleMode(input.teacher.schedule_mode);
  const availableFromDate = normalizeAvailableFromDate(input.teacher.available_from_date);
  const durationMinutes = Math.max(1, Math.round(input.durationMinutes));
  const preciseBookingEnabled = input.preciseBookingEnabled === true;

  if (!canBookTeacherOnDate(availableFromDate, input.date)) {
    return {
      date: input.date,
      durationMinutes,
      slots: [],
      source: "none",
      scheduleMode,
      availableFromDate,
      blockedReasons: ["before_available_from"],
      slotCountBefore24hFilter: 0,
    };
  }

  const buffers = normalizeTeacherBufferSettings(input.teacher);
  const slotOptions = {
    bookedIntervals: input.bookedIntervals,
    bufferBeforeMin: buffers.bookingBufferBeforeMinutes,
    bufferAfterMin: buffers.bookingBufferAfterMinutes,
  };
  const blockedPeriods = blockedPeriodsFromRows(input.blockedDayRows);
  const blockedRanges = blockedTimeRangesFromRows(input.blockedDayRows);

  let rawSlots: string[] = [];
  let source: BookableSlotSource = "none";
  let exceptionType: BookableSlotsForDayResult["exceptionType"];

  if (isTeacherScheduleExceptionsEnabled() && input.exceptions.length > 0) {
    const exception = findExceptionForDate(input.exceptions, input.date);
    const override = resolveExceptionOverride({ exception, scheduleMode });
    if (override.kind === "unavailable_full_day") {
      return {
        date: input.date,
        durationMinutes,
        slots: [],
        source: "none",
        scheduleMode,
        availableFromDate,
        exceptionType: "unavailable_full_day",
        blockedReasons: ["exception_blocked"],
        slotCountBefore24hFilter: 0,
      };
    }
    if (override.kind === "available_custom_hours") {
      rawSlots = generateSlotsFromDateException(
        override.exception,
        durationMinutes,
        input.bookedSlots,
        blockedPeriods,
        blockedRanges,
        slotOptions,
      );
      source = "exception_custom_hours";
      exceptionType = "available_custom_hours";
    }
  }

  if (source === "none") {
    const usePrecise = shouldUsePreciseIntervalsForBooking({
      scheduleMode,
      preciseBookingEnabled: input.preciseBookingEnabled,
    });

    if (usePrecise) {
      const dayOfWeek = dayOfWeekForISODate(input.date) ?? 0;
      rawSlots = generateSlotsFromWeeklyIntervals(
        dayOfWeek,
        input.weeklyIntervals,
        durationMinutes,
        input.bookedSlots,
        blockedPeriods,
        blockedRanges,
        slotOptions,
      );
      source = "precise_intervals";
    } else {
      const weekly = weeklyAvailabilityFromTeacherRows(input.teacher.availability);
      const dayKey = dayShortKeyForISODate(input.date);
      const dayAvail: DayAvailability = weekly[dayKey] || {
        matin: false,
        apresmidi: false,
        soir: false,
      };
      rawSlots = generateSlots(
        dayAvail,
        durationMinutes,
        input.date,
        input.bookedSlots,
        blockedPeriods,
        blockedRanges,
        slotOptions,
      );
      source = "legacy_blocks";
    }
  }

  const slotCountBefore24hFilter = rawSlots.length;
  const slots = rawSlots.filter((slot) =>
    isBookingAtLeast24hAhead({ slot_date: input.date, time_slot: slot }, now),
  );

  const blockedReasons: BookableDayBlockedReason[] = [];
  if (slots.length === 0) {
    if (slotCountBefore24hFilter > 0) {
      blockedReasons.push("locked_next_24h");
    } else if (source === "precise_intervals") {
      if (input.weeklyIntervals.length === 0) {
        blockedReasons.push("outside_precise_hours");
      } else if (input.bookedSlots.length > 0) {
        // Heuristic: intervals exist but nothing generated — likely conflicts or duration unfit.
        const withoutBooked = generateSlotsFromWeeklyIntervals(
          dayOfWeekForISODate(input.date) ?? 0,
          input.weeklyIntervals,
          durationMinutes,
          [],
          blockedPeriods,
          blockedRanges,
          { ...slotOptions, bookedIntervals: [] },
        );
        if (withoutBooked.length > 0) {
          blockedReasons.push("already_booked");
        } else {
          blockedReasons.push("outside_precise_hours");
        }
      } else {
        blockedReasons.push("outside_precise_hours");
      }
    } else if (source === "legacy_blocks") {
      if (preciseBookingEnabled && scheduleMode === "legacy_blocks") {
        blockedReasons.push("precise_not_active");
      } else {
        blockedReasons.push("no_availability");
      }
    } else {
      blockedReasons.push("no_availability");
    }
  }

  return {
    date: input.date,
    durationMinutes,
    slots,
    source,
    scheduleMode,
    availableFromDate,
    exceptionType,
    blockedReasons,
    slotCountBefore24hFilter,
  };
}

/** Add N calendar days to a local YYYY-MM-DD (no UTC conversion). */
export function addLocalISODays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return formatLocalISODate(dt);
}

export { mapDbRowsToNormalized, mapDbRowsToExceptions, formatLocalISODate };
