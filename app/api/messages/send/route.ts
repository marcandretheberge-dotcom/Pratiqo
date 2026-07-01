import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimitByIp, rateLimitGuardResponse } from "@/lib/rateLimit";
import { validateJsonBody } from "@/lib/validation/api";
import { messageSendPostSchema } from "@/lib/validation/schemas";
import { hasCompletedLessonBetween } from "@/lib/messaging/contactGate";
import { sanitizeContactInfo } from "@/lib/messaging/sanitizeContactInfo";
import { sendNewPratiqoMessageEmail, resolveEmailLocaleForUser } from "@/lib/email";
import { appBaseUrl } from "@/lib/email/layout";
import type { Locale } from "@/lib/i18n/types";

export const runtime = "nodejs";

type MessageUserContact = {
  email: string | null;
  name: string;
};

function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  const h = (header ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (h.startsWith("fr")) return "fr";
  if (h.startsWith("es")) return "es";
  return "en";
}

async function resolveMessageUserContact(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<MessageUserContact> {
  const { data: profile } = await admin
    .from("profiles")
    .select("email, name")
    .eq("id", userId)
    .maybeSingle();

  const profileEmail = typeof profile?.email === "string" ? profile.email.trim() : "";
  const profileName = typeof profile?.name === "string" ? profile.name.trim() : "";

  let authEmail = "";
  let authName = "";
  if (!profileEmail || !profileName) {
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      const user = data?.user;
      authEmail = user?.email?.trim() ?? "";
      const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const metadataName =
        typeof metadata.name === "string"
          ? metadata.name
          : typeof metadata.full_name === "string"
            ? metadata.full_name
            : "";
      authName = metadataName.trim();
    } catch {
      authEmail = "";
      authName = "";
    }
  }

  const email = profileEmail || authEmail || null;
  const name = profileName || authName || email?.split("@")[0] || "Pratiqo";

  return { email, name };
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
  const rateLimited = rateLimitGuardResponse(rl);
  if (rateLimited) return rateLimited;

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

  if (receiverId !== user.id) {
    try {
      const [recipient, sender, recipientLocale] = await Promise.all([
        resolveMessageUserContact(admin, receiverId),
        resolveMessageUserContact(admin, user.id),
        resolveEmailLocaleForUser(admin, receiverId),
      ]);

      if (recipient.email) {
        const conversationUrl = `${appBaseUrl()}/messages?peer=${encodeURIComponent(user.id)}`;
        await sendNewPratiqoMessageEmail({
          email: recipient.email,
          recipientName: recipient.name,
          senderName: sender.name,
          conversationUrl,
          locale: recipientLocale,
        });
      }
    } catch (error) {
      console.warn("[messages/send] notification email skipped", error);
    }
  }

  return NextResponse.json({
    ok: true,
    message,
    safetyNotice: masked,
    ...(masked ? { maskedReasons: reasons } : {}),
  });
}
