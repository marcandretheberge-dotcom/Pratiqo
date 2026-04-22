import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const PLATFORM_FEE_RATE = 0.12;

type CheckoutBody = {
  teacher_id?: string;
  amount?: number;
  booking_details?: { booking_id?: string };
  booking_id?: string;
};

export async function POST(req: Request) {
  try {
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
      .select("id, name, stripe_account_id")
      .eq("id", booking.teacher_id)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    }

    const connectedAccountId = teacher.stripe_account_id as string | null;
    if (!connectedAccountId) {
      return NextResponse.json(
        {
          error:
            "This teacher is not connected to Stripe yet. Add `stripe_account_id` on the teacher row (Connect account id, e.g. acct_...).",
        },
        { status: 400 },
      );
    }

    const priceUsd = Number(booking.price);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return NextResponse.json({ error: "Invalid booking price." }, { status: 400 });
    }

    const unitAmountCents = Math.round(priceUsd * 100);
    const applicationFeeAmount = Math.round(unitAmountCents * PLATFORM_FEE_RATE);
    if (applicationFeeAmount >= unitAmountCents) {
      return NextResponse.json({ error: "Platform fee must be less than total amount." }, { status: 400 });
    }

    const headerOrigin = req.headers.get("origin");
    const envSite = process.env.NEXT_PUBLIC_SITE_URL;
    const vercel = process.env.VERCEL_URL;
    const origin =
      headerOrigin ||
      envSite ||
      (vercel ? (vercel.startsWith("http") ? vercel : `https://${vercel}`) : "");

    if (!origin) {
      return NextResponse.json(
        { error: "Missing origin header or NEXT_PUBLIC_SITE_URL / VERCEL_URL for redirect URLs." },
        { status: 500 },
      );
    }

    const successUrl = `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/booking`;

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
            currency: "eur",
            unit_amount: unitAmountCents,
            product_data: {
              name: `Cours — ${teacher.name}`,
              description: [booking.date, booking.time].filter(Boolean).join(" · ") || undefined,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
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
    const message = e instanceof Error ? e.message : "Stripe checkout error";
    console.error("[stripe/checkout]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
