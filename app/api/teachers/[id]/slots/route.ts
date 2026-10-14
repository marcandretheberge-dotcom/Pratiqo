import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  bookedIntervalsFromRows,
  generateBookableSlotsForTeacherDay,
  mapDbRowsToExceptions,
  mapDbRowsToNormalized,
} from "@/lib/bookings/bookableSlotsForDay";
import { defaultLessonDurationMinutes } from "@/lib/teacherSlotQueries";
import { isValidLessonDurationMinutes } from "@/lib/pricing/lessonDuration";
import { dateInTeacherTimeZone } from "@/lib/timezones";
import { isTeacherScheduleExceptionsEnabled } from "@/lib/schedule/dateExceptions";
import { isTeacherPreciseScheduleBookingEnabled } from "@/lib/schedule/preciseScheduleActivation";
import {
  holdRowsToBookedIntervals,
  listActiveHoldsForTeacherDay,
} from "@/lib/offers/plannedPackageHoldQueries";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: teacherId } = await ctx.params;
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Paramètre date requis (YYYY-MM-DD)." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: teacher, error: tErr } = await admin
      .from("teachers")
      .select(
        "id, timezone, availability, default_lesson_duration_minutes, available_from_date, booking_buffer_before_minutes, booking_buffer_after_minutes, schedule_mode",
      )
      .eq("id", teacherId)
      .maybeSingle();

    if (tErr) throw new Error("teacher_calendar_lookup_failed");
    if (!teacher) {
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    }
    if (date < dateInTeacherTimeZone(new Date(), teacher.timezone)) {
      return NextResponse.json({ error: "Date passée." }, { status: 400 });
    }

    const durationParam = url.searchParams.get("duration");
    const parsedDur = durationParam != null ? Number(durationParam) : NaN;
    const durationMinutes =
      Number.isFinite(parsedDur) && isValidLessonDurationMinutes(parsedDur)
        ? Math.round(parsedDur)
        : defaultLessonDurationMinutes(
            (teacher as { default_lesson_duration_minutes?: number | null }).default_lesson_duration_minutes,
          );

    const { data: bookedRows, error: bookedError } = await admin
      .from("bookings")
      .select("time_slot, duration_minutes")
      .eq("teacher_id", teacherId)
      .eq("slot_date", date)
      .in("status", ["pending_payment", "confirmed"])
      .not("time_slot", "is", null);
    if (bookedError) throw new Error("booking_calendar_lookup_failed");

    const { bookedSlots, bookedIntervals } = bookedIntervalsFromRows(
      (bookedRows || []) as { time_slot?: string; duration_minutes?: number | null }[],
    );

    const activeHolds = await listActiveHoldsForTeacherDay({
      admin,
      teacherId,
      slotDate: date,
      timeZone: teacher.timezone,
    });
    const holdIntervals = holdRowsToBookedIntervals(activeHolds, teacher.timezone);
    const mergedBookedIntervals = [...bookedIntervals, ...holdIntervals];

    const { data: blockedRows, error: blockedError } = await admin
      .from("blocked_slots")
      .select("period, start_time, end_time")
      .eq("teacher_id", teacherId)
      .eq("blocked_date", date);
    if (blockedError) throw new Error("blocked_calendar_lookup_failed");

    let weeklyIntervals = mapDbRowsToNormalized([]);
    const { data: intervalRows, error: intervalError } = await admin
      .from("teacher_weekly_availability_intervals")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("teacher_id", teacherId)
      .eq("is_active", true);
    if (intervalError) throw new Error("weekly_calendar_lookup_failed");
    weeklyIntervals = mapDbRowsToNormalized(intervalRows ?? []);

    let exceptions = mapDbRowsToExceptions([]);
    if (isTeacherScheduleExceptionsEnabled()) {
      const { data: exceptionRows, error: exceptionError } = await admin
        .from("teacher_schedule_exceptions")
        .select("exception_date, exception_type, start_time, end_time, is_active")
        .eq("teacher_id", teacherId)
        .eq("exception_date", date)
        .eq("is_active", true);
      if (exceptionError) throw new Error("exception_calendar_lookup_failed");
      exceptions = mapDbRowsToExceptions(exceptionRows ?? []);
    }

    const day = generateBookableSlotsForTeacherDay({
      date,
      durationMinutes,
      teacher: teacher as {
        availability?: unknown;
        available_from_date?: string | null;
        schedule_mode?: string | null;
        booking_buffer_before_minutes?: number | null;
        booking_buffer_after_minutes?: number | null;
      },
      weeklyIntervals,
      exceptions,
      bookedSlots,
      bookedIntervals: mergedBookedIntervals,
      blockedDayRows: (blockedRows || []) as {
        period: string | null;
        start_time?: string | null;
        end_time?: string | null;
      }[],
      preciseBookingEnabled: isTeacherPreciseScheduleBookingEnabled(),
    });

    if (day.blockedReasons.includes("before_available_from")) {
      return NextResponse.json({
        slots: [],
        durationMinutes: day.durationMinutes,
        date,
        availableFromDate: day.availableFromDate,
        error: "teacher_not_available_yet",
      });
    }

    if (day.exceptionType === "unavailable_full_day") {
      return NextResponse.json({
        slots: [],
        durationMinutes: day.durationMinutes,
        date,
        exceptionType: "unavailable_full_day",
      });
    }

    if (day.exceptionType === "available_custom_hours") {
      return NextResponse.json({
        slots: day.slots,
        durationMinutes: day.durationMinutes,
        date,
        exceptionType: "available_custom_hours",
      });
    }

    if (day.source === "precise_intervals") {
      return NextResponse.json({
        slots: day.slots,
        durationMinutes: day.durationMinutes,
        date,
        preciseIntervals: true,
        hasWeeklyIntervals: weeklyIntervals.length > 0,
        scheduleMode: day.scheduleMode,
      });
    }

    return NextResponse.json({ slots: day.slots, durationMinutes: day.durationMinutes, date });
  } catch (e) {
    console.error("[teachers/slots]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
