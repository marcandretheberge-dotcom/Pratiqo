import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { awardCredit } from "@/lib/credits";

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

type Body = { teacherId?: string; rating?: number; body?: string };

export async function POST(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Config missing." }, { status: 500 });

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const raw = (await request.json().catch(() => null)) as Body | null;
  const teacherId = raw?.teacherId;
  const rating = Number(raw?.rating ?? 0);
  const body = raw?.body ?? "";

  if (!teacherId) return NextResponse.json({ error: "teacherId manquant" }, { status: 400 });
  if (rating < 1 || rating > 5) return NextResponse.json({ error: "Note invalide (1–5)" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Verify the student has at least one confirmed booking with this teacher
  const { count: bookingCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("teacher_id", teacherId)
    .eq("status", "confirmed");

  if (!bookingCount || bookingCount < 1) {
    return NextResponse.json({ error: "Réservation confirmée requise pour laisser un avis." }, { status: 403 });
  }

  // Insert review (unique constraint on student_id + teacher_id prevents duplicates)
  const { error: insErr } = await admin.from("reviews").insert({
    teacher_id: teacherId,
    student_id: user.id,
    rating,
    body: body || null,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ error: "Tu as déjà laissé un avis pour ce professeur." }, { status: 409 });
    }
    console.error("[reviews] insert failed", insErr);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }

  // Recalculate teacher average rating
  const { data: allReviews } = await admin
    .from("reviews")
    .select("rating")
    .eq("teacher_id", teacherId);

  if (allReviews && allReviews.length > 0) {
    const avg = allReviews.reduce((sum: number, r: { rating: number }) => sum + Number(r.rating), 0) / allReviews.length;
    await admin
      .from("teachers")
      .update({ rating: Math.round(avg * 10) / 10, reviews: allReviews.length })
      .eq("id", teacherId);
  }

  // Award $1 credit — reference_id prevents double-awarding same teacher
  const { awarded, newBalance } = await awardCredit(
    user.id,
    "review",
    `Avis laissé pour le prof ${teacherId}`,
    `review:${teacherId}`,
  );

  return NextResponse.json({ ok: true, creditAwarded: awarded, newBalance });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const teacherId = url.searchParams.get("teacherId");
  if (!teacherId) return NextResponse.json({ reviews: [] });

  const supabase = await getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Config missing." }, { status: 500 });

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, student_id")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Check if current user already reviewed
  const { data: { user } } = await supabase.auth.getUser();
  const myReview = user
    ? (reviews ?? []).find((r: { student_id: string }) => r.student_id === user.id)
    : null;

  return NextResponse.json({ reviews: reviews ?? [], hasReviewed: !!myReview });
}
