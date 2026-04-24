import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Body = { registration_id?: string };

function parseSessionDateTime(dateStr: string, timeStr: string): Date | null {
  const d = (dateStr || "").trim();
  const t = (timeStr || "00:00").trim();
  if (!d) return null;
  const iso = `${d}T${t.length <= 5 ? `${t}:00` : t}`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 });
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
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const registrationId = body?.registration_id?.trim();
    if (!registrationId) {
      return NextResponse.json({ error: "Expected registration_id." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: reg, error: rErr } = await admin
      .from("group_registrations")
      .select("id, session_id, student_id, status")
      .eq("id", registrationId)
      .maybeSingle();

    if (rErr || !reg || (reg as { student_id: string }).student_id !== user.id) {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
    }

    const row = reg as { id: string; session_id: string; student_id: string; status: string };
    if (row.status !== "confirmed") {
      return NextResponse.json({ error: "Inscription déjà annulée." }, { status: 400 });
    }

    const { data: session } = await admin
      .from("group_sessions")
      .select("date, time, status, current_participants, max_participants")
      .eq("id", row.session_id)
      .maybeSingle();

    const s = session as {
      date: string;
      time: string;
      status: string;
      current_participants: number;
      max_participants: number;
    } | null;
    if (!s || s.status === "cancelled") {
      return NextResponse.json({ error: "Séance introuvable ou annulée." }, { status: 400 });
    }

    const start = parseSessionDateTime(s.date, s.time);
    if (start) {
      const hours = (start.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hours < 24) {
        return NextResponse.json(
          { error: "Annulation impossible moins de 24 h avant le cours." },
          { status: 400 },
        );
      }
    }

    const { error: uReg } = await admin
      .from("group_registrations")
      .update({ status: "cancelled" })
      .eq("id", registrationId)
      .eq("student_id", user.id);

    if (uReg) {
      console.error(uReg);
      return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 });
    }

    const nextCount = Math.max(0, Number(s.current_participants) - 1);
    const max = Number(s.max_participants);
    const nextStatus = nextCount >= max ? "full" : "open";

    await admin
      .from("group_sessions")
      .update({
        current_participants: nextCount,
        status: nextStatus,
      })
      .eq("id", row.session_id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[group-sessions/cancel]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
