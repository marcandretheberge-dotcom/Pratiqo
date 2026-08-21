/**
 * Weekly recurring copy helpers for interactive schedule cells (UX polish).
 * Copy updates local draft state only — never persists until Save.
 */

import {
  copyDaypartToAllWeekdays,
  copyDaypartToWeekdays,
  replaceDaypartIntervals,
  type ScheduleDaypart,
} from "@/lib/schedule/dayparts";
import type { WeeklyIntervalInput } from "@/lib/schedule/weeklyIntervals";

export type ScheduleCellCopyTarget = "same_weekday" | "weekdays" | "every_day";

export function applyScheduleCellCopy(args: {
  all: WeeklyIntervalInput[];
  sourceDayOfWeek: number;
  daypart: ScheduleDaypart;
  cellIntervals: WeeklyIntervalInput[];
  target: ScheduleCellCopyTarget;
}): WeeklyIntervalInput[] {
  const { all, sourceDayOfWeek, daypart, cellIntervals, target } = args;
  if (target === "same_weekday") {
    return replaceDaypartIntervals(all, sourceDayOfWeek, daypart, cellIntervals);
  }
  if (target === "weekdays") {
    return copyDaypartToWeekdays(all, daypart, cellIntervals);
  }
  return copyDaypartToAllWeekdays(all, sourceDayOfWeek, daypart, cellIntervals);
}
