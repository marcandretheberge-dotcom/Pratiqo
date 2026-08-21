import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  type BookedSlotInterval,
  blockedPeriodsFromRows,
  blockedTimeRangesFromRows,
  dayShortKeyForISODate,
  formatLocalISODate,
  generateSlots,
  slotStartMinutes,
  weeklyAvailabilityFromTeacherRows,
} from "@/lib/slots";
import { defaultLessonDurationMinutes, normalizeTeacherBufferSettings } from "@/lib/teacherSlotQueries";
import { isValidLessonDurationMinutes } from "@/lib/pricing/lessonDuration";
import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";
import { canBookTeacherOnDate, normalizeAvailableFromDate } from "@/lib/teachers/availabilityStartDate";
import {
  dayOfWeekForISODate,
  generateSlotsFromWeeklyIntervals,
  isTeacherScheduleIntervalsEnabled,
  mapDbRowsToNormalized,
} from "@/lib/schedule/weeklyIntervals";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: teacherId } = await ctx.params;
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Paramètre date requis (YYYY-MM-DD)." }, { status: 400 });
    }

    const today = formatLocalISODate(new Date());
    if (date < today) {
      return NextResponse.json({ error: "Date passée." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: teacher, error: tErr } = await admin
      .from("teachers")
      .select(
        "id, availability, default_lesson_duration_minutes, available_from_date, booking_buffer_before_minutes, booking_buffer_after_minutes",
      )
      .eq("id", teacherId)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    }

    const availableFromDate = normalizeAvailableFromDate(
      (teacher as { available_from_date?: string | null }).available_from_date,
    );
    if (!canBookTeacherOnDate(availableFromDate, date)) {
      return NextResponse.json({
        slots: [],
        durationMinutes: defaultLessonDurationMinutes(
          (teacher as { default_lesson_duration_minutes?: number | null }).default_lesson_duration_minutes,
        ),
        date,
        availableFromDate,
        error: "teacher_not_available_yet",
      });
    }

    const durationParam = url.searchParams.get("duration");
    const parsedDur = durationParam != null ? Number(durationParam) : NaN;
    const durationMinutes =
      Number.isFinite(parsedDur) && isValidLessonDurationMinutes(parsedDur)
        ? Math.round(parsedDur)
        : defaultLessonDurationMinutes(
            (teacher as { default_lesson_duration_minutes?: number | null }).default_lesson_duration_minutes,
          );
    const weekly = weeklyAvailabilityFromTeacherRows((teacher as { availability?: unknown }).availability);
    const buffers = normalizeTeacherBufferSettings(
      teacher as Parameters<typeof normalizeTeacherBufferSettings>[0],
    );
    const dayKey = dayShortKeyForISODate(date);
    const dayAvail = weekly[dayKey] || { matin: false, apresmidi: false, soir: false };

    const { data: bookedRows } = await admin
      .from("bookings")
      .select("time_slot, duration_minutes")
      .eq("teacher_id", teacherId)
      .eq("slot_date", date)
      .in("status", ["pending_payment", "confirmed"])
      .not("time_slot", "is", null);

    const bookedRaw = ((bookedRows || []) as { time_slot?: string; duration_minutes?: number | null }[]).filter(
      (r): r is { time_slot: string; duration_minutes?: number | null } => Boolean(r.time_slot),
    );
    const bookedSlots = bookedRaw.map((r) => r.time_slot);
    const bookedIntervals: BookedSlotInterval[] = [];
    for (const r of bookedRaw) {
      const startMin = slotStartMinutes(r.time_slot);
      if (startMin < 0) continue;
      const rawDur = Number(r.duration_minutes);
      const durMin = Number.isFinite(rawDur) && rawDur > 0 ? Math.round(rawDur) : 60;
      bookedIntervals.push({ startMin, durationMin: durMin });
    }

    const { data: blockedRows } = await admin
      .from("blocked_slots")
      .select("period, start_time, end_time")
      .eq("teacher_id", teacherId)
      .eq("blocked_date", date);

    const blockedDayRows = (blockedRows || []) as {
      period: string | null;
      start_time?: string | null;
      end_time?: string | null;
    }[];
    const blockedPeriods = blockedPeriodsFromRows(blockedDayRows);
    const blockedRanges = blockedTimeRangesFromRows(blockedDayRows);

    const slotOptions = {
      bookedIntervals,
      bufferBeforeMin: buffers.bookingBufferBeforeMinutes,
      bufferAfterMin: buffers.bookingBufferAfterMinutes,
    };

    if (isTeacherScheduleIntervalsEnabled()) {
      const { data: intervalRows } = await admin
        .from("teacher_weekly_availability_intervals")
        .select("day_of_week, start_time, end_time, is_active")
        .eq("teacher_id", teacherId)
        .eq("is_active", true);
      const intervals = mapDbRowsToNormalized(intervalRows ?? []);
      const dayOfWeek = dayOfWeekForISODate(date) ?? 0;
      const slots = generateSlotsFromWeeklyIntervals(
        dayOfWeek,
        intervals,
        durationMinutes,
        bookedSlots,
        blockedPeriods,
        blockedRanges,
        slotOptions,
      );
      const now = new Date();
      const filteredSlots = slots.filter((slot) =>
        isBookingAtLeast24hAhead({ slot_date: date, time_slot: slot }, now),
      );
      return NextResponse.json({
        slots: filteredSlots,
        durationMinutes,
        date,
        preciseIntervals: true,
        hasWeeklyIntervals: intervals.length > 0,
      });
    }

    const slots = generateSlots(dayAvail, durationMinutes, date, bookedSlots, blockedPeriods, blockedRanges, slotOptions);

    const now = new Date();
    const filteredSlots = slots.filter((slot) =>
      isBookingAtLeast24hAhead({ slot_date: date, time_slot: slot }, now),
    );

    return NextResponse.json({ slots: filteredSlots, durationMinutes, date });
  } catch (e) {
    console.error("[teachers/slots]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
