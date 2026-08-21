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

/** Max stacked pills before summarizing overflow as "+N plages". */
export const CELL_INTERVAL_PILL_MAX = 2;

export type CellIntervalDisplay = {
  lines: string[];
  visible: string[];
  overflow: number;
};

export function formatCellIntervalDisplay(
  intervals: WeeklyIntervalInput[],
  maxVisible: number = CELL_INTERVAL_PILL_MAX,
): CellIntervalDisplay {
  const lines = formatCellIntervalLines(intervals);
  if (lines.length <= maxVisible) {
    return { lines, visible: lines, overflow: 0 };
  }
  return {
    lines,
    visible: lines.slice(0, maxVisible - 1),
    overflow: lines.length - (maxVisible - 1),
  };
}

export function cellConfiguredCountKey(count: number): "scheduleCellCountNone" | "scheduleCellCountOne" | "scheduleCellCountMany" {
  if (count <= 0) return "scheduleCellCountNone";
  if (count === 1) return "scheduleCellCountOne";
  return "scheduleCellCountMany";
}

export function cellOverflowCountKey(count: number): "scheduleCellOverflowOne" | "scheduleCellOverflowMany" {
  return count === 1 ? "scheduleCellOverflowOne" : "scheduleCellOverflowMany";
}
