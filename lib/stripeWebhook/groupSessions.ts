import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function confirmGroupSessionCheckout(
  metadata: Record<string, string> | null | undefined,
  paymentIntentId: string,
) {
  if (!metadata || metadata.checkout_kind !== "group_session") return;

  const groupSessionId = metadata.group_session_id;
  const studentId = metadata.student_id;
  if (!groupSessionId || !studentId) {
    console.warn("[stripe/webhook] group session missing ids", metadata);
    return;
  }

  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("group_registrations")
    .select("id")
    .eq("session_id", groupSessionId)
    .eq("student_id", studentId)
    .eq("status", "confirmed")
    .maybeSingle();

  if (existing) {
    return;
  }

  const { data: gs, error: gErr } = await admin.from("group_sessions").select("*").eq("id", groupSessionId).maybeSingle();
  if (gErr || !gs) {
    console.error("[stripe/webhook] group session fetch", gErr);
    return;
  }

  const session = gs as {
    id: string;
    teacher_id: string;
    max_participants: number;
    current_participants: number;
    status: string;
    title: string;
    date: string | null;
    time: string | null;
    price_per_person: number | string;
  };

  if (session.status !== "open" && session.status !== "full") {
    return;
  }

  const current = Number(session.current_participants);
  const max = Number(session.max_participants);
  if (current >= max) {
    console.warn("[stripe/webhook] group session already full", groupSessionId);
    return;
  }

  const pricePaid = Number(metadata.price_paid_dollars ?? session.price_per_person);
  const { error: insErr } = await admin.from("group_registrations").insert({
    session_id: groupSessionId,
    student_id: studentId,
    status: "confirmed",
    stripe_payment_intent_id: paymentIntentId,
    price_paid: pricePaid,
  });

  if (insErr) {
    if (insErr.code === "23505") return;
    console.error("[stripe/webhook] group registration insert", insErr);
    return;
  }

  const nextCount = current + 1;
  const nextStatus = nextCount >= max ? "full" : "open";
  await admin
    .from("group_sessions")
    .update({ current_participants: nextCount, status: nextStatus })
    .eq("id", groupSessionId);

  const { data: teacher } = await admin.from("teachers").select("user_id, name").eq("id", session.teacher_id).maybeSingle();
  const { data: studentProfile } = await admin.from("profiles").select("name").eq("id", studentId).maybeSingle();
  const studentName = (studentProfile?.name as string) || "Élève";
  const teacherName = (teacher?.name as string) || "Professeur";
  const when = [session.date, session.time].filter(Boolean).join(" · ");

  const rows = [
    teacher?.user_id
      ? {
          user_id: teacher.user_id as string,
          title: "Inscription cours de groupe",
          message: `${studentName} s'est inscrit(e) à « ${session.title} »${when ? ` (${when})` : ""}.`,
          type: "booking",
          read: false,
        }
      : null,
    {
      user_id: studentId,
      title: "Paiement confirmé",
      message: `Ta place pour le cours de groupe « ${session.title} » avec ${teacherName} est confirmée${when ? ` — ${when}` : ""}.`,
      type: "booking",
      read: false,
    },
  ].filter(Boolean) as Record<string, unknown>[];

  const { error: notifErr } = await admin.from("notifications").insert(rows);
  if (notifErr) {
    console.error("[stripe/webhook] group notifications", notifErr);
  }
}

