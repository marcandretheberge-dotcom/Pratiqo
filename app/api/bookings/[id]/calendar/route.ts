import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingWallTimeRangeToUtc } from "@/lib/timezones";

export const runtime = "nodejs";

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await ctx.params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing Stripe session." }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
  const sessionBookingId = session?.metadata?.booking_id ?? session?.client_reference_id ?? null;
  if (!session || session.payment_status !== "paid" || sessionBookingId !== bookingId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, teacher_id, status, date, time, slot_date, time_slot, duration_minutes, teaching_mode")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || !["confirmed", "completed"].includes(String(booking.status ?? ""))) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("name, discipline, timezone")
    .eq("id", booking.teacher_id as string)
    .maybeSingle();

  const dateIso = String((booking as { slot_date?: string | null }).slot_date ?? booking.date ?? "");
  const slot = String((booking as { time_slot?: string | null }).time_slot ?? booking.time ?? "");
  const durationMinutes = Math.max(30, Number((booking as { duration_minutes?: number | null }).duration_minutes ?? 60));
  const teacherTimeZone = (teacher as { timezone?: string | null } | null)?.timezone ?? null;
  const range = bookingWallTimeRangeToUtc({ dateIso, slot, durationMinutes, timeZone: teacherTimeZone });
  if (!range) {
    return NextResponse.json({ error: "Booking time is incomplete." }, { status: 400 });
  }

  const { start, end } = range;
  const teacherName = String((teacher as { name?: string | null } | null)?.name ?? "Professeur");
  const discipline = String((teacher as { discipline?: string | null } | null)?.discipline ?? "Cours privé");
  const mode = String((booking as { teaching_mode?: string | null }).teaching_mode ?? "person");
  const location = mode === "online" ? "En ligne" : mode === "domicile" ? "À domicile" : "En studio";
  const summary = `Pratiqo - ${discipline} avec ${teacherName}`;
  const description = "Cours confirme sur Pratiqo. Consultez votre tableau de bord pour les details a jour.";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pratiqo//Booking//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(bookingId)}@pratiqo`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pratiqo-booking-${bookingId}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
