import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSupportCaseAdminAlert } from "@/lib/email";
import { rateLimitByIp, rateLimitGuardResponse } from "@/lib/rateLimit";
import { validateJsonBody } from "@/lib/validation/api";
import {
  FIRST_LESSON_GUARANTEE_MARKER,
  firstLessonGuaranteeEligibility,
} from "@/lib/guarantee/firstLesson";

export const runtime = "nodejs";

// Conservative schema. Description is OPTIONAL: the student should not need to
// write a long justification to file a v1 claim — manual review by Pratiqo
// will follow up. A short freeform comment is allowed but capped.
const firstLessonGuaranteeSchema = z.object({
  bookingId: z.string().uuid(),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export async function POST(req: Request) {
  // --- Auth ---------------------------------------------------------------
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

  // --- Rate limit ---------------------------------------------------------
  // One legitimate claim per student account. Cap retries at 5/min to absorb
  // network double-clicks and accidental retries without enabling spam.
  const rl = await rateLimitByIp(req, "first-lesson-guarantee", { limit: 5, windowSeconds: 60 });
  const rateLimited = rateLimitGuardResponse(rl);
  if (rateLimited) return rateLimited;

  // --- Body validation ----------------------------------------------------
  const validated = await validateJsonBody(firstLessonGuaranteeSchema, req);
  if (!validated.ok) return validated.response;
  const { bookingId, description: userDescription } = validated.data;

  const admin = getSupabaseAdmin();

  // --- Booking must belong to this user; pull teacher_id for the case ----
  const { data: bookingData, error: bookingErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, completed_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingErr || !bookingData) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  const booking = bookingData as {
    id: string;
    teacher_id: string | null;
    student_id: string | null;
    status: string | null;
    completed_at: string | null;
  };
  if (booking.student_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!booking.teacher_id) {
    return NextResponse.json({ error: "Booking missing teacher reference." }, { status: 422 });
  }

  // --- Eligibility check --------------------------------------------------
  const eligibility = await firstLessonGuaranteeEligibility(admin, {
    studentId: user.id,
    bookingId,
  });
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "not_eligible", reason: eligibility.reason },
      { status: 409 },
    );
  }

  // --- Compose support_case row ------------------------------------------
  // Conservative copy: the description is internal/admin-facing only. We
  // intentionally do NOT promise an automatic refund anywhere.
  const trimmedDescription = (userDescription ?? "").trim();
  const composedDescription = [
    FIRST_LESSON_GUARANTEE_MARKER,
    `Booking ${bookingId} completed at ${eligibility.completedAt}.`,
    "Student is invoking the first-lesson satisfaction guarantee for manual review.",
    trimmedDescription ? `Student comment: ${trimmedDescription}` : "Student did not provide additional details.",
  ].join("\n");

  // --- Insert support_case (payout hold protects teacher payout) ---------
  // We do NOT call shouldHoldPayout() because this is a launch-policy
  // guarantee that should always engage payout review for the small window
  // before the case is resolved. If the teacher payout has already been
  // transferred, the support admin handles the case manually — we never
  // attempt automatic reversal here.
  const supportCasePayload = {
    booking_id: bookingId,
    opened_by_user_id: user.id,
    student_id: user.id,
    teacher_id: booking.teacher_id,
    role: "student" as const,
    category: "refund_request" as const,
    status: "new" as const,
    priority: "high" as const,
    title: "First lesson satisfaction guarantee",
    description: composedDescription,
    requested_resolution: "refund" as const,
    evidence_urls: [] as string[],
    payout_hold: true,
    payout_hold_reason: "First lesson satisfaction guarantee — pending manual review",
  };

  const { data: insertedRaw, error: insertErr } = await admin
    .from("support_cases")
    .insert(supportCasePayload)
    .select("id")
    .single();
  if (insertErr || !insertedRaw) {
    console.error("[first-lesson-guarantee] support_case insert failed", insertErr);
    return NextResponse.json(
      { error: "Could not file the request. Please try again." },
      { status: 500 },
    );
  }
  const supportCaseId = String((insertedRaw as { id: string }).id);

  // --- Stamp profile single-use marker (after insert) --------------------
  // If this stamp fails, the case is already on record AND the defense-in-
  // depth marker scan in firstLessonGuaranteeEligibility will still block
  // a second claim. We log the partial failure and continue to send the
  // admin alert so support is still notified.
  const { error: stampErr } = await admin
    .from("profiles")
    .update({ first_lesson_guarantee_used_at: new Date().toISOString() })
    .eq("id", user.id);
  if (stampErr) {
    console.error(
      "[first-lesson-guarantee] profile stamp failed; relying on marker scan to enforce single-use",
      { supportCaseId, userId: user.id, error: stampErr.message },
    );
  }

  // --- Admin alert -------------------------------------------------------
  try {
    await sendSupportCaseAdminAlert({
      caseId: supportCaseId,
      bookingId,
      category: "refund_request",
      role: "student",
      userId: user.id,
      description: composedDescription,
      payoutHold: true,
    });
  } catch (alertErr) {
    console.error("[first-lesson-guarantee] admin alert failed", alertErr);
  }

  return NextResponse.json({ ok: true, supportCaseId });
}
