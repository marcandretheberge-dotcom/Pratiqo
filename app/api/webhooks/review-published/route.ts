import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendReviewPublishedTeacherEmail } from "@/lib/email";

export const runtime = "nodejs";

type ReviewWebhookRecord = {
  id?: string;
  teacher_id?: string;
  student_id?: string | null;
  rating?: number | string;
  content?: string | null;
  body?: string | null;
  status?: string | null;
  moderation_status?: string | null;
  created_at?: string;
};

type ReviewWebhookPayload = {
  type?: string;
  record?: ReviewWebhookRecord;
};

function isValidWebhookSecret(request: Request): boolean {
  const expected = process.env.SUPABASE_WEBHOOK_SECRET?.trim();
  if (!expected) {
    console.error("[review-published webhook] SUPABASE_WEBHOOK_SECRET missing");
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.replace(/^Bearer\s+/i, "").trim();
  const headerSecret =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-supabase-webhook-secret") ??
    "";

  return bearer === expected || headerSecret === expected;
}

function firstName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Un eleve";
  return trimmed.split(/\s+/)[0] || "Un eleve";
}

export async function POST(request: Request) {
  if (!isValidWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as ReviewWebhookPayload | null;
  const record = payload?.record;

  if (payload?.type !== "INSERT" || !record?.id || !record.teacher_id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const reviewStatus = String(record.status ?? record.moderation_status ?? "published").toLowerCase();
  if (!["published", "approved"].includes(reviewStatus)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const rating = Number(record.rating ?? 0);
  if (!Number.isFinite(rating) || rating < 1) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id, user_id, name")
    .eq("id", record.teacher_id)
    .maybeSingle();

  if (teacherErr || !teacher?.user_id) {
    console.error("[review-published webhook] teacher lookup failed", teacherErr);
    return NextResponse.json({ ok: true, skipped: "teacher_not_found" });
  }

  const { data: teacherProfile } = await admin
    .from("profiles")
    .select("email, name")
    .eq("id", teacher.user_id as string)
    .maybeSingle();

  const teacherEmail = typeof teacherProfile?.email === "string" ? teacherProfile.email.trim() : "";
  if (!teacherEmail) {
    console.warn("[review-published webhook] teacher email missing", record.teacher_id);
    return NextResponse.json({ ok: true, skipped: "teacher_email_missing" });
  }

  const { data: studentProfile } = record.student_id
    ? await admin
      .from("profiles")
      .select("name")
      .eq("id", record.student_id)
      .maybeSingle()
    : { data: null };

  await sendReviewPublishedTeacherEmail({
    email: teacherEmail,
    teacherName:
      (typeof teacher.name === "string" && teacher.name.trim()) ||
      (typeof teacherProfile?.name === "string" && teacherProfile.name.trim()) ||
      "Professeur",
    rating,
    reviewContent: record.content ?? record.body ?? null,
    studentFirstName: firstName(studentProfile?.name as string | null | undefined),
    reviewId: record.id,
  });

  return NextResponse.json({ ok: true });
}
