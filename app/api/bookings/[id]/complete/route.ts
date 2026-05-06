import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingEndAt } from "@/lib/bookingLifecycle";
import { sendPostClassReviewRequest } from "@/lib/email";

export const runtime = "nodejs";

type CompletionOutcome = "held" | "absent" | "technical_issue";

function isCompletionOutcome(value: unknown): value is CompletionOutcome {
  return value === "held" || value === "absent" || value === "technical_issue";
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;

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

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { outcome?: unknown };
  const outcome = isCompletionOutcome(body.outcome) ? body.outcome : "held";
  const admin = getSupabaseAdmin();

  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, slot_date, date, time_slot, time, duration_minutes")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, user_id, name")
    .eq("id", booking.teacher_id as string)
    .maybeSingle();

  if (!teacher || teacher.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (String(booking.status) !== "confirmed") {
    return NextResponse.json({ error: "Only confirmed bookings can be completed" }, { status: 409 });
  }

  const lessonEnd = bookingEndAt(booking);
  if (!lessonEnd) {
    return NextResponse.json({ error: "Booking time is incomplete" }, { status: 400 });
  }

  if (lessonEnd > new Date()) {
    return NextResponse.json({ error: "The lesson has not ended yet" }, { status: 409 });
  }

  const completedAt = new Date().toISOString();
  const { data: updatedRows, error: updateErr } = await admin
    .from("bookings")
    .update({
      status: "completed",
      completion_outcome: outcome,
      completed_at: completedAt,
    })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .select("id");

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: "Booking status changed - try refreshing" }, { status: 409 });
  }

  const { data: student } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", booking.student_id as string)
    .maybeSingle();

  const studentEmail = typeof student?.email === "string" ? student.email.trim() : "";
  if (studentEmail) {
    void sendPostClassReviewRequest({
      email: studentEmail,
      studentName: typeof student?.name === "string" && student.name.trim() ? student.name.trim() : "Bonjour",
      teacherName: typeof teacher.name === "string" && teacher.name.trim() ? teacher.name.trim() : "votre professeur",
      bookingId,
    });
  }

  return NextResponse.json({ ok: true, completed_at: completedAt, completion_outcome: outcome });
}
