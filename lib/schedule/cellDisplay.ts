/**
 * Display helpers for interactive schedule cells.
 */

import type { WeeklyIntervalInput } from "@/lib/schedule/weeklyIntervals";

export function formatIntervalRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

export function formatCellIntervalLines(intervals: WeeklyIntervalInput[]): string[] {
  return [...intervals]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((iv) => formatIntervalRange(iv.startTime, iv.endTime));
}

export function cellConfiguredCountKey(count: number): "scheduleCellCountNone" | "scheduleCellCountOne" | "scheduleCellCountMany" {
  if (count <= 0) return "scheduleCellCountNone";
  if (count === 1) return "scheduleCellCountOne";
  return "scheduleCellCountMany";
}
