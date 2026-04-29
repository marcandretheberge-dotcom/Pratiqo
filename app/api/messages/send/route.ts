import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

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

  const body = (await req.json().catch(() => null)) as
    | { receiver_id?: string; content?: string }
    | null;
  const receiverId = body?.receiver_id?.trim();
  const content = body?.content?.trim();

  if (!receiverId || !content) {
    return NextResponse.json({ error: "receiver_id and content are required." }, { status: 400 });
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
      .in("status", ["confirmed", "booked"])
      .limit(1);

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ error: "Réservez d'abord un cours." }, { status: 403 });
    }
  }

  const conversationId = [user.id, receiverId].sort().join("_");
  const { data: message, error: msgErr } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      read: false,
    })
    .select("id, conversation_id, sender_id, receiver_id, content, read, created_at")
    .single();

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message });
}
