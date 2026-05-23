import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimitByIp, rateLimitResponse } from "@/lib/rateLimit";
import { validateJsonBody } from "@/lib/validation/api";
import { messageSendPostSchema } from "@/lib/validation/schemas";
import { hasCompletedLessonBetween } from "@/lib/messaging/contactGate";
import { sanitizeContactInfo } from "@/lib/messaging/sanitizeContactInfo";
import type { Locale } from "@/lib/i18n/types";

export const runtime = "nodejs";

function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  const h = (header ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (h.startsWith("fr")) return "fr";
  if (h.startsWith("es")) return "es";
  return "en";
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
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
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const validated = await validateJsonBody(messageSendPostSchema, req);
  if (!validated.ok) return validated.response;
  const { receiver_id: receiverId, content } = validated.data;

  const rl = await rateLimitByIp(req, "msg-send", { limit: 20, windowSeconds: 60 });
  if (!rl.allowed && rl.retryAfterSeconds != null) {
    return rateLimitResponse(rl.retryAfterSeconds, {
      limit: rl.limit,
      remaining: rl.remaining,
      reset: rl.reset,
    });
  }

  const admin = getSupabaseAdmin();

  // If receiver is a teacher, require at least one confirmed booking
  const { data: teacherRow } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", receiverId)
    .maybeSingle();

  if (teacherRow) {
    const { data: bookings } = await admin
      .from("bookings")
      .select("id")
      .eq("student_id", user.id)
      .eq("teacher_id", (teacherRow as { id: string }).id)
      .in("status", ["confirmed"])
      .limit(1);

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ error: "Réservez d'abord un cours." }, { status: 403 });
    }
  }

  // Anti-circumvention gate: mask personal contact details until this
  // student/teacher pair has completed at least one lesson together.
  // Failing closed (`gateOpen = false`) means a transient lookup error
  // applies stricter masking — never breaks the send.
  const gateOpen = await hasCompletedLessonBetween(admin, user.id, receiverId);
  const senderLocale = localeFromAcceptLanguage(req.headers.get("accept-language"));
  const { content: sanitizedContent, masked, reasons } = sanitizeContactInfo(
    content,
    senderLocale,
    gateOpen,
  );

  const conversationId = [user.id, receiverId].sort().join("_");
  const { data: message, error: msgErr } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      // The persisted content is always the sanitized version. We do not
      // keep the unmasked original anywhere — that's the privacy contract.
      content: sanitizedContent,
      read: false,
    })
    .select("id, conversation_id, sender_id, receiver_id, content, read, created_at")
    .single();

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message,
    safetyNotice: masked,
    ...(masked ? { maskedReasons: reasons } : {}),
  });
}
