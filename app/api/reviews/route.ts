import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingEndAt } from "@/lib/bookingLifecycle";
import { checkReviewSafety } from "@/lib/reviewSafety";

export const runtime = "nodejs";

async function getSupabaseForRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    return createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cs) { for (const c of cs) cookieStore.set(c.name, c.value, c.options); },
    },
  });
}

type Body = { bookingId?: string; rating?: number; body?: string };

const REVIEW_WINDOW_DAYS = 30;

async function refreshTeacherRating(admin: ReturnType<typeof getSupabaseAdmin>, teacherId: string) {
  const { data: allReviews } = await admin
    .from("reviews")
    .select("rating")
    .eq("teacher_id", teacherId)
    .eq("moderation_status", "approved")
    .eq("is_flagged", false);

  const rows = allReviews ?? [];
  const count = rows.length;
  const avg = count > 0
    ? rows.reduce((sum: number, r: { rating: number }) => sum + Number(r.rating), 0) / count
    : 0;

  await admin
    .from("teachers")
    .update({ rating: Math.round(avg * 10) / 10, reviews: count })
    .eq("id", teacherId);
}

export async function POST(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Config missing." }, { status: 500 });

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const raw = (await request.json().catch(() => null)) as Body | null;
  const bookingId = raw?.bookingId;
  const rating = Number(raw?.rating ?? 0);
  const body = (raw?.body ?? "").trim();

  if (!bookingId) return NextResponse.json({ error: "bookingId manquant" }, { status: 400 });
  if (rating < 1 || rating > 5) return NextResponse.json({ error: "Note invalide (1–5)" }, { status: 400 });

  const safety = checkReviewSafety(body);
  if (!safety.ok) {
    return NextResponse.json({
      error: safety.message,
      moderationReason: safety.reason,
    }, { status: 422 });
  }

  const admin = getSupabaseAdmin();

  // Validate booking: exists + belongs to user + completed + paid + within window
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, slot_date, time_slot, date, time, duration_minutes, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  if (booking.student_id !== user.id) {
    return NextResponse.json({ error: "Cette réservation ne vous appartient pas." }, { status: 403 });
  }

  if (String(booking.status) !== "completed") {
    return NextResponse.json({ error: "Seuls les cours complétés peuvent être évalués." }, { status: 403 });
  }

  if (!booking.stripe_payment_intent_id) {
    return NextResponse.json({ error: "Seuls les cours payés via Pratiqo peuvent être évalués." }, { status: 403 });
  }

  if (!booking.slot_date) {
    return NextResponse.json({ error: "Date de cours manquante." }, { status: 400 });
  }

  const lessonEnd = bookingEndAt(booking);
  const now = new Date();
  if (!lessonEnd) {
    return NextResponse.json({ error: "Heure de cours manquante." }, { status: 400 });
  }
  const windowEnd = new Date(lessonEnd.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  if (lessonEnd > now) {
    return NextResponse.json({ error: "Le cours n'a pas encore eu lieu." }, { status: 403 });
  }

  if (windowEnd < now) {
    return NextResponse.json({
      error: `La fenêtre de ${REVIEW_WINDOW_DAYS} jours pour évaluer ce cours est dépassée.`
    }, { status: 403 });
  }

  // Insert review (UNIQUE constraint on booking_id prevents duplicates)
  const { error: insErr } = await admin.from("reviews").insert({
    booking_id: bookingId,
    teacher_id: booking.teacher_id,
    student_id: user.id,
    rating,
    body: body || null,
    moderation_status: "approved",
    moderation_reason: null,
    is_flagged: false,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ error: "Vous avez déjà évalué ce cours." }, { status: 409 });
    }
    console.error("[reviews] insert failed", insErr);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }

  await refreshTeacherRating(admin, booking.teacher_id);

  // No more $ credit awarded for reviews — pure community contribution
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const teacherId = url.searchParams.get("teacherId");
  if (!teacherId) return NextResponse.json({ reviews: [] });

  const supabase = await getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Config missing." }, { status: 500 });

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, student_id, booking_id, teacher_reply, teacher_reply_created_at, teacher_reply_updated_at")
    .eq("teacher_id", teacherId)
    .eq("moderation_status", "approved")
    .eq("is_flagged", false)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ reviews: reviews ?? [] });
}
