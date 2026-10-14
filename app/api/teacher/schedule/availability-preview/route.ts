import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  computeTeacherAvailabilityPreview,
  isTeacherAvailabilityPreviewEnabled,
  parseAvailabilityPreviewQuery,
} from "@/lib/bookings/availabilityPreview";

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
    .select("id, timezone, default_lesson_duration_minutes")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return { error: NextResponse.json({ error: "teacher_required" }, { status: 404 }) };
  }

  return {
    teacherId: teacher.id as string,
    timeZone: teacher.timezone as string | null,
    defaultLessonDurationMinutes: (teacher as { default_lesson_duration_minutes?: number | null })
      .default_lesson_duration_minutes,
    admin,
  };
}

/**
 * GET /api/teacher/schedule/availability-preview
 * Read-only preview of learner-visible bookable slots for the authenticated teacher.
 * Does not mutate bookings, schedule, packages, or Stripe.
 */
export async function GET(req: Request) {
  if (!isTeacherAvailabilityPreviewEnabled()) {
    return NextResponse.json({ error: "feature_disabled" }, { status: 403 });
  }

  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;
  const { teacherId, timeZone, defaultLessonDurationMinutes, admin } = auth as {
    teacherId: string;
    timeZone: string | null;
    defaultLessonDurationMinutes: number | null | undefined;
    admin: ReturnType<typeof getSupabaseAdmin>;
  };

  const url = new URL(req.url);
  const parsed = parseAvailabilityPreviewQuery({
    startDate: url.searchParams.get("startDate"),
    days: url.searchParams.get("days"),
    durationMinutes: url.searchParams.get("durationMinutes") ?? url.searchParams.get("duration"),
    teacherDefaultDuration: defaultLessonDurationMinutes,
    timeZone,
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await computeTeacherAvailabilityPreview(admin, teacherId, {
    startDate: parsed.startDate,
    days: parsed.days,
    durationMinutes: parsed.durationMinutes,
  });

  if ("error" in result) {
    const status = result.error === "teacher_not_found" ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
