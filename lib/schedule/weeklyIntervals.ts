/**
 * Precise teacher weekly availability intervals (PR 17A).
 *
 * day_of_week: 0 = Sunday … 6 = Saturday (Date#getDay / JS_DOW_TO_KEY).
 * Times are local wall-clock minutes from midnight, same convention as
 * formatLocalISODate / slot labels ("9h00"). No overnight intervals.
 *
 * Feature flags:
 * - ENABLE_TEACHER_SCHEDULE_INTERVALS — server slot gen + booking guards
 * - NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERVALS — teacher schedule UI
 *
 * When server flag is OFF, legacy teachers.availability period blocks remain
 * the sole source of truth.
 */

import {
  type BlockedSlotDayRow,
  type BlockedTimeRange,
  type BookedSlotInterval,
  type GenerateSlotsOptions,
  type GetAvailableDaysOptions,
  DAY_KEYS,
  JS_DOW_TO_KEY,
  blockedPeriodsFromRows,
  blockedTimeRangesFromRows,
  expandBookingInterval,
  formatLocalISODate,
  formatSlotLabel,
  intervalsOverlap,
  parseHHMMToMinutes,
  slotStartMinutes,
  type DayKey,
} from "@/lib/slots";

export const TEACHER_SCHEDULE_INTERVALS_FLAG = "ENABLE_TEACHER_SCHEDULE_INTERVALS";
export const TEACHER_SCHEDULE_INTERVALS_UI_FLAG = "NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERVALS";

export function isTeacherScheduleIntervalsEnabled(): boolean {
  return process.env.ENABLE_TEACHER_SCHEDULE_INTERVALS === "true";
}

export function isTeacherScheduleIntervalsUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEACHER_SCHEDULE_INTERVALS === "true";
}

/** 15-minute granularity for interval editors and generated slots. */
export const WEEKLY_INTERVAL_STEP_MINUTES = 15;

export type WeeklyIntervalInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type WeeklyIntervalRow = WeeklyIntervalInput & {
  id?: string;
  isActive?: boolean;
};

export type NormalizedWeeklyInterval = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
};

export type WeeklyIntervalValidationError =
  | "invalid_day"
  | "invalid_time"
  | "end_before_or_equal_start"
  | "not_quarter_hour"
  | "overnight_not_allowed"
  | "overlapping_intervals"
  | "duplicate_interval";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function minutesToHHMM(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function dayOfWeekToDayKey(dayOfWeek: number): DayKey | null {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return null;
  return JS_DOW_TO_KEY[dayOfWeek] ?? null;
}

export function dayKeyToDayOfWeek(dayKey: string): number | null {
  const idx = JS_DOW_TO_KEY.indexOf(dayKey as DayKey);
  return idx >= 0 ? idx : null;
}

/** Local YYYY-MM-DD → day_of_week (0=Sunday). */
export function dayOfWeekForISODate(isoDate: string): number | null {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getDay();
}

export function isQuarterHourMinutes(min: number): boolean {
  return Number.isInteger(min) && min % WEEKLY_INTERVAL_STEP_MINUTES === 0;
}

export function normalizeWeeklyInterval(
  input: WeeklyIntervalInput,
): { ok: true; value: NormalizedWeeklyInterval } | { ok: false; error: WeeklyIntervalValidationError } {
  const dayOfWeek = Number(input.dayOfWeek);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { ok: false, error: "invalid_day" };
  }
  const startMin = parseHHMMToMinutes(input.startTime);
  const endMin = parseHHMMToMinutes(input.endTime);
  if (startMin == null || endMin == null) {
    return { ok: false, error: "invalid_time" };
  }
  if (endMin <= startMin) {
    // Includes overnight (end wraps past midnight).
    return { ok: false, error: endMin < startMin ? "overnight_not_allowed" : "end_before_or_equal_start" };
  }
  if (!isQuarterHourMinutes(startMin) || !isQuarterHourMinutes(endMin)) {
    return { ok: false, error: "not_quarter_hour" };
  }
  return {
    ok: true,
    value: {
      dayOfWeek,
      startMin,
      endMin,
      startTime: minutesToHHMM(startMin),
      endTime: minutesToHHMM(endMin),
    },
  };
}

/**
 * Validate a full weekly set: no duplicates, no overlaps within the same day.
 * Returns normalized sorted intervals or the first error.
 */
export function validateWeeklyIntervalSet(
  inputs: WeeklyIntervalInput[],
):
  | { ok: true; intervals: NormalizedWeeklyInterval[] }
  | { ok: false; error: WeeklyIntervalValidationError; index?: number } {
  const normalized: NormalizedWeeklyInterval[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const result = normalizeWeeklyInterval(inputs[i]!);
    if (!result.ok) return { ok: false, error: result.error, index: i };
    normalized.push(result.value);
  }

  const seen = new Set<string>();
  for (const iv of normalized) {
    const key = `${iv.dayOfWeek}|${iv.startTime}|${iv.endTime}`;
    if (seen.has(key)) return { ok: false, error: "duplicate_interval" };
    seen.add(key);
  }

  const byDay = new Map<number, NormalizedWeeklyInterval[]>();
  for (const iv of normalized) {
    const list = byDay.get(iv.dayOfWeek) ?? [];
    list.push(iv);
    byDay.set(iv.dayOfWeek, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]!;
      const cur = list[i]!;
      if (prev.startMin < cur.endMin && cur.startMin < prev.endMin) {
        return { ok: false, error: "overlapping_intervals" };
      }
    }
  }

  normalized.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMin - b.startMin);
  return { ok: true, intervals: normalized };
}

/** Lesson [startMin, startMin+duration) must lie entirely inside one interval. */
export function slotFitsWeeklyIntervals(
  dayOfWeek: number,
  startMin: number,
  durationMinutes: number,
  intervals: NormalizedWeeklyInterval[],
): boolean {
  if (!Number.isFinite(startMin) || startMin < 0) return false;
  const duration = Math.max(1, Math.floor(durationMinutes || 0));
  const endMin = startMin + duration;
  return intervals.some(
    (iv) => iv.dayOfWeek === dayOfWeek && startMin >= iv.startMin && endMin <= iv.endMin,
  );
}

function slotOverlapsBlockedRange(
  slot: string,
  durationMinutes: number,
  rangeStart: number,
  rangeEnd: number,
): boolean {
  const slotStart = slotStartMinutes(slot);
  if (slotStart < 0) return false;
  const slotEnd = slotStart + durationMinutes;
  return slotStart < rangeEnd && slotEnd > rangeStart;
}

/**
 * Generate bookable slot labels from weekly intervals for one calendar day.
 * Reuses buffer / booked / blocked-range rules from legacy generateSlots.
 */
export function generateSlotsFromWeeklyIntervals(
  dayOfWeek: number,
  intervals: NormalizedWeeklyInterval[],
  durationMinutes: number,
  bookedSlots: string[],
  blockedPeriods: string[],
  blockedTimeRanges: BlockedTimeRange[] = [],
  options: GenerateSlotsOptions = {},
): string[] {
  if (blockedPeriods.includes("all")) return [];
  const dayIntervals = intervals
    .filter((iv) => iv.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startMin - b.startMin);
  if (dayIntervals.length === 0) return [];

  const bufferBeforeMin = Math.max(0, Math.floor(options.bufferBeforeMin ?? 0));
  const bufferAfterMin = Math.max(0, Math.floor(options.bufferAfterMin ?? 0));
  const useBufferAware = bufferBeforeMin > 0 || bufferAfterMin > 0;
  const bookedIntervals: BookedSlotInterval[] = useBufferAware ? options.bookedIntervals ?? [] : [];

  const slots: string[] = [];
  const step = WEEKLY_INTERVAL_STEP_MINUTES;
  for (const iv of dayIntervals) {
    let timeMinutes = iv.startMin;
    while (timeMinutes + durationMinutes <= iv.endMin) {
      const hours = Math.floor(timeMinutes / 60);
      const mins = timeMinutes % 60;
      const slot = formatSlotLabel(hours, mins);
      if (bookedSlots.includes(slot)) {
        timeMinutes += step;
        continue;
      }
      if (blockedTimeRanges.some((br) => slotOverlapsBlockedRange(slot, durationMinutes, br.start, br.end))) {
        timeMinutes += step;
        continue;
      }
      if (useBufferAware) {
        const candidate = expandBookingInterval(timeMinutes, durationMinutes, bufferBeforeMin, bufferAfterMin);
        const conflicts = bookedIntervals.some((b) => {
          const existing = expandBookingInterval(b.startMin, b.durationMin, bufferBeforeMin, bufferAfterMin);
          return intervalsOverlap(candidate, existing);
        });
        if (conflicts) {
          timeMinutes += step;
          continue;
        }
      }
      slots.push(slot);
      timeMinutes += step;
    }
  }

  slots.sort((a, b) => slotStartMinutes(a) - slotStartMinutes(b));
  return slots;
}

/**
 * Derive legacy coarse "Lun Matin" strings so search filters still work
 * when teachers save precise intervals (best-effort mapping to period windows).
 */
export function intervalsToCoarseAvailabilityStrings(
  intervals: NormalizedWeeklyInterval[],
): string[] {
  const PERIOD_WINDOWS: Array<{ label: string; start: number; end: number }> = [
    { label: "Matin", start: 8 * 60, end: 12 * 60 },
    { label: "Après-midi", start: 12 * 60, end: 17 * 60 },
    { label: "Soir", start: 17 * 60, end: 21 * 60 },
  ];
  const FR_DAY: Record<number, string> = {
    0: "Dim",
    1: "Lun",
    2: "Mar",
    3: "Mer",
    4: "Jeu",
    5: "Ven",
    6: "Sam",
  };
  const out = new Set<string>();
  for (const iv of intervals) {
    const dayFr = FR_DAY[iv.dayOfWeek];
    if (!dayFr) continue;
    for (const period of PERIOD_WINDOWS) {
      if (iv.startMin < period.end && period.start < iv.endMin) {
        out.add(`${dayFr} ${period.label}`);
      }
    }
  }
  return Array.from(out);
}

export function mapDbRowsToNormalized(
  rows: Array<{
    day_of_week?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    is_active?: boolean | null;
  }>,
): NormalizedWeeklyInterval[] {
  const inputs: WeeklyIntervalInput[] = [];
  for (const row of rows) {
    if (row.is_active === false) continue;
    const start = String(row.start_time ?? "").slice(0, 5);
    const end = String(row.end_time ?? "").slice(0, 5);
    if (row.day_of_week == null || !start || !end) continue;
    inputs.push({ dayOfWeek: Number(row.day_of_week), startTime: start, endTime: end });
  }
  const validated = validateWeeklyIntervalSet(inputs);
  return validated.ok ? validated.intervals : [];
}

export function activeDayKeysFromIntervals(intervals: NormalizedWeeklyInterval[]): DayKey[] {
  const keys = new Set<DayKey>();
  for (const iv of intervals) {
    const key = dayOfWeekToDayKey(iv.dayOfWeek);
    if (key) keys.add(key);
  }
  return DAY_KEYS.filter((k) => keys.has(k));
}

/** Mirror of getAvailableDays using precise weekly intervals. */
export function getAvailableDaysFromWeeklyIntervals(
  intervals: NormalizedWeeklyInterval[],
  durationMinutes: number,
  bookedByDate: Record<string, string[]>,
  blockedByDate: Record<string, BlockedSlotDayRow[]>,
  weeks = 4,
  options: GetAvailableDaysOptions = {},
): Record<string, number> {
  const result: Record<string, number> = {};
  if (intervals.length === 0) return result;

  const daysTotal = Math.max(1, weeks) * 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const bufferBeforeMin = Math.max(0, Math.floor(options.bufferBeforeMin ?? 0));
  const bufferAfterMin = Math.max(0, Math.floor(options.bufferAfterMin ?? 0));
  const bookedIntervalsByDate = options.bookedIntervalsByDate ?? {};

  for (let i = 0; i < daysTotal; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = formatLocalISODate(date);
    const dayOfWeek = date.getDay();
    const booked = bookedByDate[dateStr] || [];
    const blockedRows = blockedByDate[dateStr] || [];
    const blocked = blockedPeriodsFromRows(blockedRows);
    const ranges = blockedTimeRangesFromRows(blockedRows);
    const slots = generateSlotsFromWeeklyIntervals(
      dayOfWeek,
      intervals,
      durationMinutes,
      booked,
      blocked,
      ranges,
      {
        bookedIntervals: bookedIntervalsByDate[dateStr] ?? [],
        bufferBeforeMin,
        bufferAfterMin,
      },
    );
    if (slots.length > 0) result[dateStr] = slots.length;
  }

  return result;
}
