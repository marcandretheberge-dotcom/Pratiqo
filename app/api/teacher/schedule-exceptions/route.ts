import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTeacherScheduleExceptionsEnabled,
  mapDbRowsToExceptions,
  normalizeScheduleException,
  assertCustomHoursAllowedForScheduleMode,
  EXCEPTION_TYPES,
} from "@/lib/schedule/dateExceptions";
import { normalizeTeacherScheduleMode } from "@/lib/schedule/preciseScheduleActivation";

export const runtime = "nodejs";

const putBodySchema = z
  .object({
    exceptionDate: z.string().min(10).max(10),
    exceptionType: z.enum(EXCEPTION_TYPES),
    startTime: z.string().min(4).max(8).nullable().optional(),
    endTime: z.string().min(4).max(8).nullable().optional(),
    note: z.string().max(280).nullable().optional(),
  })
  .strict();

const deleteBodySchema = z
  .object({
    exceptionDate: z.string().min(10).max(10),
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
    .select("id, schedule_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return { error: NextResponse.json({ error: "teacher_not_found" }, { status: 404 }) };
  }

  return {
    teacherId: teacher.id as string,
    scheduleMode: (teacher as { schedule_mode?: string | null }).schedule_mode ?? "legacy_blocks",
    admin,
  };
}

function toDto(ex: ReturnType<typeof mapDbRowsToExceptions>[number]) {
  return {
    exceptionDate: ex.exceptionDate,
    exceptionType: ex.exceptionType,
    startTime: ex.startTime,
    endTime: ex.endTime,
    note: ex.note,
  };
}

/**
 * GET /api/teacher/schedule-exceptions?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(req: Request) {
  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;
  const { teacherId, admin } = auth as {
    teacherId: string;
    scheduleMode: string;
    admin: ReturnType<typeof getSupabaseAdmin>;
  };

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "invalid_exception_date" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("teacher_schedule_exceptions")
    .select("id, exception_date, exception_type, start_time, end_time, note, is_active")
    .eq("teacher_id", teacherId)
    .eq("is_active", true)
    .gte("exception_date", from)
    .lte("exception_date", to)
    .order("exception_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const exceptions = mapDbRowsToExceptions(data ?? []).map(toDto);
  return NextResponse.json({
    enabled: isTeacherScheduleExceptionsEnabled(),
    scheduleMode: normalizeTeacherScheduleMode(
      (auth as { scheduleMode?: string }).scheduleMode,
    ),
    exceptions,
  });
}

/**
 * PUT /api/teacher/schedule-exceptions
 * Upserts one active exception for a date (replaces any existing active row).
 */
export async function PUT(req: Request) {
  if (!isTeacherScheduleExceptionsEnabled()) {
    return NextResponse.json({ error: "schedule_exceptions_disabled" }, { status: 400 });
  }

  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;
  const { teacherId, scheduleMode, admin } = auth as {
    teacherId: string;
    scheduleMode: string;
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

  const modeGate = assertCustomHoursAllowedForScheduleMode(
    parsed.data.exceptionType,
    scheduleMode,
  );
  if (!modeGate.ok) {
    return NextResponse.json({ error: modeGate.error }, { status: 400 });
  }

  const validated = normalizeScheduleException({
    exceptionDate: parsed.data.exceptionDate,
    exceptionType: parsed.data.exceptionType,
    startTime: parsed.data.startTime ?? null,
    endTime: parsed.data.endTime ?? null,
    note: parsed.data.note ?? null,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { error: deleteErr } = await admin
    .from("teacher_schedule_exceptions")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("exception_date", validated.value.exceptionDate);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  const { error: insertErr } = await admin.from("teacher_schedule_exceptions").insert({
    teacher_id: teacherId,
    exception_date: validated.value.exceptionDate,
    exception_type: validated.value.exceptionType,
    start_time: validated.value.startTime,
    end_time: validated.value.endTime,
    note: validated.value.note,
    is_active: true,
    updated_at: new Date().toISOString(),
  });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, exception: toDto(validated.value) });
}

/**
 * DELETE /api/teacher/schedule-exceptions
 * Body: { exceptionDate }
 */
export async function DELETE(req: Request) {
  if (!isTeacherScheduleExceptionsEnabled()) {
    return NextResponse.json({ error: "schedule_exceptions_disabled" }, { status: 400 });
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

  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_exception_date" }, { status: 400 });
  }

  const { error } = await admin
    .from("teacher_schedule_exceptions")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("exception_date", parsed.data.exceptionDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
