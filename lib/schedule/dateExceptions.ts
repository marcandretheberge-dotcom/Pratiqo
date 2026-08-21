/**
 * Date-specific teacher schedule exceptions (PR 17B).
 *
 * exception_date is a local calendar YYYY-MM-DD (same as bookings.slot_date).
 * Custom hours use local wall-clock minutes; no overnight ranges.
 *
 * Feature flags:
 * - ENABLE_TEACHER_SCHEDULE_EXCEPTIONS — server slot gen + booking guards
 * - NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_EXCEPTIONS — teacher Horaire UI
 */

import { parseHHMMToMinutes } from "@/lib/slots";
import {
  generateSlotsFromWeeklyIntervals,
  isQuarterHourMinutes,
  minutesToHHMM,
  WEEKLY_INTERVAL_STEP_MINUTES,
  type NormalizedWeeklyInterval,
} from "@/lib/schedule/weeklyIntervals";
import type { BlockedTimeRange, GenerateSlotsOptions } from "@/lib/slots";

export const TEACHER_SCHEDULE_EXCEPTIONS_FLAG = "ENABLE_TEACHER_SCHEDULE_EXCEPTIONS";
export const TEACHER_SCHEDULE_EXCEPTIONS_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_EXCEPTIONS";

export function isTeacherScheduleExceptionsEnabled(): boolean {
  return process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS === "true";
}

export function isTeacherScheduleExceptionsUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_EXCEPTIONS === "true";
}

export const EXCEPTION_TYPES = ["unavailable_full_day", "available_custom_hours"] as const;
export type ScheduleExceptionType = (typeof EXCEPTION_TYPES)[number];

export type ScheduleExceptionInput = {
  exceptionDate: string;
  exceptionType: ScheduleExceptionType;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
};

export type NormalizedScheduleException = {
  exceptionDate: string;
  exceptionType: ScheduleExceptionType;
  startMin: number | null;
  endMin: number | null;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

export type ScheduleExceptionValidationError =
  | "invalid_exception_date"
  | "invalid_exception_type"
  | "invalid_time_range"
  | "end_before_or_equal_start"
  | "overnight_not_allowed"
  | "not_quarter_hour"
  | "note_too_long"
  | "full_day_must_omit_times"
  | "custom_hours_require_times";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidExceptionDate(iso: string): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m! - 1 &&
    dt.getDate() === d &&
    !Number.isNaN(dt.getTime())
  );
}

export function normalizeScheduleException(
  input: ScheduleExceptionInput,
):
  | { ok: true; value: NormalizedScheduleException }
  | { ok: false; error: ScheduleExceptionValidationError } {
  const exceptionDate = String(input.exceptionDate ?? "").trim();
  if (!isValidExceptionDate(exceptionDate)) {
    return { ok: false, error: "invalid_exception_date" };
  }

  const exceptionType = input.exceptionType;
  if (!EXCEPTION_TYPES.includes(exceptionType)) {
    return { ok: false, error: "invalid_exception_type" };
  }

  let note: string | null = null;
  if (input.note != null && String(input.note).trim() !== "") {
    note = String(input.note).trim();
    if (note.length > 280) return { ok: false, error: "note_too_long" };
  }

  if (exceptionType === "unavailable_full_day") {
    if (input.startTime || input.endTime) {
      return { ok: false, error: "full_day_must_omit_times" };
    }
    return {
      ok: true,
      value: {
        exceptionDate,
        exceptionType,
        startMin: null,
        endMin: null,
        startTime: null,
        endTime: null,
        note,
      },
    };
  }

  const startRaw = String(input.startTime ?? "").trim();
  const endRaw = String(input.endTime ?? "").trim();
  if (!startRaw || !endRaw) {
    return { ok: false, error: "custom_hours_require_times" };
  }
  const startMin = parseHHMMToMinutes(startRaw);
  const endMin = parseHHMMToMinutes(endRaw);
  if (startMin == null || endMin == null) {
    return { ok: false, error: "invalid_time_range" };
  }
  if (endMin <= startMin) {
    return { ok: false, error: endMin < startMin ? "overnight_not_allowed" : "end_before_or_equal_start" };
  }
  if (!isQuarterHourMinutes(startMin) || !isQuarterHourMinutes(endMin)) {
    return { ok: false, error: "not_quarter_hour" };
  }

  return {
    ok: true,
    value: {
      exceptionDate,
      exceptionType,
      startMin,
      endMin,
      startTime: minutesToHHMM(startMin),
      endTime: minutesToHHMM(endMin),
      note,
    },
  };
}

export function mapDbRowsToExceptions(
  rows: Array<{
    exception_date?: string | null;
    exception_type?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    note?: string | null;
    is_active?: boolean | null;
  }>,
): NormalizedScheduleException[] {
  const out: NormalizedScheduleException[] = [];
  for (const row of rows) {
    if (row.is_active === false) continue;
    const date = String(row.exception_date ?? "").slice(0, 10);
    const type = row.exception_type as ScheduleExceptionType;
    const start = row.start_time != null ? String(row.start_time).slice(0, 5) : null;
    const end = row.end_time != null ? String(row.end_time).slice(0, 5) : null;
    const result = normalizeScheduleException({
      exceptionDate: date,
      exceptionType: type,
      startTime: start,
      endTime: end,
      note: row.note ?? null,
    });
    if (result.ok) out.push(result.value);
  }
  return out.sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate));
}

export function findExceptionForDate(
  exceptions: NormalizedScheduleException[],
  isoDate: string,
): NormalizedScheduleException | null {
  return exceptions.find((ex) => ex.exceptionDate === isoDate) ?? null;
}

/** Public DTO — never includes private note. */
export function toPublicExceptionSummary(ex: NormalizedScheduleException): {
  exceptionDate: string;
  exceptionType: ScheduleExceptionType;
  startTime: string | null;
  endTime: string | null;
} {
  return {
    exceptionDate: ex.exceptionDate,
    exceptionType: ex.exceptionType,
    startTime: ex.startTime,
    endTime: ex.endTime,
  };
}

export function slotFitsCustomExceptionHours(
  startMin: number,
  durationMinutes: number,
  ex: NormalizedScheduleException,
): boolean {
  if (ex.exceptionType !== "available_custom_hours") return false;
  if (ex.startMin == null || ex.endMin == null) return false;
  const duration = Math.max(1, Math.floor(durationMinutes || 0));
  const endMin = startMin + duration;
  return startMin >= ex.startMin && endMin <= ex.endMin;
}

/**
 * Generate slots for a date that has available_custom_hours.
 * Reuses weekly interval slot generator with a synthetic one-day interval.
 */
export function generateSlotsFromDateException(
  ex: NormalizedScheduleException,
  durationMinutes: number,
  bookedSlots: string[],
  blockedPeriods: string[],
  blockedTimeRanges: BlockedTimeRange[] = [],
  options: GenerateSlotsOptions = {},
): string[] {
  if (ex.exceptionType !== "available_custom_hours" || ex.startMin == null || ex.endMin == null) {
    return [];
  }
  // dayOfWeek unused for filtering when we pass a single synthetic interval matching any dow.
  const synthetic: NormalizedWeeklyInterval = {
    dayOfWeek: 0,
    startMin: ex.startMin,
    endMin: ex.endMin,
    startTime: ex.startTime!,
    endTime: ex.endTime!,
  };
  return generateSlotsFromWeeklyIntervals(
    0,
    [synthetic],
    durationMinutes,
    bookedSlots,
    blockedPeriods,
    blockedTimeRanges,
    options,
  );
}

export { WEEKLY_INTERVAL_STEP_MINUTES };
