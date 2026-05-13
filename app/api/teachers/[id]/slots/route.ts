import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  blockedPeriodsFromRows,
  blockedTimeRangesFromRows,
  dayShortKeyForISODate,
  formatLocalISODate,
  generateSlots,
  weeklyAvailabilityFromTeacherRows,
} from "@/lib/slots";
import { defaultLessonDurationMinutes } from "@/lib/teacherSlotQueries";
import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";

export const runtime = "edge";

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
      .select("id, availability, home_lesson_min_duration")
      .eq("id", teacherId)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    }

    const durationParam = url.searchParams.get("duration");
    const parsedDur = durationParam != null ? Number(durationParam) : NaN;
    const durationMinutes =
      Number.isFinite(parsedDur) && parsedDur >= 30 && parsedDur <= 180
        ? Math.round(parsedDur)
        : defaultLessonDurationMinutes(
            (teacher as { home_lesson_min_duration?: number | null }).home_lesson_min_duration,
          );
    const weekly = weeklyAvailabilityFromTeacherRows((teacher as { availability?: unknown }).availability);
    const dayKey = dayShortKeyForISODate(date);
    const dayAvail = weekly[dayKey] || { matin: false, apresmidi: false, soir: false };

    const { data: bookedRows } = await admin
      .from("bookings")
      .select("time_slot")
      .eq("teacher_id", teacherId)
      .eq("slot_date", date)
      .in("status", ["pending_payment", "confirmed"])
      .not("time_slot", "is", null);

    const bookedSlots = ((bookedRows || []) as { time_slot?: string }[])
      .map((r) => r.time_slot)
      .filter((x): x is string => Boolean(x));

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

    const slots = generateSlots(dayAvail, durationMinutes, date, bookedSlots, blockedPeriods, blockedRanges);

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
