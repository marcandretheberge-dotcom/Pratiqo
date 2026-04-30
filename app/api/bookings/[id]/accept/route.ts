import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingConfirmedStudent } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bookingId } = await params;

  // ── 1. Auth: identify the caller ────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const {
    data: { user },
    error: authErr,
  } = await supabaseUser.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  // ── 2. Fetch teacher record for the caller ───────────────────────────────────
  const { data: teacherRow } = await admin
    .from("teachers")
    .select("id, discipline")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!teacherRow) return NextResponse.json({ error: "Teacher profile not found" }, { status: 403 });

  // ── 3. Fetch booking and verify ownership ───────────────────────────────────
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, slot_date, date, time_slot, time, price, teaching_mode")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.teacher_id !== teacherRow.id) {
    return NextResponse.json({ error: "Forbidden: not your booking" }, { status: 403 });
  }

  const acceptableStatuses = ["pending", "pending_teacher", "pending_payment"];
  if (!acceptableStatuses.includes(booking.status as string)) {
    return NextResponse.json(
      { error: `Booking already has status '${booking.status}'` },
      { status: 409 },
    );
  }

  // ── 4. Atomically confirm the booking ───────────────────────────────────────
  const { error: updateErr } = await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .in("status", acceptableStatuses);

  if (updateErr) {
    console.error("[accept-booking] update error:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // ── 5. Trigger student confirmation email (best-effort) ──────────────────────
  try {
    const { data: studentProfile } = await admin
      .from("profiles")
      .select("name, email")
      .eq("id", booking.student_id as string)
      .maybeSingle();

    if (studentProfile?.email) {
      const date = String((booking.slot_date as string | null) ?? (booking.date as string | null) ?? "");
      const time = String((booking.time_slot as string | null) ?? (booking.time as string | null) ?? "");
      const teacherProfile = await admin
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      const teacherName = String((teacherProfile.data?.name as string | null) ?? "Votre professeur");

      await sendBookingConfirmedStudent({
        email: studentProfile.email as string,
        name: String(studentProfile.name ?? ""),
        teacherName,
        discipline: String((teacherRow.discipline as string | null) ?? ""),
        date,
        time,
        durationMinutes: 60,
        price: Number((booking.price as number | null) ?? 0),
        creditsApplied: 0,
        location:
          (booking.teaching_mode as string | null) === "online"
            ? "En ligne"
            : (booking.teaching_mode as string | null) === "domicile"
              ? "À domicile"
              : "En personne",
      });
    }
  } catch (emailErr) {
    // Non-fatal — booking is already confirmed; log and continue
    console.error("[accept-booking] email error:", emailErr);
  }

  return NextResponse.json({ ok: true });
}
