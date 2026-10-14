import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPendingPaymentBooking, type BookingCreateAdmin } from "@/lib/bookings/createPendingPaymentBooking";
import { parseCreateBookingRequest } from "@/lib/bookings/parseCreateBookingRequest";
import { sendTeacherBookingRequestEmail } from "@/lib/email";
import { resolveEmailLocaleForTeacher } from "@/lib/email/locale";
import { validateMinimumLessonPriceDollars } from "@/lib/pricing/validateMinimumLessonPrice";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  teacherPaymentReadinessFailureReasons,
  teacherPayoutReadinessContractFailureReasons,
} from "@/lib/teachers/readinessContracts";

export const runtime = "nodejs";

type TeacherPaymentGateRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  discipline: string | null;
  category: string | null;
  price_per_lesson?: number | string | null;
  stripe_account_id?: string | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
  stripe_connect_requirements_due?: unknown;
  stripe_connect_disabled_reason?: string | null;
};

type ProfileEmailRow = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function hasValidTeacherRate(value: unknown): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && validateMinimumLessonPriceDollars(parsed).ok;
}

/**
 * POST /api/bookings
 *
 * Server-owned booking creation. Replaces the previous BookingModal client
 * insert so teacher_offer_id can be validated and snapshotted server-side.
 *
 * The client may send teacher_offer_id only. Snapshot columns are ignored
 * and rejected if present.
 *
 * Checkout charges from immutable booking snapshots when ENABLE_OFFER_SNAPSHOT_CHECKOUT
 * is ON (PR 8). Legacy bookings without snapshots keep teacher DB pricing.
 */
export async function POST(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = parseCreateBookingRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data: teacherGate, error: teacherGateErr } = await admin
    .from("teachers")
    .select(
      "id, user_id, name, discipline, category, price_per_lesson, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_requirements_due, stripe_connect_disabled_reason",
    )
    .eq("id", parsed.data.teacherId)
    .maybeSingle();
  if (teacherGateErr) {
    console.error("[bookings] teacher payment gate lookup failed", teacherGateErr.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const teacher = teacherGate as TeacherPaymentGateRow | null;
  if (teacher?.id) {
    const paymentBlockers = teacherPaymentReadinessFailureReasons(teacher);
    const payoutBlockers = teacherPayoutReadinessContractFailureReasons(teacher);
    const profileBlockers = hasValidTeacherRate(teacher.price_per_lesson) ? [] : ["missing_valid_rate"];
    if (paymentBlockers.length > 0 || payoutBlockers.length > 0 || profileBlockers.length > 0) {
      let requestId: string | null = null;
      let emailSent = false;
      const reason =
        profileBlockers.length > 0 ? "teacher_profile_setup_required" : "teacher_payment_setup_required";

      const requestRow = {
        teacher_id: parsed.data.teacherId,
        student_id: user.id,
        learner_profile_id: parsed.data.learnerProfileId,
        requested_slot_date: parsed.data.slotDate,
        requested_time_slot: parsed.data.timeSlot,
        teaching_mode: parsed.data.teachingMode,
        lesson_type: parsed.data.lessonType,
        duration_minutes: parsed.data.durationMinutes,
        student_level: parsed.data.studentLevel,
        metadata: {
          reason,
          paymentBlockers,
          payoutBlockers,
          profileBlockers,
        },
      };

      const { data: requestInsert, error: requestErr } = await admin
        .from("teacher_booking_requests")
        .insert(requestRow)
        .select("id")
        .single();

      if (requestErr && requestErr.code === "23505") {
        const { data: existingRequest } = await admin
          .from("teacher_booking_requests")
          .select("id, email_sent_at")
          .eq("teacher_id", parsed.data.teacherId)
          .eq("student_id", user.id)
          .eq("requested_slot_date", parsed.data.slotDate)
          .eq("requested_time_slot", parsed.data.timeSlot)
          .eq("lesson_type", parsed.data.lessonType)
          .in("status", ["pending_teacher_payment_setup", "teacher_payment_ready"])
          .maybeSingle();
        requestId = (existingRequest as { id?: string | null } | null)?.id ?? null;
        if ((existingRequest as { email_sent_at?: string | null } | null)?.email_sent_at) {
          emailSent = true;
        }
      } else if (requestErr) {
        console.warn("[bookings] deferred teacher request insert failed", {
          teacherId: parsed.data.teacherId,
          studentId: user.id,
          code: requestErr.code ?? null,
        });
      } else {
        requestId = (requestInsert as { id?: string | null } | null)?.id ?? null;
      }

      // A deferred CTA must never report success (or notify) without a saved request.
      if (!requestId) {
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }

      if (teacher.user_id && !emailSent) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, email, name")
          .in("id", [teacher.user_id, user.id]);
        const profileRows = (profiles ?? []) as ProfileEmailRow[];
        const teacherProfile = profileRows.find((row) => row.id === teacher.user_id);
        const studentProfile = profileRows.find((row) => row.id === user.id);
        const teacherEmail = teacherProfile?.email?.trim();
        if (teacherEmail) {
          const locale = await resolveEmailLocaleForTeacher(admin, teacher.user_id).catch(() => "fr" as const);
          emailSent = await sendTeacherBookingRequestEmail({
            email: teacherEmail,
            teacherName: teacher.name?.trim() || teacherProfile?.name?.trim() || "Pratiqo",
            studentName: studentProfile?.name?.trim() || user.email || "Un élève",
            discipline: teacher.discipline?.trim() || teacher.category?.trim() || "Cours privé",
            date: parsed.data.slotDate,
            time: parsed.data.timeSlot,
            mode: parsed.data.teachingMode,
            locale,
          });

          if (emailSent && requestId) {
            await admin
              .from("teacher_booking_requests")
              .update({ email_sent_at: new Date().toISOString() })
              .eq("id", requestId);
          }
        }
      }

      return NextResponse.json(
        {
          deferred: true,
          requestId,
          emailSent,
          reason,
        },
        { status: 202 },
      );
    }
  }

  const created = await createPendingPaymentBooking({
    admin: admin as unknown as BookingCreateAdmin,
    studentId: user.id,
    request: parsed.data,
  });
  if (!created.ok) {
    return NextResponse.json(
      {
        error: created.error,
        ...(created.availableFromDate ? { availableFromDate: created.availableFromDate } : {}),
      },
      { status: created.status },
    );
  }

  return NextResponse.json({ id: created.bookingId });
}
