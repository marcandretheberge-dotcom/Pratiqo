import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Body = { reply?: string };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: reviewId } = await params;

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const {
    data: { user },
    error: authErr,
  } = await supabaseUser.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = (await req.json().catch(() => null)) as Body | null;
  const reply = (raw?.reply ?? "").trim().slice(0, 1000);
  if (!reply) {
    return NextResponse.json({ error: "Reponse manquante." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: review, error: reviewErr } = await admin
    .from("reviews")
    .select("id, teacher_id, teacher_reply_created_at")
    .eq("id", reviewId)
    .maybeSingle();

  if (reviewErr || !review) {
    return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, user_id")
    .eq("id", review.teacher_id as string)
    .maybeSingle();

  if (!teacher || teacher.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("reviews")
    .update({
      teacher_reply: reply,
      teacher_reply_created_at: review.teacher_reply_created_at ?? now,
      teacher_reply_updated_at: now,
    })
    .eq("id", reviewId)
    .select("id, teacher_reply, teacher_reply_created_at, teacher_reply_updated_at")
    .maybeSingle();

  if (updateErr || !updated) {
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, review: updated });
}
