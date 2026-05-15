import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { computeAvailableDaysForTeacher } from "@/lib/teacherSlotQueries";

export const runtime = "edge";

// Service-role client is intentional here — same reason as /slots.
// Computing available days requires reading booking occupancy from `bookings`
// and `blocked_slots`, both of which are restricted to authenticated participants.
// The response exposes only derived day-level availability, no private booking data.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: teacherId } = await ctx.params;
    const url = new URL(req.url);
    const weeks = Math.min(8, Math.max(1, Number(url.searchParams.get("weeks")) || 4));
    const durationParam = url.searchParams.get("duration");
    const durationOverride = durationParam != null ? Number(durationParam) : null;

    const admin = getSupabaseAdmin();
    const { data: teacher, error: tErr } = await admin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
    if (tErr || !teacher) {
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
