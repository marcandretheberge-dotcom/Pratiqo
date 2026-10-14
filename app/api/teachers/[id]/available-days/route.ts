import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { computeAvailableDaysForTeacher } from "@/lib/teacherSlotQueries";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: teacherId } = await ctx.params;
    const url = new URL(req.url);
    const weeks = Math.min(8, Math.max(1, Number(url.searchParams.get("weeks")) || 4));
    const durationParam = url.searchParams.get("duration");
    const durationOverride = durationParam != null ? Number(durationParam) : null;

    const admin = getSupabaseAdmin();
    const { data: teacher, error: tErr } = await admin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
    if (tErr) throw new Error("teacher_calendar_lookup_failed");
    if (!teacher) {
      return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
    }

    const { days, durationMinutes } = await computeAvailableDaysForTeacher(
      admin,
      teacherId,
      weeks,
      durationOverride,
    );
    return NextResponse.json({ days, durationMinutes, weeks });
  } catch (e) {
    console.error("[teachers/available-days]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
