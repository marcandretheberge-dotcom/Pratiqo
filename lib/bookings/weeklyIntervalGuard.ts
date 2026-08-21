import {
  evaluatePreciseIntervalSlotFit,
  shouldUsePreciseIntervalsForBooking,
} from "@/lib/bookings/teacherScheduleEligibility";
import {
  isTeacherPreciseScheduleBookingEnabled,
  normalizeTeacherScheduleMode,
  type TeacherScheduleMode,
} from "@/lib/schedule/preciseScheduleActivation";
import {
  mapDbRowsToNormalized,
  type NormalizedWeeklyInterval,
} from "@/lib/schedule/weeklyIntervals";

/** Minimal admin surface for loading weekly intervals (service-role or test double). */
export type WeeklyIntervalAdmin = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string | boolean | number) => WeeklyIntervalFilter;
      maybeSingle?: () => PromiseLike<{
        data: Record<string, unknown> | null;
        error: { message?: string } | null;
      }>;
    };
  };
};

type WeeklyIntervalFilter = {
  eq: (column: string, value: string | boolean | number) => WeeklyIntervalFilter;
  maybeSingle?: () => PromiseLike<{
    data: Record<string, unknown> | null;
    error: { message?: string } | null;
  }>;
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

export async function loadTeacherScheduleMode(
  admin: WeeklyIntervalAdmin,
  teacherId: string,
): Promise<{ ok: true; scheduleMode: TeacherScheduleMode } | { ok: false; error: "server_error" }> {
  const query = admin.from("teachers").select("schedule_mode").eq("id", teacherId);
  const maybeSingle = (query as WeeklyIntervalFilter).maybeSingle;
  if (!maybeSingle) {
    // Test doubles may return rows via thenable; treat missing as legacy.
    return { ok: true, scheduleMode: "legacy_blocks" };
  }
  const result = await maybeSingle.call(query);
  if (result.error) {
    return { ok: false, error: "server_error" };
  }
  return {
    ok: true,
    scheduleMode: normalizeTeacherScheduleMode(result.data?.schedule_mode),
  };
}

/**
 * Enforce precise weekly intervals when they are the booking source of truth.
 * Returns null when the check passes or precise intervals are not required.
 */
export async function rejectIfOutsideWeeklyIntervals(args: {
  admin: WeeklyIntervalAdmin;
  teacherId: string;
  slotDate: string;
  timeSlot: string;
  durationMinutes: number;
  /** When provided, skips an extra teachers row fetch. */
  scheduleMode?: TeacherScheduleMode | string | null;
}): Promise<{ error: "slot_outside_teacher_availability" | "server_error"; status: number } | null> {
  const preciseBookingEnabled = isTeacherPreciseScheduleBookingEnabled();
  let scheduleMode: TeacherScheduleMode = "legacy_blocks";

  // Only load per-teacher mode when the precise-booking flag is ON.
  if (preciseBookingEnabled) {
    if (args.scheduleMode !== undefined && args.scheduleMode !== null) {
      scheduleMode = normalizeTeacherScheduleMode(args.scheduleMode);
    } else {
      const loadedMode = await loadTeacherScheduleMode(args.admin, args.teacherId);
      if (!loadedMode.ok) return { error: "server_error", status: 500 };
      scheduleMode = loadedMode.scheduleMode;
    }
  }

  if (
    !shouldUsePreciseIntervalsForBooking({
      scheduleMode,
      preciseBookingEnabled,
    })
  ) {
    return null;
  }

  const loaded = await loadTeacherWeeklyIntervals(args.admin, args.teacherId);
  if (!loaded.ok) return { error: "server_error", status: 500 };

  const fit = evaluatePreciseIntervalSlotFit({
    slotDate: args.slotDate,
    timeSlot: args.timeSlot,
    durationMinutes: args.durationMinutes,
    intervals: loaded.intervals,
  });
  if (!fit.allowed) {
    return { error: fit.reason, status: fit.reason === "server_error" ? 500 : 409 };
  }
  return null;
}
