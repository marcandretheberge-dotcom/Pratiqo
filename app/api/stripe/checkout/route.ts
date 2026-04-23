import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/** Stripe success/cancel URLs — must be set for checkout (no Connect / no dynamic origin fallback). */
function checkoutPublicBase(): string {
  const raw =
    process.env.STRIPE_CHECKOUT_BASE_URL?.trim() || "https://pratiqo.vercel.app";
  return trimTrailingSlash(raw);
}

type CheckoutBody = {
  teacher_id?: string;
  amount?: number;
  booking_details?: { booking_id?: string };
  booking_id?: string;
};

type TeacherRow = {
  id: string;
  name: string;
  price_per_lesson: number | string | null;
};

/** Hourly amount in CAD cents from `teachers.price_per_lesson` (stored as main-currency dollars). */
function hourlyRateCentsFromTeacher(teacher: TeacherRow): number {
  const dollars = Number(teacher.price_per_lesson);
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

    if (!bookingId) {
      return NextResponse.json(
        { error: "Expected booking_details.booking_id or booking_id." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: booking, error: bookErr } = await admin
      .from("bookings")
      .select("id, teacher_id, student_id, status, price, date, time, student_level, teaching_mode")
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

    if (teacherIdFromBody && teacherIdFromBody !== booking.teacher_id) {
      return NextResponse.json({ error: "teacher_id does not match booking." }, { status: 400 });
    }

    const { data: teacher, error: tErr } = await admin
      .from("teachers")
      .select("id, name, price_per_lesson")
      .eq("id", booking.teacher_id)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    }

    const typed = teacher as TeacherRow;
    const unitAmountCents = hourlyRateCentsFromTeacher(typed);
    if (unitAmountCents < 50) {
      return NextResponse.json(
        { error: "Invalid hourly rate: amount in cents must be at least 50 (Stripe minimum for CAD)." },
        { status: 400 },
      );
    }

    const baseUrl = origin;
    const successUrlRaw = `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrlRaw = `${baseUrl}/booking`;
    const successUrl = encodeURI(successUrlRaw);
    const cancelUrl = encodeURI(cancelUrlRaw);

    console.log("[stripe/checkout] redirect base (STRIPE_CHECKOUT_BASE_URL):", baseUrl);
    console.log("[stripe/checkout] success_url (raw):", successUrlRaw);
    console.log("[stripe/checkout] cancel_url (raw):", cancelUrlRaw);
    console.log("[stripe/checkout] success_url (encoded):", successUrl);
    console.log("[stripe/checkout] cancel_url (encoded):", cancelUrl);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: bookingId,
      metadata: {
        booking_id: bookingId,
        teacher_id: booking.teacher_id,
        student_id: booking.student_id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: unitAmountCents,
            product_data: {
              name: `Cours avec ${typed.name}`,
              description: [booking.date, booking.time].filter(Boolean).join(" · ") || undefined,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: {
          booking_id: bookingId,
          teacher_id: booking.teacher_id,
          student_id: booking.student_id,
        },
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
