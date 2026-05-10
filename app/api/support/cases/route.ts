import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSupportCaseAdminAlert } from "@/lib/email";
import {
  buildSupportCasePayload,
  canUserOpenCaseForBooking,
  inferSupportCaseRole,
  type BookingForSupportCase,
} from "@/lib/supportCases";
import { validateJsonBody } from "@/lib/validation/api";
import { supportCasePostSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Missing Supabase configuration." }, { status: 500 });
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: authErr,
  } = await supabaseUser.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const validated = await validateJsonBody(supportCasePostSchema, req);
  if (!validated.ok) return validated.response;
  const body = validated.data;
  const bookingId = body.booking_id;
  const description = body.description;
  const requestedResolution = body.requested_resolution ?? null;
  const evidenceUrl = body.evidence_url?.trim() ?? "";
  const evidenceUrls = evidenceUrl ? [evidenceUrl] : [];

  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingErr || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const typedBooking: BookingForSupportCase = {
    id: String(booking.id),
    teacher_id: String(booking.teacher_id),
    student_id: String(booking.student_id),
  };

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, user_id")
    .eq("id", typedBooking.teacher_id)
    .maybeSingle();
  const teacherOwnerUserId = (teacher as { user_id?: string | null } | null)?.user_id ?? null;

  if (!canUserOpenCaseForBooking(user.id, typedBooking, teacherOwnerUserId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const role = inferSupportCaseRole(user.id, typedBooking, teacherOwnerUserId);
  if (!role) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { data: payment } = await admin
    .from("booking_payments")
    .select("payment_status, transfer_status")
    .eq("booking_id", bookingId)
    .maybeSingle();
  const paymentRow = payment as { payment_status?: string | null; transfer_status?: string | null } | null;

  const payload = buildSupportCasePayload({
    userId: user.id,
    booking: typedBooking,
    role,
    category: body.category,
    description,
    requestedResolution,
    evidenceUrls,
    paymentTransferStatus: paymentRow?.transfer_status ?? null,
  });

  const { data: inserted, error: insertErr } = await admin
    .from("support_cases")
    .insert(payload)
    .select("id, payout_hold")
    .single();
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const caseId = String((inserted as { id: string }).id);
  const payoutHold = Boolean((inserted as { payout_hold?: boolean | null }).payout_hold);

  await sendSupportCaseAdminAlert({
    caseId,
    bookingId,
    category: body.category,
    role,
    userId: user.id,
    description,
    payoutHold,
  });

  return NextResponse.json({ success: true, case_id: caseId, payout_hold: payoutHold });
}
