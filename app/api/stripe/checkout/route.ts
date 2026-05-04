import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/** Stripe success/cancel URLs — must be set for checkout (no Connect / no dynamic origin fallback). */
function checkoutPublicBase(): string {
  const raw =
    process.env.STRIPE_CHECKOUT_BASE_URL?.trim() || "https://pratiqo.ca";
  return trimTrailingSlash(raw);
}

type CheckoutBody = {
  teacher_id?: string;
  amount?: number;
  booking_details?: { booking_id?: string };
  booking_id?: string;
  credits_to_apply?: number;
};

type TeacherRow = {
  id: string;
  name: string;
  price_per_lesson: number | string | null;
  user_id?: string | null;
  stripe_account_id?: string | null;
  home_lesson_enabled?: boolean | null;
  home_lesson_price?: number | string | null;
};

type BookingRow = {
  price: number | string | null;
  teaching_mode?: string | null;
  student_address?: string | null;
};

/** Hourly amount in CAD cents from `teachers.price_per_lesson` (stored as main-currency dollars). */
function hourlyRateCentsFromTeacher(teacher: TeacherRow): number {
  const dollars = Number(teacher.price_per_lesson);
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}

function homeRateCentsFromTeacher(teacher: TeacherRow): number {
  const dollars = Number(teacher.home_lesson_price);
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}

export async function POST(req: Request) {
  try {
    const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    console.log("[stripe/checkout] STRIPE_SECRET_KEY configured:", hasStripeKey);
    if (!hasStripeKey) {
      const msg = "STRIPE_SECRET_KEY is missing or empty.";
      console.error("[stripe/checkout]", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const origin = checkoutPublicBase();

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Missing Supabase env." }, { status: 500 });
    }

    const supabaseUser = createClient(url, anonKey);
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as CheckoutBody | null;
    const bookingId = body?.booking_details?.booking_id ?? body?.booking_id;
    const teacherIdFromBody = body?.teacher_id;
    const creditsToApply = Math.max(0, Number(body?.credits_to_apply ?? 0));

    if (!bookingId) {
      return NextResponse.json(
        { error: "Expected booking_details.booking_id or booking_id." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: booking, error: bookErr } = await admin
      .from("bookings")
      .select(
        "id, teacher_id, student_id, status, price, date, time, slot_date, time_slot, student_level, teaching_mode, student_address",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.student_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (booking.status !== "pending_payment") {
      return NextResponse.json({ error: "Booking is not awaiting payment." }, { status: 400 });
    }

    const bSlotDate = (booking as { slot_date?: string | null }).slot_date;
    const bTimeSlot = (booking as { time_slot?: string | null }).time_slot;
    if (!bSlotDate || !bTimeSlot) {
      return NextResponse.json({ error: "Créneau (date / heure) manquant sur la réservation." }, { status: 400 });
    }

    if (!isBookingAtLeast24hAhead({ slot_date: bSlotDate, time_slot: bTimeSlot })) {
      return NextResponse.json(
        {
          error:
            "Cette réservation nécessite au moins 24h de préavis. Le créneau choisi est trop proche. Veuillez choisir un créneau plus tardif.",
        },
        { status: 400 },
      );
    }

    const { count: otherCount, error: occErr } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", booking.teacher_id)
      .eq("slot_date", bSlotDate)
      .eq("time_slot", bTimeSlot)
      .neq("id", bookingId)
      .in("status", ["pending_payment", "confirmed"]);

    if (!occErr && otherCount && otherCount > 0) {
      return NextResponse.json({ error: "Ce créneau vient d'être réservé." }, { status: 409 });
    }

    if (teacherIdFromBody && teacherIdFromBody !== booking.teacher_id) {
      return NextResponse.json({ error: "teacher_id does not match booking." }, { status: 400 });
    }

    const { data: teacher, error: tErr } = await admin
      .from("teachers")
      .select(
        "id, user_id, stripe_account_id, name, price_per_lesson, home_lesson_enabled, home_lesson_price",
      )
      .eq("id", booking.teacher_id)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    }

    const typed = teacher as TeacherRow;
    const b = booking as BookingRow;
    const teachingMode = (b.teaching_mode || "person").toLowerCase();
    const studentAddress = (b.student_address || "").trim();

    let unitAmountCents = 0;
    const bookingPriceDollars = Number(b.price);
    if (Number.isFinite(bookingPriceDollars) && bookingPriceDollars > 0) {
      unitAmountCents = Math.round(bookingPriceDollars * 100);
    } else if (teachingMode === "domicile") {
      if (!typed.home_lesson_enabled) {
        return NextResponse.json({ error: "Cours à domicile non disponible pour ce professeur." }, { status: 400 });
      }
      unitAmountCents = homeRateCentsFromTeacher(typed);
    } else {
      unitAmountCents = hourlyRateCentsFromTeacher(typed);
    }

    if (teachingMode === "domicile") {
      if (!typed.home_lesson_enabled) {
        return NextResponse.json({ error: "Cours à domicile non activé." }, { status: 400 });
      }
      if (!studentAddress) {
        return NextResponse.json({ error: "Adresse requise pour un cours à domicile." }, { status: 400 });
      }
    }

    const modeLabel =
      teachingMode === "domicile" ? "À domicile" : teachingMode === "online" ? "En ligne" : "En studio";

    // Apply credits: validate server-side against actual balance
    let validatedCredits = 0;
    if (creditsToApply > 0 && typed.user_id !== user.id) {
      const { data: studentProf } = await admin
        .from("profiles")
        .select("credit_balance")
        .eq("id", user.id)
        .maybeSingle();
      const balance = Number((studentProf as { credit_balance?: number | null } | null)?.credit_balance ?? 0);
      // Cap at balance, and ensure at least $0.50 remains for Stripe minimum
      const maxApplicable = Math.max(0, (unitAmountCents - 50) / 100);
      validatedCredits = Math.min(creditsToApply, balance, maxApplicable);
      validatedCredits = Math.floor(validatedCredits * 100) / 100; // round to cents
    }

    const discountCents = Math.round(validatedCredits * 100);
    unitAmountCents = Math.max(50, unitAmountCents - discountCents);

    if (unitAmountCents < 50) {
      return NextResponse.json(
        { error: "Invalid amount: must be at least 50 cents (Stripe minimum for CAD)." },
        { status: 400 },
      );
    }

    const baseUrl = origin;
    // NOTE: Do NOT encodeURI here — encodeURI would percent-encode the { } in the Stripe
    // placeholder, turning {CHECKOUT_SESSION_ID} into %7BCHECKOUT_SESSION_ID%7D.
    // Stripe recognises the literal braces and replaces the placeholder on redirect.
    const successUrl = `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/booking`;

    console.log("[stripe/checkout] redirect base (STRIPE_CHECKOUT_BASE_URL):", baseUrl);
    console.log("[stripe/checkout] success_url:", successUrl);
    console.log("[stripe/checkout] cancel_url:", cancelUrl);

    // Commission based on teacher plan (default: free).
    let commissionRate = 0.1;
    if (typed.user_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("plan")
        .eq("id", typed.user_id)
        .maybeSingle();
      const plan = (prof as { plan?: string | null } | null)?.plan;
      commissionRate = plan === "pro" ? 0.05 : 0.1;
    }

    const applicationFeeAmount = Math.max(0, Math.round(unitAmountCents * commissionRate));
    console.log("[stripe/checkout] commissionRate:", commissionRate, "applicationFeeAmount:", applicationFeeAmount);

    const destination = typed.stripe_account_id?.trim() || null;
    if (!destination) {
      console.warn(
        "[stripe/checkout] Missing teacher.stripe_account_id; skipping application_fee_amount (Connect not configured).",
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: bookingId,
      metadata: {
        booking_id: bookingId,
        teacher_id: booking.teacher_id,
        student_id: booking.student_id,
        teaching_mode: teachingMode,
        student_address: studentAddress,
        credits_applied: validatedCredits > 0 ? String(validatedCredits) : "0",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: unitAmountCents,
            product_data: {
              name: `Cours avec ${typed.name} (${modeLabel})`,
              description:
                [bSlotDate, bTimeSlot].filter(Boolean).join(" · ") ||
                [booking.date, booking.time].filter(Boolean).join(" · ") ||
                undefined,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: {
          booking_id: bookingId,
          teacher_id: booking.teacher_id,
          student_id: booking.student_id,
          teaching_mode: teachingMode,
          student_address: studentAddress,
          credits_applied: validatedCredits > 0 ? String(validatedCredits) : "0",
        },
        ...(destination
          ? {
              application_fee_amount: applicationFeeAmount,
              transfer_data: { destination },
            }
          : {}),
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    if (e instanceof Stripe.errors.StripeError) {
      const declineCode =
        "decline_code" in e && typeof (e as { decline_code?: string }).decline_code === "string"
          ? (e as { decline_code: string }).decline_code
          : undefined;
      console.error("[stripe/checkout] Stripe API error:", {
        type: e.type,
        code: e.code,
        message: e.message,
        decline_code: declineCode,
        raw: e.raw,
      });
      const status =
        e instanceof Stripe.errors.StripeAuthenticationError
          ? 500
          : e instanceof Stripe.errors.StripeInvalidRequestError
            ? 400
            : 502;
      return NextResponse.json(
        { error: e.message, stripeType: e.type, stripeCode: e.code ?? null },
        { status },
      );
    }

    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      console.error("[stripe/checkout] Supabase admin:", e.message);
      return NextResponse.json({ error: "Server misconfiguration: " + e.message }, { status: 500 });
    }

    const message = e instanceof Error ? e.message : "Stripe checkout error";
    console.error("[stripe/checkout] Unexpected error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
