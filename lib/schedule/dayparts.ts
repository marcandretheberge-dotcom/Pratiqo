/**
 * Daypart (Matin / Après-midi / Soir) boundaries for interactive schedule cells.
 * Aligns with PERIODS in lib/slots.ts (08–12 / 12–17 / 17–21).
 */

import { PERIODS, type PeriodKey } from "@/lib/slots";
import {
  minutesToHHMM,
  normalizeWeeklyInterval,
  validateWeeklyIntervalSet,
  type WeeklyIntervalInput,
} from "@/lib/schedule/weeklyIntervals";

export type ScheduleDaypart = PeriodKey; // matin | apresmidi | soir

export const SCHEDULE_DAYPARTS: readonly ScheduleDaypart[] = ["matin", "apresmidi", "soir"] as const;

export type DaypartBounds = { startMin: number; endMin: number; startTime: string; endTime: string };

export function daypartBounds(daypart: ScheduleDaypart): DaypartBounds {
  const p = PERIODS[daypart];
  const startMin = p.start * 60;
  const endMin = p.end * 60;
  return {
    startMin,
    endMin,
    startTime: minutesToHHMM(startMin),
    endTime: minutesToHHMM(endMin),
  };
}

/** Suggested default interval when opening an empty cell. */
export function daypartDefaultInterval(daypart: ScheduleDaypart): { startTime: string; endTime: string } {
  switch (daypart) {
    case "matin":
      return { startTime: "09:00", endTime: "11:00" };
    case "apresmidi":
      return { startTime: "13:00", endTime: "16:00" };
    case "soir":
      return { startTime: "18:00", endTime: "20:00" };
  }
}

export function slotLabelToDaypart(slot: "Matin" | "Après-midi" | "Soir"): ScheduleDaypart {
  if (slot === "Matin") return "matin";
  if (slot === "Après-midi") return "apresmidi";
  return "soir";
}

/** Interval fully inside daypart bounds (inclusive start, exclusive end edge matching PERIODS). */
export function intervalFitsDaypart(
  startTime: string,
  endTime: string,
  daypart: ScheduleDaypart,
): boolean {
  const n = normalizeWeeklyInterval({ dayOfWeek: 1, startTime, endTime });
  if (!n.ok) return false;
  const b = daypartBounds(daypart);
  return n.value.startMin >= b.startMin && n.value.endMin <= b.endMin;
}

/** Intervals for a weekday that overlap or sit inside a daypart window. */
export function intervalsForDaypart(
  intervals: WeeklyIntervalInput[],
  dayOfWeek: number,
  daypart: ScheduleDaypart,
): WeeklyIntervalInput[] {
  const b = daypartBounds(daypart);
  return intervals
    .filter((iv) => iv.dayOfWeek === dayOfWeek)
    .filter((iv) => {
      const n = normalizeWeeklyInterval(iv);
      if (!n.ok) return false;
      // Count interval as belonging to daypart if it fully fits inside.
      return n.value.startMin >= b.startMin && n.value.endMin <= b.endMin;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export type DaypartEditorValidationError =
  | "end_before_or_equal_start"
  | "overnight_not_allowed"
  | "overlapping_intervals"
  | "duplicate_interval"
  | "outside_daypart"
  | "invalid_time"
  | "empty_when_enabled";

/**
 * Validate draft intervals for one cell (same day + daypart).
 * When enabled=false, empty list is OK (cell cleared).
 */
export function validateDaypartIntervals(args: {
  dayOfWeek: number;
  daypart: ScheduleDaypart;
  enabled: boolean;
  intervals: Array<{ startTime: string; endTime: string }>;
}): { ok: true; intervals: WeeklyIntervalInput[] } | { ok: false; error: DaypartEditorValidationError } {
  const { dayOfWeek, daypart, enabled, intervals } = args;
  if (!enabled) {
    return { ok: true, intervals: [] };
  }
  if (intervals.length === 0) {
    return { ok: false, error: "empty_when_enabled" };
  }
  for (const iv of intervals) {
    if (!intervalFitsDaypart(iv.startTime, iv.endTime, daypart)) {
      const n = normalizeWeeklyInterval({ dayOfWeek, startTime: iv.startTime, endTime: iv.endTime });
      if (!n.ok) {
        if (n.error === "end_before_or_equal_start" || n.error === "overnight_not_allowed") {
          return { ok: false, error: n.error };
        }
        return { ok: false, error: "invalid_time" };
      }
      return { ok: false, error: "outside_daypart" };
    }
  }
  const mapped: WeeklyIntervalInput[] = intervals.map((iv) => ({
    dayOfWeek,
    startTime: iv.startTime,
    endTime: iv.endTime,
  }));
  const set = validateWeeklyIntervalSet(mapped);
  if (!set.ok) {
    return { ok: false, error: set.error as DaypartEditorValidationError };
  }
  // Return API-safe WeeklyIntervalInput only — never leak startMin/endMin into
  // client state. Those extras fail PUT Zod `.strict()` as invalid_payload.
  return {
    ok: true,
    intervals: set.intervals.map((iv) => ({
      dayOfWeek: iv.dayOfWeek,
      startTime: iv.startTime,
      endTime: iv.endTime,
    })),
  };
}

/**
 * Replace daypart intervals for one weekday; keep other days/dayparts.
 *
 * Invalid/stale intervals are dropped (not preserved). `intervalsForDaypart`
 * hides them from the cell UI, so keeping them here used to poison saves while
 * the teacher only saw valid ranges.
 */
export function replaceDaypartIntervals(
  all: WeeklyIntervalInput[],
  dayOfWeek: number,
  daypart: ScheduleDaypart,
  nextForCell: WeeklyIntervalInput[],
): WeeklyIntervalInput[] {
  const kept = all.filter((iv) => {
    const n = normalizeWeeklyInterval(iv);
    // Drop unparseable / invalid intervals — they cannot be shown or edited in a daypart cell.
    if (!n.ok) return false;
    if (iv.dayOfWeek !== dayOfWeek) return true;
    const b = daypartBounds(daypart);
    const inDaypart = n.value.startMin >= b.startMin && n.value.endMin <= b.endMin;
    return !inDaypart;
  });
  const cleanedNext = nextForCell.map((iv) => ({
    dayOfWeek: iv.dayOfWeek,
    startTime: iv.startTime,
    endTime: iv.endTime,
  }));
  return [...kept, ...cleanedNext].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  );
}

/** Copy cell intervals to the same daypart on every weekday (0–6). */
export function copyDaypartToAllWeekdays(
  all: WeeklyIntervalInput[],
  sourceDayOfWeek: number,
  daypart: ScheduleDaypart,
  cellIntervals: WeeklyIntervalInput[],
): WeeklyIntervalInput[] {
  let next = all;
  for (let dow = 0; dow <= 6; dow++) {
    const mapped = cellIntervals.map((iv) => ({
      dayOfWeek: dow,
      startTime: iv.startTime,
      endTime: iv.endTime,
    }));
    next = replaceDaypartIntervals(next, dow, daypart, mapped);
  }
  // Preserve source intent: copy uses source template for all days including source.
  void sourceDayOfWeek;
  return next;
}

/** Copy to Mon–Fri only (same daypart). */
export function copyDaypartToWeekdays(
  all: WeeklyIntervalInput[],
  daypart: ScheduleDaypart,
  cellIntervals: WeeklyIntervalInput[],
): WeeklyIntervalInput[] {
  let next = all;
  for (const dow of [1, 2, 3, 4, 5]) {
    const mapped = cellIntervals.map((iv) => ({
      dayOfWeek: dow,
      startTime: iv.startTime,
      endTime: iv.endTime,
    }));
    next = replaceDaypartIntervals(next, dow, daypart, mapped);
  }
  return next;
}

export function buildTimeOptionsForDaypart(daypart: ScheduleDaypart): string[] {
  const b = daypartBounds(daypart);
  const out: string[] = [];
  for (let m = b.startMin; m <= b.endMin; m += 15) {
    out.push(minutesToHHMM(m));
  }
  return out;
}

/**
 * Suggest a non-overlapping next interval after existing ones within the daypart.
 * Prefers a 30-minute gap then up to 60 minutes (or remaining daypart room).
 * Returns null when no safe interval fits.
 */
export function suggestNextDaypartInterval(
  daypart: ScheduleDaypart,
  existing: Array<{ startTime: string; endTime: string }>,
): { startTime: string; endTime: string } | null {
  const b = daypartBounds(daypart);
  let cursor = b.startMin;
  for (const iv of existing) {
    const n = normalizeWeeklyInterval({ dayOfWeek: 1, startTime: iv.startTime, endTime: iv.endTime });
    if (!n.ok) continue;
    cursor = Math.max(cursor, n.value.endMin + 30);
  }
  // Snap up to 15-minute grid.
  cursor = Math.ceil(cursor / 15) * 15;
  if (cursor >= b.endMin) return null;

  let end = Math.min(b.endMin, cursor + 60);
  end = Math.floor(end / 15) * 15;
  if (end <= cursor) return null;

  const candidate = { startTime: minutesToHHMM(cursor), endTime: minutesToHHMM(end) };
  if (!intervalFitsDaypart(candidate.startTime, candidate.endTime, daypart)) return null;

  const probe = validateDaypartIntervals({
    dayOfWeek: 1,
    daypart,
    enabled: true,
    intervals: [...existing, candidate],
  });
  if (!probe.ok) return null;
  return candidate;
}

/** Weekly editor title: "Dimanche matin — hebdomadaire" (never a calendar date). */
export function formatWeeklyScheduleCellTitle(dayLabel: string, partLabel: string, weeklyLabel: string): string {
  const day = dayLabel.trim();
  const part = partLabel.trim().toLowerCase();
  return `${day} ${part} — ${weeklyLabel}`;
}
