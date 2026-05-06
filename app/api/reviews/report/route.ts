import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendReviewFlaggedAdminAlert } from "@/lib/email";

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

const VALID_REASONS = ["inappropriate", "fake", "harassment", "spam", "other"] as const;
type ReportReason = typeof VALID_REASONS[number];

type Body = { reviewId?: string; reason?: ReportReason; details?: string };

export async function POST(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Config missing." }, { status: 500 });

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const raw = (await request.json().catch(() => null)) as Body | null;
  const reviewId = raw?.reviewId;
  const reason = raw?.reason;
  const details = (raw?.details ?? "").trim().slice(0, 500);

  if (!reviewId) return NextResponse.json({ error: "reviewId manquant" }, { status: 400 });
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Raison invalide" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: review } = await admin
    .from("reviews")
    .select("id, teacher_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (!review) return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });

  const { error: insErr } = await admin.from("review_reports").insert({
    review_id: reviewId,
    reporter_id: user.id,
    reason,
    details: details || null,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ error: "Vous avez déjà signalé cet avis." }, { status: 409 });
    }
    console.error("[reviews/report] insert failed", insErr);
    return NextResponse.json({ error: "Erreur lors du signalement." }, { status: 500 });
  }

  await admin
    .from("reviews")
    .update({
      is_flagged: true,
      flagged_at: new Date().toISOString(),
      moderation_status: "flagged",
    })
    .eq("id", reviewId);

  if (review.teacher_id) {
    const { data: allReviews } = await admin
      .from("reviews")
      .select("rating")
      .eq("teacher_id", review.teacher_id)
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
      .eq("id", review.teacher_id);
  }

  void sendReviewFlaggedAdminAlert({
    reviewId,
    reporterId: user.id,
    reason,
    details,
  });

  return NextResponse.json({ ok: true });
}
