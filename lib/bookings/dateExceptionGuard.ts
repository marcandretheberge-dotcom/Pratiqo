import {
  findExceptionForDate,
  isTeacherScheduleExceptionsEnabled,
  mapDbRowsToExceptions,
  slotFitsCustomExceptionHours,
  type NormalizedScheduleException,
} from "@/lib/schedule/dateExceptions";
import { slotStartMinutes } from "@/lib/slots";

/** Minimal admin surface for loading date exceptions. */
export type DateExceptionAdmin = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string | boolean | number) => DateExceptionFilter;
    };
  };
};

type DateExceptionFilter = {
  eq: (column: string, value: string | boolean | number) => DateExceptionFilter;
  gte?: (column: string, value: string) => DateExceptionFilter;
  lte?: (column: string, value: string) => DateExceptionFilter;
  then?: (
    resolve: (value: {
      data: Array<Record<string, unknown>> | null;
      error: { message?: string } | null;
    }) => unknown,
  ) => Promise<unknown>;
};

export async function loadTeacherScheduleExceptionsForDate(
  admin: DateExceptionAdmin,
  teacherId: string,
  slotDate: string,
): Promise<{ ok: true; exception: NormalizedScheduleException | null } | { ok: false; error: "server_error" }> {
  const query = admin
    .from("teacher_schedule_exceptions")
    .select("exception_date, exception_type, start_time, end_time, note, is_active")
    .eq("teacher_id", teacherId)
    .eq("exception_date", slotDate)
    .eq("is_active", true);

  const result = (await Promise.resolve(
    query as unknown as PromiseLike<{
      data: Array<{
        exception_date?: string | null;
        exception_type?: string | null;
        start_time?: string | null;
        end_time?: string | null;
        note?: string | null;
        is_active?: boolean | null;
      }> | null;
      error: { message?: string } | null;
    }>,
  )) as {
    data: Array<{
      exception_date?: string | null;
      exception_type?: string | null;
      start_time?: string | null;
      end_time?: string | null;
      note?: string | null;
      is_active?: boolean | null;
    }> | null;
    error: { message?: string } | null;
  };

  if (result.error) {
    return { ok: false, error: "server_error" };
  }
  const exceptions = mapDbRowsToExceptions(result.data ?? []);
  return { ok: true, exception: findExceptionForDate(exceptions, slotDate) };
}

/**
 * Apply date exceptions when ENABLE_TEACHER_SCHEDULE_EXCEPTIONS is ON.
 *
 * - unavailable_full_day → reject
 * - available_custom_hours → require slot inside custom hours; skip weekly intervals
 * - no exception → continue with weekly/legacy checks
 */
export async function applyDateExceptionToBooking(args: {
  admin: DateExceptionAdmin;
  teacherId: string;
  slotDate: string;
  timeSlot: string;
  durationMinutes: number;
}): Promise<
  | { ok: true; skipWeeklyIntervals: boolean }
  | {
      ok: false;
      status: number;
      error: "teacher_unavailable_on_date" | "slot_outside_teacher_exception_hours" | "server_error";
    }
> {
  if (!isTeacherScheduleExceptionsEnabled()) {
    return { ok: true, skipWeeklyIntervals: false };
  }

  const loaded = await loadTeacherScheduleExceptionsForDate(args.admin, args.teacherId, args.slotDate);
  if (!loaded.ok) return { ok: false, status: 500, error: "server_error" };

  const ex = loaded.exception;
  if (!ex) return { ok: true, skipWeeklyIntervals: false };

  if (ex.exceptionType === "unavailable_full_day") {
    return { ok: false, status: 409, error: "teacher_unavailable_on_date" };
  }

  const startMin = slotStartMinutes(args.timeSlot);
  if (startMin < 0 || !slotFitsCustomExceptionHours(startMin, args.durationMinutes, ex)) {
    return { ok: false, status: 409, error: "slot_outside_teacher_exception_hours" };
  }

  return { ok: true, skipWeeklyIntervals: true };
}
