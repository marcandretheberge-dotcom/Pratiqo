import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isTeacherScheduleInteractiveCellsEnabled } from "@/lib/schedule/interactiveCells";
import {
  intervalsToCoarseAvailabilityStrings,
  isTeacherScheduleIntervalsEnabled,
  mapDbRowsToNormalized,
  validateWeeklyIntervalSet,
} from "@/lib/schedule/weeklyIntervals";

export const runtime = "nodejs";

const intervalSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().min(4).max(8),
    endTime: z.string().min(4).max(8),
  })
  .strict();

const putBodySchema = z
  .object({
    intervals: z.array(intervalSchema).max(84),
  })
  .strict();

async function getAuthenticatedTeacher(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
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
    return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return { error: NextResponse.json({ error: "teacher_not_found" }, { status: 404 }) };
  }

  return { teacherId: teacher.id as string, admin };
}

function validationErrorStatus(error: string): number {
  return error === "overlapping_intervals" ||
    error === "duplicate_interval" ||
    error === "end_before_or_equal_start" ||
    error === "overnight_not_allowed" ||
    error === "not_quarter_hour" ||
    error === "invalid_day" ||
    error === "invalid_time"
    ? 400
    : 400;
}

/**
 * GET /api/teacher/weekly-intervals
 * Returns the authenticated teacher's precise weekly intervals.
 * Available even when flag is OFF so the UI can preview saved data after enable.
 */
export async function GET(req: Request) {
  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;
  const { teacherId, admin } = auth as {
    teacherId: string;
    admin: ReturnType<typeof getSupabaseAdmin>;
  };

  const { data, error } = await admin
    .from("teacher_weekly_availability_intervals")
    .select("id, day_of_week, start_time, end_time, is_active")
    .eq("teacher_id", teacherId)
    .eq("is_active", true)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const intervals = mapDbRowsToNormalized(data ?? []).map((iv) => ({
    dayOfWeek: iv.dayOfWeek,
    startTime: iv.startTime,
    endTime: iv.endTime,
  }));

  return NextResponse.json({
    enabled: isTeacherScheduleInteractiveCellsEnabled() || isTeacherScheduleIntervalsEnabled(),
    intervals,
  });
}

/**
 * PUT /api/teacher/weekly-intervals
 * Atomically replaces the teacher's active weekly intervals.
 * Allowed when interactive cells persistence defaults ON, or when
 * ENABLE_TEACHER_SCHEDULE_INTERVALS / ENABLE_TEACHER_SCHEDULE_INTERACTIVE_CELLS is true.
 * Booking still uses separate precise-booking / intervals flags.
 * Also syncs a coarse teachers.availability projection for search filters.
 */
export async function PUT(req: Request) {
  if (!isTeacherScheduleInteractiveCellsEnabled()) {
    return NextResponse.json({ error: "weekly_intervals_disabled" }, { status: 400 });
  }

  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;
  const { teacherId, admin } = auth as {
    teacherId: string;
    admin: ReturnType<typeof getSupabaseAdmin>;
  };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const validated = validateWeeklyIntervalSet(parsed.data.intervals);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error },
      { status: validationErrorStatus(validated.error) },
    );
  }

  const { error: deleteErr } = await admin
    .from("teacher_weekly_availability_intervals")
    .delete()
    .eq("teacher_id", teacherId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  if (validated.intervals.length > 0) {
    const rows = validated.intervals.map((iv) => ({
      teacher_id: teacherId,
      day_of_week: iv.dayOfWeek,
      start_time: iv.startTime,
      end_time: iv.endTime,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));
    const { error: insertErr } = await admin.from("teacher_weekly_availability_intervals").insert(rows);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  const coarse = intervalsToCoarseAvailabilityStrings(validated.intervals);
  const { error: syncErr } = await admin
    .from("teachers")
    .update({
      availability: coarse,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teacherId);
  if (syncErr) {
    return NextResponse.json({ error: syncErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    intervals: validated.intervals.map((iv) => ({
      dayOfWeek: iv.dayOfWeek,
      startTime: iv.startTime,
      endTime: iv.endTime,
    })),
  });
}
