import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { detectMeetingProvider, sanitizeMeetingUrl } from "@/lib/meetingLinks";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;

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
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { meeting_url?: unknown };
  const meetingUrl = sanitizeMeetingUrl(typeof body.meeting_url === "string" ? body.meeting_url : "");
  if (!meetingUrl) return NextResponse.json({ error: "Invalid meeting URL" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, teacher_id, status, teaching_mode")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const mode = String((booking as { teaching_mode?: string | null }).teaching_mode ?? "").toLowerCase();
  if (mode !== "online") {
    return NextResponse.json({ error: "Meeting link is only supported for online lessons." }, { status: 409 });
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, user_id")
    .eq("id", booking.teacher_id as string)
    .maybeSingle();

  if (!teacher || teacher.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const provider = detectMeetingProvider(meetingUrl);
  const nowIso = new Date().toISOString();

  const { data: updated, error: updateErr } = await admin
    .from("bookings")
    .update({
      meeting_url: meetingUrl,
      meeting_provider: provider,
      meeting_url_added_at: nowIso,
      meeting_url_added_by: user.id,
    })
    .eq("id", bookingId)
    .select("meeting_url, meeting_provider")
    .maybeSingle();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Optional: system message (best-effort) if messaging exists.
  // TODO: If we add dedicated booking-linked threads, emit a system message here.

  return NextResponse.json({
    success: true,
    meeting_url: updated?.meeting_url ?? meetingUrl,
    meeting_provider: (updated?.meeting_provider as string | null) ?? provider,
  });
}

