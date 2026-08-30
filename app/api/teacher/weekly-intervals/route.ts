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

type WeeklyIntervalsErrorCode =
  | "weekly_intervals_disabled"
  | "unauthorized"
  | "teacher_not_found"
  | "invalid_payload"
  | "validation_error"
  | "intervals_conflict"
  | "db_delete_failed"
  | "db_insert_failed"
  | "availability_sync_failed"
  | "server_error";

function jsonError(code: WeeklyIntervalsErrorCode, status: number, detail?: string) {
  console.warn("[teacher/weekly-intervals]", { code, status });
  return NextResponse.json(
    {
      error: code,
      code,
      ...(detail ? { detail } : {}),
    },
    { status },
  );
}

function mapValidationCode(
  error: string,
): Extract<WeeklyIntervalsErrorCode, "validation_error" | "intervals_conflict"> {
  if (error === "overlapping_intervals" || error === "duplicate_interval") {
    return "intervals_conflict";
  }
  return "validation_error";
}

async function getAuthenticatedTeacher(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: jsonError("unauthorized", 401) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { error: jsonError("server_error", 500) };
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return { error: jsonError("unauthorized", 401) };
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return { error: jsonError("teacher_not_found", 404) };
  }

  return { teacherId: teacher.id as string, admin };
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
    return jsonError("server_error", 500, error.message);
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
    return jsonError("weekly_intervals_disabled", 400);
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
    return jsonError("invalid_payload", 400);
  }

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail =
      issue?.code === "unrecognized_keys"
        ? "unrecognized_keys"
        : issue?.code === "invalid_type"
          ? "invalid_type"
          : "schema";
    console.warn("[teacher/weekly-intervals]", { code: "invalid_payload", status: 400, detail });
    return NextResponse.json(
      {
        error: "invalid_payload",
        code: "invalid_payload",
        detail,
      },
      { status: 400 },
    );
  }

  const validated = validateWeeklyIntervalSet(parsed.data.intervals);
  if (!validated.ok) {
    const code = mapValidationCode(validated.error);
    console.warn("[teacher/weekly-intervals]", {
      code,
      status: 400,
      detail: validated.error,
      index: typeof validated.index === "number" ? validated.index : undefined,
    });
    return NextResponse.json(
      {
        error: code,
        code,
        detail: validated.error,
        ...(typeof validated.index === "number" ? { index: validated.index } : {}),
      },
      { status: 400 },
    );
  }

  const { error: deleteErr } = await admin
    .from("teacher_weekly_availability_intervals")
    .delete()
    .eq("teacher_id", teacherId);
  if (deleteErr) {
    return jsonError("db_delete_failed", 500, deleteErr.message);
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
      return jsonError("db_insert_failed", 500, insertErr.message);
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
    return jsonError("availability_sync_failed", 500, syncErr.message);
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
