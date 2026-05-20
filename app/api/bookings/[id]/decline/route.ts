import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const TEACHER_DECLINE_STATUSES = ["pending", "pending_teacher", "pending_payment"] as const;

function clampString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Missing Supabase env." }, { status: 500 });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authErr,
  } = await supabaseUser.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = clampString(body.reason, 200) ?? "teacher_declined";

  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, teacher_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr) {
    return NextResponse.json({ error: bookingErr.message }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: teacherRow, error: teacherErr } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr) {
    return NextResponse.json({ error: teacherErr.message }, { status: 500 });
  }
  if (!teacherRow || teacherRow.id !== booking.teacher_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = String(booking.status ?? "");
  if (!(TEACHER_DECLINE_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "This booking request cannot be declined." }, { status: 409 });
  }

  const declinedAtIso = new Date().toISOString();
  const { data: updatedRows, error: updateErr } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: declinedAtIso,
      cancelled_by: user.id,
      cancelled_by_role: "teacher",
      cancellation_reason: reason,
    })
    .eq("id", bookingId)
    .in("status", [...TEACHER_DECLINE_STATUSES])
    .select("id");

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: "Booking status changed - try refreshing." }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
