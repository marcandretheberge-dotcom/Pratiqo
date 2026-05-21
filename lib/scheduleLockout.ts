import { LATE_CANCEL_HOURS } from "@/lib/bookingCancellation";
import { PERIODS, type PeriodKey } from "@/lib/slots";

export type ScheduleLockPeriod = PeriodKey | "all";

const MS_PER_HOUR = 60 * 60 * 1000;

function localDateTimeFromIsoAndMinutes(isoDate: string, minutesFromMidnight: number): Date | null {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const minutes = Math.max(0, Math.floor(minutesFromMidnight));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Date(y, m - 1, d, hours, mins, 0, 0);
}

export function schedulePeriodStartMinutes(period: ScheduleLockPeriod): number {
  if (period === "all") return 0;
  return PERIODS[period].start * 60;
}

export function isScheduleEditLockedByNotice(
  isoDate: string,
  period: ScheduleLockPeriod,
  now: Date = new Date(),
): boolean {
  const start = localDateTimeFromIsoAndMinutes(isoDate, schedulePeriodStartMinutes(period));
  if (!start) return true;
  const diffMs = start.getTime() - now.getTime();
  return diffMs < LATE_CANCEL_HOURS * MS_PER_HOUR;
}
