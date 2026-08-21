import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  evaluatePreciseScheduleActivation,
  isTeacherPreciseScheduleBookingEnabled,
  normalizeTeacherScheduleMode,
} from "@/lib/schedule/preciseScheduleActivation";
import { mapDbRowsToNormalized } from "@/lib/schedule/weeklyIntervals";

export const runtime = "nodejs";

async function getAuthenticatedTeacher(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "teacher_required" }, { status: 401 }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { error: NextResponse.json({ error: "server_error" }, { status: 500 }) };
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return { error: NextResponse.json({ error: "teacher_required" }, { status: 401 }) };
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id, schedule_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return { error: NextResponse.json({ error: "teacher_required" }, { status: 404 }) };
  }

  return {
    teacherId: teacher.id as string,
    scheduleMode: normalizeTeacherScheduleMode(
      (teacher as { schedule_mode?: string | null }).schedule_mode,
    ),
    admin,
  };
}

/**
 * POST /api/teacher/schedule/activate-precise
 * Activates precise_intervals mode for the authenticated teacher only.
 */
export async function POST(req: Request) {
  if (!isTeacherPreciseScheduleBookingEnabled()) {
    return NextResponse.json({ error: "precise_schedule_disabled" }, { status: 403 });
  }

  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;
  const { teacherId, admin } = auth as {
    teacherId: string;
    admin: ReturnType<typeof getSupabaseAdmin>;
  };

  const { data: intervalRows, error: loadErr } = await admin
    .from("teacher_weekly_availability_intervals")
    .select("day_of_week, start_time, end_time, is_active")
    .eq("teacher_id", teacherId)
    .eq("is_active", true);

  if (loadErr) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const intervals = mapDbRowsToNormalized(intervalRows ?? []);
  const evaluation = evaluatePreciseScheduleActivation({ intervals });
  if (!evaluation.ok) {
    const status =
      evaluation.error === "precise_schedule_disabled"
        ? 403
        : evaluation.error === "no_precise_intervals"
          ? 400
          : 400;
    return NextResponse.json({ error: evaluation.error }, { status });
  }

  const activatedAt = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("teachers")
    .update({
      schedule_mode: "precise_intervals",
      precise_schedule_activated_at: activatedAt,
      updated_at: activatedAt,
    })
    .eq("id", teacherId);

  if (updateErr) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    scheduleMode: "precise_intervals" as const,
    preciseScheduleActivatedAt: activatedAt,
    preciseIntervalCount: intervals.length,
  });
}
