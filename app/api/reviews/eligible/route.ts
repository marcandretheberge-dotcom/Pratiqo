import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingEndAt } from "@/lib/bookingLifecycle";

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

const REVIEW_WINDOW_DAYS = 30;

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseForRequest(request);
    if (!supabase) return NextResponse.json({ bookings: [] });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ bookings: [] });

    const admin = getSupabaseAdmin();
    const now = new Date();
    const windowStart = new Date(now.getTime() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // Fetch finished/confirmed bookings with a slot_date within the review window.
    // Use date-only strings for the slot_date column (stored as DATE in Postgres).
    const { data: bookings } = await admin
      .from("bookings")
      .select("id, teacher_id, status, slot_date, time_slot, date, time, duration_minutes")
      .eq("student_id", user.id)
      .in("status", ["confirmed", "completed"])
      .not("slot_date", "is", null)
      .gte("slot_date", windowStart.toISOString().split("T")[0])
      .lte("slot_date", now.toISOString().split("T")[0]);

    if (!bookings?.length) return NextResponse.json({ bookings: [] });

    // Keep only lessons that have actually finished.
    const finished = bookings.filter((b) => {
      const lessonEnd = bookingEndAt(b);
      if (!lessonEnd) return false;
      return lessonEnd < now;
    });

    if (!finished.length) return NextResponse.json({ bookings: [] });

    // Exclude bookings that already have a review.
    const bookingIds = finished.map((b) => b.id as string);
    const { data: existingReviews } = await admin
      .from("reviews")
      .select("booking_id")
      .in("booking_id", bookingIds);

    const reviewedIds = new Set((existingReviews ?? []).map((r) => r.booking_id as string));
    const unreviewed = finished.filter((b) => !reviewedIds.has(b.id as string));

    if (!unreviewed.length) return NextResponse.json({ bookings: [] });

    // Fetch teacher info for the unique teacher ids.
    const teacherIds = [...new Set(unreviewed.map((b) => b.teacher_id as string))];
    const { data: teachers } = await admin
      .from("teachers")
      .select("id, name, discipline, image_url")
      .in("id", teacherIds);

    const teacherMap = new Map(
      (teachers ?? []).map((t) => [t.id as string, t as { id: string; name: string; discipline: string | null; image_url: string | null }]),
    );

    const result = unreviewed.map((b) => {
      const teacher = teacherMap.get(b.teacher_id as string);
      return {
        bookingId: b.id as string,
        teacherId: b.teacher_id as string,
        teacherName: teacher?.name ?? "Professeur",
        teacherDiscipline: teacher?.discipline ?? null,
        teacherImageUrl: teacher?.image_url ?? null,
        slotDate: b.slot_date as string,
        durationMinutes: Number(b.duration_minutes ?? 60),
      };
    });

    return NextResponse.json({ bookings: result });
  } catch (e) {
    console.error("[reviews/eligible]", e);
    return NextResponse.json({ bookings: [] });
  }
}
