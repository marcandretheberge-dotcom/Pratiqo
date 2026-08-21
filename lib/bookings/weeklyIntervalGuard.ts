import {
  dayOfWeekForISODate,
  isTeacherScheduleIntervalsEnabled,
  mapDbRowsToNormalized,
  slotFitsWeeklyIntervals,
  type NormalizedWeeklyInterval,
} from "@/lib/schedule/weeklyIntervals";
import { slotStartMinutes } from "@/lib/slots";

/** Minimal admin surface for loading weekly intervals (service-role or test double). */
export type WeeklyIntervalAdmin = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string | boolean | number) => WeeklyIntervalFilter;
    };
  };
};

type WeeklyIntervalFilter = {
  eq: (column: string, value: string | boolean | number) => WeeklyIntervalFilter;
  then?: (
    resolve: (value: {
      data: Array<Record<string, unknown>> | null;
      error: { message?: string } | null;
    }) => unknown,
  ) => Promise<unknown>;
};

export async function loadTeacherWeeklyIntervals(
  admin: WeeklyIntervalAdmin,
  teacherId: string,
): Promise<{ ok: true; intervals: NormalizedWeeklyInterval[] } | { ok: false; error: "server_error" }> {
  const query = admin
    .from("teacher_weekly_availability_intervals")
    .select("day_of_week, start_time, end_time, is_active")
    .eq("teacher_id", teacherId)
    .eq("is_active", true);

  const result = (await Promise.resolve(
    query as unknown as PromiseLike<{
      data: Array<{
        day_of_week?: number | null;
        start_time?: string | null;
        end_time?: string | null;
        is_active?: boolean | null;
      }> | null;
      error: { message?: string } | null;
    }>,
  )) as {
    data: Array<{
      day_of_week?: number | null;
      start_time?: string | null;
      end_time?: string | null;
      is_active?: boolean | null;
    }> | null;
    error: { message?: string } | null;
  };

  if (result.error) {
    return { ok: false, error: "server_error" };
  }
  return { ok: true, intervals: mapDbRowsToNormalized(result.data ?? []) };
}

/**
 * When ENABLE_TEACHER_SCHEDULE_INTERVALS is ON, the booking must fit a weekly interval.
 * Returns null when the check passes or the flag is OFF.
 */
export async function rejectIfOutsideWeeklyIntervals(args: {
  admin: WeeklyIntervalAdmin;
  teacherId: string;
  slotDate: string;
  timeSlot: string;
  durationMinutes: number;
}): Promise<{ error: "slot_outside_teacher_availability" | "server_error"; status: number } | null> {
  if (!isTeacherScheduleIntervalsEnabled()) return null;

  const loaded = await loadTeacherWeeklyIntervals(args.admin, args.teacherId);
  if (!loaded.ok) return { error: "server_error", status: 500 };

  const dayOfWeek = dayOfWeekForISODate(args.slotDate);
  const startMin = slotStartMinutes(args.timeSlot);
  if (dayOfWeek == null || startMin < 0) {
    return { error: "slot_outside_teacher_availability", status: 409 };
  }

  // Flag ON + no intervals configured → no bookable slots from legacy blocks.
  if (loaded.intervals.length === 0) {
    return { error: "slot_outside_teacher_availability", status: 409 };
  }

  if (!slotFitsWeeklyIntervals(dayOfWeek, startMin, args.durationMinutes, loaded.intervals)) {
    return { error: "slot_outside_teacher_availability", status: 409 };
  }
  return null;
}
